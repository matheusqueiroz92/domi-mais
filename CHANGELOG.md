# Changelog

## 0.5.0 — 12/11/2026

- **Animações das peças:** a peça comprada vira e desliza do monte até a mão;
  a peça inicial vai do monte até a mesa; a peça jogada vai da mão até a mesa.
- **Embaralhar:** a partida começa com as peças se misturando sobre a mesa e
  depois se enfileirando no monte. Pode ser pulada, e não aparece para quem
  ativa "reduzir movimento" no sistema.
- **Monte em duas fileiras de 14:** fica sempre visível abaixo da mesa; cada
  peça mantém o seu lugar e deixa o espaço vazio quando é comprada.
- **Sons:** peça na mesa, compra e embaralhar, gerados pelo navegador (sem
  arquivos de áudio). Botão para ligar e desligar, com a escolha salva.
- **"Passar a vez":** quando nenhuma peça da mão encaixa, a mensagem avisa e o
  botão muda de "Ficar com a peça" para "Passar a vez". Para os adversários
  nada muda: a ação e o registro continuam os mesmos.
- Estado do jogo ganhou `initialPileOrder`; novo seletor
  `currentPlayerCanPlay`.
- 167 testes no total.

## 0.4.0 — 11/11/2026

### Interface

- Nova identidade visual, com **tema escuro** (padrão) e **tema claro**. Um
  botão alterna o tema na tela inicial e durante a partida, e a escolha fica
  salva no navegador.
- **Nova tela inicial:** modos de jogo em cartões ("Mesmo aparelho" disponível;
  "Contra o computador" e "Online com amigos" marcados como "Em breve"),
  exemplo da soma no verso e as regras em "Como jogar".
- **Nova mesa:** adversários em volta da mesa mostrando só os versos, mão do
  jogador da vez embaixo, monte dentro da mesa e linha de peças em "cobrinha"
  (dobra em fileiras em vez de encolher).
- Alvos "Jogar" nas pontas quando a peça selecionada encaixa.
- Monte em destaque, com peças grandes, na compra e na escolha da peça inicial.
- Painel de resultado com todas as mãos abertas e a soma de cada jogador.
- Regras acessíveis durante a partida.
- Layout para celular e computador, sem rolagem horizontal.

### Técnico

- Cores centralizadas em tokens CSS (`src/index.css`); CSS reescrito.
- Novos componentes `OpponentSeat`, `PlayerHand`, `ThemeToggle`,
  `RulesContent` e cálculo de layout em `table-layout.ts`.
- Peças e botões passaram a ser elementos `<button>` nativos.
- Novo favicon, descrição da página e fontes Space Grotesk e Inter.
- Framer Motion ficou restrito às janelas (modais).
- Testes novos para tema, layout da mesa e assentos (143 testes no total).

## 0.3.0 — 11/11/2026

- Partidas com **2, 3 ou 4 jogadores**, cada um por si. A tela de início pede a
  quantidade de jogadores e um nome para cada um.
- Empate passa a ser só entre os jogadores que cumprem a condição de vitória
  (mesma menor soma ou mãos vazias); os demais perdem.
- `GameResult.winnerIndex` virou `winnerIndexes` (lista) e a ação
  `INITIALIZE_GAME` recebe `playerNames`.
- Testes novos para 3 e 4 jogadores; a simulação passou a cobrir 1.200 partidas.

## 0.2.0 — 11/11/2026

### Regras

- A partida continua depois que o monte acaba; com o monte vazio, quem tem peça
  que encaixa é obrigado a jogar e quem não tem passa a vez automaticamente.
- Vence quem fica sem peças; no jogo fechado vence a menor soma; somas iguais
  dão empate.
- "Ficar com a peça" passou a ser uma única ação, igual para a peça que não
  encaixa e para o blefe. Os avisos "Peça encaixa" e "Peça não encaixa" e o
  botão "Blefar" foram removidos, porque denunciavam o blefe ao adversário.
- Regras oficiais documentadas em `docs/REGRAS.md`.

### Correções

- A partida travava com o monte vazio quando o jogador da vez não tinha peça
  que encaixasse.
- Blefar com uma peça que já estava na mão duplicava a peça.
- Empate de soma dava sempre vitória ao Jogador 1.
- A troca de turno não escondia a mão: agora há a tela "Passe o dispositivo"
  com o botão "Estou pronto".
- Modais apareciam fora do centro (e fora da tela no celular).
- O clique em uma peça do monte era disparado duas vezes.

### Técnico

- Regras extraídas para funções puras em `src/game/logic`; o reducer só
  encaminha as ações e não faz mais sorteios.
- Testes automatizados com Vitest e Testing Library (`npm test`).
- Peças e pontas da mesa acessíveis por teclado e leitor de tela.
- Removidos código morto e a dependência `uuid`.
- `lang="pt-BR"` no HTML; `.dockerignore` adicionado.
- Arquitetura documentada em `docs/ARQUITETURA.md`.
