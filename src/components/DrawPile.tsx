import { DominoPiece } from './DominoPiece';
import type { DominoPiece as DominoPieceType } from '../game/state/game-types';
import './DrawPile.css';

interface DrawPileProps {
  pieces: DominoPieceType[];
  onSelectPiece: (pieceId: string) => void;
  isChoosingInitial?: boolean;
}

/** Monte em destaque para o jogador escolher uma peça (compra ou peça inicial). */
export function DrawPile({ pieces, onSelectPiece, isChoosingInitial = false }: DrawPileProps) {
  if (pieces.length === 0) return null;

  return (
    <section className="draw-pile" aria-label="Monte">
      <h2 className="draw-pile__title">
        {isChoosingInitial ? 'Escolha a peça inicial' : 'Compre uma peça do monte'}
      </h2>
      <p className="draw-pile__hint">O número é a soma dos dois lados da peça.</p>
      <div className="draw-pile__tiles">
        {pieces.map((piece) => (
          <DominoPiece
            key={piece.id}
            piece={piece}
            isFaceUp={false}
            back="lg"
            onClick={() => onSelectPiece(piece.id)}
          />
        ))}
      </div>
    </section>
  );
}
