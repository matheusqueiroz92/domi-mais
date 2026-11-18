import { describe, expect, it } from 'vitest';
import { gameReducer } from '../../state/game-reducer';
import { isValidSavedState } from '../../state/saved-game';
import { canKeepPiece, drawPiece, playPiece } from '../engine';
import { closedTableNumber, computeResult, placePiece } from '../rules';
import { closingOutcome, getPlayerView } from '../deduction';
import { getPlayHints } from '../hints';
import { chooseBotAction } from '../../ai/bot';
import type { BotLevel } from '../../state/game-types';
import { CLOSING_PIECE_ID, DOUBLE_CHAIN, closingGame, nearClosedTable, official } from './closed-table-helpers';
import { seededRandom, tableWith } from './helpers';

const close = (state: ReturnType<typeof closingGame>) => playPiece(state, CLOSING_PIECE_ID, 'right');

describe('mesa fechada (closedTableNumber)', () => {
  it('fecha quando as duas pontas são iguais e as 7 peças desse número estão na mesa', () => {
    const before = nearClosedTable();
    expect(closedTableNumber(before)).toBeNull(); // pontas 6 e 4
    const after = placePiece(before, official(4, 6), 'right')!;
    expect([after.leftEnd, after.rightEnd]).toEqual([6, 6]);
    expect(closedTableNumber(after)).toBe(6);
  });

  it('pontas iguais com peça desse número ainda fora da mesa: não fecha', () => {
    expect(closedTableNumber(tableWith(3, 3))).toBeNull(); // peça inicial 3|3
    const table = nearClosedTable();
    // Sem a 6|6 na mesa (trocada por outra), as pontas 6 e 6 ainda não fecham.
    const without = {
      ...table,
      leftEnd: 6,
      rightEnd: 6,
      pieces: table.pieces.filter((p) => !(p.left === 6 && p.right === 6)),
    };
    expect(closedTableNumber(without)).toBeNull();
  });

  it('mesa vazia não está fechada', () => {
    expect(closedTableNumber({ leftEnd: null, rightEnd: null, pieces: [] })).toBeNull();
  });
});

