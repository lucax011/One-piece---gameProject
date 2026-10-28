// Efeitos sonoros sintetizados com WebAudio: nenhum arquivo de áudio.
// O navegador só libera o som depois de uma tecla, por isso `unlock()`.

let ctx = null;
let master = null;
let noiseBuf = null;
let muted = false;
const VOLUME = 0.45;

export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : VOLUME;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : VOLUME;
  return muted;
}

export const isMuted = () => muted;

function env(g, t, vol, dur, attack = 0.005) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

function tone({ type = 'square', freq, to = freq, dur = 0.15, vol = 0.2, delay = 0 }) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(to, t + dur);
  env(g, t, vol, dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise({ dur = 0.2, vol = 0.3, type = 'bandpass', freq = 1200, to = freq, q = 1, delay = 0 }) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ctx.createGain();
  env(g, t, vol, dur);
  src.connect(f).connect(g).connect(master);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.02);
}

export const sfx = {
  move: () => tone({ freq: 660, dur: 0.05, vol: 0.08 }),
  confirm: () => {
    tone({ freq: 523, dur: 0.08, vol: 0.12 });
    tone({ freq: 784, dur: 0.14, vol: 0.12, delay: 0.07 });
  },
  back: () => tone({ freq: 400, to: 260, dur: 0.12, vol: 0.1 }),
  jump: () => tone({ freq: 240, to: 520, dur: 0.12, vol: 0.06 }),
  land: () => noise({ dur: 0.08, vol: 0.12, type: 'lowpass', freq: 400 }),
  swing(kind) {
    if (kind === 'stretch') {
      // braço de borracha: "boing" subindo
      tone({ type: 'sine', freq: 180, to: 720, dur: 0.22, vol: 0.22 });
      noise({ dur: 0.15, vol: 0.12, freq: 800, to: 2400 });
    } else if (kind === 'slash') {
      noise({ dur: 0.18, vol: 0.25, type: 'highpass', freq: 2500, to: 6000 });
      tone({ type: 'triangle', freq: 1900, to: 1700, dur: 0.3, vol: 0.06, delay: 0.18 });
    } else if (kind === 'kick') {
      noise({ dur: 0.35, vol: 0.25, type: 'lowpass', freq: 300, to: 1400 });
      noise({ dur: 0.12, vol: 0.15, freq: 1500, to: 600 });
    } else {
      tone({ type: 'sine', freq: 1200, to: 2400, dur: 0.12, vol: 0.06 });
    }
  },
  thunder() {
    noise({ dur: 0.3, vol: 0.3, type: 'highpass', freq: 3000, to: 1200, q: 0.5 });
    tone({ type: 'sawtooth', freq: 90, to: 40, dur: 0.35, vol: 0.12 });
  },
  hit(blocked) {
    if (blocked) {
      tone({ type: 'triangle', freq: 950, to: 700, dur: 0.08, vol: 0.18 });
      noise({ dur: 0.05, vol: 0.12, freq: 3000 });
    } else {
      tone({ type: 'square', freq: 140, to: 55, dur: 0.14, vol: 0.25 });
      noise({ dur: 0.12, vol: 0.35, type: 'lowpass', freq: 2000, to: 300 });
    }
  },
  ko() {
    tone({ type: 'sawtooth', freq: 300, to: 40, dur: 0.9, vol: 0.18 });
    noise({ dur: 0.6, vol: 0.4, type: 'lowpass', freq: 900, to: 80 });
  },
  round: () => tone({ type: 'square', freq: 392, dur: 0.25, vol: 0.1 }),
  go() {
    tone({ type: 'square', freq: 523, dur: 0.1, vol: 0.12 });
    tone({ type: 'square', freq: 784, dur: 0.25, vol: 0.12, delay: 0.1 });
  },
  bell: () => tone({ type: 'triangle', freq: 880, to: 860, dur: 0.8, vol: 0.2 }),
  win() {
    [523, 659, 784, 1046].forEach((f, i) => tone({ type: 'square', freq: f, dur: 0.16, vol: 0.1, delay: i * 0.12 }));
  },
};
