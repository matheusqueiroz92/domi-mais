// @vitest-environment node
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { io as connect } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { seededRandom } from '../../../src/game/logic/__tests__/helpers';
import { SOCKET_PATH } from '../../../src/online/protocol';
import type {
  Ack,
  ClientToServerEvents,
  RoomView,
  ServerToClientEvents,
  Session,
} from '../../../src/online/protocol';
import { createDomiMaisServer, parseAction, parseChat } from '../socket-server';
import type { DomiMaisServer } from '../socket-server';
import { expectNoLeak, simulatedHumanAction } from './test-utils';

type Client = Socket<ServerToClientEvents, ClientToServerEvents>;

let server: DomiMaisServer;
let url: string;
const clients: Client[] = [];

beforeEach(async () => {
  const http = createServer();
  // Pausas curtas: a partida inteira roda em poucos segundos.
  server = createDomiMaisServer(http, { botDelayMs: 5, graceMs: 300 });
  await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
});

afterEach(async () => {
  for (const client of clients.splice(0)) client.disconnect();
  await server.close();
});

/** Cliente que guarda a última visão recebida. */
function client() {
  const socket: Client = connect(url, { path: SOCKET_PATH, transports: ['websocket'], forceNew: true });
  clients.push(socket);
  const state = { view: null as RoomView | null, closed: null as string | null, replaced: false };
  socket.on('room:state', (view) => {
    expectNoLeak(view);
    state.view = view;
  });
  socket.on('room:closed', ({ reason }) => {
    state.closed = reason;
  });
  socket.on('session:replaced', () => {
    state.replaced = true;
  });
  return { socket, state };
}

/** Envia um evento e espera a resposta. */
function ask<T extends object = object>(
  socket: Client,
  event: keyof ClientToServerEvents,
  payload?: unknown
): Promise<Ack<T>> {
  return new Promise((resolve) => {
    const emit = socket.emit as unknown as (...args: unknown[]) => void;
    if (payload === undefined) emit.call(socket, event, resolve);
    else emit.call(socket, event, payload, resolve);
  });
}

/** Espera uma condição ficar verdadeira (as mensagens chegam pela rede). */
async function until(check: () => boolean, ms = 3000) {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > ms) throw new Error('tempo esgotado esperando a condição');
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

async function createRoom(name = 'Ana') {
  const host = client();
  const res = await ask<{ session: Session }>(host.socket, 'room:create', { name });
  if (!res.ok) throw new Error(res.error);
  await until(() => host.state.view !== null);
  return { host, session: res.session };
}

