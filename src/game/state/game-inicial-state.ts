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

export function createInitialGameState(
  player1Name: string,
  player2Name: string
): GameState {
  const allPieces = generateDominoPieces();
  const shuffledPieces = shufflePieces(allPieces);

  // Escolhe jogador inicial aleatoriamente
  const currentPlayerIndex = Math.floor(Math.random() * 2);

  return {
    phase: 'setup',
    players: [
      {
        id: 'player-1',
        name: player1Name,
        hand: [],
        score: 0,
      },
      {
        id: 'player-2',
        name: player2Name,
        hand: [],
        score: 0,
      },
    ],
    currentPlayerIndex,
    table: {
      leftEnd: null,
      rightEnd: null,
      pieces: [],
    },
    drawPile: shuffledPieces,
    selectedPiece: null,
    activePlayerVisible: true,
    hasDrawnPieceThisTurn: false,
    logs: [],
  };
}

