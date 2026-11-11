import type { DominoPiece, GameState } from './game-types';
import { generateDominoPieces, shufflePieces } from '../logic/pieces';
import type { RandomFn } from '../logic/pieces';

export interface InitialGameOptions {
  /** Peças do monte, já na ordem desejada. Padrão: as 28 peças em ordem fixa. */
  pieces?: DominoPiece[];
  /** Índice do jogador que começa. Padrão: 0. */
  startingPlayerIndex?: number;
  /** Troca de turno protegida (jogo no mesmo dispositivo). Padrão: `true`. */
  protectTurns?: boolean;
}

/**
 * Cria o estado de uma partida nova, na fase `setup`.
 * É determinística: o sorteio (embaralhar e escolher quem começa) é feito
 * fora, por `createRandomSetup`, e entra por `options`.
 */
export function createInitialGameState(
  player1Name: string,
  player2Name: string,
  options: InitialGameOptions = {}
): GameState {
  const { pieces = generateDominoPieces(), startingPlayerIndex = 0, protectTurns = true } = options;

  return {
    phase: 'setup',
    players: [
      { id: 'player-1', name: player1Name, hand: [], score: 0 },
      { id: 'player-2', name: player2Name, hand: [], score: 0 },
    ],
    currentPlayerIndex: startingPlayerIndex,
    table: { leftEnd: null, rightEnd: null, pieces: [] },
    drawPile: pieces.map((piece) => ({ ...piece, isFaceUp: false })),
    turnStep: 'draw',
    drawnPieceId: null,
    selectedPieceId: null,
    autoPassedPlayerIndexes: [],
    protectTurns,
    result: null,
    logs: [],
  };
}

/** Sorteia o monte embaralhado e quem começa a partida. */
export function createRandomSetup(rng: RandomFn = Math.random): {
  shuffledPieces: DominoPiece[];
  startingPlayerIndex: number;
} {
  return {
    shuffledPieces: shufflePieces(generateDominoPieces(), rng),
    startingPlayerIndex: Math.floor(rng() * 2),
  };
}
