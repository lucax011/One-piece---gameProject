// Fluxo do jogo: título → escolha de personagens → cenário → luta (melhor de 3) → resultado.
// A lógica roda em passos fixos de 1/60 s; o desenho acompanha o requestAnimationFrame.

import { CHARACTERS, ROSTER } from './characters.js';
import { STAGES, WIDTH, HEIGHT, GROUND_Y } from './pixel/stages-art.js';
import { World } from './world.js';
import { roundWinner, matchWinner } from './combat.js';
import { cpuInput } from './ai.js';
import { Keyboard, KEYS } from './input.js';
import * as audio from './audio.js';
import { Renderer, present, text, panel, portrait, banner, drawHud, drawPose, stageCanvas, FONT } from './render.js';

const STEP = 1 / 60;
const STAGE_IDS = Object.keys(STAGES);
const CONFIRM = ['Enter', 'Space'];
const ANY_ATTACK = [KEYS[0].attack, ...KEYS[1].attack];
const RED = '#e8433a';
const BLUE = '#3a8fd9';
const GOLD = '#ffd23f';

const ctx = document.getElementById('screen').getContext('2d');
const scene = document.createElement('canvas');
scene.width = WIDTH;
scene.height = HEIGHT;
const sctx = scene.getContext('2d');
const gifs = [...document.querySelectorAll('.gif')];
const keys = new Keyboard(window);
const fx = new Renderer();
const sfx = audio.sfx;

const game = {
  screen: 'title',
  t: 0,
  idle: 0,
  mode: 0, // 0 = 1 jogador contra a CPU, 1 = 2 jogadores
  pick: [0, 1],
  locked: [false, false],
  cpuPick: 0,
  stage: 0,
  match: null,
  paused: false,
};

keys.onPress((code) => {
  audio.unlock();
  if (code === 'KeyM') audio.toggleMute();
});

function go(screen) {
  game.screen = screen;
  game.t = 0;
  game.idle = 0;
}

// ---------- partida ----------

function startMatch({ demo = false } = {}) {
  game.match = {
    ids: [ROSTER[game.pick[0]], ROSTER[game.pick[1]]],
    stage: STAGE_IDS[game.stage],
    wins: [0, 0],
    round: 1,
    cpu: demo ? [true, true] : [false, game.mode === 0],
    demo,
  };
  game.paused = false;
  startRound();
  go('fight');
}

function startDemo() {
  game.pick = [Math.floor(Math.random() * 4), Math.floor(Math.random() * 4)];
  game.stage = Math.floor(Math.random() * STAGE_IDS.length);
  startMatch({ demo: true });
}

function startRound() {
  const m = game.match;
  m.world = new World(CHARACTERS[m.ids[0]], CHARACTERS[m.ids[1]], GROUND_Y);
  m.phase = 'intro';
  m.phaseTime = 0;
  m.trail = m.world.fighters.map((f) => f.hp);
  m.hold = [0, 0];
  m.callout = [null, null];
  m.mem = [{}, {}];
  m.hitstop = 0;
  m.slow = 0;
  m.result = null;
  m.cheered = false;
  fx.reset();
  sfx.round();
}

function handleEvents(m, events) {
  const [a, b] = m.world.fighters;
  for (const e of events) {
    if (e.type === 'hit') {
      sfx.hit(e.blocked);
      m.hitstop = e.ko ? 0.22 : e.blocked ? 0.04 : 0.07;
      m.hold[e.target === a ? 0 : 1] = 0.45;
      if (e.ko) {
        m.slow = 1.1;
        sfx.ko();
      }
    } else if (e.type === 'swing') {
      sfx.swing(e.owner.data.attack.kind);
      m.callout[e.owner === a ? 0 : 1] = { name: e.owner.data.attack.name, t: 0.9 };
    } else if (e.type === 'projectile') sfx.thunder();
    else if (e.type === 'jump') sfx.jump();
    else if (e.type === 'land') sfx.land();
  }
  void b;
  fx.onEvents(events);
}

