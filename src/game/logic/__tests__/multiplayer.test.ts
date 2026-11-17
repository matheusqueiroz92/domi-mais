import { describe, expect, it } from 'vitest';
import { chooseInitialPiece, confirmReady, drawPiece, keepPiece, playPiece, startGame } from '../engine';
import { createInitialGameState, createRandomSetup } from '../../state/game-inicial-state';
import type { GameState } from '../../state/game-types';
import { getWinners } from '../selectors';
import { computeResult, getPlayableSides } from '../rules';
import { piece, scenario, seededRandom } from './helpers';

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

  it('mais de um jogador sem peças: vence quem ficou sem peças primeiro', () => {
    const state = scenario({ hands: [[], [piece(1, 1)], [], [piece(2, 2)]] });
    expect(computeResult({ ...state, emptyHandOrder: [2, 0] })).toMatchObject({
      reason: 'empty-hand',
      winnerIndexes: [2],
    });
  });
});

describe('monte acaba com mais de um jogador sem peças (não há empate)', () => {
  // Mesa 3|5. Quatro jogadores, sem troca de turno protegida.
  const start = (pile: ReturnType<typeof piece>[], hands = [[], [], [piece(1, 1)], [piece(2, 2)]]) =>
    scenario({ hands, pile, protectTurns: false });

  it('dois jogadores jogam a última peça em turnos seguidos: vence o primeiro', () => {
    let state = start([piece(3, 4), piece(5, 6), piece(0, 0)]);

    state = drawPiece(state, '3-4');
    state = playPiece(state, '3-4', 'left'); // Ana fica sem peças
    expect(state.emptyHandOrder).toEqual([0]);

    state = drawPiece(state, '5-6');
    state = playPiece(state, '5-6', 'right'); // Beto fica sem peças depois
    expect(state.emptyHandOrder).toEqual([0, 1]);
    expect(state.phase).toBe('playing'); // ainda há monte: a partida segue

    state = drawPiece(state, '0-0'); // Caio compra a última peça do monte
    state = keepPiece(state);

    expect(state.phase).toBe('finished');
    expect(state.result).toMatchObject({ reason: 'empty-hand', winnerIndexes: [0] });
    expect(getWinners(state).map((player) => player.name)).toEqual(['Ana']);
    expect(state.logs.at(-1)).toBe('Ana venceu!');
  });

  it('quem compra de novo sai da fila: vale a última vez que ficou sem peças', () => {
    // Ana fica sem peças, Beto também; Ana compra e joga de novo (vai para o
    // fim da fila). O monte acaba com os dois sem peças: vence Beto.
    let state = start(
      [piece(3, 4), piece(5, 6), piece(0, 0), piece(0, 1), piece(4, 4)],
      [[], [], [piece(1, 1)], [piece(2, 2)]]
    );
    state = playPiece(drawPiece(state, '3-4'), '3-4', 'left'); // Ana: pontas 4 e 5
    state = playPiece(drawPiece(state, '5-6'), '5-6', 'right'); // Beto: pontas 4 e 6
    state = keepPiece(drawPiece(state, '0-0')); // Caio
    state = keepPiece(drawPiece(state, '0-1')); // Dani
    expect(state.emptyHandOrder).toEqual([0, 1]);

    state = drawPiece(state, '4-4'); // Ana compra a última peça: sai da fila
    expect(state.emptyHandOrder).toEqual([1]);
    state = playPiece(state, '4-4', 'left'); // e fica sem peças de novo, depois de Beto

    expect(state.phase).toBe('finished');
    expect(state.emptyHandOrder).toEqual([1, 0]);
    expect(state.result?.winnerIndexes).toEqual([1]);
  });

  it('quem estava sem peças e compra uma que não joga deixa de vencer', () => {
    let state = start([piece(3, 4), piece(0, 0)], [[], [piece(2, 2)], [piece(1, 1)], [piece(0, 1)]]);
    state = playPiece(drawPiece(state, '3-4'), '3-4', 'left'); // Ana sem peças
    state = keepPiece(drawPiece(state, '0-0')); // Beto compra a última
    expect(state.result?.winnerIndexes).toEqual([0]);
    expect(state.result?.scores).toEqual([0, 4, 2, 1]);
  });

  it('partidas inteiras simuladas nunca terminam empatadas por mão vazia', () => {
    for (let seed = 1; seed <= 300; seed++) {
      for (const players of [2, 3, 4]) {
        const final = playRandomGame(players, seed);
        expect(final.phase).toBe('finished');
        if (final.result?.reason === 'empty-hand') {
          expect(final.result.winnerIndexes, `semente ${seed}, ${players} jogadores`).toHaveLength(1);
          const [winner] = final.result.winnerIndexes;
          expect(final.players[winner].hand).toHaveLength(0);
        }
        // A fila tem exatamente os jogadores de mão vazia.
        const empty = final.players.flatMap((p, i) => (p.hand.length === 0 ? [i] : []));
        expect([...final.emptyHandOrder].sort()).toEqual(empty);
      }
    }
  });
});

/** Partida completa com jogadas aleatórias válidas (sempre joga quando pode). */
function playRandomGame(playerCount: number, seed: number): GameState {
  const rng = seededRandom(seed);
  const pick = <T,>(items: readonly T[]) => items[Math.floor(rng() * items.length)];
  const { shuffledPieces, startingPlayerIndex } = createRandomSetup(playerCount, rng);
  let state = startGame(
    createInitialGameState(['Ana', 'Beto', 'Caio', 'Dani'].slice(0, playerCount), {
      pieces: shuffledPieces,
      startingPlayerIndex,
      protectTurns: false,
    })
  );
  state = chooseInitialPiece(state, pick(state.drawPile).id);
  for (let step = 0; step < 2000 && state.phase === 'playing'; step++) {
    if (state.turnStep === 'draw') {
      state = drawPiece(state, pick(state.drawPile).id);
      continue;
    }
    const hand = state.players[state.currentPlayerIndex].hand;
    const moves = hand.flatMap((p) => {
      const sides = getPlayableSides(p, state.table);
      return (['left', 'right'] as const).filter((side) => sides[side]).map((side) => ({ id: p.id, side }));
    });
    if (moves.length > 0) {
      const move = pick(moves);
      state = playPiece(state, move.id, move.side);
    } else {
      state = keepPiece(state);
    }
  }
  return state;
}
