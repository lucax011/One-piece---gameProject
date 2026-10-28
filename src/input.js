// Teclado: teclas seguradas e teclas apertadas desde o último passo do jogo.

export const KEYS = [
  { left: 'KeyA', right: 'KeyD', up: 'KeyW', down: 'KeyS', attack: 'KeyF' },
  { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', attack: ['Digit0', 'Numpad0'] },
];

const BLOCK_DEFAULT = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space']);

export class Keyboard {
  constructor(target) {
    this.held = new Set();
    this.pressed = new Set();
    this.listeners = [];
    target.addEventListener('keydown', (e) => {
      if (BLOCK_DEFAULT.has(e.code)) e.preventDefault();
      if (!e.repeat) {
        this.pressed.add(e.code);
        for (const fn of this.listeners) fn(e.code);
      }
      this.held.add(e.code);
    });
    target.addEventListener('keyup', (e) => this.held.delete(e.code));
    target.addEventListener('blur', () => this.held.clear());
  }

  onPress(fn) {
    this.listeners.push(fn);
  }

  down(codes) {
    return [].concat(codes).some((c) => this.held.has(c));
  }

  hit(codes) {
    return [].concat(codes).some((c) => this.pressed.has(c));
  }

  // entrada de luta do jogador i (0 ou 1)
  fighter(i) {
    const k = KEYS[i];
    return { left: this.down(k.left), right: this.down(k.right), jump: this.down(k.up), attack: this.hit(k.attack) };
  }

  endStep() {
    this.pressed.clear();
  }
}
