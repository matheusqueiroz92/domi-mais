import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { DominoPiece } from './DominoPiece';
import { PieceMotion } from './PieceMotion';
import type { DominoPiece as DominoPieceType, Table, TableSide } from '../game/state/game-types';
import { fitSnake } from './table-layout';
import type { ScatterPoint } from './table-layout';
import './GameTable.css';

interface GameTableProps {
  table: Table;
  /** Id da peça inicial: a linha de peças é desenhada a partir dela. */
  initialPieceId?: string | null;
  canFitLeft?: boolean;
  canFitRight?: boolean;
  onPlayPiece?: (position: TableSide) => void;
  /** Última peça colocada na mesa: recebe um destaque. */
  lastPlayedId?: string | null;
  /** Peça que chega virada (do monte ou da mão de um adversário) e abre na mesa. */
  flipPieceId?: string | null;
  /**
   * A mesa tem altura fixa (telas grandes): as peças diminuem, se preciso,
   * para a linha caber sem rolagem. Sem isso, a mesa cresce para baixo.
   */
  fitHeight?: boolean;
  /**
   * Animação de embaralhar: as peças do monte aparecem espalhadas sobre a
   * mesa, percorrendo os trajetos de `paths` (um por peça, na mesma ordem).
   */
  shuffle?: { pieces: DominoPieceType[]; paths: ScatterPoint[][] } | null;
}

const SIDE_LABEL: Record<TableSide, string> = { left: 'esquerda', right: 'direita' };

/** Tamanho usado antes da primeira medição (e nos testes, que não medem layout). */
const FALLBACK_SIZE = { width: 300, height: 0 };

/** Duração da mistura das peças, em segundos. */
export const SHUFFLE_SECONDS = 1.4;

export function GameTable({
  table,
  initialPieceId = null,
  canFitLeft = false,
  canFitRight = false,
  onPlayPiece,
  lastPlayedId = null,
  flipPieceId = null,
  fitHeight = false,
  shuffle = null,
}: GameTableProps) {
  const areaRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(FALLBACK_SIZE);

  // Acompanha o tamanho real da área da mesa para posicionar a linha de peças.
  useEffect(() => {
    const element = areaRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect && rect.width > 0) {
        setSize({ width: Math.floor(rect.width), height: Math.floor(rect.height) });
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const hasPieces = table.pieces.length > 0;
  const layout = fitSnake(table.pieces, initialPieceId, {
    width: size.width,
    maxHeight: fitHeight && size.height > 0 ? size.height : undefined,
    leftSlot: hasPieces && canFitLeft,
    rightSlot: hasPieces && canFitRight,
  });

  return (
    <section className="game-table" aria-label="Mesa">
      <div className="game-table__area" ref={areaRef}>
        {hasPieces ? (
          <div className="game-table__snake" style={{ height: layout.height }}>
            {layout.items.map((item) =>
              item.kind === 'slot' ? (
                <button
                  key={item.key}
                  type="button"
                  className="game-table__slot"
                  style={{ left: item.x, top: item.y, width: item.w, height: item.h }}
                  aria-label={`Jogar na ponta ${SIDE_LABEL[item.side ?? 'left']}`}
                  onClick={() => item.side && onPlayPiece?.(item.side)}
                >
                  Jogar
                </button>
              ) : (
                item.piece && (
                  <PieceMotion
                    key={item.key}
                    pieceId={item.key}
                    flip={item.key === flipPieceId}
                    className={`game-table__piece ${
                      item.key === lastPlayedId ? 'game-table__last' : ''
                    }`}
                    style={{ left: item.x, top: item.y }}
                  >
                    <DominoPiece
                      piece={item.piece}
                      isFaceUp
                      half={layout.half}
                      orientation={item.orientation}
                      flipped={item.flipped}
                    />
                  </PieceMotion>
                )
              )
            )}
          </div>
        ) : (
          !shuffle && <p className="game-table__empty">Nenhuma peça na mesa ainda</p>
        )}
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
