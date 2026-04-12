// Lokal geliştirme için — Vercel bu dosyayı kullanmaz
require('dotenv').config();
const app = require('./app');
const { initDb } = require('./database');

const PORT = process.env.PORT || 3005;

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 Yoi Studio Talep Sistemi çalışıyor`);
    console.log(`   http://localhost:${PORT}\n`);
  });
}).catch(err => {
  console.error('DB başlatılamadı:', err);
  process.exit(1);
});
