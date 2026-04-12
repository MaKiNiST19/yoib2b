const https = require('https');
const fs = require('fs');
const path = require('path');

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

// Maps slidedesign.it English color names → our color IDs
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
  // Gelee
  'Soft White':      'soft-white',
  'Soft Argil':      'soft-argil',
  'Soft Yellow':     'soft-yellow',
};

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJson(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlinkSync(dest);
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error('HTTP ' + res.statusCode));
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => { try { fs.unlinkSync(dest); } catch(_) {} reject(err); });
  });
}

function extractColorMap(subProducts) {
  const seen = new Set();
  const colorMap = {};
  for (const sp of subProducts) {
    if (!sp.images || sp.images.length === 0) continue;
    for (const part of sp.parts) {
      const colorName = part.color?.name?.en;
      if (!colorName) continue;
      const colorId = NAME_TO_ID[colorName];
      if (!colorId || seen.has(colorId)) continue;
      seen.add(colorId);
      colorMap[colorId] = sp.images[0];
    }
  }
  return colorMap;
}

(async () => {
  const allColorImages = {}; // productId → { colorId: localPath }

  for (const productSlug of PRODUCTS) {
    console.log(`\n📦 ${productSlug}`);
    const outDir = path.join(__dirname, '..', 'public', 'images', 'products', 'variants', productSlug);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    let subData;
    try {
      const json = await fetchJson(`https://server.slidedesign.it/public/product/${productSlug}/sub-product`);
      subData = json.data?.sub_products;
    } catch (e) {
      console.log(`  ❌ API hatası: ${e.message}`);
      continue;
    }

    if (!subData || subData.length === 0) {
      console.log('  ⚠️  Sub-product verisi yok');
      continue;
    }

    const colorMap = extractColorMap(subData);
    const productColorImages = {};

    for (const [colorId, imageUrl] of Object.entries(colorMap)) {
      const dest = path.join(outDir, colorId + '.jpg');
      const localPath = `/images/products/variants/${productSlug}/${colorId}.jpg`;
      productColorImages[colorId] = localPath;

      if (fs.existsSync(dest)) {
        process.stdout.write(`  ⏭  ${colorId} (mevcut)\n`);
        continue;
      }

      process.stdout.write(`  📥 ${colorId}...`);
      try {
        await downloadFile(imageUrl, dest);
        console.log(' ✓');
      } catch (e) {
        console.log(` ❌ ${e.message}`);
        delete productColorImages[colorId];
      }

      await new Promise(r => setTimeout(r, 200));
    }

    allColorImages[productSlug] = productColorImages;

    const downloaded = Object.keys(productColorImages).length;
    const total = Object.keys(colorMap).length;
    console.log(`  ✅ ${downloaded}/${total} renk görseli`);
  }

  // Print colorImages summary for data/products.js
  console.log('\n\n════ data/products.js için colorImages özeti ════\n');
  for (const [productId, colors] of Object.entries(allColorImages)) {
    if (Object.keys(colors).length === 0) continue;
    console.log(`// ${productId}`);
    console.log('colorImages: {');
    for (const [colorId, localPath] of Object.entries(colors)) {
      console.log(`  '${colorId}': '${localPath}',`);
    }
    console.log('},\n');
  }

  console.log('\n✅ Tamamlandı!');
})();
