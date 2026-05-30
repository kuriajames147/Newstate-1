// backend/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { validateRegistration, validateLogin } = require('../middleware/validate');
const router = express.Router();

// ============================================
// HELPERS
// ============================================

// Generate a unique referral code
const generateReferralCode = () => {
    return 'REF' + Math.random().toString(36).substring(2, 10).toUpperCase();
};

// Normalise Kenyan phone numbers to 254XXXXXXXXX format
const formatPhoneNumber = (phone) => {
    if (!phone) return null;
    let cleaned = phone.toString().replace(/\D/g, '');
    if (cleaned.startsWith('0'))        cleaned = '254' + cleaned.substring(1);
    else if (cleaned.startsWith('+'))   cleaned = cleaned.substring(1);
    else if (!cleaned.startsWith('254')) cleaned = '254' + cleaned;
    return cleaned;
};

// ============================================
// POST /register
// ============================================
router.post('/register', validateRegistration, async (req, res) => {
    // Destructure — referral_code may or may not be present
    const { username, email, phone, password, referral_code } = req.body;

    console.log('\n========================================');
    console.log('📝 REGISTRATION ATTEMPT');
    console.log('========================================');
    console.log('Username     :', username);
    console.log('Email        :', email);
    console.log('Phone        :', phone);
    console.log('Referral code:', referral_code || '(none)');
    console.log('========================================\n');

    try {
        const formattedPhone = formatPhoneNumber(phone);

        // ── 1. Duplicate check ────────────────────────────────────
        const existing = await pool.query(
            'SELECT id FROM users WHERE email = $1 OR phone = $2 OR username = $3',
            [email.toLowerCase(), formattedPhone, username]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({ success: false, error: 'User already exists with that email, phone, or username.' });
        }

        // ── 2. Hash password & generate this user's referral code ─
        const hashedPassword  = await bcrypt.hash(password, 10);
        const newReferralCode = generateReferralCode();

        // ── 3. Resolve referrer ───────────────────────────────────
        let referrerId    = null;
        let referredByCode = null;

        // Sanitise the incoming code — treat blank / whitespace as absent
        const sanitisedCode = (referral_code || '').trim();

        if (sanitisedCode !== '') {
            const refUser = await pool.query(
                'SELECT id, username FROM users WHERE referral_code = $1',
                [sanitisedCode]
            );

            if (refUser.rows.length > 0) {
                referrerId     = refUser.rows[0].id;
                referredByCode = sanitisedCode;
                console.log(`✅ Referrer resolved: ${refUser.rows[0].username} (ID: ${referrerId})`);
            } else {
                // Code provided but not found — still allow registration, just ignore the code
                console.log(`⚠️  Referral code not found in DB: "${sanitisedCode}" — proceeding without referral`);
            }
        } else {
            console.log('ℹ️  No referral code provided');
        }

        // ── 4. Insert new user ────────────────────────────────────
        // FIX: Added placeholders $7 and $8 to match the 8 array values below
        const result = await pool.query(
            `INSERT INTO users
                 (username, email, phone, password, referral_code, referred_by_code, is_active, registration_paid)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, username, email, referral_code, referred_by_code`,
            [
                username,
                email.toLowerCase(),
                formattedPhone,
                hashedPassword,
                newReferralCode,
                referredByCode,   // NULL if no valid referrer found
                false,            // Maps to $7 (is_active)
                false             // Maps to $8 (registration_paid)
            ]
        );

        // FIX: Uncommented this so lower lines can access newUser.id without crashing
        const newUser = result.rows[0];
        console.log(`👤 User inserted — ID: ${newUser.id}, referred_by_code: ${newUser.referred_by_code || 'none'}`);

        // ── 5. Create pending referral record ─────────────────────
        // Status becomes 'completed' (and commission is credited) once
        // the new user pays the activation fee (handled in payments route).
        if (referrerId) {
            // Fetch commission amount from system settings (default 120)
            const commissionResult = await pool.query(
                "SELECT setting_value FROM system_settings WHERE setting_key = 'referral_commission'"
            );
            const commission = parseFloat(commissionResult.rows[0]?.setting_value ?? 120);

            // Insert referral record
            await pool.query(
                `INSERT INTO referrals (referrer_id, referred_id, status, commission, payment_status)
                 VALUES ($1, $2, 'pending', $3, 'pending')`,
                [referrerId, newUser.id, commission]
            );

            // Increment referrer's total referral count
            await pool.query(
                'UPDATE users SET referral_count = referral_count + 1 WHERE id = $1',
                [referrerId]
            );

            console.log(`✅ Pending referral created: referrer ${referrerId} → new user ${newUser.id} (commission: ${commission})`);
        } else {
            console.log('ℹ️  No referral record created');
        }

        // ── 6. Issue JWT ──────────────────────────────────────────
        const token = jwt.sign(
            { id: newUser.id, email: newUser.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log('✅ Registration complete\n');

        return res.status(201).json({
            success: true,
            token,
            user: newUser,
            message: referrerId
                ? 'Account created successfully! You were referred by a friend. Please pay Ksh 300 to activate.'
                : 'Account created successfully. Please pay Ksh 300 to activate and start earning.'
        });

    } catch (err) {
        console.error('❌ Registration error:', err.message, err.stack);
        return res.status(500).json({ success: false, error: 'Registration failed. Please try again.' });
    }
});

// ============================================
// POST /login
// ============================================
router.post('/login', validateLogin, async (req, res) => {
    const { email, password } = req.body;

    console.log('\n========================================');
    console.log('🔐 LOGIN ATTEMPT');
    console.log('Email:', email);
    console.log('========================================\n');

    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (result.rows.length === 0) {
            console.log('❌ User not found:', email);
            return res.status(401).json({ success: false, error: 'Invalid email or password' });
        }

        const user            = result.rows[0];
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            console.log('❌ Invalid password for:', email);
            return res.status(401).json({ success: false, error: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role || 'user' },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Never return the hashed password to the client
        const { password: _, ...userWithoutPassword } = user;

        console.log(`✅ Login success: ${user.username} (ID: ${user.id}) | paid: ${user.registration_paid}\n`);

        return res.json({
            success: true,
            token,
            user: userWithoutPassword
        });
    } catch (err) {
        console.error('❌ Login error:', err.message, err.stack);
        return res.status(500).json({ success: false, error: 'Login failed. Please try again.' });
    }
});

module.exports = router;
