const nodemailer = require('nodemailer');

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendRequestNotification(request, dealer, items) {
  if (!process.env.SMTP_USER || !process.env.ADMIN_EMAIL) {
    console.log('SMTP yapılandırılmamış, e-posta gönderilmedi.');
    return;
  }

  const transporter = createTransport();

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding:8px;border:1px solid #e0e0e0;">${item.product_sku}</td>
      <td style="padding:8px;border:1px solid #e0e0e0;">${item.product_name}</td>
      <td style="padding:8px;border:1px solid #e0e0e0;">${item.variant_color}${item.variant_size ? ' / ' + item.variant_size : ''}</td>
      <td style="padding:8px;border:1px solid #e0e0e0;text-align:center;">${item.quantity}</td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;">
      <div style="background:#1A1A2E;padding:24px;text-align:center;">
        <h1 style="color:#C9A84C;margin:0;font-size:20px;">Yoi Studio Dekorasyon</h1>
        <p style="color:#fff;margin:4px 0 0;font-size:13px;">Slide Design — Türkiye Distribütörü</p>
      </div>
      <div style="background:#fff;padding:32px;">
        <h2 style="color:#1A1A2E;margin:0 0 16px;">Yeni Talep Bildirimi</h2>
        <p style="color:#555;margin:0 0 24px;">
          <strong>${dealer.company_name}</strong> firmasından <strong>#${request.id}</strong> numaralı yeni bir talep oluşturuldu.
        </p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <tr style="background:#f5f5f5;">
            <td style="padding:8px;font-weight:bold;border:1px solid #e0e0e0;">Firma</td>
            <td style="padding:8px;border:1px solid #e0e0e0;">${dealer.company_name}</td>
          </tr>
          <tr>
            <td style="padding:8px;font-weight:bold;border:1px solid #e0e0e0;">E-posta</td>
            <td style="padding:8px;border:1px solid #e0e0e0;">${dealer.email}</td>
          </tr>
          ${dealer.phone ? `<tr style="background:#f5f5f5;"><td style="padding:8px;font-weight:bold;border:1px solid #e0e0e0;">Telefon</td><td style="padding:8px;border:1px solid #e0e0e0;">${dealer.phone}</td></tr>` : ''}
          ${dealer.city ? `<tr><td style="padding:8px;font-weight:bold;border:1px solid #e0e0e0;">Şehir</td><td style="padding:8px;border:1px solid #e0e0e0;">${dealer.city}</td></tr>` : ''}
          ${request.notes ? `<tr style="background:#f5f5f5;"><td style="padding:8px;font-weight:bold;border:1px solid #e0e0e0;">Not</td><td style="padding:8px;border:1px solid #e0e0e0;">${request.notes}</td></tr>` : ''}
        </table>
        <h3 style="color:#1A1A2E;margin:0 0 12px;">Talep Edilen Ürünler</h3>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#1A1A2E;color:#fff;">
              <th style="padding:10px;border:1px solid #333;text-align:left;">Stok Kodu</th>
              <th style="padding:10px;border:1px solid #333;text-align:left;">Ürün</th>
              <th style="padding:10px;border:1px solid #333;text-align:left;">Varyant</th>
              <th style="padding:10px;border:1px solid #333;text-align:center;">Adet</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div style="margin-top:32px;padding:16px;background:#FFF8E7;border-left:4px solid #C9A84C;border-radius:4px;">
          <p style="margin:0;color:#555;font-size:13px;">
            Talep #${request.id} — ${new Date().toLocaleString('tr-TR')} tarihinde oluşturuldu.
          </p>
        </div>
      </div>
      <div style="background:#f5f5f5;padding:16px;text-align:center;">
        <p style="margin:0;color:#999;font-size:12px;">Yoi Studio Dekorasyon — Slide Design Türkiye Distribütörü</p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"Yoi Studio Talep Sistemi" <${process.env.SMTP_USER}>`,
    to: process.env.ADMIN_EMAIL,
    subject: `🔔 Yeni Talep #${request.id} — ${dealer.company_name}`,
    html,
  });

  console.log(`✓ Bildirim e-postası gönderildi: Talep #${request.id}`);
}

module.exports = { sendRequestNotification };
