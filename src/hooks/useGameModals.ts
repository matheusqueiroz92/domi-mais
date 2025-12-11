import { useState, useEffect } from 'react';
import type { GameState } from '../game/state/game-types';
import type { GameModalType } from '../game/utils/game-modals';

interface UseGameModalsReturn {
  currentModal: GameModalType | null;
  closeModal: () => void;
}

export function useGameModals(state: GameState): UseGameModalsReturn {
  const [currentModal, setCurrentModal] = useState<GameModalType | null>(null);
  const [lastPhase, setLastPhase] = useState<GameState['phase']>(state.phase);
  const [lastSelectedPiece, setLastSelectedPiece] = useState(state.selectedPiece);

  useEffect(() => {
    // Modal de "Sua vez" quando muda de turno
    if (state.phase === 'playing' && lastPhase === 'transition') {
      setCurrentModal('your-turn');
      setLastPhase(state.phase);
      return;
    }

    // Modal quando compra uma peça
    if (state.selectedPiece && !lastSelectedPiece) {
      // Verifica se a peça encaixa
      const canFit =
        state.table.leftEnd === null ||
        state.table.rightEnd === null ||
        state.selectedPiece.left === state.table.leftEnd ||
        state.selectedPiece.right === state.table.leftEnd ||
        state.selectedPiece.left === state.table.rightEnd ||
        state.selectedPiece.right === state.table.rightEnd;

      if (canFit) {
        setCurrentModal('piece-fits');
      } else {
        setCurrentModal('piece-doesnt-fit');
      }
      setLastSelectedPiece(state.selectedPiece);
      return;
    }

    // Modal de "Passe o dispositivo" quando muda de turno
    if (state.phase === 'transition' && lastPhase === 'playing') {
      setCurrentModal('pass-device');
      setLastPhase(state.phase);
      return;
    }

    // Modal de fim de jogo
    if (state.phase === 'finished' && lastPhase !== 'finished') {
      setCurrentModal('game-over');
      setLastPhase(state.phase);
      return;
    }

    setLastPhase(state.phase);
    setLastSelectedPiece(state.selectedPiece);
  }, [state, lastPhase, lastSelectedPiece]);

  const closeModal = () => {
    setCurrentModal(null);
  };

  return {
    currentModal,
    closeModal,
  };
}

