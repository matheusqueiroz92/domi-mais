/**
 * Protocolo do modo online (Socket.IO), compartilhado entre o servidor
 * (`server/`) e o jogo no navegador.
 *
 * O servidor é o juiz: guarda a partida, confere cada ação com o mesmo motor
 * de regras (`src/game/logic`) e envia a cada jogador só o que ele pode ver.
 * Documentação: docs/ONLINE.md.
 */
import type { BotLevel, GameState, TableSide } from '../game/state/game-types';

/** Caminho do Socket.IO no mesmo domínio do jogo (ex.: domimais.com.br/socket/). */
export const SOCKET_PATH = '/socket/';

/** Jogadores por sala. */
export const MIN_ROOM_PLAYERS = 2;
export const MAX_ROOM_PLAYERS = 4;

/** Tamanho do código da sala e as letras usadas (sem I, L, O, 0 e 1, que se confundem). */
export const ROOM_CODE_LENGTH = 5;
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Tempo de cada jogada de uma pessoa (decisão de 18/11/2026). */
export const TURN_SECONDS = 60;
/** Tempo que o servidor espera alguém reconectar antes de o computador assumir. */
export const RECONNECT_GRACE_SECONDS = 60;

/** Tamanho máximo do nome de um jogador. */
export const MAX_NAME_LENGTH = 20;

/** Chat: tamanho máximo de uma mensagem e quantas a sala guarda. */
export const CHAT_MAX_LENGTH = 200;
export const CHAT_HISTORY = 50;
/** Chat: no máximo `messages` mensagens a cada `seconds` segundos por jogador. */
export const CHAT_RATE = { messages: 5, seconds: 10 };

/** Mensagens rápidas (botões prontos do chat). */
export const QUICK_MESSAGES = {
  oi: 'Oi, pessoal!',
  boa: 'Boa jogada!',
  pensando: 'Pensando…',
  blefe: 'Será que é blefe?',
  ops: 'Ops!',
  haha: 'Haha!',
  vez: 'Sua vez!',
  gg: 'Boa partida!',
} as const;

export type QuickMessageId = keyof typeof QUICK_MESSAGES;

export interface ChatMessage {
  /** Número crescente dentro da sala. */
  id: number;
  /** Lugar de quem enviou. */
  seatId: string;
  name: string;
  text: string;
  /** Veio de um botão de mensagem rápida. */
  quick: boolean;
}

export interface ChatView {
  /** O dono da sala pode desligar o chat. */
  enabled: boolean;
  /** As últimas mensagens (no máximo `CHAT_HISTORY`). */
  messages: ChatMessage[];
}

export type RoomStatus = 'lobby' | 'playing' | 'finished';

/** Um lugar na mesa: uma pessoa ou o computador. */
export interface SeatView {
  /** Identificador público do lugar (não serve para reconectar). */
  id: string;
  name: string;
  kind: 'human' | 'bot';
  /** Nível do computador (lugar de computador) ou `null` (pessoa). */
  botLevel: BotLevel | null;
  /** A pessoa está conectada agora. Computadores estão sempre conectados. */
  connected: boolean;
  /** O computador está jogando no lugar desta pessoa (caiu ou saiu da partida). */
  takenOver: boolean;
  /** A pessoa saiu da partida pelo botão (o computador termina por ela). */
  left: boolean;
  isHost: boolean;
  isYou: boolean;
}

/** Tudo o que um jogador recebe sobre a sala. */
export interface RoomView {
  code: string;
  status: RoomStatus;
  seats: SeatView[];
  /** Índice do seu lugar (é também o seu índice em `game.players`). */
  youIndex: number;
  /**
   * A partida, do seu ponto de vista: suas peças e as da mesa abertas; as
   * demais aparecem viradas (`left` e `right` valem -1, só a soma é real).
   * Os ids das peças são embaralhados por sala e não revelam a peça.
   * Com a partida terminada, todas as peças vêm abertas.
   */
  game: GameState | null;
  /** Hora (relógio do servidor, em ms) em que a jogada atual se esgota, ou `null`. */
  turnDeadline: number | null;
  /** Hora do servidor no envio, para calcular o tempo restante sem depender do relógio do aparelho. */
  serverNow: number;
  /** Aviso para todos, como "Tempo esgotado para Ana". */
  notice: string | null;
  chat: ChatView;
}

/** Ações de jogo que um jogador envia. Os ids são os que vieram em `RoomView.game`. */
export type OnlineGameAction =
  | { type: 'CHOOSE_INITIAL_PIECE'; pieceId: string }
  | { type: 'DRAW_PIECE'; pieceId: string }
  | { type: 'PLAY_PIECE'; pieceId: string; position: TableSide }
  | { type: 'KEEP_PIECE' };

/** Resposta do servidor a um pedido. */
export type Ack<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/** Credencial para voltar à sala depois de cair (fica guardada no aparelho). */
export interface Session {
  code: string;
  token: string;
}

export interface ClientToServerEvents {
  'room:create': (payload: { name: string }, ack: (res: Ack<{ session: Session }>) => void) => void;
  'room:join': (payload: { code: string; name: string }, ack: (res: Ack<{ session: Session }>) => void) => void;
  'room:resume': (payload: Session, ack: (res: Ack) => void) => void;
  'room:leave': (ack: (res: Ack) => void) => void;
  'room:add-bot': (payload: { level: BotLevel }, ack: (res: Ack) => void) => void;
  'room:remove-seat': (payload: { seatId: string }, ack: (res: Ack) => void) => void;
  'room:start': (ack: (res: Ack) => void) => void;
  'room:restart': (ack: (res: Ack) => void) => void;
  'game:action': (payload: { action: OnlineGameAction }, ack: (res: Ack) => void) => void;
  /** Mensagem livre (`text`) ou rápida (`quick`). */
  'chat:send': (payload: { text: string } | { quick: QuickMessageId }, ack: (res: Ack) => void) => void;
  /** Só o dono da sala: liga ou desliga o chat. */
  'chat:set-enabled': (payload: { enabled: boolean }, ack: (res: Ack) => void) => void;
}

export interface ServerToClientEvents {
  /** Estado da sala, enviado a cada mudança. */
  'room:state': (view: RoomView) => void;
  /** A sala fechou ou você não faz mais parte dela. */
  'room:closed': (payload: { reason: string }) => void;
  /** Esta sessão foi aberta em outra aba ou aparelho. */
  'session:replaced': () => void;
}

/** Deixa um código digitado no formato da sala (maiúsculas, sem espaços e traços). */
export function normalizeRoomCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, '');
}
