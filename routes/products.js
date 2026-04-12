const express = require('express');
const { authenticate } = require('../middleware/auth');
const { PRODUCTS, CATEGORIES } = require('../data/products');
const { getDb } = require('../database');

const router = express.Router();

// GET /api/products
router.get('/', authenticate, async (req, res) => {
  try {
    const sql = getDb();
    const prices = await sql`SELECT product_id, price, currency FROM product_prices`;
    const priceMap = {};
    prices.forEach(p => { priceMap[p.product_id] = { price: p.price, currency: p.currency }; });

    const { category, search } = req.query;
    let products = PRODUCTS;

    if (category) products = products.filter(p => p.category === category);
    if (search) {
      const q = search.toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
      );
    }

    res.json(products.map(p => ({
      ...p,
      price: priceMap[p.id]?.price ?? null,
      currency: priceMap[p.id]?.currency ?? 'EUR',
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/categories
router.get('/categories', authenticate, (req, res) => {
  res.json(CATEGORIES);
});

// GET /api/products/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const product = PRODUCTS.find(p => p.id === req.params.id);
    if (!product) return res.status(404).json({ error: 'Ürün bulunamadı' });

    const sql = getDb();
    const rows = await sql`SELECT price, currency FROM product_prices WHERE product_id = ${product.id}`;
    const priceRow = rows[0];
    res.json({
      ...product,
      price: priceRow?.price ?? null,
      currency: priceRow?.currency ?? 'EUR',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
