/**
 * Jogador controlado pelo computador.
 *
 * O computador joga com as MESMAS informações que uma pessoa teria: as peças
 * da mesa, a própria mão e apenas a SOMA (o verso) das peças do monte e dos
 * adversários. Tudo o que ele usa vem de `getPlayerView`; ele nunca lê os lados
 * de uma peça virada.
 *
 * As funções são puras: o sorteio entra por `rng`.
 */
import type { BotLevel, DominoPiece, GameAction, GameState, Table, TableSide } from '../state/game-types';
import { isDouble } from '../logic/pieces';
import type { RandomFn } from '../logic/pieces';
import {
  canKeepPiece,
  chooseInitialPiece,
  drawPiece,
  keepPiece,
  playPiece,
} from '../logic/engine';
import { getPlayableSides, placePiece } from '../logic/rules';
import { fitProbability, fitsEnds as fitsAnyEnd, getPlayerView, pairKey, unknownPieces } from '../logic/deduction';
import type { HiddenPiece, PlayerView } from '../logic/deduction';

/** Nomes dos jogadores controlados pelo computador, na ordem em que entram na partida. */
export const BOT_NAMES = ['Bia', 'Léo', 'Duda'];

export const BOT_LEVEL_LABELS: Record<BotLevel, string> = {
  easy: 'Fácil',
  medium: 'Médio',
  hard: 'Difícil',
};

// A visão do jogador e a dedução pela soma ficam em logic/deduction.ts, porque
// o modo "dica" usa exatamente as mesmas contas. Os nomes antigos continuam valendo.
export { fitProbability, unknownPieces };
export type { HiddenPiece };
export type BotView = PlayerView;
export const getBotView = getPlayerView;

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
export const BLUFF_CHANCE: Record<BotLevel, number> = { easy: 0, medium: 0.06, hard: 0.03 };

type Hidden = { left: number; right: number; sum: number };
type Ends = readonly [number | null, number | null];

const fitsEnds = (piece: { left: number; right: number }, ends: Ends) => fitsAnyEnd(piece, ends);

interface Move {
  piece: DominoPiece;
  side: TableSide;
}

function legalMovesFor(hand: readonly DominoPiece[], table: Table): Move[] {
  const moves: Move[] = [];
  for (const piece of hand) {
    const sides = getPlayableSides(piece, table);
    if (sides.left) moves.push({ piece, side: 'left' });
    // Com as duas pontas iguais, jogar à direita daria no mesmo resultado.
    if (sides.right && !(sides.left && table.leftEnd === table.rightEnd)) {
      moves.push({ piece, side: 'right' });
    }
  }
  return moves;
}

/** Pontas da mesa depois de uma jogada. */
function endsAfter(table: Table, move: Move): Ends {
  const next = placePiece(table, move.piece, move.side);
  return next ? [next.leftEnd, next.rightEnd] : [table.leftEnd, table.rightEnd];
}

/* ------------------------------------------------------------------ Médio */

/** Nota de uma jogada para o nível médio (maior é melhor). */
function mediumMoveScore(view: BotView, move: Move, unknown: Hidden[]): number {
  const ends = endsAfter(view.table, move);
  // Livrar-se de pontos, buchas primeiro, e manter pontas boas para a própria mão.
  let score = move.piece.sum + (isDouble(move.piece) ? 2 : 0);
  const rest = view.hand.filter((piece) => piece.id !== move.piece.id);
  score += 1.5 * rest.filter((piece) => fitsEnds(piece, ends)).length;
  for (const hand of view.opponents) {
    for (const tile of hand) score -= 1.2 * fitProbability(tile.sum, ends, unknown);
  }
  if (rest.length === 0 && view.pile.length === 0) score += 100;
  return score;
}

/* ---------------------------------------------------------------- Difícil */

/**
 * Valor de uma posição para o nível difícil, logo depois da ação dele:
 * `hand` é o que sobra na mão e `ends` são as pontas que ficam na mesa.
 * Tudo é calculado só com informação pública.
 */
