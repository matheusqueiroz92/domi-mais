/**
 * Camada de rede do modo online: liga os eventos do Socket.IO às salas.
 *
 * Cada conexão representa, no máximo, um lugar em uma sala. Tudo o que chega
 * do navegador é conferido aqui (formato) e na sala (regras).
 */
import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import type { Socket } from 'socket.io';
import type { BotLevel } from '../../src/game/state/game-types';
import { SOCKET_PATH } from '../../src/online/protocol';
import type {
  Ack,
  ClientToServerEvents,
  OnlineGameAction,
  ServerToClientEvents,
} from '../../src/online/protocol';
import { cleanName } from './names';
import { RoomManager } from './room-manager';
import type { RoomManagerOptions } from './room-manager';
import type { Room } from './room';

interface Binding {
  code: string;
  seatId: string;
}

interface SocketData {
  binding: Binding | null;
}

type DomiSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

/** Intervalo da faxina de salas abandonadas. */
export const SWEEP_INTERVAL_MS = 60 * 1000;

const BOT_LEVELS: BotLevel[] = ['easy', 'medium', 'hard'];
const PILE_ACTIONS = ['CHOOSE_INITIAL_PIECE', 'DRAW_PIECE'];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isShortString = (value: unknown, max = 64): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= max;

/** Confere o formato de uma ação de jogo vinda do navegador. */
export function parseAction(value: unknown): OnlineGameAction | null {
  if (!isObject(value)) return null;
  if (value.type === 'KEEP_PIECE') return { type: 'KEEP_PIECE' };
  if (!isShortString(value.pieceId)) return null;
  if (PILE_ACTIONS.includes(value.type as string)) {
    return { type: value.type as 'CHOOSE_INITIAL_PIECE' | 'DRAW_PIECE', pieceId: value.pieceId };
  }
  if (value.type === 'PLAY_PIECE' && (value.position === 'left' || value.position === 'right')) {
    return { type: 'PLAY_PIECE', pieceId: value.pieceId, position: value.position };
  }
  return null;
}

export interface DomiMaisServer {
  io: Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
  manager: RoomManager;
  close: () => Promise<void>;
}

