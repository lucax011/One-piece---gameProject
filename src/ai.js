// Oponente controlado pelo computador. Recebe o mesmo tipo de entrada que
// um jogador ({ left, right, jump, attack }), então a luta não muda nada.
// `mem` guarda a decisão atual entre os quadros; `rand` pode ser trocado nos testes.

export function cpuInput(self, foe, dt, mem, rand = Math.random) {
  mem.wait = (mem.wait ?? 0) - dt;
  const out = { left: false, right: false, jump: false, attack: false };
  if (self.state === 'ko' || self.state === 'win') return out;

  const atk = self.data.attack;
  const dist = Math.abs(foe.x - self.x);
  const toward = foe.x >= self.x ? 1 : -1;
  const reach = atk.kind === 'projectile' ? 170 : atk.to * 0.85;

  if (mem.wait <= 0) {
    mem.wait = 0.14 + rand() * 0.22;
    const threatened = foe.state === 'attack' && dist < (foe.data.attack.kind === 'projectile' ? 200 : foe.data.attack.to + 10);
    if (threatened && rand() < 0.5) mem.plan = 'block';
    else if (dist <= reach && rand() < 0.65) mem.plan = 'attack';
    else if (atk.kind === 'projectile' && dist < 40) mem.plan = rand() < 0.5 ? 'retreat' : 'jump';
    else if (dist > reach * 0.7) mem.plan = rand() < 0.08 ? 'jump' : 'approach';
    else mem.plan = rand() < 0.5 ? 'wait' : 'retreat';
    mem.fresh = true;
  }

  switch (mem.plan) {
    case 'attack':
      out.attack = mem.fresh;
      break;
    case 'block':
    case 'retreat':
      if (toward > 0) out.left = true;
      else out.right = true;
      break;
    case 'approach':
      if (toward > 0) out.right = true;
      else out.left = true;
      break;
    case 'jump':
      out.jump = mem.fresh;
      if (toward > 0) out.right = true;
      else out.left = true;
      break;
    default:
  }
  mem.fresh = false;
  return out;
}
