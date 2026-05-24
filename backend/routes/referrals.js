// backend/routes/referrals.js
const express = require('express');
const { authenticate } = require('../middleware/auth');
const pool = require('../config/db');
const router = express.Router();

// Get referral stats for dashboard
router.get('/stats', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get user's info
        const userResult = await pool.query(
            'SELECT referral_code, username, referral_count, total_earnings, wallet_balance FROM users WHERE id = $1',
            [userId]
        );
        
        // Pending referrals (registered but not paid)
        const pendingResult = await pool.query(
            `SELECT r.id, r.created_at, u.username, u.email
             FROM referrals r
             JOIN users u ON r.referred_id = u.id
             WHERE r.referrer_id = $1 AND r.status = 'pending'
             ORDER BY r.created_at DESC`,
            [userId]
        );
        
        // Completed referrals (paid)
        const completedResult = await pool.query(
            `SELECT r.id, r.commission, r.payment_date, u.username, u.email
             FROM referrals r
             JOIN users u ON r.referred_id = u.id
             WHERE r.referrer_id = $1 AND r.status = 'completed'
             ORDER BY r.payment_date DESC`,
            [userId]
        );
        
        const totalEarned = completedResult.rows.reduce((sum, r) => sum + parseFloat(r.commission), 0);
        
        res.json({
            success: true,
            referralCode: userResult.rows[0]?.referral_code,
            username: userResult.rows[0]?.username,
            totalReferrals: parseInt(userResult.rows[0]?.referral_count || 0),
            totalEarned: totalEarned,
            walletBalance: parseFloat(userResult.rows[0]?.wallet_balance || 0),
            pending: pendingResult.rows,
            completed: completedResult.rows,
            totalPending: pendingResult.rows.length,
            totalCompleted: completedResult.rows.length
        });
        
    } catch (err) {
        console.error('Referral stats error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;