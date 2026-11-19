import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { seededRandom } from '../../../src/game/logic/__tests__/helpers';
import { RECONNECT_GRACE_SECONDS, TURN_SECONDS } from '../../../src/online/protocol';
import type { RoomView } from '../../../src/online/protocol';
import { ONLINE_BOT_DELAY_MS, Room } from '../room';
import type { RoomOptions } from '../room';
import { RoomManager } from '../room-manager';
import { expectNoLeak, simulatedHumanAction } from './test-utils';

const TURN_MS = TURN_SECONDS * 1000;
const GRACE_MS = RECONNECT_GRACE_SECONDS * 1000;

/** Sala com registro de tudo o que seria enviado a cada jogador. */
function makeRoom(options: RoomOptions = {}) {
  const sent: RoomView[] = [];
  const removed: string[] = [];
  const closed: string[] = [];
  const room = new Room('ABCDE', {
    rng: seededRandom(7),
    ...options,
    onChange: (r) => {
      for (const seat of r.seats) {
        const view = r.viewFor(seat.id)!;
        expectNoLeak(view);
        sent.push(view);
      }
    },
    onSeatRemoved: (_r, seat, reason) => removed.push(`${seat.name}: ${reason}`),
    onClosed: (_r, reason) => closed.push(reason),
  });
  return { room, sent, removed, closed };
}

function joinAll(room: Room, names: string[]) {
  return names.map((name) => {
    const joined = room.join(name);
    if (!joined.ok) throw new Error(joined.error);
    return joined.seat;
  });
}

const wait = (ms: number) => vi.advanceTimersByTime(ms);

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('sala de espera', () => {
  it('quem cria é o dono; outros entram até 4 lugares', () => {
    const { room } = makeRoom();
    const [ana, beto] = joinAll(room, ['Ana', 'Beto']);
    expect(room.hostId).toBe(ana.id);
    expect(room.viewFor(beto.id)?.seats.map((s) => [s.name, s.isHost, s.isYou])).toEqual([
      ['Ana', true, false],
      ['Beto', false, true],
    ]);
    joinAll(room, ['Caio', 'Dani']);
    expect(room.join('Edu')).toEqual({ ok: false, error: 'A sala já está cheia.' });
  });

  it('nomes repetidos ganham número', () => {
    const { room } = makeRoom();
    joinAll(room, ['Ana', 'ana']);
    expect(room.seats.map((s) => s.name)).toEqual(['Ana', 'ana 2']);
  });

  it('só o dono completa vagas com o computador, com nomes diferentes dos jogadores', () => {
    const { room } = makeRoom();
    const [ana, bia] = joinAll(room, ['Ana', 'Bia']);
    expect(room.addBot(bia.id, 'easy')).toEqual({ ok: false, error: 'Só quem criou a sala pode fazer isso.' });
    expect(room.addBot(ana.id, 'hard')).toEqual({ ok: true });
    expect(room.addBot(ana.id, 'easy')).toEqual({ ok: true });
    expect(room.seats.map((s) => [s.name, s.kind, s.botLevel])).toEqual([
      ['Ana', 'human', null],
      ['Bia', 'human', null],
      ['Léo', 'bot', 'hard'],
      ['Duda', 'bot', 'easy'],
    ]);
    expect(room.addBot(ana.id, 'easy')).toEqual({ ok: false, error: 'A sala já está cheia.' });
  });

  it('o dono tira computadores e pessoas; quem é tirado é avisado', () => {
    const { room, removed } = makeRoom();
    const [ana, beto] = joinAll(room, ['Ana', 'Beto']);
    room.addBot(ana.id, 'medium');
    const bot = room.seats[2];
    expect(room.removeSeat(ana.id, bot.id)).toEqual({ ok: true });
    expect(room.removeSeat(ana.id, ana.id).ok).toBe(false);
    expect(room.removeSeat(ana.id, beto.id)).toEqual({ ok: true });
    expect(room.seats.map((s) => s.name)).toEqual(['Ana']);
    expect(removed).toEqual(['Beto: Quem criou a sala tirou você dela.']);
  });

  it('começar exige 2 lugares e só o dono começa; depois ninguém mais entra', () => {
    const { room } = makeRoom();
    const [ana] = joinAll(room, ['Ana']);
    expect(room.start(ana.id).ok).toBe(false);
    const [beto] = joinAll(room, ['Beto']);
    expect(room.start(beto.id).ok).toBe(false);
    expect(room.start(ana.id)).toEqual({ ok: true });
    expect(room.status).toBe('playing');
    expect(room.game?.phase).toBe('choosing-initial');
    expect(room.game?.protectTurns).toBe(false);
    expect(room.join('Caio').ok).toBe(false);
  });

  it('dono que sai passa a sala para o próximo; sala sem pessoas fecha', () => {
    const { room, closed } = makeRoom();
    const [ana, beto] = joinAll(room, ['Ana', 'Beto']);
    room.addBot(ana.id, 'easy');
    room.leave(ana.id);
    expect(room.hostId).toBe(beto.id);
    room.leave(beto.id);
    expect(room.closed).toBe(true);
    expect(closed).toEqual(['Todos saíram da sala.']);
  });

  it('quem cai na sala de espera tem 1 minuto para voltar; depois sai da sala', () => {
    const { room, removed } = makeRoom();
    const [ana, beto] = joinAll(room, ['Ana', 'Beto']);
    room.disconnect(beto.id);
    wait(GRACE_MS - 1);
    expect(room.resume(beto.token).ok).toBe(true);
    room.disconnect(beto.id);
    wait(GRACE_MS);
    expect(room.seats.map((s) => s.id)).toEqual([ana.id]);
    expect(removed).toEqual(['Beto: Você ficou muito tempo sem conexão e saiu da sala.']);
    expect(room.resume(beto.token)).toEqual({ ok: false, error: 'Você não faz mais parte desta sala.' });
  });
});

