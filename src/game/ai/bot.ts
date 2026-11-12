/**
 * Jogador controlado pelo computador.
 *
 * O computador joga com as MESMAS informações que uma pessoa teria: as peças
 * da mesa, a própria mão e apenas a SOMA (o verso) das peças do monte e dos
 * adversários. Tudo o que ele usa vem de `getBotView`; ele nunca lê os lados
 * de uma peça virada.
 *
 * As funções são puras: o sorteio entra por `rng`.
 */
import type { BotLevel, DominoPiece, GameAction, GameState, Table, TableSide } from '../state/game-types';
import { generateDominoPieces, isDouble } from '../logic/pieces';
import type { RandomFn } from '../logic/pieces';
import { canKeepPiece } from '../logic/engine';
import { getPlayableSides, placePiece } from '../logic/rules';

/** Nomes dos jogadores controlados pelo computador, na ordem em que entram na partida. */
export const BOT_NAMES = ['Bia', 'Léo', 'Duda'];

export const BOT_LEVEL_LABELS: Record<BotLevel, string> = {
  easy: 'Fácil',
  medium: 'Médio',
  hard: 'Difícil',
};

/** Peça virada, como o computador a enxerga: só o id e a soma. */
export interface HiddenPiece {
  id: string;
  sum: number;
}

/** Tudo o que o computador pode saber em um dado momento. */
export interface BotView {
  table: Table;
  hand: DominoPiece[];
  drawnPieceId: string | null;
  pile: HiddenPiece[];
  /** Peças viradas de cada adversário. */
  opponents: HiddenPiece[][];
}

const hide = (piece: DominoPiece): HiddenPiece => ({ id: piece.id, sum: piece.sum });

