import { useI18n } from '../i18n/useI18n';
import './TurnTransition.css';

interface TurnTransitionProps {
  /** Nome do jogador que vai jogar agora. */
  playerName: string;
  /** Chamado quando o jogador confirma que está com o dispositivo. */
  onReady: () => void;
}

/**
 * Tela de troca de turno protegida (jogo no mesmo dispositivo).
 * Cobre toda a partida para que ninguém veja a mão do outro enquanto o
 * dispositivo muda de mãos; só sai quando o próximo jogador toca em
 * "Estou pronto".
 */
export function TurnTransition({ playerName, onReady }: TurnTransitionProps) {
  const { m } = useI18n();
  return (
    <div
      className="turn-transition"
      role="dialog"
      aria-modal="true"
      aria-labelledby="turn-transition-title"
    >
      <div className="turn-transition__card">
        <h2 id="turn-transition-title" className="turn-transition__title">
          {m.game.passDevice(playerName)}
        </h2>
        <p className="turn-transition__text">
          {m.game.passDeviceText(playerName)}
        </p>
        <button type="button" className="btn btn--primary" onClick={onReady} autoFocus>
          {m.game.ready}
        </button>
      </div>
    </div>
  );
}
