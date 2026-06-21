// backend/routes/wallet.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const pool = require('../config/db');
const { b2cPayment } = require('../utils/b2c');
const earningsService = require('../services/earningsService');
const { stkPush, formatPhoneNumber } = require('../utils/mpesa');



// ============================================
// WALLET BALANCE
// ============================================

// backend/routes/wallet.js - Alternative version

router.get('/balance', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get user data
        const userResult = await pool.query(
            `SELECT wallet_balance, total_earnings FROM users WHERE id = $1`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];
        
        // Also get total withdrawn
        const withdrawnResult = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) as total_withdrawn 
             FROM transactions 
             WHERE user_id = $1 
             AND type = 'withdrawal' 
             AND status = 'completed'`,
            [userId]
        );

        res.json({
            success: true,
            balance: parseFloat(user.wallet_balance || 0),
            totalEarnings: parseFloat(user.total_earnings || 0), // From users table
            totalWithdrawn: parseFloat(withdrawnResult.rows[0].total_withdrawn || 0)
        });
    } catch (error) {
        console.error('❌ Error getting balance:', error);
        res.status(500).json({ error: 'Failed to get balance' });
    }
});

// ============================================
// TRANSACTION HISTORY
// ============================================

router.get('/transactions', authenticate, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, type, amount, status, description, created_at 
             FROM transactions 
             WHERE user_id = $1 
             ORDER BY created_at DESC 
             LIMIT 50`,
            [req.user.id]
        );
        
        res.json({
            success: true,
            transactions: result.rows
        });
    } catch (err) {
        console.error('Transactions error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// EARNINGS HISTORY
// ============================================

router.get('/earnings', authenticate, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT e.*, u.username as referred_user 
             FROM earnings e
             JOIN referrals r ON e.referral_id = r.id
             JOIN users u ON r.referred_id = u.id
             WHERE e.user_id = $1
             ORDER BY e.created_at DESC`,
            [req.user.id]
        );
        
        res.json({
            success: true,
            earnings: result.rows
        });
    } catch (err) {
        console.error('Earnings error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// WITHDRAWAL HISTORY
// ============================================

router.get('/withdrawals', authenticate, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM withdrawals 
             WHERE user_id = $1 
             ORDER BY created_at DESC`,
            [req.user.id]
        );
        
        res.json({
            success: true,
            withdrawals: result.rows
        });
    } catch (err) {
        console.error('Withdrawals error:', err);
        res.status(500).json({ error: err.message });
    }
});

// backend/routes/wallet.js

// ============================================
// REQUEST WITHDRAWAL
// ============================================

