# DomiMais — Modo online

Partidas de 2 a 4 jogadores, cada um no seu aparelho, em uma sala aberta por
código. Este documento descreve o servidor (`server/`), o protocolo e as
decisões de funcionamento.

Situação (19/11/2026): **as 4 fases estão prontas** (servidor, telas, chat e
deploy, versão 0.10.0). O passo a passo da publicação está em
`deploy-notes.md`. Até a fase 4, o site
publicado mostra o modo online como "Em breve" (veja "Ligar o modo online").

## Como se joga (telas)

1. Na tela inicial, **Online com amigos** → nome → **Criar uma sala**, ou
   nome + código → **Entrar na sala**. O nome fica lembrado no aparelho.
2. **Sala de espera:** código grande, **Copiar link** e **Compartilhar**
   (quando o aparelho oferece). O link (`domimais.com.br/?sala=K7M2Q`) abre o
   jogo com o código já preenchido. O dono vê os botões de tirar jogadores, de
   completar vagas com o computador (Fácil, Médio ou Difícil) e de **Começar
   partida** (a partir de 2 lugares). Os outros veem "Aguardando ... começar".
3. **Partida:** a mesma tela das partidas locais (mesa, monte, mão, dicas,
   sons e animações). Mudam: a contagem dos 60 segundos ("Seu tempo" ou "Tempo
   de Ana"), avisos como "Tempo esgotado para Ana" na linha de última jogada,
   e a situação de cada adversário ("Sem conexão", "Computador jogando",
   "Saiu da partida"). Na sua vez aparece a faixa "Sua vez!" (com som,
   vibração e o título da aba mudando); faltando 10 segundos, a contagem
   fica vermelha e toca um aviso. A peça comprada já vem selecionada,
   mostrando onde encaixa.
4. **Fim:** o dono toca em **Jogar de novo** e todos voltam para a sala de
   espera; os outros esperam ou saem.
5. **Queda:** aparece no alto "Sem conexão. Tentando reconectar…"; ao voltar
   a conexão, o jogo retorna sozinho para o mesmo lugar. Se a página for
   fechada ou recarregada, a tela inicial mostra **Sala online K7M2Q** com
   **Voltar** e **Sair da sala**.
6. **Sair:** na partida, o jogo avisa que o computador vai jogar no lugar até
   o fim e que não dá para voltar.

## Decisões (Matheus, 18/11/2026)

| Situação | Decisão |
|---|---|
| Entrar na sala | Código de 5 letras, sem login. Quem cria é o dono da sala. |
| Lugares vazios | O dono pode completar com o computador (Fácil, Médio ou Difícil). |
| Tempo de jogada | 60 segundos por turno (compra e jogada juntas). Ao esgotar, o jogo compra uma peça ao acaso e fica com ela; com o monte vazio, joga por ele (jogar é obrigatório). |
| Queda de conexão | Na partida, o servidor espera 1 minuto; depois, o computador (nível Médio) joga no lugar até a pessoa voltar. Na sala de espera, o lugar fica guardado por 30 minutos (25/11/2026: quem criou a sala sai para o WhatsApp mandar o link e o celular desliga a conexão). Se a partida começar com alguém ainda sem conexão, vale o 1 minuto a partir do início. |
| Sair pelo botão | Na partida, o computador termina por ela; não dá para voltar. Na sala de espera, a pessoa simplesmente sai. |
| Chat (fase 3) | Filtro de palavrões e ofensas no servidor (mensagem proibida não é entregue), silenciar jogador, dono da sala desliga o chat, mensagens rápidas prontas. |

## Como funciona

**O servidor é o juiz.** A partida existe só no servidor. O navegador envia a
ação (`game:action`) e o servidor aplica com o mesmo reducer e o mesmo motor de
regras do jogo (`src/game/state/game-reducer.ts`, `src/game/logic`). Ação
recusada pelo motor volta como "Jogada inválida." Não há como trapacear
mexendo no navegador.

**Cada um vê só o que pode ver** (`server/src/masking.ts`):

- a mesa e a própria mão abertas;
- as peças dos outros e do monte viradas: `left` e `right` valem -1, só a
  `sum` é verdadeira;
- todos os ids de peça trocados por apelidos aleatórios, sorteados por sala.
  Sem isso, o id (`piece-12`) entregaria a peça, porque as peças são geradas
  sempre na mesma ordem. O apelido de cada peça é o mesmo para todos os
  jogadores e não muda durante a partida, então as animações (monte → mão →
  mesa) continuam funcionando;
- com a partida terminada, tudo vem aberto (o resultado mostra as mãos).

O teste `expectNoLeak` confere isso em cada mensagem enviada nos testes.

**Computador no servidor.** Os lugares de computador, e as pessoas que caíram
ou saíram, jogam pelo mesmo `chooseBotAction` do modo contra o computador, com
pausa de 0,9 s entre as ações (`ONLINE_BOT_DELAY_MS`).

**Salas na memória.** Não há banco de dados. Uma sala fecha quando todos saem,
depois de 30 minutos sem nenhuma pessoa conectada ou de 3 horas sem nenhuma
ação. Reiniciar o servidor encerra as partidas em andamento.

## Protocolo (`src/online/protocol.ts`)

Socket.IO no caminho `/socket/` do mesmo domínio do jogo. Todo pedido recebe
uma resposta `{ ok: true, ... }` ou `{ ok: false, error }` (mensagem pronta
para mostrar, em português).

| Evento (navegador → servidor) | Quem | O que faz |
|---|---|---|
| `room:create { name }` | qualquer um | Abre a sala; responde `session` (código + token) |
| `room:join { code, name }` | qualquer um | Entra na sala de espera |
| `room:resume { code, token }` | quem já estava | Volta ao mesmo lugar (queda, página recarregada, outro aparelho) |
| `room:leave` | jogador | Sai da sala (na partida, o computador assume) |
| `room:add-bot { level }` | dono, na espera | Completa uma vaga com o computador |
| `room:remove-seat { seatId }` | dono, na espera | Tira um computador ou uma pessoa |
| `room:start` | dono, na espera | Começa a partida (mínimo 2 lugares) |
| `room:restart` | dono, no fim | Volta todos para a sala de espera |
| `game:action { action }` | jogador da vez | `CHOOSE_INITIAL_PIECE`, `DRAW_PIECE`, `PLAY_PIECE` ou `KEEP_PIECE`, com os apelidos recebidos |

| Evento (servidor → navegador) | Quando |
|---|---|
| `room:state` (`RoomView`) | A cada mudança: lugares, partida mascarada, prazo da jogada (`turnDeadline`, com `serverNow` para não depender do relógio do aparelho) e avisos (`notice`) |
| `room:closed { reason }` | A sala fechou ou a pessoa foi tirada dela |
| `session:replaced` | A mesma sessão foi aberta em outra aba ou aparelho |

O `token` é o segredo para voltar à sala e deve ficar só no aparelho da
pessoa. O `id` do lugar é público.

## Arquivos

```
server/src/
├── index.ts           Ponto de entrada: HTTP (/health) + Socket.IO
├── socket-server.ts   Eventos do Socket.IO → salas; confere o formato de tudo
├── room-manager.ts    Salas abertas, códigos, faxina das abandonadas
├── room.ts            Uma sala: lugares, partida, tempo, computador, quedas
├── masking.ts         O que cada jogador vê; apelidos das peças
├── names.ts           Limpeza de nomes e nomes repetidos
├── chat/filter.ts     Filtro de palavrões e ofensas (chat e nomes)
└── __tests__/         Testes (sala com relógio simulado; clientes reais)
src/online/
├── protocol.ts            Tipos e constantes compartilhados com o servidor
├── config.ts              ONLINE_ENABLED: o modo online aparece no jogo?
├── useOnlineRoom.ts       Conexão: criar, entrar, voltar, sair, ações; sessão no aparelho
├── OnlineGameProvider.tsx A tela da partida recebe o estado do servidor
├── LobbyScreen.tsx        Tela da sala de espera
├── OnlineLobby.tsx        Código, convite, lugares, computador, começar
├── TurnTimer.tsx          Contagem dos 60 segundos
├── ChatPanel.tsx          Chat: conversa, mensagens rápidas, silenciar, ligar/desligar
└── ConnectionBanner.tsx   Aviso de conexão caída
```

**A tela da partida é a mesma do jogo local.** O `OnlineGameProvider` entrega
ao `GameContent` (em `App.tsx`) o estado que veio do servidor, no mesmo
`GameContext` do jogo local, e transforma as ações em pedidos ao servidor.
Só a peça selecionada na mão fica na tela de cada um; sem escolha da pessoa,
a peça que ela acabou de comprar vem selecionada, como nas partidas locais. O `App` escolhe a tela
pelo estado da sala: sala de espera (`status: 'lobby'`), partida online (há
`game`) ou o jogo local.

**Sessão no aparelho:** `domimais:online` guarda o código e o token da sala;
`domimais:name`, o último nome usado. Sair da sala, ser tirado dela ou a sala
fechar apagam a sessão.

## Chat

- Fica na sala de espera (embaixo dos jogadores) e, na partida, no botão de
  balão no topo, com o número de mensagens novas e uma prévia da última que
  some sozinha.
- **Mensagens rápidas:** "Oi, pessoal!", "Boa jogada!", "Pensando…", "Será
  que é blefe?", "Ops!", "Haha!", "Sua vez!", "Boa partida!"
  (`QUICK_MESSAGES` em `protocol.ts`).
- **Texto livre:** até 200 letras. No máximo 5 mensagens a cada 10 segundos
  por pessoa. A sala guarda as últimas 50 mensagens, inclusive depois do
  "Jogar de novo".
- **Filtro** (`server/src/chat/filter.ts`): o servidor confere cada mensagem
  e cada nome de jogador. Mensagem com palavra proibida não é entregue a
  ninguém; só quem enviou vê o aviso, e o texto continua no campo. O filtro
  normaliza o texto antes de comparar (acentos, números no lugar de letras,
  letras repetidas e separadas, "k" no lugar de "c") e tem testes de falso
  positivo ("computador", "cuidado", "viaduto", "disputa", "por"...). Para
  acrescentar um termo, veja o comentário no começo do arquivo.
- **Silenciar:** cada jogador pode esconder as mensagens de outro só para si
  ("Silenciar Beto" / "Ouvir Beto"). Vale até sair da sala.
- **Desligar:** o dono da sala liga e desliga o chat para todos ("Chat ligado
  para todos"); desligado, ninguém envia e todos veem o aviso.
- Mensagens não mexem na partida: não atrasam o computador nem o tempo de
  ninguém.

| Evento (navegador → servidor) | Quem | O que faz |
|---|---|---|
| `chat:send { text }` ou `chat:send { quick }` | jogador | Envia mensagem livre ou rápida |
| `chat:set-enabled { enabled }` | dono | Liga ou desliga o chat |

A conversa vem em `RoomView.chat` (`enabled` e `messages`).

## Ligar o modo online

`ONLINE_ENABLED` (`src/online/config.ts`) é verdadeiro em `npm run dev` e nos
testes. No build de produção, só com a variável `VITE_ONLINE=on`:

```bash
VITE_ONLINE=on npm run build
```

Sem ela, a tela inicial mostra "Online com amigos — Em breve". O build da VPS
(`deploy/web.Dockerfile`) usa `VITE_ONLINE=on`. Para esconder o modo online de
novo sem mexer no código, troque `VITE_ONLINE: "on"` por `"off"` no
`docker-compose.yml` e publique.

## Na VPS (deploy)

- Dois contêineres no `deploy/docker-compose.yml`: `domi-mais` (o site, Nginx)
  e `domi-mais-server` (o servidor, Node, porta 3001).
- O Traefik manda `domimais.com.br/socket/` (e `www.`) para o servidor, com
  prioridade sobre o site; o resto vai para o Nginx. WebSocket passa pelo
  Traefik sem configuração extra.
- O Traefik também manda `/api/` para o servidor (contador de partidas, veja
  abaixo).
- O servidor responde `GET /health` dentro do contêiner (usado pelo
  `HEALTHCHECK` do Docker); essa rota não é publicada.

## Contador de partidas (`server/src/stats`, `src/stats`)

- `MatchCounter` guarda o total em `$DATA_DIR/stats.json` (volume
  `domi-mais-data` no compose), gravado 2 s depois da última partida e no
  desligamento, sempre por troca de arquivo. Sem arquivo, começa em
  `MATCH_COUNT_START` (5.000).
- Partida online terminada: a sala chama `onGameFinished` e o servidor soma.
  Contra o computador e mesmo aparelho: o `GameProvider` chama
  `reportMatchFinished` uma vez por partida (`POST /api/matches`, com
  `keepalive`). Tutorial não conta.
- `GET /api/stats` devolve `{ matches }` (cache de 30 s); a tela inicial lê ao
  aparecer (`useMatchCount`). `POST /api/matches` aceita 60 avisos a cada 10
  minutos por endereço (`X-Forwarded-For`), folgado para uma sala de aula
  inteira atrás do mesmo endereço.
- O contador só fala com o servidor onde o modo online existe
  (`STATS_ENABLED`); nos testes, fica desligado.
- Publicar uma versão nova reinicia o servidor e **encerra as partidas online
  em andamento** (as salas ficam só na memória). Publique fora do horário de
  uso.

## Desenvolvimento

Para testar com duas pessoas no computador, abra o jogo em duas janelas
(uma delas anônima, para não dividir a sessão guardada):

```bash
npm run dev:server    # servidor na porta 3001, reinicia ao salvar
npm run dev           # o jogo; /socket/ é encaminhado para a porta 3001
npm run build:server  # gera server/dist/server.cjs (arquivo único)
npm run start:server  # roda o servidor compilado
```

`GET /health` responde `{ ok: true, rooms }` (para o Docker; fica fora do
caminho do Socket.IO). Variáveis: `PORT` (padrão 3001) e `CORS_ORIGINS` (só
se o jogo estiver em outro domínio).

## Testes

- `server/src/__tests__/room.test.ts`: sala de espera, tempo de jogada, tempo
  esgotado, computador, queda e volta, saída, faxina de salas e partidas
  inteiras de 2, 3 e 4 jogadores, com relógio simulado.
- `server/src/__tests__/socket-server.test.ts`: servidor e clientes Socket.IO
  de verdade, cada jogador em uma conexão, jogando partidas inteiras; queda e
  volta com o token; sessão aberta em outro aparelho; erros.
- `server/src/__tests__/masking.test.ts`: o que cada jogador vê e nomes.
- `server/src/chat/__tests__/filter.test.ts`: o que o filtro bloqueia (com
  disfarces) e o que deixa passar (falsos positivos).
- `server/src/__tests__/chat.test.ts`: chat na sala (rápidas, bloqueio,
  limite, histórico, dono desliga, não atrasa o computador).
- `src/App.online.test.tsx`: as telas com o servidor de verdade rodando no
  teste: criar e entrar em sala, link de convite, erros, completar com o
  computador, partida inteira jogada pela tela até o "Jogar de novo",
  situação dos adversários, aviso de conexão, voltar depois de recarregar,
  ser tirado da sala e sair.

Nas partidas de teste, as pessoas são simuladas com a tática do computador
médio usando **só a visão recebida**, o que prova que ela basta para jogar.
