/**
 * Todas as salas abertas no servidor: cria com código novo, encontra pelo
 * código e fecha as abandonadas.
 */
import { randomInt } from 'node:crypto';
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH, normalizeRoomCode } from '../../src/online/protocol';
import { Room } from './room';
import type { Result, RoomOptions, Seat } from './room';

/** Sala sem nenhuma pessoa conectada fecha depois deste tempo. */
export const EMPTY_ROOM_MS = 10 * 60 * 1000;
/** Sala sem nenhuma ação fecha depois deste tempo, mesmo com gente conectada. */
export const IDLE_ROOM_MS = 3 * 60 * 60 * 1000;
/** Limite de salas abertas ao mesmo tempo (protege a memória do servidor). */
export const MAX_ROOMS = 1000;

export interface RoomManagerOptions extends RoomOptions {
  maxRooms?: number;
  emptyRoomMs?: number;
  idleRoomMs?: number;
}

export class RoomManager {
  readonly rooms = new Map<string, Room>();
  private readonly options: RoomManagerOptions;

  constructor(options: RoomManagerOptions = {}) {
    this.options = options;
  }

  /** Abre uma sala nova com `hostName` como dono. */
  create(hostName: string): Result<{ room: Room; seat: Seat }> {
    if (this.rooms.size >= (this.options.maxRooms ?? MAX_ROOMS)) {
      return { ok: false, error: 'O servidor está cheio agora. Tente de novo em alguns minutos.' };
    }
    const room = new Room(this.newCode(), {
      ...this.options,
      onClosed: (closed, reason) => {
        this.rooms.delete(closed.code);
        this.options.onClosed?.(closed, reason);
      },
    });
    this.rooms.set(room.code, room);
    const joined = room.join(hostName);
    if (!joined.ok) {
      room.close('Erro ao criar a sala.');
      return joined;
    }
    return { ok: true, room, seat: joined.seat };
  }

  /** Sala pelo código digitado (aceita minúsculas, espaços e traços). */
  get(code: string): Room | undefined {
    return this.rooms.get(normalizeRoomCode(code));
  }

  /** Fecha salas abandonadas. Devolve quantas fechou. */
  sweep(now = Date.now()): number {
    const emptyMs = this.options.emptyRoomMs ?? EMPTY_ROOM_MS;
    const idleMs = this.options.idleRoomMs ?? IDLE_ROOM_MS;
    let closed = 0;
    for (const room of [...this.rooms.values()]) {
      const empty = !room.hasConnectedHuman() && now - room.lastHumanSeen >= emptyMs;
      const idle = now - room.lastActivity >= idleMs;
      if (empty || idle) {
        room.close(empty ? 'A sala ficou vazia e foi fechada.' : 'A sala ficou parada por muito tempo e foi fechada.');
        closed++;
      }
    }
    return closed;
  }

  /** Fecha todas as salas (desligamento do servidor). */
  closeAll(reason: string): void {
    for (const room of [...this.rooms.values()]) room.close(reason);
  }

  private newCode(): string {
    for (;;) {
      let code = '';
      for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
        code += ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)];
      }
      if (!this.rooms.has(code)) return code;
    }
  }
}