router.post('/withdraw', authenticate, async (req, res) => {
    const userId = req.user.id;
    const { amount, phone } = req.body;

    console.log(`💰 Withdrawal requested: User ${userId}, Amount Ksh ${amount}, Phone ${phone}`);

    // Validate amount
    if (!amount || isNaN(amount) || amount < 300) {
        return res.status(400).json({ error: 'Minimum withdrawal is Ksh 300' });
    }

    if (amount > 50000) {
        return res.status(400).json({ error: 'Maximum withdrawal is Ksh 50,000 per request' });
    }

    // Validate phone
    if (!phone) {
        return res.status(400).json({ error: 'Phone number is required' });
    }

    // Format phone
    const formattedPhone = formatPhoneNumber(phone);
    if (!formattedPhone || formattedPhone.length !== 12) {
        return res.status(400).json({ error: 'Please enter a valid phone number' });
    }

    try {
        await pool.query('BEGIN');

        // Get user balance
        const userResult = await pool.query(
            'SELECT wallet_balance FROM users WHERE id = $1 FOR UPDATE',
            [userId]
        );

        if (userResult.rows.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];
        const balance = parseFloat(user.wallet_balance || 0);

        console.log(`💰 User balance: ${balance}, Requested: ${amount}`);

        if (balance < amount) {
            await pool.query('ROLLBACK');
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Create withdrawal request with phone number
        await pool.query(
            `INSERT INTO withdrawals (user_id, amount, phone, status)
             VALUES ($1, $2, $3, 'pending')`,
            [userId, amount, formattedPhone]
        );

        // Deduct from wallet
        await pool.query(
            'UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2',
            [amount, userId]
        );

        // Record transaction
        await pool.query(
            `INSERT INTO transactions (user_id, type, amount, status, description)
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, 'withdrawal', amount, 'pending', `Withdrawal to ${formattedPhone}`]
        );

        await pool.query('COMMIT');

        console.log(`✅ Withdrawal request created: User ${userId}, Amount Ksh ${amount}, Phone ${formattedPhone}`);

        res.json({
            success: true,
            message: 'Withdrawal request submitted successfully. Awaiting admin approval.'
        });

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('❌ Withdrawal error:', error);
        res.status(500).json({ 
            error: 'Failed to process withdrawal',
            details: error.message 
        });
    }
});

// ============================================
// GET WITHDRAWALS
// ============================================

router.get('/withdrawals', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const result = await pool.query(
            `SELECT * FROM withdrawals 
             WHERE user_id = $1 
             ORDER BY created_at DESC`,
            [userId]
        );

        res.json({
            success: true,
            withdrawals: result.rows
        });
    } catch (error) {
        console.error('❌ Error getting withdrawals:', error);
        res.status(500).json({ error: 'Failed to get withdrawals' });
    }
});
// ============================================
// GET WITHDRAWALS
// ============================================

router.get('/withdrawals', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const result = await pool.query(
            `SELECT * FROM withdrawals 
             WHERE user_id = $1 
             ORDER BY created_at DESC`,
            [userId]
        );

        res.json({
            success: true,
            withdrawals: result.rows
        });
    } catch (error) {
        console.error('❌ Error getting withdrawals:', error);
        res.status(500).json({ error: 'Failed to get withdrawals' });
    }
});

// ============================================
// CANCEL WITHDRAWAL
// ============================================

router.post('/withdraw/cancel/:withdrawalId', authenticate, async (req, res) => {
    const withdrawalId = req.params.withdrawalId;
    const userId = req.user.id;
    
    try {
        await pool.query('BEGIN');
        
        const withdrawal = await pool.query(
            `SELECT * FROM withdrawals 
             WHERE id = $1 AND user_id = $2 AND status IN ('processing', 'pending')`,
            [withdrawalId, userId]
        );
        
        if (withdrawal.rows.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ error: 'Withdrawal not found or cannot be cancelled' });
        }
        
        const wd = withdrawal.rows[0];
        
        await pool.query(
            'UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2',
            [wd.amount, userId]
        );
        
        await pool.query(
            `UPDATE withdrawals 
             SET status = 'cancelled', 
                 rejection_reason = 'Cancelled by user'
             WHERE id = $1`,
            [withdrawalId]
        );
        
        await pool.query(
            `UPDATE transactions 
             SET status = 'cancelled', 
                 description = 'Withdrawal cancelled by user'
             WHERE user_id = $1 AND type = 'withdrawal' AND status IN ('processing', 'pending')
             LIMIT 1`,
            [userId]
        );
        
        await pool.query('COMMIT');
        
        res.json({ 
            success: true, 
            message: `Withdrawal of Ksh ${wd.amount} has been cancelled. Amount refunded to your wallet.` 
        });
        
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('Cancel withdrawal error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// GET SINGLE WITHDRAWAL STATUS
// ============================================

router.get('/withdraw/status/:withdrawalId', authenticate, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM withdrawals 
             WHERE id = $1 AND user_id = $2`,
            [req.params.withdrawalId, req.user.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Withdrawal not found' });
        }
        
        res.json({ success: true, withdrawal: result.rows[0] });
    } catch (err) {
        console.error('Withdrawal status error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// SPIN & WIN EARNINGS
// ============================================

router.post('/spin-earn', authenticate, async (req, res) => {
    const { amount } = req.body;
    const userId = req.user.id;
    
    if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
    }
    
    try {
        await pool.query('BEGIN');
        
        // Update user's wallet and total earnings
        await pool.query(
            `UPDATE users 
             SET wallet_balance = wallet_balance + $1,
                 total_earnings = total_earnings + $1
             WHERE id = $2`,
            [amount, userId]
        );
        
        // ============================================
        // RECORD SPIN EARNING IN EARNINGS TABLE
        // ============================================
        await earningsService.recordEarning(
            userId,              // user_id
            amount,              // amount
            'spin_earning',      // type
            'Spin & Win reward', // description
            null,
            `SPIN_${Date.now()}` // source_id
        );
        
        // Record transaction
        await pool.query(
            `INSERT INTO transactions (user_id, type, amount, status, description) 
             VALUES ($1, 'spin_win', $2, 'completed', 'Spin & Win reward')`,
            [userId, amount]
        );
        
        await pool.query('COMMIT');
        
        // Get updated balance
        const result = await pool.query(
            'SELECT wallet_balance, total_earnings FROM users WHERE id = $1',
            [userId]
        );
        
        res.json({
            success: true,
            message: `You won Ksh ${amount}!`,
            newBalance: result.rows[0].wallet_balance,
            totalEarnings: result.rows[0].total_earnings
        });
        
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('Spin earning error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get spin statistics
router.get('/spin-stats', authenticate, async (req, res) => {
    const userId = req.user.id;
    
    try {
        // Get total spin earnings
        const result = await pool.query(
            `SELECT COALESCE(SUM(amount), 0) as total 
             FROM transactions 
             WHERE user_id = $1 AND type = 'spin_win' AND status = 'completed'`,
            [userId]
        );
        
        res.json({
            success: true,
            totalSpinEarnings: parseFloat(result.rows[0].total)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Buy a spin
router.post('/buy-spin', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const spinCost = 20;
        
        // Check user balance
        const userResult = await pool.query(
            'SELECT wallet_balance FROM users WHERE id = $1',
            [userId]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const balance = parseFloat(userResult.rows[0].wallet_balance);
        
        if (balance < spinCost) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }
        
        // Deduct from wallet
        await pool.query(
            'UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2',
            [spinCost, userId]
        );
        
        // Record transaction
        await pool.query(
            `INSERT INTO transactions (user_id, type, amount, status, description)
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, 'spin_purchase', spinCost, 'completed', 'Purchased 1 spin']
        );
        
        // Add spin to user's spin stats (track free spins used)
        await pool.query(
            `INSERT INTO spin_stats (user_id, free_spins_used, last_spin_date)
             VALUES ($1, false, CURRENT_TIMESTAMP)
             ON CONFLICT (user_id) 
             DO UPDATE SET free_spins_used = false, last_spin_date = CURRENT_TIMESTAMP`,
            [userId]
        );
        
        res.json({
            success: true,
            message: 'Spin purchased successfully!'
        });
        
    } catch (error) {
        console.error('Buy spin error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// EARNINGS FROM DIFFERENT SOURCES
// ============================================

// Generic endpoint for adding earnings (spin, videos, blogs)
router.post('/add-earnings', authenticate, async (req, res) => {
    const { amount, source } = req.body; // source: 'spin', 'video', 'blog'
    const userId = req.user.id;
    
    // Validate source
    const validSources = ['spin', 'video', 'blog'];
    if (!validSources.includes(source)) {
        return res.status(400).json({ error: 'Invalid earnings source' });
    }
    
    if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
    }
    
    // Get source display name
    const sourceNames = {
        spin: 'Spin & Win',
        video: 'Watch & Earn',
        blog: 'Read & Earn'
    };
    
    try {
        await pool.query('BEGIN');
        
        // Update user's wallet and total earnings
        await pool.query(
            `UPDATE users 
             SET wallet_balance = wallet_balance + $1,
                 total_earnings = total_earnings + $1
             WHERE id = $2`,
            [amount, userId]
        );
        
        // ============================================
        // RECORD EARNING IN EARNINGS TABLE
        // ============================================
        let earningType = '';
        let description = '';
        
        switch(source) {
            case 'spin':
                earningType = 'spin_earning';
                description = 'Spin & Win reward';
                break;
            case 'video':
                earningType = 'video_earning';
                description = 'Watch & Earn reward';
                break;
            case 'blog':
                earningType = 'blog_earning';
                description = 'Read & Earn reward';
                break;
        }
        
        await earningsService.recordEarning(
            userId,              // user_id
            amount,              // amount
            earningType,         // type
            description,         // description
            null,
            `${source.toUpperCase()}_${Date.now()}` // source_id
        );
        
        // Record transaction with specific source type
        await pool.query(
            `INSERT INTO transactions (user_id, type, amount, status, description) 
             VALUES ($1, $2, $3, 'completed', $4)`,
            [userId, `${source}_earning`, amount, `${sourceNames[source]} reward: Ksh ${amount}`]
        );
        
        await pool.query('COMMIT');
        
        // Get updated balance
        const result = await pool.query(
            'SELECT wallet_balance, total_earnings FROM users WHERE id = $1',
            [userId]
        );
        
        res.json({
            success: true,
            message: `You earned Ksh ${amount} from ${sourceNames[source]}!`,
            newBalance: result.rows[0].wallet_balance,
            totalEarnings: result.rows[0].total_earnings
        });
        
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('Add earnings error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get earnings by source type
router.get('/earnings-by-source', authenticate, async (req, res) => {
    const userId = req.user.id;
    
    try {
        const result = await pool.query(
            `SELECT 
                type,
                COUNT(*) as count,
                SUM(amount) as total
             FROM transactions 
             WHERE user_id = $1 
               AND type IN ('spin_earning', 'video_earning', 'blog_earning', 'commission')
               AND status = 'completed'
             GROUP BY type`,
            [userId]
        );
        
        const earningsBySource = {
            referral: 0,
            spin: 0,
            video: 0,
            blog: 0
        };
        
        result.rows.forEach(row => {
            if (row.type === 'commission') earningsBySource.referral = parseFloat(row.total);
            if (row.type === 'spin_earning') earningsBySource.spin = parseFloat(row.total);
            if (row.type === 'video_earning') earningsBySource.video = parseFloat(row.total);
            if (row.type === 'blog_earning') earningsBySource.blog = parseFloat(row.total);
        });
        
        res.json({
            success: true,
            earningsBySource
        });
        
    } catch (err) {
        console.error('Earnings by source error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// WALLET BALANCE
// ============================================

router.get('/balance', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;

        const userResult = await pool.query(
            `SELECT wallet_balance,total_earnings
             FROM users
             WHERE id=$1`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                error: 'User not found'
            });
        }

        const user = userResult.rows[0];

        const withdrawnResult = await pool.query(
            `SELECT COALESCE(SUM(amount),0) AS total_withdrawn
             FROM transactions
             WHERE user_id=$1
             AND type='withdrawal'
             AND status='completed'`,
            [userId]
        );

        res.json({
            success: true,
            balance: parseFloat(user.wallet_balance || 0),
            totalEarnings: parseFloat(user.total_earnings || 0),
            totalWithdrawn: parseFloat(
                withdrawnResult.rows[0].total_withdrawn || 0
            )
        });

    } catch (error) {
        console.error('Balance error:', error);

        res.status(500).json({
            error: 'Failed to get balance'
        });
    }
});

// backend/routes/wallet.js

// Initiate deposit with user-provided phone number
router.post('/deposit', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount, phone } = req.body;
        
        console.log(`💰 Deposit request: User ${userId}, Amount Ksh ${amount}, Phone ${phone}`);
        
        // Validate amount
        if (!amount || amount < 10) {
            return res.status(400).json({ 
                error: 'Minimum deposit is Ksh 10' 
            });
        }
        
        if (amount > 150000) {
            return res.status(400).json({ 
                error: 'Maximum deposit is Ksh 150,000' 
            });
        }
        
        // Validate phone
        if (!phone) {
            return res.status(400).json({ 
                error: 'Phone number is required' 
            });
        }
        
        // Format phone number
        const formattedPhone = formatPhoneNumber(phone);
        if (!formattedPhone || formattedPhone.length < 10) {
            return res.status(400).json({ 
                error: 'Please enter a valid phone number' 
            });
        }
        
        const accountRef = `DEP_${userId}_${Date.now()}`;
        
        console.log(`💰 Sending STK Push to ${formattedPhone} for Ksh ${amount}`);
        
        // Send STK Push
        const response = await stkPush(formattedPhone, amount, accountRef, 'Wallet Deposit');
        
        // Save transaction
        await pool.query(
            `INSERT INTO transactions (user_id, type, amount, status, checkout_request_id, description)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [userId, 'deposit', amount, 'pending', response.CheckoutRequestID, `M-PESA deposit to ${formattedPhone}`]
        );
        
        res.json({
            success: true,
            message: 'STK Push sent. Check your phone for M-PESA prompt.',
            checkoutRequestId: response.CheckoutRequestID,
            phone: formattedPhone,
            amount: amount
        });
        
    } catch (error) {
        console.error('❌ Deposit error:', error);
        res.status(500).json({ 
            error: 'Failed to initiate deposit',
            details: error.message 
        });
    }
});
// M-PESA Callback (simplified)
router.post('/deposit-callback', async (req, res) => {
    try {
        const stkCallback = req.body.Body?.stkCallback;
        
        if (!stkCallback) {
            return res.json({ ResultCode: 0, ResultDesc: "Accepted" });
        }
        
        if (stkCallback.ResultCode === 0) {
            const items = stkCallback.CallbackMetadata?.Item || [];
            const receipt = items.find(i => i.Name === 'MpesaReceiptNumber')?.Value;
            const amount = parseFloat(items.find(i => i.Name === 'Amount')?.Value);
            
            // Find and update transaction
            const txResult = await pool.query(
                `SELECT * FROM transactions 
                 WHERE checkout_request_id = $1 AND status = 'pending'`,
                [stkCallback.CheckoutRequestID]
            );
            
            if (txResult.rows.length > 0) {
                const transaction = txResult.rows[0];
                
                await pool.query(
                    `UPDATE transactions 
                     SET status = 'completed', mpesa_receipt = $1 
                     WHERE id = $2`,
                    [receipt, transaction.id]
                );
                
                // Add to wallet
                await pool.query(
                    'UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2',
                    [amount, transaction.user_id]
                );
                
                console.log(`✅ Deposit successful: Ksh ${amount} added to user ${transaction.user_id}`);
            }
        }
        
        res.json({ ResultCode: 0, ResultDesc: "Accepted" });
        
    } catch (error) {
        console.error('Callback error:', error);
        res.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }
});



module.exports = router;