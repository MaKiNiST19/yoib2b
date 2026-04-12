const https = require('https');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'public', 'images', 'products', 'variants', 'amanda-01');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const VARIANTS = [
  {
    id: 'milky-white',
    url: 'https://slide.a8d2.fra.idrivee2-32.com/product/a18ce264-eca7-463d-9de4-47135b400c72?AWSAccessKeyId=41Bxev8yenmXVj6H9k73&Expires=1776266996&Signature=myAOWVX3Lw6uNaLVDKD5v81CMdA%3D',
  },
  {
    id: 'jet-black',
    url: 'https://slide.a8d2.fra.idrivee2-32.com/product/4d5720c5-a62e-4857-9962-67de362404c9?AWSAccessKeyId=41Bxev8yenmXVj6H9k73&Expires=1776266996&Signature=zc7RRvjBR%2Fkyf0XWZ36wWDUV1Nc%3D',
  },
  {
    id: 'elephant-grey',
    url: 'https://slide.a8d2.fra.idrivee2-32.com/product/29da5e6e-6789-40b5-aeb6-1e7b78e6ac43?AWSAccessKeyId=41Bxev8yenmXVj6H9k73&Expires=1776266996&Signature=jKkbP2LTTxwsE3SIbWf7rYZpxbI%3D',
  },
  {
    id: 'argil-grey',
    url: 'https://slide.a8d2.fra.idrivee2-32.com/product/41218a9e-7fcc-456b-a874-04bbd1e70979?AWSAccessKeyId=41Bxev8yenmXVj6H9k73&Expires=1776266996&Signature=0f3vGGhgQ48jC8JEXPcmaJAFGlM%3D',
  },
  {
    id: 'powder-blue',
    url: 'https://slide.a8d2.fra.idrivee2-32.com/product/79fa57cf-4c27-47fc-bc3c-447b728020f0?AWSAccessKeyId=41Bxev8yenmXVj6H9k73&Expires=1776266996&Signature=m9xRdGxrkxZsO3g2ha%2BswI%2B0aUk%3D',
  },
  {
    id: 'lime-green',
    url: 'https://slide.a8d2.fra.idrivee2-32.com/product/8cfe0957-422b-4e36-8a95-1254be737665?AWSAccessKeyId=41Bxev8yenmXVj6H9k73&Expires=1776266996&Signature=qHjV%2F6jjTU1QzwV1lwD%2Fjgc%2FRao%3D',
  },
  {
    id: 'pumpkin-orange',
    url: 'https://slide.a8d2.fra.idrivee2-32.com/product/ed7f59b6-0f38-46f8-b635-67172e7d3d60?AWSAccessKeyId=41Bxev8yenmXVj6H9k73&Expires=1776266996&Signature=AEnxKWBTXKNmuqtTFDinPhDcj94%3D',
  },
  {
    id: 'flame-red',
    url: 'https://slide.a8d2.fra.idrivee2-32.com/product/a3725d54-1f63-4425-a53c-09574170b87f?AWSAccessKeyId=41Bxev8yenmXVj6H9k73&Expires=1776266996&Signature=NjdbYAuHRjATyEo%2BO2mWp%2BwNxUY%3D',
  },
];

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlinkSync(dest);
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => { fs.unlink(dest, () => {}); reject(err); });
  });
}

(async () => {
  for (const v of VARIANTS) {
    const dest = path.join(OUT_DIR, v.id + '.jpg');
    process.stdout.write(`📥 ${v.id}...`);
    try {
      await downloadFile(v.url, dest);
      console.log(' ✓');
    } catch (e) {
      console.log(` ❌ ${e.message}`);
    }
  }
  console.log('\n✅ Bitti. Eksik renklerin görsellerini public/images/products/variants/amanda-01/ klasörüne ekleyin:');
  console.log('   chocolate-brown.jpg');
  console.log('   dove-grey.jpg');
  console.log('   malva-green.jpg');
  console.log('   saffron-yellow.jpg');
  console.log('   sweet-fuchsia.jpg');
})();
