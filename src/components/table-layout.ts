/**
 * Cálculos de layout da mesa (sem React): a linha de peças dobra em fileiras
 * ("cobrinha") e os adversários são distribuídos em volta da mesa.
 */
import type { DominoPiece, TableSide } from '../game/state/game-types';
import { isDouble } from '../game/logic/pieces';

export type ChainItem =
  | { kind: 'piece'; piece: DominoPiece }
  | { kind: 'slot'; side: TableSide };

export interface ChainRow {
  /** Fileira que corre da direita para a esquerda (as peças são desenhadas invertidas). */
  reversed: boolean;
  items: ChainItem[];
}

export interface ChainLayoutOptions {
  /** Largura disponível para uma fileira, em px. */
  maxWidth: number;
  /** Lado de meia peça, em px. */
  half: number;
  /** Espaço entre itens, em px. */
  gap?: number;
  /** Mostrar o alvo de jogada na ponta esquerda / direita. */
  leftSlot?: boolean;
  rightSlot?: boolean;
}

/** Folga para borda e divisória da peça. */
const PIECE_EXTRA = 4;

/** Largura ocupada por uma peça na mesa: bucha fica em pé, as demais deitadas. */
export function pieceWidth(piece: DominoPiece, half: number): number {
  return (isDouble(piece) ? half : half * 2) + PIECE_EXTRA;
}

/** Largura do alvo de jogada (mínimo de 44 px para o toque). */
export function slotWidth(half: number): number {
  return Math.max(44, half * 2);
}

/** Lado de meia peça conforme a largura da mesa. */
export function halfForWidth(tableWidth: number): number {
  return tableWidth >= 520 ? 28 : 20;
}

/**
 * Distribui as peças da mesa em fileiras que cabem em `maxWidth`.
 * As fileiras alternam o sentido: a primeira vai da esquerda para a direita,
 * a segunda volta da direita para a esquerda, e assim por diante.
 */
export function layoutChain(pieces: readonly DominoPiece[], options: ChainLayoutOptions): ChainRow[] {
  const { maxWidth, half, gap = 2, leftSlot = false, rightSlot = false } = options;

  const items: ChainItem[] = [
    ...(leftSlot ? [{ kind: 'slot', side: 'left' } as const] : []),
    ...pieces.map((piece) => ({ kind: 'piece', piece }) as const),
    ...(rightSlot ? [{ kind: 'slot', side: 'right' } as const] : []),
  ];

  const rows: ChainRow[] = [];
  let current: ChainItem[] = [];
  let used = 0;

  for (const item of items) {
    const width = item.kind === 'slot' ? slotWidth(half) : pieceWidth(item.piece, half);
    const needed = current.length === 0 ? width : used + gap + width;

    if (current.length > 0 && needed > maxWidth) {
      rows.push({ reversed: rows.length % 2 === 1, items: current });
      current = [item];
      used = width;
    } else {
      current.push(item);
      used = needed;
    }
  }

  if (current.length > 0) {
    rows.push({ reversed: rows.length % 2 === 1, items: current });
  }

  return rows;
}

/** Posição de uma peça espalhada na mesa, em % da área da mesa, e seu giro em graus. */
export interface ScatterPoint {
  x: number;
  y: number;
  rotate: number;
}

/**
 * Trajeto de cada peça na animação de embaralhar: uma sequência de posições
 * sorteadas sobre a mesa. Recebe o gerador aleatório para ser testável.
 */
export function createScatter(
  count: number,
  rng: () => number = Math.random,
  stops = 4
): ScatterPoint[][] {
  return Array.from({ length: count }, () =>
    Array.from({ length: stops }, () => ({
      x: 4 + rng() * 80,
      y: 6 + rng() * 66,
      rotate: Math.round(rng() * 360 - 180),
    }))
  );
}

export interface Seats {
  top: number | null;
  left: number | null;
  right: number | null;
}

/**
 * Posição de cada adversário em volta da mesa, vista por `viewerIndex`
 * (que fica embaixo). Os adversários seguem a ordem dos turnos, em sentido
 * horário: esquerda, em cima, direita.
 */
export function seatOpponents(playerCount: number, viewerIndex: number): Seats {
  const others = Array.from(
    { length: Math.max(0, playerCount - 1) },
    (_, step) => (viewerIndex + step + 1) % playerCount
  );

  if (others.length === 1) return { top: others[0], left: null, right: null };
  if (others.length === 2) return { top: null, left: others[0], right: others[1] };
  return { left: others[0] ?? null, top: others[1] ?? null, right: others[2] ?? null };
}
