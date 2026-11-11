import { describe, expect, it } from 'vitest';
import type { GameAction, GameState } from '../../state/game-types';
import { gameReducer } from '../../state/game-reducer';
import { createInitialGameState, createRandomSetup } from '../../state/game-inicial-state';
import { canKeepPiece } from '../engine';
import { handSum } from '../pieces';
import { getPlayableSides, hasPlayablePiece, isBlocked } from '../rules';
import type { RandomFn } from '../pieces';
import { seededRandom } from './helpers';

/** Todas as ações válidas no estado atual. */
function legalActions(state: GameState): GameAction[] {
  if (state.phase === 'setup') return [{ type: 'START_GAME' }];
  if (state.phase === 'transition') return [{ type: 'CONFIRM_READY' }];
  if (state.phase === 'choosing-initial') {
    return state.drawPile.map((p) => ({ type: 'CHOOSE_INITIAL_PIECE', pieceId: p.id }));
  }
  if (state.phase !== 'playing') return [];

  if (state.turnStep === 'draw') {
    return state.drawPile.map((p) => ({ type: 'DRAW_PIECE', pieceId: p.id }));
  }

  const actions: GameAction[] = [];
  for (const piece of state.players[state.currentPlayerIndex].hand) {
    const sides = getPlayableSides(piece, state.table);
    if (sides.left) actions.push({ type: 'PLAY_PIECE', pieceId: piece.id, position: 'left' });
    if (sides.right) actions.push({ type: 'PLAY_PIECE', pieceId: piece.id, position: 'right' });
  }
  if (canKeepPiece(state)) actions.push({ type: 'KEEP_PIECE' });
  return actions;
}

/** Invariantes que valem em qualquer momento da partida. */
function checkInvariants(state: GameState) {
  const all = [...state.drawPile, ...state.table.pieces, ...state.players.flatMap((p) => p.hand)];
  expect(all).toHaveLength(28);
  expect(new Set(all.map((p) => p.id)).size).toBe(28);
  expect(new Set(all.map((p) => [p.left, p.right].sort().join('-'))).size).toBe(28);

  const { pieces, leftEnd, rightEnd } = state.table;
  if (pieces.length > 0) {
    expect(leftEnd).toBe(pieces[0].left);
    expect(rightEnd).toBe(pieces[pieces.length - 1].right);
    for (let i = 1; i < pieces.length; i++) {
      expect(pieces[i].left).toBe(pieces[i - 1].right);
    }
  }
}

function playRandomGame(rng: RandomFn, protectTurns: boolean): GameState {
  let state = createInitialGameState('Ana', 'Beto', {
    ...(() => {
      const { shuffledPieces, startingPlayerIndex } = createRandomSetup(rng);
      return { pieces: shuffledPieces, startingPlayerIndex };
    })(),
    protectTurns,
  });

  for (let step = 0; step < 500 && state.phase !== 'finished'; step++) {
    const actions = legalActions(state);
    // O jogo nunca pode travar: sempre há ao menos uma ação válida.
    expect(actions.length).toBeGreaterThan(0);

    if (state.phase === 'playing' && state.turnStep === 'play' && state.drawnPieceId === null) {
      // Turno sem compra (monte vazio): o jogador da vez sempre tem peça que encaixa.
      expect(state.drawPile).toHaveLength(0);
      expect(hasPlayablePiece(state.players[state.currentPlayerIndex].hand, state.table)).toBe(true);
    }

    const next = gameReducer(state, actions[Math.floor(rng() * actions.length)]);
    expect(next).not.toBe(state);
    state = next;
    checkInvariants(state);
  }

  return state;
}

describe('simulação de partidas completas', () => {
  it.each([true, false])(
    '300 partidas aleatórias sempre terminam com resultado coerente (protectTurns=%s)',
    (protectTurns) => {
      const reasons = new Set<string>();
      let ties = 0;

      for (let seed = 1; seed <= 300; seed++) {
        const state = playRandomGame(seededRandom(seed), protectTurns);

        expect(state.phase).toBe('finished');
        expect(state.drawPile).toHaveLength(0);

        const result = state.result!;
        const scores = state.players.map((p) => handSum(p.hand));
        expect(result.scores).toEqual(scores);
        expect(state.players.map((p) => p.score)).toEqual(scores);
        reasons.add(result.reason);

        if (result.reason === 'empty-hand') {
          expect(state.players.some((p) => p.hand.length === 0)).toBe(true);
        } else {
          expect(isBlocked(state.players, state.table)).toBe(true);
          expect(state.players.every((p) => p.hand.length > 0)).toBe(true);
        }

        if (result.winnerIndex === null) {
          ties++;
          expect(scores[0]).toBe(scores[1]);
        } else {
          const winner = state.players[result.winnerIndex];
          const loser = state.players[1 - result.winnerIndex];
          if (result.reason === 'empty-hand') {
            // Mão vazia vence mesmo que o adversário só tenha o [0|0] (soma 0).
            expect(winner.hand).toHaveLength(0);
            expect(loser.hand.length).toBeGreaterThan(0);
          } else {
            expect(handSum(winner.hand)).toBeLessThan(handSum(loser.hand));
          }
        }
      }

      // As duas formas de terminar aparecem na amostra.
      expect(reasons).toEqual(new Set(['empty-hand', 'blocked']));
      expect(ties).toBeGreaterThanOrEqual(0);
    }
  );
});
