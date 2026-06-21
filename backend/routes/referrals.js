const express = require('express');
const { authenticate } = require('../middleware/auth');
const pool = require('../config/db');
const router = express.Router();

// Generate referral code function (matching your registration)
const generateReferralCode = () => {
  return 'REF' + Math.random().toString(36).substring(2, 10).toUpperCase();
};

// Get user's referral stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    // Get user's referral code
    let userResult = await pool.query(
      'SELECT referral_code FROM users WHERE id = $1',
      [req.user.id]
    );
    
    let referralCode = userResult.rows[0]?.referral_code;
    
    // If no referral code exists (shouldn't happen with your setup, but just in case)
    if (!referralCode) {
      const newCode = generateReferralCode();
      await pool.query(
        'UPDATE users SET referral_code = $1 WHERE id = $2',
        [newCode, req.user.id]
      );
      referralCode = newCode;
      console.log(`Generated new referral code for user ${req.user.id}: ${newCode}`);
    }

    // Get pending referrals
    const pendingResult = await pool.query(
      `SELECT r.*, u.username, u.email, u.phone 
       FROM referrals r 
       JOIN users u ON r.referred_id = u.id 
       WHERE r.referrer_id = $1 AND r.status = 'pending'`,
      [req.user.id]
    );

    // Get completed referrals
    const completedResult = await pool.query(
      `SELECT r.*, u.username, u.email, u.phone, r.commission 
       FROM referrals r 
       JOIN users u ON r.referred_id = u.id 
       WHERE r.referrer_id = $1 AND r.status = 'completed'`,
      [req.user.id]
    );

    // Calculate total earnings
    let totalEarned = 0;
    completedResult.rows.forEach(r => {
      totalEarned += parseFloat(r.commission || 0);
    });

    console.log(`📊 Referral stats for user ${req.user.id}: Code=${referralCode}, Pending=${pendingResult.rows.length}, Completed=${completedResult.rows.length}, Earned=${totalEarned}`);

    res.json({
      success: true,
      referralCode: referralCode,  // ← CRITICAL: This must be included
      pending: pendingResult.rows,
      completed: completedResult.rows,
      totalPending: pendingResult.rows.length,
      totalCompleted: completedResult.rows.length,
      totalReferrals: pendingResult.rows.length + completedResult.rows.length,
      totalEarned: totalEarned
    });
  } catch (err) {
    console.error('Referral stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;