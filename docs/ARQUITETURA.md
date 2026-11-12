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
│   ├── ai/             Jogador controlado pelo computador
│   │   ├── bot.ts          Decisões do computador (funções puras)
│   │   ├── useBotTurns.ts  Hook que faz o computador jogar na vez dele
│   │   └── __tests__/      Testes das decisões e partidas entre computadores
│   └── state/          Ligação com o React
│       ├── game-types.ts          Tipos do estado e das ações
│       ├── game-inicial-state.ts  Estado inicial e sorteio da partida
│       ├── game-reducer.ts        Encaminha cada ação para o motor
│       ├── game-context.tsx       GameProvider (useReducer)
│       └── use-game.ts            Contexto e hook useGame
├── components/         Componentes visuais (sem regras de jogo)
│   ├── HomeScreen          Tela inicial: modos de jogo, jogadores, regras
│   ├── GameTable           Mesa: monte, linha de peças em cobrinha, pontas
│   ├── OpponentSeat        Adversário em volta da mesa (versos com as somas)
│   ├── PlayerHand          Mão aberta do jogador da vez
│   ├── DrawPile            Monte: duas fileiras de 14 lugares
│   ├── PieceMotion         Animação de movimento das peças
│   ├── SoundToggle         Botão de ligar/desligar o som
│   ├── TurnTransition      Tela "Passe o dispositivo"
│   ├── DominoPiece         Peça aberta (pontos) ou virada (soma)
│   └── table-layout.ts     Cálculo das fileiras da mesa e dos assentos
├── theme/              Tema escuro/claro (leitura, gravação e aplicação)
├── sound/              Sons gerados pelo navegador e preferência de som
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
| `players` | De 2 a 4 jogadores, na ordem dos turnos, cada um com `hand` (mão), `score` (soma final) e `botLevel` (`null` para pessoa; `easy`, `medium` ou `hard` para o computador) |
| `currentPlayerIndex` | Jogador da vez |
| `table` | Peças na mesa e valores das pontas (`leftEnd`, `rightEnd`) |
| `drawPile` | Monte |
| `initialPileOrder` | Ids das 28 peças na ordem inicial do monte (não muda); a interface usa para manter cada peça no seu lugar |
| `turnStep` | `draw` (precisa comprar) ou `play` (jogar ou ficar com a peça) |
| `drawnPieceId` | Peça comprada neste turno (ela já está na mão) |
| `selectedPieceId` | Peça da mão selecionada para jogar |
| `autoPassedPlayerIndexes` | Quem passou a vez automaticamente na última troca |
| `protectTurns` | Liga a troca de turno protegida (mesmo dispositivo) |
| `initialPieceId` | Id da peça inicial; a interface desenha a linha de peças a partir dela |
| `lastPlayed` | Última peça colocada na mesa e quem a colocou (a interface destaca essa peça) |
| `result` | Resultado final: motivo, `winnerIndexes` (um índice = vitória; vários = empate entre eles) e somas |
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
| `INITIALIZE_GAME` | `createInitialGameState` | Recebe de 2 a 4 nomes (`playerNames`) e, opcionalmente, `botLevels`; configuração inválida é ignorada |
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

### Número de jogadores

O motor não assume 2 jogadores em nenhum ponto: a troca de turno, o passe
automático e o resultado percorrem `players`. Os limites ficam em
`MIN_PLAYERS` e `MAX_PLAYERS` (`rules.ts`). Para o modo contra o computador,
basta que alguns jogadores tenham suas ações escolhidas por código em vez de
cliques; o motor é o mesmo.

### Blefe

`keepPiece` é a única ação para "não jogar". O motor não sabe nem registra se a
peça encaixava. Há um teste que compara o estado resultante de um blefe com o
de uma peça que realmente não encaixava e exige que sejam indistinguíveis.

## Computador (`src/game/ai`)

O computador é um jogador como outro qualquer: tem `botLevel` no estado e age
pelas mesmas ações do motor. Nenhuma regra muda por causa dele.

### O que ele pode ver

`getBotView(state, playerIndex)` monta a visão do jogador: a mesa, a própria
mão e, das peças viradas (monte e mãos dos adversários), **apenas o id e a
soma**. Todas as decisões partem dessa visão; um teste garante que duas
situações com a mesma visão levam à mesma decisão, mesmo que as peças viradas
sejam diferentes.

### Como ele decide (`chooseBotAction`)

