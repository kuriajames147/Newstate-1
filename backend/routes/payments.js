// backend/routes/payments.js
const express = require('express');
const { authenticate } = require('../middleware/auth');
const { stkPush, formatPhoneNumber } = require('../utils/mpesa');
const pool = require('../config/db');
const router = express.Router();

// Send STK Push for activation
router.post('/activate', authenticate, async (req, res) => {
    const { phone, amount = 300 } = req.body;
    const userId = req.user.id;

    try {
        const userResult = await pool.query(
            'SELECT registration_paid FROM users WHERE id = $1',
            [userId]
        );
        
        if (userResult.rows[0]?.registration_paid) {
            return res.status(400).json({ error: 'Already activated' });
        }

        const formattedPhone = formatPhoneNumber(phone);
        const accountRef = `ACT_${userId}_${Date.now()}`;
        const response = await stkPush(formattedPhone, amount, accountRef, 'Activation');

        await pool.query(
            `INSERT INTO transactions (user_id, type, amount, status, checkout_request_id) 
             VALUES ($1, 'activation', $2, 'pending', $3)`,
            [userId, amount, response.CheckoutRequestID]
        );

        res.json({ success: true, checkoutRequestId: response.CheckoutRequestID });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// M-PESA Callback - Creates referral AND credits commission AFTER payment
router.post('/callback', async (req, res) => {
    console.log('\n📞 M-PESA Callback received');
    
    try {
        const stkCallback = req.body.Body?.stkCallback;
        if (!stkCallback) return res.json({ ResultCode: 0 });

        const checkoutId = stkCallback.CheckoutRequestID;

        if (stkCallback.ResultCode === 0) {
            const items = stkCallback.CallbackMetadata?.Item || [];
            const receipt = items.find(i => i.Name === 'MpesaReceiptNumber')?.Value;

            const txResult = await pool.query(
                'SELECT * FROM transactions WHERE checkout_request_id = $1 AND status = $2',
                [checkoutId, 'pending']
            );

            if (txResult.rows.length > 0) {
                const transaction = txResult.rows[0];
                const userId = transaction.user_id;

                // Activate user
                await pool.query(
                    `UPDATE users SET registration_paid = true, is_active = true, payment_date = NOW() WHERE id = $1`,
                    [userId]
                );

                await pool.query(
                    `UPDATE transactions SET status = 'completed', mpesa_receipt = $1 WHERE id = $2`,
                    [receipt, transaction.id]
                );

                // ============================================
                // CREATE REFERRAL RECORD AND CREDIT COMMISSION
                // This happens ONLY AFTER payment
                // ============================================
                const userResult = await pool.query(
                    `SELECT referred_by_code FROM users WHERE id = $1`,
                    [userId]
                );

                const referredByCode = userResult.rows[0]?.referred_by_code;

                if (referredByCode) {
                    // Find referrer by their referral code
                    const referrerResult = await pool.query(
                        `SELECT id FROM users WHERE referral_code = $1`,
                        [referredByCode]
                    );

                    if (referrerResult.rows.length > 0) {
                        const referrerId = referrerResult.rows[0].id;

                        // CREATE the referral record (now completed)
                        await pool.query(
                            `INSERT INTO referrals (referrer_id, referred_id, status, commission, payment_status, payment_date) 
                             VALUES ($1, $2, 'completed', 120.00, 'completed', NOW())`,
                            [referrerId, userId]
                        );

                        // Update referrer's count
                        await pool.query(
                            `UPDATE users SET referral_count = referral_count + 1 WHERE id = $1`,
                            [referrerId]
                        );

                        // Credit referrer with Ksh 120
                        await pool.query(
                            `UPDATE users 
                             SET wallet_balance = wallet_balance + 120,
                                 total_earnings = total_earnings + 120
                             WHERE id = $1`,
                            [referrerId]
                        );

                        // Record earnings
                        await pool.query(
                            `INSERT INTO earnings (user_id, referral_id, amount, type) 
                             VALUES ($1, (SELECT id FROM referrals WHERE referrer_id = $2 AND referred_id = $3), 120, 'commission')`,
                            [referrerId, referrerId, userId]
                        );

                        console.log(`✅ Referral created and commission credited: Ksh 120 to user ${referrerId}`);
                    }
                }
            }
        }

        res.json({ ResultCode: 0 });
    } catch (err) {
        console.error('Callback error:', err);
        res.json({ ResultCode: 0 });
    }
});

// Check transaction status
router.get('/status/:checkoutId', authenticate, async (req, res) => {
    const result = await pool.query(
        'SELECT * FROM transactions WHERE checkout_request_id = $1 AND user_id = $2',
        [req.params.checkoutId, req.user.id]
    );
    res.json({ success: true, transaction: result.rows[0] || null });
});

module.exports = router;