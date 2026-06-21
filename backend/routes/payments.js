// backend/routes/payments.js
const express = require('express');
const { authenticate } = require('../middleware/auth');
const { stkPush, formatPhoneNumber, queryTransactionStatus } = require('../utils/mpesa');
const pool = require('../config/db');
const router = express.Router();
const { createNotification } = require('./notifications');
const earningsService = require('../services/earningsService');

// Send STK Push for activation payment
router.post('/activate', authenticate, async (req, res) => {
    const { phone, amount = 300 } = req.body;
    const userId = req.user.id;

    console.log('\n========================================');
    console.log('📱 ACTIVATION PAYMENT REQUEST');
    console.log('User ID:', userId);
    console.log('Phone received:', phone);
    console.log('Amount:', amount);
    console.log('========================================\n');

    try {
        // Check if user exists and not activated
        const userResult = await pool.query(
            'SELECT id, username, registration_paid FROM users WHERE id = $1',
            [userId]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];
        
        if (user.registration_paid) {
            return res.status(400).json({ error: 'Account already activated' });
        }

        // Validate phone number
        if (!phone) {
            return res.status(400).json({ error: 'Phone number is required' });
        }

        const formattedPhone = formatPhoneNumber(phone);
        const accountRef = `ACT_${userId}_${Date.now()}`;
        
        console.log('📤 Sending STK Push to:', formattedPhone);
        console.log('💰 Amount:', amount);

        // Send STK Push via M-PESA
        const response = await stkPush(formattedPhone, amount, accountRef, 'Account Activation');
        
        // Check if STK Push was initiated successfully
        if (response.ResponseCode !== '0') {
            throw new Error(response.ResponseDescription || 'STK Push initiation failed');
        }

        // Save transaction record
        await pool.query(
            `INSERT INTO transactions (user_id, type, amount, status, checkout_request_id, description) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [userId, 'activation', amount, 'pending', response.CheckoutRequestID, 'Account activation payment via M-PESA']
        );

        console.log('✅ Transaction saved with ID:', response.CheckoutRequestID);
        console.log('📱 STK Push sent successfully!\n');

        res.json({
            success: true,
            message: 'STK Push sent! Check your phone for M-PESA prompt.',
            checkoutRequestId: response.CheckoutRequestID,
            responseCode: response.ResponseCode
        });
        
    } catch (error) {
        console.error('❌ Activation payment error:', error.message);
        res.status(500).json({ 
            error: error.message || 'Payment initiation failed'
        });
    }
});

// M-PESA Callback URL (where Safaricom sends payment confirmation)
router.post('/callback', async (req, res) => {
    console.log('\n📞 M-PESA Callback received');
    
    try {
        const stkCallback = req.body.Body?.stkCallback;
        if (!stkCallback) return res.json({ ResultCode: 0, ResultDesc: "Accepted" });

        const checkoutRequestId = stkCallback.CheckoutRequestID;
        const resultCode = stkCallback.ResultCode;

        if (resultCode === 0) {
            const items = stkCallback.CallbackMetadata?.Item || [];
            const receipt = items.find(i => i.Name === 'MpesaReceiptNumber')?.Value;
            const amount = parseFloat(items.find(i => i.Name === 'Amount')?.Value);
            const transactionDate = items.find(i => i.Name === 'TransactionDate')?.Value;

            // Find pending transaction
            const txResult = await pool.query(
                'SELECT * FROM transactions WHERE checkout_request_id = $1 AND status = $2',
                [checkoutRequestId, 'pending']
            );

            if (txResult.rows.length > 0) {
                const transaction = txResult.rows[0];
                const userId = transaction.user_id;
                
                // Update transaction
                await pool.query(
                    `UPDATE transactions 
                     SET status = $1, mpesa_receipt = $2, description = $3 
                     WHERE id = $4`,
                    ['completed', receipt, `Payment completed on ${transactionDate}`, transaction.id]
                );

                // Activate user account
                await pool.query(
                    `UPDATE users 
                     SET registration_paid = true, 
                         is_active = true, 
                         payment_date = CURRENT_TIMESTAMP 
                     WHERE id = $1`,
                    [userId]
                );

                console.log(`✅ User ${userId} activated successfully`);

                // ============================================
                // CHECK IF USER WAS REFERRED AND CREDIT REFERRER
                // ============================================
                const userResult = await pool.query(
                    `SELECT referred_by_code FROM users WHERE id = $1`,
                    [userId]
                );

                const referredByCode = userResult.rows[0]?.referred_by_code;

                if (referredByCode) {
                    const referrerResult = await pool.query(
                        `SELECT id FROM users WHERE referral_code = $1`,
                        [referredByCode]
                    );

                    if (referrerResult.rows.length > 0) {
                        const referrerId = referrerResult.rows[0].id;
                        
                        // Get commission amount
                        const commissionResult = await pool.query(
                            "SELECT setting_value FROM system_settings WHERE setting_key = 'referral_commission'"
                        );
                        const commission = parseFloat(commissionResult.rows[0]?.setting_value || 120);

                        // ============================================
                        // UPDATE REFERRER'S WALLET AND EARNINGS
                        // ============================================
                        await pool.query(
                            `UPDATE users 
                             SET wallet_balance = wallet_balance + $1,
                                 total_earnings = total_earnings + $1
                             WHERE id = $2`,
                            [commission, referrerId]
                        );

                        // Update referral record
                        await pool.query(
                            `UPDATE referrals 
                             SET status = 'completed', 
                                 commission = $1, 
                                 payment_status = 'completed',
                                 payment_date = CURRENT_TIMESTAMP
                             WHERE referrer_id = $2 AND referred_id = $3`,
                            [commission, referrerId, userId]
                        );

                        // ============================================
                        // RECORD EARNING IN EARNINGS TABLE
                        // ============================================
                        await earningsService.recordEarning(
                            referrerId,           // user_id
                            commission,           // amount
                            'commission',         // type
                            `Commission for referring user #${userId}`,  // description
                            null,                 // referral_id
                            `REF_${userId}`       // source_id
                        );
                        
                        // Record the referred user's activation (optional)
                        await earningsService.recordEarning(
                            userId,               // user_id (the referred user)
                            0,                    // amount (no earning for paying)
                            'commission',         // type
                            'Account activation - referral fee paid',  // description
                            null,
                            `ACT_${userId}`
                        );

                        console.log(`💰 Commission credited: Ksh ${commission} to referrer ${referrerId}`);
                        console.log(`📊 Earning recorded for referrer ${referrerId} and activation for user ${userId}`);

                        // ============================================
                        // CREATE NOTIFICATION FOR REFERRER
                        // ============================================
                        const referredUserResult = await pool.query(
                            'SELECT username FROM users WHERE id = $1',
                            [userId]
                        );
                        const referredName = referredUserResult.rows[0]?.username || 'Someone';
                        
                        await createNotification(
                            referrerId,
                            'referral_completed_payment',
                            'Referral Completed! 💰',
                            `Great news! ${referredName} has paid the activation fee. You've earned Ksh ${commission}!`,
                            { referred_user: referredName, referred_id: userId, commission: commission }
                        );

                        // Notify the user who paid that they're activated
                        await createNotification(
                            userId,
                            'account_activated',
                            'Account Activated! ✅',
                            `Your account has been activated! You can now start referring friends and earning money.`,
                            {}
                        );
                    }
                }
            }
        }

        res.json({ ResultCode: 0, ResultDesc: "Accepted" });
        
    } catch (err) {
        console.error('❌ Callback processing error:', err);
        res.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }
});

// Check transaction status
router.get('/status/:checkoutRequestId', authenticate, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM transactions WHERE checkout_request_id = $1 AND user_id = $2',
            [req.params.checkoutRequestId, req.user.id]
        );
        
        if (result.rows.length > 0) {
            res.json({ success: true, transaction: result.rows[0] });
        } else {
            const status = await queryTransactionStatus(req.params.checkoutRequestId);
            res.json({ success: true, transaction: null, mpesaStatus: status });
        }
    } catch (err) {
        console.error('Status check error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;