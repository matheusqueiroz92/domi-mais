import type { GameAction, GameState } from './game-types';
import { createInitialGameState } from './game-inicial-state';
import {
  chooseInitialPiece,
  confirmReady,
  drawPiece,
  keepPiece,
  playPiece,
  selectPiece,
  startGame,
} from '../logic/engine';

/**
 * Reducer do jogo. Apenas encaminha cada ação para o motor de regras
 * (src/game/logic/engine.ts); nenhuma regra é implementada aqui.
 * É puro: os sorteios chegam prontos na ação INITIALIZE_GAME.
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'INITIALIZE_GAME':
      return createInitialGameState(action.player1Name, action.player2Name, {
        pieces: action.shuffledPieces,
        startingPlayerIndex: action.startingPlayerIndex,
        protectTurns: action.protectTurns,
      });

    case 'START_GAME':
      return startGame(state);

    case 'CHOOSE_INITIAL_PIECE':
      return chooseInitialPiece(state, action.pieceId);

    case 'CONFIRM_READY':
      return confirmReady(state);

    case 'DRAW_PIECE':
      return drawPiece(state, action.pieceId);

    case 'SELECT_PIECE':
      return selectPiece(state, action.pieceId);

    case 'PLAY_PIECE':
      return playPiece(state, action.pieceId, action.position);

    case 'KEEP_PIECE':
      return keepPiece(state);

    case 'RESET_GAME':
      return createInitialGameState('Jogador 1', 'Jogador 2');

    default:
      return state;
  }
}
