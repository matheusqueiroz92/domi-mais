# Changelog

## 0.9.2 — 19/11/2026

- **Aviso de "sua vez"** (contra o computador e no modo online): quando a vez
  chega, aparece por alguns segundos a faixa "Sua vez!" dizendo o que fazer
  ("Compre uma peça do monte"), a área da sua mão fica em destaque enquanto a
  vez for sua, toca um som próprio (duas notas, diferente do estalo das
  peças), o celular vibra (onde o navegador permite) e o título da aba vira
  "● Sua vez — DomiMais". No mesmo aparelho a tela "Passe o dispositivo" já
  faz esse papel, e no tutorial o cartão guia cada passo.
- **Online: faltam 10 segundos** — a contagem fica vermelha e toca um aviso
  curto, uma única vez por jogada.
- **Online: a peça comprada já vem selecionada**, mostrando na hora as pontas
  onde ela encaixa, sem precisar tocar nela na mão (como já acontecia nas
  partidas locais).

## Em desenvolvimento — modo online, fase 2 de 4 (telas)

- **Telas do modo online:** entrada (criar sala ou entrar com código), link
  de convite (`?sala=CÓDIGO`), sala de espera com código, copiar link,
  compartilhar, lugares, completar com o computador e começar; partida online
  na mesma tela das partidas locais, com a contagem dos 60 segundos, avisos e
  a situação de cada adversário; "Jogar de novo" para o dono no fim.
- **Conexão:** aviso no alto quando a conexão cai e volta automática para o
  mesmo lugar; ao reabrir a página, a tela inicial oferece "Voltar" para a
  sala guardada no aparelho.
- O modo online só aparece em `npm run dev` ou em builds com
  `VITE_ONLINE=on`: o site publicado continua com "Em breve" até o servidor
  estar na VPS (fase 4).
- 12 testes de tela novos, com o servidor de verdade rodando no teste (399 no
  total).

## Em desenvolvimento — modo online, fase 1 de 4 (servidor)

- **Servidor do modo online** (`server/`, Node + Socket.IO), ainda sem telas
  no jogo. Salas por código de 5 letras, 2 a 4 jogadores, vagas completáveis
  com o computador, 60 segundos por jogada, computador no lugar de quem cai
  por mais de 1 minuto ou sai. Decisões e protocolo em `docs/ONLINE.md`.
- O servidor é o juiz: usa o mesmo motor de regras do jogo e envia a cada
  jogador só o que ele pode ver, com ids de peça embaralhados por sala.
- Novas dependências: `socket.io`, `socket.io-client`; para desenvolvimento,
  `tsx` e `esbuild`. Novos scripts: `dev:server`, `build:server`,
  `start:server`. Em `npm run dev`, `/socket/` é encaminhado ao servidor local.
- 40 testes novos, incluindo partidas inteiras de 2, 3 e 4 jogadores com
  clientes Socket.IO de verdade (387 no total).

## 0.9.1 — 18/11/2026

- **Correção: mesa fechada com peças no monte.** Quando uma jogada deixava as
  duas pontas com o mesmo número e todas as 7 peças desse número já estavam na
  mesa, a partida continuava e os jogadores seguiam comprando, sem nenhuma
  peça poder encaixar. Agora a partida acaba na hora, na jogada de quem fechou:
  vence quem está sem peças na mão (se houver mais de um, quem ficou sem
  primeiro) ou, se todos têm peças, a menor soma. O empate na menor soma
  continua possível.
- A mensagem do resultado explica o motivo: "Jogo fechado: as duas pontas são
  6 e todas as peças com 6 já estão na mesa."
- O computador (Médio e Difícil) passou a fechar a mesa quando isso dá a
  vitória e a evitar fechar quando perderia. O modo "dica" avisa quando uma
  jogada fecha o jogo e se você venceria.
- Partida salva por uma versão anterior que já esteja com a mesa fechada não
  é retomada (é descartada ao abrir a tela inicial).
- Novos testes do cenário com 2, 3 e 4 jogadores, incluindo partidas
  simuladas: em toda partida, a mesa fechada encerra o jogo na mesma jogada.

## 0.9.0 — 13/11/2026

- **Funciona sem internet (PWA):** depois da primeira visita, o jogo inteiro
  (código, fontes, imagens e sons) fica guardado no aparelho e abre sem
  conexão. Pode ser instalado como aplicativo: pelo botão "Instalar no
  aparelho" da tela inicial (Chrome, Edge e Android) ou por "Adicionar à Tela
  de Início" (iPhone e iPad).
