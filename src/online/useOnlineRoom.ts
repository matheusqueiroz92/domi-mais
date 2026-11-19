/**
 * Conexão do jogo com o servidor do modo online.
 *
 * Guarda a sessão (código da sala + token) no aparelho, para voltar à sala
 * depois de uma queda ou de recarregar a página, e expõe as ações da sala.
 * Protocolo: src/online/protocol.ts e docs/ONLINE.md.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import type { BotLevel } from '../game/state/game-types';
import { SOCKET_PATH, normalizeRoomCode } from './protocol';
import type {
  Ack,
  ClientToServerEvents,
  OnlineGameAction,
  QuickMessageId,
  RoomView,
  ServerToClientEvents,
  Session,
} from './protocol';

type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/** Sessão da sala online neste aparelho. */
export const ONLINE_SESSION_KEY = 'domimais:online';
/** Último nome usado no modo online. */
export const ONLINE_NAME_KEY = 'domimais:name';
/** Tempo máximo de espera por uma resposta do servidor. */
export const ACK_TIMEOUT_MS = 8000;
/** Tempo que um erro fica na tela. */
export const ERROR_MS = 5000;

const NO_ANSWER = 'Sem resposta do servidor. Confira a sua conexão e tente de novo.';

export function readSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(ONLINE_SESSION_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as Session).code === 'string' &&
      typeof (parsed as Session).token === 'string'
    ) {
      return { code: (parsed as Session).code, token: (parsed as Session).token };
    }
  } catch {
    // Sem armazenamento: sem sessão guardada.
  }
  return null;
}

