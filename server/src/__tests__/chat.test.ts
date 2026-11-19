import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { seededRandom } from '../../../src/game/logic/__tests__/helpers';
import { CHAT_HISTORY, CHAT_RATE, QUICK_MESSAGES } from '../../../src/online/protocol';
import { ONLINE_BOT_DELAY_MS, Room } from '../room';
import type { Seat } from '../room';

function roomWith(names: string[]) {
  const views: number[] = [];
  const room = new Room('CHATS', { rng: seededRandom(3), onChange: (r) => views.push(r.messages.length) });
  const seats = names.map((name) => {
    const joined = room.join(name);
    if (!joined.ok) throw new Error(joined.error);
    return joined.seat;
  });
  return { room, seats, views };
}

const texts = (room: Room) => room.messages.map((m) => `${m.name}: ${m.text}`);

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('chat da sala', () => {
  it('mensagens livres e rápidas chegam a todos, com nome e em ordem', () => {
    const { room, seats } = roomWith(['Ana', 'Beto']);
    expect(room.sendChat(seats[0].id, { text: '  Oi,   gente!  ' })).toEqual({ ok: true });
    expect(room.sendChat(seats[1].id, { quick: 'boa' })).toEqual({ ok: true });
    expect(texts(room)).toEqual(['Ana: Oi, gente!', `Beto: ${QUICK_MESSAGES.boa}`]);
    expect(room.messages.map((m) => m.quick)).toEqual([false, true]);
    expect(room.messages.map((m) => m.id)).toEqual([1, 2]);
    // Todos recebem a conversa na visão da sala.
    expect(room.viewFor(seats[1].id)?.chat).toEqual({ enabled: true, messages: room.messages });
  });

  it('mensagem com palavra proibida não é entregue a ninguém', () => {
    const { room, seats, views } = roomWith(['Ana', 'Beto']);
    const before = views.length;
    expect(room.sendChat(seats[0].id, { text: 'seu p0rr4' })).toEqual({
      ok: false,
      error: 'Essa mensagem não foi enviada: ela tem palavras que não são permitidas aqui.',
    });
    expect(room.messages).toHaveLength(0);
    expect(views.length).toBe(before);
  });

  it('recusa mensagem vazia e longa demais', () => {
    const { room, seats } = roomWith(['Ana']);
    expect(room.sendChat(seats[0].id, { text: '   ' })).toEqual({ ok: false, error: 'Escreva uma mensagem.' });
    expect(room.sendChat(seats[0].id, { text: 'a'.repeat(201) }).ok).toBe(false);
    expect(room.sendChat(seats[0].id, { text: 'a'.repeat(200) }).ok).toBe(true);
  });

  it(`no máximo ${CHAT_RATE.messages} mensagens a cada ${CHAT_RATE.seconds} segundos por pessoa`, () => {
    const { room, seats } = roomWith(['Ana', 'Beto']);
    for (let i = 0; i < CHAT_RATE.messages; i++) expect(room.sendChat(seats[0].id, { quick: 'haha' }).ok).toBe(true);
    expect(room.sendChat(seats[0].id, { quick: 'haha' })).toEqual({
      ok: false,
      error: 'Calma! Espere alguns segundos para mandar outra mensagem.',
    });
    // O limite é de cada um.
    expect(room.sendChat(seats[1].id, { quick: 'oi' }).ok).toBe(true);
    vi.advanceTimersByTime(CHAT_RATE.seconds * 1000);
    expect(room.sendChat(seats[0].id, { quick: 'haha' }).ok).toBe(true);
  });

  it(`guarda só as últimas ${CHAT_HISTORY} mensagens`, () => {
    const { room, seats } = roomWith(['Ana', 'Beto', 'Caio', 'Dani']);
    for (let i = 0; i < 60; i++) {
      room.sendChat(seats[i % 4].id, { text: `mensagem ${i}` });
      if (i % 20 === 19) vi.advanceTimersByTime(CHAT_RATE.seconds * 1000);
    }
    expect(room.messages).toHaveLength(CHAT_HISTORY);
    expect(room.messages.at(-1)?.text).toBe('mensagem 59');
  });

  it('só o dono liga e desliga; desligado, ninguém envia', () => {
    const { room, seats } = roomWith(['Ana', 'Beto']);
    expect(room.setChatEnabled(seats[1].id, false)).toEqual({ ok: false, error: 'Só quem criou a sala pode fazer isso.' });
    expect(room.setChatEnabled(seats[0].id, false)).toEqual({ ok: true });
    expect(room.viewFor(seats[1].id)?.chat.enabled).toBe(false);
    expect(room.sendChat(seats[1].id, { quick: 'oi' })).toEqual({ ok: false, error: 'O dono da sala desligou o chat.' });
    expect(room.sendChat(seats[0].id, { quick: 'oi' }).ok).toBe(false);
    room.setChatEnabled(seats[0].id, true);
    expect(room.sendChat(seats[1].id, { quick: 'oi' }).ok).toBe(true);
  });

  it('quem saiu da partida não manda mais mensagens', () => {
    const { room, seats } = roomWith(['Ana', 'Beto', 'Caio']);
    room.start(seats[0].id);
    room.leave(seats[2].id);
    expect(room.sendChat(seats[2].id, { quick: 'oi' }).ok).toBe(false);
  });

  it('mensagens não atrasam a jogada do computador nem mudam o tempo de ninguém', () => {
    const { room, seats } = roomWith(['Ana']);
    room.addBot(seats[0].id, 'easy');
    room.start(seats[0].id);
    const botPlays = () => room.seats[room.game!.currentPlayerIndex].kind === 'bot';
    // Leva a partida até a vez do computador.
    for (let i = 0; i < 10 && !botPlays(); i++) vi.advanceTimersByTime(60_000);
    expect(botPlays()).toBe(true);
    const before = room.game;
    vi.advanceTimersByTime(ONLINE_BOT_DELAY_MS - 300);
    room.sendChat(seats[0].id, { quick: 'pensando' });
    room.sendChat(seats[0].id, { quick: 'haha' });
    vi.advanceTimersByTime(300);
    expect(room.game).not.toBe(before);
  });

  it('a conversa continua depois do "Jogar de novo"', () => {
    const { room, seats } = roomWith(['Ana', 'Beto']);
    room.sendChat(seats[1].id, { quick: 'gg' });
    room.start(seats[0].id);
    for (let i = 0; i < 400 && room.status === 'playing'; i++) vi.advanceTimersByTime(60_000);
    room.restart(seats[0].id);
    expect(texts(room)).toEqual([`Beto: ${QUICK_MESSAGES.gg}`]);
  });
});

export type { Seat };
