// Cenários em pixel art, na resolução interna do jogo (320 × 180).
// Aqui fica só a parte parada; ondas, nuvens e pétalas se mexem no renderer.

import { PixelBuffer, hex } from './buffer.js';

export const WIDTH = 320;
export const HEIGHT = 180;
export const GROUND_Y = 156;

// degradê em faixas com pontilhado entre elas, o jeito clássico de 16 bits
function dither(buf, y0, y1, colors) {
  const band = (y1 - y0) / colors.length;
  for (let y = y0; y < y1; y++) {
    const f = (y - y0) / band;
    const i = Math.min(colors.length - 1, Math.floor(f));
    const next = Math.min(colors.length - 1, i + 1);
    const t = f - i;
    for (let x = 0; x < WIDTH; x++) {
      const useNext = t > 0.75 ? (x + y) % 2 === 0 : t > 0.5 ? (x % 2 === 0 && y % 2 === 0) : false;
      buf.set(x, y, useNext ? colors[next] : colors[i]);
    }
  }
}

function cloud(buf, x, y, w, color, shade) {
  buf.ellipse(x, y, Math.round(w / 3), 4, color);
  buf.ellipse(x + Math.round(w / 3), y - 3, Math.round(w / 3), 6, color);
  buf.ellipse(x + Math.round((2 * w) / 3), y, Math.round(w / 3), 4, color);
  buf.rect(x - Math.round(w / 3), y + 2, w + Math.round((2 * w) / 3), 2, shade);
}

// ---------------------------------------------------------------- Going Merry

function goingMerry() {
  const b = new PixelBuffer(WIDTH, HEIGHT);
  dither(b, 0, 96, ['#3b7fd9', '#4f95e6', '#6aaeef', '#8cc8f5', '#b4def9']);
  // sol e nuvens distantes
  b.ellipse(262, 30, 10, 10, '#fff6c9');
  b.ellipse(262, 30, 8, 8, '#fffbe6');
  cloud(b, 40, 40, 30, '#ffffff', '#d7e8f7');
  cloud(b, 180, 24, 22, '#ffffff', '#d7e8f7');
  // mar até o horizonte
  dither(b, 96, 132, ['#1f5fae', '#2a72c4', '#3487d4']);
  for (let x = 0; x < WIDTH; x += 1) if ((x * 7) % 23 < 3) b.set(x, 97, '#cfe8ff');
  // ilha ao fundo
  b.ellipse(70, 96, 26, 6, '#2f6d4a');
  b.ellipse(62, 93, 10, 5, '#3c8a5a');
  b.rect(44, 96, 52, 1, '#245639');

  // mastro e vela com a Jolly Roger dos Chapéus de Palha
  b.rect(150, 0, 6, 132, '#7a4a26');
  b.rect(150, 0, 2, 132, '#9a6234');
  b.rect(100, 12, 106, 4, '#7a4a26');
  b.rect(104, 16, 98, 64, '#f4ecd8');
  b.rect(104, 16, 98, 3, '#d9cdb1');
  for (let y = 20; y < 80; y += 6) b.rect(104, y, 98, 1, '#e8dfc6');
  b.rect(104, 78, 98, 2, '#d9cdb1');
  // caveira com chapéu de palha
  b.ellipse(153, 50, 14, 13, '#1f1a24');
  b.ellipse(153, 48, 11, 10, '#fbfbf5');
  b.rect(146, 55, 15, 5, '#fbfbf5');
  b.ellipse(148, 48, 3, 3, '#1f1a24');
  b.ellipse(158, 48, 3, 3, '#1f1a24');
  b.rect(152, 53, 3, 2, '#1f1a24');
  for (let x = 147; x < 161; x += 3) b.rect(x, 58, 1, 3, '#1f1a24');
  b.rect(136, 36, 34, 4, '#f2cc4f');
  b.rect(142, 30, 22, 6, '#f2cc4f');
  b.rect(142, 34, 22, 2, '#cf2f35');
  b.rect(136, 39, 34, 1, '#c99a2e');
  // ossos cruzados
  b.line(128, 64, 178, 76, '#fbfbf5', 3);
  b.line(128, 76, 178, 64, '#fbfbf5', 3);

  // amurada e convés de madeira
  b.rect(0, 124, WIDTH, 8, '#8a5631');
  b.rect(0, 124, WIDTH, 2, '#b07443');
  for (let x = 6; x < WIDTH; x += 22) b.rect(x, 132, 4, GROUND_Y - 132, '#6c4022');
  b.rect(0, 132, WIDTH, GROUND_Y - 132, '#9b6538');
  for (let x = 6; x < WIDTH; x += 22) {
    b.rect(x, 132, 4, GROUND_Y - 132, '#b47a47');
    b.rect(x, 132, 1, GROUND_Y - 132, '#d19a62');
  }
  b.rect(0, 150, WIDTH, 6, '#7a4a26');
  // tábuas do piso, em perspectiva leve
  const planks = ['#a86e3d', '#9b6538', '#b47a47', '#8f5b32'];
  for (let y = GROUND_Y; y < HEIGHT; y++) {
    const row = Math.floor((y - GROUND_Y) / 4);
    for (let x = 0; x < WIDTH; x++) {
      const seam = (x + row * 37) % 64 === 0;
      b.set(x, y, seam ? '#6c4022' : planks[row % planks.length]);
    }
    if ((y - GROUND_Y) % 4 === 0) b.rect(0, y, WIDTH, 1, '#6c4022');
  }
  b.rect(0, GROUND_Y, WIDTH, 1, '#d19a62');
  // barris e cordas
  for (const x of [14, 288]) {
    b.round(x, 130, 18, 22, '#8a5631');
    b.rect(x, 134, 18, 2, '#4a3a33');
    b.rect(x, 146, 18, 2, '#4a3a33');
    b.rect(x + 3, 131, 3, 20, '#a8693a');
  }
  return b;
}