function writeSession(session: Session | null): void {
  try {
    if (session) window.localStorage.setItem(ONLINE_SESSION_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(ONLINE_SESSION_KEY);
  } catch {
    // A sessão vale só enquanto a página estiver aberta.
  }
}

export function readSavedName(): string {
  try {
    return window.localStorage.getItem(ONLINE_NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

function saveName(name: string): void {
  try {
    window.localStorage.setItem(ONLINE_NAME_KEY, name.trim());
  } catch {
    // Só não fica lembrado.
  }
}

/** Link de convite para a sala. */
export function inviteLink(code: string): string {
  return `${window.location.origin}/?sala=${code}`;
}

/** Código de sala vindo de um link de convite (`?sala=ABCDE`), se houver. */
export function inviteCodeFromUrl(): string | null {
  try {
    const code = new URLSearchParams(window.location.search).get('sala');
    return code ? normalizeRoomCode(code).slice(0, 16) : null;
  } catch {
    return null;
  }
}

export interface OnlineRoom {
  /** A sala vista por este jogador; `null` fora de uma sala. */
  view: RoomView | null;
  /** Diferença entre o relógio do servidor e o do aparelho, em ms. */
  clockOffset: number;
  /** A conexão com o servidor está de pé. */
  connected: boolean;
  /** Esperando o servidor responder a um pedido. */
  busy: boolean;
  /** Último erro, para mostrar por alguns segundos. */
  error: string | null;
  /** Motivo de a pessoa ter saído da sala sem pedir (sala fechou, foi tirada...). */
  closedReason: string | null;
  /** Sala guardada neste aparelho, para voltar. */
  savedSession: Session | null;
  create: (name: string) => Promise<boolean>;
  join: (code: string, name: string) => Promise<boolean>;
  /** Volta para a sala guardada. */
  resume: () => Promise<boolean>;
  /** Sai da sala (na partida, o computador assume o lugar). */
  leave: () => Promise<void>;
  /** Sai da sala guardada sem entrar nela. */
  leaveSaved: () => Promise<void>;
  addBot: (level: BotLevel) => Promise<boolean>;
  removeSeat: (seatId: string) => Promise<boolean>;
  start: () => Promise<boolean>;
  restart: () => Promise<boolean>;
  act: (action: OnlineGameAction) => Promise<boolean>;
  /** Envia uma mensagem livre ou rápida no chat. */
  sendChat: (message: { text: string } | { quick: QuickMessageId }) => Promise<boolean>;
  /** Só o dono da sala: liga ou desliga o chat. */
  setChatEnabled: (enabled: boolean) => Promise<boolean>;
  /** Jogadores silenciados nesta tela (só quem silenciou deixa de ver). */
  muted: ReadonlySet<string>;
  toggleMute: (seatId: string) => void;
  clearError: () => void;
  dismissClosed: () => void;
}

/**
 * Sala online. `url` é o endereço do servidor; sem ele, o mesmo domínio do
 * jogo (em produção e em `npm run dev`, que encaminha `/socket/`).
 */
export function useOnlineRoom(url?: string): OnlineRoom {
  const [view, setView] = useState<RoomView | null>(null);
  const [clockOffset, setClockOffset] = useState(0);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closedReason, setClosedReason] = useState<string | null>(null);
  const [savedSession, setSavedSession] = useState<Session | null>(() => readSession());
  const [muted, setMuted] = useState<ReadonlySet<string>>(() => new Set());

  const socketRef = useRef<ClientSocket | null>(null);
  /** Sessão em uso (na sala agora); a reconexão automática usa esta. */
  const activeRef = useRef<Session | null>(null);
  const errorTimer = useRef<number | null>(null);

  const showError = useCallback((message: string) => {
    setError(message);
    if (errorTimer.current !== null) window.clearTimeout(errorTimer.current);
    errorTimer.current = window.setTimeout(() => setError(null), ERROR_MS);
  }, []);

  const clearError = useCallback(() => setError(null), []);
  const dismissClosed = useCallback(() => setClosedReason(null), []);

  /** Sai da sala na tela (e esquece a sessão, se `forget`). */
  const dropRoom = useCallback((reason: string | null, forget: boolean) => {
    activeRef.current = null;
    setView(null);
    setMuted(new Set());
    if (reason) setClosedReason(reason);
    if (forget) {
      writeSession(null);
      setSavedSession(null);
    }
  }, []);

  const emitAck = useCallback(
    (socket: ClientSocket, event: keyof ClientToServerEvents, payload?: unknown): Promise<Ack<{ session?: Session }>> =>
      new Promise((resolve) => {
        const callback = (err: Error | null, res: Ack<{ session?: Session }>) =>
          resolve(err ? { ok: false, error: NO_ANSWER } : res);
        const timed = socket.timeout(ACK_TIMEOUT_MS) as unknown as {
          emit: (...args: unknown[]) => void;
        };
        if (payload === undefined) timed.emit(event, callback);
        else timed.emit(event, payload, callback);
      }),
    []
  );

  /** Liga ao servidor (uma vez) e espera a conexão. */
  const ensureSocket = useCallback((): Promise<ClientSocket | null> => {
    let socket = socketRef.current;
    if (!socket) {
      socket = io(url ?? '', {
        path: SOCKET_PATH,
        reconnectionDelayMax: 4000,
      }) as ClientSocket;
      socketRef.current = socket;

      socket.on('connect', () => {
        setConnected(true);
        // Reconectou com a sala em andamento: volta para o mesmo lugar
        // (o servidor trata cada conexão nova como desconhecida).
        const session = activeRef.current;
        if (session) {
          void emitAck(socket!, 'room:resume', session).then((res) => {
            if (!res.ok) dropRoom(res.error, true);
          });
        }
      });
      socket.on('disconnect', () => setConnected(false));
      socket.on('room:state', (next) => {
        setClockOffset(next.serverNow - Date.now());
        setView(next);
      });
      socket.on('room:closed', ({ reason }) => dropRoom(reason, true));
      socket.on('session:replaced', () => {
        // Outra aba ou aparelho está com a sala: esta para de reconectar.
        dropRoom('Esta sala foi aberta em outra aba ou aparelho.', false);
        socket!.disconnect();
        socketRef.current = null;
      });
    }
    if (socket.connected) return Promise.resolve(socket);
    if (!socket.active) socket.connect();
    return new Promise((resolve) => {
      const s = socket!;
      const timer = window.setTimeout(() => {
        s.off('connect', onConnect);
        resolve(null);
      }, ACK_TIMEOUT_MS);
      function onConnect() {
        window.clearTimeout(timer);
        resolve(s);
      }
      s.once('connect', onConnect);
    });
  }, [url, emitAck, dropRoom]);

  useEffect(
    () => () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
      if (errorTimer.current !== null) window.clearTimeout(errorTimer.current);
    },
    []
  );

  /** Pedido simples ao servidor; mostra o erro, se houver. */
  const request = useCallback(
    async (event: keyof ClientToServerEvents, payload?: unknown): Promise<Ack<{ session?: Session }>> => {
      const socket = await ensureSocket();
      if (!socket) {
        const failed = { ok: false as const, error: 'Não foi possível conectar ao servidor. Confira a sua internet.' };
        showError(failed.error);
        return failed;
      }
      const res = await emitAck(socket, event, payload);
      if (!res.ok) showError(res.error);
      return res;
    },
    [ensureSocket, emitAck, showError]
  );

  const enter = useCallback(
    async (event: 'room:create' | 'room:join', payload: { name: string; code?: string }) => {
      setBusy(true);
      setClosedReason(null);
      saveName(payload.name);
      const res = await request(event, payload);
      setBusy(false);
      if (!res.ok || !res.session) return false;
      activeRef.current = res.session;
      writeSession(res.session);
      setSavedSession(res.session);
      return true;
    },
    [request]
  );

  const create = useCallback((name: string) => enter('room:create', { name }), [enter]);
  const join = useCallback(
    (code: string, name: string) => enter('room:join', { code: normalizeRoomCode(code), name }),
    [enter]
  );

  const resume = useCallback(async () => {
    const session = readSession();
    if (!session) {
      setSavedSession(null);
      return false;
    }
    setBusy(true);
    setClosedReason(null);
    const res = await request('room:resume', session);
    setBusy(false);
    if (!res.ok) {
      writeSession(null);
      setSavedSession(null);
      return false;
    }
    activeRef.current = session;
    return true;
  }, [request]);

  const leave = useCallback(async () => {
    const socket = socketRef.current;
    if (socket?.connected && activeRef.current) await emitAck(socket, 'room:leave');
    dropRoom(null, true);
  }, [emitAck, dropRoom]);

  const leaveSaved = useCallback(async () => {
    const session = readSession();
    if (session) {
      const socket = await ensureSocket();
      if (socket) {
        const res = await emitAck(socket, 'room:resume', session);
        if (res.ok) await emitAck(socket, 'room:leave');
      }
    }
    dropRoom(null, true);
  }, [ensureSocket, emitAck, dropRoom]);

  const simple = useCallback(
    async (event: keyof ClientToServerEvents, payload?: unknown) => (await request(event, payload)).ok,
    [request]
  );

  return {
    view,
    clockOffset,
    connected,
    busy,
    error,
    closedReason,
    savedSession,
    create,
    join,
    resume,
    leave,
    leaveSaved,
    addBot: useCallback((level: BotLevel) => simple('room:add-bot', { level }), [simple]),
    removeSeat: useCallback((seatId: string) => simple('room:remove-seat', { seatId }), [simple]),
    start: useCallback(() => simple('room:start'), [simple]),
    restart: useCallback(() => simple('room:restart'), [simple]),
    act: useCallback((action: OnlineGameAction) => simple('game:action', { action }), [simple]),
    sendChat: useCallback(
      (message: { text: string } | { quick: QuickMessageId }) => simple('chat:send', message),
      [simple]
    ),
    setChatEnabled: useCallback((enabled: boolean) => simple('chat:set-enabled', { enabled }), [simple]),
    muted,
    toggleMute: useCallback((seatId: string) => {
      setMuted((current) => {
        const next = new Set(current);
        if (next.has(seatId)) next.delete(seatId);
        else next.add(seatId);
        return next;
      });
    }, []),
    clearError,
    dismissClosed,
  };
}
