# DomiMais — Arquitetura

## Visão geral

```
src/
├── game/
│   ├── logic/          Motor de regras: funções puras, sem React
│   │   ├── pieces.ts       Peças, embaralhamento, soma da mão
│   │   ├── rules.ts        Encaixe, colocação na mesa, fim de jogo
│   │   ├── engine.ts       Ações do jogo e troca de turno
│   │   ├── selectors.ts    Leituras derivadas do estado para a interface
│   │   └── __tests__/      Testes do motor e simulação de partidas
│   └── state/          Ligação com o React
│       ├── game-types.ts          Tipos do estado e das ações
│       ├── game-inicial-state.ts  Estado inicial e sorteio da partida
│       ├── game-reducer.ts        Encaminha cada ação para o motor
│       ├── game-context.tsx       GameProvider (useReducer)
│       └── use-game.ts            Contexto e hook useGame
├── components/         Componentes visuais (sem regras de jogo)
├── test/setup.ts       Configuração dos testes
└── App.tsx             Tela da partida
```

Princípio: **toda regra do jogo mora em `src/game/logic`**. Os componentes só
leem o estado e disparam ações; o reducer só encaminha. Assim o mesmo motor
servirá para o modo contra o computador e para o servidor do modo online.

## Estado (`GameState`)

| Campo | Significado |
|---|---|
| `phase` | `setup`, `choosing-initial`, `transition`, `playing` ou `finished` |
| `players` | Jogadores, cada um com `hand` (mão) e `score` (soma final) |
| `currentPlayerIndex` | Jogador da vez |
| `table` | Peças na mesa e valores das pontas (`leftEnd`, `rightEnd`) |
| `drawPile` | Monte |
| `turnStep` | `draw` (precisa comprar) ou `play` (jogar ou ficar com a peça) |
| `drawnPieceId` | Peça comprada neste turno (ela já está na mão) |
| `selectedPieceId` | Peça da mão selecionada para jogar |
| `autoPassedPlayerIndexes` | Quem passou a vez automaticamente na última troca |
| `protectTurns` | Liga a troca de turno protegida (mesmo dispositivo) |
| `result` | Resultado final: motivo, vencedor (`null` = empate) e somas |
| `logs` | Histórico em texto |

### Fases

```
setup ──START_GAME──► choosing-initial ──CHOOSE_INITIAL_PIECE──► playing
                                                                  │  ▲
                                             fim do turno          ▼  │ CONFIRM_READY
                                             (jogador muda)    transition
playing ──(monte vazio e alguém sem peças, ou jogo fechado)──► finished
```

## Ações

| Ação | Função do motor | Válida quando |
|---|---|---|
| `INITIALIZE_GAME` | `createInitialGameState` | Sempre (cria partida nova) |
| `START_GAME` | `startGame` | `phase = setup` |
| `CHOOSE_INITIAL_PIECE` | `chooseInitialPiece` | `phase = choosing-initial` |
| `CONFIRM_READY` | `confirmReady` | `phase = transition` |
| `DRAW_PIECE` | `drawPiece` | `playing` e `turnStep = draw` |
| `SELECT_PIECE` | `selectPiece` | `playing`, `turnStep = play`, peça da própria mão |
| `PLAY_PIECE` | `playPiece` | `playing`, `turnStep = play`, peça encaixa na ponta |
| `KEEP_PIECE` | `keepPiece` | `playing`, `turnStep = play` e houve compra no turno |
| `RESET_GAME` | `createInitialGameState` | Sempre |

Uma ação inválida devolve **o mesmo objeto de estado** (nada muda). Os testes
usam isso para verificar que jogadas proibidas são ignoradas.

### Pureza e sorteio

O reducer é puro. O embaralhamento e o sorteio de quem começa acontecem fora
dele, em `createRandomSetup`, e chegam prontos na ação `INITIALIZE_GAME`. Nos
testes, usa-se um gerador com semente para reproduzir partidas.

### Fim de turno (`endTurn` em `engine.ts`)

Depois de `playPiece` ou `keepPiece`:

1. `computeResult` verifica o fim da partida (só possível com o monte vazio).
2. Escolhe o próximo jogador. Com o monte vazio, quem não tem peça que encaixa
   é pulado e entra em `autoPassedPlayerIndexes`.
3. Se o jogador mudou e `protectTurns` está ligado, a fase vira `transition`.

### Blefe

`keepPiece` é a única ação para "não jogar". O motor não sabe nem registra se a
peça encaixava. Há um teste que compara o estado resultante de um blefe com o
de uma peça que realmente não encaixava e exige que sejam indistinguíveis.

## Testes

```bash
npm test           # roda tudo uma vez
npm run test:watch # modo interativo
```

| Arquivo | O que cobre |
|---|---|
| `logic/__tests__/pieces.test.ts` | As 28 peças, embaralhamento, soma |
| `logic/__tests__/rules.test.ts` | Encaixe, orientação, mesa, fim de jogo |
| `logic/__tests__/engine.test.ts` | Cada ação, monte vazio, blefe, regressão dos bugs |
| `logic/__tests__/simulation.test.ts` | 600 partidas aleatórias completas com invariantes |
| `state/__tests__/game-reducer.test.ts` | Reducer e sorteio |
| `components/__tests__/components.test.tsx` | Peça, mesa, modal, troca de turno |
| `App.test.tsx` | Fluxo pela interface, inclusive uma partida inteira |

Invariantes verificadas a cada jogada na simulação: sempre existem 28 peças
únicas somando monte, mesa e mãos; as peças da mesa formam uma corrente válida;
sempre há pelo menos uma ação possível (o jogo nunca trava); toda partida
termina com resultado coerente com as regras.

## Como alterar uma regra

1. Atualize `docs/REGRAS.md`.
2. Escreva ou ajuste o teste em `src/game/logic/__tests__`.
3. Altere a função em `src/game/logic`.
4. Rode `npm test`, `npm run lint` e `npm run build`.
5. Registre a mudança no `CHANGELOG.md`.