export function createDomiMaisServer(
  httpServer: HttpServer,
  options: RoomManagerOptions & { corsOrigin?: string[] } = {}
): DomiMaisServer {
  const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(
    httpServer,
    {
      path: SOCKET_PATH,
      // Em produção o jogo e o servidor ficam no mesmo domínio; CORS só se configurado.
      cors: options.corsOrigin?.length ? { origin: options.corsOrigin } : undefined,
      maxHttpBufferSize: 16 * 1024,
      // Reconexões curtas recuperam os eventos perdidos.
      connectionStateRecovery: { maxDisconnectionDuration: 30 * 1000 },
    }
  );

  /** Conexão atual de cada lugar: "CÓDIGO:lugar" → socket. */
  const sockets = new Map<string, DomiSocket>();
  const key = (code: string, seatId: string) => `${code}:${seatId}`;

  const broadcast = (room: Room) => {
    for (const seat of room.seats) {
      const socket = sockets.get(key(room.code, seat.id));
      const view = room.viewFor(seat.id);
      if (socket && view) socket.emit('room:state', view);
    }
  };

  const dropSeat = (code: string, seatId: string, reason: string) => {
    const socket = sockets.get(key(code, seatId));
    sockets.delete(key(code, seatId));
    if (socket) {
      socket.data.binding = null;
      socket.emit('room:closed', { reason });
    }
  };

  const manager = new RoomManager({
    ...options,
    onChange: (room) => {
      broadcast(room);
      options.onChange?.(room);
    },
    onSeatRemoved: (room, seat, reason) => {
      dropSeat(room.code, seat.id, reason);
      options.onSeatRemoved?.(room, seat, reason);
    },
    onClosed: (room, reason) => {
      for (const seat of room.seats) dropSeat(room.code, seat.id, reason);
      options.onClosed?.(room, reason);
    },
  });

  const sweeper = setInterval(() => manager.sweep(), SWEEP_INTERVAL_MS);
  sweeper.unref();

  /** Liga a conexão a um lugar, desligando uma conexão antiga do mesmo lugar. */
  const bind = (socket: DomiSocket, room: Room, seatId: string) => {
    unbind(socket, false);
    const k = key(room.code, seatId);
    const previous = sockets.get(k);
    if (previous && previous !== socket) {
      previous.data.binding = null;
      previous.emit('session:replaced');
      previous.disconnect(true);
    }
    sockets.set(k, socket);
    socket.data.binding = { code: room.code, seatId };
  };

  /** Desliga a conexão do lugar. `asDisconnect`: avisa a sala que a pessoa caiu. */
  const unbind = (socket: DomiSocket, asDisconnect: boolean) => {
    const binding = socket.data.binding;
    if (!binding) return;
    socket.data.binding = null;
    const k = key(binding.code, binding.seatId);
    if (sockets.get(k) !== socket) return;
    sockets.delete(k);
    if (asDisconnect) manager.get(binding.code)?.disconnect(binding.seatId);
  };

  /** Sala e lugar desta conexão, ou um erro para o `ack`. */
  const current = (socket: DomiSocket): { room: Room; seatId: string } | null => {
    const binding = socket.data.binding;
    const room = binding && manager.get(binding.code);
    return room && binding ? { room, seatId: binding.seatId } : null;
  };

  const NOT_IN_ROOM: Ack = { ok: false, error: 'Você não está em uma sala.' };
  const BAD_NAME: Ack = { ok: false, error: 'Digite um nome com pelo menos uma letra ou número.' };

  /** Garante que `ack` é uma função antes de responder. */
  const safe = <A extends unknown[]>(handler: (...args: A) => void) =>
    (...args: A) => {
      try {
        handler(...args);
      } catch (error) {
        console.error('[domimais] erro ao tratar evento', error);
        const ack = args[args.length - 1];
        if (typeof ack === 'function') ack({ ok: false, error: 'Erro no servidor. Tente de novo.' });
      }
    };

  io.on('connection', (socket: DomiSocket) => {
    socket.data.binding = null;

    socket.on('room:create', safe((payload, ack) => {
      if (typeof ack !== 'function') return;
      const name = cleanName(isObject(payload) ? payload.name : null);
      if (!name) return ack(BAD_NAME);
      const created = manager.create(name);
      if (!created.ok) return ack(created);
      bind(socket, created.room, created.seat.id);
      ack({ ok: true, session: { code: created.room.code, token: created.seat.token } });
      broadcast(created.room);
    }));

    socket.on('room:join', safe((payload, ack) => {
      if (typeof ack !== 'function') return;
      if (!isObject(payload) || !isShortString(payload.code, 16)) {
        return ack({ ok: false, error: 'Digite o código da sala.' });
      }
      const name = cleanName(payload.name);
      if (!name) return ack(BAD_NAME);
      const room = manager.get(payload.code);
      if (!room) return ack({ ok: false, error: 'Sala não encontrada. Confira o código.' });
      const joined = room.join(name);
      if (!joined.ok) return ack(joined);
      bind(socket, room, joined.seat.id);
      ack({ ok: true, session: { code: room.code, token: joined.seat.token } });
      broadcast(room);
    }));

    socket.on('room:resume', safe((payload, ack) => {
      if (typeof ack !== 'function') return;
      if (!isObject(payload) || !isShortString(payload.code, 16) || !isShortString(payload.token)) {
        return ack(NOT_IN_ROOM);
      }
      const room = manager.get(payload.code);
      if (!room) return ack({ ok: false, error: 'Essa sala não existe mais.' });
      const resumed = room.resume(payload.token);
      if (!resumed.ok) return ack(resumed);
      bind(socket, room, resumed.seat.id);
      ack({ ok: true });
      broadcast(room);
    }));

    socket.on('room:leave', safe((ack) => {
      if (typeof ack !== 'function') return;
      const at = current(socket);
      if (!at) return ack(NOT_IN_ROOM);
      unbind(socket, false);
      ack(at.room.leave(at.seatId));
    }));

    socket.on('room:add-bot', safe((payload, ack) => {
      if (typeof ack !== 'function') return;
      const at = current(socket);
      if (!at) return ack(NOT_IN_ROOM);
      const level = isObject(payload) ? payload.level : null;
      if (!BOT_LEVELS.includes(level as BotLevel)) return ack({ ok: false, error: 'Nível inválido.' });
      ack(at.room.addBot(at.seatId, level as BotLevel));
    }));

    socket.on('room:remove-seat', safe((payload, ack) => {
      if (typeof ack !== 'function') return;
      const at = current(socket);
      if (!at) return ack(NOT_IN_ROOM);
      if (!isObject(payload) || !isShortString(payload.seatId)) return ack({ ok: false, error: 'Lugar inválido.' });
      ack(at.room.removeSeat(at.seatId, payload.seatId));
    }));

    socket.on('room:start', safe((ack) => {
      if (typeof ack !== 'function') return;
      const at = current(socket);
      if (!at) return ack(NOT_IN_ROOM);
      ack(at.room.start(at.seatId));
    }));

    socket.on('room:restart', safe((ack) => {
      if (typeof ack !== 'function') return;
      const at = current(socket);
      if (!at) return ack(NOT_IN_ROOM);
      ack(at.room.restart(at.seatId));
    }));

    socket.on('game:action', safe((payload, ack) => {
      if (typeof ack !== 'function') return;
      const at = current(socket);
      if (!at) return ack(NOT_IN_ROOM);
      const action = parseAction(isObject(payload) ? payload.action : null);
      if (!action) return ack({ ok: false, error: 'Jogada inválida.' });
      ack(at.room.act(at.seatId, action));
    }));

    socket.on('disconnect', () => unbind(socket, true));
  });

  return {
    io,
    manager,
    close: () =>
      new Promise<void>((resolve) => {
        clearInterval(sweeper);
        manager.closeAll('O servidor foi reiniciado.');
        io.close(() => resolve());
      }),
  };
}
