// Gera folhas de prévia da pixel art em previews/ (npm run preview).
import { mkdirSync } from 'node:fs';
import { PixelBuffer } from '../src/pixel/buffer.js';
import { buildFrames, FRAME_W, FRAME_H, STYLES } from '../src/pixel/fighters-art.js';
import { savePng } from './png.mjs';

const out = process.argv[2] || 'previews';
mkdirSync(out, { recursive: true });

const ORDER = ['idle', 'walk', 'jump', 'attack', 'block', 'hurt', 'win', 'ko'];
const ids = Object.keys(STYLES);
const cols = ORDER.reduce((n, a) => n + (a === 'ko' ? 2 : a === 'walk' ? 6 : a === 'idle' ? 4 : a === 'attack' ? 3 : a === 'jump' || a === 'win' ? 2 : 1), 0);

const sheet = new PixelBuffer(cols * FRAME_W, ids.length * FRAME_H);
sheet.rect(0, 0, sheet.width, sheet.height, '#8fc7e8');
ids.forEach((id, row) => {
  const frames = buildFrames(id);
  let col = 0;
  for (const anim of ORDER) {
    for (const f of frames[anim]) {
      if ((col + row) % 2) sheet.rect(col * FRAME_W, row * FRAME_H, FRAME_W, FRAME_H, '#7fb9dc');
      sheet.blit(f, col * FRAME_W, row * FRAME_H + FRAME_H - f.height);
      col += anim === 'ko' ? 2 : 1;
    }
  }
});
savePng(`${out}/lutadores.png`, sheet, 3);
console.log(`prévia gravada em ${out}/lutadores.png`);
