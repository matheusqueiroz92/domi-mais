/**
 * Servidor do modo online do DomiMais.
 *
 *   npm run dev:server     (desenvolvimento, reinicia ao salvar)
 *   npm run build:server   (gera server/dist/server.cjs)
 *   node server/dist/server.cjs
 *
 * Variáveis de ambiente:
 *   PORT          porta HTTP (padrão 3001)
 *   CORS_ORIGINS  origens liberadas, separadas por vírgula (só se o jogo
 *                 estiver em outro domínio; no mesmo domínio não precisa)
 */
import { createServer } from 'node:http';
import { createDomiMaisServer } from './socket-server';

const port = Number(process.env.PORT ?? 3001);
const corsOrigin = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const httpServer = createServer((req, res) => {
  // Verificação de saúde (Docker). Fora do caminho do Socket.IO.
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, rooms: server.manager.rooms.size }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const server = createDomiMaisServer(httpServer, { corsOrigin });

httpServer.listen(port, () => {
  console.log(`[domimais] servidor online na porta ${port}`);
});

const shutdown = () => {
  console.log('[domimais] desligando...');
  void server.close().then(() => process.exit(0));
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
