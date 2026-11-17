import type { DominoPiece, GameState, Player } from './game-types';
import { generateDominoPieces } from '../logic/pieces';
import { isValidPlayerCount } from '../logic/rules';

/** Chave da partida em andamento no navegador. */
export const SAVE_KEY = 'domimais:game';

/**
 * Versão do formato salvo. Aumente quando o `GameState` mudar de forma
 * incompatível: partidas salvas em outra versão são descartadas.
 */
export const SAVE_VERSION = 2;

interface SavedGame {
  version: number;
  savedAt: number;
  state: GameState;
}

const RESUMABLE_PHASES = ['choosing-initial', 'transition', 'playing'];
const BOT_LEVELS = ['easy', 'medium', 'hard'];

/** Partida em andamento: é a única que vale a pena guardar. */
export function isResumable(state: GameState): boolean {
  return RESUMABLE_PHASES.includes(state.phase);
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isIndex = (value: unknown, length: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < length;

const isNullOrString = (value: unknown) => value === null || typeof value === 'string';

/** Peças oficiais, por id, para conferir o que veio do armazenamento. */
const OFFICIAL = new Map(generateDominoPieces().map((piece) => [piece.id, piece]));

function isPiece(value: unknown): value is DominoPiece {
  if (!isObject(value) || typeof value.id !== 'string') return false;
  const official = OFFICIAL.get(value.id);
  if (!official) return false;
  const { left, right } = value;
  // Na mesa a peça pode estar virada ao contrário (direita no lugar da esquerda).
  const sameSides =
    (left === official.left && right === official.right) ||
    (left === official.right && right === official.left);
  return sameSides && value.sum === official.sum && typeof value.isFaceUp === 'boolean';
}

const isPieceList = (value: unknown): value is DominoPiece[] =>
  Array.isArray(value) && value.every(isPiece);

function isPlayer(value: unknown): value is Player {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    (value.botLevel === null || BOT_LEVELS.includes(value.botLevel as string)) &&
    isPieceList(value.hand) &&
    typeof value.score === 'number'
  );
}

/**
 * Confere se um valor lido do armazenamento é uma partida em andamento
 * coerente: formato certo e as 28 peças, cada uma em um único lugar.
 * Qualquer dúvida invalida a partida salva (melhor perder a partida do que
 * abrir o jogo em um estado quebrado).
 */
export function isValidSavedState(value: unknown): value is GameState {
  if (!isObject(value)) return false;
  if (typeof value.phase !== 'string' || !RESUMABLE_PHASES.includes(value.phase)) return false;

  const { players, table } = value;
  if (!Array.isArray(players) || !isValidPlayerCount(players.length)) return false;
  if (!players.every(isPlayer)) return false;
  if (!isIndex(value.currentPlayerIndex, players.length)) return false;

  if (!isObject(table) || !isPieceList(table.pieces)) return false;
  const isEnd = (end: unknown) => end === null || isIndex(end, 7);
  if (!isEnd(table.leftEnd) || !isEnd(table.rightEnd)) return false;
  if (!isPieceList(value.drawPile)) return false;

  // As 28 peças, sem repetir, somando monte, mesa e mãos.
  const ids = [
    ...value.drawPile,
    ...table.pieces,
    ...players.flatMap((player) => player.hand),
  ].map((piece) => piece.id);
  if (ids.length !== OFFICIAL.size || new Set(ids).size !== OFFICIAL.size) return false;

  const order = value.initialPileOrder;
  if (
    !Array.isArray(order) ||
    order.length !== OFFICIAL.size ||
    new Set(order).size !== OFFICIAL.size ||
    !order.every((id) => OFFICIAL.has(id))
  ) {
    return false;
  }

  // Antes da peça inicial a mesa está vazia; depois dela, nunca.
  const choosing = value.phase === 'choosing-initial';
  if (choosing !== (table.pieces.length === 0)) return false;
  if (choosing !== (table.leftEnd === null) || choosing !== (table.rightEnd === null)) return false;

  if (value.turnStep !== 'draw' && value.turnStep !== 'play') return false;
  // Com o monte vazio não existe compra.
  if (!choosing && value.turnStep === 'draw' && value.drawPile.length === 0) return false;

  const hand = players[value.currentPlayerIndex].hand;
  const inHand = (id: unknown) => id === null || hand.some((piece) => piece.id === id);
  if (!isNullOrString(value.drawnPieceId) || !inHand(value.drawnPieceId)) return false;
  if (!isNullOrString(value.selectedPieceId) || !inHand(value.selectedPieceId)) return false;

  const { lastPlayed, autoPassedPlayerIndexes, logs, emptyHandOrder } = value;
  // A fila de quem ficou sem peças tem exatamente os jogadores de mão vazia
  // (antes da peça inicial ninguém jogou ainda, então a fila está vazia).
  const emptyHanded = players.flatMap((player, index) => (player.hand.length === 0 ? [index] : []));
  if (
    !Array.isArray(emptyHandOrder) ||
    new Set(emptyHandOrder).size !== emptyHandOrder.length ||
    !emptyHandOrder.every((index) => emptyHanded.includes(index))
  ) {
    return false;
  }
  if (
    lastPlayed !== null &&
    !(
      isObject(lastPlayed) &&
      isIndex(lastPlayed.playerIndex, players.length) &&
      typeof lastPlayed.pieceId === 'string'
    )
  ) {
    return false;
  }

  return (
    typeof value.protectTurns === 'boolean' &&
    isNullOrString(value.initialPieceId) &&
    value.result === null &&
    Array.isArray(autoPassedPlayerIndexes) &&
    autoPassedPlayerIndexes.every((index) => isIndex(index, players.length)) &&
    Array.isArray(logs) &&
    logs.every((entry) => typeof entry === 'string')
  );
}

/**
 * Ajusta a partida salva para ser retomada. No mesmo aparelho ela volta na
 * tela de troca de turno, para a mão do jogador da vez não aparecer para quem
 * estiver com o aparelho na hora de reabrir.
 */
export function prepareForResume(state: GameState): GameState {
  return {
    ...state,
    selectedPieceId: null,
    phase: state.protectTurns && state.phase === 'playing' ? 'transition' : state.phase,
  };
}

/** Guarda a partida em andamento. Falhas de armazenamento são ignoradas. */
export function saveGame(state: GameState): void {
  if (!isResumable(state)) return;
  try {
    const saved: SavedGame = { version: SAVE_VERSION, savedAt: Date.now(), state };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(saved));
  } catch {
    // Sem armazenamento (modo privado, espaço cheio): a partida só não fica salva.
  }
}

/** Apaga a partida guardada. */
export function clearSavedGame(): void {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Nada a fazer.
  }
}

/** Lê a partida guardada, já pronta para retomar; `null` se não houver ou estiver inválida. */
export function loadSavedGame(): GameState | null {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (raw === null) return null;
    const saved: unknown = JSON.parse(raw);
    if (!isObject(saved) || saved.version !== SAVE_VERSION || !isValidSavedState(saved.state)) {
      clearSavedGame();
      return null;
    }
    return prepareForResume(saved.state);
  } catch {
    clearSavedGame();
    return null;
  }
}
