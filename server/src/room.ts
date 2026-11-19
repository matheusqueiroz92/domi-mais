/**
 * Uma sala do modo online: lugares, partida, tempo de jogada e o computador
 * jogando por quem caiu. Não conhece Socket.IO: avisa mudanças por
 * `onChange`, e a camada de rede (`socket-server.ts`) envia a cada jogador
 * a sua visão (`viewFor`).
 *
 * Regras do modo online: docs/ONLINE.md.
 */
import { randomBytes } from 'node:crypto';
import type { BotLevel, GameAction, GameState } from '../../src/game/state/game-types';
import { gameReducer } from '../../src/game/state/game-reducer';
import { createInitialGameState, createRandomSetup } from '../../src/game/state/game-inicial-state';
import { canKeepPiece } from '../../src/game/logic/engine';
import { getPlayableSides } from '../../src/game/logic/rules';
import type { RandomFn } from '../../src/game/logic/pieces';
import { BOT_NAMES, chooseBotAction } from '../../src/game/ai/bot';
import {
  MAX_ROOM_PLAYERS,
  MIN_ROOM_PLAYERS,
  RECONNECT_GRACE_SECONDS,
  TURN_SECONDS,
} from '../../src/online/protocol';
import type { OnlineGameAction, RoomStatus, RoomView } from '../../src/online/protocol';
import { createPieceMask, maskGameState } from './masking';
import type { PieceMask } from './masking';
import { uniqueName } from './names';

/** Pausa antes de cada ação do computador, para dar tempo de acompanhar. */
export const ONLINE_BOT_DELAY_MS = 900;

/** Nível usado quando o computador joga no lugar de uma pessoa. */
export const TAKEOVER_LEVEL: BotLevel = 'medium';

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export interface Seat {
  id: string;
  /** Segredo para voltar à sala (fica só no aparelho da pessoa). */
  token: string;
  name: string;
  kind: 'human' | 'bot';
  botLevel: BotLevel | null;
  connected: boolean;
  left: boolean;
  takenOver: boolean;
}

export interface RoomOptions {
  rng?: RandomFn;
  botDelayMs?: number;
  turnMs?: number;
  graceMs?: number;
  /** Algo mudou: enviar a nova visão a todos. */
  onChange?: (room: Room) => void;
  /** Uma pessoa deixou de fazer parte da sala (removida por quem criou, ou caiu antes da partida). */
  onSeatRemoved?: (room: Room, seat: Seat, reason: string) => void;
  /** A sala fechou. */
  onClosed?: (room: Room, reason: string) => void;
}

type Timer = ReturnType<typeof setTimeout>;

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

const ERRORS = {
  notHost: 'Só quem criou a sala pode fazer isso.',
  notLobby: 'A partida já começou.',
  full: 'A sala já está cheia.',
  notYourTurn: 'Não é a sua vez.',
  invalidMove: 'Jogada inválida.',
  notPlaying: 'Não há partida em andamento.',
  notInRoom: 'Você não faz mais parte desta sala.',
};

export class Room {
  readonly code: string;
  status: RoomStatus = 'lobby';
  seats: Seat[] = [];
  hostId = '';
  game: GameState | null = null;
  turnDeadline: number | null = null;
  notice: string | null = null;
  closed = false;
  lastActivity = Date.now();
  /** Última vez em que havia alguma pessoa conectada. */
  lastHumanSeen = Date.now();

  private mask: PieceMask | null = null;
  private seatCounter = 0;
  private botTimer: Timer | null = null;
  private turnTimer: Timer | null = null;
  private graceTimers = new Map<string, Timer>();
  private readonly rng: RandomFn;
  private readonly botDelayMs: number;
  private readonly turnMs: number;
  private readonly graceMs: number;
  private readonly options: RoomOptions;

  constructor(code: string, options: RoomOptions = {}) {
    this.code = code;
    this.options = options;
    this.rng = options.rng ?? Math.random;
    this.botDelayMs = options.botDelayMs ?? ONLINE_BOT_DELAY_MS;
    this.turnMs = options.turnMs ?? TURN_SECONDS * 1000;
    this.graceMs = options.graceMs ?? RECONNECT_GRACE_SECONDS * 1000;
  }

  /* --------------------------------------------------------- Lugares */

  /** Coloca uma pessoa na sala. A primeira vira dona da sala. */
  join(name: string): Result<{ seat: Seat }> {
    if (this.closed) return fail(ERRORS.notInRoom);
    if (this.status !== 'lobby') return fail('A partida já começou. Peça para quem criou a sala abrir outra.');
    if (this.seats.length >= MAX_ROOM_PLAYERS) return fail(ERRORS.full);

    const seat: Seat = {
      id: `s${++this.seatCounter}`,
      token: randomBytes(16).toString('hex'),
      name: uniqueName(name, this.seats.map((s) => s.name)),
      kind: 'human',
      botLevel: null,
      connected: true,
      left: false,
      takenOver: false,
    };
    this.seats.push(seat);
    if (!this.hostId) this.hostId = seat.id;
    this.changed();
    return { ok: true, seat };
  }

