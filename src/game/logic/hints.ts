/**
 * Modo "dica": explica ao jogador da vez o raciocínio do jogo.
 * Usa só o que ele mesmo pode ver (`getPlayerView`): nunca revela uma peça virada.
 */
import type { GameState, TableSide } from '../state/game-types';
import { fitsEnds, getPlayerView, unknownPieces } from './deduction';
import type { Candidate } from './deduction';
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
export function getPlayHints(state: GameState, playerIndex: number): PlayHints {
  const { hand } = state.players[playerIndex];
  const table = state.table;

  const playable: PlayableHint[] = [];
  let best: { score: number; hint: NonNullable<PlayHints['suggestion']> } | null = null;

  for (const piece of hand) {
    const fits = getPlayableSides(piece, table);
    const sides = (['left', 'right'] as const).filter((side) => fits[side]);
    if (sides.length === 0) continue;
    playable.push({ pieceId: piece.id, left: piece.left, right: piece.right, sides });

    for (const side of sides) {
      const next = placePiece(table, piece, side);
      if (!next) continue;
      const ends = [next.leftEnd, next.rightEnd];
      const rest = hand.filter((other) => other.id !== piece.id);
      const stillFitting = rest.filter((other) => fitsEnds(other, ends)).length;
      const score = stillFitting * 100 + piece.sum + (isDouble(piece) ? 0.5 : 0);

      if (!best || score > best.score) {
        let reason: string;
        if (rest.length === 0) {
          reason = 'é a sua última peça';
        } else if (stillFitting > 0) {
          reason =
            stillFitting === 1
              ? 'depois dela, outra peça sua continua encaixando'
              : `depois dela, outras ${stillFitting} peças suas continuam encaixando`;
        } else {
          reason = `é a que tira mais pontos da sua mão (soma ${piece.sum})`;
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
export function formatCandidates(candidates: readonly Candidate[]): string {
  const names = candidates.map((piece) => `${piece.left}|${piece.right}`);
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} ou ${names[names.length - 1]}`;
}

/** Escreve quantas das peças possíveis encaixam: "1 de 3 encaixa". */
export function formatFitting(hint: Pick<SumHint, 'candidates' | 'fitting'>): string {
  const total = hint.candidates.length;
  if (hint.fitting === 0) return total === 1 ? 'não encaixa' : 'nenhuma encaixa';
  if (hint.fitting === total) {
    if (total === 1) return 'encaixa com certeza';
    return total === 2 ? 'as duas encaixam' : `as ${total} encaixam`;
  }
  return `${hint.fitting} de ${total} ${hint.fitting === 1 ? 'encaixa' : 'encaixam'}`;
}
