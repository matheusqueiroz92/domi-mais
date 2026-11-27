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
  /** Peças por fileira: 14 (2 fileiras) ou 7 no celular (4 fileiras, peças maiores). */
  columns?: number;
  /** Fileira que ficou toda vazia some, para sobrar espaço para a mesa (celular). */
  collapseEmptyRows?: boolean;
  /**
   * O que o jogador da vez deve fazer (ou o que está acontecendo). Fica no
   * cabeçalho do monte, no lugar do título (pedido de 25/11/2026: a quantidade
   * de peças já se vê no próprio monte). Sem mensagem, mostra "Monte".
   */
  message?: string | null;
  /** É a vez de quem olha a tela: o aviso fica em destaque. */
  messageActive?: boolean;
}

const HINTS: Record<PileMode, string> = {
  idle: 'O número é a soma dos dois lados',
  draw: 'Toque em uma peça para comprar',
  'choose-initial': 'Toque na peça inicial da mesa',
};

/**
 * Monte: duas fileiras de 14 peças viradas (quatro de 7 no celular), mostrando
 * só a soma. Cada peça fica sempre no mesmo lugar; quando é comprada, o lugar
 * fica vazio.
 */
export function DrawPile({
  order,
  pieces,
  mode = 'idle',
  hideTiles = false,
  onSelectPiece,
  onlyPieceId = null,
  columns = 14,
  collapseEmptyRows = false,
  message = null,
  messageActive = false,
}: DrawPileProps) {
  const byId = new Map(pieces.map((piece) => [piece.id, piece]));
  const interactive = mode !== 'idle' && !hideTiles;
  const rows: string[][] = [];
  for (let i = 0; i < order.length; i += columns) rows.push(order.slice(i, i + columns));
  const visibleRows =
    collapseEmptyRows && !hideTiles ? rows.filter((row) => row.some((id) => byId.has(id))) : rows;

  return (
    <section
      className={`pile ${interactive ? 'pile--active' : ''}`}
      aria-label={`Monte, ${pieces.length} ${pieces.length === 1 ? 'peça' : 'peças'}`}
    >
      <div className="pile__header">
        {message ? (
          <p className={`pile__message ${messageActive ? 'pile__message--active' : ''}`} role="status">
            {message}
          </p>
        ) : (
          <>
            <h2 className="pile__title">Monte</h2>
            <span className="pile__hint">{HINTS[mode]}</span>
          </>
        )}
      </div>
      <div
        className={`pile__grid ${columns < 14 ? 'pile__grid--compact' : ''}`}
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {visibleRows.flat().map((id) => {
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
