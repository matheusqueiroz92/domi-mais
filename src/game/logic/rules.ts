import type {
  DominoPiece,
  GameResult,
  GameState,
  Player,
  Table,
  TableSide,
} from '../state/game-types';
import { handSum } from './pieces';

/** Valor da ponta da mesa em um dos lados (`null` com a mesa vazia). */
export function getTableEnd(table: Table, side: TableSide): number | null {
  return side === 'left' ? table.leftEnd : table.rightEnd;
}

/** A peça encaixa na ponta indicada? Com a mesa vazia, qualquer peça encaixa. */
export function fitsSide(piece: DominoPiece, side: TableSide, table: Table): boolean {
  const end = getTableEnd(table, side);
  return end === null || piece.left === end || piece.right === end;
}

/** Em quais pontas a peça encaixa. */
export function getPlayableSides(
  piece: DominoPiece,
  table: Table
): Record<TableSide, boolean> {
  return {
    left: fitsSide(piece, 'left', table),
    right: fitsSide(piece, 'right', table),
  };
}

/** A peça encaixa em pelo menos uma ponta? */
export function pieceFits(piece: DominoPiece, table: Table): boolean {
  return fitsSide(piece, 'left', table) || fitsSide(piece, 'right', table);
}

/** A mão tem alguma peça que encaixa na mesa? */
export function hasPlayablePiece(hand: readonly DominoPiece[], table: Table): boolean {
  return hand.some((piece) => pieceFits(piece, table));
}

/**
 * Devolve a peça aberta e orientada para a ponta escolhida:
 * à esquerda, o lado direito da peça toca a ponta; à direita, o lado esquerdo.
 * Pressupõe que a peça encaixa (ver `fitsSide`).
 */
export function orientPieceForSide(
  piece: DominoPiece,
  side: TableSide,
  table: Table
): DominoPiece {
  const placed: DominoPiece = { ...piece, isFaceUp: true };
  const end = getTableEnd(table, side);
  if (end === null) return placed;

  const touching = side === 'left' ? placed.right : placed.left;
  if (touching === end) return placed;
  return { ...placed, left: piece.right, right: piece.left };
}

/**
 * Coloca a peça na ponta escolhida e devolve a nova mesa.
 * Devolve `null` se a peça não encaixa nessa ponta.
 */
export function placePiece(table: Table, piece: DominoPiece, side: TableSide): Table | null {
  if (!fitsSide(piece, side, table)) return null;

  const placed = orientPieceForSide(piece, side, table);

  if (table.pieces.length === 0) {
    return { leftEnd: placed.left, rightEnd: placed.right, pieces: [placed] };
  }

  return side === 'left'
    ? { ...table, leftEnd: placed.left, pieces: [placed, ...table.pieces] }
    : { ...table, rightEnd: placed.right, pieces: [...table.pieces, placed] };
}

/** Jogo fechado: nenhuma peça de nenhuma mão encaixa na mesa. */
export function isBlocked(players: readonly Player[], table: Table): boolean {
  return players.every((player) => !hasPlayablePiece(player.hand, table));
}

/**
 * Verifica se a partida terminou e, em caso positivo, devolve o resultado.
 *
 * Regras (docs/REGRAS.md):
 * - enquanto houver peças no monte, a partida nunca termina;
 * - com o monte vazio, vence quem ficar sem peças na mão;
 * - com o monte vazio e nenhuma peça encaixando (jogo fechado), vence a menor
 *   soma das peças da mão; somas iguais dão empate.
 */
export function computeResult(
  state: Pick<GameState, 'players' | 'table' | 'drawPile'>
): GameResult | null {
  if (state.drawPile.length > 0) return null;

  const scores = state.players.map((player) => handSum(player.hand));

  const emptyHanded = state.players
    .map((player, index) => (player.hand.length === 0 ? index : -1))
    .filter((index) => index !== -1);

  if (emptyHanded.length > 0) {
    return {
      reason: 'empty-hand',
      winnerIndex: emptyHanded.length === 1 ? emptyHanded[0] : null,
      scores,
    };
  }

  if (isBlocked(state.players, state.table)) {
    const lowest = Math.min(...scores);
    const winners = scores
      .map((score, index) => (score === lowest ? index : -1))
      .filter((index) => index !== -1);
    return {
      reason: 'blocked',
      winnerIndex: winners.length === 1 ? winners[0] : null,
      scores,
    };
  }

  return null;
}
