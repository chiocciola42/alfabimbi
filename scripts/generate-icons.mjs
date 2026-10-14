// Generates the PWA icon set (PNG) from an inline SVG. Run with: npm run icons
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

/** `inset` shrinks the artwork so maskable icons keep it inside the safe zone. */
function svg({ rounded, inset }) {
  const s = 512;
  const scale = 1 - inset * 2;
  const offset = (s * inset);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <linearGradient id="bg" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="#FBBF24"/>
      <stop offset="1" stop-color="#FB7185"/>
    </linearGradient>
  </defs>
  <rect width="${s}" height="${s}" rx="${rounded ? 112 : 0}" fill="url(#bg)"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})">
    <g fill="none" stroke="#fff" stroke-width="58" stroke-linecap="round" stroke-linejoin="round">
      <path d="M150 400 L256 112 L362 400"/>
      <path d="M190 308 H322"/>
    </g>
    <circle cx="390" cy="118" r="26" fill="#FEF3C7"/>
  </g>
</svg>`;
}

const targets = [
  { file: 'icons/pwa-192.png', size: 192, rounded: true, inset: 0.04 },
  { file: 'icons/pwa-512.png', size: 512, rounded: true, inset: 0.04 },
  { file: 'icons/maskable-512.png', size: 512, rounded: false, inset: 0.14 },
  { file: 'icons/apple-touch-icon.png', size: 180, rounded: false, inset: 0.08 },
];

for (const t of targets) {
  await sharp(Buffer.from(svg(t))).resize(t.size, t.size).png().toFile(join(root, t.file));
}
writeFileSync(join(root, 'favicon.svg'), svg({ rounded: true, inset: 0.04 }));
console.log('Icons generated in public/');
