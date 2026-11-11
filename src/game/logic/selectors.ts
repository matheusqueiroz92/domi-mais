/** Leituras derivadas do estado, usadas pela interface. */
import type { DominoPiece, GameState, Player, TableSide } from '../state/game-types';
import { getPlayableSides } from './rules';

export function getCurrentPlayer(state: GameState): Player {
  return state.players[state.currentPlayerIndex];
}

/** Peça selecionada na mão do jogador da vez (ou `null`). */
export function getSelectedPiece(state: GameState): DominoPiece | null {
  if (state.selectedPieceId === null) return null;
  return getCurrentPlayer(state).hand.find((p) => p.id === state.selectedPieceId) ?? null;
}

/** O jogador da vez precisa comprar uma peça do monte agora? */
export function mustDraw(state: GameState): boolean {
  return state.phase === 'playing' && state.turnStep === 'draw';
}

/** Pontas em que a peça selecionada pode ser jogada agora. */
export function getSelectedPlayableSides(state: GameState): Record<TableSide, boolean> {
  const piece = getSelectedPiece(state);
  if (!piece || state.phase !== 'playing' || state.turnStep !== 'play') {
    return { left: false, right: false };
  }
  return getPlayableSides(piece, state.table);
}

/**
 * Vencedores da partida encerrada: um jogador (vitória) ou vários (empate
 * entre eles). Lista vazia enquanto a partida está em andamento.
 */
export function getWinners(state: GameState): Player[] {
  if (!state.result) return [];
  return state.result.winnerIndexes.map((index) => state.players[index]);
}
