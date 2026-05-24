// backend/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { validateRegistration, validateLogin } = require('../middleware/validate');
const router = express.Router();

// Generate unique referral code
const generateReferralCode = () => {
    return 'REF' + Math.random().toString(36).substring(2, 10).toUpperCase();
};

// Format phone number to 254 format
const formatPhoneNumber = (phone) => {
    if (!phone) return null;
    let cleaned = phone.toString().replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = '254' + cleaned.substring(1);
    else if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);
    else if (!cleaned.startsWith('254')) cleaned = '254' + cleaned;
    return cleaned;
};

// Register new user
router.post('/register', validateRegistration, async (req, res) => {
    const { username, email, phone, password, referral_code } = req.body;

    console.log('\n========================================');
    console.log('📝 REGISTRATION ATTEMPT');
    console.log('========================================');
    console.log('Username:', username);
    console.log('Email:', email);
    console.log('Phone:', phone);
    console.log('Referral code received:', referral_code || 'none');
    console.log('========================================\n');

    try {
        const formattedPhone = formatPhoneNumber(phone);

        // Check existing user
        const existing = await pool.query(
            'SELECT id FROM users WHERE email = $1 OR phone = $2 OR username = $3',
            [email.toLowerCase(), formattedPhone, username]
        );
        
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newReferralCode = generateReferralCode();  // FIXED: variable name

        // ============================================
        // CHECK REFERRAL CODE - Get referrer's ID
        // ============================================
        let referrerId = null;
        let referredByCode = null;

        if (referral_code && referral_code.trim() !== '') {
            const refUser = await pool.query(
                'SELECT id, username FROM users WHERE referral_code = $1',
                [referral_code.trim()]
            );
            
            if (refUser.rows.length > 0) {
                referrerId = refUser.rows[0].id;  // Store the ID, not the code
                referredByCode = referral_code.trim();
                console.log(`✅ User will be referred by: ${refUser.rows[0].username} (ID: ${referrerId})`);
            }
        }

        // ============================================
        // INSERT USER
        // ============================================
        const result = await pool.query(
            `INSERT INTO users (username, email, phone, password, referral_code, referred_by_code, is_active, registration_paid) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
             RETURNING id, username, email, referral_code, referred_by_code`,
            [username, email.toLowerCase(), formattedPhone, hashedPassword, newReferralCode, referredByCode, false, false]
        );

        console.log(`✅ User inserted with ID: ${result.rows[0].id}`);
        console.log(`   Referred by code: ${result.rows[0].referred_by_code || 'none'}`);

        // ============================================
        // CREATE PENDING REFERRAL RECORD (using referrerId - INTEGER)
        // ============================================
        if (referrerId) {
            await pool.query(
                `INSERT INTO referrals (referrer_id, referred_id, status, commission, payment_status) 
                 VALUES ($1, $2, 'pending', 120.00, 'pending')`,
                [referrerId, result.rows[0].id]  // FIXED: using referrerId (INTEGER)
            );
            
            // Update referrer's referral count
            await pool.query(
                `UPDATE users SET referral_count = referral_count + 1 WHERE id = $1`,
                [referrerId]
            );
            
            console.log(`✅✅✅ PENDING REFERRAL CREATED: ${referrerId} -> ${result.rows[0].id}`);
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: result.rows[0].id, email: result.rows[0].email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token,
            user: result.rows[0],
            message: referrerId ? 
                'Account created! You were referred. Pay Ksh 300 to activate.' : 
                'Account created! Pay Ksh 300 to activate.'
        });
        
    } catch (err) {
        console.error('❌ Registration error:', err.message);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login user
router.post('/login', validateLogin, async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email.toLowerCase()]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];
        const isValid = await bcrypt.compare(password, user.password);
        
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        const { password: _, ...userData } = user;
        
        res.json({ success: true, token, user: userData });
    } catch (err) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get current user
router.get('/me', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const result = await pool.query(
            `SELECT id, username, email, phone, role, is_active, registration_paid, 
                    referral_code, referred_by_code, wallet_balance, total_earnings, 
                    total_withdrawn, referral_count, created_at 
             FROM users WHERE id = $1`,
            [decoded.id]
        );
        res.json({ user: result.rows[0] });
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Check activation
router.get('/check-activation', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const result = await pool.query(
            'SELECT registration_paid FROM users WHERE id = $1',
            [decoded.id]
        );
        res.json({ is_activated: result.rows[0]?.registration_paid || false });
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

module.exports = router;