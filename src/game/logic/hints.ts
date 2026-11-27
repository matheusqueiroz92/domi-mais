import { pt } from '../../i18n/messages/pt';
import type { Messages } from '../../i18n/messages';
/**
 * Modo "dica": explica ao jogador da vez o raciocínio do jogo.
 * Usa só o que ele mesmo pode ver (`getPlayerView`): nunca revela uma peça virada.
 */
import type { GameState, TableSide } from '../state/game-types';
import { closingOutcome, fitsEnds, getPlayerView, unknownPieces } from './deduction';
import type { Candidate, ClosingOutcome } from './deduction';
import { isDouble } from './pieces';
import { getPlayableSides, placePiece } from './rules';

/** O que uma soma do monte pode ser, e quantas dessas peças encaixam na mesa. */
export interface SumHint {
  sum: number;
  /** Peças que ainda podem ter essa soma. */
  candidates: Candidate[];
  /** Quantas delas encaixam em alguma ponta. */
  fitting: number;
  /** Chance de uma peça com essa soma encaixar (0 a 1). */
  probability: number;
  /** Quantas peças do monte mostram essa soma. */
  tiles: number;
}

/**
 * Dicas para a compra: uma linha por soma disponível no monte, da maior chance
 * de encaixar para a menor (no empate, a menor soma primeiro).
 */
export function getDrawHints(state: GameState, playerIndex: number): SumHint[] {
  const view = getPlayerView(state, playerIndex);
  const unknown = unknownPieces(view);
  const ends = [view.table.leftEnd, view.table.rightEnd];

  const counts = new Map<number, number>();
  for (const tile of view.pile) counts.set(tile.sum, (counts.get(tile.sum) ?? 0) + 1);

  return [...counts.entries()]
    .map(([sum, tiles]) => {
      const candidates = unknown.filter((piece) => piece.sum === sum);
      const fitting = candidates.filter((piece) => fitsEnds(piece, ends)).length;
      return {
        sum,
        candidates,
        fitting,
        probability: candidates.length > 0 ? fitting / candidates.length : 0,
        tiles,
      };
    })
    .sort((a, b) => b.probability - a.probability || a.sum - b.sum);
}

/** Uma peça da mão que encaixa, e em quais pontas. */
export interface PlayableHint {
  pieceId: string;
  left: number;
  right: number;
  sides: TableSide[];
  /** Jogar esta peça fecha a mesa e acaba a partida: o resultado para quem joga. */
  closes?: ClosingOutcome;
}

export interface PlayHints {
  /** Peças da mão que encaixam na mesa. */
  playable: PlayableHint[];
  /** Jogada sugerida, com o motivo em palavras. `null` se nada encaixa. */
  suggestion: { pieceId: string; left: number; right: number; side: TableSide; reason: string } | null;
}

/**
 * Dicas para a jogada: quais peças da mão encaixam e uma sugestão simples,
 * com o motivo. A regra da sugestão é transparente: prefere a jogada que deixa
 * mais peças da própria mão encaixando depois; no empate, a que tira mais
 * pontos da mão (buchas primeiro).
 */
export function getPlayHints(state: GameState, playerIndex: number, m: Messages = pt): PlayHints {
  const { hand } = state.players[playerIndex];
  const table = state.table;
  const view = getPlayerView(state, playerIndex);

  const playable: PlayableHint[] = [];
  let best: { score: number; hint: NonNullable<PlayHints['suggestion']> } | null = null;

  for (const piece of hand) {
    const fits = getPlayableSides(piece, table);
    const sides = (['left', 'right'] as const).filter((side) => fits[side]);
    if (sides.length === 0) continue;
    const hint: PlayableHint = { pieceId: piece.id, left: piece.left, right: piece.right, sides };
    playable.push(hint);

    for (const side of sides) {
      const next = placePiece(table, piece, side);
      if (!next) continue;
      const ends = [next.leftEnd, next.rightEnd];
      const rest = hand.filter((other) => other.id !== piece.id);
      const stillFitting = rest.filter((other) => fitsEnds(other, ends)).length;
      // Fechar a mesa acaba a partida: vale muito se vence, nada se perde.
      const closes = closingOutcome(view, rest, next);
      if (closes) hint.closes = closes;
      const closingWeight = closes === 'win' ? 1e6 : closes === 'tie' ? 5e5 : closes === 'lose' ? -1e6 : 0;
      const score = closingWeight + stillFitting * 100 + piece.sum + (isDouble(piece) ? 0.5 : 0);

      if (!best || score > best.score) {
        let reason: string;
        const mine = rest.reduce((total, other) => total + other.sum, 0);
        if (closes === 'lose') {
          reason = m.hints.reason.closesLose;
        } else if (closes === 'tie') {
          reason = m.hints.reason.closesTie(mine);
        } else if (closes === 'win' && rest.length > 0) {
          reason = m.hints.reason.closesWin(mine);
        } else if (rest.length === 0) {
          reason = m.hints.reason.last;
        } else if (stillFitting > 0) {
          reason = m.hints.reason.stillFitting(stillFitting);
        } else {
          reason = m.hints.reason.mostPoints(piece.sum);
        }
        best = {
          score,
          hint: { pieceId: piece.id, left: piece.left, right: piece.right, side, reason },
        };
      }
    }
  }

  return { playable, suggestion: best?.hint ?? null };
}

/** Escreve as peças possíveis de uma soma: "1|6, 2|5 ou 3|4". */
export function formatCandidates(candidates: readonly Candidate[], m: Messages = pt): string {
  return m.common.orList(candidates.map((piece) => `${piece.left}|${piece.right}`));
}

/** Escreve quantas das peças possíveis encaixam: "1 de 3 encaixa". */
export function formatFitting(hint: Pick<SumHint, 'candidates' | 'fitting'>, m: Messages = pt): string {
  const total = hint.candidates.length;
  const texts = m.hints.fitting;
  if (hint.fitting === 0) return texts.none(total);
  if (hint.fitting === total) return total === 1 ? texts.sure : texts.all(total);
  return texts.some(hint.fitting, total);
}
