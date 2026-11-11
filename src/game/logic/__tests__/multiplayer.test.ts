import { describe, expect, it } from 'vitest';
import { confirmReady, drawPiece, keepPiece, playPiece } from '../engine';
import { getWinners } from '../selectors';
import { computeResult } from '../rules';
import { piece, scenario } from './helpers';

describe('partidas com 3 e 4 jogadores', () => {
  it('a vez gira na ordem dos jogadores e volta ao primeiro', () => {
    const pile = [piece(0, 0), piece(0, 1), piece(0, 2), piece(1, 1), piece(1, 2)];
    let state = scenario({ hands: [[], [], []], pile, protectTurns: false });
    const order = [state.currentPlayerIndex];

    for (const id of ['0-0', '0-1', '0-2', '1-1']) {
      state = keepPiece(drawPiece(state, id));
      order.push(state.currentPlayerIndex);
    }

    expect(order).toEqual([0, 1, 2, 0, 1]);
    expect(state.players.map((p) => p.hand.length)).toEqual([2, 1, 1]);
  });

  it('com 4 jogadores a troca de turno protegida vale para cada jogador', () => {
    const pile = [piece(0, 0), piece(0, 1), piece(0, 2)];
    let state = scenario({ hands: [[], [], [], []], pile, current: 3 });

    state = keepPiece(drawPiece(state, '0-0'));
    expect(state.phase).toBe('transition');
    expect(state.currentPlayerIndex).toBe(0);

    state = keepPiece(drawPiece(confirmReady(state), '0-1'));
    expect(state.phase).toBe('transition');
    expect(state.currentPlayerIndex).toBe(1);
  });

  it('monte vazio: pula todos os jogadores que não têm peça que encaixa', () => {
    // Ana joga [3|4]: pontas 4 e 5. Beto e Caio não encaixam; Dani tem [5|5].
    const state = playPiece(
      scenario({
        hands: [[piece(3, 4), piece(0, 0)], [piece(1, 1)], [piece(2, 2)], [piece(5, 5)]],
        protectTurns: false,
      }),
      '3-4',
      'left'
    );

    expect(state.currentPlayerIndex).toBe(3);
    expect(state.autoPassedPlayerIndexes).toEqual([1, 2]);
    expect(state.logs).toContain('Beto não tem peça que encaixa e passou a vez');
    expect(state.logs).toContain('Caio não tem peça que encaixa e passou a vez');
  });

  it('monte vazio: se só quem jogou ainda tem jogada, a vez volta para ele', () => {
    const state = playPiece(
      scenario({
        hands: [[piece(3, 4), piece(4, 4)], [piece(1, 1)], [piece(2, 2)]],
      }),
      '3-4',
      'left'
    );

    expect(state.currentPlayerIndex).toBe(0);
    expect(state.autoPassedPlayerIndexes).toEqual([1, 2]);
    expect(state.phase).toBe('playing');
  });

  it('vence quem fica sem peças, com qualquer número de jogadores', () => {
    const state = playPiece(
      scenario({
        hands: [[piece(1, 1)], [piece(2, 2)], [piece(3, 4)], [piece(6, 6)]],
        current: 2,
      }),
      '3-4',
      'left'
    );

    expect(state.phase).toBe('finished');
    expect(state.result).toEqual({
      reason: 'empty-hand',
      winnerIndexes: [2],
      scores: [2, 4, 0, 12],
    });
    expect(getWinners(state).map((p) => p.name)).toEqual(['Caio']);
  });

  it('jogo fechado: vence sozinho quem tem a menor soma', () => {
    const state = scenario({
      hands: [[piece(1, 1), piece(2, 2)], [piece(0, 1)], [piece(6, 6)], [piece(0, 2)]],
    });
    expect(computeResult(state)).toEqual({
      reason: 'blocked',
      winnerIndexes: [1],
      scores: [6, 1, 12, 2],
    });
  });

  it('jogo fechado: empate só entre os que têm a menor soma; os demais perdem', () => {
    // Ana joga [3|6]: pontas 6 e 5. Sobram Ana [1|1]=2, Beto [0|4]=4, Caio [0|2]=2.
    const state = playPiece(
      scenario({
        hands: [[piece(3, 6), piece(1, 1)], [piece(0, 4)], [piece(0, 2)]],
      }),
      '3-6',
      'left'
    );

    expect(state.phase).toBe('finished');
    expect(state.result).toEqual({ reason: 'blocked', winnerIndexes: [0, 2], scores: [2, 4, 2] });
    expect(getWinners(state).map((p) => p.name)).toEqual(['Ana', 'Caio']);
    expect(state.logs[state.logs.length - 1]).toBe('A partida terminou empatada entre Ana e Caio.');
  });

  it('mais de um jogador sem peças: empate entre eles', () => {
    const state = scenario({ hands: [[], [piece(1, 1)], [], [piece(2, 2)]] });
    expect(computeResult(state)).toMatchObject({ reason: 'empty-hand', winnerIndexes: [0, 2] });
  });
});
