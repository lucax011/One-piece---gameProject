// Pixel art dos lutadores, desenhada por código como um "boneco articulado":
// cada quadro é uma pose (posição das articulações) e cada personagem é um
// estilo (cores, cabelo, roupa, acessórios). Tudo olha para a direita; o
// espelhamento para a esquerda é feito na hora de montar as animações.

import { PixelBuffer } from './buffer.js';

export const FRAME_W = 64;
export const FRAME_H = 56;
export const ORIGIN_X = 32; // centro entre os pés
export const ORIGIN_Y = 53; // linha do chão

const OUTLINE = '#1b1424';
const EYE = '#1c1426';
const WHITE = '#fbf7ef';

// ---------------------------------------------------------------- poses

function basePose() {
  return {
    bob: 0,
    lean: 0,
    hip: [0, -14],
    legs: {
      back: { knee: [-3, -7], foot: [-4, 0] },
      front: { knee: [3, -7], foot: [4, 0] },
    },
    arms: {
      back: { elbow: [-7, -20], hand: [-7, -15] },
      front: { elbow: [7, -20], hand: [7, -15] },
    },
    face: 'normal',
    attack: null,
  };
}

const sin = Math.sin;
const cos = Math.cos;

export const POSES = {
  idle: (i) => {
    const p = basePose();
    p.bob = i === 1 || i === 2 ? 1 : 0;
    p.arms.front.hand = [7, -15 + p.bob];
    p.arms.back.hand = [-7, -15 + p.bob];
    return p;
  },
  walk: (i) => {
    const p = basePose();
    const a = (i / 6) * Math.PI * 2;
    const fx = Math.round(4 * sin(a));
    p.legs.front.foot = [fx + 1, -Math.round(Math.max(0, cos(a)) * 2)];
    p.legs.front.knee = [Math.round(fx / 2) + 2, -7];
    p.legs.back.foot = [-fx - 1, -Math.round(Math.max(0, -cos(a)) * 2)];
    p.legs.back.knee = [Math.round(-fx / 2) - 2, -7];
    p.arms.front.hand = [6 - fx, -15];
    p.arms.front.elbow = [6 - Math.round(fx / 2), -20];
    p.arms.back.hand = [-6 + fx, -15];
    p.arms.back.elbow = [-6 + Math.round(fx / 2), -20];
    p.bob = i % 3 === 0 ? 0 : 1;
    p.lean = 1;
    return p;
  },
  jump: (i) => {
    const p = basePose();
    p.hip = [0, -16];
    p.legs.front = { knee: [5, -12], foot: [3, -5] };
    p.legs.back = { knee: [-2, -10], foot: [-5, -5] };
    if (i === 0) {
      p.arms.front = { elbow: [8, -27], hand: [9, -33] };
      p.arms.back = { elbow: [-8, -26], hand: [-10, -31] };
    } else {
      p.arms.front = { elbow: [9, -23], hand: [11, -26] };
      p.arms.back = { elbow: [-9, -22], hand: [-11, -25] };
    }
    return p;
  },
  block: () => {
    const p = basePose();
    p.lean = -1;
    p.legs.front = { knee: [4, -7], foot: [6, 0] };
    p.legs.back = { knee: [-4, -7], foot: [-6, 0] };
    p.arms.front = { elbow: [8, -23], hand: [6, -31] };
    p.arms.back = { elbow: [6, -21], hand: [8, -29] };
    p.face = 'grit';
    return p;
  },
  hurt: () => {
    const p = basePose();
    p.lean = -3;
    p.bob = 1;
    p.legs.front = { knee: [4, -7], foot: [5, 0] };
    p.legs.back = { knee: [-3, -7], foot: [-5, 0] };
    p.arms.front = { elbow: [9, -24], hand: [12, -27] };
    p.arms.back = { elbow: [-10, -24], hand: [-13, -28] };
    p.face = 'hurt';
    return p;
  },
  win: (i) => {
    const p = basePose();
    p.arms.front = { elbow: [7, -31], hand: [6, i === 0 ? -38 : -39] };
    p.arms.back = { elbow: [-6, -21], hand: [-3, -16] };
    p.bob = i;
    p.face = 'happy';
    return p;
  },
};

