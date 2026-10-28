// Desenho no navegador. A cena (cenário, lutadores, efeitos) é feita em pixels
// na resolução interna 320 × 180 e ampliada 4× sem suavização; o HUD e os
// textos vão direto na tela grande, para ficarem nítidos.

import { PixelBuffer, hex } from './pixel/buffer.js';
import { buildFrames, FRAME_W, ORIGIN_X, ORIGIN_Y } from './pixel/fighters-art.js';
import { STAGES, WIDTH, HEIGHT } from './pixel/stages-art.js';
import { attackPhase, currentReach } from './combat.js';

export const SCALE = 4;
export const FONT = '"Press Start 2P", monospace';
export const INK = '#1b1424';
const SKIN = '#f6c9a0';
const SKIN_S = '#d9946b';
const FIRE = ['#ffffff', '#fff3a0', '#ffd23f', '#ff8a1f', '#e8433a', '#7a2a2a'];
const SPARK = ['#ffffff', '#fff3a0', '#ffd23f', '#ff8a1f'];
const GUARD = ['#ffffff', '#cdf3ff', '#7fd3ff', '#3a8fd9'];
const DUST = ['#f4ecd8', '#d9cdb1', '#b8a98a'];

export function toCanvas(buf) {
  const c = document.createElement('canvas');
  c.width = buf.width;
  c.height = buf.height;
  c.getContext('2d').putImageData(new ImageData(buf.data, buf.width, buf.height), 0, 0);
  return c;
}

