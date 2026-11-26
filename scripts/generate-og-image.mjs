// Genera l'immagine per le anteprime social (1200x630) in public/og-image.png. Si lancia con: npm run og-image
// Usa Chromium con gli stessi font dell'app (Fredoka), così il risultato è identico al sito.
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const font = (weight) =>
  readFileSync(join(root, `node_modules/@fontsource/fredoka/files/fredoka-latin-${weight}-normal.woff2`)).toString('base64');

// Come in playwright.config.ts: in ambienti senza il download di Playwright si può usare un Chromium di sistema.
const systemChromium = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';
const executablePath = existsSync(systemChromium) && !process.env.PW_USE_BUNDLED ? systemChromium : undefined;

const tiles = [
  { t: 'A', c: '#D97706', r: -6 },
  { t: 'B', c: '#DB2777', r: 4 },
  { t: 'C', c: '#0891B2', r: -3 },
  { t: '1', c: '#059669', r: 5 },
  { t: '2', c: '#7C3AED', r: -4 },
  { t: '3', c: '#D97706', r: 3 },
];

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Fredoka;font-weight:600;src:url(data:font/woff2;base64,${font(600)}) format('woff2')}
@font-face{font-family:Fredoka;font-weight:700;src:url(data:font/woff2;base64,${font(700)}) format('woff2')}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;overflow:hidden;font-family:Fredoka,sans-serif;color:#451A03;
  background:linear-gradient(135deg,#FBBF24 0%,#FDA4AF 62%,#67E8F9 130%);position:relative}
.logo{position:absolute;left:84px;top:84px;width:156px;height:156px;border-radius:40px;
  background:linear-gradient(45deg,#FBBF24,#FB7185);box-shadow:0 14px 0 rgba(120,53,15,.18);display:flex;align-items:center;justify-content:center}
.logo svg{width:116px;height:116px}
h1{position:absolute;left:84px;top:262px;font-size:152px;font-weight:700;letter-spacing:-3px;line-height:1}
p{position:absolute;left:90px;top:440px;font-size:56px;font-weight:600;line-height:1.2;max-width:640px;text-wrap:balance}
.tiles{position:absolute;right:70px;top:96px;display:grid;grid-template-columns:repeat(2,150px);gap:26px}
.tile{width:150px;height:150px;border-radius:36px;background:#fff;display:flex;align-items:center;justify-content:center;
  font-size:104px;font-weight:700;box-shadow:0 12px 0 rgba(120,53,15,.2)}
</style></head><body>
<div class="logo"><svg viewBox="0 0 512 512"><g fill="none" stroke="#fff" stroke-width="58" stroke-linecap="round" stroke-linejoin="round"><path d="M150 400 L256 112 L362 400"/><path d="M190 308 H322"/></g><circle cx="390" cy="118" r="26" fill="#FEF3C7"/></svg></div>
<h1>Alfabimbi</h1>
<p>Italiano e Matematica per bambini</p>
<div class="tiles">${tiles.map((x) => `<div class="tile" style="color:${x.c};transform:rotate(${x.r}deg)">${x.t}</div>`).join('')}</div>
</body></html>`;

const browser = await chromium.launch({ executablePath });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  const shot = await page.screenshot({ type: 'png' });
  await sharp(shot).png({ palette: true, quality: 92, effort: 10 }).toFile(join(root, 'public', 'og-image.png'));
} finally {
  await browser.close();
}
console.log('Immagine social generata in public/og-image.png');
