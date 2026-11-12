import type { CSSProperties } from 'react';
import type { DominoPiece as DominoPieceType } from '../game/state/game-types';
import clsx from 'clsx';
import './DominoPiece.css';

interface DominoPieceProps {
  piece: DominoPieceType;
  isSelected?: boolean;
  /** Aberta mostra os pontos; virada mostra só a soma no verso. */
  isFaceUp?: boolean;
  onClick?: () => void;
  /** Lado de cada metade da peça aberta, em px. */
  half?: number;
  /** Tamanho do verso (peça virada). */
  back?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
  /** Desenha a peça invertida (usado nas fileiras da mesa que correm para a esquerda). */
  flipped?: boolean;
}

// Posições dos pontos em uma grade 3x3 (células 0 a 8), para peça em pé e deitada.
const PIPS_VERTICAL: Record<number, number[]> = {
  0: [],
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};
const PIPS_HORIZONTAL: Record<number, number[]> = { ...PIPS_VERTICAL, 6: [0, 1, 2, 6, 7, 8] };
const CELLS = [0, 1, 2, 3, 4, 5, 6, 7, 8];

function Half({ value, horizontal }: { value: number; horizontal: boolean }) {
  const pips = (horizontal ? PIPS_HORIZONTAL : PIPS_VERTICAL)[value] ?? [];
  return (
    <span className="domino-piece__half">
      {CELLS.map((cell) => (
        <span key={cell} className={pips.includes(cell) ? 'domino-piece__pip' : undefined} />
      ))}
    </span>
  );
}

export function DominoPiece({
  piece,
  isSelected = false,
  isFaceUp = piece.isFaceUp,
  onClick,
  half = 28,
  back = 'md',
  orientation = 'horizontal',
  flipped = false,
}: DominoPieceProps) {
  const label = isFaceUp ? `Peça ${piece.left}|${piece.right}` : `Peça virada, soma ${piece.sum}`;
  const horizontal = orientation === 'horizontal';

  const className = isFaceUp
    ? clsx('domino-piece', `domino-piece--${orientation}`, {
        'domino-piece--selected': isSelected,
      })
    : clsx('domino-back', `domino-back--${back}`);

  const content = isFaceUp ? (
    <>
      <Half value={flipped ? piece.right : piece.left} horizontal={horizontal} />
      <span className="domino-piece__divider" />
      <Half value={flipped ? piece.left : piece.right} horizontal={horizontal} />
    </>
  ) : (
    piece.sum
  );

  const style = isFaceUp ? ({ '--half': `${half}px` } as CSSProperties) : undefined;

  if (onClick) {
    return (
      <button
        type="button"
        className={className}
        style={style}
        aria-label={label}
        aria-pressed={isFaceUp ? isSelected : undefined}
        onClick={onClick}
      >
        {content}
      </button>
    );
  }

  return (
    <span className={className} style={style} role="img" aria-label={label}>
      {content}
    </span>
  );
}