function updateFight(dt) {
  const m = game.match;
  if (m.demo) {
    if (keys.pressed.size) return go('title');
  } else if (keys.hit('Escape') && m.phase !== 'end') {
    game.paused = !game.paused;
    sfx.back();
  }
  if (game.paused) {
    if (keys.hit('KeyQ')) {
      game.paused = false;
      go('title');
    }
    return;
  }

  const w = m.world;
  m.phaseTime += dt;
  if (m.phase === 'intro' && m.phaseTime > 1.4) {
    m.phase = 'go';
    m.phaseTime = 0;
    w.running = true;
    sfx.go();
  } else if (m.phase === 'go' && m.phaseTime > 0.8) {
    m.phase = 'fight';
    m.phaseTime = 0;
  }

  const inputs = w.fighters.map((f, i) => (m.cpu[i] ? cpuInput(f, w.fighters[1 - i], dt, m.mem[i]) : keys.fighter(i)));
  if (m.hitstop > 0) m.hitstop -= dt;
  else {
    const scale = m.slow > 0 ? 0.35 : 1;
    m.slow -= dt;
    handleEvents(m, w.step(dt * scale, inputs));
    fx.update(dt * scale, w.fighters);
  }

  w.fighters.forEach((f, i) => {
    if (m.hold[i] > 0) m.hold[i] -= dt;
    else m.trail[i] = Math.max(f.hp, m.trail[i] - f.maxHp * 0.5 * dt);
    if (m.callout[i] && (m.callout[i].t -= dt) <= 0) m.callout[i] = null;
  });

  if ((m.phase === 'go' || m.phase === 'fight') && (w.ko || w.timeLeft <= 0)) {
    w.running = false;
    const [a, b] = w.fighters;
    const winner = w.ko ? (a.hp > 0 ? 0 : b.hp > 0 ? 1 : null) : roundWinner(a.hp / a.maxHp, b.hp / b.maxHp);
    m.result = { winner, ko: w.ko };
    if (winner !== null) m.wins[winner]++;
    m.phase = 'end';
    m.phaseTime = 0;
    if (!w.ko) sfx.bell();
  }
  if (m.phase === 'end') {
    if (!m.cheered && m.phaseTime > 1.2) {
      m.cheered = true;
      if (m.result.winner !== null) {
        w.fighters[m.result.winner].setState('win');
        sfx.win();
      }
    }
    if (m.phaseTime > 3.6) {
      m.champion = matchWinner(m.wins);
      if (m.champion !== null) go('result');
      else {
        m.round++;
        startRound();
      }
    }
  }
}

// ---------- menus ----------

function updateTitle(dt) {
  game.idle += dt;
  if (keys.hit([KEYS[0].up, KEYS[0].down, KEYS[1].up, KEYS[1].down])) {
    game.mode = 1 - game.mode;
    game.idle = 0;
    sfx.move();
  }
  if (keys.hit([...CONFIRM, ...ANY_ATTACK])) {
    sfx.confirm();
    game.locked = [false, false];
    game.cpuPick = 0;
    go('select');
  } else if (game.idle > 20) startDemo();
}

function updateSelect(dt) {
  const humans = game.mode === 0 ? 1 : 2;
  for (let i = 0; i < humans; i++) {
    if (game.locked[i]) continue;
    const k = KEYS[i];
    let p = game.pick[i];
    if (keys.hit([k.left, k.right])) p ^= 1;
    if (keys.hit([k.up, k.down])) p ^= 2;
    if (p !== game.pick[i]) {
      game.pick[i] = p;
      sfx.move();
    }
    const enter = keys.hit(CONFIRM) && (humans === 1 || i === 1);
    if (keys.hit(k.attack) || enter) {
      game.locked[i] = true;
      sfx.confirm();
    }
  }
  // a CPU "pensa" um pouco antes de escolher
  if (humans === 1 && game.locked[0] && !game.locked[1]) {
    game.cpuPick += dt;
    if (Math.floor(game.cpuPick / 0.09) !== Math.floor((game.cpuPick - dt) / 0.09)) {
      game.pick[1] = (game.pick[1] + 1) % ROSTER.length;
      sfx.move();
    }
    if (game.cpuPick > 0.9) {
      game.pick[1] = Math.floor(Math.random() * ROSTER.length);
      game.locked[1] = true;
      sfx.confirm();
    }
  }
  if (keys.hit('Escape')) {
    sfx.back();
    if (game.locked.some(Boolean)) {
      game.locked = [false, false];
      game.cpuPick = 0;
    } else go('title');
  }
  if (game.locked[0] && game.locked[1]) {
    game.idle += dt;
    if (game.idle > 0.7) go('stage');
  }
}

