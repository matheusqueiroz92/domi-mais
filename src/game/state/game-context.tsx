import { useReducer } from 'react';
import type { ReactNode } from 'react';
import type { GameSetup } from './use-game';
import type { BotLevel } from './game-types';
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

  const initializeGame = (
    playerNames: string[],
    botLevels: (BotLevel | null)[] = [],
    setup?: GameSetup
  ) => {
    // O sorteio acontece aqui, fora do reducer, para o reducer continuar puro.
    // O tutorial entra com um monte fixo em `setup`.
    dispatch({
      type: 'INITIALIZE_GAME',
      playerNames,
      botLevels,
      // A troca de turno protegida só existe quando há mais de uma pessoa no mesmo aparelho.
      protectTurns: !botLevels.some((level) => level !== null),
      ...(setup ?? createRandomSetup(playerNames.length)),
    });
  };

  return (
    <GameContext.Provider value={{ state, dispatch, initializeGame }}>
      {children}
    </GameContext.Provider>
  );
}
