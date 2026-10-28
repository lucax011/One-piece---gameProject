import { GRAVITY, BODY_W, attackDuration, attackPhase } from './combat.js';

export const STAGE_LEFT = 14;
export const STAGE_RIGHT = 306;

// Um lutador: posição (pés), física, vida e máquina de estados.
// Não desenha nada; o renderer lê `state`, `stateTime` e `facing`.
export class Fighter {
  constructor(data, x, groundY, facing) {
    this.data = data;
    this.groundY = groundY;
    this.x = x;
    this.y = groundY;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing;
    this.hp = data.hp;
    this.maxHp = data.hp;
    this.state = 'idle';
    this.stateTime = 0;
    this.attackTime = 0;
    this.hasHit = false;
    this.fired = false;
    this.blocking = false;
    this.invulnerableUntil = 0;
    this.stunUntil = 0;
  }

  get onGround() {
    return this.y >= this.groundY;
  }

  setState(state) {
    if (this.state === state) return;
    this.state = state;
    this.stateTime = 0;
  }

  // input: { left, right, jump, attack } com o estado das teclas neste quadro
  update(dt, input, opponent, now, events) {
    this.stateTime += dt;
    const atk = this.data.attack;
    const locked = this.state === 'ko' || this.state === 'win';
    const stunned = now < this.stunUntil;

    if (!locked && !stunned && this.state !== 'attack') {
      this.facing = opponent.x >= this.x ? 1 : -1;
    }

    this.blocking = false;
    if (locked) {
      this.vx *= 0.9;
    } else if (stunned) {
      this.vx *= 0.88;
    } else if (this.state === 'attack') {
      this.attackTime += dt;
      const phase = attackPhase(atk, this.attackTime);
      if (this.onGround) this.vx *= 0.7;
      if (phase === 'active' && atk.kind === 'projectile' && !this.fired) {
        this.fired = true;
        events.push({ type: 'projectile', owner: this });
      }
      if (this.attackTime >= attackDuration(atk)) this.setState('idle');
    } else {
      if (this.state === 'hurt') this.setState('idle');
      const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      const back = dir !== 0 && dir === -this.facing;
      if (input.attack) {
        this.setState('attack');
        this.attackTime = 0;
        this.hasHit = false;
        this.fired = false;
        events.push({ type: 'swing', owner: this });
      } else if (input.jump && this.onGround) {
        this.vy = -this.data.jump;
        events.push({ type: 'jump', owner: this });
      }
      if (this.state !== 'attack') {
        // andar para trás no chão = defender, mais devagar
        this.blocking = back && this.onGround;
        const speed = this.blocking ? this.data.speed * 0.5 : this.data.speed;
        this.vx = dir * speed;
        if (!this.onGround) this.setState('jump');
        else if (this.blocking) this.setState('block');
        else this.setState(dir ? 'walk' : 'idle');
      }
    }

    // física
    this.vy += GRAVITY * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.y >= this.groundY) {
      if (this.vy > 120) events.push({ type: 'land', owner: this });
      this.y = this.groundY;
      this.vy = 0;
    }
    this.x = Math.min(STAGE_RIGHT, Math.max(STAGE_LEFT, this.x));
  }

  // separa os corpos para um não atravessar o outro
  static separate(a, b) {
    const gap = Math.abs(a.x - b.x);
    if (gap >= BODY_W || Math.abs(a.y - b.y) > 30) return;
    const push = (BODY_W - gap) / 2;
    const dir = a.x <= b.x ? -1 : 1;
    a.x = Math.min(STAGE_RIGHT, Math.max(STAGE_LEFT, a.x + dir * push));
    b.x = Math.min(STAGE_RIGHT, Math.max(STAGE_LEFT, b.x - dir * push));
  }
}
