import type { DominoPiece } from '../state/game-types';

/** Maior valor de um lado da peça (dominó duplo-seis). */
export const MAX_PIP = 6;

/** Quantidade de peças de um jogo completo (0-0 até 6-6). */
export const TOTAL_PIECES = ((MAX_PIP + 1) * (MAX_PIP + 2)) / 2;

/** Função que devolve um número em [0, 1), como `Math.random`. */
export type RandomFn = () => number;

/** Gera as 28 peças do dominó, todas viradas para baixo, em ordem fixa. */
export function generateDominoPieces(): DominoPiece[] {
  const pieces: DominoPiece[] = [];
  let idCounter = 0;

  for (let left = 0; left <= MAX_PIP; left++) {
    for (let right = left; right <= MAX_PIP; right++) {
      pieces.push({
        id: `piece-${idCounter++}`,
        left,
        right,
        sum: left + right,
        isFaceUp: false,
      });
    }
  }

  return pieces;
}

/**
 * Embaralha (Fisher-Yates) sem alterar o array original.
 * Recebe o gerador aleatório por parâmetro para ser testável.
 */
export function shufflePieces<T>(array: readonly T[], rng: RandomFn = Math.random): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/** Soma dos versos das peças de uma mão (a pontuação do jogador). */
export function handSum(hand: readonly DominoPiece[]): number {
  return hand.reduce((total, piece) => total + piece.sum, 0);
}

/** Bucha: peça com os dois lados iguais. */
export function isDouble(piece: DominoPiece): boolean {
  return piece.left === piece.right;
}