/** Monta a visão do jogador `playerIndex`, escondendo os lados das peças viradas. */
export function getBotView(state: GameState, playerIndex: number): BotView {
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

const pairKey = (a: number, b: number) => (a <= b ? `${a}-${b}` : `${b}-${a}`);

/**
 * Peças cujo paradeiro o computador não conhece (estão viradas no monte ou na
 * mão de alguém): as 28 menos as da mesa e as da própria mão.
 */
export function unknownPieces(view: BotView): Array<{ left: number; right: number; sum: number }> {
  const seen = new Set(
    [...view.table.pieces, ...view.hand].map((piece) => pairKey(piece.left, piece.right))
  );
  return generateDominoPieces().filter((piece) => !seen.has(pairKey(piece.left, piece.right)));
}

/**
 * Probabilidade de uma peça virada de soma `sum` encaixar em uma das pontas
 * `ends`, considerando só as peças que ainda podem ter essa soma.
 * É a dedução que o jogo ensina: soma 7 pode ser 1|6, 2|5 ou 3|4.
 */
export function fitProbability(
  sum: number,
  ends: readonly (number | null)[],
  unknown: ReadonlyArray<{ left: number; right: number; sum: number }>
): number {
  const candidates = unknown.filter((piece) => piece.sum === sum);
  if (candidates.length === 0) return 0;
  const fitting = candidates.filter((piece) =>
    ends.some((end) => end === null || piece.left === end || piece.right === end)
  );
  return fitting.length / candidates.length;
}

function pickRandom<T>(items: readonly T[], rng: RandomFn): T {
  return items[Math.min(items.length - 1, Math.floor(rng() * items.length))];
}

/** Escolhe o item de maior nota; empates são decididos por sorteio. */
function pickBest<T>(items: readonly T[], score: (item: T) => number, rng: RandomFn): T {
  let best: T[] = [];
  let bestScore = -Infinity;
  for (const item of items) {
    const value = score(item);
    if (value > bestScore + 1e-9) {
      best = [item];
      bestScore = value;
    } else if (Math.abs(value - bestScore) <= 1e-9) {
      best.push(item);
    }
  }
  return pickRandom(best, rng);
}

/** Chance de blefar (ficar com uma peça que encaixa) por nível. */
export const BLUFF_CHANCE: Record<BotLevel, number> = { easy: 0, medium: 0.06, hard: 0.1 };

/** Qual peça do monte pegar (na compra ou como peça inicial). */
function choosePileTile(view: BotView, level: BotLevel, rng: RandomFn): HiddenPiece {
  if (level === 'easy' || view.table.pieces.length === 0) {
    // Fácil joga no escuro. Para a peça inicial, os demais tiram a de maior
    // soma: ela sai do jogo sem ir para a mão de ninguém.
    return level === 'easy' ? pickRandom(view.pile, rng) : pickBest(view.pile, (t) => t.sum, rng);
  }

  const unknown = unknownPieces(view);
  const ends = [view.table.leftEnd, view.table.rightEnd];

  if (level === 'medium') {
    // Médio prefere somas baixas: se a peça não encaixar, pesa pouco na mão.
    return pickBest(view.pile, (tile) => -tile.sum, rng);
  }

  // Difícil deduz pela soma qual peça tem mais chance de encaixar; entre
  // chances parecidas, fica com a de menor soma.
  return pickBest(view.pile, (tile) => fitProbability(tile.sum, ends, unknown) * 100 - tile.sum, rng);
}

interface Move {
  piece: DominoPiece;
  side: TableSide;
}

function legalMoves(view: BotView): Move[] {
  const moves: Move[] = [];
  for (const piece of view.hand) {
    const sides = getPlayableSides(piece, view.table);
    if (sides.left) moves.push({ piece, side: 'left' });
    // Com as duas pontas iguais, jogar à direita daria no mesmo resultado.
    if (sides.right && !(sides.left && view.table.leftEnd === view.table.rightEnd)) {
      moves.push({ piece, side: 'right' });
    }
  }
  return moves;
}

/** Nota de uma jogada para o nível difícil (maior é melhor). */
function scoreMove(view: BotView, move: Move, unknown: ReturnType<typeof unknownPieces>): number {
  const table = placePiece(view.table, move.piece, move.side);
  if (!table) return -Infinity;
  const ends = [table.leftEnd, table.rightEnd];

  // 1. Livrar-se de pontos: a soma da peça sai da mão.
  let score = move.piece.sum;
  // 2. Buchas são difíceis de encaixar depois: melhor jogá-las logo.
  if (isDouble(move.piece)) score += 2;
  // 3. Deixar pontas em que as próprias peças restantes encaixam.
  const rest = view.hand.filter((piece) => piece.id !== move.piece.id);
  score += 1.5 * rest.filter((piece) => ends.some((end) => piece.left === end || piece.right === end)).length;
  // 4. Dificultar para os adversários: pelas somas das peças deles, estimar
  //    quantas encaixariam nas novas pontas.
  const stillUnknown = unknown.filter(
    (piece) => pairKey(piece.left, piece.right) !== pairKey(move.piece.left, move.piece.right)
  );
  for (const hand of view.opponents) {
    for (const tile of hand) score -= 1.2 * fitProbability(tile.sum, ends, stillUnknown);
  }
  // 5. Quem fica sem peças com o monte vazio vence: priorizar a última peça.
  if (rest.length === 0 && view.pile.length === 0) score += 100;
  return score;
}

function chooseMove(view: BotView, moves: Move[], level: BotLevel, rng: RandomFn): Move {
  if (level === 'easy') return pickRandom(moves, rng);
  if (level === 'medium') return pickBest(moves, (move) => move.piece.sum + (isDouble(move.piece) ? 1 : 0), rng);
  const unknown = unknownPieces(view);
  return pickBest(moves, (move) => scoreMove(view, move, unknown), rng);
}

/**
 * Decide se o computador blefa neste turno. Só faz sentido quando ele poderia
 * jogar e a regra permite ficar com a peça. O difícil só blefa quando sai
 * barato: monte ainda grande e peça comprada de soma baixa.
 */
function shouldBluff(view: BotView, level: BotLevel, rng: RandomFn): boolean {
  if (rng() >= BLUFF_CHANCE[level]) return false;
  if (level !== 'hard') return true;
  const drawn = view.hand.find((piece) => piece.id === view.drawnPieceId);
  return view.pile.length > 8 && (drawn?.sum ?? 99) <= 5;
}

/**
 * Próxima ação do computador que controla o jogador da vez.
 * Devolve `null` quando não há o que fazer (fase em que ninguém joga, ou o
 * jogador da vez não é um computador).
 */
export function chooseBotAction(state: GameState, rng: RandomFn = Math.random): GameAction | null {
  const level = state.players[state.currentPlayerIndex]?.botLevel;
  if (!level) return null;

  const view = getBotView(state, state.currentPlayerIndex);

  if (state.phase === 'choosing-initial') {
    if (view.pile.length === 0) return null;
    return { type: 'CHOOSE_INITIAL_PIECE', pieceId: choosePileTile(view, level, rng).id };
  }

  if (state.phase !== 'playing') return null;

  if (state.turnStep === 'draw') {
    if (view.pile.length === 0) return null;
    return { type: 'DRAW_PIECE', pieceId: choosePileTile(view, level, rng).id };
  }

  const moves = legalMoves(view);
  const mayKeep = canKeepPiece(state);

  if (moves.length === 0) return mayKeep ? { type: 'KEEP_PIECE' } : null;
  if (mayKeep && shouldBluff(view, level, rng)) return { type: 'KEEP_PIECE' };

  const move = chooseMove(view, moves, level, rng);
  return { type: 'PLAY_PIECE', pieceId: move.piece.id, position: move.side };
}
