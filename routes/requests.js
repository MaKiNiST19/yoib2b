const express = require('express');
const { authenticate } = require('../middleware/auth');
const { getDb } = require('../database');
const { sendRequestNotification } = require('../mailer');

const router = express.Router();

// GET /api/requests
router.get('/', authenticate, async (req, res) => {
  try {
    const sql = getDb();
    const { status, limit = 20, page = 1 } = req.query;
    const offset = (page - 1) * limit;

    let requests;
    if (req.user.role === 'admin') {
      if (status) {
        requests = await sql`
          SELECT r.*, u.company_name, u.email as dealer_email, u.username as dealer_username
          FROM requests r JOIN users u ON r.dealer_id = u.id
          WHERE r.status = ${status}
          ORDER BY r.created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}
        `;
      } else {
        requests = await sql`
          SELECT r.*, u.company_name, u.email as dealer_email, u.username as dealer_username
          FROM requests r JOIN users u ON r.dealer_id = u.id
          ORDER BY r.created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}
        `;
      }
    } else {
      if (status) {
        requests = await sql`
          SELECT r.*, u.company_name, u.email as dealer_email, u.username as dealer_username
          FROM requests r JOIN users u ON r.dealer_id = u.id
          WHERE r.dealer_id = ${req.user.id} AND r.status = ${status}
          ORDER BY r.created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}
        `;
      } else {
        requests = await sql`
          SELECT r.*, u.company_name, u.email as dealer_email, u.username as dealer_username
          FROM requests r JOIN users u ON r.dealer_id = u.id
          WHERE r.dealer_id = ${req.user.id}
          ORDER BY r.created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}
        `;
      }
    }

    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/requests/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const sql = getDb();
    const rows = await sql`
      SELECT r.*, u.company_name, u.email as dealer_email, u.phone as dealer_phone,
             u.city as dealer_city, u.username as dealer_username
      FROM requests r JOIN users u ON r.dealer_id = u.id
      WHERE r.id = ${req.params.id}
    `;
    const request = rows[0];
    if (!request) return res.status(404).json({ error: 'Talep bulunamadı' });
    if (req.user.role !== 'admin' && request.dealer_id !== req.user.id) {
      return res.status(403).json({ error: 'Bu talebe erişim yetkiniz yok' });
    }

    const items = await sql`SELECT * FROM request_items WHERE request_id = ${req.params.id}`;
    res.json({ ...request, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/requests
router.post('/', authenticate, async (req, res) => {
  try {
    const { items, notes } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'En az bir ürün eklemelisiniz' });
    }
    for (const item of items) {
      if (!item.product_id || !item.variant_color || !item.quantity || item.quantity < 1) {
        return res.status(400).json({ error: 'Geçersiz ürün bilgisi' });
      }
    }

    const sql = getDb();

    const reqRows = await sql`
      INSERT INTO requests (dealer_id, status, notes, total_items)
      VALUES (${req.user.id}, 'pending', ${notes || null}, ${items.length})
      RETURNING id
    `;
    const requestId = reqRows[0].id;

    for (const item of items) {
      await sql`
        INSERT INTO request_items (request_id, product_id, product_name, product_sku, variant_color, variant_size, quantity, unit_price, notes)
        VALUES (${requestId}, ${item.product_id}, ${item.product_name}, ${item.product_sku},
                ${item.variant_color}, ${item.variant_size || null}, ${item.quantity},
                ${item.unit_price || null}, ${item.notes || null})
      `;
    }

    // E-posta bildirimi (async, hata yutulur)
    const dealerRows = await sql`SELECT * FROM users WHERE id = ${req.user.id}`;
    const reqDetailRows = await sql`SELECT * FROM requests WHERE id = ${requestId}`;
    sendRequestNotification(reqDetailRows[0], dealerRows[0], items).catch(err => {
      console.error('E-posta gönderilemedi:', err.message);
    });

    res.status(201).json({ id: requestId, message: 'Talebiniz başarıyla iletildi' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/requests/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const sql = getDb();
    const rows = await sql`SELECT * FROM requests WHERE id = ${req.params.id}`;
    const request = rows[0];
    if (!request) return res.status(404).json({ error: 'Talep bulunamadı' });
    if (req.user.role !== 'admin' && request.dealer_id !== req.user.id) {
      return res.status(403).json({ error: 'Bu talebe erişim yetkiniz yok' });
    }
    if (req.user.role !== 'admin' && request.status !== 'pending') {
      return res.status(400).json({ error: 'Sadece beklemedeki talepler iptal edilebilir' });
    }
    await sql`DELETE FROM requests WHERE id = ${req.params.id}`;
    res.json({ message: 'Talep iptal edildi' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
