// backend/routes/blogs.js
const express = require('express');
const { authenticate } = require('../middleware/auth');
const pool = require('../config/db');

// FIXED: Proper import of BLOG_CONTENT
const { BLOG_CONTENT } = require('../data/blogs');

const router = express.Router();

// ============================================
// BLOG SYSTEM - USING STATIC DATA
// ============================================


// Get all blogs
router.get('/all', authenticate, async (req, res) => {
    try {
        // Convert BLOG_CONTENT to array format
        const blogs = Object.keys(BLOG_CONTENT).map(day => ({
            day: parseInt(day),
            ...BLOG_CONTENT[day]
        }));

        console.log('📚 Sending blogs from data file:', blogs.length); // ← ADD THIS LOG

        res.json({
            success: true,
            blogs: blogs
        });
    } catch (error) {
        console.error('❌ Error getting all blogs:', error);
        res.status(500).json({ 
            error: 'Failed to load blogs',
            details: error.message 
        });
    }
});
// backend/routes/blogs.js - Fixed Day Calculation

router.get('/today', authenticate, async (req, res) => {
    try {
        console.log('📚 Fetching today\'s blog for user:', req.user.id);

        const userId = req.user.id;

        // Get user's activation date
        const userResult = await pool.query(
            'SELECT is_active, created_at FROM users WHERE id = $1',
            [userId]
        );

        if (!userResult.rows[0] || !userResult.rows[0].is_active) {
            return res.status(400).json({ 
                error: 'Account not activated. Please pay registration fee first.' 
            });
        }

        const user = userResult.rows[0];
        const createdAt = new Date(user.created_at);
        const today = new Date();
        
        // Calculate days since activation
        let daysSinceActivation = Math.floor((today - createdAt) / (1000 * 60 * 60 * 24));
        
        // FIX: Ensure daysSinceActivation is not negative
        if (daysSinceActivation < 0) daysSinceActivation = 0;
        
        // Day number (1-7)
        let dayNumber = daysSinceActivation + 1;
        
        // FIX: If dayNumber is less than 1, set to 1
        if (dayNumber < 1) dayNumber = 1;
        
        // If beyond day 7, show day 7
        if (dayNumber > 7) dayNumber = 7;

        console.log('📚 Day calculation:', {
            daysSinceActivation,
            dayNumber,
            createdAt: createdAt.toISOString(),
            today: today.toISOString()
        });

        // Check if user has read any blogs
        const progressCheck = await pool.query(
            'SELECT COUNT(*) as read_count FROM user_blog_progress WHERE user_id = $1 AND is_read = true',
            [userId]
        );
        
        const readCount = parseInt(progressCheck.rows[0].read_count || 0);
        
        // FIX: If no blogs read, force Day 1 to be available
        if (readCount === 0 && dayNumber > 1) {
            dayNumber = 1;
            console.log('📚 No blogs read, forcing Day 1');
        }

        // Get blog from static data
        const blog = BLOG_CONTENT[dayNumber];
        
        if (!blog) {
            console.error('❌ Blog not found for day:', dayNumber);
            console.log('📚 Available days:', Object.keys(BLOG_CONTENT));
            return res.status(404).json({ error: 'Blog not found for this day' });
        }

        // Check if user has read this blog
        const progressResult = await pool.query(
            'SELECT is_read FROM user_blog_progress WHERE user_id = $1 AND blog_id = $2',
            [userId, dayNumber]
        );

        const isRead = progressResult.rows.length > 0 && progressResult.rows[0].is_read;

        // Get total read count
        const progressResult2 = await pool.query(
            'SELECT COUNT(*) as read_count FROM user_blog_progress WHERE user_id = $1 AND is_read = true',
            [userId]
        );
        
        const totalReadCount = parseInt(progressResult2.rows[0].read_count || 0);
        const allCompleted = totalReadCount >= 7;

        res.json({
            success: true,
            blog: {
                id: dayNumber,
                day_number: dayNumber,
                title: blog.title,
                content: blog.content,
                category: blog.category,
                read_time: blog.readTime,
                is_read: isRead,
                total_days: 7
            },
            progress: {
                days_read: Math.min(totalReadCount, 7),
                total_days: 7,
                all_completed: allCompleted,
                remaining: Math.max(0, 7 - totalReadCount)
            }
        });

    } catch (error) {
        console.error('❌ Error getting today\'s blog:', error);
        res.status(500).json({ 
            error: 'Failed to load blog',
            details: error.message 
        });
    }
});

