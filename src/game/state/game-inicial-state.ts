import type { DominoPiece, GameState } from './game-types';
import { generateDominoPieces, shufflePieces } from '../logic/pieces';
import type { RandomFn } from '../logic/pieces';
import { MAX_PLAYERS, MIN_PLAYERS, isValidPlayerCount } from '../logic/rules';

export interface InitialGameOptions {
  /** Peças do monte, já na ordem desejada. Padrão: as 28 peças em ordem fixa. */
  pieces?: DominoPiece[];
  /** Índice do jogador que começa. Padrão: 0. */
  startingPlayerIndex?: number;
  /** Troca de turno protegida (jogo no mesmo dispositivo). Padrão: `true`. */
  protectTurns?: boolean;
}

/** Nomes usados antes de a partida ser configurada na tela inicial. */
export const DEFAULT_PLAYER_NAMES = ['Jogador 1', 'Jogador 2'];

/**
 * Cria o estado de uma partida nova, na fase `setup`, para 2 a 4 jogadores
 * (cada um por si). A ordem de `playerNames` é a ordem dos turnos.
 *
 * É determinística: o sorteio (embaralhar e escolher quem começa) é feito
 * fora, por `createRandomSetup`, e entra por `options`.
 */
export function createInitialGameState(
  playerNames: readonly string[],
  options: InitialGameOptions = {}
): GameState {
  if (!isValidPlayerCount(playerNames.length)) {
    throw new Error(
      `O DomiMais aceita de ${MIN_PLAYERS} a ${MAX_PLAYERS} jogadores (recebidos: ${playerNames.length}).`
    );
  }

  const { pieces = generateDominoPieces(), startingPlayerIndex = 0, protectTurns = true } = options;

  if (
    !Number.isInteger(startingPlayerIndex) ||
    startingPlayerIndex < 0 ||
    startingPlayerIndex >= playerNames.length
  ) {
    throw new Error(`Jogador inicial inválido: ${startingPlayerIndex}.`);
  }

  return {
    phase: 'setup',
    players: playerNames.map((name, index) => ({
      id: `player-${index + 1}`,
      name,
      hand: [],
      score: 0,
    })),
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
export function createRandomSetup(
  playerCount: number = MIN_PLAYERS,
  rng: RandomFn = Math.random
): {
  shuffledPieces: DominoPiece[];
  startingPlayerIndex: number;
} {
  return {
    shuffledPieces: shufflePieces(generateDominoPieces(), rng),
    startingPlayerIndex: Math.floor(rng() * playerCount),
  };
}
