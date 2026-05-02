const express = require('express');
const router = express.Router();

// Get wallet balance
router.get('/balance', (req, res) => {
  res.json({
    success: true,
    balance: 0,
    totalEarnings: 0
  });
});

// Get transactions
router.get('/transactions', (req, res) => {
  res.json({
    success: true,
    transactions: []
  });
});

// Get earnings
router.get('/earnings', (req, res) => {
  res.json({
    success: true,
    earnings: []
  });
});

// Withdraw request
router.post('/withdraw', (req, res) => {
  res.json({
    success: true,
    message: 'Withdrawal request submitted'
  });
});

module.exports = router;