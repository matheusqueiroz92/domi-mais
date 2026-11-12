import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface PieceMotionProps {
  /** Id da peça: o mesmo id em outro lugar da tela faz a peça "viajar" até aqui. */
  pieceId: string;
  /** Vira a peça ao chegar (usado quando ela sai do monte e é aberta). */
  flip?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Envolve uma peça para animar sua movimentação. Quando uma peça some de um
 * lugar (monte, mão) e aparece em outro (mão, mesa) com o mesmo `pieceId`,
 * ela desliza da posição antiga para a nova.
 */
export function PieceMotion({ pieceId, flip = false, className, children }: PieceMotionProps) {
  return (
    <motion.div
      layout
      layoutId={pieceId}
      className={className}
      style={{ display: 'flex' }}
      initial={flip ? { rotateY: 180 } : false}
      animate={{ rotateY: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
    >
      {children}
    </motion.div>
  );
}