function positionValue(view: BotView, hand: readonly DominoPiece[], ends: Ends, unknown: Hidden[]): number {
  // Cada peça na mão é um turno perdido; os pontos pesam se o jogo fechar.
  let value = -10 * hand.length - 0.25 * hand.reduce((total, piece) => total + piece.sum, 0);

  // Ter jogada garantida para o próximo turno, e alguma reserva.
  const playable = hand.filter((piece) => fitsEnds(piece, ends)).length;
  if (playable > 0) value += 5 + 1.2 * Math.min(playable - 1, 2);

  // Mão variada (muitos números diferentes) encaixa mais vezes no futuro.
  const numbers = new Set(hand.flatMap((piece) => [piece.left, piece.right]));
  value += 0.6 * numbers.size;

  // Pontas difíceis para os outros: poucas peças escondidas encaixam nelas...
  if (unknown.length > 0) {
    value -= 6 * (unknown.filter((piece) => fitsEnds(piece, ends)).length / unknown.length);
  }
  // ...e, pelas somas das peças de cada adversário, a chance de ele ter jogada.
  for (const tiles of view.opponents) {
    let none = 1;
    for (const tile of tiles) none *= 1 - fitProbability(tile.sum, ends, unknown);
    value -= 3 * (1 - none);
  }

  // Ficar sem peças com o monte vazio é vencer.
  if (hand.length === 0 && view.pile.length === 0) value += 1000;
  return value;
}

/** Melhor valor que o difícil consegue com a mão `hand` neste turno (jogando ou não). */
function bestValue(view: BotView, hand: readonly DominoPiece[], unknown: Hidden[], mayKeep: boolean): number {
  const table = view.table;
  let best = mayKeep ? positionValue(view, hand, [table.leftEnd, table.rightEnd], unknown) : -Infinity;
  for (const move of legalMovesFor(hand, table)) {
    const rest = hand.filter((piece) => piece.id !== move.piece.id);
    best = Math.max(best, positionValue(view, rest, endsAfter(table, move), unknown));
  }
  return best;
}

/**
 * Compra do difícil: para cada soma disponível no monte, considera todas as
 * peças que ela pode ser e calcula como ficaria a posição depois da melhor
 * jogada. Escolhe a soma de maior valor esperado.
 */
function hardDrawValue(view: BotView, sum: number, unknown: Hidden[]): number {
  const candidates = unknown.filter((piece) => piece.sum === sum);
  if (candidates.length === 0) return -Infinity;

  let total = 0;
  for (const candidate of candidates) {
    const drawn: DominoPiece = { id: '?', left: candidate.left, right: candidate.right, sum, isFaceUp: false };
    const rest = unknown.filter((piece) => piece !== candidate);
    total += bestValue(view, [...view.hand, drawn], rest, true);
  }
  return total / candidates.length;
}

/* ------------------------------------------------------- Final de partida */

/** Limite de posições analisadas no final de partida (evita travar o navegador). */
const ENDGAME_NODE_LIMIT = 150_000;

/**
 * Final de partida com dois jogadores e o monte vazio: como todas as peças
 * escondidas estão na mão do adversário, o difícil sabe exatamente quais são
 * e calcula a partida até o fim. Devolve o valor para quem chama:
 * +1 vitória, -1 derrota, 0 empate (com um ajuste pequeno pela diferença de soma).
 */
