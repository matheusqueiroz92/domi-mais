import { useEffect } from 'react';
import type { Dispatch } from 'react';
import type { GameAction, GameState } from '../state/game-types';
import { chooseBotAction } from './bot';

/** Pausa antes de cada ação do computador, para a pessoa acompanhar a jogada. */
export const BOT_DELAY_MS = 900;

interface BotTurnsOptions {
  /** Suspende o computador (animação de embaralhar, janelas abertas). */
  paused?: boolean;
  /** Chamado logo antes de cada ação do computador (para tocar o som, por exemplo). */
  onAction?: (action: GameAction) => void;
}

/**
 * Faz o computador jogar quando é a vez de um jogador controlado por ele.
 * Cada passo (comprar, depois jogar ou ficar com a peça) é uma ação separada,
 * com uma pausa antes, pelo mesmo `dispatch` usado pela pessoa.
 */
export function useBotTurns(
  state: GameState,
  dispatch: Dispatch<GameAction>,
  { paused = false, onAction }: BotTurnsOptions = {}
): void {
  useEffect(() => {
    if (paused) return;
    if (state.phase !== 'choosing-initial' && state.phase !== 'playing') return;
    if (!state.players[state.currentPlayerIndex]?.botLevel) return;

    const timer = window.setTimeout(() => {
      const action = chooseBotAction(state);
      if (!action) return;
      onAction?.(action);
      dispatch(action);
    }, BOT_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [state, paused, dispatch, onAction]);
}
