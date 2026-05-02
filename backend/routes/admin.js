const express = require('express');
const router = express.Router();

// Make sure to export the router FIRST before using it
// Simple route for admin stats
router.get('/stats', (req, res) => {
  res.json({
    success: true,
    stats: {
      totalUsers: 0,
      activeUsers: 0,
      totalReferrals: 0,
      totalEarnings: 0,
      pendingWithdrawals: 0
    }
  });
});

// Get all users
router.get('/users', (req, res) => {
  res.json({
    success: true,
    users: []
  });
});

// Get all referrals
router.get('/referrals', (req, res) => {
  res.json({
    success: true,
    referrals: []
  });
});

// Get pending withdrawals
router.get('/withdrawals/pending', (req, res) => {
  res.json({
    success: true,
    withdrawals: []
  });
});

// Approve withdrawal
router.post('/withdrawals/:id/approve', (req, res) => {
  res.json({
    success: true,
    message: 'Withdrawal approved'
  });
});

// Reject withdrawal
router.post('/withdrawals/:id/reject', (req, res) => {
  res.json({
    success: true,
    message: 'Withdrawal rejected'
  });
});

module.exports = router;