describe('servidor online (Socket.IO de verdade)', () => {
  it('cria a sala, outro jogador entra pelo código e todos recebem a sala atualizada', async () => {
    const { host, session } = await createRoom('Ana');
    expect(session.code).toMatch(/^[A-Z2-9]{5}$/);
    expect(session.token).toMatch(/^[0-9a-f]{32}$/);

    const guest = client();
    const joined = await ask(guest.socket, 'room:join', { code: session.code.toLowerCase(), name: 'Beto' });
    expect(joined.ok).toBe(true);
    await until(() => host.state.view?.seats.length === 2 && guest.state.view !== null);
    expect(guest.state.view?.seats.map((s) => [s.name, s.isHost, s.isYou])).toEqual([
      ['Ana', true, false],
      ['Beto', false, true],
    ]);
  });

  it('responde com mensagens claras aos erros', async () => {
    const { session } = await createRoom();
    const guest = client();
    expect(await ask(guest.socket, 'room:join', { code: 'ZZZZZ', name: 'Beto' })).toEqual({
      ok: false,
      error: 'Sala não encontrada. Confira o código.',
    });
    expect(await ask(guest.socket, 'room:join', { code: session.code, name: '   ' })).toEqual({
      ok: false,
      error: 'Digite um nome com pelo menos uma letra ou número.',
    });
    expect(await ask(guest.socket, 'room:start')).toEqual({ ok: false, error: 'Você não está em uma sala.' });
    expect(await ask(guest.socket, 'room:join', 'lixo')).toEqual({ ok: false, error: 'Digite o código da sala.' });
    await ask(guest.socket, 'room:join', { code: session.code, name: 'Beto' });
    expect(await ask(guest.socket, 'room:start')).toEqual({ ok: false, error: 'Só quem criou a sala pode fazer isso.' });
    expect(await ask(guest.socket, 'game:action', { action: { type: 'HACK' } })).toEqual({
      ok: false,
      error: 'Jogada inválida.',
    });
  });

  it.each([2, 3, 4])('partida inteira com %i jogadores, cada um no seu aparelho', async (players) => {
    const { host, session } = await createRoom('Ana');
    const others = await Promise.all(
      ['Beto', 'Caio', 'Dani'].slice(0, players - 1).map(async (name) => {
        const c = client();
        const res = await ask(c.socket, 'room:join', { code: session.code, name });
        expect(res.ok).toBe(true);
        return c;
      })
    );
    const everyone = [host, ...others];
    await until(() => everyone.every((c) => c.state.view?.seats.length === players));
    expect((await ask(host.socket, 'room:start')).ok).toBe(true);

    const rng = seededRandom(players);
    for (let step = 0; step < 1500; step++) {
      await until(() => everyone.every((c) => c.state.view?.game));
      const view = host.state.view!;
      if (view.status === 'finished') break;
      const turn = view.game!.currentPlayerIndex;
      const player = everyone.find((c) => c.state.view!.youIndex === turn)!;
      // Espera a visão desse jogador estar em dia com a vez.
      await until(() => player.state.view!.game!.currentPlayerIndex === turn);
      const before = player.state.view!;
      const action = simulatedHumanAction(before, rng);
      expect(action).not.toBeNull();
      const res = await ask(player.socket, 'game:action', { action });
      expect(res).toEqual({ ok: true });
      await until(() => host.state.view !== view);
    }

    await until(() => everyone.every((c) => c.state.view?.status === 'finished'));
    const results = everyone.map((c) => c.state.view!.game!.result);
    for (const result of results) expect(result).toEqual(results[0]);
    expect(results[0]!.winnerIndexes.length).toBeGreaterThan(0);
  });

  it('com computadores completando a mesa, eles jogam sozinhos no servidor', async () => {
    const { host } = await createRoom('Ana');
    expect(await ask(host.socket, 'room:add-bot', { level: 'hard' })).toEqual({ ok: true });
    expect(await ask(host.socket, 'room:add-bot', { level: 'nivel-x' })).toEqual({ ok: false, error: 'Nível inválido.' });
    expect(await ask(host.socket, 'room:add-bot', { level: 'easy' })).toEqual({ ok: true });
    await ask(host.socket, 'room:start');

    const rng = seededRandom(9);
    for (let step = 0; step < 500; step++) {
      await until(() => {
        const v = host.state.view!;
        return v.status === 'finished' || v.game!.currentPlayerIndex === v.youIndex;
      }, 5000);
      const view = host.state.view!;
      if (view.status === 'finished') break;
      const res = await ask(host.socket, 'game:action', { action: simulatedHumanAction(view, rng) });
      expect(res).toEqual({ ok: true });
      await until(() => host.state.view !== view);
    }
    expect(host.state.view?.status).toBe('finished');
  });

  it('quem cai volta para o mesmo lugar com o token guardado', async () => {
    const { host, session } = await createRoom('Ana');
    const guest = client();
    const joined = await ask<{ session: Session }>(guest.socket, 'room:join', { code: session.code, name: 'Beto' });
    if (!joined.ok) throw new Error(joined.error);
    await ask(host.socket, 'room:start');
    await until(() => guest.state.view?.status === 'playing');

    guest.socket.disconnect();
    await until(() => host.state.view?.seats[1].connected === false);

    const back = client();
    expect(await ask(back.socket, 'room:resume', joined.session)).toEqual({ ok: true });
    await until(() => back.state.view !== null && host.state.view?.seats[1].connected === true);
    expect(back.state.view!.youIndex).toBe(1);
    expect(back.state.view!.status).toBe('playing');

    expect(await ask(client().socket, 'room:resume', { code: session.code, token: 'f'.repeat(32) })).toEqual({
      ok: false,
      error: 'Você não faz mais parte desta sala.',
    });
  });

  it('abrir a mesma sessão em outro aparelho desconecta o antigo', async () => {
    const { host, session } = await createRoom('Ana');
    const second = client();
    expect(await ask(second.socket, 'room:resume', session)).toEqual({ ok: true });
    await until(() => host.state.replaced);
    await until(() => second.state.view !== null);
    expect(second.state.view!.seats[0].connected).toBe(true);
  });

  it('quem é tirado da sala recebe o aviso', async () => {
    const { host, session } = await createRoom('Ana');
    const guest = client();
    await ask(guest.socket, 'room:join', { code: session.code, name: 'Beto' });
    await until(() => host.state.view?.seats.length === 2);
    const betoId = host.state.view!.seats[1].id;
    expect(await ask(host.socket, 'room:remove-seat', { seatId: betoId })).toEqual({ ok: true });
    await until(() => guest.state.closed !== null);
    expect(guest.state.closed).toBe('Quem criou a sala tirou você dela.');
  });

  it('sair da sala de espera como último jogador fecha a sala', async () => {
    const { host, session } = await createRoom('Ana');
    expect(await ask(host.socket, 'room:leave')).toEqual({ ok: true });
    expect(server.manager.get(session.code)).toBeUndefined();
  });
});

