const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL ortam değişkeni tanımlı değil. .env dosyanızı kontrol edin.');
  }
  return neon(process.env.DATABASE_URL);
}

async function initDb() {
  const sql = getDb();

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id        SERIAL PRIMARY KEY,
      username  TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      company_name  TEXT NOT NULL,
      email     TEXT NOT NULL,
      phone     TEXT,
      city      TEXT,
      role      TEXT NOT NULL DEFAULT 'dealer',
      active    INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS requests (
      id          SERIAL PRIMARY KEY,
      dealer_id   INTEGER NOT NULL REFERENCES users(id),
      status      TEXT NOT NULL DEFAULT 'pending',
      notes       TEXT,
      admin_notes TEXT,
      total_items INTEGER DEFAULT 0,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS request_items (
      id           SERIAL PRIMARY KEY,
      request_id   INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
      product_id   TEXT NOT NULL,
      product_name TEXT NOT NULL,
      product_sku  TEXT NOT NULL,
      variant_color TEXT NOT NULL,
      variant_size  TEXT,
      quantity      INTEGER NOT NULL DEFAULT 1,
      unit_price    NUMERIC,
      notes         TEXT
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS product_prices (
      product_id TEXT PRIMARY KEY,
      price      NUMERIC,
      currency   TEXT DEFAULT 'EUR',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // Varsayılan admin kullanıcısı
  const existing = await sql`SELECT id FROM users WHERE role = 'admin' LIMIT 1`;
  if (existing.length === 0) {
    const adminPassword = process.env.ADMIN_INIT_PASSWORD || 'Admin2024!';
    const hash = bcrypt.hashSync(adminPassword, 10);
    await sql`
      INSERT INTO users (username, password_hash, company_name, email, role)
      VALUES ('admin', ${hash}, 'Yoi Studio Dekorasyon', ${process.env.ADMIN_EMAIL || 'admin@yoistudio.com'}, 'admin')
    `;
    console.log(`✓ Admin kullanıcısı oluşturuldu. Şifre: ${adminPassword}`);
  }

  console.log('✓ Veritabanı hazır (Neon PostgreSQL)');
}

module.exports = { getDb, initDb };
