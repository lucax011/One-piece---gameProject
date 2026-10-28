# One Piece: Luta no Grand Line

Jogo de luta 2D em pixel art com os Chapéus de Palha, para 1 jogador contra a CPU ou 2 jogadores no mesmo teclado. Começou em 2022–2023 como meu primeiro projeto de orientação a objetos em JavaScript e foi refeito do zero: os lutadores e os cenários são desenhados pixel a pixel por código, sem nenhuma imagem de sprite.

**Jogue no navegador:** https://lucax011.github.io/One-piece---gameProject/

- **4 lutadores**, cada um com um golpe especial:

  | Lutador | Golpe | Como funciona |
  | --- | --- | --- |
  | Luffy | Gomu Gomu no Pistol | O braço de borracha estica até o outro lado da tela |
  | Zoro | Oni Giri | Corte em X de perto, o golpe mais forte |
  | Sanji | Diable Jambe | Chute rápido com a perna em chamas |
  | Nami | Thunderbolt Tempo | Raio que atravessa a tela |

- **2 cenários:** o convés do Going Merry em alto-mar e a ponte das cerejeiras em Wano.
- **Regras:** melhor de 3 rounds de 60 segundos. Segurar para trás defende e reduz o dano em 75%.
- **Telas:** título, escolha de personagens (com os GIFs do anime), escolha de cenário, luta e resultado com revanche. Parado na tela de título, o jogo entra em modo demonstração (CPU contra CPU).
- **Efeitos:** faíscas, tremor de tela, câmera lenta no nocaute e sons sintetizados na hora com WebAudio, sem arquivos de áudio.

## Como rodar

Precisa do [Node.js](https://nodejs.org) 18 ou mais novo.

```bash
npm install
npm run dev
```

Abra o endereço que aparecer no terminal (normalmente `http://localhost:5173`). O servidor de desenvolvimento só atende o próprio computador.

## Controles

| Ação | Jogador 1 | Jogador 2 |
| --- | --- | --- |
| Andar | `A` / `D` | `←` / `→` |
| Pular | `W` | `↑` |
| Atacar | `F` | `0` |
| Defender | segurar para trás | segurar para trás |

Nos menus, `W`/`S` e as setas mudam a opção, `Enter` confirma e `Esc` volta. Na luta, `Esc` pausa e `M` liga e desliga o som.

## Estrutura

```
index.html            página do jogo
src/
  main.js             fluxo das telas e laço principal (passos fixos de 1/60 s)
  characters.js       dados dos lutadores: vida, velocidade, pulo e golpe
  combat.js           regras puras: caixas de acerto, dano, defesa, rounds
  fighter.js          física e máquina de estados de um lutador
  world.js            um round: dois lutadores, projéteis e o relógio
  ai.js               oponente controlado pelo computador
  render.js           cena em 320 × 180 ampliada 4×, efeitos e HUD
  input.js, audio.js  teclado e sons sintetizados
  pixel/              pixel art gerada por código (lutadores e cenários)
tests/                testes das regras e da CPU (node --test)
tools/preview.mjs     gera previews/lutadores.png com todos os quadros
One piece- project/   versão original de 2023 e galeria da tripulação
```

A lógica não depende do navegador, por isso os testes rodam direto no Node:

```bash
npm test
npm run preview   # folha com todas as animações em previews/
```

Para adicionar um lutador, basta uma entrada em `src/characters.js` e um estilo em `src/pixel/fighters-art.js`.

Atalhos de desenvolvimento pela URL: `?tela=select`, `?tela=stage`, `?tela=result` ou `?tela=demo`, e `&avancar=10` para adiantar 10 segundos de jogo.

## Créditos

Projeto de fã, sem fins comerciais. One Piece e seus personagens pertencem a Eiichiro Oda, Shueisha e Toei Animation. Os GIFs em `One piece- project/img/` são do anime. A licença MIT do repositório vale só para o código.
