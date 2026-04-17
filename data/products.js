const path = require('path');
const fs = require('fs');

const CDN = 'https://slide.a8d2.fra.idrivee2-32.com/product/';
const img = (uuid) => CDN + uuid;
const local = (id) => `/images/products/${id}.jpg`;

// ───────────────────────────────────────────────────────
// COLOR CATALOG — tüm Slide Design renklerinin meta verisi
// ───────────────────────────────────────────────────────
const COLOR_CATALOG = {
  // Standart pastel/canlı palette
  'milky-white':       { name: 'Milky White',       hex: '#F0EDE4' },
  'jet-black':         { name: 'Jet Black',         hex: '#1C1C1C' },
  'elephant-grey':     { name: 'Elephant Grey',     hex: '#6B6B6B' },
  'chocolate-brown':   { name: 'Chocolate Brown',   hex: '#5C3D2E' },
  'argil-grey':        { name: 'Argil Grey',        hex: '#9E9689' },
  'dove-grey':         { name: 'Dove Grey',         hex: '#C4BEB8' },
  'powder-blue':       { name: 'Powder Blue',       hex: '#A8C5D8' },
  'malva-green':       { name: 'Malva Green',       hex: '#8B9E7A' },
  'lime-green':        { name: 'Lime Green',        hex: '#A0C840' },
  'saffron-yellow':    { name: 'Saffron Yellow',    hex: '#F4C842' },
  'pumpkin-orange':    { name: 'Pumpkin Orange',    hex: '#E87020' },
  'flame-red':         { name: 'Flame Red',         hex: '#D4321F' },
  'sweet-fuchsia':     { name: 'Sweet Fuchsia',     hex: '#E91E8C' },

  // Gelée Soft serisi
  'soft-white':        { name: 'Soft White',        hex: '#F0EDE6' },
  'soft-argil':        { name: 'Soft Argil',        hex: '#C8C2B4' },
  'soft-yellow':       { name: 'Soft Yellow',       hex: '#F5E6A0' },

  // Yeni pastel tonlar
  'coconut-grey':      { name: 'Coconut Grey',      hex: '#A89F94' },
  'grapes-blue':       { name: 'Grapes Blue',       hex: '#5A6B8C' },
  'light-white':       { name: 'Light White',       hex: '#FAFAFA' },

  // Natural / Afrika koleksiyonu
  'namibian-desert':   { name: 'Namibian Desert',   hex: '#8B6F47' },
  'savannah-land':     { name: 'Savannah Land',     hex: '#C9A77C' },
  'sahara-sand':       { name: 'Sahara Sand',       hex: '#E8D5B7' },

  // Glam Glossy Finish
  'absolute-white-glossy-finish':  { name: 'Absolute White (Glossy)',  hex: '#FFFFFF' },
  'glamour-black-glossy-finish':   { name: 'Glamour Black (Glossy)',   hex: '#0A0A0A' },
  'vanity-grey-glossy-finish':     { name: 'Vanity Grey (Glossy)',     hex: '#B8B5B0' },
  'charming-ivory-glossy-finish':  { name: 'Charming Ivory (Glossy)',  hex: '#F5E6C4' },
  'supreme-red-glossy-finish':     { name: 'Supreme Red (Glossy)',     hex: '#C13030' },
  'metallic-gold-glossy-finish':   { name: 'Metallic Gold (Glossy)',   hex: '#D4AF37' },
  'metallic-silver-glossy-finish': { name: 'Metallic Silver (Glossy)', hex: '#C0C0C0' },
  'metallic-copper-glossy-finish': { name: 'Metallic Copper (Glossy)', hex: '#B87333' },

  // Glam Matt Finish
  'absolute-white-matt-finish':    { name: 'Absolute White (Matt)',    hex: '#FAFAFA' },
  'glamour-black-matt-finish':     { name: 'Glamour Black (Matt)',     hex: '#1A1A1A' },
  'vanity-grey-matt-finish':       { name: 'Vanity Grey (Matt)',       hex: '#A8A39D' },
  'charming-ivory-matt-finish':    { name: 'Charming Ivory (Matt)',    hex: '#EBD9B2' },
  'supreme-red-matt-finish':       { name: 'Supreme Red (Matt)',       hex: '#A82525' },
  'metallic-gold-matt-finish':     { name: 'Metallic Gold (Matt)',     hex: '#B8962D' },
  'metallic-silver-matt-finish':   { name: 'Metallic Silver (Matt)',   hex: '#A8A8A8' },
  'metallic-copper-matt-finish':   { name: 'Metallic Copper (Matt)',   hex: '#9C5F2A' },

  // Sade metallikler
  'gold':              { name: 'Gold',              hex: '#D4AF37' },
  'silver':            { name: 'Silver',            hex: '#C0C0C0' },
};