// guarda as duas direções do quadro e onde fica o corpo, para alinhar no chão
function bake(buf) {
  let minX = buf.width;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < buf.height; y++) {
    for (let x = 0; x < buf.width; x++) {
      if (!buf.alpha(x, y)) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return { r: toCanvas(buf), l: toCanvas(buf.flipped()), w: buf.width, cx: (minX + maxX) / 2, maxY };
}

function silhouette(buf, color) {
  const out = new PixelBuffer(buf.width, buf.height);
  const c = hex(color);
  for (let y = 0; y < buf.height; y++) for (let x = 0; x < buf.width; x++) if (buf.alpha(x, y)) out.set(x, y, c);
  return out;
}

const spriteCache = {};
export function sprites(id) {
  if (!spriteCache[id]) {
    const frames = buildFrames(id);
    const s = {};
    for (const [anim, list] of Object.entries(frames)) s[anim] = list.map(bake);
    s.flash = bake(silhouette(frames.hurt[0], '#ffffff'));
    const head = new PixelBuffer(32, 32);
    head.blit(frames.idle[0], -17, -6);
    s.portrait = toCanvas(head);
    spriteCache[id] = s;
  }
  return spriteCache[id];
}

const stageCache = {};
export function stageCanvas(id) {
  stageCache[id] ??= toCanvas(STAGES[id].paint());
  return stageCache[id];
}

function frameFor(f, s) {
  switch (f.state) {
    case 'walk':
      return s.walk[Math.floor(f.stateTime * 10) % s.walk.length];
    case 'jump':
      return s.jump[f.vy < 0 ? 0 : 1];
    case 'attack': {
      const phase = attackPhase(f.data.attack, f.attackTime);
      return s.attack[phase === 'startup' ? 0 : phase === 'active' ? 1 : 2];
    }
    case 'block':
      return s.block[0];
    case 'hurt':
      return f.stateTime < 0.07 ? s.flash : s.hurt[0];
    case 'ko':
      return f.onGround && f.stateTime > 0.18 ? s.ko[0] : s.hurt[0];
    case 'win':
      return s.win[Math.floor(f.stateTime * 3) % s.win.length];
    default:
      return s.idle[Math.floor(f.stateTime * 6) % s.idle.length];
  }
}

function blitFrame(ctx, fr, x, y, facing, lying) {
  const left = facing < 0;
  let dx;
  let dy;
  if (lying) {
    dx = x - (left ? fr.w - 1 - fr.cx : fr.cx);
    dy = y - fr.maxY;
  } else {
    dx = x - (left ? FRAME_W - 1 - ORIGIN_X : ORIGIN_X);
    dy = y - ORIGIN_Y;
  }
  ctx.drawImage(left ? fr.l : fr.r, Math.round(dx), Math.round(dy));
}

// um lutador fora da luta (menus): animação pelo relógio
export function drawPose(ctx, id, anim, time, x, y, facing) {
  const list = sprites(id)[anim];
  const fps = anim === 'walk' ? 10 : anim === 'win' ? 3 : 6;
  blitFrame(ctx, list[Math.floor(time * fps) % list.length], x, y, facing, anim === 'ko');
}

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

function line(ctx, x0, y0, x1, y1, size, color) {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  const o = Math.floor(size / 2);
  ctx.fillStyle = color;
  for (let i = 0; i <= n; i++) {
    ctx.fillRect(Math.round(x0 + ((x1 - x0) * i) / n) - o, Math.round(y0 + ((y1 - y0) * i) / n) - o, size, size);
  }
}

// pseudoaleatório estável por quadro (o raio "treme" sem piscar a cada pixel)
function hash(n) {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

export class Renderer {
  constructor() {
    this.particles = [];
    this.bursts = [];
    this.shakeTime = 0;
    this.shakeMag = 0;
    this.time = 0;
    this.petals = Array.from({ length: 28 }, (_, i) => ({
      x: hash(i + 1) * WIDTH,
      y: hash(i + 50) * HEIGHT,
      vy: 10 + hash(i + 99) * 14,
      phase: hash(i + 7) * 6.28,
      color: i % 3 ? '#ffc6da' : '#ff9fc0',
    }));
  }

  reset() {
    this.particles = [];
    this.bursts = [];
    this.shakeTime = 0;
  }

  shake(mag, time) {
    this.shakeMag = Math.max(this.shakeTime > 0 ? this.shakeMag : 0, mag);
    this.shakeTime = Math.max(this.shakeTime, time);
  }

  shakeOffset() {
    if (this.shakeTime <= 0) return [0, 0];
    const m = Math.ceil(this.shakeMag * Math.min(1, this.shakeTime / 0.15));
    return [Math.round((Math.random() * 2 - 1) * m), Math.round((Math.random() * 2 - 1) * m)];
  }

  emit(x, y, { n = 6, colors = SPARK, speed = 60, up = 0, life = 0.35, gravity = 0, size = 1, dir = 0 }) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.6);
      const l = life * (0.6 + Math.random() * 0.4);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * v + dir * speed * 0.5,
        vy: Math.sin(a) * v - up,
        life: l,
        max: l,
        colors,
        gravity,
        size: size + (Math.random() < 0.4 ? 1 : 0),
      });
    }
  }

  // reage aos eventos do mundo: faíscas, poeira, tremor
  onEvents(events) {
    for (const e of events) {
      if (e.type === 'hit') {
        const colors = e.blocked ? GUARD : SPARK;
        this.emit(e.x, e.y, { n: e.blocked ? 6 : 14, colors, speed: e.blocked ? 50 : 90, dir: -e.target.facing });
        this.bursts.push({ x: e.x, y: e.y, t: 0, blocked: e.blocked });
        this.shake(e.ko ? 5 : e.blocked ? 1 : 3, e.ko ? 0.5 : 0.18);
        if (!e.blocked) this.emit(e.target.x, e.target.y - 1, { n: 4, colors: DUST, speed: 25, up: 10, gravity: 40 });
      } else if (e.type === 'land' || e.type === 'jump') {
        this.emit(e.owner.x, e.owner.y - 1, { n: 5, colors: DUST, speed: 22, up: 8, gravity: 30, life: 0.3 });
      } else if (e.type === 'swing' && e.owner.data.attack.kind === 'kick') {
        const f = e.owner;
        this.emit(f.x + f.facing * 6, f.y - 12, { n: 8, colors: FIRE, speed: 25, up: 25, life: 0.4 });
      }
    }
  }

  update(dt, fighters = []) {
    this.time += dt;
    this.shakeTime -= dt;
    for (const p of this.particles) {
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const b of this.bursts) b.t += dt;
    this.bursts = this.bursts.filter((b) => b.t < 0.14);
    for (const p of this.petals) {
      p.y += p.vy * dt;
      p.x += (Math.sin(this.time * 1.3 + p.phase) * 10 - 12) * dt;
      if (p.y > HEIGHT) p.y -= HEIGHT + 4;
      if (p.x < -4) p.x += WIDTH + 8;
    }
    // perna em chamas do Sanji solta fogo durante o chute
    for (const f of fighters) {
      if (f.state !== 'attack' || f.data.attack.kind !== 'kick') continue;
      const phase = attackPhase(f.data.attack, f.attackTime);
      const foot = phase === 'active' ? [15, -24] : phase === 'startup' ? [4, -9] : [7, -3];
      for (let i = 0; i < 3; i++) {
        const k = Math.random();
        this.particles.push({
          x: f.x + f.facing * (2 + (foot[0] - 2) * k) + (Math.random() * 4 - 2),
          y: f.y - 15 + (foot[1] + 15) * k + (Math.random() * 4 - 2),
          vx: -f.facing * 12 + (Math.random() * 16 - 8),
          vy: -25 - Math.random() * 30,
          life: 0.35,
          max: 0.35,
          colors: FIRE,
          gravity: 0,
          size: Math.random() < 0.5 ? 2 : 1,
        });
      }
    }
  }

  drawAmbient(ctx, stageId) {
    const t = this.time;
    if (STAGES[stageId].ambient === 'sea') {
      for (let i = 0; i < 40; i++) {
        const x = (i * 53 + 11) % WIDTH;
        const y = 104 + ((i * 17) % 18);
        if (x > 146 && x < 160) continue;
        if (Math.sin(t * 2.2 + i * 1.7) > 0.7) px(ctx, x, y, 2, 1, '#d8f0ff');
      }
    } else {
      for (const p of this.petals) px(ctx, p.x, p.y, Math.sin(t * 4 + p.phase) > 0 ? 2 : 1, 1, p.color);
    }
  }

  drawShadow(ctx, f) {
    const h = Math.max(0, f.groundY - f.y);
    const w = Math.max(6, 18 - h / 5);
    ctx.fillStyle = 'rgba(20, 10, 30, 0.35)';
    ctx.fillRect(Math.round(f.x - w / 2), f.groundY - 1, Math.round(w), 2);
    ctx.fillRect(Math.round(f.x - w / 2 + 2), f.groundY + 1, Math.round(w - 4), 1);
  }

  drawFighter(ctx, f) {
    const s = sprites(f.data.id);
    const fr = frameFor(f, s);
    blitFrame(ctx, fr, f.x, f.y, f.facing, fr === s.ko[0]);
  }

  // braço de borracha do Luffy: estica até o punho e volta
  drawStretch(ctx, f) {
    const atk = f.data.attack;
    const t = f.attackTime;
    const phase = attackPhase(atk, t);
    if (phase !== 'active' && phase !== 'recovery') return;
    let reach = currentReach(atk, t);
    if (phase === 'recovery') {
      const k = Math.min(1, (t - atk.startup - atk.active) / (atk.recovery * 0.5));
      reach = atk.to + (16 - atk.to) * k;
    }
    if (reach <= 20) return;
    const d = f.facing;
    const y = Math.round(f.y - 24);
    const x0 = f.x + d * 15;
    const x1 = f.x + d * (reach - 3);
    const a = Math.round(Math.min(x0, x1));
    const w = Math.round(Math.abs(x1 - x0));
    // braço com leve ondulação de borracha
    for (let i = 0; i <= w; i++) {
      const wob = phase === 'active' && i % 9 < 2 ? 1 : 0;
      px(ctx, a + i, y - 2, 1, 4 + wob, INK);
      px(ctx, a + i, y - 1, 1, 1 + wob, SKIN);
      px(ctx, a + i, y, 1, 1, SKIN_S);
    }
    // punho
    const fx = Math.round(f.x + d * reach) - 3;
    px(ctx, fx - 1, y - 4, 8, 8, INK);
    px(ctx, fx, y - 3, 6, 6, SKIN);
    px(ctx, fx, y - 3, 6, 1, '#ffe2c6');
    px(ctx, fx + (d > 0 ? 4 : 1), y - 2, 1, 4, SKIN_S);
    px(ctx, fx, y + 2, 6, 1, SKIN_S);
    if (phase === 'active') {
      // linhas de velocidade atrás do punho
      for (const [dy, len] of [[-5, 10], [0, 16], [5, 8]]) {
        const sx = Math.round(f.x + d * (reach - 6 - len));
        px(ctx, Math.min(sx, sx + d * len), y + dy, len, 1, 'rgba(255,255,255,0.8)');
      }
    }
  }

  // Oni Giri: dois cortes em X com rastro verde-claro
  drawSlash(ctx, f) {
    const atk = f.data.attack;
    const since = f.attackTime - atk.startup;
    const tail = 0.16;
    if (since < 0 || since > atk.active + tail) return;
    const grow = Math.min(1, since / atk.active);
    ctx.globalAlpha = since > atk.active ? 1 - (since - atk.active) / tail : 1;
    const d = f.facing;
    const cx = f.x + d * 8;
    const cy = f.y - 21;
    const strokes = [
      [[-6, -18], [28, -8], [6, 14]],
      [[-6, 14], [28, 4], [6, -18]],
    ];
    for (const [p0, c, p2] of strokes) {
      const steps = 44;
      for (let i = 0; i <= steps * grow; i++) {
        const k = i / steps;
        const bx = (1 - k) ** 2 * p0[0] + 2 * (1 - k) * k * c[0] + k * k * p2[0];
        const by = (1 - k) ** 2 * p0[1] + 2 * (1 - k) * k * c[1] + k * k * p2[1];
        const thick = Math.round(Math.sin(k * Math.PI) * 3);
        const x = cx + d * bx;
        const y = cy + by;
        px(ctx, x - thick, y - thick, thick * 2 + 2, thick * 2 + 2, '#5fd07a');
        if (thick > 0) px(ctx, x - thick + 1, y - thick + 1, thick * 2, thick * 2, '#bff7d0');
        px(ctx, x, y, 1, 1, '#ffffff');
      }
    }
    ctx.globalAlpha = 1;
  }

  // nuvem de carga e o raio da Nami
  drawCharge(ctx, f) {
    const atk = f.data.attack;
    if (attackPhase(atk, f.attackTime) !== 'startup') return;
    const tipX = f.x + f.facing * 6;
    const tipY = f.y - 44;
    const r = 2 + Math.round((f.attackTime / atk.startup) * 4);
    px(ctx, tipX - r - 1, tipY - 2, r * 2 + 2, 5, '#3a3f5c');
    px(ctx, tipX - r, tipY - 3, r * 2, 5, '#5b6386');
    px(ctx, tipX - r + 1, tipY - 3, r, 2, '#8a93b8');
    if (Math.floor(this.time * 20) % 2) px(ctx, tipX, tipY + 3, 1, 3, '#fff36b');
  }

  drawBolt(ctx, p) {
    const d = Math.sign(p.vx);
    const seed = Math.floor(this.time * 24) + p.x * 0.01;
    const pts = [];
    for (let i = 0; i <= 6; i++) {
      const jitter = i === 0 ? 0 : Math.round((hash(seed + i) * 2 - 1) * 4);
      pts.push([p.x + d * 6 - d * i * 5, p.y + jitter]);
    }
    for (let i = 0; i < pts.length - 1; i++) line(ctx, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 3, '#4aa8ff');
    for (let i = 0; i < pts.length - 1; i++) line(ctx, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 1, '#ffffff');
    const ox = Math.round(p.x + d * 7);
    const oy = Math.round(p.y);
    px(ctx, ox - 4, oy - 3, 8, 7, '#ffe94a');
    px(ctx, ox - 3, oy - 4, 6, 9, '#ffe94a');
    px(ctx, ox - 2, oy - 2, 4, 4, '#ffffff');
    for (let i = 0; i < 3; i++) {
      const a = hash(seed * 3 + i) * 6.28;
      px(ctx, ox + Math.cos(a) * 7, oy + Math.sin(a) * 6, 1, 1, '#fff36b');
    }
  }

  drawBurst(ctx, b) {
    const k = b.t / 0.14;
    const r0 = 2 + k * 4;
    const r1 = 5 + k * 9;
    const color = b.blocked ? '#cdf3ff' : '#fff3a0';
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.3;
      const len = i % 2 ? r1 * 0.6 : r1;
      line(ctx, b.x + Math.cos(a) * r0, b.y + Math.sin(a) * r0, b.x + Math.cos(a) * len, b.y + Math.sin(a) * len, 1, color);
    }
    if (k < 0.5) px(ctx, b.x - 2, b.y - 2, 5, 5, '#ffffff');
  }

  // cena completa de uma luta
  drawScene(ctx, stageId, world) {
    ctx.drawImage(stageCanvas(stageId), 0, 0);
    this.drawAmbient(ctx, stageId);
    const fighters = [...world.fighters].sort((a, b) => (a.state === 'attack') - (b.state === 'attack'));
    for (const f of fighters) this.drawShadow(ctx, f);
    for (const f of fighters) {
      if (f.state === 'attack' && f.data.attack.kind === 'slash') this.drawSlash(ctx, f);
      this.drawFighter(ctx, f);
      if (f.state === 'attack' && f.data.attack.kind === 'stretch') this.drawStretch(ctx, f);
      if (f.state === 'attack' && f.data.attack.kind === 'projectile') this.drawCharge(ctx, f);
    }
    for (const p of world.projectiles) this.drawBolt(ctx, p);
    this.drawParticles(ctx);
  }

  drawParticles(ctx) {
    for (const p of this.particles) {
      const k = 1 - p.life / p.max;
      px(ctx, p.x, p.y, p.size, p.size, p.colors[Math.min(p.colors.length - 1, Math.floor(k * p.colors.length))]);
    }
    for (const b of this.bursts) this.drawBurst(ctx, b);
  }
}

