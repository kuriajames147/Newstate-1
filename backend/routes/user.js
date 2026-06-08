// backend/routes/user.js
const express = require('express');
const bcrypt = require('bcryptjs');
const { authenticate } = require('../middleware/auth');
const pool = require('../config/db');
const router = express.Router();

// Get user profile (COMPLETE DATA)
router.get('/profile', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get user details
        const userResult = await pool.query(
            `SELECT id, username, email, phone, referral_code, created_at,
                    COALESCE(full_name, username) as full_name, bio,
                    wallet_balance, total_earnings, total_withdrawn, referral_count
             FROM users WHERE id = $1`,
            [userId]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const user = userResult.rows[0];
        
        // Get referral stats
        const pendingResult = await pool.query(
            `SELECT COUNT(*) FROM referrals WHERE referrer_id = $1 AND status = 'pending'`,
            [userId]
        );
        
        const completedResult = await pool.query(
            `SELECT COUNT(*) FROM referrals WHERE referrer_id = $1 AND status = 'completed'`,
            [userId]
        );
        
        // Get total earnings from referrals
        const earningsResult = await pool.query(
            `SELECT COALESCE(SUM(commission), 0) as total FROM referrals WHERE referrer_id = $1 AND status = 'completed'`,
            [userId]
        );
        
        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                phone: user.phone,
                full_name: user.full_name,
                bio: user.bio || '',
                referral_code: user.referral_code,
                created_at: user.created_at,
                wallet_balance: parseFloat(user.wallet_balance),
                total_earnings: parseFloat(user.total_earnings),
                total_withdrawn: parseFloat(user.total_withdrawn),
                referral_count: parseInt(user.referral_count),
                pending_referrals: parseInt(pendingResult.rows[0].count),
                completed_referrals: parseInt(completedResult.rows[0].count),
                total_commission_earned: parseFloat(earningsResult.rows[0].total)
            }
        });
        
    } catch (err) {
        console.error('Profile error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Update user profile
router.put('/profile', authenticate, async (req, res) => {
    const { full_name, username, phone, bio } = req.body;
    const userId = req.user.id;
    
    try {
        // Check if username is taken
        if (username) {
            const existing = await pool.query(
                'SELECT id FROM users WHERE username = $1 AND id != $2',
                [username, userId]
            );
            if (existing.rows.length > 0) {
                return res.status(400).json({ error: 'Username already taken' });
            }
        }
        
        await pool.query(
            `UPDATE users 
             SET full_name = COALESCE($1, full_name),
                 username = COALESCE($2, username),
                 phone = COALESCE($3, phone),
                 bio = $4
             WHERE id = $5`,
            [full_name, username, phone, bio, userId]
        );
        
        // Get updated user data
        const result = await pool.query(
            'SELECT id, username, email, phone, full_name, bio, referral_code, created_at FROM users WHERE id = $1',
            [userId]
        );
        
        res.json({ success: true, user: result.rows[0] });
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Change password
router.post('/change-password', authenticate, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    
    try {
        const result = await pool.query(
            'SELECT password FROM users WHERE id = $1',
            [userId]
        );
        
        const valid = await bcrypt.compare(currentPassword, result.rows[0].password);
        if (!valid) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query(
            'UPDATE users SET password = $1 WHERE id = $2',
            [hashedPassword, userId]
        );
        
        res.json({ success: true, message: 'Password changed successfully' });
    } catch (err) {
        console.error('Password change error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Delete account
router.delete('/delete-account', authenticate, async (req, res) => {
    const { password } = req.body;
    const userId = req.user.id;
    
    try {
        const result = await pool.query(
            'SELECT password FROM users WHERE id = $1',
            [userId]
        );
        
        const valid = await bcrypt.compare(password, result.rows[0].password);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid password' });
        }
        
        // Start transaction
        await pool.query('BEGIN');
        
        // Delete related records
        await pool.query('DELETE FROM earnings WHERE user_id = $1', [userId]);
        await pool.query('DELETE FROM withdrawals WHERE user_id = $1', [userId]);
        await pool.query('DELETE FROM transactions WHERE user_id = $1', [userId]);
        await pool.query('DELETE FROM referrals WHERE referrer_id = $1 OR referred_id = $1', [userId]);
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);
        
        await pool.query('COMMIT');
        
        res.json({ success: true, message: 'Account deleted successfully' });
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('Delete account error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;