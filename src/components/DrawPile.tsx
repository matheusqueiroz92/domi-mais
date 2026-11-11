import { motion } from 'framer-motion';
import { DominoPiece } from './DominoPiece';
import type { DominoPiece as DominoPieceType } from '../game/state/game-types';
import './DrawPile.css';

interface DrawPileProps {
  pieces: DominoPieceType[];
  onSelectPiece: (pieceId: string) => void;
  disabled?: boolean;
  isChoosingInitial?: boolean;
}

export function DrawPile({ pieces, onSelectPiece, disabled = false, isChoosingInitial = false }: DrawPileProps) {
  if (pieces.length === 0) {
    return (
      <div className="draw-pile draw-pile--empty">
        <p>Nenhuma peça no monte</p>
      </div>
    );
  }

  return (
    <div className="draw-pile">
      <h3 className="draw-pile__title">Monte de Peças</h3>
      <p className="draw-pile__subtitle">
        {isChoosingInitial 
          ? 'Escolha a peça inicial do jogo' 
          : 'Clique em uma peça para comprá-la'}
      </p>
      <div className="draw-pile__container">
        {pieces.map((piece, index) => (
          <motion.div
            key={piece.id}
            layoutId={`piece-${piece.id}`}
            className="draw-pile__piece-wrapper"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            whileHover={!disabled ? { scale: 1.1, y: -5 } : {}}
            whileTap={!disabled ? { scale: 0.95 } : {}}
          >
            {/* O clique é tratado só na peça (antes era disparado duas vezes). */}
            <div className={`draw-pile__piece ${disabled ? 'draw-pile__piece--disabled' : ''}`}>
              <DominoPiece
                piece={piece}
                isFaceUp={false}
                size="small"
                onClick={disabled ? undefined : () => onSelectPiece(piece.id)}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