// Geriye uyumlu eski sabitler (hâlâ başka modüllerce kullanılırsa)
const STANDARD_COLORS = [
  'milky-white','jet-black','elephant-grey','chocolate-brown','argil-grey',
  'dove-grey','powder-blue','malva-green','lime-green','saffron-yellow',
  'pumpkin-orange','flame-red','sweet-fuchsia',
].map(id => ({ id, ...COLOR_CATALOG[id] }));

const GELEE_COLORS = [
  'soft-white','soft-argil','soft-yellow',
].map(id => ({ id, ...COLOR_CATALOG[id] }));

const MIRROR_SIZES = ['S', 'M', 'L', 'XL'];
const STD_SIZE = ['STD'];

const CATEGORIES = [
  { id: 'koltuk-sandalye',   name: 'Koltuk & Sandalye' },
  { id: 'sehpa-masa',        name: 'Sehpa & Masa' },
  { id: 'bank-oturma',       name: 'Bank & Oturma' },
  { id: 'dekorasyon',        name: 'Dekorasyon & Aksesuar' },
];

// ───────────────────────────────────────────────────────
// Dış veriler: product-colors.json + product-dimensions.json
// (scripts/fetch-sub-products.js tarafından üretilir)
// ───────────────────────────────────────────────────────
function loadJsonSafe(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return {}; }
}
const COLOR_DATA = loadJsonSafe(path.join(__dirname, 'product-colors.json'));
const DIMS_DATA  = loadJsonSafe(path.join(__dirname, 'product-dimensions.json'));

function colorsForProduct(productId, fallbackIds = []) {
  const imgs = (COLOR_DATA.images && COLOR_DATA.images[productId]) || {};
  const ids = Object.keys(imgs).length ? Object.keys(imgs) : fallbackIds;
  return ids
    .filter(cid => COLOR_CATALOG[cid])
    .map(cid => ({ id: cid, ...COLOR_CATALOG[cid] }));
}

function imagesForProduct(productId) {
  return (COLOR_DATA.images && COLOR_DATA.images[productId]) || {};
}

function dimsForProduct(productId) {
  return DIMS_DATA[productId] || null;
}