function updateStage() {
  const all = [KEYS[0].left, KEYS[0].right, KEYS[1].left, KEYS[1].right];
  if (keys.hit(all)) {
    game.stage = (game.stage + 1) % STAGE_IDS.length;
    sfx.move();
  }
  if (keys.hit([...CONFIRM, ...ANY_ATTACK])) {
    sfx.confirm();
    startMatch();
  } else if (keys.hit('Escape')) {
    sfx.back();
    game.locked = [false, false];
    game.cpuPick = 0;
    go('select');
  }
}

function updateResult() {
  const m = game.match;
  if (m.demo) {
    if (game.t > 6 || keys.pressed.size) go('title');
    return;
  }
  if (game.t > 0.8 && keys.hit([...CONFIRM, ...ANY_ATTACK])) {
    sfx.confirm();
    startMatch();
  } else if (keys.hit('Escape')) {
    sfx.back();
    game.locked = [false, false];
    game.cpuPick = 0;
    go('select');
  }
}

function update(dt) {
  game.t += dt;
  if (game.screen === 'fight') return updateFight(dt);
  fx.update(dt);
  if (game.screen === 'title') updateTitle(dt);
  else if (game.screen === 'select') updateSelect(dt);
  else if (game.screen === 'stage') updateStage();
  else if (game.screen === 'result') updateResult();
}

// ---------- desenho ----------

function showGif(i, id, slot) {
  const el = gifs[i];
  const src = id ? encodeURI(CHARACTERS[id].gif) : '';
  if (el.dataset.src !== src) {
    el.dataset.src = src;
    if (src) el.src = src;
    else el.removeAttribute('src');
  }
  el.hidden = !id;
  el.className = `gif ${slot}`;
}

const blink = (rate = 2) => Math.floor(performance.now() / (500 / rate)) % 2 === 0;

function dim(c, alpha) {
  c.fillStyle = `rgba(14, 10, 22, ${alpha})`;
  c.fillRect(0, 0, c.canvas.width, c.canvas.height);
}

function renderTitle() {
  sctx.drawImage(stageCanvas('merry'), 0, 0);
  fx.drawAmbient(sctx, 'merry');
  [['zoro', 70], ['luffy', 122], ['nami', 198], ['sanji', 250]].forEach(([id, x], i) => {
    drawPose(sctx, id, 'idle', game.t + i * 0.3, x, GROUND_Y, x < 160 ? 1 : -1);
  });
  present(ctx, scene);
  ctx.fillStyle = 'rgba(27, 20, 36, 0.62)';
  ctx.fillRect(0, 36, 1280, 280);
  text(ctx, 'ONE PIECE', 640, 64, 72, GOLD, 'center', 16);
  text(ctx, 'LUTA NO GRAND LINE', 640, 160, 16, '#f4ecd8');
  ['1 JOGADOR  x  CPU', '2 JOGADORES'].forEach((label, i) => {
    const on = game.mode === i;
    text(ctx, (on ? '> ' : '  ') + label, 640, 204 + i * 36, 16, on ? GOLD : '#9c8fae');
  });
  if (blink()) text(ctx, 'APERTE ENTER', 640, 284, 12, '#ffffff');
  text(ctx, 'M: SOM   ESC: PAUSA', 640, 692, 10, '#f4ecd8');
}

function statBar(x, y, label, value, max, color) {
  text(ctx, label, x, y, 8, '#f4ecd8', 'left');
  ctx.fillStyle = '#1b1424';
  ctx.fillRect(x + 112, y - 2, 196, 12);
  ctx.fillStyle = color;
  ctx.fillRect(x + 114, y, Math.round((192 * value) / max), 8);
}