// ---------------------------------------------------------------- pintura

function painter(buf) {
  const X = (x) => ORIGIN_X + x;
  const Y = (y) => ORIGIN_Y + y;
  return {
    px: (x, y, c) => buf.set(X(x), Y(y), c),
    rect: (x, y, w, h, c) => buf.rect(X(x), Y(y), w, h, c),
    round: (x, y, w, h, c) => buf.round(X(x), Y(y), w, h, c),
    line: (a, b, c, t) => buf.line(X(a[0]), Y(a[1]), X(b[0]), Y(b[1]), c, t),
    ellipse: (x, y, rx, ry, c) => buf.ellipse(X(x), Y(y), rx, ry, c),
  };
}

// geometria derivada da pose (ombros, cabeça, quadris)
function skeleton(p) {
  const shoulderY = -26 + p.bob;
  const sx = p.lean;
  return {
    hip: p.hip,
    shoulder: [sx, shoulderY],
    headTop: shoulderY - 13,
    headX: sx + 1,
    hipBack: [p.hip[0] - 2, p.hip[1]],
    hipFront: [p.hip[0] + 2, p.hip[1]],
    shBack: [sx - 4, shoulderY + 1],
    shFront: [sx + 4, shoulderY + 1],
  };
}

function drawLeg(g, s, st, side, leg, shade) {
  const from = side === 'back' ? s.hipBack : s.hipFront;
  const pants = shade ? st.pantsS : st.pants;
  g.line(from, leg.knee, pants, 4);
  const shin = st.shin === 'pants' ? pants : st.shin === 'boots' ? (shade ? st.bootsS : st.boots) : shade ? st.skinS : st.skin;
  g.line(leg.knee, [leg.foot[0], leg.foot[1] - 2], shin, 3);
  if (st.cuff) g.line([leg.knee[0] - 1, leg.knee[1] + 1], [leg.knee[0] + 1, leg.knee[1] + 1], st.cuff, 2);
  g.rect(leg.foot[0] - 1, leg.foot[1] - 2, 4, 2, shade ? st.shoesS : st.shoes);
}

function drawArm(g, s, st, side, arm, shade) {
  const from = side === 'back' ? s.shBack : s.shFront;
  const sleeve = st.sleeve ? (shade ? st.sleeveS : st.sleeve) : shade ? st.skinS : st.skin;
  g.line(from, arm.elbow, sleeve, 3);
  const fore = st.longSleeve ? sleeve : shade ? st.skinS : st.skin;
  g.line(arm.elbow, arm.hand, fore, 3);
  g.rect(arm.hand[0] - 1, arm.hand[1] - 1, 3, 3, shade ? st.skinS : st.skin);
  if (st.armExtra) st.armExtra(g, side, arm, shade);
}

function drawTorso(g, s, st) {
  const [sx, sy] = s.shoulder;
  const [hx, hy] = s.hip;
  const rows = hy - sy;
  for (let r = 0; r <= rows; r++) {
    const t = r / rows;
    const cx = Math.round(sx + (hx - sx) * t);
    const half = Math.round(6 - t * 1);
    for (let x = -half; x <= half; x++) {
      const back = x < -half + 3;
      const color = st.torso ? st.torso(x, r, rows, back) : back ? st.topS : st.top;
      if (color) g.px(cx + x, sy + r, color);
    }
  }
}

function drawEye(g, x, y, face) {
  if (face === 'hurt') {
    g.px(x - 1, y, EYE);
    g.px(x, y + 1, EYE);
    g.px(x + 1, y, EYE);
    return;
  }
  if (face === 'happy') {
    g.px(x - 1, y + 1, EYE);
    g.px(x, y, EYE);
    g.px(x + 1, y + 1, EYE);
    return;
  }
  g.rect(x, y - 1, 2, 3, EYE);
  g.px(x, y - 1, WHITE);
  if (face === 'grit') g.rect(x - 1, y - 2, 3, 1, EYE);
}

