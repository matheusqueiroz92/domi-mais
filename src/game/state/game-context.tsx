import { createContext, useContext, useReducer } from 'react';
import type { ReactNode } from 'react';
import type { GameState, GameAction } from './game-types';
import { gameReducer } from './game-reducer';
import { createInitialGameState } from './game-inicial-state';

interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  initializeGame: (player1Name: string, player2Name: string) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

interface GameProviderProps {
  children: ReactNode;
}

export function GameProvider({ children }: GameProviderProps) {
  const [state, dispatch] = useReducer(
    gameReducer,
    createInitialGameState('Jogador 1', 'Jogador 2')
  );

  const initializeGame = (player1Name: string, player2Name: string) => {
    dispatch({ type: 'INITIALIZE_GAME', player1Name, player2Name });
  };

  return (
    <GameContext.Provider value={{ state, dispatch, initializeGame }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame deve ser usado dentro de um GameProvider');
  }
  return context;
}

