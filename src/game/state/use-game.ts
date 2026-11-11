import { createContext, useContext } from 'react';
import type { Dispatch } from 'react';
import type { GameAction, GameState } from './game-types';

export interface GameContextType {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  /** Sorteia o monte e quem começa, e inicia uma partida nova na fase `setup`. */
  initializeGame: (player1Name: string, player2Name: string) => void;
}

export const GameContext = createContext<GameContextType | undefined>(undefined);

export function useGame(): GameContextType {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame deve ser usado dentro de um GameProvider');
  }
  return context;
}