function drawHead(g, s, st, face) {
  const x0 = s.headX - 6;
  const y0 = s.headTop;
  g.round(x0, y0, 13, 12, st.skin);
  g.rect(x0 + 1, y0 + 11, 11, 1, st.skinS);
  g.rect(x0, y0 + 6, 2, 3, st.skinS); // orelha
  drawEye(g, s.headX + 1, y0 + 6, face);
  drawEye(g, s.headX + 4, y0 + 6, face);
  const mx = s.headX + 3;
  const my = y0 + 9;
  if (face === 'hurt' || face === 'grit') g.rect(mx - 1, my, 3, 1, EYE);
  else if (face === 'shout') {
    g.rect(mx - 1, my - 1, 3, 2, '#7a1f2b');
    g.rect(mx - 1, my - 1, 3, 1, WHITE);
  } else if (face === 'happy') {
    g.rect(mx - 1, my - 1, 4, 2, '#7a1f2b');
    g.rect(mx - 1, my - 1, 4, 1, WHITE);
  } else g.rect(mx, my, 2, 1, '#a24a4a');
  return { x0, y0 };
}

export function paintFrame(st, pose) {
  const buf = new PixelBuffer(FRAME_W, FRAME_H);
  const g = painter(buf);
  const s = skeleton(pose);
  const head = { x0: s.headX - 6, y0: s.headTop };

  if (st.behind) st.behind(g, s, pose, head);
  drawArm(g, s, st, 'back', pose.arms.back, true);
  drawLeg(g, s, st, 'back', pose.legs.back, true);
  drawTorso(g, s, st);
  drawLeg(g, s, st, 'front', pose.legs.front, false);
  if (st.waist) st.waist(g, s, pose);
  drawHead(g, s, st, pose.face);
  if (st.hair) st.hair(g, s, pose, head);
  if (st.face) st.face(g, s, pose, head);
  if (st.beforeFrontArm) st.beforeFrontArm(g, s, pose);
  drawArm(g, s, st, 'front', pose.arms.front, false);
  if (st.front) st.front(g, s, pose, head);
  buf.outline(OUTLINE);
  return buf;
}

// ---------------------------------------------------------------- estilos

const SKIN = { skin: '#f6c9a0', skinS: '#d9946b' };

const luffy = {
  ...SKIN,
  top: '#d8323f',
  topS: '#a3202f',
  sleeve: '#d8323f',
  sleeveS: '#a3202f',
  pants: '#3f74cc',
  pantsS: '#2b5199',
  cuff: '#e9edf5',
  shin: 'skin',
  shoes: '#9a6634',
  shoesS: '#6e4522',
  // colete aberto: peito à mostra com a cicatriz em X e faixa amarela na cintura
  torso(x, r, rows, back) {
    if (r >= rows - 2) return x < -3 ? '#c9a22c' : '#f1cd45';
    if (x >= 0 && x <= 4 && r >= 2) {
      if ((r === 4 && (x === 1 || x === 3)) || (r === 5 && x === 2) || (r === 6 && (x === 1 || x === 3))) return '#c0666a';
      return x === 4 ? SKIN.skinS : SKIN.skin;
    }
    return back ? this.topS : this.top;
  },
  hair(g, s, pose, h) {
    const hair = '#1d1a2b';
    g.rect(h.x0 - 1, h.y0 + 1, 4, 7, hair); // nuca
    g.rect(h.x0, h.y0 + 2, 13, 2, hair);
    g.px(h.x0 + 8, h.y0 + 4, hair);
    g.px(h.x0 + 11, h.y0 + 4, hair);
    g.px(h.x0 - 1, h.y0 + 8, hair);
    // chapéu de palha
    g.round(h.x0 + 1, h.y0 - 4, 11, 5, '#f2cc4f');
    g.rect(h.x0 + 1, h.y0 - 4, 3, 5, '#d6a832');
    g.rect(h.x0 + 1, h.y0 - 1, 11, 2, '#cf2f35');
    g.rect(h.x0 - 3, h.y0 + 1, 19, 2, '#f2cc4f');
    g.rect(h.x0 - 3, h.y0 + 2, 19, 1, '#d6a832');
    g.px(h.x0 + 6, h.y0 - 3, '#fff1a8');
    g.px(h.x0 + 8, h.y0 - 3, '#fff1a8');
  },
  face(g, s, pose, h) {
    // cicatriz sob o olho
    g.px(s.headX + 4, h.y0 + 8, '#b4525a');
    g.px(s.headX + 5, h.y0 + 8, '#b4525a');
  },
};