// ---------------------------------------------------------------- Wano

function wano() {
  const b = new PixelBuffer(WIDTH, HEIGHT);
  dither(b, 0, 120, ['#2b1d4f', '#4a2a6b', '#7e3a72', '#c45a6a', '#ef8f62', '#f9c27a']);
  // lua cheia
  b.ellipse(70, 38, 18, 18, '#fde9c4');
  b.ellipse(66, 34, 4, 3, '#f3d6a4');
  b.ellipse(76, 44, 3, 3, '#f3d6a4');
  // estrelas
  for (let i = 0; i < 40; i++) {
    const x = (i * 97) % WIDTH;
    const y = (i * 53) % 50;
    b.set(x, y, i % 3 ? '#e9d7ff' : '#ffffff');
  }
  // montanha nevada ao fundo
  for (let x = 120; x < 300; x++) {
    const h = 70 - Math.abs(x - 210) * 0.75;
    for (let y = 120 - h; y < 120; y++) b.set(x, Math.round(y), '#4b3b6e');
    for (let y = 120 - h; y < 120 - h + 10 && Math.abs(x - 210) < 34; y++) b.set(x, Math.round(y), '#e8e4f4');
  }
  // silhueta de telhados e pagode
  b.rect(0, 112, WIDTH, 20, '#2a1c3c');
  for (let x = 4; x < WIDTH; x += 9) b.set(x, 118 + (x % 3), '#f9c27a'); // janelas acesas
  for (const [x, w, h] of [[10, 40, 14], [60, 30, 10], [240, 50, 16], [295, 25, 12]]) {
    b.rect(x, 112 - h, w, h, '#2a1c3c');
    b.rect(x - 4, 112 - h, w + 8, 2, '#3a2850');
  }
  b.rect(212, 60, 16, 52, '#2a1c3c');
  for (let i = 0; i < 4; i++) b.rect(204 + i * 2, 64 + i * 12, 32 - i * 4, 3, '#3a2850');
  // torii vermelho
  b.rect(26, 72, 6, 60, '#c8303b');
  b.rect(86, 72, 6, 60, '#c8303b');
  b.rect(16, 66, 86, 5, '#d93a44');
  b.rect(14, 64, 90, 3, '#1f1626');
  b.rect(22, 80, 74, 4, '#c8303b');
  b.rect(26, 72, 2, 60, '#e45a62');
  // cerejeiras
  const blossom = (cx, cy) => {
    b.line(cx, cy + 30, cx - 4, cy + 4, '#3a2430', 4);
    b.line(cx - 4, cy + 10, cx + 12, cy, '#3a2430', 2);
    for (const [dx, dy, r] of [[-10, 0, 12], [8, -4, 13], [0, -12, 11], [18, 4, 9], [-20, 6, 8]]) {
      b.ellipse(cx + dx, cy + dy, r, Math.round(r * 0.7), '#f4a6c4');
      b.ellipse(cx + dx - 2, cy + dy - 2, Math.round(r * 0.6), Math.round(r * 0.4), '#ffd0e2');
    }
  };
  blossom(150, 92);
  blossom(290, 96);
  // ponte de pedra: chão da luta
  b.rect(0, 132, WIDTH, GROUND_Y - 132, '#3a2a40');
  for (let x = 0; x < WIDTH; x += 16) {
    b.rect(x + 2, 136, 4, GROUND_Y - 136, '#5a3c4c');
    b.rect(x + 2, 136, 1, GROUND_Y - 136, '#7a5466');
  }
  b.rect(0, 132, WIDTH, 4, '#c8303b');
  b.rect(0, 132, WIDTH, 1, '#e45a62');
  const stones = ['#8f8aa0', '#7f7a92', '#9c97ac'];
  for (let y = GROUND_Y; y < HEIGHT; y++) {
    const row = Math.floor((y - GROUND_Y) / 6);
    for (let x = 0; x < WIDTH; x++) {
      const seam = (x + (row % 2) * 12) % 24 === 0 || (y - GROUND_Y) % 6 === 0;
      b.set(x, y, seam ? '#5d5870' : stones[(Math.floor(x / 24) + row) % stones.length]);
    }
  }
  b.rect(0, GROUND_Y, WIDTH, 1, '#c9c4d8');
  return b;
}

export const STAGES = {
  merry: { name: 'Going Merry', subtitle: 'alto-mar', paint: goingMerry, ambient: 'sea' },
  wano: { name: 'Wano', subtitle: 'ponte das cerejeiras', paint: wano, ambient: 'petals' },
};

export { hex };
