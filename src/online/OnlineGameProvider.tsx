import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { GameContext } from '../game/state/use-game';
import type { GameContextType } from '../game/state/use-game';
import type { GameAction, GameState } from '../game/state/game-types';
import { selectPiece } from '../game/logic/engine';
import type { OnlineRoom } from './useOnlineRoom';

/**
 * Peça selecionada na mão. Só a tela de cada um sabe dela (o servidor não
 * guarda); vale enquanto a mesa, o monte e a vez não mudarem.
 */
interface Selection {
  pieceId: string | null;
  key: string;
}

const momentKey = (game: GameState) =>
  `${game.currentPlayerIndex}:${game.turnStep}:${game.drawPile.length}:${game.table.pieces.length}`;

/**
 * Liga a tela da partida ao servidor: o estado vem da sala (`view.game`) e as
 * ações vão para o servidor. Selecionar uma peça fica só nesta tela.
 */
export function OnlineGameProvider({ online, children }: { online: OnlineRoom; children: ReactNode }) {
  const game = online.view?.game as GameState;
  const [selection, setSelection] = useState<Selection>({ pieceId: null, key: '' });
  const key = momentKey(game);

  const state = useMemo<GameState>(() => {
    const selectedPieceId = selection.key === key ? selection.pieceId : null;
    // A seleção só vale se o motor aceitar (vez dele, etapa de jogar, peça na mão).
    const base = { ...game, selectedPieceId: null };
    return selectedPieceId ? selectPiece(base, selectedPieceId) : base;
  }, [game, selection, key]);

  const { act } = online;
  const value = useMemo<GameContextType>(
    () => ({
      state,
      dispatch: (action: GameAction) => {
        switch (action.type) {
          case 'SELECT_PIECE':
            setSelection({ pieceId: selectPiece(state, action.pieceId).selectedPieceId, key });
            return;
          case 'CHOOSE_INITIAL_PIECE':
          case 'DRAW_PIECE':
            void act({ type: action.type, pieceId: action.pieceId });
            return;
          case 'PLAY_PIECE':
            void act({ type: 'PLAY_PIECE', pieceId: action.pieceId, position: action.position });
            return;
          case 'KEEP_PIECE':
            void act({ type: 'KEEP_PIECE' });
            return;
          default:
            // As outras ações (reiniciar, troca de turno...) não existem no online.
            return;
        }
      },
      initializeGame: () => undefined,
      resumeGame: () => false,
      discardSavedGame: () => undefined,
    }),
    [state, act, key]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