const zoroSwords = (g, s, pose) => {
  if (pose.attack) return;
  // três katanas na cintura, inclinadas para trás: Wado (branca), Sandai e Shusui
  const [hx, hy] = s.hip;
  const sheath = (dy, color, hilt) => {
    g.line([hx - 1, hy - 3 + dy], [hx - 11, hy + 2 + dy], color, 1);
    g.line([hx + 1, hy - 4 + dy], [hx + 3, hy - 5 + dy], hilt, 1);
    g.px(hx, hy - 4 + dy, '#e9c94b');
  };
  sheath(0, '#2c2c3a', '#8c2333');
  sheath(2, '#7a1d2a', '#2c2c3a');
  sheath(-2, '#f4f4f7', '#f4f4f7');
};

const zoro = {
  skin: '#eab68a',
  skinS: '#c88a5e',
  top: '#f3f4f7',
  topS: '#c7ccd8',
  sleeve: '#f3f4f7',
  sleeveS: '#c7ccd8',
  pants: '#2d2d3b',
  pantsS: '#1f1f2a',
  shin: 'pants',
  shoes: '#18161f',
  shoesS: '#100e15',
  torso(x, r, rows, back) {
    if (r >= rows - 4) return back ? '#2e7a3c' : '#3f9a4c'; // haramaki
    return back ? this.topS : this.top;
  },
  armExtra(g, side, arm, shade) {
    // bandana preta no braço de trás
    if (side === 'back') g.rect(arm.elbow[0] - 1, arm.elbow[1] - 3, 3, 2, '#22202a');
  },
  behind: zoroSwords,
  hair(g, s, pose, h) {
    const hair = '#4cb84a';
    const dark = '#2f8a35';
    g.rect(h.x0, h.y0 - 1, 13, 4, hair);
    g.rect(h.x0 - 1, h.y0 + 1, 4, 6, dark);
    for (let i = 0; i < 13; i += 2) g.px(h.x0 + i, h.y0 - 2, hair);
    g.rect(h.x0 + 1, h.y0 + 3, 3, 1, dark);
    g.rect(h.x0 + 4, h.y0, 5, 1, '#9ff09a');
    // brincos dourados
    g.px(h.x0, h.y0 + 9, '#f2cf4a');
    g.px(h.x0, h.y0 + 10, '#f2cf4a');
  },
  front(g, s, pose, h) {
    const a = pose.attack;
    if (!a) return;
    // espada na boca
    g.line([s.headX + 3, h.y0 + 9], [s.headX + 15, h.y0 + 9], '#dfe8f2', 1);
    g.rect(s.headX + 2, h.y0 + 9, 3, 1, '#fdfdfd');
    // espadas nas mãos
    const blade = (hand, len, dir) => {
      g.rect(hand[0] - 1, hand[1] - 1, 3, 3, '#1f1d26');
      g.line([hand[0], hand[1]], [hand[0] + dir[0] * len, hand[1] + dir[1] * len], '#e6eef7', 1);
      g.line([hand[0], hand[1] + 1], [hand[0] + dir[0] * (len - 1), hand[1] + 1 + dir[1] * (len - 1)], '#9fb1c6', 1);
    };
    blade(pose.arms.front.hand, 15, a.bladeFront);
    blade(pose.arms.back.hand, 13, a.bladeBack);
  },
};