describe('partida', () => {
  function started(names = ['Ana', 'Beto'], bots = 0) {
    const ctx = makeRoom();
    const seats = joinAll(ctx.room, names);
    for (let i = 0; i < bots; i++) ctx.room.addBot(seats[0].id, 'medium');
    ctx.room.start(seats[0].id);
    return { ...ctx, seats };
  }

  const currentSeat = (room: Room) => room.seats[room.game!.currentPlayerIndex];
  const viewOf = (room: Room, seatId: string) => room.viewFor(seatId)!;

  it('só quem está na vez joga, e só com os apelidos que recebeu', () => {
    const { room } = started();
    const me = currentSeat(room);
    const other = room.seats.find((s) => s.id !== me.id)!;
    const pile = viewOf(room, me.id).game!.drawPile;

    expect(room.act(other.id, { type: 'CHOOSE_INITIAL_PIECE', pieceId: pile[0].id })).toEqual({
      ok: false,
      error: 'Não é a sua vez.',
    });
    // Id real não vale: só o apelido.
    expect(room.act(me.id, { type: 'CHOOSE_INITIAL_PIECE', pieceId: room.game!.drawPile[0].id })).toEqual({
      ok: false,
      error: 'Jogada inválida.',
    });
    expect(room.act(me.id, { type: 'CHOOSE_INITIAL_PIECE', pieceId: pile[0].id })).toEqual({ ok: true });
    expect(room.game!.table.pieces).toHaveLength(1);
    expect(room.act(me.id, { type: 'KEEP_PIECE' }).ok).toBe(false);
  });

  it('cada pessoa tem 60 segundos; o prazo é o mesmo para comprar e jogar', () => {
    const { room } = started();
    const first = currentSeat(room);
    expect(viewOf(room, first.id).turnDeadline).toBe(Date.now() + TURN_MS);
    wait(10_000);
    room.act(first.id, { type: 'CHOOSE_INITIAL_PIECE', pieceId: viewOf(room, first.id).game!.drawPile[0].id });

    const second = currentSeat(room);
    const deadline = Date.now() + TURN_MS;
    expect(room.turnDeadline).toBe(deadline);
    wait(20_000);
    room.act(second.id, { type: 'DRAW_PIECE', pieceId: viewOf(room, second.id).game!.drawPile[0].id });
    // Comprar não renova o prazo.
    expect(room.turnDeadline).toBe(deadline);
  });

  it('tempo esgotado: compra uma peça ao acaso e fica com ela', () => {
    const { room } = started();
    const first = currentSeat(room);
    wait(TURN_MS);
    // Peça inicial escolhida ao acaso.
    expect(room.game!.table.pieces).toHaveLength(1);
    expect(room.notice).toBe(`Tempo esgotado para ${first.name}.`);

    const second = currentSeat(room);
    const hand = room.game!.players[room.game!.currentPlayerIndex].hand.length;
    wait(TURN_MS);
    expect(room.game!.players[room.seats.indexOf(second)].hand).toHaveLength(hand + 1);
    expect(room.game!.drawPile).toHaveLength(26);
    expect(currentSeat(room).id).not.toBe(second.id);
    expect(room.notice).toBe(`Tempo esgotado para ${second.name}.`);
  });

  it('tempo esgotado depois de comprar: fica com a peça', () => {
    const { room } = started();
    wait(TURN_MS); // peça inicial
    const second = currentSeat(room);
    room.act(second.id, { type: 'DRAW_PIECE', pieceId: viewOf(room, second.id).game!.drawPile[0].id });
    wait(TURN_MS);
    expect(currentSeat(room).id).not.toBe(second.id);
  });

  it('o computador joga sozinho, uma ação de cada vez, com pausa', () => {
    const { room, seats } = started(['Ana'], 1);
    if (currentSeat(room).id === seats[0].id) {
      room.act(seats[0].id, { type: 'CHOOSE_INITIAL_PIECE', pieceId: viewOf(room, seats[0].id).game!.drawPile[0].id });
    } else {
      wait(ONLINE_BOT_DELAY_MS); // computador escolhe a peça inicial
    }
    // Vez do computador? Ele compra e depois joga ou fica com a peça.
    if (currentSeat(room).kind === 'bot') {
      expect(room.turnDeadline).toBeNull();
      wait(ONLINE_BOT_DELAY_MS - 1);
      expect(room.game!.turnStep).toBe('draw');
      wait(1);
      expect(room.game!.turnStep).toBe('play');
      wait(ONLINE_BOT_DELAY_MS);
    }
    expect(currentSeat(room).id).toBe(seats[0].id);
    expect(room.turnDeadline).not.toBeNull();
  });

  it('quem cai tem 1 minuto; depois o computador joga por ele até a volta', () => {
    const { room } = started(['Ana', 'Beto', 'Caio']);
    const faller = currentSeat(room);
    room.disconnect(faller.id);
    expect(viewOf(room, faller.id).seats.find((s) => s.id === faller.id)?.connected).toBe(false);
    wait(GRACE_MS);
    expect(faller.takenOver).toBe(true);
    expect(room.notice).toBe(`${faller.name} perdeu a conexão. O computador joga por ${faller.name} até a volta.`);
    // O computador fez a jogada da peça inicial por ele.
    wait(ONLINE_BOT_DELAY_MS);
    expect(room.game!.table.pieces).toHaveLength(1);

    expect(room.resume(faller.token).ok).toBe(true);
    expect(faller.takenOver).toBe(false);
    expect(room.notice).toBe(`${faller.name} voltou para a partida.`);
  });

  it('quem sai pelo botão vira computador até o fim; se todos saem, a sala fecha', () => {
    const { room, seats, closed } = started(['Ana', 'Beto']);
    room.leave(seats[1].id);
    expect(seats[1].left).toBe(true);
    expect(seats[1].takenOver).toBe(true);
    expect(room.resume(seats[1].token).ok).toBe(false);
    room.leave(seats[0].id);
    expect(room.closed).toBe(true);
    expect(closed).toEqual(['Todos saíram da sala.']);
  });

  it.each([2, 3, 4])('partida inteira com %i jogadores (pessoas simuladas e computadores) vai até o fim sem vazar nada', (players) => {
    const humans = ['Ana', 'Beto', 'Caio', 'Dani'].slice(0, Math.ceil(players / 2));
    const { room, sent } = started(humans, players - humans.length);
    const rng = seededRandom(players * 13);

    for (let step = 0; step < 2000 && room.status === 'playing'; step++) {
      const seat = currentSeat(room);
      if (seat.kind === 'bot') {
        wait(ONLINE_BOT_DELAY_MS);
        continue;
      }
      const action = simulatedHumanAction(viewOf(room, seat.id), rng);
      expect(action).not.toBeNull();
      expect(room.act(seat.id, action!)).toEqual({ ok: true });
    }

    expect(room.status).toBe('finished');
    expect(room.game!.result).not.toBeNull();
    expect(room.turnDeadline).toBeNull();
    // No fim, todos recebem as mãos abertas e o mesmo resultado.
    const finals = room.seats.map((s) => viewOf(room, s.id));
    for (const view of finals) expect(view.game!.result).toEqual(room.game!.result);
    expect(sent.length).toBeGreaterThan(10);
  });

  it('depois do fim, o dono volta todos para a sala de espera e quem saiu não volta', () => {
    const { room, seats } = started(['Ana', 'Beto', 'Caio']);
    room.leave(seats[2].id);
    for (let step = 0; step < 3000 && room.status === 'playing'; step++) wait(TURN_MS);
    expect(room.status).toBe('finished');
    expect(room.restart(seats[1].id).ok).toBe(false);
    expect(room.restart(seats[0].id)).toEqual({ ok: true });
    expect(room.status).toBe('lobby');
    expect(room.seats.map((s) => s.name)).toEqual(['Ana', 'Beto']);
    expect(room.start(seats[0].id)).toEqual({ ok: true });
  });
});