| Decisão | Fácil | Médio | Difícil |
|---|---|---|---|
| Peça inicial | Sorteia | Maior soma | Maior soma |
| Compra | Sorteia | Maior chance de encaixar, deduzida pela soma (`fitProbability`); no empate, menor soma | Pré-seleciona as melhores somas e decide por simulação |
| Jogada | Sorteia entre as possíveis | Nota por jogada: pontos que saem da mão, buchas primeiro, pontas boas para a própria mão e ruins para os adversários | Simulação; no final de partida com dois jogadores, cálculo exato |
| Blefe | Nunca | 6% das vezes | 3% das vezes, e só com monte grande e peça de soma baixa |

`fitProbability` é a dedução que o jogo ensina: uma peça de soma 7 pode ser
1|6, 2|5 ou 3|4; descontadas as peças já vistas, calcula-se a chance de ela
encaixar em uma ponta.

**Simulação (nível difícil).** Para comparar opções, o computador imagina
`HARD_SAMPLES` "mundos possíveis" (`imagineWorld`): dá a cada peça virada uma
identidade sorteada entre as que ela pode ser, respeitando a soma do verso.
Em cada mundo, joga a partida até o fim com todos usando a tática do nível
médio (`playOut`) e fica com a opção que mais vence. Todas as opções são
testadas nos mesmos mundos. É a mesma informação pública de sempre: ele não
olha as peças reais.

**Final calculado.** Com dois jogadores e o monte vazio, todas as peças
escondidas estão na mão do adversário e as somas dizem exatamente quais são.
Nessa situação o difícil calcula a partida até o fim (`solveEndgame`) e
escolhe a jogada de melhor resultado garantido.

Força medida em partidas simuladas de dois jogadores: Médio vence Fácil em
cerca de 87%; Difícil vence Médio em cerca de 75%; Difícil vence Fácil em
cerca de 95%. O Médio atual equivale ao Difícil da versão 0.6.0. Com 4
jogadores a sorte pesa mais e a vantagem do Difícil sobre três Médios é pequena.

### Como ele entra na partida

- `useBotTurns` observa o estado: quando é a vez de um jogador com `botLevel`,
  espera `BOT_DELAY_MS`, pede a ação a `chooseBotAction` e a envia pelo mesmo
  `dispatch`. Comprar e depois jogar (ou ficar com a peça) são passos
  separados, para a pessoa acompanhar.
- O computador fica em pausa durante o embaralhar e com janelas abertas.
- Com computador na partida, `protectTurns` é `false` (sem tela de troca).
- Na interface, quem olha a tela (`getViewerIndex`) é a única pessoa da
  partida: ela fica embaixo o tempo todo. Na vez do computador os controles
  somem, as pontas "Jogar" não aparecem e a mão dele fica sempre virada.
- A linha "Última jogada" mostra o registro público da ação mais recente de um
  adversário.

## Interface

### Temas

O jogo tem tema **escuro** (padrão) e **claro**. Todas as cores são tokens CSS
definidos em `src/index.css` (`--bg`, `--panel`, `--table`, `--piece`,
`--accent` etc.), em dois blocos: `:root[data-theme='dark']` e
`:root[data-theme='light']`. Nenhum componente usa cor fixa.

- `src/theme/theme.ts` lê e grava a preferência em `localStorage`
  (chave `domimais:theme`) e aplica o atributo `data-theme` em `<html>`.
  Se o armazenamento falhar, o tema padrão é usado e nada quebra.
- `useTheme` expõe `theme` e `toggleTheme`; o botão é o `ThemeToggle`.
- Um script curto no `index.html` aplica o tema salvo antes de a página
  aparecer, para não piscar.

Para criar ou ajustar um tema, altere só os tokens em `src/index.css`.

### Tela da partida

- O **jogador da vez** fica embaixo, com a mão aberta (`PlayerHand`).
- Os **adversários** ficam em volta da mesa, na ordem dos turnos em sentido
  horário (`seatOpponents`): com 2 jogadores, em cima; com 3, à esquerda e à
  direita; com 4, à esquerda, em cima e à direita. Deles só aparecem os versos,
  com as somas.
- A **mesa** (`GameTable`) mostra a linha de peças e os valores das pontas,
  em "cobrinha" com curvas em ângulo reto (`layoutSnake`). A peça inicial fica
  no centro; o que foi jogado à direita cresce para a direita e, na borda, faz
  a curva para cima; o que foi jogado à esquerda cresce para a esquerda e faz
  a curva para baixo. Em cada curva a peça de canto fica em pé, perpendicular
  à anterior, e a fileira seguinte volta no sentido contrário. A bucha fica
  sempre atravessada na linha: em pé no meio de uma fileira e, quando vem logo
  depois da peça de canto, deitada sobre a ponta dela, com a peça seguinte
  ligada a um dos seus lados. A bucha nunca é a peça de canto. Como cada braço só cresce pela ponta,
  as peças já colocadas não saem do lugar.
