const express = require('express');
const { authenticate } = require('../middleware/auth');
const { PRODUCTS, CATEGORIES } = require('../data/products');
const { getDb } = require('../database');

const router = express.Router();

function applyDiscount(price, discountPercent) {
  if (!price || !discountPercent) return price;
  const p = parseFloat(price);
  const d = parseFloat(discountPercent);
  if (isNaN(p) || isNaN(d) || d <= 0) return price;
  return (p * (1 - d / 100)).toFixed(2);
}

// GET /api/products
router.get('/', authenticate, async (req, res) => {
  try {
    const sql = getDb();
    const prices = await sql`SELECT product_id, variant_size, price, currency FROM product_prices`;
    const priceMap = {};
    prices.forEach(p => {
      if (!priceMap[p.product_id]) priceMap[p.product_id] = {};
      priceMap[p.product_id][p.variant_size] = { price: p.price, currency: p.currency };
    });

    // Bayinin indirim oranını al
    let discountPercent = 0;
    if (req.user.role === 'dealer') {
      const userRows = await sql`SELECT discount_percent FROM users WHERE id = ${req.user.id}`;
      discountPercent = parseFloat(userRows[0]?.discount_percent || 0);
    }

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
      const sizePrices = {};
      (p.sizes || ['STD']).forEach(s => {
        const rawPrice = priceMap[p.id]?.[s]?.price ?? null;
        sizePrices[s] = {
          price: applyDiscount(rawPrice, discountPercent),
          original_price: discountPercent > 0 ? rawPrice : null,
          currency: priceMap[p.id]?.[s]?.currency ?? 'TRY',
        };
      });
      const isStd = !p.sizes || (p.sizes.length === 1 && p.sizes[0] === 'STD');
      const rawPrice = isStd ? (priceMap[p.id]?.['STD']?.price ?? null) : null;
      return {
        ...p,
        sizePrices,
        price: isStd ? applyDiscount(rawPrice, discountPercent) : null,
        original_price: isStd && discountPercent > 0 ? rawPrice : null,
        currency: isStd ? (priceMap[p.id]?.['STD']?.currency ?? 'TRY') : 'TRY',
        discount_percent: discountPercent,
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
    res.json({ ...product, price: priceRow?.price ?? null, currency: priceRow?.currency ?? 'TRY' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
