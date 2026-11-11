import { useReducer } from 'react';
import type { ReactNode } from 'react';
import { gameReducer } from './game-reducer';
import { createInitialGameState, createRandomSetup } from './game-inicial-state';
import { GameContext } from './use-game';

interface GameProviderProps {
  children: ReactNode;
}

export function GameProvider({ children }: GameProviderProps) {
  const [state, dispatch] = useReducer(gameReducer, undefined, () =>
    createInitialGameState('Jogador 1', 'Jogador 2')
  );

  const initializeGame = (player1Name: string, player2Name: string) => {
    // O sorteio acontece aqui, fora do reducer, para o reducer continuar puro.
    dispatch({ type: 'INITIALIZE_GAME', player1Name, player2Name, ...createRandomSetup() });
  };

  return (
    <GameContext.Provider value={{ state, dispatch, initializeGame }}>
      {children}
    </GameContext.Provider>
  );
}
