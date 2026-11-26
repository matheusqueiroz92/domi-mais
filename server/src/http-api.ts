/**
 * Rotas HTTP do servidor, fora do Socket.IO.
 *
 *   GET  /health        saúde do contêiner (só dentro da VPS)
 *   GET  /api/stats     { matches }: total de partidas jogadas
 *   POST /api/matches   uma partida terminou no navegador; devolve { matches }
 *
 * O Traefik publica só /socket/ e /api/ do domínio do jogo.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { MatchCounter } from './stats/match-counter';
import { RateLimiter } from './stats/rate-limit';

export interface HttpApiOptions {
  counter: MatchCounter;
  rooms: () => number;
  limiter?: RateLimiter;
}

export function createHttpApi({ counter, rooms, limiter = new RateLimiter() }: HttpApiOptions) {
  return (req: IncomingMessage, res: ServerResponse): void => {
    const path = (req.url ?? '').split('?')[0];

    if (path === '/health' && req.method === 'GET') {
      return json(res, 200, { ok: true, rooms: rooms() });
    }

    if (path === '/api/stats') {
      if (req.method !== 'GET') return json(res, 405, { error: 'method' });
      // Cache curto: muitos alunos abrindo a tela inicial juntos não pesam.
      res.setHeader('cache-control', 'public, max-age=30');
      return json(res, 200, { matches: counter.total });
    }

    if (path === '/api/matches') {
      if (req.method !== 'POST') return json(res, 405, { error: 'method' });
      // Não precisa de corpo; descarta o que vier.
      req.resume();
      if (!limiter.allow(clientAddress(req))) return json(res, 429, { error: 'limit' });
      return json(res, 200, { matches: counter.increment() });
    }

    json(res, 404, { error: 'not found' });
  };
}

/** Endereço de quem chamou. Atrás do Traefik, vem no X-Forwarded-For. */
export function clientAddress(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim();
  return first || req.socket.remoteAddress || 'desconhecido';
}

function json(res: ServerResponse, status: number, body: unknown): void {
  if (!res.hasHeader('cache-control')) res.setHeader('cache-control', 'no-store');
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}
