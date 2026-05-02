const express = require('express');
const { authenticate } = require('../middleware/auth');
const pool = require('../config/db');
const router = express.Router();

// Get user's referral stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    
    // Get pending referrals
    const pendingResult = await pool.query(
      `SELECT r.*, u.username, u.email, u.phone, u.created_at as joined_date 
       FROM referrals r 
       JOIN users u ON r.referred_id = u.id 
       WHERE r.referrer_id = $1 AND r.status = 'pending' AND r.payment_status = 'pending' ORDER BY r.created_at DESC`,
      [req.user.id]
    );

    // Get completed referrals
    const completedResult = await pool.query(
      `SELECT r.*, u.username, u.email, u.phone, r.commission, r.payment_date
       FROM referrals r 
       JOIN users u ON r.referred_id = u.id 
       WHERE r.referrer_id = $1 AND r.status = 'completed' AND r.payment_status = 'completed' ORDER BY r.payment_date DESC`,
      [req.user.id]
    );

    // Get user's referral code
    const userResult = await pool.query(
      'SELECT referral_code FROM users WHERE id = $1',
      [req.user.id]
    );

    res.json({
      success: true,
      referralCode: userResult.rows[0]?.referral_code,
      username: userResult.rows[0]?.username,
      pending: pendingResult.rows,
      completed: completedResult.rows,
      totalPending: pendingResult.rows.length,
      totalCompleted: completedResult.rows.length,
      totalEarned: completedResult.rows.reduce((sum, r) => sum + parseFloat(r.commission), 0)
    });
  } catch (err) {
    console.error('Referral stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get referral leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.total_earnings, COUNT(r.id) as referral_count
       FROM users u
       LEFT JOIN referrals r ON u.id = r.referrer_id AND r.status = 'completed'
       WHERE u.total_earnings > 0 AND u.registration_paid = true 
       GROUP BY u.id, u.username, u.total_earnings
       ORDER BY u.total_earnings DESC
       LIMIT 20`
    );
    
    res.json({ success: true, leaderboard: result.rows });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;