describe('chat pela rede', () => {
  it('a mensagem chega aos outros; a proibida volta como erro só para quem mandou', async () => {
    const { host, session } = await createRoom('Ana');
    const guest = client();
    await ask(guest.socket, 'room:join', { code: session.code, name: 'Beto' });
    await until(() => host.state.view?.seats.length === 2);

    expect(await ask(guest.socket, 'chat:send', { text: 'Bora jogar!' })).toEqual({ ok: true });
    expect(await ask(host.socket, 'chat:send', { quick: 'oi' })).toEqual({ ok: true });
    await until(() => host.state.view?.chat.messages.length === 2 && guest.state.view?.chat.messages.length === 2);
    expect(host.state.view!.chat.messages.map((m) => `${m.name}: ${m.text}`)).toEqual([
      'Beto: Bora jogar!',
      'Ana: Oi, pessoal!',
    ]);

    expect(await ask(guest.socket, 'chat:send', { text: 'vai se f0der' })).toEqual({
      ok: false,
      error: 'Essa mensagem não foi enviada: ela tem palavras que não são permitidas aqui.',
    });
    expect(await ask(guest.socket, 'chat:send', { quick: 'xingar' })).toEqual({ ok: false, error: 'Mensagem inválida.' });
    expect(host.state.view!.chat.messages).toHaveLength(2);
  });

  it('o dono desliga o chat para todos', async () => {
    const { host, session } = await createRoom('Ana');
    const guest = client();
    await ask(guest.socket, 'room:join', { code: session.code, name: 'Beto' });
    expect(await ask(guest.socket, 'chat:set-enabled', { enabled: false })).toEqual({
      ok: false,
      error: 'Só quem criou a sala pode fazer isso.',
    });
    expect(await ask(host.socket, 'chat:set-enabled', { enabled: false })).toEqual({ ok: true });
    await until(() => guest.state.view?.chat.enabled === false);
    expect(await ask(guest.socket, 'chat:send', { quick: 'oi' })).toEqual({
      ok: false,
      error: 'O dono da sala desligou o chat.',
    });
  });

  it('nome com palavrão é recusado ao criar e ao entrar', async () => {
    const c = client();
    const rude = { ok: false, error: 'Escolha outro nome: esse não é permitido aqui.' };
    expect(await ask(c.socket, 'room:create', { name: 'Caralh0' })).toEqual(rude);
    const { session } = await createRoom('Ana');
    expect(await ask(c.socket, 'room:join', { code: session.code, name: 'idiota' })).toEqual(rude);
  });
});

describe('formato das mensagens de chat (parseChat)', () => {
  it('aceita texto ou um botão de mensagem rápida que existe', () => {
    expect(parseChat({ text: 'oi' })).toEqual({ text: 'oi' });
    expect(parseChat({ quick: 'boa' })).toEqual({ quick: 'boa' });
    expect(parseChat({ quick: 'toString' })).toBeNull();
    expect(parseChat({ quick: '__proto__' })).toBeNull();
    expect(parseChat({ text: 'x'.repeat(5000) })).toBeNull();
    expect(parseChat({ text: 42 })).toBeNull();
    expect(parseChat('oi')).toBeNull();
  });
});

describe('formato das ações (parseAction)', () => {
  it('aceita só ações conhecidas, com os campos certos', () => {
    expect(parseAction({ type: 'KEEP_PIECE', extra: 1 })).toEqual({ type: 'KEEP_PIECE' });
    expect(parseAction({ type: 'DRAW_PIECE', pieceId: 'tabc' })).toEqual({ type: 'DRAW_PIECE', pieceId: 'tabc' });
    expect(parseAction({ type: 'PLAY_PIECE', pieceId: 'tabc', position: 'left' })).toEqual({
      type: 'PLAY_PIECE',
      pieceId: 'tabc',
      position: 'left',
    });
    expect(parseAction({ type: 'PLAY_PIECE', pieceId: 'tabc', position: 'meio' })).toBeNull();
    expect(parseAction({ type: 'DRAW_PIECE', pieceId: 'x'.repeat(200) })).toBeNull();
    expect(parseAction({ type: 'RESET_GAME' })).toBeNull();
    expect(parseAction({ type: 'RESTORE_GAME', state: {} })).toBeNull();
    expect(parseAction(null)).toBeNull();
  });
});