function renderSelect() {
  const humans = game.mode === 0 ? 1 : 2;
  sctx.drawImage(stageCanvas('wano'), 0, 0);
  fx.drawAmbient(sctx, 'wano');
  dim(sctx, 0.55);
  game.pick.forEach((p, i) => {
    const id = ROSTER[p];
    drawPose(sctx, id, game.locked[i] ? 'win' : 'idle', game.t, i ? 178 : 142, 166, i ? -1 : 1);
  });
  present(ctx, scene);
  text(ctx, 'ESCOLHA SEU PIRATA', 640, 28, 24, GOLD, 'center', 8);

  game.pick.forEach((p, i) => {
    const c = CHARACTERS[ROSTER[p]];
    const x = i ? 880 : 48;
    const cx = x + 176;
    panel(ctx, x, 104, 352, 352, '#000', i ? BLUE : RED);
    const tag = i === 0 ? '1P' : humans === 1 ? 'CPU' : '2P';
    text(ctx, tag, i ? x + 352 : x, 72, 12, i ? BLUE : RED, i ? 'right' : 'left');
    text(ctx, c.short, cx, 480, 20, '#ffffff');
    text(ctx, c.attack.name.toUpperCase(), cx, 514, 8, GOLD);
    statBar(x + 16, 548, 'VIDA', c.hp, 110, '#7be08a');
    statBar(x + 16, 572, 'VELOCIDADE', c.speed, 74, '#7fd3ff');
    statBar(x + 16, 596, 'PULO', c.jump, 270, '#ffb35c');
    if (game.locked[i]) text(ctx, 'PRONTO!', cx, 628, 12, GOLD);
  });

  ROSTER.forEach((id, idx) => {
    const x = 520 + (idx & 1) * 128;
    const y = 120 + (idx >> 1) * 128;
    panel(ctx, x, y, 112, 112, CHARACTERS[id].color);
    portrait(ctx, id, x, y, 112);
    game.pick.forEach((p, i) => {
      if (p !== idx) return;
      const inset = i === 0 ? -14 : -20;
      if (i === 1 && game.pick[0] === idx) {
        ctx.strokeStyle = BLUE;
        ctx.lineWidth = 6;
        ctx.strokeRect(x + inset + 3, y + inset + 3, 112 - 2 * inset - 6, 112 - 2 * inset - 6);
        return;
      }
      if (game.locked[i] || blink(3)) {
        ctx.strokeStyle = i ? BLUE : RED;
        ctx.lineWidth = 6;
        ctx.strokeRect(x - 11, y - 11, 134, 134);
      }
    });
  });
  text(ctx, 'VS', 640, 396, 32, '#ffffff', 'center', 8);
  const help = humans === 1 ? 'A D W S  ESCOLHE   F  CONFIRMA   ESC  VOLTA' : '1P: A D W S + F     2P: SETAS + 0     ESC VOLTA';
  text(ctx, help, 640, 696, 8, '#f4ecd8');
}

function renderStage() {
  const id = STAGE_IDS[game.stage];
  sctx.drawImage(stageCanvas(id), 0, 0);
  fx.drawAmbient(sctx, id);
  drawPose(sctx, ROSTER[game.pick[0]], 'idle', game.t, 110, GROUND_Y, 1);
  drawPose(sctx, ROSTER[game.pick[1]], 'idle', game.t + 0.4, 210, GROUND_Y, -1);
  present(ctx, scene);
  ctx.fillStyle = 'rgba(27, 20, 36, 0.6)';
  ctx.fillRect(0, 20, 1280, 64);
  text(ctx, 'ESCOLHA O CENÁRIO', 640, 40, 24, GOLD, 'center', 8);
  banner(ctx, STAGES[id].name.toUpperCase(), STAGES[id].subtitle.toUpperCase(), '#ffffff');
  if (blink()) {
    text(ctx, '<', 96, 336, 48, GOLD, 'center', 10);
    text(ctx, '>', 1184, 336, 48, GOLD, 'center', 10);
  }
  text(ctx, 'ENTER, F OU 0 PARA LUTAR', 640, 692, 10, '#f4ecd8');
}