function solveEndgame(
  mine: readonly Hidden[],
  theirs: readonly Hidden[],
  ends: Ends,
  myTurn: boolean,
  memo: Map<string, number>,
  budget: { nodes: number }
): number {
  if (mine.length === 0) return 1;
  if (theirs.length === 0) return -1;

  const key = `${mine.map((p) => pairKey(p.left, p.right)).join(',')}|${theirs
    .map((p) => pairKey(p.left, p.right))
    .join(',')}|${ends[0]}|${ends[1]}|${myTurn ? 1 : 0}`;
  const cached = memo.get(key);
  if (cached !== undefined) return cached;

  const sumOf = (hand: readonly Hidden[]) => hand.reduce((total, piece) => total + piece.sum, 0);
  const blockedValue = () => {
    const diff = sumOf(theirs) - sumOf(mine);
    return diff === 0 ? 0 : Math.sign(diff) * (0.5 + Math.min(Math.abs(diff), 100) / 250);
  };

  const mover = myTurn ? mine : theirs;
  const other = myTurn ? theirs : mine;
  const playable = mover.filter((piece) => fitsEnds(piece, ends));

  let value: number;
  if (playable.length === 0) {
    // Sem jogada: passa a vez. Se o outro também não tem, o jogo fechou.
    value = other.some((piece) => fitsEnds(piece, ends))
      ? solveEndgame(mine, theirs, ends, !myTurn, memo, budget)
      : blockedValue();
  } else if (budget.nodes-- <= 0) {
    // Orçamento esgotado: estima pelo estado atual.
    value = blockedValue() * 0.5 + (theirs.length - mine.length) * 0.05;
  } else {
    value = myTurn ? -Infinity : Infinity;
    for (const piece of playable) {
      const rest = mover.filter((other2) => other2 !== piece);
      const options: Ends[] = [];
      for (const side of [0, 1] as const) {
        const end = ends[side];
        if (end !== null && piece.left !== end && piece.right !== end) continue;
        const outer = end === null ? piece.right : piece.left === end ? piece.right : piece.left;
        const next: Ends = side === 0 ? [outer, ends[1]] : [ends[0], outer];
        if (!options.some((o) => o[0] === next[0] && o[1] === next[1])) options.push(next);
      }
      for (const next of options) {
        const result = myTurn
          ? solveEndgame(rest, theirs, next, false, memo, budget)
          : solveEndgame(mine, rest, next, true, memo, budget);
        value = myTurn ? Math.max(value, result) : Math.min(value, result);
      }
    }
  }

  memo.set(key, value);
  return value;
}

/** O difícil conhece exatamente a mão do único adversário? (monte vazio, dois jogadores) */
function knownOpponentHand(view: BotView, unknown: Hidden[]): Hidden[] | null {
  if (view.pile.length > 0 || view.opponents.length !== 1) return null;
  const tiles = view.opponents[0];
  if (tiles.length !== unknown.length) return null;
  const sums = (list: { sum: number }[]) => list.map((item) => item.sum).sort((a, b) => a - b).join(',');
  return sums(tiles) === sums(unknown) ? unknown : null;
}

/* ---------------------------------------------------------------- Decisões */

/** Qual peça do monte pegar (na compra ou como peça inicial). */
function choosePileTile(view: BotView, level: BotLevel, rng: RandomFn): HiddenPiece {
  if (level === 'easy') return pickRandom(view.pile, rng);

  // Peça inicial: a de maior soma sai do jogo sem ir para a mão de ninguém.
  if (view.table.pieces.length === 0) return pickBest(view.pile, (tile) => tile.sum, rng);

  const unknown = unknownPieces(view);
  const ends: Ends = [view.table.leftEnd, view.table.rightEnd];

  if (level === 'medium') {
    // Médio deduz pela soma qual peça tem mais chance de encaixar; entre
    // chances parecidas, fica com a de menor soma.
    return pickBest(view.pile, (tile) => fitProbability(tile.sum, ends, unknown) * 100 - tile.sum, rng);
  }

  return pickRandom(view.pile, rng);
}

