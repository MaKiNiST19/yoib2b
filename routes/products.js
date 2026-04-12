const express = require('express');
const { authenticate } = require('../middleware/auth');
const { PRODUCTS, CATEGORIES } = require('../data/products');
const { getDb } = require('../database');

const router = express.Router();

// GET /api/products
router.get('/', authenticate, async (req, res) => {
  try {
    const sql = getDb();
    const prices = await sql`SELECT product_id, variant_size, price, currency FROM product_prices`;
    // priceMap[productId][size] = { price, currency }
    const priceMap = {};
    prices.forEach(p => {
      if (!priceMap[p.product_id]) priceMap[p.product_id] = {};
      priceMap[p.product_id][p.variant_size] = { price: p.price, currency: p.currency };
    });

    const { category, search } = req.query;
    let products = PRODUCTS;

    if (category) products = products.filter(p => p.category === category);
    if (search) {
      const q = search.toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
      );
    }

    res.json(products.map(p => {
      // For size products return prices per size, for others return single price
      if (p.sizes) {
        const sizePrices = {};
        p.sizes.forEach(s => {
          sizePrices[s] = {
            price: priceMap[p.id]?.[s]?.price ?? null,
            currency: priceMap[p.id]?.[s]?.currency ?? 'TRY',
          };
        });
        return { ...p, price: null, currency: 'TRY', sizePrices };
      }
      return {
        ...p,
        price: priceMap[p.id]?.['']?.price ?? null,
        currency: priceMap[p.id]?.['']?.currency ?? 'TRY',
      };
    }));
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
      currency: priceRow?.currency ?? 'TRY',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