  /** A pessoa voltou (outra aba, reconexão ou página recarregada). */
  resume(token: string): Result<{ seat: Seat }> {
    const seat = this.seats.find((s) => s.kind === 'human' && s.token === token);
    if (this.closed || !seat || seat.left) return fail(ERRORS.notInRoom);
    this.clearGrace(seat.id);
    seat.connected = true;
    if (seat.takenOver) {
      seat.takenOver = false;
      this.notice = `${seat.name} voltou para a partida.`;
    }
    this.changed();
    return { ok: true, seat };
  }

  /** A conexão caiu. Espera `graceMs` antes de agir. */
  disconnect(seatId: string): void {
    const seat = this.seat(seatId);
    if (!seat || seat.kind !== 'human' || this.closed) return;
    seat.connected = false;
    this.clearGrace(seat.id);
    const timer = setTimeout(() => this.graceExpired(seat.id), this.graceMs);
    this.graceTimers.set(seat.id, timer);
    this.changed();
  }

  private graceExpired(seatId: string): void {
    this.graceTimers.delete(seatId);
    const seat = this.seat(seatId);
    if (!seat || seat.connected || this.closed) return;
    if (this.status === 'lobby') {
      this.removeFromLobby(seat, 'Você ficou muito tempo sem conexão e saiu da sala.');
      return;
    }
    if (this.status === 'playing' && !seat.takenOver) {
      seat.takenOver = true;
      this.notice = `${seat.name} perdeu a conexão. O computador joga por ${seat.name} até a volta.`;
      this.changed();
    }
  }

  /** A pessoa saiu pelo botão. Na partida, o computador termina por ela. */
  leave(seatId: string): Result {
    const seat = this.seat(seatId);
    if (!seat || seat.kind !== 'human' || seat.left) return fail(ERRORS.notInRoom);
    this.clearGrace(seat.id);

    if (this.status === 'lobby') {
      this.removeFromLobby(seat, null);
      return { ok: true };
    }

    seat.left = true;
    seat.connected = false;
    if (this.status === 'playing') {
      seat.takenOver = true;
      this.notice = `${seat.name} saiu da partida. O computador joga no lugar.`;
    }
    if (seat.id === this.hostId) this.passHost();
    if (!this.closeIfNoHumans()) this.changed();
    return { ok: true };
  }

  /** Quem criou a sala completa uma vaga com o computador. */
  addBot(bySeatId: string, level: BotLevel): Result {
    const check = this.hostLobbyCheck(bySeatId);
    if (!check.ok) return check;
    if (this.seats.length >= MAX_ROOM_PLAYERS) return fail(ERRORS.full);

    const taken = this.seats.map((s) => s.name);
    const free = BOT_NAMES.find((name) => !taken.includes(name)) ?? 'Computador';
    this.seats.push({
      id: `s${++this.seatCounter}`,
      token: '',
      name: uniqueName(free, taken),
      kind: 'bot',
      botLevel: level,
      connected: true,
      left: false,
      takenOver: false,
    });
    this.changed();
    return { ok: true };
  }

  /** Quem criou a sala tira um computador ou uma pessoa antes de começar. */
  removeSeat(bySeatId: string, seatId: string): Result {
    const check = this.hostLobbyCheck(bySeatId);
    if (!check.ok) return check;
    const seat = this.seat(seatId);
    if (!seat) return fail('Esse lugar não existe mais.');
    if (seat.id === bySeatId) return fail('Para sair da sala, use o botão Sair.');

    if (seat.kind === 'bot') {
      this.seats = this.seats.filter((s) => s.id !== seat.id);
      this.changed();
    } else {
      this.removeFromLobby(seat, 'Quem criou a sala tirou você dela.');
    }
    return { ok: true };
  }

  /* --------------------------------------------------------- Partida */

  start(bySeatId: string): Result {
    const check = this.hostLobbyCheck(bySeatId);
    if (!check.ok) return check;
    if (this.seats.length < MIN_ROOM_PLAYERS) {
      return fail('São precisos pelo menos 2 jogadores. Chame alguém ou complete com o computador.');
    }

    const names = this.seats.map((s) => s.name);
    const { shuffledPieces, startingPlayerIndex } = createRandomSetup(this.seats.length, this.rng);
    const initial = createInitialGameState(names, {
      pieces: shuffledPieces,
      startingPlayerIndex,
      // Cada um joga no próprio aparelho: não há tela de troca de turno.
      protectTurns: false,
      botLevels: this.seats.map((s) => (s.kind === 'bot' ? s.botLevel : null)),
    });
    this.game = gameReducer(initial, { type: 'START_GAME' });
    this.mask = createPieceMask();
    this.status = 'playing';
    this.turnDeadline = null;
    this.notice = null;
    this.changed();
    return { ok: true };
  }

