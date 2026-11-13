// Génère les PNG de l'app à partir des sources SVG de la marque.
// Usage : npm i -D @resvg/resvg-js && node scripts/gen-icons.mjs
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = (p) => resolve(root, 'assets', p);

const BUBBLE =
  'M296 250 h432 a104 104 0 0 1 104 104 v232 a104 104 0 0 1 -104 104 H470 l-110 96 v-96 h-64 a104 104 0 0 1 -104 -104 V354 a104 104 0 0 1 104 -104 Z';
const ARROW = 'M360 442 H560 V414 L690 470 L560 526 V498 H360 Z';

const GRADIENT = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="g" x1="140" y1="120" x2="900" y2="940" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#6366F1"/><stop offset="0.55" stop-color="#2563EB"/><stop offset="1" stop-color="#1D4ED8"/>
  </linearGradient></defs>
  <rect width="1024" height="1024" fill="url(#g)"/>
</svg>`;

const MONO = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(512 512) scale(0.62) translate(-512 -470)">
    <path fill-rule="evenodd" fill="#ffffff" d="${BUBBLE} ${ARROW}"/>
  </g>
</svg>`;

const render = (svg, width) => new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng();

const iconSvg = readFileSync(out('brand/icon.svg'), 'utf8');
const fgSvg = readFileSync(out('brand/icon-foreground.svg'), 'utf8');

mkdirSync(out(''), { recursive: true });

const jobs = [
  ['icon.png', iconSvg, 1024],
  ['android-icon-foreground.png', fgSvg, 1024],
  ['android-icon-background.png', GRADIENT, 1024],
  ['android-icon-monochrome.png', MONO, 1024],
  ['favicon.png', iconSvg, 64],
];

for (const [name, svg, w] of jobs) {
  writeFileSync(out(name), render(svg, w));
  console.log('✓', name, `(${w}px)`);
}
console.log('Terminé.');