function renderFight() {
  const m = game.match;
  fx.drawScene(sctx, m.stage, m.world);
  present(ctx, scene, fx.shakeOffset());
  drawHud(ctx, m.world, m.wins, m.trail);
  m.callout.forEach((c, i) => {
    if (!c) return;
    const left = i === 0;
    text(ctx, c.name.toUpperCase() + '!', left ? 112 : 1168, 108, 12, m.world.fighters[i].data.color, left ? 'left' : 'right', 6);
  });

  const w = m.world;
  if (m.phase === 'intro') {
    const final = m.wins[0] === 1 && m.wins[1] === 1;
    banner(ctx, final ? 'ROUND FINAL' : `ROUND ${m.round}`, `${w.fighters[0].data.short}  x  ${w.fighters[1].data.short}`);
  } else if (m.phase === 'go') banner(ctx, 'LUTE!', null, '#ff8a1f');
  else if (m.phase === 'end') {
    const r = m.result;
    if (m.phaseTime < 1.2) banner(ctx, r.ko ? 'K.O.!' : 'TEMPO!', null, RED);
    else if (r.winner === null) banner(ctx, 'EMPATE', 'NINGUÉM PONTUA');
    else banner(ctx, `${w.fighters[r.winner].data.short} VENCE`, `PLACAR ${m.wins[0]} x ${m.wins[1]}`);
  }
  if (m.demo && blink(1)) text(ctx, 'DEMONSTRAÇÃO  -  APERTE UMA TECLA', 640, 692, 10, '#ffffff');
  if (game.paused) {
    dim(ctx, 0.5);
    banner(ctx, 'PAUSA', 'ESC CONTINUA   ·   Q SAI PARA O MENU', '#ffffff');
  }
}

function renderResult() {
  const m = game.match;
  const win = m.champion;
  const winner = CHARACTERS[m.ids[win]];
  sctx.drawImage(stageCanvas(m.stage), 0, 0);
  fx.drawAmbient(sctx, m.stage);
  dim(sctx, 0.35);
  drawPose(sctx, m.ids[win], 'win', game.t, 186, GROUND_Y, 1);
  drawPose(sctx, m.ids[1 - win], 'ko', 0, 262, GROUND_Y, -1);
  present(ctx, scene);
  panel(ctx, 48, 104, 352, 352, '#000', win ? BLUE : RED);
  ctx.fillStyle = 'rgba(27, 20, 36, 0.72)';
  ctx.fillRect(520, 92, 640, m.demo ? 180 : 276);
  text(ctx, 'VITÓRIA!', 840, 112, 48, GOLD, 'center', 12);
  text(ctx, winner.name.toUpperCase(), 840, 196, 16, '#ffffff');
  const who = win === 0 ? '1P' : m.cpu[1] ? 'CPU' : '2P';
  text(ctx, `${who} VENCE ${m.wins[0]} x ${m.wins[1]}`, 840, 236, 12, win ? BLUE : RED);
  if (m.demo) return;
  if (blink()) text(ctx, 'ENTER  REVANCHE', 840, 296, 12, '#ffffff');
  text(ctx, 'ESC  TROCAR LUTADORES', 840, 328, 12, '#9c8fae');
}

function render() {
  const s = game.screen;
  if (s === 'title') renderTitle();
  else if (s === 'select') renderSelect();
  else if (s === 'stage') renderStage();
  else if (s === 'fight') renderFight();
  else if (s === 'result') renderResult();
  // GIFs dos personagens do anime ficam por cima do canvas, em molduras
  if (s === 'select') {
    showGif(0, ROSTER[game.pick[0]], 'p1');
    showGif(1, ROSTER[game.pick[1]], 'p2');
  } else if (s === 'result') {
    showGif(0, game.match.ids[game.match.champion], 'p1');
    showGif(1, null, 'p2');
  } else {
    showGif(0, null, 'p1');
    showGif(1, null, 'p2');
  }
}

// ---------- laço principal ----------

let acc = 0;
let last = performance.now();
function frame(now) {
  acc += Math.min(0.25, (now - last) / 1000);
  last = now;
  while (acc >= STEP) {
    update(STEP);
    keys.endStep();
    acc -= STEP;
  }
  render();
  requestAnimationFrame(frame);
}

// atalhos de desenvolvimento: ?tela=demo | select | stage | result, e &avancar=segundos
function devShortcut() {
  const params = new URLSearchParams(location.search);
  const start = params.get('tela');
  if (start === 'demo') startDemo();
  else if (start === 'select' || start === 'stage') go(start);
  else if (start === 'result') {
    startMatch();
    game.match.wins = [2, 1];
    game.match.champion = 0;
    go('result');
  }
  const ahead = Number(params.get('avancar')) || 0;
  for (let i = 0; i < ahead / STEP; i++) update(STEP);
}

const fontReady = document.fonts ? document.fonts.load(`16px ${FONT}`) : Promise.resolve();
Promise.race([fontReady, new Promise((r) => setTimeout(r, 1500))])
  .catch(() => {})
  .then(() => {
    devShortcut();
    requestAnimationFrame(frame);
  });
