/**
 * Servidor do modo online do DomiMais (salas, chat) e do contador de partidas.
 *
 *   npm run dev:server     (desenvolvimento, reinicia ao salvar)
 *   npm run build:server   (gera server/dist/server.cjs)
 *   node server/dist/server.cjs
 *
 * Variáveis de ambiente:
 *   PORT               porta HTTP (padrão 3001)
 *   DATA_DIR           pasta do arquivo do contador (stats.json). Sem ela, o
 *                      contador fica só na memória e zera ao reiniciar.
 *   MATCH_COUNT_START  número inicial do contador quando ainda não há arquivo
 *                      (padrão 5000)
 *   CORS_ORIGINS       origens liberadas, separadas por vírgula (só se o jogo
 *                      estiver em outro domínio; no mesmo domínio não precisa)
 */
import { createServer } from 'node:http';
import { join } from 'node:path';
import { createHttpApi } from './http-api';
import { createDomiMaisServer } from './socket-server';
import { MATCH_COUNT_START, MatchCounter } from './stats/match-counter';

const port = Number(process.env.PORT ?? 3001);
const corsOrigin = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const dataDir = process.env.DATA_DIR?.trim();
const initial = Number(process.env.MATCH_COUNT_START ?? MATCH_COUNT_START);

const counter = new MatchCounter({
  file: dataDir ? join(dataDir, 'stats.json') : undefined,
  initial: Number.isFinite(initial) ? initial : MATCH_COUNT_START,
});

const api = createHttpApi({ counter, rooms: () => server.manager.rooms.size });
const httpServer = createServer((req, res) => api(req, res));

// Partida online terminada também conta.
const server = createDomiMaisServer(httpServer, {
  corsOrigin,
  onGameFinished: () => counter.increment(),
});

httpServer.listen(port, () => {
  console.log(`[domimais] servidor online na porta ${port}`);
  console.log(`[domimais] partidas jogadas: ${counter.total}${dataDir ? '' : ' (sem DATA_DIR: não grava)'}`);
});

const shutdown = () => {
  console.log('[domimais] desligando...');
  counter.flush();
  void server.close().then(() => process.exit(0));
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
