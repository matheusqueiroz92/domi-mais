import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { DominoPiece } from './DominoPiece';
import type { Table, DominoPiece as DominoPieceType } from '../game/state/game-types';
import './GameTable.css';

interface GameTableProps {
  table: Table;
  selectedPiece?: DominoPieceType | null;
  canFitLeft?: boolean;
  canFitRight?: boolean;
  onPlayPiece?: (position: 'left' | 'right') => void;
}

export function GameTable({ table, canFitLeft = false, canFitRight = false, onPlayPiece }: GameTableProps) {
  const hasPieces = table.pieces.length > 0;
  const piecesCount = table.pieces.length;
  const [availableWidth, setAvailableWidth] = useState(1320);

  // Calcula largura disponível dinamicamente
  useEffect(() => {
    const updateWidth = () => {
      const container = document.querySelector('.game-table');
      if (container) {
        const rect = container.getBoundingClientRect();
        setAvailableWidth(Math.min(1320, rect.width - 60)); // 60px de padding total
      } else {
        setAvailableWidth(Math.min(1320, window.innerWidth - 100));
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);
  
  // Calcula dimensões dinâmicas baseadas na quantidade de peças
  // Peças horizontais (não-buchas): width ~65px (medium)
  // Peças verticais (buchas): width ~120px (medium, quando em pé)
  const avgHorizontalWidth = 65; // Peças normais deitadas (medium)
  const avgVerticalWidth = 120; // Buchas em pé (medium)
  const gap = 1; // Gap reduzido para economizar espaço
  
  // Conta buchas reais na mesa
  const actualBuchas = table.pieces.filter(p => p.left === p.right).length;
  const actualNormals = piecesCount - actualBuchas;
  
  // Calcula largura total necessária
  const totalWidthNeeded = 
    (actualNormals * avgHorizontalWidth) + 
    (actualBuchas * avgVerticalWidth) + 
    (piecesCount > 0 ? (piecesCount - 1) * gap : 0);
  
  // Calcula escala (mínimo 0.2 para manter legibilidade, máximo 1.0)
  const scale = piecesCount > 0 
    ? Math.max(0.2, Math.min(1.0, (availableWidth * 0.92) / totalWidthNeeded))
    : 1.0;
  
  // Determina tamanho baseado na quantidade de peças
  let pieceSize: 'small' | 'medium' | 'large' = 'medium';
  if (piecesCount > 18) {
    pieceSize = 'small';
  } else if (piecesCount > 10) {
    pieceSize = 'small';
  } else {
    pieceSize = 'medium';
  }

  return (
    <div className="game-table-wrapper">
      <div className="game-table">
        <div className="game-table__surface">
          {/* Indicadores das pontas */}
          <div className="game-table__end-indicators">
            <motion.div 
              className={`game-table__end-indicator game-table__end-indicator--left ${canFitLeft ? 'game-table__end-indicator--clickable' : ''}`}
              onClick={canFitLeft && onPlayPiece ? () => onPlayPiece('left') : undefined}
              animate={canFitLeft ? {
                scale: [1, 1.1, 1],
                boxShadow: [
                  '0 2px 8px rgba(0, 0, 0, 0.3)',
                  '0 0 20px rgba(74, 144, 226, 0.8), 0 0 30px rgba(74, 144, 226, 0.6)',
                  '0 2px 8px rgba(0, 0, 0, 0.3)',
                ],
                borderColor: [
                  'rgba(255, 255, 255, 0.2)',
                  'rgba(74, 144, 226, 1)',
                  'rgba(255, 255, 255, 0.2)',
                ],
              } : {}}
              transition={{
                duration: 1.5,
                repeat: canFitLeft ? Infinity : 0,
                ease: 'easeInOut',
              }}
            >
              <div className="game-table__end-label">Esquerda</div>
              <div className="game-table__end-value">
                {table.leftEnd !== null ? table.leftEnd : '—'}
              </div>
              {canFitLeft && (
                <div className="game-table__end-hint">Clique para jogar</div>
              )}
            </motion.div>
            <motion.div 
              className={`game-table__end-indicator game-table__end-indicator--right ${canFitRight ? 'game-table__end-indicator--clickable' : ''}`}
              onClick={canFitRight && onPlayPiece ? () => onPlayPiece('right') : undefined}
              animate={canFitRight ? {
                scale: [1, 1.1, 1],
                boxShadow: [
                  '0 2px 8px rgba(0, 0, 0, 0.3)',
                  '0 0 20px rgba(74, 144, 226, 0.8), 0 0 30px rgba(74, 144, 226, 0.6)',
                  '0 2px 8px rgba(0, 0, 0, 0.3)',
                ],
                borderColor: [
                  'rgba(255, 255, 255, 0.2)',
                  'rgba(74, 144, 226, 1)',
                  'rgba(255, 255, 255, 0.2)',
                ],
              } : {}}
              transition={{
                duration: 1.5,
                repeat: canFitRight ? Infinity : 0,
                ease: 'easeInOut',
              }}
            >
              <div className="game-table__end-label">Direita</div>
              <div className="game-table__end-value">
                {table.rightEnd !== null ? table.rightEnd : '—'}
              </div>
              {canFitRight && (
                <div className="game-table__end-hint">Clique para jogar</div>
              )}
            </motion.div>
          </div>

          {/* Linha de peças */}
          <div className="game-table__line">
            {hasPieces ? (
              <motion.div
                className="game-table__pieces-line"
                style={{ 
                  transform: `scale(${scale})`,
                  transformOrigin: 'center center',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {table.pieces.map((piece, index) => {
                  const isFirst = index === 0;
                  const isLast = index === table.pieces.length - 1;
                  const isBucha = piece.left === piece.right;
                  const orientation = isBucha ? 'horizontal' : 'vertical';
                  
                  return (
                    <motion.div
                      key={piece.id}
                      className={`game-table__piece-wrapper ${isBucha ? 'game-table__piece-wrapper--vertical' : 'game-table__piece-wrapper--horizontal'}`}
                      initial={{ 
                        scale: 0.5, 
                        opacity: 0,
                        x: isFirst ? -100 : isLast ? 100 : 0,
                        rotateY: -90
                      }}
                      animate={{ 
                        scale: 1, 
                        opacity: 1,
                        x: 0,
                        rotateY: 0
                      }}
                      transition={{
                        delay: index * 0.1,
                        duration: 0.5,
                        type: 'spring',
                        stiffness: 200,
                        damping: 20
                      }}
                    >
                      <DominoPiece 
                        piece={piece} 
                        size={pieceSize}
                        isFaceUp={true}
                        orientation={orientation}
                      />
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <div className="game-table__empty">
                <p>Nenhuma peça na mesa ainda</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