- **Partida salva:** a partida em andamento é guardada no aparelho a cada
  jogada. Se a página for fechada ou recarregada, a tela inicial mostra
  "Partida em andamento", com "Continuar" e "Descartar". No mesmo aparelho, a
  partida volta na tela de troca de turno, para a mão do jogador não aparecer
  sem querer. Sair pelo botão da partida descarta a partida guardada. O
  tutorial não é guardado.
- **Versão nova com aviso:** quando há atualização, aparece o aviso "Há uma
  versão nova" com o botão "Atualizar". A página nunca recarrega sozinha no
  meio de uma partida.
- As fontes passaram a vir junto com o jogo (antes vinham do Google Fonts), o
  que também tira a única chamada a outro site.
- **Correção: empate indevido por mão vazia.** Em partidas (principalmente
  com 3 e 4 jogadores) o monte podia acabar com dois jogadores sem peças na
  mão, e o jogo declarava empate entre eles. Agora vence quem ficou sem peças
  primeiro; mão vazia nunca empata. O motor passou a guardar a ordem em que os
  jogadores ficam sem peças (`emptyHandOrder`). O empate continua existindo só
  no jogo fechado com a mesma menor soma.
- Novas dependências: `vite-plugin-pwa`, `@fontsource/inter` e
  `@fontsource/space-grotesk`.
- 318 testes no total.

## 0.8.0 — 13/11/2026

- **Tutorial ("Tutorial" na tela inicial):** partida guiada contra a Bia, em
  12 passos, com monte em ordem fixa. Ensina a ler as somas, escolher a peça
  inicial, comprar, jogar, passar a vez e blefar. Em cada passo só a ação
  pedida fica disponível (a peça do monte e o botão aparecem destacados). No
  fim, leva direto para uma partida contra o computador.
- **Modo "dica" (botão da lâmpada na partida):** na sua vez, mostra o que cada
  soma do monte pode ser e quantas dessas peças encaixam; depois da compra,
  mostra quais peças da mão encaixam e sugere uma jogada, com o motivo. Usa só
  o que o jogador pode ver: nunca revela peça virada. Fica desligado por
  padrão e a escolha é salva no navegador.
- A dedução pela soma saiu do computador para `src/game/logic/deduction.ts`,
  usada agora pelo computador e pelas dicas.
- `initializeGame` aceita um monte fixo (usado pelo tutorial).
- 264 testes no total.

## 0.7.1 — 12/11/2026

- **Bucha na curva:** quando a bucha vem logo depois da peça de canto, ela
  fica deitada, atravessada sobre a ponta dessa peça, e a peça seguinte se
  liga a um dos seus lados (antes ela ficava em pé, ao lado da peça de canto).

## 0.7.0 — 12/11/2026

- **Regra da peça inicial:** quem escolhe a peça inicial não compra em seguida;
  a vez passa ao próximo jogador, que faz a primeira compra.
- **Cobrinha com curvas em ângulo reto:** a linha de peças parte da peça
  inicial, no centro, e cresce para os dois lados; na borda, a peça de canto
  fica em pé, perpendicular à anterior, e a fileira volta no sentido contrário.
  As peças já colocadas não mudam de lugar.
- **Telas grandes:** a partida ocupa a janela inteira, sem rolagem, com a mesa
  usando todo o espaço e peças maiores (até 52 px por metade, contra 28 antes).
  O monte fica à esquerda e a mão do jogador à direita, embaixo da mesa.
- **Computador mais forte:** o Médio passou a jogar como o antigo Difícil. O
  novo Difícil compara as opções simulando partidas possíveis e, no final com
  dois jogadores, calcula a partida até o fim. Em simulações, vence o antigo
  Difícil em cerca de 75% das partidas.
- Estado do jogo ganhou `initialPieceId`.
- 240 testes no total.

## 0.6.0 — 12/11/2026

- **Modo contra o computador:** uma pessoa contra 1, 2 ou 3 adversários do
  computador, em três níveis (Fácil, Médio e Difícil).
- O computador joga só com informação pública (a mesa, a própria mão e as
  somas no verso) e também blefa nos níveis Médio e Difícil.
- Na vez do computador a pessoa acompanha a jogada: a peça sai do monte para o
  assento dele, vai para a mesa e abre; o assento da vez fica destacado e a
  linha "Última jogada" mostra o que ele fez.
- A última peça colocada na mesa ganha um destaque, em todos os modos.
- Sem tela de troca de turno neste modo.
- Estado do jogo ganhou `botLevel` por jogador e `lastPlayed`.
- 209 testes no total.

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
