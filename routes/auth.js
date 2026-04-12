const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli' });
    }

    const sql = getDb();
    const rows = await sql`SELECT * FROM users WHERE username = ${username} AND active = 1 LIMIT 1`;
    const user = rows[0];

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, company: user.company_name },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        company_name: user.company_name,
        email: user.email,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const sql = getDb();
    const rows = await sql`SELECT id, username, company_name, email, phone, city, role FROM users WHERE id = ${req.user.id}`;
    if (!rows[0]) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/auth/password
router.put('/password', authenticate, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Mevcut ve yeni şifre gerekli' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'Yeni şifre en az 6 karakter olmalı' });
    }

    const sql = getDb();
    const rows = await sql`SELECT * FROM users WHERE id = ${req.user.id}`;
    const user = rows[0];
    if (!bcrypt.compareSync(current_password, user.password_hash)) {
      return res.status(400).json({ error: 'Mevcut şifre hatalı' });
    }

    const hash = bcrypt.hashSync(new_password, 10);
    await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${req.user.id}`;
    res.json({ message: 'Şifre güncellendi' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
