import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { DominoPiece } from './DominoPiece';
import { PieceMotion } from './PieceMotion';
import type { DominoPiece as DominoPieceType, Table, TableSide } from '../game/state/game-types';
import { isDouble } from '../game/logic/pieces';
import { halfForWidth, layoutChain } from './table-layout';
import type { ScatterPoint } from './table-layout';
import './GameTable.css';

interface GameTableProps {
  table: Table;
  canFitLeft?: boolean;
  canFitRight?: boolean;
  onPlayPiece?: (position: TableSide) => void;
  /** Última peça colocada na mesa: recebe um destaque. */
  lastPlayedId?: string | null;
  /** Peça que chega virada (do monte ou da mão de um adversário) e abre na mesa. */
  flipPieceId?: string | null;
  /**
   * Animação de embaralhar: as peças do monte aparecem espalhadas sobre a
   * mesa, percorrendo os trajetos de `paths` (um por peça, na mesma ordem).
   */
  shuffle?: { pieces: DominoPieceType[]; paths: ScatterPoint[][] } | null;
}

const SIDE_LABEL: Record<TableSide, string> = { left: 'esquerda', right: 'direita' };

/** Largura usada antes da primeira medição (e nos testes, que não medem layout). */
const FALLBACK_WIDTH = 300;

/** Duração da mistura das peças, em segundos. */
export const SHUFFLE_SECONDS = 1.4;

export function GameTable({
  table,
  canFitLeft = false,
  canFitRight = false,
  onPlayPiece,
  lastPlayedId = null,
  flipPieceId = null,
  shuffle = null,
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
      <div
        className={`game-table__chain ${rows.length <= 1 ? 'game-table__chain--single' : ''}`}
        ref={chainRef}
      >
        {hasPieces
          ? rows.map((row, rowIndex) => (
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
                    <PieceMotion
                      key={item.piece.id}
                      pieceId={item.piece.id}
                      flip={item.piece.id === flipPieceId}
                      className={item.piece.id === lastPlayedId ? 'game-table__last' : undefined}
                    >
                      <DominoPiece
                        piece={item.piece}
                        isFaceUp
                        half={half}
                        orientation={isDouble(item.piece) ? 'vertical' : 'horizontal'}
                        flipped={row.reversed}
                      />
                    </PieceMotion>
                  )
                )}
              </div>
            ))
          : !shuffle && <p className="game-table__empty">Nenhuma peça na mesa ainda</p>}
      </div>

      {shuffle && (
        <div className="game-table__scatter" aria-hidden="true">
          {shuffle.pieces.map((piece, index) => {
            const path = shuffle.paths[index % shuffle.paths.length];
            return (
              <motion.div
                key={piece.id}
                layoutId={piece.id}
                className="game-table__scatter-tile"
                initial={{ left: `${path[0].x}%`, top: `${path[0].y}%`, rotate: path[0].rotate }}
                animate={{
                  left: path.map((point) => `${point.x}%`),
                  top: path.map((point) => `${point.y}%`),
                  rotate: path.map((point) => point.rotate),
                }}
                transition={{ duration: SHUFFLE_SECONDS, ease: 'easeInOut' }}
              >
                <DominoPiece piece={piece} isFaceUp={false} back="fill" />
              </motion.div>
            );
          })}
        </div>
      )}

      <span className="game-table__label">
        {shuffle
          ? 'Embaralhando as peças…'
          : hasPieces
            ? `Pontas da mesa: ${table.leftEnd} e ${table.rightEnd}`
            : 'Escolha a peça inicial no monte'}
      </span>
    </section>
  );
}
