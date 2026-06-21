// backend/services/blogService.js
const pool = require('../config/db');
const earningsService = require('./earningsService');

class BlogService {
    
    // Get today's blog for a user
    async getTodaysBlog(userId) {
        const currentWeek = await this.getCurrentWeek();
        const currentYear = await this.getCurrentYear();
        const currentDay = await this.getCurrentDay();
        
        // Get today's blog
        const result = await pool.query(
            `SELECT b.*, 
                    CASE WHEN ubp.id IS NOT NULL THEN true ELSE false END as is_read
             FROM blogs b
             LEFT JOIN user_blog_progress ubp ON b.id = ubp.blog_id AND ubp.user_id = $1
             WHERE b.week_number = $2 
               AND b.year = $3 
               AND b.day_number = $4
               AND b.is_active = true
             ORDER BY b.created_at DESC
             LIMIT 1`,
            [userId, currentWeek, currentYear, currentDay]
        );
        
        if (result.rows.length === 0) {
            return null;
        }
        
        const blog = result.rows[0];
        
        // Get user's progress for the week
        const progress = await this.getWeeklyProgress(userId, currentWeek, currentYear);
        
        return {
            ...blog,
            is_read: blog.is_read,
            weekly_progress: progress,
            has_completed_week: progress.days_read >= 7,
            can_claim_reward: await this.canClaimReward(userId, currentWeek, currentYear)
        };
    }
    
    // Mark blog as read and record progress
    async markBlogAsRead(userId, blogId) {
        const currentWeek = await this.getCurrentWeek();
        const currentYear = await this.getCurrentYear();
        const currentDay = await this.getCurrentDay();
        
        // Check if blog exists and belongs to current week
        const blogResult = await pool.query(
            'SELECT * FROM blogs WHERE id = $1 AND week_number = $2 AND year = $3 AND day_number = $4',
            [blogId, currentWeek, currentYear, currentDay]
        );
        
        if (blogResult.rows.length === 0) {
            return { error: 'Blog not available for today' };
        }
        
        // Check if already read
        const existing = await pool.query(
            'SELECT * FROM user_blog_progress WHERE user_id = $1 AND blog_id = $2',
            [userId, blogId]
        );
        
        if (existing.rows.length > 0 && existing.rows[0].is_read) {
            return { error: 'Blog already read today' };
        }
        
        // Record progress
        await pool.query(
            `INSERT INTO user_blog_progress (user_id, blog_id, week_number, year, day_number, is_read, read_at)
             VALUES ($1, $2, $3, $4, $5, true, CURRENT_TIMESTAMP)
             ON CONFLICT (user_id, blog_id) 
             DO UPDATE SET is_read = true, read_at = CURRENT_TIMESTAMP`,
            [userId, blogId, currentWeek, currentYear, currentDay]
        );
        
        // Check if user completed the week (read 7 days)
        const progress = await this.getWeeklyProgress(userId, currentWeek, currentYear);
        
        // If completed 7 days, award bonus
        let rewardClaimed = false;
        if (progress.days_read >= 7) {
            const canClaim = await this.canClaimReward(userId, currentWeek, currentYear);
            if (canClaim) {
                await this.claimWeeklyReward(userId, currentWeek, currentYear);
                rewardClaimed = true;
            }
        }
        
        return {
            success: true,
            message: 'Blog marked as read',
            days_read: progress.days_read,
            days_remaining: 7 - progress.days_read,
            reward_claimed: rewardClaimed,
            progress: progress
        };
    }
    
    // Get weekly progress
    async getWeeklyProgress(userId, weekNumber, year) {
        const result = await pool.query(
            `SELECT 
                COUNT(DISTINCT day_number) as days_read,
                COUNT(DISTINCT blog_id) as blogs_read
             FROM user_blog_progress 
             WHERE user_id = $1 
               AND week_number = $2 
               AND year = $3 
               AND is_read = true`,
            [userId, weekNumber, year]
        );
        
        return {
            days_read: parseInt(result.rows[0].days_read || 0),
            blogs_read: parseInt(result.rows[0].blogs_read || 0)
        };
    }
    
    // Check if user can claim weekly reward
    async canClaimReward(userId, weekNumber, year) {
        // Check if already claimed
        const existing = await pool.query(
            'SELECT * FROM blog_rewards WHERE user_id = $1 AND week_number = $2 AND year = $3 AND is_claimed = true',
            [userId, weekNumber, year]
        );
        
        if (existing.rows.length > 0) {
            return false;
        }
        
        // Check if all 7 days are read
        const progress = await this.getWeeklyProgress(userId, weekNumber, year);
        return progress.days_read >= 7;
    }
    
