// icons/owl-source.webp dosyasından telefon ikonlarını (PNG) üretir.
// Logoyu değiştirmek için owl-source.webp'yi değiştir ve şunu çalıştır: npm run icons
import sharp from 'sharp';

const SOURCE = 'icons/owl-source.webp';
const BLACK = { r: 10, g: 10, b: 10, alpha: 1 };

// Kaynak resimde logonun etrafı çok boş; ikonda daha büyük görünsün diye ortadan kırpıyoruz
const CROP = { left: 177, top: 170, width: 900, height: 900 };

const sizes = { 'apple-touch-icon.png': 180, 'icon-192.png': 192, 'icon-512.png': 512 };
for (const [name, size] of Object.entries(sizes)) {
  await sharp(SOURCE).extract(CROP).resize(size, size).flatten({ background: BLACK }).png().toFile(`icons/${name}`);
  console.log(`icons/${name} (${size}x${size})`);
}

// Uygulama içindeki logo: siyah arka planı saydam yapar, böylece logo
// koyu zemine karışır ve etrafında kare görünmez
const { data, info } = await sharp(SOURCE).extract(CROP).resize(512, 512).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const rgba = Buffer.alloc(info.width * info.height * 4);
for (let i = 0, o = 0; i < data.length; i += 3, o += 4) {
  const alpha = Math.max(data[i], data[i + 1], data[i + 2]); // ne kadar parlaksa o kadar opak
  for (let c = 0; c < 3; c++) rgba[o + c] = alpha ? Math.round((data[i + c] * 255) / alpha) : 0;
  rgba[o + 3] = alpha;
}
await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile('icons/logo.png');
console.log('icons/logo.png (512x512, saydam)');

// Android'in yuvarlak/şekilli kesimi logoyu kırpmasın diye kenarlara boşluk bırakılmış sürüm
const inner = 410, pad = (512 - inner) / 2;
await sharp(SOURCE)
  .resize(inner, inner)
  .extend({ top: pad, bottom: pad, left: pad, right: pad, background: BLACK })
  .flatten({ background: BLACK })
  .png()
  .toFile('icons/icon-maskable-512.png');
console.log('icons/icon-maskable-512.png (512x512)');
