import { DominoPiece } from './DominoPiece';
import type { Player } from '../game/state/game-types';
import './PlayerHand.css';

interface PlayerHandProps {
  player: Player;
  selectedPieceId: string | null;
  /** Peça comprada do monte neste turno (recebe um destaque no texto). */
  drawnPieceId: string | null;
  /** As peças só podem ser selecionadas na etapa de jogada. */
  canSelect: boolean;
  onSelectPiece: (pieceId: string) => void;
}

/** Mão do jogador da vez, aberta, na parte de baixo da tela. */
export function PlayerHand({
  player,
  selectedPieceId,
  drawnPieceId,
  canSelect,
  onSelectPiece,
}: PlayerHandProps) {
  const count = player.hand.length;
  const drawn = player.hand.find((piece) => piece.id === drawnPieceId);
  // Mãos grandes usam peças menores para caber na tela.
  const half = count > 10 ? 30 : count > 6 ? 36 : 44;

  return (
    <section className="hand" aria-label={`Mão de ${player.name}`} data-testid="hand">
      <div className="hand__header">
        <span>
          Sua mão · {count} {count === 1 ? 'peça' : 'peças'}
        </span>
        {drawn && (
          <span className="hand__drawn">
            {drawn.left}|{drawn.right} comprada agora
          </span>
        )}
      </div>
      {count > 0 ? (
        <div className="hand__pieces">
          {player.hand.map((piece) => (
            <DominoPiece
              key={piece.id}
              piece={piece}
              isFaceUp
              half={half}
              orientation="vertical"
              isSelected={selectedPieceId === piece.id}
              onClick={canSelect ? () => onSelectPiece(piece.id) : undefined}
            />
          ))}
        </div>
      ) : (
        <p className="hand__empty">Você ainda não tem peças.</p>
      )}
    </section>
  );
}
