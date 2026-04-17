// Tüm ürünlerin renk varyantlarını + ebat (dimensions) bilgilerini çeker
// Çıktılar:
//   public/images/products/variants/<slug>/<color-id>.jpg
//   data/product-dimensions.json
//   data/product-colors.json (bilinmeyen renkler için hex + isim)
//
// Çalıştırma: node scripts/fetch-sub-products.js [--force]

const https = require('https');
const fs = require('fs');
const path = require('path');

const FORCE = process.argv.includes('--force');

const PRODUCTS = [
  'ambrogio-01',
  'amanda-01',
  'amore',
  'wow',
  'threebu',
  'threebu-pot',
  'kroko-01',
  'big-kroko',
  'pot-of-love',
  'gelee',
  'mirror-of-love',
];

// Bilinen İngilizce renk adları → internal color id
const NAME_TO_ID = {
  'Milky White':     'milky-white',
  'Jet Black':       'jet-black',
  'Elephant Grey':   'elephant-grey',
  'Chocolate Brown': 'chocolate-brown',
  'Argil Grey':      'argil-grey',
  'Dove Grey':       'dove-grey',
  'Powder Blue':     'powder-blue',
  'Malva Green':     'malva-green',
  'Lime Green':      'lime-green',
  'Saffron Yellow':  'saffron-yellow',
  'Pumpkin Orange':  'pumpkin-orange',
  'Flame Red':       'flame-red',
  'Sweet Fuchsia':   'sweet-fuchsia',
  'Soft White':      'soft-white',
  'Soft Argil':      'soft-argil',
  'Soft Yellow':     'soft-yellow',
};

function slugifyColor(name) {
  return String(name)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function fetchJson(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('Çok fazla yönlendirme'));
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJson(res.headers.location, redirects + 1).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

function downloadFile(url, dest, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('Çok fazla yönlendirme'));
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close(); try { fs.unlinkSync(dest); } catch(_) {}
        return downloadFile(res.headers.location, dest, redirects + 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close(); try { fs.unlinkSync(dest); } catch(_) {}
        return reject(new Error('HTTP ' + res.statusCode));
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => { try { fs.unlinkSync(dest); } catch(_) {} reject(err); });
  });
}

function dims(sp) {
  // total_* mm ve kg cinsinden gelir
  const w = sp.total_width  != null ? Number(sp.total_width)  : null;
  const d = sp.total_depth  != null ? Number(sp.total_depth)  : null;
  const h = sp.total_height != null ? Number(sp.total_height) : null;
  const kg= sp.total_weight != null ? Number(sp.total_weight) : null;
  if ([w, d, h, kg].every(v => v == null)) return null;
  return { width: w, depth: d, height: h, weight: kg };
}

function sizeFromSubProduct(sp) {
  // Mirror of Love S/M/L/XL gibi size bilgisi parts veya sku içinde olabilir
  for (const part of (sp.parts || [])) {
    const s = part.size?.name?.en || part.size?.name || null;
    if (s) return String(s).trim().toUpperCase();
  }
  if (sp.total_sku) {
    const m = String(sp.total_sku).match(/-(XL|XS|S|M|L)(?:$|-)/i);
    if (m) return m[1].toUpperCase();
  }
  return null;
}

