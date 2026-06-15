/**
 * AgriCalc - Authentication Routes
 * POST /api/auth/register - Register new user
 * POST /api/auth/login    - Login and get JWT
 * GET  /api/auth/me       - Get current user profile
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../database/init');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// ─── Register ────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ 
        error: 'Username, email, dan password wajib diisi' 
      });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Username minimal 3 karakter' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password minimal 6 karakter' });
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Format email tidak valid' });
    }

    const db = getDb();

    // Check for existing user
    const existing = db.prepare(
      'SELECT id FROM users WHERE email = ? OR username = ?'
    ).get(email, username);

    if (existing) {
      return res.status(409).json({ 
        error: 'Email atau username sudah terdaftar' 
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user
    const result = db.prepare(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)'
    ).run(username, email.toLowerCase(), passwordHash);

    // Generate token
    const token = jwt.sign(
      { id: result.lastInsertRowid, username, email: email.toLowerCase() },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Registrasi berhasil!',
      token,
      user: {
        id: result.lastInsertRowid,
        username,
        email: email.toLowerCase()
      }
    });
  } catch (err) {
    console.error('[Auth Register Error]', err);
    res.status(500).json({ error: 'Gagal mendaftar, coba lagi' });
  }
});

// ─── Login ───────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email dan password wajib diisi' 
      });
    }

    const db = getDb();

    // Find user by email
    const user = db.prepare(
      'SELECT * FROM users WHERE email = ?'
    ).get(email.toLowerCase());

    if (!user) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login berhasil!',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    console.error('[Auth Login Error]', err);
    res.status(500).json({ error: 'Gagal login, coba lagi' });
  }
});

// ─── Get Current User Profile ────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare(
      'SELECT id, username, email, created_at FROM users WHERE id = ?'
    ).get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    // Count user's calculations
    const calcCount = db.prepare(
      'SELECT COUNT(*) as count FROM calculations WHERE user_id = ?'
    ).get(req.user.id);

    res.json({
      user: {
        ...user,
        totalCalculations: calcCount.count
      }
    });
  } catch (err) {
    console.error('[Auth Me Error]', err);
    res.status(500).json({ error: 'Gagal mengambil profil' });
  }
});

module.exports = router;