  /** Depois do fim, volta todos para a sala de espera (quem saiu não volta). */
  restart(bySeatId: string): Result {
    if (bySeatId !== this.hostId) return fail(ERRORS.notHost);
    if (this.status !== 'finished') return fail('A partida ainda não terminou.');
    this.seats = this.seats.filter((s) => !s.left);
    for (const seat of this.seats) seat.takenOver = false;
    this.status = 'lobby';
    this.game = null;
    this.mask = null;
    this.turnDeadline = null;
    this.notice = null;
    this.changed();
    return { ok: true };
  }

  /** Ação de jogo de uma pessoa, com os ids que ela recebeu (apelidos). */
  act(seatId: string, action: OnlineGameAction): Result {
    if (this.status !== 'playing' || !this.game || !this.mask) return fail(ERRORS.notPlaying);
    const index = this.seats.findIndex((s) => s.id === seatId);
    if (index === -1 || this.seats[index].left) return fail(ERRORS.notInRoom);
    if (index !== this.game.currentPlayerIndex) return fail(ERRORS.notYourTurn);

    const real = this.unmask(action);
    if (!real || !this.apply(real)) return fail(ERRORS.invalidMove);
    this.changed();
    return { ok: true };
  }

  private unmask(action: OnlineGameAction): GameAction | null {
    if (action.type === 'KEEP_PIECE') return { type: 'KEEP_PIECE' };
    const pieceId = this.mask?.toReal.get(action.pieceId);
    if (!pieceId) return null;
    if (action.type === 'PLAY_PIECE') return { type: 'PLAY_PIECE', pieceId, position: action.position };
    return { type: action.type, pieceId };
  }

  /** Aplica uma ação ao jogo. `false` se o motor recusou. */
  private apply(action: GameAction): boolean {
    if (!this.game) return false;
    const next = gameReducer(this.game, action);
    if (next === this.game) return false;
    this.game = next;
    this.notice = null;
    // Comprar não encerra o turno; as outras ações encerram.
    if (action.type !== 'DRAW_PIECE') this.turnDeadline = null;
    if (next.phase === 'finished') this.status = 'finished';
    return true;
  }

  /* --------------------------------------- Computador e tempo de jogada */

  /** Lugar que o computador controla agora (computador, pessoa que caiu ou saiu). */
  private computerControls(seat: Seat): boolean {
    return seat.kind === 'bot' || seat.takenOver || seat.left;
  }

  /** Programa a próxima ação automática: do computador, ou o fim do tempo de uma pessoa. */
  private schedule(): void {
    this.clearTurnTimers();
    const game = this.game;
    if (this.status !== 'playing' || !game || this.closed) {
      this.turnDeadline = null;
      return;
    }
    const seat = this.seats[game.currentPlayerIndex];
    if (this.computerControls(seat)) {
      this.turnDeadline = null;
      this.botTimer = setTimeout(() => this.computerTurn(), this.botDelayMs);
      return;
    }
    if (this.turnDeadline === null) this.turnDeadline = Date.now() + this.turnMs;
    this.turnTimer = setTimeout(() => this.timeExpired(), Math.max(0, this.turnDeadline - Date.now()));
  }

  /** Uma ação do computador (uma de cada vez: comprar e jogar são duas). */
  private computerTurn(): void {
    this.botTimer = null;
    const game = this.game;
    if (!game || this.status !== 'playing') return;
    const index = game.currentPlayerIndex;
    const level = this.seats[index].botLevel ?? TAKEOVER_LEVEL;
    if (!this.apply(this.computerAction(game, index, level))) {
      // Não deveria acontecer; se acontecer, a jogada mais simples possível.
      this.apply(this.simplestAction(game));
    }
    this.changed();
  }

  private computerAction(game: GameState, index: number, level: BotLevel): GameAction {
    const asBot = {
      ...game,
      players: game.players.map((p, i) => (i === index ? { ...p, botLevel: level } : p)),
    };
    return chooseBotAction(asBot, this.rng) ?? this.simplestAction(game);
  }

