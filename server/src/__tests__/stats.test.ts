import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { seededRandom } from '../../../src/game/logic/__tests__/helpers';
import { TURN_SECONDS } from '../../../src/online/protocol';
import { clientAddress, createHttpApi } from '../http-api';
import { Room } from '../room';
import { MATCH_COUNT_START, MatchCounter } from '../stats/match-counter';
import { RateLimiter } from '../stats/rate-limit';

const dirs: string[] = [];
function tempFile(): string {
  const dir = mkdtempSync(join(tmpdir(), 'domimais-stats-'));
  dirs.push(dir);
  return join(dir, 'dados', 'stats.json');
}

afterEach(() => {
  vi.useRealTimers();
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('MatchCounter', () => {
  it('sem arquivo, começa em 5.000 e soma na memória', () => {
    const counter = new MatchCounter();
    expect(counter.total).toBe(MATCH_COUNT_START);
    expect(MATCH_COUNT_START).toBe(5000);
    expect(counter.increment()).toBe(5001);
    expect(counter.total).toBe(5001);
  });

  it('grava no arquivo (criando a pasta) e continua de onde parou ao reiniciar', () => {
    vi.useFakeTimers();
    const file = tempFile();
    const counter = new MatchCounter({ file, initial: 100, saveDelayMs: 1000 });
    counter.increment();
    counter.increment();
    vi.advanceTimersByTime(1000);
    expect(JSON.parse(readFileSync(file, 'utf8')).matches).toBe(102);

    // Reiniciar o servidor: o número inicial não vale mais, vale o arquivo.
    const again = new MatchCounter({ file, initial: 5000 });
    expect(again.total).toBe(102);
  });

  it('flush grava na hora (desligamento do servidor)', () => {
    const file = tempFile();
    const counter = new MatchCounter({ file, initial: 7, saveDelayMs: 60_000 });
    counter.increment();
    counter.flush();
    expect(JSON.parse(readFileSync(file, 'utf8')).matches).toBe(8);
  });

  it('arquivo estragado não derruba nada: volta ao número inicial', () => {
    const file = tempFile();
    const counter = new MatchCounter({ file, initial: 1 });
    counter.flush();
    writeFileSync(file, '{ quebrado');
    expect(new MatchCounter({ file, initial: 42 }).total).toBe(42);
    writeFileSync(file, JSON.stringify({ matches: -3 }));
    expect(new MatchCounter({ file, initial: 42 }).total).toBe(42);
  });
});

describe('RateLimiter', () => {
  it('deixa até o limite por endereço dentro da janela e libera depois', () => {
    const limiter = new RateLimiter(3, 1000);
    expect([1, 2, 3].map(() => limiter.allow('a', 0))).toEqual([true, true, true]);
    expect(limiter.allow('a', 500)).toBe(false);
    expect(limiter.allow('b', 500)).toBe(true);
    expect(limiter.allow('a', 1000)).toBe(true);
  });
});

describe('rotas /api', () => {
  let server: Server | null = null;
  afterEach(async () => {
    if (server) await new Promise((resolve) => server!.close(resolve));
    server = null;
  });

  async function start(limit = 60) {
    const counter = new MatchCounter({ initial: 5000 });
    const api = createHttpApi({ counter, rooms: () => 3, limiter: new RateLimiter(limit, 60_000) });
    server = createServer(api);
    await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    return { counter, base: `http://127.0.0.1:${port}` };
  }

  it('GET /api/stats devolve o total; POST /api/matches soma uma partida', async () => {
    const { base, counter } = await start();
    const stats = await fetch(`${base}/api/stats`);
    expect(stats.status).toBe(200);
    expect(stats.headers.get('cache-control')).toContain('max-age=30');
    expect(await stats.json()).toEqual({ matches: 5000 });

    const post = await fetch(`${base}/api/matches`, { method: 'POST', body: '{}' });
    expect(await post.json()).toEqual({ matches: 5001 });
    expect(counter.total).toBe(5001);
  });

  it('recusa método errado, rota desconhecida e excesso de avisos', async () => {
    const { base, counter } = await start(2);
    expect((await fetch(`${base}/api/matches`)).status).toBe(405);
    expect((await fetch(`${base}/api/stats`, { method: 'POST' })).status).toBe(405);
    expect((await fetch(`${base}/api/outra`)).status).toBe(404);

    const post = () => fetch(`${base}/api/matches`, { method: 'POST', headers: { 'x-forwarded-for': '10.0.0.9, 172.18.0.2' } });
    expect((await post()).status).toBe(200);
    expect((await post()).status).toBe(200);
    expect((await post()).status).toBe(429);
    expect(counter.total).toBe(5002);
  });

  it('/health continua respondendo', async () => {
    const { base } = await start();
    expect(await (await fetch(`${base}/health`)).json()).toEqual({ ok: true, rooms: 3 });
  });

  it('o endereço vem do X-Forwarded-For (Traefik) ou da conexão', () => {
    const req = (headers: Record<string, string>) =>
      ({ headers, socket: { remoteAddress: '172.18.0.5' } }) as never;
    expect(clientAddress(req({ 'x-forwarded-for': '200.1.2.3, 172.18.0.2' }))).toBe('200.1.2.3');
    expect(clientAddress(req({}))).toBe('172.18.0.5');
  });
});

describe('partida online', () => {
  it('conta uma vez cada partida terminada, também depois de "jogar de novo"', () => {
    vi.useFakeTimers();
    let finished = 0;
    const room = new Room('ABCDE', { rng: seededRandom(5), onGameFinished: () => finished++ });
    const ana = room.join('Ana');
    const beto = room.join('Beto');
    if (!ana.ok || !beto.ok) throw new Error('sala');

    for (let round = 1; round <= 2; round++) {
      expect(room.start(ana.seat.id)).toEqual({ ok: true });
      // Ninguém joga: o tempo esgota e o jogo age por todos até o fim.
      for (let step = 0; step < 3000 && room.status === 'playing'; step++) {
        vi.advanceTimersByTime(TURN_SECONDS * 1000);
      }
      expect(room.status).toBe('finished');
      expect(finished).toBe(round);
      expect(room.restart(ana.seat.id)).toEqual({ ok: true });
    }
    room.close('fim do teste');
  });
});
