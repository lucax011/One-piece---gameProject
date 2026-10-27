# One Piece: jogo de luta em JavaScript

Jogo de luta 2D para dois jogadores no mesmo teclado, feito em 2022–2023 para aplicar orientação a objetos em JavaScript pela primeira vez. Tudo roda no navegador, sem bibliotecas: HTML, CSS e Canvas.

## Como jogar

Abra `One piece- project/index.html` no navegador.

| Ação | Jogador 1 | Jogador 2 |
| --- | --- | --- |
| Andar | `A` / `D` | `←` / `→` |
| Pular | `W` | `↑` |
| Atacar | `F` | `0` |

A tela já tem barras de vida e cronômetro, mas o dano e a contagem do tempo ainda não estão ligados à lógica do jogo.

## O que foi praticado

- Classe `Sprite` com posição, velocidade, gravidade e área de ataque
- Detecção de colisão entre a área de ataque e o oponente
- Loop de animação com `requestAnimationFrame`
- Eventos de teclado (`keydown` / `keyup`) para dois jogadores simultâneos
