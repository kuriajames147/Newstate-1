const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const router = express.Router();

// Generate referral code
const generateReferralCode = () => {
  return 'REF' + Math.random().toString(36).substring(2, 10).toUpperCase();
};

// Format phone number
const formatPhoneNumber = (phone) => {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  }
  if (!cleaned.startsWith('254')) {
    cleaned = '254' + cleaned;
  }
  return cleaned;
};

// REGISTER
router.post('/register', async (req, res) => {
  console.log('📝 Register endpoint hit');
  const { username, email, phone, password, referral_code } = req.body;

  try {
    const formattedPhone = formatPhoneNumber(phone);
    
    // Check existing user
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR phone = $2',
      [email, formattedPhone]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const referralCode = generateReferralCode();

    // Check referral
    let referredBy = null;
    if (referral_code) {
      const refUser = await pool.query(
        'SELECT id FROM users WHERE referral_code = $1',
        [referral_code]
      );
      if (refUser.rows.length > 0) {
        referredBy = refUser.rows[0].id;
      }
    }

    // Create user
    const result = await pool.query(
      `INSERT INTO users (username, email, phone, password, referral_code, referred_by) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, username, email, referral_code`,
      [username, email, formattedPhone, hashedPassword, referralCode, referredBy]
    );

    // Generate token
    const token = jwt.sign(
      { id: result.rows[0].id, email: result.rows[0].email },
      process.env.JWT_SECRET || 'your_secret_key',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: result.rows[0],
      message: 'Account created. Please activate.'
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  console.log('🔐 Login endpoint hit');
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'your_secret_key',
      { expiresIn: '7d' }
    );

    const { password: _, ...userData } = user;
    
    res.json({
      success: true,
      token,
      user: userData
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET CURRENT USER
router.get('/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
    const result = await pool.query(
      'SELECT id, username, email, phone, registration_paid, referral_code FROM users WHERE id = $1',
      [decoded.id]
    );
    
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;