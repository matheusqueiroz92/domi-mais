import { useReducer } from 'react';
import type { ReactNode } from 'react';
import { gameReducer } from './game-reducer';
import {
  DEFAULT_PLAYER_NAMES,
  createInitialGameState,
  createRandomSetup,
} from './game-inicial-state';
import { GameContext } from './use-game';

interface GameProviderProps {
  children: ReactNode;
}

export function GameProvider({ children }: GameProviderProps) {
  const [state, dispatch] = useReducer(gameReducer, undefined, () =>
    createInitialGameState(DEFAULT_PLAYER_NAMES)
  );

  const initializeGame = (playerNames: string[]) => {
    // O sorteio acontece aqui, fora do reducer, para o reducer continuar puro.
    dispatch({
      type: 'INITIALIZE_GAME',
      playerNames,
      ...createRandomSetup(playerNames.length),
    });
  };

  return (
    <GameContext.Provider value={{ state, dispatch, initializeGame }}>
      {children}
    </GameContext.Provider>
  );
}
