import { createContext, useContext } from 'react';
import type { Dispatch } from 'react';
import type { BotLevel, DominoPiece, GameAction, GameState } from './game-types';

/** Monte já embaralhado e quem começa a partida. */
export interface GameSetup {
  shuffledPieces: DominoPiece[];
  startingPlayerIndex: number;
}

export interface GameContextType {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  /**
   * Sorteia o monte e quem começa, e inicia uma partida nova na fase `setup`.
   * `botLevels` indica quais jogadores são do computador (`null` = pessoa).
   * Com computador na partida não há troca de turno protegida.
   * `setup` troca o sorteio por um monte fixo (usado pelo tutorial).
   */
  initializeGame: (
    playerNames: string[],
    botLevels?: (BotLevel | null)[],
    setup?: GameSetup
  ) => void;
}

export const GameContext = createContext<GameContextType | undefined>(undefined);

export function useGame(): GameContextType {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame deve ser usado dentro de um GameProvider');
  }
  return context;
}
