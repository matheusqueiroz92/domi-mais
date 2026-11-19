/**
 * O que cada jogador pode ver da partida.
 *
 * O id de uma peça (`piece-12`) revela qual peça ela é, porque as peças são
 * sempre geradas na mesma ordem. Por isso, em cada sala, todas as peças
 * ganham um apelido aleatório (`PieceMask`), usado em tudo o que sai do
 * servidor. As peças que o jogador não pode ver saem viradas: valores -1 e só
 * a soma verdadeira.
 */
import { randomBytes } from 'node:crypto';
import type { DominoPiece, GameState } from '../../src/game/state/game-types';
import { generateDominoPieces } from '../../src/game/logic/pieces';

export interface PieceMask {
  /** Id real → apelido. */
  toMask: Map<string, string>;
  /** Apelido → id real. */
  toReal: Map<string, string>;
}

/** Apelidos novos e imprevisíveis para as 28 peças. */
export function createPieceMask(): PieceMask {
  const toMask = new Map<string, string>();
  const toReal = new Map<string, string>();
  for (const piece of generateDominoPieces()) {
    let alias: string;
    do {
      alias = `t${randomBytes(5).toString('hex')}`;
    } while (toReal.has(alias));
    toMask.set(piece.id, alias);
    toReal.set(alias, piece.id);
  }
  return { toMask, toReal };
}

/**
 * Partida do ponto de vista de `viewerIndex`: mesa e mão dele abertas, o
 * resto virado. Terminada a partida, tudo vem aberto (as mãos são mostradas
 * no resultado). Todos os ids viram apelidos.
 */
export function maskGameState(state: GameState, viewerIndex: number, mask: PieceMask): GameState {
  const alias = (id: string) => mask.toMask.get(id) ?? id;
  const revealAll = state.phase === 'finished';

  const open = (piece: DominoPiece): DominoPiece => ({ ...piece, id: alias(piece.id) });
  const hidden = (piece: DominoPiece): DominoPiece => ({
    id: alias(piece.id),
    left: -1,
    right: -1,
    sum: piece.sum,
    isFaceUp: false,
  });
  const show = (visible: boolean) => (piece: DominoPiece) =>
    visible || revealAll ? open(piece) : hidden(piece);

  return {
    ...state,
    players: state.players.map((player, index) => ({
      ...player,
      hand: player.hand.map(show(index === viewerIndex)),
    })),
    drawPile: state.drawPile.map(show(false)),
    table: { ...state.table, pieces: state.table.pieces.map(open) },
    initialPileOrder: state.initialPileOrder.map(alias),
    drawnPieceId: state.drawnPieceId === null ? null : alias(state.drawnPieceId),
    // A seleção é só da tela de cada um; o servidor não guarda.
    selectedPieceId: null,
    initialPieceId: state.initialPieceId === null ? null : alias(state.initialPieceId),
    lastPlayed: state.lastPlayed && { ...state.lastPlayed, pieceId: alias(state.lastPlayed.pieceId) },
  };
}
