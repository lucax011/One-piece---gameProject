import { Fighter, STAGE_LEFT, STAGE_RIGHT } from './fighter.js';
import { applyHit, attackBox, attackPhase, hurtBox, overlap } from './combat.js';

export const ROUND_TIME = 60;

// Estado de um round: dois lutadores, projéteis e o relógio.
// `step` devolve eventos (golpe, nocaute...) que o renderer e o som usam.
export class World {
  constructor(p1Data, p2Data, groundY) {
    this.groundY = groundY;
    this.fighters = [new Fighter(p1Data, 110, groundY, 1), new Fighter(p2Data, 210, groundY, -1)];
    this.projectiles = [];
    this.now = 0;
    this.timeLeft = ROUND_TIME;
    this.running = false;
  }

  step(dt, inputs) {
    const events = [];
    this.now += dt;
    if (this.running) this.timeLeft = Math.max(0, this.timeLeft - dt);
    const [a, b] = this.fighters;
    const idle = { left: false, right: false, jump: false, attack: false };
    a.update(dt, this.running ? inputs[0] : idle, b, this.now, events);
    b.update(dt, this.running ? inputs[1] : idle, a, this.now, events);
    Fighter.separate(a, b);

    for (const e of events) {
      if (e.type === 'projectile') this.spawnProjectile(e.owner);
    }

    // golpes corpo a corpo
    for (const [att, def] of [[a, b], [b, a]]) {
      const atk = att.data.attack;
      if (att.state !== 'attack' || att.hasHit || atk.kind === 'projectile') continue;
      if (attackPhase(atk, att.attackTime) !== 'active') continue;
      const box = attackBox(att, atk, att.attackTime);
      if (box && overlap(box, hurtBox(def))) {
        att.hasHit = true;
        const result = applyHit(def, { damage: atk.damage, knockback: atk.knockback, dir: att.facing }, this.now);
        if (result) events.push({ type: 'hit', attacker: att, target: def, x: def.x, y: box.y + box.h / 2, ...result });
      }
    }

    // projéteis
    for (const p of this.projectiles) {
      p.x += p.vx * dt;
      p.age += dt;
      const target = this.fighters.find((f) => f !== p.owner);
      const box = { x: p.x - p.w / 2, y: p.y - p.h / 2, w: p.w, h: p.h };
      if (!p.dead && overlap(box, hurtBox(target))) {
        p.dead = true;
        const atk = p.owner.data.attack;
        const result = applyHit(target, { damage: atk.damage, knockback: atk.knockback, dir: Math.sign(p.vx) }, this.now);
        if (result) events.push({ type: 'hit', attacker: p.owner, target, x: p.x, y: p.y, ...result });
      }
      if (p.x < STAGE_LEFT - 30 || p.x > STAGE_RIGHT + 30) p.dead = true;
    }
    this.projectiles = this.projectiles.filter((p) => !p.dead);
    return events;
  }

  spawnProjectile(owner) {
    const atk = owner.data.attack;
    this.projectiles.push({
      owner,
      x: owner.x + owner.facing * 14,
      y: owner.y + atk.y,
      vx: owner.facing * atk.projectileSpeed,
      w: atk.width,
      h: atk.height,
      age: 0,
      dead: false,
    });
  }

  get ko() {
    return this.fighters.some((f) => f.hp === 0);
  }
}