// Mark blog as read
router.post('/:blogId/read', authenticate, async (req, res) => {
    const userId = req.user.id;
    const blogId = parseInt(req.params.blogId);

    try {
        console.log('📚 Marking blog as read:', { userId, blogId });

        await pool.query('BEGIN');

        // Check if blog exists in static data
        const blog = BLOG_CONTENT[blogId];
        if (!blog) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ error: 'Blog not found' });
        }

        // Check if user is active
        const userResult = await pool.query(
            'SELECT is_active FROM users WHERE id = $1',
            [userId]
        );

        if (!userResult.rows[0] || !userResult.rows[0].is_active) {
            await pool.query('ROLLBACK');
            return res.status(400).json({ error: 'Account not activated' });
        }

        // Check if already read
        const progressResult = await pool.query(
            'SELECT * FROM user_blog_progress WHERE user_id = $1 AND blog_id = $2',
            [userId, blogId]
        );

        if (progressResult.rows.length > 0 && progressResult.rows[0].is_read) {
            await pool.query('ROLLBACK');
            return res.status(400).json({ error: 'Blog already read' });
        }

        // Mark as read
        await pool.query(
            `INSERT INTO user_blog_progress (user_id, blog_id, is_read, read_date)
             VALUES ($1, $2, true, CURRENT_TIMESTAMP)
             ON CONFLICT (user_id, blog_id) 
             DO UPDATE SET is_read = true, read_date = CURRENT_TIMESTAMP`,
            [userId, blogId]
        );

        // Check if all 7 blogs are read
        const progressResult2 = await pool.query(
            'SELECT COUNT(*) as read_count FROM user_blog_progress WHERE user_id = $1 AND is_read = true',
            [userId]
        );

        const readCount = parseInt(progressResult2.rows[0].read_count || 0);
        let rewardClaimed = false;
        let message = '✅ Blog marked as read!';

        // If all 7 blogs read, award commission
        if (readCount >= 7) {
            const today = new Date();
            // Check if already rewarded this week
            const weekNumber = Math.floor((today - new Date(2024, 0, 1)) / (7 * 24 * 60 * 60 * 1000));
            const year = today.getFullYear();

            const rewardResult = await pool.query(
                'SELECT * FROM blog_rewards WHERE user_id = $1 AND week_number = $2 AND year = $3',
                [userId, weekNumber, year]
            );

            if (rewardResult.rows.length === 0) {
                // Award Ksh 30
                const rewardAmount = 30.00;

                // Add to wallet
                await pool.query(
                    'UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2',
                    [rewardAmount, userId]
                );

                // Record earnings
                await pool.query(
                    `INSERT INTO earnings (user_id, amount, type, description, source_type)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [userId, rewardAmount, 'commission', '7-Day Blog Challenge Completed! 🎉', 'blog']
                );

                // Record transaction
                await pool.query(
                    `INSERT INTO transactions (user_id, type, amount, status, description)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [userId, 'blog_reward', rewardAmount, 'completed', 'Blog reading challenge reward']
                );

                // Record reward
                await pool.query(
                    `INSERT INTO blog_rewards (user_id, week_number, year, days_read, reward_amount, is_claimed, claimed_at)
                     VALUES ($1, $2, $3, $4, $5, true, CURRENT_TIMESTAMP)`,
                    [userId, weekNumber, year, readCount, rewardAmount]
                );

                rewardClaimed = true;
                message = '🎉 Congratulations! You completed all 7 days and earned Ksh 30!';
            } else {
                message = '✅ Blog marked as read! You already claimed your reward for this week.';
            }
        }

        await pool.query('COMMIT');

        // Get updated progress
        const finalProgress = await pool.query(
            'SELECT COUNT(*) as read_count FROM user_blog_progress WHERE user_id = $1 AND is_read = true',
            [userId]
        );

        res.json({
            success: true,
            message: message,
            reward_claimed: rewardClaimed,
            progress: {
                days_read: parseInt(finalProgress.rows[0].read_count || 0),
                total_days: 7,
                all_completed: parseInt(finalProgress.rows[0].read_count || 0) >= 7
            }
        });

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('❌ Error marking blog as read:', error);
        res.status(500).json({ 
            error: 'Failed to mark blog as read',
            details: error.message 
        });
    }
});