/** Jogada (ou `null` para ficar com a peça) escolhida pelo nível difícil. */
function chooseHardMove(view: BotView, moves: Move[], mayKeep: boolean, rng: RandomFn): Move | null {
  const unknown = unknownPieces(view);
  const table = view.table;
  const heuristic = (move: Move) =>
    positionValue(
      view,
      view.hand.filter((piece) => piece.id !== move.piece.id),
      endsAfter(table, move),
      unknown
    );

  const opponentHand = knownOpponentHand(view, unknown);
  if (!opponentHand) return pickBest(moves, heuristic, rng);

  // Final de partida calculado: escolhe o que leva ao melhor resultado certo.
  const memo = new Map<string, number>();
  const budget = { nodes: ENDGAME_NODE_LIMIT };
  const ends: Ends = [table.leftEnd, table.rightEnd];
  const options: Array<{ move: Move | null; value: number }> = moves.map((move) => ({
    move,
    value:
      solveEndgame(
        view.hand.filter((piece) => piece.id !== move.piece.id),
        opponentHand,
        endsAfter(table, move),
        false,
        memo,
        budget
      ) +
      heuristic(move) / 100_000,
  }));
  if (mayKeep) {
    options.push({ move: null, value: solveEndgame(view.hand, opponentHand, ends, false, memo, budget) - 1e-6 });
  }
  return pickBest(options, (option) => option.value, rng).move;
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

/* ------------------------------------------------- Simulação (Monte Carlo) */

/** Quantos "mundos possíveis" o difícil sorteia para comparar as opções. */
export const HARD_SAMPLES = 36;
/** Quantas opções de compra (somas diferentes) o difícil compara por simulação. */
const HARD_DRAW_OPTIONS = 5;

/** Aplica uma ação do jogo direto pelo motor (sem passar pelo reducer). */
function applyAction(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'CHOOSE_INITIAL_PIECE':
      return chooseInitialPiece(state, action.pieceId);
    case 'DRAW_PIECE':
      return drawPiece(state, action.pieceId);
    case 'PLAY_PIECE':
      return playPiece(state, action.pieceId, action.position);
    case 'KEEP_PIECE':
      return keepPiece(state);
    default:
      return state;
  }
}

/**
 * Cria um "mundo possível": dá a cada peça virada (monte e adversários) uma
 * identidade sorteada entre as peças que ela pode ser, respeitando a soma do
 * verso. Usa só informação pública: é o que uma pessoa imaginaria.
 */
function imagineWorld(state: GameState, me: number, unknown: Hidden[], rng: RandomFn): GameState {
  const bySum = new Map<number, Hidden[]>();
  for (const piece of unknown) {
    const group = bySum.get(piece.sum);
    if (group) group.push(piece);
    else bySum.set(piece.sum, [piece]);
  }
  // Embaralha as possibilidades de cada soma.
  for (const group of bySum.values()) {
    for (let i = group.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [group[i], group[j]] = [group[j], group[i]];
    }
  }
  const imagine = (piece: DominoPiece): DominoPiece => {
    const guess = bySum.get(piece.sum)?.pop();
    return guess ? { ...piece, left: guess.left, right: guess.right } : piece;
  };

  return {
    ...state,
    protectTurns: false,
    logs: [],
    drawPile: state.drawPile.map(imagine),
    players: state.players.map((player, index) =>
      index === me ? player : { ...player, hand: player.hand.map(imagine) }
    ),
  };
}

/** Joga a partida imaginada até o fim, com todos usando a tática do nível médio. */
function playOut(start: GameState, me: number, rng: RandomFn): number {
  let state = start;
  for (let step = 0; step < 300 && state.phase !== 'finished'; step++) {
    const action = decide(state, 'medium', rng, false);
    if (!action) break;
    const next = applyAction(state, action);
    if (next === state) break;
    state = next;
  }

  const result = state.result;
  if (!result) return 0.5;
  const mySum = result.scores[me];
  // Vitória vale 1 (dividida em caso de empate); a soma da mão desempata.
  const win = result.winnerIndexes.includes(me) ? 1 / result.winnerIndexes.length : 0;
  return win - mySum / 2000;
}

/**
 * Compara as opções sorteando vários mundos possíveis e jogando cada um até o
 * fim. Todas as opções são testadas nos mesmos mundos, o que reduz o acaso.
 */
function pickBySimulation(
  state: GameState,
  me: number,
  options: GameAction[],
  rng: RandomFn
): GameAction {
  if (options.length === 1) return options[0];

  const view = getBotView(state, me);
  const unknown = unknownPieces(view);
  const totals = options.map(() => 0);

  for (let sample = 0; sample < HARD_SAMPLES; sample++) {
    const world = imagineWorld(state, me, unknown, rng);
    options.forEach((option, index) => {
      totals[index] += playOut(applyAction(world, option), me, rng);
    });
  }

  let best = 0;
  for (let index = 1; index < options.length; index++) {
    if (totals[index] > totals[best] + 1e-9) best = index;
  }
  return options[best];
}

