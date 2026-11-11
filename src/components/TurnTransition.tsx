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
  return (
    <div
      className="turn-transition"
      role="dialog"
      aria-modal="true"
      aria-labelledby="turn-transition-title"
    >
      <div className="turn-transition__card">
        <h2 id="turn-transition-title" className="turn-transition__title">
          Passe o dispositivo para {playerName}
        </h2>
        <p className="turn-transition__text">
          {playerName}, toque no botão quando só você estiver vendo a tela.
        </p>
        <button className="btn btn--primary btn--large" onClick={onReady} autoFocus>
          Estou pronto
        </button>
      </div>
    </div>
  );
}
