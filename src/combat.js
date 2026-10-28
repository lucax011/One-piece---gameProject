// Regras de combate: funções puras, cobertas por testes em tests/.

export const GRAVITY = 760;
export const BODY_W = 14;
export const BODY_H = 40;
export const INVULNERABLE = 0.4; // segundos sem levar dano depois de um golpe
export const HURT_TIME = 0.28;
export const BLOCK_STUN = 0.12;
export const BLOCK_FACTOR = 0.25; // defendendo, o dano cai 75%

export function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function hurtBox(f) {
  return { x: f.x - BODY_W / 2, y: f.y - BODY_H, w: BODY_W, h: BODY_H };
}

// fase do ataque a partir do tempo decorrido nele
export function attackPhase(atk, t) {
  if (t < atk.startup) return 'startup';
  if (t < atk.startup + atk.active) return 'active';
  if (t < atk.startup + atk.active + atk.recovery) return 'recovery';
  return 'done';
}

export function attackDuration(atk) {
  return atk.startup + atk.active + atk.recovery;
}

// alcance atual do golpe: o braço do Luffy estica ao longo da fase ativa
export function currentReach(atk, t) {
  if (atk.kind !== 'stretch') return atk.to;
  const k = Math.min(1, Math.max(0, (t - atk.startup) / (atk.active * 0.6)));
  return atk.from + (atk.to - atk.from) * k;
}

export function attackBox(f, atk, t) {
  if (atk.kind === 'projectile') return null;
  const reach = currentReach(atk, t);
  const near = f.x + f.facing * atk.from;
  const far = f.x + f.facing * reach;
  return {
    x: Math.min(near, far),
    y: f.y + atk.y - atk.height / 2,
    w: Math.abs(far - near),
    h: atk.height,
  };
}

export function blockedDamage(damage, blocking) {
  return blocking ? Math.max(1, Math.round(damage * BLOCK_FACTOR)) : damage;
}

// aplica um golpe; devolve o que aconteceu ou null se o alvo estava invulnerável
export function applyHit(target, { damage, knockback, dir }, now) {
  if (target.hp <= 0 || now < target.invulnerableUntil) return null;
  const blocked = target.blocking;
  const dealt = blockedDamage(damage, blocked);
  target.hp = Math.max(0, target.hp - dealt);
  target.invulnerableUntil = now + INVULNERABLE;
  target.vx = dir * (blocked ? knockback * 0.35 : knockback);
  if (target.hp === 0) target.setState('ko');
  else if (blocked) target.stunUntil = now + BLOCK_STUN;
  else {
    target.setState('hurt');
    target.stunUntil = now + HURT_TIME;
    if (target.onGround) target.vy = -70;
  }
  return { dealt, blocked, ko: target.hp === 0 };
}

// vencedor de um round: índice 0/1, ou null em empate
export function roundWinner(hp1, hp2) {
  if (hp1 === hp2) return null;
  return hp1 > hp2 ? 0 : 1;
}

export function matchWinner(wins, needed = 2) {
  if (wins[0] >= needed) return 0;
  if (wins[1] >= needed) return 1;
  return null;
}