// ───────────────────────────────────────────────────────
// ÜRÜNLER
// ───────────────────────────────────────────────────────
const PRODUCT_DEFS = [
  {
    id: 'ambrogio-01',
    sku: 'SD-AMBROGIO-01',
    name: 'Ambrogio',
    category: 'sehpa-masa',
    designer: 'Favaretto & Partners',
    description: 'Komik tasarım estetiğiyle buluşan servis masası. %100 geri dönüştürülmüş Tetra Pak malzemesinden üretilen EcoAllene ile çevre dostu bir seçim.',
    gallery: [
      img('a30a056e-2b75-4628-a157-2b718fa0fe9c'),
      img('55877def-ab0e-4681-9910-f1cab70f2b7c'),
      img('4f02d359-5a97-4266-aba3-5b10656d9db1'),
      img('c526143a-45e4-4b60-bd68-9dab718f3f72'),
      img('842d574f-6b15-46ad-b1e0-bf874aae22ca'),
      img('9ef79e75-8a89-4057-b262-c70fe5756358'),
    ],
    productUrl: 'https://www.slidedesign.it/product/ambrogio-01',
    sizes: STD_SIZE,
  },
  {
    id: 'amanda-01',
    sku: 'SD-AMANDA-01',
    name: 'Amanda',
    category: 'sehpa-masa',
    designer: 'Favaretto & Partners',
    description: 'Komik formu ve yeşil ruhuyla servis masası. %30 EcoAllene içeren plastikten üretilmiştir.',
    gallery: [
      img('79120ce2-ba94-4d79-aa63-d0ab596fc915'),
      img('55877def-ab0e-4681-9910-f1cab70f2b7c'),
      img('4f02d359-5a97-4266-aba3-5b10656d9db1'),
      img('daf90635-6486-417e-9ee5-b4fddfdd57c6'),
      img('852bb113-db36-4cd6-8693-0887d6945ffe'),
      img('ffd46d1b-7ad4-4b63-86dd-24439121bbe4'),
    ],
    productUrl: 'https://www.slidedesign.it/product/amanda-01',
    sizes: STD_SIZE,
  },
  {
    id: 'amore',
    sku: 'SD-AMORE',
    name: 'Amore',
    category: 'bank-oturma',
    designer: 'Giò Colonna Romano',
    description: 'Polietilenden üretilen stilize kaligrafi bank. İç ve dış mekan kullanımına uygundur.',
    gallery: [
      img('795c0f25-b2e9-4595-87b6-56bd96591567'),
      img('7c547ae4-6bd8-49f9-bc67-9fbad4edada5'),
      img('51354ac2-651b-4c33-a221-02fe086f81f4'),
      img('5cf5491a-8c16-4d52-bda5-389ddc407284'),
      img('36ab700b-ba8c-4390-837a-453450570140'),
      img('9a7d38c6-e0de-42ea-9a0a-f213d2e35bd0'),
    ],
    productUrl: 'https://www.slidedesign.it/product/amore',
    sizes: STD_SIZE,
  },
  {
    id: 'wow',
    sku: 'SD-WOW',
    name: 'Wow',
    category: 'bank-oturma',
    designer: 'Giò Colonna Romano',
    description: 'Palindromik kaligrafi tasarımlı pop bank. "WOW" harfleri ters çevrilince "MOM" okunur.',
    gallery: [
      img('4536fb41-6f92-4080-a19c-e88345b6eb48'),
      img('cecd3477-be3c-4de8-93f3-f3f5063962aa'),
      img('2c943d8c-719d-4843-b61f-1a9b35c70d3d'),
      img('320d0448-50a5-4827-ab73-824342006a85'),
      img('11b1ab27-0e40-4813-9495-3b6b53c06d14'),
      img('ea5c7f9e-4f02-4e41-9dce-427b44fdf626'),
    ],
    productUrl: 'https://www.slidedesign.it/product/wow',
    sizes: STD_SIZE,
  },
  {
    id: 'threebu',
    sku: 'SD-THREEBU',
    name: 'Threebù',
    category: 'sehpa-masa',
    designer: 'Marcantonio',
    description: 'Afrika sanatından ilham alan çok fonksiyonlu tabure / sehpa. Vazo veya lamba tabanı olarak da kullanılabilir.',
    gallery: [
      img('b39a11e9-5cf4-42b6-8644-25647992ae51'),
      img('d8083d28-d76b-40a6-8c8c-ed4395352985'),
      img('9485442d-8438-4645-b3f3-667de5e58a42'),
      img('22741a9d-1c3c-4963-85eb-1d29a283422d'),
      img('a2a235ff-1fff-4fb7-9d9d-530180e6be2a'),
      img('f04a60dc-a851-411e-935a-ccc04cc08be2'),
    ],
    productUrl: 'https://www.slidedesign.it/product/threebu',
    sizes: STD_SIZE,
  },
  {
    id: 'threebu-pot',
    sku: 'SD-THREEBU-POT',
    name: 'Threebù Pot',
    category: 'dekorasyon',
    designer: 'Marcantonio',
    description: 'Afrika sanatından ilham alan dekoratif vazo. Tabure veya sehpa olarak da kullanılabilir.',
    gallery: [
      img('06b3358b-10d2-431d-9ae3-47d599e3750d'),
      img('94d2d989-d624-4fe7-9c05-c449f1895e89'),
      img('1df1bb46-19e7-4e17-bb34-944ac4c0ecdb'),
      img('5565ecc7-2677-46d8-b231-dabbeac1132e'),
      img('acf7d6a7-6a65-46ef-bdaf-a667f8f3a07f'),
      img('bef7a326-bbc7-4afe-b5c0-b30ce6fb6787'),
    ],
    productUrl: 'https://www.slidedesign.it/product/threebu-pot',
    sizes: STD_SIZE,
  },
  {
    id: 'kroko-01',
    sku: 'SD-KROKO-01',
    name: 'Kroko',
    category: 'koltuk-sandalye',
    designer: 'Marcantonio',
    description: 'Şeker kamışından üretilen biyoplastik lounge koltuk. GREEN GOOD DESIGN 2022 ödüllü.',
    gallery: [
      img('40490ca9-da60-4f81-a197-77a39dc86f0a'),
      img('e28f5cff-13fa-407d-8b2f-d11418db304b'),
      img('53cae51d-6ef0-41d8-b946-0aa9835e5872'),
      img('71b2fcf6-f432-42fb-aa05-c4852059f7c0'),
      img('c50c65f2-db3c-4f52-a2de-5860fbc96425'),
      img('dab0e592-d2f7-4af6-a6ec-44dd9352cbb0'),
    ],
    productUrl: 'https://www.slidedesign.it/product/kroko-01',
    sizes: STD_SIZE,
  },
  {
    id: 'big-kroko',
    sku: 'SD-BIG-KROKO',
    name: 'Big Kroko',
    category: 'koltuk-sandalye',
    designer: 'Marcantonio',
    description: 'Kroko\'nun iki kişilik versiyonu. Biyoplastik dış mekan kanepe.',
    gallery: [
      img('1358778e-9f80-4165-8774-04d74a3e259e'),
      img('e28f5cff-13fa-407d-8b2f-d11418db304b'),
      img('59919d69-6ced-45d0-9954-50f6e497de78'),
      img('8398c360-9173-4b3b-bee9-ae58c90432f0'),
      img('c929ac54-9565-4127-9e5c-f269deccef74'),
      img('edef970c-02e0-46e9-a894-8fe881d76c33'),
    ],
    productUrl: 'https://www.slidedesign.it/product/big-kroko',
    sizes: STD_SIZE,
  },
  {
    id: 'pot-of-love',
    sku: 'SD-POT-OF-LOVE',
    name: 'Pot of Love',
    category: 'dekorasyon',
    designer: 'Moro & Pigatti',
    description: 'Design of Love koleksiyonundan dekoratif saksı. İç ve dış mekan kullanımına uygun polietilen.',
    gallery: [
      img('e3d6fe90-ce7e-4f8a-9c90-5682ca0c30bb'),
      img('b0e18c5c-a3c0-45a2-8e62-314629d53f98'),
      img('9e90bf40-af74-409f-81c3-f1d92acd1d69'),
      img('1fe9c1eb-70dd-4a5a-9f40-9d394ad5f3f3'),
      img('a4046d16-2c74-4354-af62-03842c4d5edc'),
      img('dc07d883-c412-4f68-ae41-f83129003574'),
    ],
    productUrl: 'https://www.slidedesign.it/product/pot-of-love',
    sizes: STD_SIZE,
  },
  {
    id: 'gelee',
    sku: 'SD-GELEE',
    name: 'Gelée',
    category: 'bank-oturma',
    designer: 'Roberto Paoli',
    description: 'Yumuşak poliüretan puf. Şekeri andıran formuyla iç ve dış mekanlarda kullanılabilir.',
    gallery: [
      img('4d273f8a-98f2-46aa-9bf7-4f48b4347ed0'),
      img('d80f83a2-3b0a-4a6a-b2a2-5bb6e9924e53'),
      img('776d9cea-a0d6-4e48-9099-093eaee8f617'),
      img('c688354a-78a0-4295-af8c-642d5e5f1784'),
      img('d28dc0b6-ef2a-4ce6-9ba5-a59058c016d5'),
      img('380d7ff6-b42d-41e4-8aa9-000549b0fcec'),
    ],
    productUrl: 'https://www.slidedesign.it/product/gelee',
    sizes: STD_SIZE,
  },
  {
    id: 'mirror-of-love',
    sku: 'SD-MIRROR-OF-LOVE',
    name: 'Mirror of Love',
    category: 'dekorasyon',
    designer: 'Moro & Pigatti',
    description: 'İtalyan barok sanatından ilham alan çerçevesiyle çağdaş ayna. Design of Love koleksiyonu.',
    gallery: [
      img('382d7e5b-ebb9-45e8-91ab-9ed149d004fc'),
      img('f17f9e07-1dff-481a-ad02-8a836aa5399b'),
      img('62d0a69b-2c9c-4aa3-b23c-73639ef170bb'),
      img('5462f088-18db-4f1a-9fd1-c7580e6ef8c2'),
      img('48142a64-b1da-471e-8646-d26879ddb007'),
      img('654aabb2-1443-47c8-9334-2b9c0654593b'),
    ],
    productUrl: 'https://www.slidedesign.it/product/mirror-of-love',
    sizes: MIRROR_SIZES,
  },
];

// Her ürünü colors, colorImages, dimensions ile zenginleştir
const PRODUCTS = PRODUCT_DEFS.map(p => {
  const colorImages = imagesForProduct(p.id);
  const colors = colorsForProduct(p.id);
  const dimensions = dimsForProduct(p.id);
  return {
    ...p,
    image: local(p.id),
    colors,
    colorImages,
    dimensions,
  };
});

module.exports = {
  PRODUCTS,
  CATEGORIES,
  COLOR_CATALOG,
  STANDARD_COLORS,
  GELEE_COLORS,
  MIRROR_SIZES,
};