// ---------- tela grande (HUD e textos) ----------

export function present(ctx, scene, [sx, sy] = [0, 0]) {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.drawImage(scene, sx * SCALE, sy * SCALE, WIDTH * SCALE, HEIGHT * SCALE);
}

export function text(ctx, str, x, y, size, color = '#ffffff', align = 'center', stroke = 0) {
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  if (stroke) {
    ctx.lineJoin = 'miter';
    ctx.lineWidth = stroke;
    ctx.strokeStyle = INK;
    ctx.strokeText(str, x, y);
  }
  const off = Math.max(2, Math.round(size / 8));
  ctx.fillStyle = INK;
  ctx.fillText(str, x + off, y + off);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

export function panel(ctx, x, y, w, h, fill = '#2a1f3a', border = '#f4ecd8') {
  ctx.fillStyle = INK;
  ctx.fillRect(x - 8, y - 8, w + 16, h + 16);
  ctx.fillStyle = border;
  ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
}

export function portrait(ctx, id, x, y, size, flip = false) {
  const p = sprites(id).portrait;
  ctx.imageSmoothingEnabled = false;
  if (flip) {
    ctx.save();
    ctx.translate(x + size, y);
    ctx.scale(-1, 1);
    ctx.drawImage(p, 0, 0, size, size);
    ctx.restore();
  } else ctx.drawImage(p, x, y, size, size);
}

export function banner(ctx, big, small, color = '#ffd23f') {
  ctx.fillStyle = 'rgba(27, 20, 36, 0.6)';
  ctx.fillRect(0, 292, 1280, 136);
  ctx.fillStyle = color;
  ctx.fillRect(0, 292, 1280, 4);
  ctx.fillRect(0, 424, 1280, 4);
  text(ctx, big, 640, small ? 312 : 332, 56, color, 'center', 12);
  if (small) text(ctx, small, 640, 392, 16);
}

const BAR_W = 452;
export function drawHud(ctx, world, wins, trail) {
  world.fighters.forEach((f, i) => {
    const left = i === 0;
    const bx = left ? 112 : 1280 - 112 - BAR_W;
    // retrato
    const px0 = left ? 24 : 1280 - 24 - 64;
    panel(ctx, px0, 20, 64, 64, f.data.color);
    portrait(ctx, f.data.id, px0, 20, 64, !left);
    // barra de vida: vermelho = dano recente, dourado = vida
    ctx.fillStyle = INK;
    ctx.fillRect(bx - 4, 24, BAR_W + 8, 36);
    ctx.fillStyle = '#3a2340';
    ctx.fillRect(bx, 28, BAR_W, 28);
    const tw = Math.round((BAR_W * trail[i]) / f.maxHp);
    const hw = Math.round((BAR_W * f.hp) / f.maxHp);
    ctx.fillStyle = '#e8433a';
    ctx.fillRect(left ? bx : bx + BAR_W - tw, 28, tw, 28);
    const low = f.hp / f.maxHp < 0.25 && Math.floor(performance.now() / 160) % 2;
    ctx.fillStyle = low ? '#ff8a1f' : '#ffd23f';
    ctx.fillRect(left ? bx : bx + BAR_W - hw, 28, hw, 28);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillRect(left ? bx : bx + BAR_W - hw, 28, hw, 4);
    ctx.fillStyle = 'rgba(122,42,42,0.35)';
    ctx.fillRect(left ? bx : bx + BAR_W - hw, 52, hw, 4);
    // nome e vitórias
    text(ctx, f.data.short, left ? bx : bx + BAR_W, 72, 16, '#ffffff', left ? 'left' : 'right');
    for (let r = 0; r < 2; r++) {
      const x = left ? bx + BAR_W - 20 - r * 28 : bx + r * 28;
      ctx.fillStyle = INK;
      ctx.fillRect(x - 2, 70, 22, 22);
      ctx.fillStyle = wins[i] > r ? '#ffd23f' : '#3a2340';
      ctx.fillRect(x + 2, 74, 14, 14);
    }
  });
  // relógio
  panel(ctx, 600, 20, 80, 56);
  const secs = Math.ceil(world.timeLeft);
  text(ctx, String(secs).padStart(2, '0'), 640, 32, 32, secs <= 10 ? '#ff8a1f' : '#ffffff');
}
