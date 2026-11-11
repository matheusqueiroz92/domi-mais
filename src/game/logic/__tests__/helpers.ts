import type { DominoPiece, GameState } from '../../state/game-types';
import { createInitialGameState } from '../../state/game-inicial-state';
import type { RandomFn } from '../pieces';

/** Cria uma peça de teste com id legível, ex.: piece(3, 5) -> id "3-5". */
export function piece(left: number, right: number, id = `${left}-${right}`): DominoPiece {
  return { id, left, right, sum: left + right, isFaceUp: false };
}

/** Mesa com uma única peça aberta. */
export function tableWith(left: number, right: number) {
  return {
    leftEnd: left,
    rightEnd: right,
    pieces: [{ ...piece(left, right, `mesa-${left}-${right}`), isFaceUp: true }],
  };
}

interface Scenario {
  table?: [number, number];
  handA?: DominoPiece[];
  handB?: DominoPiece[];
  pile?: DominoPiece[];
  current?: 0 | 1;
  turnStep?: GameState['turnStep'];
  drawnPieceId?: string | null;
  protectTurns?: boolean;
}

/** Monta um estado em andamento (fase `playing`) para um cenário específico. */
export function scenario({
  table = [3, 5],
  handA = [],
  handB = [],
  pile = [],
  current = 0,
  turnStep,
  drawnPieceId = null,
  protectTurns = true,
}: Scenario = {}): GameState {
  const base = createInitialGameState('Ana', 'Beto', { pieces: pile, protectTurns });
  return {
    ...base,
    phase: 'playing',
    currentPlayerIndex: current,
    table: tableWith(table[0], table[1]),
    players: [
      { ...base.players[0], hand: handA },
      { ...base.players[1], hand: handB },
    ],
    turnStep: turnStep ?? (pile.length > 0 ? 'draw' : 'play'),
    drawnPieceId,
  };
}

/** Gerador pseudoaleatório com semente (mulberry32), para testes reproduzíveis. */
export function seededRandom(seed: number): RandomFn {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
