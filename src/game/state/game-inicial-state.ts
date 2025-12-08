import type { GameState, DominoPiece } from './game-types';

// Gera todas as 28 peças do dominó
function generateDominoPieces(): DominoPiece[] {
  const pieces: DominoPiece[] = [];
  let idCounter = 0;

  for (let left = 0; left <= 6; left++) {
    for (let right = left; right <= 6; right++) {
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

// Embaralha as peças
function shufflePieces<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Encontra a peça inicial [0|0] ou [6|6]
function findInitialPiece(pieces: DominoPiece[]): DominoPiece | null {
  const zeroZero = pieces.find((p) => p.left === 0 && p.right === 0);
  if (zeroZero) return zeroZero;

  const sixSix = pieces.find((p) => p.left === 6 && p.right === 6);
  if (sixSix) return sixSix;

  return null;
}

export function createInitialGameState(): GameState {
  const allPieces = generateDominoPieces();
  const shuffledPieces = shufflePieces(allPieces);

  // Encontra e remove a peça inicial
  const initialPiece = findInitialPiece(shuffledPieces);
  const drawPile = initialPiece
    ? shuffledPieces.filter((p) => p.id !== initialPiece.id)
    : shuffledPieces;

  // Se encontrou peça inicial, vira ela
  if (initialPiece) {
    initialPiece.isFaceUp = true;
  }

  // Escolhe jogador inicial aleatoriamente
  const currentPlayerIndex = Math.floor(Math.random() * 2);

  return {
    phase: 'setup',
    players: [
      {
        id: 'player-1',
        name: 'Jogador 1',
        hand: [],
        score: 0,
      },
      {
        id: 'player-2',
        name: 'Jogador 2',
        hand: [],
        score: 0,
      },
    ],
    currentPlayerIndex,
    table: {
      leftEnd: initialPiece ? initialPiece.left : null,
      rightEnd: initialPiece ? initialPiece.right : null,
      pieces: initialPiece ? [initialPiece] : [],
    },
    drawPile,
    selectedPiece: null,
    activePlayerVisible: true,
    logs: initialPiece
      ? [`Peça inicial revelada: [${initialPiece.left}|${initialPiece.right}]`]
      : [],
  };
}

