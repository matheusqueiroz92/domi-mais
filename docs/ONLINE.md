# DomiMais — Modo online

Partidas de 2 a 4 jogadores, cada um no seu aparelho, em uma sala aberta por
código. Este documento descreve o servidor (`server/`), o protocolo e as
decisões de funcionamento.

Situação (18/11/2026): **fase 1 de 4 concluída** (servidor e partida
sincronizada). Faltam as telas (fase 2), o chat (fase 3) e o deploy na VPS
(fase 4).

## Decisões (Matheus, 18/11/2026)

| Situação | Decisão |
|---|---|
| Entrar na sala | Código de 5 letras, sem login. Quem cria é o dono da sala. |
| Lugares vazios | O dono pode completar com o computador (Fácil, Médio ou Difícil). |
| Tempo de jogada | 60 segundos por turno (compra e jogada juntas). Ao esgotar, o jogo compra uma peça ao acaso e fica com ela; com o monte vazio, joga por ele (jogar é obrigatório). |
| Queda de conexão | O servidor espera 1 minuto. Depois, o computador (nível Médio) joga no lugar até a pessoa voltar. |
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
depois de 10 minutos sem nenhuma pessoa conectada ou de 3 horas sem nenhuma
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
└── __tests__/         Testes (sala com relógio simulado; clientes reais)
src/online/protocol.ts Tipos e constantes compartilhados com o navegador
```

## Desenvolvimento

```bash
npm run dev:server    # servidor na porta 3001, reinicia ao salvar
npm run dev           # o jogo; /socket/ é encaminhado para a porta 3001
npm run build:server  # gera server/dist/index.js
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

Nas partidas de teste, as pessoas são simuladas com a tática do computador
médio usando **só a visão recebida**, o que prova que ela basta para jogar.
