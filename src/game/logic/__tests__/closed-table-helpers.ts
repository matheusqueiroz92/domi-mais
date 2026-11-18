import type { DominoPiece, GameState, Table } from '../../state/game-types';
import { createInitialGameState } from '../../state/game-inicial-state';
import { generateDominoPieces } from '../pieces';

const ALL = generateDominoPieces();

/** Peça oficial (id `piece-N`) com os dois lados dados, em qualquer ordem. */
export function official(a: number, b: number): DominoPiece {
  const found = ALL.find((p) => (p.left === a && p.right === b) || (p.left === b && p.right === a));
  if (!found) throw new Error(`peça inexistente: ${a}|${b}`);
  return found;
}

/**
 * Mesa a um passo de fechar no 6: pontas 6 (esquerda) e 4 (direita), com 6
 * das 7 peças que têm 6 já na mesa. Só falta a 4|6: jogada na direita, ela
 * deixa as duas pontas em 6 e fecha a mesa.
 */
export const NEAR_CLOSED_CHAIN: [number, number][] = [
  [6, 0], [0, 1], [1, 6], [6, 6], [6, 2], [2, 3], [3, 6], [6, 5], [5, 4],
];

/**
 * Outra mesa a um passo de fechar: pontas 6 e 6, com as 6 peças x|6 na mesa.
 * Só falta a bucha 6|6, que fecha a mesa dos dois lados: é a única jogada
 * possível para quem a tem.
 */
export const DOUBLE_CHAIN: [number, number][] = [
  [6, 0], [0, 1], [1, 6], [6, 2], [2, 3], [3, 6], [6, 4], [4, 5], [5, 6],
];

export function nearClosedTable(chain: [number, number][] = NEAR_CLOSED_CHAIN): Table {
  return {
    leftEnd: chain[0][0],
    rightEnd: chain[chain.length - 1][1],
    pieces: chain.map(([left, right]) => ({ ...official(left, right), left, right, isFaceUp: true })),
  };
}

interface ClosingGame {
  /** Mão de cada jogador (2 a 4), como pares de números. O jogador 0 é o da vez. */
  hands: [number, number][][];
  /** Jogadores já sem peças, na ordem em que ficaram sem. */
  emptyHandOrder?: number[];
  /** O jogador da vez acabou de comprar esta peça (senão, o monte está vazio). */
  drawn?: [number, number] | null;
  /** Deixar o monte vazio (as peças que sobram vão para o jogador 1). */
  emptyPile?: boolean;
  protectTurns?: boolean;
  /** Mesa de partida (padrão: falta a 4|6). */
  chain?: [number, number][];
}

/**
 * Partida válida com as 28 peças oficiais (aceita até como partida salva),
 * na vez do jogador 0, antes da jogada que fecha a mesa. As peças que não
 * estão na mesa nem nas mãos ficam no monte.
 */
export function closingGame({
  hands,
  emptyHandOrder = [],
  drawn = [4, 6],
  emptyPile = false,
  protectTurns = false,
  chain = NEAR_CLOSED_CHAIN,
}: ClosingGame): GameState {
  const names = ['Ana', 'Beto', 'Caio', 'Dani'].slice(0, hands.length);
  const table = nearClosedTable(chain);
  const used = new Set(table.pieces.map((p) => p.id));
  const handPieces = hands.map((hand) =>
    hand.map(([a, b]) => {
      const p = official(a, b);
      if (used.has(p.id)) throw new Error(`peça repetida: ${a}|${b}`);
      used.add(p.id);
      return p;
    })
  );
  let pile = ALL.filter((p) => !used.has(p.id));
  if (emptyPile) {
    handPieces[1] = [...handPieces[1], ...pile];
    pile = [];
  }
  const base = createInitialGameState(names, { pieces: ALL, protectTurns });
  return {
    ...base,
    phase: 'playing',
    currentPlayerIndex: 0,
    table,
    drawPile: pile,
    initialPileOrder: ALL.map((p) => p.id),
    players: base.players.map((player, index) => ({ ...player, hand: handPieces[index] })),
    turnStep: 'play',
    drawnPieceId: !emptyPile && drawn ? official(drawn[0], drawn[1]).id : null,
    initialPieceId: table.pieces[0].id,
    lastPlayed: { playerIndex: hands.length - 1, pieceId: table.pieces[table.pieces.length - 1].id },
    emptyHandOrder,
  };
}

/** Jogada que fecha a mesa: a 4|6 na ponta direita. */
export const CLOSING_PIECE_ID = official(4, 6).id;