    // Claim weekly reward (Ksh 20)
    async claimWeeklyReward(userId, weekNumber, year) {
        // Check if already claimed
        const existing = await pool.query(
            'SELECT * FROM blog_rewards WHERE user_id = $1 AND week_number = $2 AND year = $3',
            [userId, weekNumber, year]
        );
        
        if (existing.rows.length > 0 && existing.rows[0].is_claimed) {
            return { error: 'Reward already claimed for this week' };
        }
        
        const progress = await this.getWeeklyProgress(userId, weekNumber, year);
        if (progress.days_read < 7) {
            return { error: 'Must read all 7 days to claim reward' };
        }
        
        const rewardAmount = 20.00;
        
        // Insert reward record
        await pool.query(
            `INSERT INTO blog_rewards (user_id, week_number, year, days_read, reward_amount, is_claimed, claimed_at)
             VALUES ($1, $2, $3, $4, $5, true, CURRENT_TIMESTAMP)
             ON CONFLICT (user_id, week_number, year) 
             DO UPDATE SET is_claimed = true, claimed_at = CURRENT_TIMESTAMP`,
            [userId, weekNumber, year, progress.days_read, rewardAmount]
        );
        
        // Record earning
        await earningsService.recordEarning(
            userId,
            rewardAmount,
            'blog_earning',
            `Weekly blog reward - Week ${weekNumber}`,
            null,
            `BLOG_WEEK_${weekNumber}`
        );
        
        return {
            success: true,
            message: `🎉 You earned Ksh ${rewardAmount} for completing the week!`,
            amount: rewardAmount
        };
    }
    
    // Get all blogs for the current week
    async getCurrentWeekBlogs(userId) {
        const currentWeek = await this.getCurrentWeek();
        const currentYear = await this.getCurrentYear();
        
        const result = await pool.query(
            `SELECT b.*, 
                    CASE WHEN ubp.id IS NOT NULL AND ubp.is_read = true THEN true ELSE false END as is_read
             FROM blogs b
             LEFT JOIN user_blog_progress ubp ON b.id = ubp.blog_id AND ubp.user_id = $1
             WHERE b.week_number = $2 
               AND b.year = $3 
               AND b.is_active = true
             ORDER BY b.day_number ASC`,
            [userId, currentWeek, currentYear]
        );
        
        const progress = await this.getWeeklyProgress(userId, currentWeek, currentYear);
        
        return {
            blogs: result.rows,
            progress: progress,
            total_days: 7,
            days_remaining: 7 - progress.days_read,
            can_claim_reward: progress.days_read >= 7
        };
    }
    
    // Get current day (1-7)
    async getCurrentDay() {
        const result = await pool.query('SELECT EXTRACT(DOW FROM CURRENT_DATE) as day');
        // PostgreSQL: 0=Sunday, 1=Monday, etc.
        // Convert to 1-7 (Monday=1, Sunday=7)
        let day = parseInt(result.rows[0].day);
        if (day === 0) day = 7; // Sunday becomes 7
        return day;
    }
    
    // Get current week
    async getCurrentWeek() {
        const result = await pool.query('SELECT EXTRACT(WEEK FROM CURRENT_DATE) as week');
        return parseInt(result.rows[0].week);
    }
    
    // Get current year
    async getCurrentYear() {
        const result = await pool.query('SELECT EXTRACT(YEAR FROM CURRENT_DATE) as year');
        return parseInt(result.rows[0].year);
    }
    
    // Admin: Create weekly blogs
    async createWeeklyBlogs(blogsData) {
        const currentWeek = await this.getCurrentWeek();
        const currentYear = await this.getCurrentYear();
        
        const results = [];
        for (const blogData of blogsData) {
            const result = await pool.query(
                `INSERT INTO blogs (title, slug, category, content, summary, image_url, 
                                   read_time, day_number, week_number, year)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                 RETURNING *`,
                [
                    blogData.title,
                    blogData.slug,
                    blogData.category,
                    blogData.content,
                    blogData.summary || null,
                    blogData.image_url || null,
                    blogData.read_time || 5,
                    blogData.day_number,
                    currentWeek,
                    currentYear
                ]
            );
            results.push(result.rows[0]);
        }
        
        return results;
    }
    
    // Get user's reward history
    async getRewardHistory(userId) {
        const result = await pool.query(
            `SELECT * FROM blog_rewards 
             WHERE user_id = $1 
             ORDER BY year DESC, week_number DESC
             LIMIT 20`,
            [userId]
        );
        
        return result.rows;
    }
}

module.exports = new BlogService();