describe('gerenciador de salas', () => {
  it('cria salas com códigos de 5 letras sem caracteres confusos e acha pelo código digitado', () => {
    const manager = new RoomManager();
    const created = manager.create('Ana');
    if (!created.ok) throw new Error(created.error);
    expect(created.room.code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{5}$/);
    const typed = `${created.room.code.slice(0, 2).toLowerCase()}-${created.room.code.slice(2)}`;
    expect(manager.get(typed)).toBe(created.room);
    expect(manager.get('ZZZZZ')).toBeUndefined();
  });

  it('respeita o limite de salas', () => {
    const manager = new RoomManager({ maxRooms: 1 });
    expect(manager.create('Ana').ok).toBe(true);
    expect(manager.create('Beto').ok).toBe(false);
  });

  it('fecha salas vazias depois de 10 minutos e salas paradas depois de 3 horas', () => {
    const closed: string[] = [];
    const manager = new RoomManager({ onClosed: (room) => closed.push(room.code) });
    const empty = manager.create('Ana');
    const busy = manager.create('Beto');
    if (!empty.ok || !busy.ok) throw new Error('sala');
    empty.room.disconnect(empty.seat.id);

    wait(9 * 60 * 1000);
    expect(manager.sweep()).toBe(0);
    wait(60 * 1000);
    // Na sala de espera, quem caiu já saiu depois de 1 minuto e a sala fechou sozinha.
    expect(closed).toContain(empty.room.code);
    expect(manager.rooms.has(empty.room.code)).toBe(false);

    wait(3 * 60 * 60 * 1000);
    expect(manager.sweep()).toBe(1);
    expect(manager.rooms.size).toBe(0);
  });

  it('partida em que todos caíram fecha depois de 10 minutos', () => {
    const manager = new RoomManager();
    const created = manager.create('Ana');
    if (!created.ok) throw new Error('sala');
    created.room.addBot(created.seat.id, 'easy');
    created.room.start(created.seat.id);
    created.room.disconnect(created.seat.id);
    wait(10 * 60 * 1000);
    expect(manager.sweep()).toBe(1);
    expect(created.room.closed).toBe(true);
  });
});
