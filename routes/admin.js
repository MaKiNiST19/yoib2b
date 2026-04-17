const express = require('express');
const bcrypt = require('bcryptjs');
const { requireAdmin } = require('../middleware/auth');
const { getDb } = require('../database');
const { PRODUCTS } = require('../data/products');

const router = express.Router();

// PATCH /api/admin/requests/:id/status
router.patch('/requests/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status, admin_notes } = req.body;
    const validStatuses = ['pending', 'approved', 'rejected', 'processing', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Geçersiz durum' });
    }
    const sql = getDb();
    const rows = await sql`SELECT id FROM requests WHERE id = ${req.params.id}`;
    if (!rows[0]) return res.status(404).json({ error: 'Talep bulunamadı' });

    await sql`
      UPDATE requests SET status = ${status}, admin_notes = ${admin_notes || null}, updated_at = NOW()
      WHERE id = ${req.params.id}
    `;
    res.json({ message: 'Talep durumu güncellendi' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/dealers
router.get('/dealers', requireAdmin, async (req, res) => {
  try {
    const sql = getDb();
    const dealers = await sql`
      SELECT u.id, u.username, u.company_name, u.email, u.phone, u.city, u.discount_percent, u.active, u.created_at,
        (SELECT COUNT(*) FROM requests WHERE dealer_id = u.id) as total_requests,
        (SELECT COUNT(*) FROM requests WHERE dealer_id = u.id AND status = 'pending') as pending_requests
      FROM users u WHERE u.role = 'dealer'
      ORDER BY u.company_name
    `;
    res.json(dealers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/dealers
router.post('/dealers', requireAdmin, async (req, res) => {
  try {
    const { username, password, company_name, email, phone, city, discount_percent } = req.body;
    if (!username || !password || !company_name || !email) {
      return res.status(400).json({ error: 'Kullanıcı adı, şifre, firma adı ve e-posta gerekli' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı' });
    }

    const sql = getDb();
    const existing = await sql`SELECT id FROM users WHERE username = ${username}`;
    if (existing[0]) return res.status(409).json({ error: 'Bu kullanıcı adı zaten kullanılıyor' });

    const hash = bcrypt.hashSync(password, 10);
    const disc = parseFloat(discount_percent) || 0;
    const rows = await sql`
      INSERT INTO users (username, password_hash, company_name, email, phone, city, discount_percent, role)
      VALUES (${username}, ${hash}, ${company_name}, ${email}, ${phone || null}, ${city || null}, ${disc}, 'dealer')
      RETURNING id
    `;
    res.status(201).json({ id: rows[0].id, message: 'Bayi oluşturuldu' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/dealers/:id
router.put('/dealers/:id', requireAdmin, async (req, res) => {
  try {
    const { company_name, email, phone, city, active, password, discount_percent } = req.body;
    const sql = getDb();
    const rows = await sql`SELECT * FROM users WHERE id = ${req.params.id} AND role = 'dealer'`;
    const dealer = rows[0];
    if (!dealer) return res.status(404).json({ error: 'Bayi bulunamadı' });

    if (password) {
      if (password.length < 6) return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı' });
      const hash = bcrypt.hashSync(password, 10);
      await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${req.params.id}`;
    }

    const disc = discount_percent !== undefined ? (parseFloat(discount_percent) || 0) : parseFloat(dealer.discount_percent || 0);
    await sql`
      UPDATE users SET
        company_name     = ${company_name || dealer.company_name},
        email            = ${email || dealer.email},
        phone            = ${phone !== undefined ? phone : dealer.phone},
        city             = ${city !== undefined ? city : dealer.city},
        discount_percent = ${disc},
        active           = ${active !== undefined ? (active ? 1 : 0) : dealer.active}
      WHERE id = ${req.params.id}
    `;
    res.json({ message: 'Bayi güncellendi' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/dealers/:id  (pasif yap)
router.delete('/dealers/:id', requireAdmin, async (req, res) => {
  try {
    const sql = getDb();
    await sql`UPDATE users SET active = 0 WHERE id = ${req.params.id} AND role = 'dealer'`;
    res.json({ message: 'Bayi devre dışı bırakıldı' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/stats
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const sql = getDb();
    const [dealers, total, pending, approved, processing, completed] = await Promise.all([
      sql`SELECT COUNT(*) as c FROM users WHERE role='dealer' AND active=1`,
      sql`SELECT COUNT(*) as c FROM requests`,
      sql`SELECT COUNT(*) as c FROM requests WHERE status='pending'`,
      sql`SELECT COUNT(*) as c FROM requests WHERE status='approved'`,
      sql`SELECT COUNT(*) as c FROM requests WHERE status='processing'`,
      sql`SELECT COUNT(*) as c FROM requests WHERE status='completed'`,
    ]);
    res.json({
      total_dealers:      Number(dealers[0].c),
      total_requests:     Number(total[0].c),
      pending_requests:   Number(pending[0].c),
      approved_requests:  Number(approved[0].c),
      processing_requests:Number(processing[0].c),
      completed_requests: Number(completed[0].c),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/products/prices
router.get('/products/prices', requireAdmin, async (req, res) => {
  try {
    const sql = getDb();
    const prices = await sql`SELECT * FROM product_prices`;
    // priceMap[productId][size] = { price, currency }
    const priceMap = {};
    prices.forEach(p => {
      if (!priceMap[p.product_id]) priceMap[p.product_id] = {};
      const key = p.variant_size || 'STD';
      priceMap[p.product_id][key] = { price: p.price, currency: p.currency };
    });

    const result = [];
    for (const p of PRODUCTS) {
      if (p.sizes) {
        // One entry per size
        for (const size of p.sizes) {
          result.push({
            id: p.id,
            name: p.name,
            sku: p.sku,
            size,
            price: priceMap[p.id]?.[size]?.price ?? null,
            currency: priceMap[p.id]?.[size]?.currency ?? 'TRY',
          });
        }
      } else {
        result.push({
          id: p.id,
          name: p.name,
          sku: p.sku,
          size: 'STD',
          price: priceMap[p.id]?.['STD']?.price ?? null,
          currency: priceMap[p.id]?.['STD']?.currency ?? 'TRY',
        });
      }
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/products/:id/price  — body: { price, currency, size? }
router.put('/products/:id/price', requireAdmin, async (req, res) => {
  try {
    const { price, currency, size } = req.body;
    const variantSize = size || 'STD';
    const sql = getDb();
    await sql`
      INSERT INTO product_prices (product_id, variant_size, price, currency, updated_at)
      VALUES (${req.params.id}, ${variantSize}, ${price}, ${currency || 'TRY'}, NOW())
      ON CONFLICT (product_id, variant_size) DO UPDATE
        SET price = EXCLUDED.price, currency = EXCLUDED.currency, updated_at = NOW()
    `;
    res.json({ message: 'Fiyat güncellendi' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/logs
router.get('/logs', requireAdmin, async (req, res) => {
  try {
    const sql = getDb();
    const { limit = 100, page = 1 } = req.query;
    const offset = (page - 1) * limit;
    const logs = await sql`
      SELECT * FROM request_logs
      ORDER BY created_at DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `;
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