  /** Tempo esgotado: compra ao acaso e fica com a peça (ou passa a vez). */
  private timeExpired(): void {
    this.turnTimer = null;
    const game = this.game;
    if (!game || this.status !== 'playing') return;
    const seat = this.seats[game.currentPlayerIndex];

    if (game.phase === 'choosing-initial' || game.turnStep === 'draw') {
      this.apply(this.randomPileAction(game));
    }
    const now = this.game;
    if (now && this.status === 'playing' && now.currentPlayerIndex === game.currentPlayerIndex && now.turnStep === 'play') {
      // Com peça comprada, fica com ela; com o monte vazio, jogar é obrigatório.
      this.apply(
        canKeepPiece(now)
          ? { type: 'KEEP_PIECE' }
          : this.computerAction(now, now.currentPlayerIndex, TAKEOVER_LEVEL)
      );
    }
    this.notice = `Tempo esgotado para ${seat.name}.`;
    this.changed();
  }

  private randomPileAction(game: GameState): GameAction {
    const pile = game.drawPile;
    const piece = pile[Math.floor(this.rng() * pile.length)];
    return game.phase === 'choosing-initial'
      ? { type: 'CHOOSE_INITIAL_PIECE', pieceId: piece.id }
      : { type: 'DRAW_PIECE', pieceId: piece.id };
  }

  private simplestAction(game: GameState): GameAction {
    if (game.phase === 'choosing-initial' || game.turnStep === 'draw') return this.randomPileAction(game);
    if (canKeepPiece(game)) return { type: 'KEEP_PIECE' };
    const hand = game.players[game.currentPlayerIndex].hand;
    for (const piece of hand) {
      const sides = getPlayableSides(piece, game.table);
      if (sides.left) return { type: 'PLAY_PIECE', pieceId: piece.id, position: 'left' };
      if (sides.right) return { type: 'PLAY_PIECE', pieceId: piece.id, position: 'right' };
    }
    return { type: 'KEEP_PIECE' };
  }

  /* ------------------------------------------------------------ Visão */

  viewFor(seatId: string): RoomView | null {
    const youIndex = this.seats.findIndex((s) => s.id === seatId);
    if (youIndex === -1) return null;
    return {
      code: this.code,
      status: this.status,
      seats: this.seats.map((s) => ({
        id: s.id,
        name: s.name,
        kind: s.kind,
        botLevel: s.botLevel,
        connected: s.connected,
        takenOver: s.takenOver,
        left: s.left,
        isHost: s.id === this.hostId,
        isYou: s.id === seatId,
      })),
      youIndex,
      game: this.game && this.mask ? maskGameState(this.game, youIndex, this.mask) : null,
      turnDeadline: this.turnDeadline,
      serverNow: Date.now(),
      notice: this.notice,
    };
  }

  /** Há alguma pessoa conectada? */
  hasConnectedHuman(): boolean {
    return this.seats.some((s) => s.kind === 'human' && s.connected && !s.left);
  }

  /** Fecha a sala e para tudo o que estava programado. */
  close(reason: string): void {
    if (this.closed) return;
    this.closed = true;
    this.clearTurnTimers();
    for (const timer of this.graceTimers.values()) clearTimeout(timer);
    this.graceTimers.clear();
    this.options.onClosed?.(this, reason);
  }

  /* --------------------------------------------------------- Interno */

  seat(seatId: string): Seat | undefined {
    return this.seats.find((s) => s.id === seatId);
  }

  private hostLobbyCheck(bySeatId: string): Result {
    if (this.closed) return fail(ERRORS.notInRoom);
    if (bySeatId !== this.hostId) return fail(ERRORS.notHost);
    if (this.status !== 'lobby') return fail(ERRORS.notLobby);
    return { ok: true };
  }

  private removeFromLobby(seat: Seat, reason: string | null): void {
    this.clearGrace(seat.id);
    this.seats = this.seats.filter((s) => s.id !== seat.id);
    if (reason) this.options.onSeatRemoved?.(this, seat, reason);
    if (seat.id === this.hostId) this.passHost();
    if (!this.closeIfNoHumans()) this.changed();
  }

  /** A sala passa para a próxima pessoa (de preferência conectada). */
  private passHost(): void {
    const humans = this.seats.filter((s) => s.kind === 'human' && !s.left);
    const next = humans.find((s) => s.connected) ?? humans[0];
    this.hostId = next?.id ?? '';
  }

  private closeIfNoHumans(): boolean {
    if (this.seats.some((s) => s.kind === 'human' && !s.left)) return false;
    this.close('Todos saíram da sala.');
    return true;
  }

  private clearGrace(seatId: string): void {
    const timer = this.graceTimers.get(seatId);
    if (timer) clearTimeout(timer);
    this.graceTimers.delete(seatId);
  }

  private clearTurnTimers(): void {
    if (this.botTimer) clearTimeout(this.botTimer);
    if (this.turnTimer) clearTimeout(this.turnTimer);
    this.botTimer = null;
    this.turnTimer = null;
  }

  private changed(): void {
    if (this.closed) return;
    this.lastActivity = Date.now();
    if (this.hasConnectedHuman()) this.lastHumanSeen = this.lastActivity;
    this.schedule();
    this.options.onChange?.(this);
  }
}
