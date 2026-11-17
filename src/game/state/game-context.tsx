import { useCallback, useEffect, useReducer, useRef } from 'react';
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
import { clearSavedGame, isResumable, loadSavedGame, saveGame } from './saved-game';

interface GameProviderProps {
  children: ReactNode;
}

export function GameProvider({ children }: GameProviderProps) {
  const [state, dispatch] = useReducer(gameReducer, undefined, () =>
    createInitialGameState(DEFAULT_PLAYER_NAMES)
  );

  // Só partidas comuns são guardadas; a partida guiada do tutorial não.
  const persist = useRef(false);

  // Guarda a partida a cada jogada, para ela sobreviver a fechar ou recarregar
  // a página. Quando termina, a partida guardada é apagada.
  useEffect(() => {
    if (!persist.current) return;
    if (isResumable(state)) saveGame(state);
    else if (state.phase === 'finished') clearSavedGame();
  }, [state]);

  const resumeGame = useCallback(() => {
    const saved = loadSavedGame();
    if (!saved) return false;
    persist.current = true;
    dispatch({ type: 'RESTORE_GAME', state: saved });
    return true;
  }, []);

  const discardSavedGame = useCallback(() => clearSavedGame(), []);

  const initializeGame = (
    playerNames: string[],
    botLevels: (BotLevel | null)[] = [],
    setup?: GameSetup
  ) => {
    // O sorteio acontece aqui, fora do reducer, para o reducer continuar puro.
    // O tutorial entra com um monte fixo em `setup`.
    persist.current = setup === undefined;
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
    <GameContext.Provider value={{ state, dispatch, initializeGame, resumeGame, discardSavedGame }}>
      {children}
    </GameContext.Provider>
  );
}