/** Decisão do nível difícil, com simulação (fora do final calculado). */
function decideHard(state: GameState, view: BotView, rng: RandomFn, allowBluff: boolean): GameAction | null {
  const me = state.currentPlayerIndex;

  if (state.phase === 'choosing-initial') {
    return { type: 'CHOOSE_INITIAL_PIECE', pieceId: pickBest(view.pile, (tile) => tile.sum, rng).id };
  }

  if (state.turnStep === 'draw') {
    // Pré-seleciona as somas mais promissoras e decide entre elas por simulação.
    const unknown = unknownPieces(view);
    const bySum = new Map<number, HiddenPiece>();
    for (const tile of view.pile) if (!bySum.has(tile.sum)) bySum.set(tile.sum, tile);
    const ranked = [...bySum.values()]
      .map((tile) => ({ tile, value: hardDrawValue(view, tile.sum, unknown) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, HARD_DRAW_OPTIONS);
    const options: GameAction[] = ranked.map(({ tile }) => ({ type: 'DRAW_PIECE', pieceId: tile.id }));
    return pickBySimulation(state, me, options, rng);
  }

  const moves = legalMovesFor(view.hand, view.table);
  const mayKeep = canKeepPiece(state);
  if (moves.length === 0) return mayKeep ? { type: 'KEEP_PIECE' } : null;
  if (allowBluff && mayKeep && shouldBluff(view, 'hard', rng)) return { type: 'KEEP_PIECE' };

  // Com dois jogadores e o monte vazio, o final é calculado com exatidão.
  const unknown = unknownPieces(view);
  if (knownOpponentHand(view, unknown)) {
    const move = chooseHardMove(view, moves, mayKeep, rng);
    return move ? { type: 'PLAY_PIECE', pieceId: move.piece.id, position: move.side } : { type: 'KEEP_PIECE' };
  }

  const options: GameAction[] = moves.map((move) => ({
    type: 'PLAY_PIECE',
    pieceId: move.piece.id,
    position: move.side,
  }));
  return pickBySimulation(state, me, options, rng);
}

/** Decisão de um nível para o jogador da vez (usada também dentro das simulações). */
function decide(state: GameState, level: BotLevel, rng: RandomFn, allowBluff: boolean): GameAction | null {
  if (state.phase !== 'choosing-initial' && state.phase !== 'playing') return null;

  const view = getBotView(state, state.currentPlayerIndex);
  const needsPile = state.phase === 'choosing-initial' || state.turnStep === 'draw';
  if (needsPile && view.pile.length === 0) return null;

  if (level === 'hard') return decideHard(state, view, rng, allowBluff);

  if (state.phase === 'choosing-initial') {
    return { type: 'CHOOSE_INITIAL_PIECE', pieceId: choosePileTile(view, level, rng).id };
  }
  if (state.turnStep === 'draw') {
    return { type: 'DRAW_PIECE', pieceId: choosePileTile(view, level, rng).id };
  }

  const moves = legalMovesFor(view.hand, view.table);
  const mayKeep = canKeepPiece(state);

  if (moves.length === 0) return mayKeep ? { type: 'KEEP_PIECE' } : null;
  if (allowBluff && mayKeep && shouldBluff(view, level, rng)) return { type: 'KEEP_PIECE' };

  let move: Move;
  if (level === 'easy') {
    move = pickRandom(moves, rng);
  } else {
    const unknown = unknownPieces(view);
    move = pickBest(moves, (candidate) => mediumMoveScore(view, candidate, unknown), rng);
  }
  return { type: 'PLAY_PIECE', pieceId: move.piece.id, position: move.side };
}

/**
 * Próxima ação do computador que controla o jogador da vez.
 * Devolve `null` quando não há o que fazer (fase em que ninguém joga, ou o
 * jogador da vez não é um computador).
 */
export function chooseBotAction(state: GameState, rng: RandomFn = Math.random): GameAction | null {
  const level = state.players[state.currentPlayerIndex]?.botLevel;
  if (!level) return null;
  return decide(state, level, rng, true);
}
