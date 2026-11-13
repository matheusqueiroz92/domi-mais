import { DominoPiece } from './DominoPiece';
import { PieceMotion } from './PieceMotion';
import type { DominoPiece as DominoPieceType } from '../game/state/game-types';
import './DrawPile.css';

export type PileMode = 'idle' | 'draw' | 'choose-initial';

interface DrawPileProps {
  /** Ids das 28 peças na ordem em que foram dispostas no monte. */
  order: string[];
  /** Peças que ainda estão no monte. */
  pieces: DominoPieceType[];
  /** `draw` e `choose-initial` deixam as peças clicáveis. */
  mode?: PileMode;
  /** Mostra só os espaços vazios (durante a animação de embaralhar). */
  hideTiles?: boolean;
  onSelectPiece?: (pieceId: string) => void;
  /** Tutorial: só esta peça fica clicável, com destaque. */
  onlyPieceId?: string | null;
}

const HINTS: Record<PileMode, string> = {
  idle: 'O número é a soma dos dois lados',
  draw: 'Toque em uma peça para comprar',
  'choose-initial': 'Toque na peça inicial da mesa',
};

/**
 * Monte: duas fileiras de 14 peças viradas, mostrando só a soma.
 * Cada peça fica sempre no mesmo lugar; quando é comprada, o lugar fica vazio.
 */
export function DrawPile({
  order,
  pieces,
  mode = 'idle',
  hideTiles = false,
  onSelectPiece,
  onlyPieceId = null,
}: DrawPileProps) {
  const byId = new Map(pieces.map((piece) => [piece.id, piece]));
  const interactive = mode !== 'idle' && !hideTiles;

  return (
    <section className={`pile ${interactive ? 'pile--active' : ''}`} aria-label="Monte">
      <div className="pile__header">
        <h2 className="pile__title">Monte · {pieces.length} peças</h2>
        <span className="pile__hint">{HINTS[mode]}</span>
      </div>
      <div className="pile__grid">
        {order.map((id) => {
          const piece = byId.get(id);
          const clickable = interactive && (onlyPieceId === null || onlyPieceId === id);
          const highlighted = interactive && onlyPieceId === id;
          return (
            <div className="pile__slot" key={id}>
              {piece && !hideTiles && (
                <PieceMotion
                  pieceId={piece.id}
                  className={`pile__tile ${highlighted ? 'pile__tile--target' : ''}`}
                >
                  <DominoPiece
                    piece={piece}
                    isFaceUp={false}
                    back="fill"
                    onClick={clickable && onSelectPiece ? () => onSelectPiece(piece.id) : undefined}
                  />
                </PieceMotion>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
