import { useEffect, useRef, useState } from 'react';
import { DominoPiece } from './DominoPiece';
import type { DominoPiece as DominoPieceType, Table, TableSide } from '../game/state/game-types';
import { isDouble } from '../game/logic/pieces';
import { halfForWidth, layoutChain } from './table-layout';
import './GameTable.css';

interface GameTableProps {
  table: Table;
  /** Peças do monte, mostradas viradas dentro da mesa (só a soma). */
  drawPile?: DominoPieceType[];
  /** Esconde as peças do monte (quando elas estão em destaque para compra). */
  hidePileTiles?: boolean;
  canFitLeft?: boolean;
  canFitRight?: boolean;
  onPlayPiece?: (position: TableSide) => void;
}

const SIDE_LABEL: Record<TableSide, string> = { left: 'esquerda', right: 'direita' };

/** Largura usada antes da primeira medição (e nos testes, que não medem layout). */
const FALLBACK_WIDTH = 300;

export function GameTable({
  table,
  drawPile = [],
  hidePileTiles = false,
  canFitLeft = false,
  canFitRight = false,
  onPlayPiece,
}: GameTableProps) {
  const chainRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(FALLBACK_WIDTH);

  // Acompanha a largura real da mesa para dobrar a linha de peças em fileiras.
  useEffect(() => {
    const element = chainRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      const measured = entries[0]?.contentRect.width;
      if (measured && measured > 0) setWidth(measured);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const half = halfForWidth(width);
  const hasPieces = table.pieces.length > 0;
  const rows = layoutChain(table.pieces, {
    maxWidth: width,
    half,
    leftSlot: hasPieces && canFitLeft,
    rightSlot: hasPieces && canFitRight,
  });

  return (
    <section className="game-table" aria-label="Mesa">
      <div className="game-table__pile">
        <span className="game-table__label">Monte · {drawPile.length} peças</span>
        {!hidePileTiles && drawPile.length > 0 && (
          <div className="game-table__pile-tiles">
            {drawPile.map((piece) => (
              <DominoPiece key={piece.id} piece={piece} isFaceUp={false} back="sm" />
            ))}
          </div>
        )}
      </div>

      <div
        className={`game-table__chain ${rows.length <= 1 ? 'game-table__chain--single' : ''}`}
        ref={chainRef}
      >
        {hasPieces ? (
          rows.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className={`game-table__row ${row.reversed ? 'game-table__row--reversed' : ''}`}
            >
              {row.items.map((item) =>
                item.kind === 'slot' ? (
                  <button
                    key={`slot-${item.side}`}
                    type="button"
                    className="game-table__slot"
                    style={{ width: Math.max(44, half * 2) }}
                    aria-label={`Jogar na ponta ${SIDE_LABEL[item.side]}`}
                    onClick={() => onPlayPiece?.(item.side)}
                  >
                    Jogar
                  </button>
                ) : (
                  <DominoPiece
                    key={item.piece.id}
                    piece={item.piece}
                    isFaceUp
                    half={half}
                    orientation={isDouble(item.piece) ? 'vertical' : 'horizontal'}
                    flipped={row.reversed}
                  />
                )
              )}
            </div>
          ))
        ) : (
          <p className="game-table__empty">Nenhuma peça na mesa ainda</p>
        )}
      </div>

      <span className="game-table__label">
        {hasPieces ? `Pontas da mesa: ${table.leftEnd} e ${table.rightEnd}` : 'Escolha a peça inicial'}
      </span>
    </section>
  );
}
