import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS, ROSTER } from '../src/characters.js';
import { cpuInput } from '../src/ai.js';
import { World } from '../src/world.js';

// a CPU tem que conseguir vencer um oponente parado, com qualquer personagem
for (const id of ROSTER) {
  test(`CPU com ${id} derruba um oponente parado`, () => {
    const w = new World(CHARACTERS[id], CHARACTERS.zoro, 156);
    w.running = true;
    const mem = {};
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const still = { left: false, right: false, jump: false, attack: false };
    for (let i = 0; i < 60 * 60 && !w.ko; i++) {
      w.step(1 / 60, [cpuInput(w.fighters[0], w.fighters[1], 1 / 60, mem, rand), still]);
    }
    assert.ok(w.ko, `${id} não venceu em 60 s`);
  });
}
