import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS, ROSTER } from '../src/characters.js';
import { blockedDamage, matchWinner, roundWinner, currentReach, attackDuration } from '../src/combat.js';
import { World } from '../src/world.js';

const GROUND = 156;
const idle = { left: false, right: false, jump: false, attack: false };
const press = (over) => ({ ...idle, ...over });

// avança o mundo `seconds` com as entradas dadas no primeiro quadro
function run(world, seconds, first = [idle, idle], hold = [idle, idle]) {
  const dt = 1 / 60;
  const events = [];
  for (let t = 0, i = 0; t < seconds; t += dt, i++) events.push(...world.step(dt, i === 0 ? first : hold));
  return events;
}

function fight(p1, p2, distance) {
  const w = new World(CHARACTERS[p1], CHARACTERS[p2], GROUND);
  w.running = true;
  w.fighters[0].x = 150;
  w.fighters[1].x = 150 + distance;
  return w;
}

test('todos os personagens têm um único ataque válido', () => {
  for (const id of ROSTER) {
    const c = CHARACTERS[id];
    assert.ok(c.hp > 0 && c.speed > 0, id);
    assert.ok(c.attack.damage > 0, id);
    assert.ok(attackDuration(c.attack) < 1, `${id}: ataque longo demais`);
  }
});

test('o soco do Luffy acerta de longe e tira 10 de vida', () => {
  const w = fight('luffy', 'zoro', 70);
  const events = run(w, 0.8, [press({ attack: true }), idle]);
  assert.equal(events.filter((e) => e.type === 'hit').length, 1);
  assert.equal(w.fighters[1].hp, 110 - 10);
});

test('o braço do Luffy estica ao longo do golpe', () => {
  const atk = CHARACTERS.luffy.attack;
  assert.ok(currentReach(atk, atk.startup) < currentReach(atk, atk.startup + atk.active * 0.6));
});

test('o chute do Sanji não alcança quem está longe', () => {
  const w = fight('sanji', 'nami', 70);
  run(w, 0.8, [press({ attack: true }), idle]);
  assert.equal(w.fighters[1].hp, CHARACTERS.nami.hp);
});

test('defender reduz o dano em 75%', () => {
  assert.equal(blockedDamage(14, true), 4);
  assert.equal(blockedDamage(14, false), 14);
  const w = fight('zoro', 'luffy', 30);
  // Luffy está à direita do Zoro: segurar para a direita é andar para trás
  run(w, 0.8, [press({ attack: true }), press({ right: true })], [idle, press({ right: true })]);
  assert.equal(w.fighters[1].hp, 100 - 4);
});

test('o raio da Nami atravessa a tela e acerta', () => {
  const w = fight('nami', 'sanji', 140);
  const events = run(w, 1.5, [press({ attack: true }), idle]);
  assert.equal(events.filter((e) => e.type === 'hit').length, 1);
  assert.equal(w.fighters[1].hp, 95 - 9);
  assert.equal(w.projectiles.length, 0);
});

test('a invulnerabilidade impede dois danos seguidos', () => {
  const w = fight('sanji', 'luffy', 22);
  const events = [];
  for (let i = 0; i < 2; i++) events.push(...run(w, 0.46, [press({ attack: true }), idle]));
  assert.ok(events.filter((e) => e.type === 'hit').length >= 1);
  assert.ok(w.fighters[1].hp >= 100 - 22);
});

test('nocaute quando a vida chega a zero', () => {
  const w = fight('zoro', 'nami', 30);
  w.fighters[1].hp = 5;
  run(w, 0.8, [press({ attack: true }), idle]);
  assert.equal(w.fighters[1].hp, 0);
  assert.equal(w.fighters[1].state, 'ko');
  assert.ok(w.ko);
});

test('regras de round e partida (melhor de 3)', () => {
  assert.equal(roundWinner(40, 10), 0);
  assert.equal(roundWinner(0, 3), 1);
  assert.equal(roundWinner(20, 20), null);
  assert.equal(matchWinner([1, 1]), null);
  assert.equal(matchWinner([2, 1]), 0);
  assert.equal(matchWinner([0, 2]), 1);
});

test('o relógio só corre com o round em andamento', () => {
  const w = new World(CHARACTERS.luffy, CHARACTERS.zoro, GROUND);
  run(w, 1);
  assert.equal(w.timeLeft, 60);
  w.running = true;
  run(w, 1);
  assert.ok(w.timeLeft < 59.1 && w.timeLeft > 58.9);
});
