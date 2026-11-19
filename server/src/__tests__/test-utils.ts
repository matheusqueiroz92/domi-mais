import { expect } from 'vitest';
import type { GameState } from '../../../src/game/state/game-types';
import type { OnlineGameAction, RoomView } from '../../../src/online/protocol';
import { chooseBotAction } from '../../../src/game/ai/bot';
import type { RandomFn } from '../../../src/game/logic/pieces';

/**
 * Confere que a visão de um jogador não vaza nada escondido: peças dos
 * outros e do monte viradas (só a soma) e nenhum id real (`piece-N`).
 */
export function expectNoLeak(view: RoomView): void {
  const game = view.game;
  if (!game) return;
  expect(JSON.stringify(view)).not.toMatch(/piece-\d+/);
  if (game.phase === 'finished') return;
  game.players.forEach((player, index) => {
    for (const piece of player.hand) {
      if (index === view.youIndex) {
        expect(piece.left).toBeGreaterThanOrEqual(0);
      } else {
        expect([piece.left, piece.right]).toEqual([-1, -1]);
      }
    }
  });
  for (const piece of game.drawPile) expect([piece.left, piece.right]).toEqual([-1, -1]);
  for (const piece of game.table.pieces) expect(piece.left).toBeGreaterThanOrEqual(0);
  expect(game.selectedPieceId).toBeNull();
}

/**
 * Jogada de uma pessoa simulada, escolhida só com o que ela vê (a mesma
 * tática do computador médio). Prova que a visão basta para jogar.
 */
export function simulatedHumanAction(view: RoomView, rng: RandomFn): OnlineGameAction | null {
  const game = view.game as GameState;
  if (!game || game.currentPlayerIndex !== view.youIndex) return null;
  const asBot = {
    ...game,
    players: game.players.map((p, i) => (i === view.youIndex ? { ...p, botLevel: 'medium' as const } : p)),
  };
  const action = chooseBotAction(asBot, rng);
  if (!action) return null;
  switch (action.type) {
    case 'CHOOSE_INITIAL_PIECE':
    case 'DRAW_PIECE':
      return { type: action.type, pieceId: action.pieceId };
    case 'PLAY_PIECE':
      return { type: 'PLAY_PIECE', pieceId: action.pieceId, position: action.position };
    case 'KEEP_PIECE':
      return { type: 'KEEP_PIECE' };
    default:
      return null;
  }
}
