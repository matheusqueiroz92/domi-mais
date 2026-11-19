# DomiMais — Modo online

Partidas de 2 a 4 jogadores, cada um no seu aparelho, em uma sala aberta por
código. Este documento descreve o servidor (`server/`), o protocolo e as
decisões de funcionamento.

Situação (19/11/2026): **fases 1 e 2 de 4 concluídas** (servidor e telas).
Faltam o chat (fase 3) e o deploy na VPS (fase 4). Até a fase 4, o site
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
src/online/
├── protocol.ts            Tipos e constantes compartilhados com o servidor
├── config.ts              ONLINE_ENABLED: o modo online aparece no jogo?
├── useOnlineRoom.ts       Conexão: criar, entrar, voltar, sair, ações; sessão no aparelho
├── OnlineGameProvider.tsx A tela da partida recebe o estado do servidor
├── LobbyScreen.tsx        Tela da sala de espera
├── OnlineLobby.tsx        Código, convite, lugares, computador, começar
├── TurnTimer.tsx          Contagem dos 60 segundos
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

## Ligar o modo online

`ONLINE_ENABLED` (`src/online/config.ts`) é verdadeiro em `npm run dev` e nos
testes. No build de produção, só com a variável `VITE_ONLINE=on`:

```bash
VITE_ONLINE=on npm run build
```

Sem ela, a tela inicial mostra "Online com amigos — Em breve". Na fase 4, o
build da VPS passa a usar `VITE_ONLINE=on`.

## Desenvolvimento

Para testar com duas pessoas no computador, abra o jogo em duas janelas
(uma delas anônima, para não dividir a sessão guardada):

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
- `src/App.online.test.tsx`: as telas com o servidor de verdade rodando no
  teste: criar e entrar em sala, link de convite, erros, completar com o
  computador, partida inteira jogada pela tela até o "Jogar de novo",
  situação dos adversários, aviso de conexão, voltar depois de recarregar,
  ser tirado da sala e sair.

Nas partidas de teste, as pessoas são simuladas com a tática do computador
médio usando **só a visão recebida**, o que prova que ela basta para jogar.