(async () => {
  const allColorImages = {};                 // slug → { colorId: localPath }
  const allDimensions  = {};                 // slug → dims | { S:{...}, M:{...} }
  const unknownColors  = {};                 // slug → { colorId: { name, hex } }

  for (const slug of PRODUCTS) {
    console.log(`\n📦 ${slug}`);
    const outDir = path.join(__dirname, '..', 'public', 'images', 'products', 'variants', slug);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    let subList;
    try {
      const json = await fetchJson(`https://server.slidedesign.it/public/product/${slug}/sub-product`);
      subList = json.data?.sub_products || json.sub_products || [];
    } catch (e) {
      console.log(`  ❌ API hatası: ${e.message}`);
      continue;
    }

    if (!subList.length) { console.log('  ⚠️  sub_products boş'); continue; }

    const colorSeen = new Set();
    const colorMap  = {};     // colorId → imageUrl
    const colorMeta = {};     // colorId → { name, hex }
    const dimsByColor = {};   // colorId → dims
    const dimsBySize  = {};   // 'S'|'M'|...  → dims

    for (const sp of subList) {
      const part = (sp.parts || [])[0];
      if (!part) continue;
      const colorName = part.color?.name?.en;
      if (!colorName) continue;
      const colorId = NAME_TO_ID[colorName] || slugifyColor(colorName);
      const hex = part.color?.hex || part.color?.color || null;

      if (!NAME_TO_ID[colorName]) {
        unknownColors[slug] = unknownColors[slug] || {};
        unknownColors[slug][colorId] = { name: colorName, hex };
      }

      if (!colorSeen.has(colorId) && sp.images && sp.images[0]) {
        colorSeen.add(colorId);
        colorMap[colorId] = sp.images[0];
        colorMeta[colorId] = { name: colorName, hex };
      }

      const d = dims(sp);
      if (d) {
        if (!dimsByColor[colorId]) dimsByColor[colorId] = d;
        const sz = sizeFromSubProduct(sp);
        if (sz) dimsBySize[sz] = d;
      }
    }

    // Görselleri indir
    const productColorImages = {};
    for (const [colorId, imageUrl] of Object.entries(colorMap)) {
      const dest = path.join(outDir, colorId + '.jpg');
      const localPath = `/images/products/variants/${slug}/${colorId}.jpg`;
      productColorImages[colorId] = localPath;

      if (!FORCE && fs.existsSync(dest)) {
        process.stdout.write(`  ⏭  ${colorId} (mevcut)\n`);
        continue;
      }
      process.stdout.write(`  📥 ${colorId} (${colorMeta[colorId].name})...`);
      try {
        await downloadFile(imageUrl, dest);
        console.log(' ✓');
      } catch (e) {
        console.log(` ❌ ${e.message}`);
        delete productColorImages[colorId];
      }
      await new Promise(r => setTimeout(r, 150));
    }

    allColorImages[slug] = productColorImages;

    // Dimensions: Mirror of Love → per-size, diğerleri → ilk değer
    if (Object.keys(dimsBySize).length > 1) {
      allDimensions[slug] = { bySize: dimsBySize };
    } else {
      const first = Object.values(dimsByColor)[0] || Object.values(dimsBySize)[0] || null;
      if (first) allDimensions[slug] = first;
    }

    console.log(`  ✅ ${Object.keys(productColorImages).length} renk, dims: ${JSON.stringify(allDimensions[slug] || null)}`);
  }

  // Yaz: dimensions + bilinmeyen renkler
  const dataDir = path.join(__dirname, '..', 'data');
  fs.writeFileSync(path.join(dataDir, 'product-dimensions.json'),
    JSON.stringify(allDimensions, null, 2));
  fs.writeFileSync(path.join(dataDir, 'product-colors.json'),
    JSON.stringify({ images: allColorImages, unknown: unknownColors }, null, 2));

  console.log('\n══════════ Özet ══════════');
  console.log('data/product-dimensions.json yazıldı');
  console.log('data/product-colors.json yazıldı');

  if (Object.keys(unknownColors).length) {
    console.log('\n⚠️  STANDARD_COLORS / GELEE_COLORS içinde olmayan renkler:');
    for (const [slug, cols] of Object.entries(unknownColors)) {
      console.log(`  ${slug}:`);
      for (const [cid, meta] of Object.entries(cols)) {
        console.log(`    { id: '${cid}', name: '${meta.name}', hex: '${meta.hex || '?'}' }`);
      }
    }
  }

  console.log('\n✅ Tamamlandı.');
})();