const sanji = {
  ...SKIN,
  top: '#26252f',
  topS: '#17161e',
  sleeve: '#26252f',
  sleeveS: '#17161e',
  longSleeve: true,
  pants: '#26252f',
  pantsS: '#17161e',
  shin: 'pants',
  shoes: '#0f0e14',
  shoesS: '#0b0a0f',
  torso(x, r, rows, back) {
    // camisa azul e gravata no V do paletó
    if (r <= 7 && x >= 0 && x <= 3) {
      if (x === 1 || x === 2) return r > 1 ? '#121119' : '#4a7ed8';
      return '#4a7ed8';
    }
    return back ? this.topS : this.top;
  },
  hair(g, s, pose, h) {
    const hair = '#f7d64c';
    const dark = '#cfa92c';
    g.rect(h.x0, h.y0 - 1, 13, 4, hair);
    g.rect(h.x0 - 1, h.y0 + 1, 4, 7, dark);
    // franja cobrindo um olho
    g.rect(s.headX + 3, h.y0 + 2, 5, 6, hair);
    g.rect(s.headX + 6, h.y0 + 3, 2, 6, dark);
    g.px(h.x0 + 2, h.y0 - 2, hair);
    g.px(h.x0 + 6, h.y0 - 2, hair);
    g.rect(h.x0 + 3, h.y0, 4, 1, '#fff8c8');
  },
  face(g, s, pose, h) {
    // sobrancelha enrolada
    g.px(s.headX + 1, h.y0 + 3, EYE);
    g.px(s.headX + 2, h.y0 + 3, EYE);
    g.px(s.headX + 2, h.y0 + 4, EYE);
    // cigarro
    if (pose.face !== 'hurt') {
      g.rect(s.headX + 5, h.y0 + 9, 3, 1, '#f4f1e8');
      g.px(s.headX + 8, h.y0 + 9, '#ff7a2a');
    }
  },
};

const namiHairBack = (g, s, pose, h) => {
  g.rect(h.x0 - 2, h.y0 + 1, 7, 19, '#e9832c');
  g.rect(h.x0 - 2, h.y0 + 6, 3, 14, '#c5641c');
  g.px(h.x0 - 1, h.y0 + 20, '#e9832c');
  g.px(h.x0 + 2, h.y0 + 20, '#e9832c');
};

const nami = {
  ...SKIN,
  top: '#fbfbfb',
  topS: '#d3d9e6',
  pants: '#3a5fae',
  pantsS: '#2a4583',
  shin: 'boots',
  boots: '#8b5a34',
  bootsS: '#6a4124',
  shoes: '#8b5a34',
  shoesS: '#6a4124',
  torso(x, r, rows, back) {
    if (r >= rows - 3) {
      if (r >= rows - 1) return back ? this.pantsS : this.pants;
      return back ? SKIN.skinS : SKIN.skin; // barriga
    }
    const stripe = r % 3 === 1;
    if (stripe) return back ? '#2a4f9e' : '#3a6ad0';
    return back ? this.topS : this.top;
  },
  behind: (g, s, pose) => namiHairBack(g, s, pose, { x0: s.headX - 6, y0: s.headTop }),
  hair(g, s, pose, h) {
    const hair = '#f08f33';
    const dark = '#c5641c';
    g.rect(h.x0, h.y0 - 1, 13, 4, hair);
    g.rect(h.x0 - 1, h.y0 + 1, 5, 9, hair);
    g.rect(h.x0 - 1, h.y0 + 5, 2, 5, dark);
    g.rect(h.x0 + 8, h.y0 + 2, 3, 2, hair);
    g.px(h.x0 + 11, h.y0 + 2, hair);
    g.px(h.x0 + 5, h.y0 + 3, hair);
    g.px(h.x0 + 3, h.y0, '#ffc27a');
    g.px(h.x0 + 6, h.y0, '#ffc27a');
  },
  front(g, s, pose) {
    // Clima-Tact: bastão azul na mão da frente
    const hand = pose.arms.front.hand;
    const dir = pose.attack ? pose.attack.staff : [1, -2];
    const len = 7;
    const end = [hand[0] + dir[0] * len, hand[1] + dir[1] * len];
    const start = [hand[0] - dir[0] * 3, hand[1] - dir[1] * 3];
    g.line(start, end, '#5aaee8', 2);
    g.px(end[0], end[1], '#d9f1ff');
    g.px(hand[0], hand[1], '#2f6fa8');
    g.rect(hand[0] - 1, hand[1] - 1, 3, 3, SKIN.skin);
  },
};

