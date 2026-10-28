// Buffer de pixels RGBA independente do DOM: o mesmo código desenha no
// navegador (via ImageData) e no Node (para gerar prévias em PNG).

export function hex(color) {
  const v = color.replace('#', '');
  const n = parseInt(v.length === 3 ? v.split('').map((c) => c + c).join('') : v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}

export class PixelBuffer {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }

  inside(x, y) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  get(x, y) {
    const i = (y * this.width + x) * 4;
    return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
  }

  alpha(x, y) {
    return this.inside(x, y) ? this.data[(y * this.width + x) * 4 + 3] : 0;
  }

  set(x, y, color) {
    x = Math.round(x);
    y = Math.round(y);
    if (!color || !this.inside(x, y)) return;
    const c = typeof color === 'string' ? hex(color) : color;
    const i = (y * this.width + x) * 4;
    if (c[3] === 255) {
      this.data[i] = c[0];
      this.data[i + 1] = c[1];
      this.data[i + 2] = c[2];
      this.data[i + 3] = 255;
      return;
    }
    // mistura simples para cores com transparência
    const a = c[3] / 255;
    this.data[i] = c[0] * a + this.data[i] * (1 - a);
    this.data[i + 1] = c[1] * a + this.data[i + 1] * (1 - a);
    this.data[i + 2] = c[2] * a + this.data[i + 2] * (1 - a);
    this.data[i + 3] = Math.max(this.data[i + 3], c[3]);
  }

  rect(x, y, w, h, color) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, color);
  }

  // retângulo com cantos cortados em 1 px, o "arredondado" da pixel art
  round(x, y, w, h, color) {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const corner = (i === 0 || i === w - 1) && (j === 0 || j === h - 1);
        if (!corner) this.set(x + i, y + j, color);
      }
    }
  }

  ellipse(cx, cy, rx, ry, color) {
    for (let y = -ry; y <= ry; y++) {
      for (let x = -rx; x <= rx; x++) {
        if ((x * x) / (rx * rx + 0.3) + (y * y) / (ry * ry + 0.3) <= 1) this.set(cx + x, cy + y, color);
      }
    }
  }

  // segmento grosso entre dois pontos (membros do boneco)
  line(x0, y0, x1, y1, color, thick = 1) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    const r = (thick - 1) / 2;
    for (let s = 0; s <= steps; s++) {
      const x = x0 + ((x1 - x0) * s) / steps;
      const y = y0 + ((y1 - y0) * s) / steps;
      for (let dy = -Math.floor(r); dy <= Math.ceil(r); dy++) {
        for (let dx = -Math.floor(r); dx <= Math.ceil(r); dx++) this.set(x + dx, y + dy, color);
      }
    }
  }

  blit(src, dx, dy, { flip = false } = {}) {
    for (let y = 0; y < src.height; y++) {
      for (let x = 0; x < src.width; x++) {
        const sx = flip ? src.width - 1 - x : x;
        const i = (y * src.width + sx) * 4;
        if (src.data[i + 3] === 0) continue;
        this.set(dx + x, dy + y, [src.data[i], src.data[i + 1], src.data[i + 2], src.data[i + 3]]);
      }
    }
  }

  // contorno escuro em volta de tudo que foi desenhado: dá a "cara" de sprite
  outline(color) {
    const c = typeof color === 'string' ? hex(color) : color;
    const marks = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.alpha(x, y)) continue;
        if (this.alpha(x + 1, y) || this.alpha(x - 1, y) || this.alpha(x, y + 1) || this.alpha(x, y - 1)) {
          marks.push([x, y]);
        }
      }
    }
    for (const [x, y] of marks) this.set(x, y, c);
    return this;
  }

  flipped() {
    const out = new PixelBuffer(this.width, this.height);
    out.blit(this, 0, 0, { flip: true });
    return out;
  }

  // gira 90° no sentido anti-horário (usado na pose de nocaute, deitado)
  rotatedLeft() {
    const out = new PixelBuffer(this.height, this.width);
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const i = (y * this.width + x) * 4;
        if (!this.data[i + 3]) continue;
        out.set(y, this.width - 1 - x, [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]]);
      }
    }
    return out;
  }
}