describe('fechar a mesa encerra a partida na hora, mesmo com peças no monte', () => {
  // Depois de jogar a 4|6: Ana 1|2 (3), Beto 5|5 4|4 (18), Caio 0|0 0|2 (2), Dani 3|3 1|1 (8).
  const fourPlayers = () =>
    closingGame({ hands: [[[4, 6], [1, 2]], [[5, 5], [4, 4]], [[0, 0], [0, 2]], [[3, 3], [1, 1]]] });

  it('4 jogadores: vence a menor soma, e o monte fica como estava', () => {
    const state = fourPlayers();
    const pileBefore = state.drawPile.length;
    expect(pileBefore).toBeGreaterThan(0);

    const end = close(state);
    expect(end.phase).toBe('finished');
    expect(end.result).toEqual({ reason: 'blocked', winnerIndexes: [2], scores: [3, 18, 2, 8], closedEnd: 6 });
    expect(end.drawPile).toHaveLength(pileBefore);
    expect(end.logs.slice(-2)).toEqual([
      'Jogo fechado! As duas pontas são 6 e todas as peças com 6 já estão na mesa.',
      'Caio venceu!',
    ]);
  });

  it('depois de fechada, ninguém compra nem joga mais', () => {
    const end = close(fourPlayers());
    expect(drawPiece(end, end.drawPile[0].id)).toBe(end);
    expect(gameReducer(end, { type: 'DRAW_PIECE', pieceId: end.drawPile[0].id })).toBe(end);
    expect(canKeepPiece(end)).toBe(false);
  });

  it('quem fecha pode ser o vencedor', () => {
    const end = close(closingGame({ hands: [[[4, 6], [0, 0]], [[5, 5]], [[0, 2]], [[3, 3]]] }));
    expect(end.result).toMatchObject({ reason: 'blocked', winnerIndexes: [0], closedEnd: 6 });
  });

  it('empate na menor soma continua sendo empate', () => {
    const end = close(closingGame({ hands: [[[4, 6], [1, 2]], [[5, 5]], [[0, 2]], [[1, 1]]] }));
    expect(end.result).toMatchObject({ reason: 'blocked', winnerIndexes: [2, 3], scores: [3, 10, 2, 2] });
  });

  it('jogador sem peças na mão vence, mesmo com soma maior dos outros menor', () => {
    const end = close(
      closingGame({ hands: [[[4, 6], [0, 0]], [], [[0, 3]], [[3, 3]]], emptyHandOrder: [1] })
    );
    expect(end.result).toMatchObject({ reason: 'empty-hand', winnerIndexes: [1], closedEnd: 6 });
  });

  it('quem fecha com a última peça vence por mão vazia', () => {
    const end = close(closingGame({ hands: [[[4, 6]], [[5, 5]], [[0, 0]], [[3, 3]]] }));
    expect(end.result).toMatchObject({ reason: 'empty-hand', winnerIndexes: [0], closedEnd: 6 });
  });

  it('com mais de uma mão vazia, vence quem ficou sem peças primeiro', () => {
    const end = close(closingGame({ hands: [[[4, 6]], [], [[0, 0]], [[3, 3]]], emptyHandOrder: [1] }));
    expect(end.result?.winnerIndexes).toEqual([1]);
    expect(end.emptyHandOrder).toEqual([1, 0]);
  });

  it.each([2, 3])('%i jogadores: também encerra na hora', (players) => {
    const hands: [number, number][][] = [[[4, 6], [1, 2]], [[5, 5]], [[0, 0]]].slice(0, players) as [
      number,
      number,
    ][][];
    const end = close(closingGame({ hands }));
    expect(end.phase).toBe('finished');
    expect(end.drawPile.length).toBeGreaterThan(0);
    expect(end.result?.closedEnd).toBe(6);
  });

  it('com o monte vazio, fechar também encerra (como antes)', () => {
    const end = close(closingGame({ hands: [[[4, 6], [1, 2]], [[5, 5]]], emptyPile: true }));
    expect(end.phase).toBe('finished');
    expect(end.result).toMatchObject({ reason: 'blocked', winnerIndexes: [0], closedEnd: 6 });
  });

  it('uma jogada comum com peças no monte não encerra', () => {
    // 2|4 na direita: pontas 6 e 2, a 4|6 ainda está fora da mesa.
    const state = closingGame({ hands: [[[4, 6], [2, 4]], [[5, 5]], [[0, 0]], [[3, 3]]] });
    const next = playPiece(state, official(2, 4).id, 'right');
    expect(next.phase).toBe('playing');
    expect(next.result).toBeNull();
    expect(computeResult(next)).toBeNull();
  });

  it('a partida montada para os testes é uma partida válida (até como partida salva)', () => {
    expect(isValidSavedState(fourPlayers())).toBe(true);
  });
});

describe('resultado de fechar a mesa visto pelo jogador (closingOutcome)', () => {
  const next = placePiece(nearClosedTable(), official(4, 6), 'right')!;
  const outcome = (hands: [number, number][][], emptyHandOrder: number[] = []) => {
    const state = closingGame({ hands, emptyHandOrder });
    const rest = state.players[0].hand.filter((p) => p.id !== CLOSING_PIECE_ID);
    return closingOutcome(getPlayerView(state, 0), rest, next);
  };

  it('compara a soma da mão com a soma dos versos de cada adversário', () => {
    expect(outcome([[[4, 6], [0, 0]], [[5, 5]], [[0, 2]]])).toBe('win');
    expect(outcome([[[4, 6], [1, 1]], [[5, 5]], [[0, 2]]])).toBe('tie');
    expect(outcome([[[4, 6], [1, 2]], [[5, 5]], [[0, 2]]])).toBe('lose');
  });

  it('adversário sem peças vence; ficar sem peças ao fechar vence', () => {
    expect(outcome([[[4, 6], [0, 0]], [], [[0, 2]]], [1])).toBe('lose');
    expect(outcome([[[4, 6]], [[5, 5]], [[0, 0]]])).toBe('win');
  });

  it('jogada que não fecha: null', () => {
    const state = closingGame({ hands: [[[4, 6]], [[5, 5]]] });
    expect(closingOutcome(getPlayerView(state, 0), [], nearClosedTable())).toBeNull();
  });
});

