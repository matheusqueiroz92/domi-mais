/**
 * Dedução pela soma: o que um jogador pode saber olhando para a mesa, a
 * própria mão e o verso (soma) das peças viradas. É a base do modo "dica" e
 * das decisões do computador; nada aqui lê os lados de uma peça virada.
 */
import type { DominoPiece, GameState, Table } from '../state/game-types';
import { generateDominoPieces } from './pieces';

/** Peça virada, como um jogador a enxerga: só o id e a soma. */
export interface HiddenPiece {
  id: string;
  sum: number;
}

/** Peça possível para um verso: os dois lados e a soma. */
export interface Candidate {
  left: number;
  right: number;
  sum: number;
}

/** Tudo o que um jogador pode saber em um dado momento. */
export interface PlayerView {
  table: Table;
  hand: DominoPiece[];
  drawnPieceId: string | null;
  pile: HiddenPiece[];
  /** Peças viradas de cada adversário. */
  opponents: HiddenPiece[][];
}

const hide = (piece: DominoPiece): HiddenPiece => ({ id: piece.id, sum: piece.sum });

/** Chave de uma peça que não depende da ordem dos lados. */
export const pairKey = (a: number, b: number) => (a <= b ? `${a}-${b}` : `${b}-${a}`);

/** Monta a visão do jogador `playerIndex`, escondendo os lados das peças viradas. */
export function getPlayerView(state: GameState, playerIndex: number): PlayerView {
  return {
    table: state.table,
    hand: state.players[playerIndex].hand,
    drawnPieceId: state.drawnPieceId,
    pile: state.drawPile.map(hide),
    opponents: state.players
      .filter((_, index) => index !== playerIndex)
      .map((player) => player.hand.map(hide)),
  };
}

/**
 * Peças cujo paradeiro o jogador não conhece (estão viradas no monte ou na
 * mão de alguém): as 28 menos as da mesa e as da própria mão.
 */
export function unknownPieces(view: PlayerView): Candidate[] {
  const seen = new Set(
    [...view.table.pieces, ...view.hand].map((piece) => pairKey(piece.left, piece.right))
  );
  return generateDominoPieces()
    .filter((piece) => !seen.has(pairKey(piece.left, piece.right)))
    .map(({ left, right, sum }) => ({ left, right, sum }));
}

/** A peça encaixa em alguma das pontas? (ponta `null` = mesa vazia) */
export function fitsEnds(
  piece: { left: number; right: number },
  ends: readonly (number | null)[]
): boolean {
  return ends.some((end) => end === null || piece.left === end || piece.right === end);
}

/**
 * Probabilidade de uma peça virada de soma `sum` encaixar em uma das pontas
 * `ends`, considerando só as peças que ainda podem ter essa soma.
 * É a dedução que o jogo ensina: soma 7 pode ser 1|6, 2|5 ou 3|4.
 */
export function fitProbability(
  sum: number,
  ends: readonly (number | null)[],
  unknown: readonly Candidate[]
): number {
  const candidates = unknown.filter((piece) => piece.sum === sum);
  if (candidates.length === 0) return 0;
  return candidates.filter((piece) => fitsEnds(piece, ends)).length / candidates.length;
}