export const STYLES = { luffy, zoro, sanji, nami };

// ---------------------------------------------------------------- ataques

// cada ataque tem 3 quadros: preparação, golpe e recuperação
export const ATTACK_POSES = {
  luffy: [
    (p) => {
      p.lean = -2;
      p.arms.front = { elbow: [0, -22], hand: [-6, -24] };
      p.face = 'grit';
    },
    (p) => {
      p.lean = 2;
      p.legs.front = { knee: [5, -7], foot: [7, 0] };
      p.legs.back = { knee: [-4, -7], foot: [-7, 0] };
      p.arms.front = { elbow: [10, -24], hand: [16, -24] };
      p.face = 'shout';
      p.attack = { stretch: true };
    },
    (p) => {
      p.arms.front = { elbow: [9, -22], hand: [12, -20] };
    },
  ],
  zoro: [
    (p) => {
      p.lean = -1;
      p.arms.front = { elbow: [2, -27], hand: [-3, -31] };
      p.arms.back = { elbow: [-5, -26], hand: [-8, -30] };
      p.face = 'grit';
      p.attack = { bladeFront: [-1, -1], bladeBack: [-1, -1] };
    },
    (p) => {
      p.lean = 2;
      p.legs.front = { knee: [6, -7], foot: [8, 0] };
      p.legs.back = { knee: [-5, -6], foot: [-8, 0] };
      p.arms.front = { elbow: [9, -23], hand: [14, -21] };
      p.arms.back = { elbow: [7, -21], hand: [12, -17] };
      p.face = 'grit';
      p.attack = { bladeFront: [1, 0], bladeBack: [1, 0.3] };
    },
    (p) => {
      p.arms.front = { elbow: [8, -20], hand: [11, -16] };
      p.arms.back = { elbow: [5, -19], hand: [8, -14] };
      p.attack = { bladeFront: [1, 1], bladeBack: [1, 1.2] };
    },
  ],
  sanji: [
    (p) => {
      p.lean = -2;
      p.legs.front = { knee: [5, -15], foot: [4, -9] };
      p.arms.front = { elbow: [4, -19], hand: [2, -15] };
      p.arms.back = { elbow: [-5, -19], hand: [-3, -15] };
    },
    (p) => {
      p.lean = -4;
      p.hip = [-1, -15];
      p.legs.front = { knee: [7, -19], foot: [15, -24] };
      p.legs.back = { knee: [-2, -7], foot: [-3, 0] };
      p.arms.front = { elbow: [2, -19], hand: [0, -15] };
      p.arms.back = { elbow: [-6, -19], hand: [-4, -15] };
      p.face = 'grit';
      p.attack = { flame: true };
    },
    (p) => {
      p.legs.front = { knee: [6, -9], foot: [7, -2] };
    },
  ],
  nami: [
    (p) => {
      p.arms.front = { elbow: [5, -30], hand: [4, -36] };
      p.attack = { staff: [1, -1] };
    },
    (p) => {
      p.lean = 1;
      p.legs.front = { knee: [5, -7], foot: [7, 0] };
      p.arms.front = { elbow: [10, -25], hand: [14, -25] };
      p.face = 'shout';
      p.attack = { staff: [1, 0] };
    },
    (p) => {
      p.arms.front = { elbow: [8, -21], hand: [10, -18] };
      p.attack = { staff: [1, -1] };
    },
  ],
};

// ---------------------------------------------------------------- montagem

const ANIMS = { idle: 4, walk: 6, jump: 2, block: 1, hurt: 1, win: 2 };

// devolve { anim: [PixelBuffer, ...] } para um personagem, olhando para a direita
export function buildFrames(id) {
  const st = STYLES[id];
  const out = {};
  for (const [name, count] of Object.entries(ANIMS)) {
    out[name] = Array.from({ length: count }, (_, i) => paintFrame(st, POSES[name](i)));
  }
  out.attack = ATTACK_POSES[id].map((tweak) => {
    const p = basePose();
    tweak(p);
    return paintFrame(st, p);
  });
  out.ko = [out.hurt[0].rotatedLeft()];
  return out;
}