describe('modo dica com a mesa prestes a fechar', () => {
  it('avisa que a jogada fecha o jogo e se você vence', () => {
    const state = closingGame({ hands: [[[4, 6], [0, 0]], [[5, 5]], [[0, 2]]] });
    const { playable, suggestion } = getPlayHints(state, 0);
    expect(playable.find((p) => p.pieceId === CLOSING_PIECE_ID)?.closes).toBe('win');
    expect(suggestion).toMatchObject({
      pieceId: CLOSING_PIECE_ID,
      reason: 'fecha o jogo e você vence com a menor soma (0)',
    });
  });

  it('se fechar perde, a dica avisa e não sugere fechar quando há outra jogada', () => {
    // A bucha 6|6 é a única jogada e fecha dos dois lados: Ana fica com 3, Caio tem 0.
    const only = closingGame({
      hands: [[[6, 6], [1, 2]], [[5, 5]], [[0, 0]]],
      chain: DOUBLE_CHAIN,
      drawn: [6, 6],
    });
    const lose = getPlayHints(only, 0);
    expect(lose.playable[0].closes).toBe('lose');
    expect(lose.suggestion?.reason).toBe('é a única que encaixa, mas fecha o jogo e você perde pela soma');

    // A 4|6 na direita fecharia e perderia; na esquerda (pontas 4 e 4) não fecha.
    const other = getPlayHints(closingGame({ hands: [[[4, 6], [2, 4]], [[5, 5]], [[0, 0]]] }), 0);
    expect(other.suggestion).not.toMatchObject({ pieceId: CLOSING_PIECE_ID, side: 'right' });
  });
});

describe('computador com a mesa prestes a fechar', () => {
  const levels: BotLevel[] = ['medium', 'hard'];
  const asBot = (state: ReturnType<typeof closingGame>, level: BotLevel) => ({
    ...state,
    players: state.players.map((p, i) => (i === 0 ? { ...p, botLevel: level } : p)),
  });

  it.each(levels)('%s: fecha a mesa quando isso dá a vitória', (level) => {
    for (let seed = 1; seed <= 20; seed++) {
      const state = asBot(closingGame({ hands: [[[4, 6], [0, 0]], [[5, 5]], [[0, 2]]] }), level);
      expect(chooseBotAction(state, seededRandom(seed))).toEqual({
        type: 'PLAY_PIECE',
        pieceId: CLOSING_PIECE_ID,
        position: 'right',
      });
    }
  });

  it.each(levels)('%s: não fecha a mesa para perder quando tem outra jogada', (level) => {
    for (let seed = 1; seed <= 20; seed++) {
      const state = asBot(closingGame({ hands: [[[4, 6], [2, 4], [5, 3]], [[0, 3]], [[0, 0]]] }), level);
      const action = chooseBotAction(state, seededRandom(seed));
      expect(action).not.toEqual({ type: 'PLAY_PIECE', pieceId: CLOSING_PIECE_ID, position: 'right' });
    }
  });

  it.each(levels)('%s: só tendo a jogada que perde, fica com a peça comprada', (level) => {
    const state = asBot(
      closingGame({ hands: [[[6, 6], [1, 2]], [[0, 3]], [[0, 0]]], chain: DOUBLE_CHAIN, drawn: [6, 6] }),
      level
    );
    for (let seed = 1; seed <= 20; seed++) {
      expect(chooseBotAction(state, seededRandom(seed))).toEqual({ type: 'KEEP_PIECE' });
    }
  });
});

describe('mesa que fecha com a bucha', () => {
  it('a 6|6 nas pontas 6 e 6 fecha a mesa e encerra a partida', () => {
    const state = closingGame({
      hands: [[[6, 6], [0, 0]], [[5, 5]], [[0, 2]]],
      chain: DOUBLE_CHAIN,
      drawn: [6, 6],
    });
    expect(closedTableNumber(state.table)).toBeNull();
    const end = playPiece(state, official(6, 6).id, 'left');
    expect(end.phase).toBe('finished');
    expect(end.result).toMatchObject({ reason: 'blocked', winnerIndexes: [0], closedEnd: 6 });
  });
});
