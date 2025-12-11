import { Modal } from './Modal';
import type { GameModalType } from '../game/utils/game-modals';

interface GameModalProps {
  type: GameModalType | null;
  onClose: () => void;
  currentPlayerName?: string;
  nextPlayerName?: string;
}

export function GameModal({ type, onClose, currentPlayerName, nextPlayerName }: GameModalProps) {
  if (!type) return null;

  const modalConfig = {
    'your-turn': {
      title: 'Sua Vez!',
      content: `É a vez de ${currentPlayerName || 'você'} jogar.`,
      type: 'info' as const,
      autoClose: 2000,
      showCloseButton: false,
    },
    'piece-fits': {
      title: 'Peça Encaixa!',
      content: 'Esta peça pode ser jogada em uma das pontas da mesa.',
      type: 'success' as const,
      autoClose: 2000,
      showCloseButton: false,
    },
    'piece-doesnt-fit': {
      title: 'Peça Não Encaixa',
      content: 'Esta peça não encaixa em nenhuma ponta. Você deve ficar com ela.',
      type: 'warning' as const,
      autoClose: 2000,
      showCloseButton: false,
    },
    'bluff-performed': {
      title: 'Blefe Realizado',
      content: 'Você declarou que a peça não encaixa.',
      type: 'info' as const,
      autoClose: 2000,
      showCloseButton: false,
    },
    'pass-device': {
      title: 'Passe o Dispositivo',
      content: `Passe o dispositivo para ${nextPlayerName || 'o próximo jogador'}.`,
      type: 'info' as const,
      autoClose: 3000,
      showCloseButton: false,
    },
    'game-over': {
      title: 'Fim de Jogo!',
      content: 'O jogo terminou. Verifique os resultados.',
      type: 'success' as const,
      showCloseButton: true,
      autoClose: undefined,
    },
  };

  const config = modalConfig[type];

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={config.title}
      type={config.type}
      showCloseButton={config.showCloseButton}
      autoClose={config.autoClose}
    >
      <p>{config.content}</p>
    </Modal>
  );
}

