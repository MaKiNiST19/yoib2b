require('dotenv').config();
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PRODUCTS = [
  { id: 'ambrogio-01', url: 'https://www.slidedesign.it/product/ambrogio-01' },
  { id: 'amanda-01',   url: 'https://www.slidedesign.it/product/amanda-01' },
  { id: 'amore',       url: 'https://www.slidedesign.it/product/amore' },
  { id: 'wow',         url: 'https://www.slidedesign.it/product/wow' },
  { id: 'threebu',     url: 'https://www.slidedesign.it/product/threebu' },
  { id: 'threebu-pot', url: 'https://www.slidedesign.it/product/threebu-pot' },
  { id: 'kroko-01',    url: 'https://www.slidedesign.it/product/kroko-01' },
  { id: 'big-kroko',   url: 'https://www.slidedesign.it/product/big-kroko' },
  { id: 'pot-of-love', url: 'https://www.slidedesign.it/product/pot-of-love' },
  { id: 'gelee',       url: 'https://www.slidedesign.it/product/gelee' },
  { id: 'mirror-of-love', url: 'https://www.slidedesign.it/product/mirror-of-love' },
];

const OUT_DIR = path.join(__dirname, '..', 'public', 'images', 'products');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchHtml(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function extractOgImage(html) {
  const match = html.match(/property="og:image"\s+content="([^"]+)"/);
  if (!match) {
    const m2 = html.match(/content="([^"]+)"\s+property="og:image"/);
    return m2 ? m2[1] : null;
  }
  return match[1];
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlinkSync(dest);
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function run() {
  for (const p of PRODUCTS) {
    const dest = path.join(OUT_DIR, p.id + '.jpg');
    if (fs.existsSync(dest)) {
      console.log(`⏭  ${p.id} zaten var, atlanıyor`);
      continue;
    }
    try {
      process.stdout.write(`📥 ${p.id} sayfası alınıyor...`);
      const html = await fetchHtml(p.url);
      const imgUrl = extractOgImage(html);
      if (!imgUrl) { console.log(' ❌ og:image bulunamadı'); continue; }
      process.stdout.write(` indiriliyor...`);
      await downloadFile(imgUrl, dest);
      console.log(` ✓ kaydedildi`);
    } catch (e) {
      console.log(` ❌ Hata: ${e.message}`);
    }
    // Rate limit
    await new Promise(r => setTimeout(r, 800));
  }
  console.log('\n✅ Tamamlandı! public/images/products/ klasörüne bakın.');
}

run();