- O tamanho das peças da mesa é o maior que cabe (`fitSnake`): depende da
  largura e, em telas grandes, também da altura disponível.
- Quando a peça selecionada encaixa, aparecem os alvos tracejados **"Jogar"**
  nas pontas.
- O **monte** (`DrawPile`) fica sempre visível, abaixo da mesa, em duas
  fileiras de 14 lugares. Cada peça ocupa sempre o mesmo lugar
  (`initialPileOrder`); quando é comprada, o lugar fica vazio. As peças só são
  clicáveis na compra e na escolha da peça inicial.
- Para encerrar o turno sem jogar há um único botão, ligado à ação
  `KEEP_PIECE`. O texto muda só na tela do próprio jogador: "Passar a vez"
  quando nenhuma peça da mão encaixa (`currentPlayerCanPlay`), "Ficar com a
  peça" quando alguma encaixa.
- Na troca de turno (`transition`) as mãos não são renderizadas.
- No fim, o painel **Resultado** abre todas as mãos, com a soma de cada jogador.

### Animações

- `PieceMotion` envolve cada peça no monte, na mão e na mesa com o mesmo
  identificador (`layoutId` do Framer Motion). Quando a peça some de um lugar
  e aparece em outro, ela desliza da posição antiga para a nova: do monte para
  a mão (compra), do monte para a mesa (peça inicial) e da mão para a mesa
  (jogada). A peça que sai do monte vira ao chegar.
- **Embaralhar:** ao iniciar a partida, as 28 peças aparecem espalhadas sobre
  a mesa e se movem por trajetos sorteados (`createScatter`) durante
  `SHUFFLE_SECONDS`; depois voam para os seus lugares no monte. O botão
  "Pular animação" encerra na hora. É só interface: o motor não sabe da
  animação.
- Quem ativa "reduzir movimento" no sistema não vê o embaralhar, e as demais
  animações são reduzidas (`MotionConfig reducedMotion="user"`).

### Sons

- `src/sound/sound.ts` gera os sons com a Web Audio API, sem arquivos de
  áudio: `place` (peça na mesa), `draw` (compra) e `shuffle` (embaralhar).
- `useSound` guarda a preferência em `localStorage` (chave `domimais:sound`,
  ligado por padrão) e só toca quando o som está ligado. O botão é o
  `SoundToggle`, na tela inicial e na partida.
- Falhas de áudio (navegador sem suporte, bloqueio) são ignoradas.

### Tamanhos de tela

- **Celular e tablet:** coluna única; a página rola se precisar e a mesa
  cresce para baixo.
- **Telas grandes** (a partir de 1024 × 640): a partida ocupa a janela
  inteira, sem rolagem. Em cima ficam a mesa e os adversários, usando toda a
  altura que sobra; embaixo, o monte à esquerda e, à direita, o aviso, a mão do
  jogador e o botão de encerrar o turno, cujo espaço fica reservado para a tela
  não mudar de altura. Nesse modo a mesa recebe `fitHeight` e as peças diminuem,
  se necessário, para a linha caber.

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
| `logic/__tests__/multiplayer.test.ts` | Regras específicas de 3 e 4 jogadores |
| `logic/__tests__/simulation.test.ts` | 1.200 partidas aleatórias completas (2, 3 e 4 jogadores) com invariantes |
| `state/__tests__/game-reducer.test.ts` | Reducer e sorteio |
| `components/__tests__/components.test.tsx` | Peça, mesa, modal, troca de turno |
| `components/__tests__/table-layout.test.ts` | Cobrinha: curvas em ângulo reto, peças sem sobreposição e encostadas pelo mesmo número, tamanhos; assentos dos adversários |
| `theme/__tests__/theme.test.ts` | Tema: padrão, gravação, falha de armazenamento |
| `sound/__tests__/sound.test.ts` | Sons: geração, preferência, som desligado, falhas |
| `ai/__tests__/bot.test.ts` | Visão do computador, dedução pela soma, decisões por nível, blefe, final calculado, partidas entre computadores e força relativa dos níveis |
| `App.test.tsx` | Tela inicial, tema, som, embaralhar, fluxo da partida, partidas inteiras com 2, 3 e 4 jogadores e contra o computador |

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