// Get user's blog progress
router.get('/progress', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get all blog progress from database
        const progressResult = await pool.query(
            `SELECT blog_id, is_read, read_date 
             FROM user_blog_progress 
             WHERE user_id = $1`,
            [userId]
        );

        // Map progress to blog data
        const blogs = Object.keys(BLOG_CONTENT).map(day => {
            const blog = BLOG_CONTENT[day];
            const progress = progressResult.rows.find(p => p.blog_id === parseInt(day));
            return {
                id: parseInt(day),
                day_number: parseInt(day),
                title: blog.title,
                category: blog.category,
                is_read: progress ? progress.is_read : false,
                read_date: progress ? progress.read_date : null
            };
        });

        const readCount = blogs.filter(b => b.is_read).length;

        // Check if user can claim reward
        const today = new Date();
        const weekNumber = Math.floor((today - new Date(2024, 0, 1)) / (7 * 24 * 60 * 60 * 1000));
        const year = today.getFullYear();

        const rewardResult = await pool.query(
            'SELECT * FROM blog_rewards WHERE user_id = $1 AND week_number = $2 AND year = $3',
            [userId, weekNumber, year]
        );

        const canClaimReward = readCount >= 7 && rewardResult.rows.length === 0;

        res.json({
            success: true,
            progress: {
                blogs: blogs,
                days_read: readCount,
                total_days: 7,
                completed: readCount >= 7,
                can_claim_reward: canClaimReward,
                reward_amount: 30.00
            }
        });

    } catch (error) {
        console.error('❌ Error getting progress:', error);
        res.status(500).json({ 
            error: 'Failed to load progress',
            details: error.message 
        });
    }
});

// Claim weekly reward
router.post('/claim-reward', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;

        await pool.query('BEGIN');

        // Check progress
        const progressResult = await pool.query(
            'SELECT COUNT(*) as read_count FROM user_blog_progress WHERE user_id = $1 AND is_read = true',
            [userId]
        );

        const readCount = parseInt(progressResult.rows[0].read_count || 0);

        if (readCount < 7) {
            await pool.query('ROLLBACK');
            return res.status(400).json({ 
                error: `You need to read all 7 blogs. Progress: ${readCount}/7` 
            });
        }

        // Check if already claimed
        const today = new Date();
        const weekNumber = Math.floor((today - new Date(2024, 0, 1)) / (7 * 24 * 60 * 60 * 1000));
        const year = today.getFullYear();

        const rewardResult = await pool.query(
            'SELECT * FROM blog_rewards WHERE user_id = $1 AND week_number = $2 AND year = $3',
            [userId, weekNumber, year]
        );

        if (rewardResult.rows.length > 0) {
            await pool.query('ROLLBACK');
            return res.status(400).json({ error: 'Reward already claimed this week' });
        }

        // Award Ksh 30
        const rewardAmount = 30.00;

        // Add to wallet
        await pool.query(
            'UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2',
            [rewardAmount, userId]
        );

        // Record earnings
        await pool.query(
            `INSERT INTO earnings (user_id, amount, type, description, source_type)
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, rewardAmount, 'commission', '7-Day Blog Challenge Reward 🎉', 'blog']
        );

        // Record transaction
        await pool.query(
            `INSERT INTO transactions (user_id, type, amount, status, description)
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, 'blog_reward', rewardAmount, 'completed', 'Blog reading challenge reward']
        );

        // Record reward
        await pool.query(
            `INSERT INTO blog_rewards (user_id, week_number, year, days_read, reward_amount, is_claimed, claimed_at)
             VALUES ($1, $2, $3, $4, $5, true, CURRENT_TIMESTAMP)`,
            [userId, weekNumber, year, readCount, rewardAmount]
        );

        await pool.query('COMMIT');

        res.json({
            success: true,
            message: '🎉 You earned Ksh 30 for completing the 7-day blog challenge!',
            reward: rewardAmount
        });

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('❌ Error claiming reward:', error);
        res.status(500).json({ 
            error: 'Failed to claim reward',
            details: error.message 
        });
    }
});

// Get reward history
router.get('/rewards', authenticate, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM blog_rewards 
             WHERE user_id = $1 
             ORDER BY year DESC, week_number DESC`,
            [req.user.id]
        );

        res.json({
            success: true,
            history: result.rows
        });
    } catch (error) {
        console.error('❌ Error getting rewards:', error);
        res.status(500).json({ 
            error: 'Failed to load rewards',
            details: error.message 
        });
    }
});

// Get all blogs (for admin/preview)
router.get('/all', authenticate, async (req, res) => {
    try {
        const blogs = Object.keys(BLOG_CONTENT).map(day => ({
            day: parseInt(day),
            ...BLOG_CONTENT[day]
        }));

        res.json({
            success: true,
            blogs: blogs
        });
    } catch (error) {
        console.error('❌ Error getting all blogs:', error);
        res.status(500).json({ 
            error: 'Failed to load blogs',
            details: error.message 
        });
    }
});

module.exports = router;