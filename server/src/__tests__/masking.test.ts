import { describe, expect, it } from 'vitest';
import { gameReducer } from '../../../src/game/state/game-reducer';
import { createInitialGameState, createRandomSetup } from '../../../src/game/state/game-inicial-state';
import { seededRandom } from '../../../src/game/logic/__tests__/helpers';
import { createPieceMask, maskGameState } from '../masking';
import { cleanName, uniqueName } from '../names';

function startedGame() {
  const { shuffledPieces, startingPlayerIndex } = createRandomSetup(3, seededRandom(4));
  let state = gameReducer(
    createInitialGameState(['Ana', 'Beto', 'Caio'], { pieces: shuffledPieces, startingPlayerIndex, protectTurns: false }),
    { type: 'START_GAME' }
  );
  state = gameReducer(state, { type: 'CHOOSE_INITIAL_PIECE', pieceId: state.drawPile[0].id });
  // Dois turnos: compra e fica com a peça.
  for (let i = 0; i < 2; i++) {
    state = gameReducer(state, { type: 'DRAW_PIECE', pieceId: state.drawPile[0].id });
    state = gameReducer(state, { type: 'KEEP_PIECE' });
  }
  return state;
}

describe('o que cada jogador vê (maskGameState)', () => {
  const state = startedGame();
  const mask = createPieceMask();

  it('a própria mão e a mesa vêm abertas; o resto, virado com a soma verdadeira', () => {
    const viewer = state.players.findIndex((p) => p.hand.length > 0);
    const view = maskGameState(state, viewer, mask);
    view.players.forEach((player, index) => {
      player.hand.forEach((piece, k) => {
        const real = state.players[index].hand[k];
        expect(piece.sum).toBe(real.sum);
        if (index === viewer) expect([piece.left, piece.right]).toEqual([real.left, real.right]);
        else expect([piece.left, piece.right]).toEqual([-1, -1]);
      });
    });
    view.drawPile.forEach((piece, k) => {
      expect([piece.left, piece.right]).toEqual([-1, -1]);
      expect(piece.sum).toBe(state.drawPile[k].sum);
    });
    expect(view.table.pieces.map((p) => [p.left, p.right])).toEqual(state.table.pieces.map((p) => [p.left, p.right]));
  });

  it('nenhum id real sai do servidor, e os apelidos são os mesmos para todos', () => {
    const views = state.players.map((_, i) => maskGameState(state, i, mask));
    for (const view of views) expect(JSON.stringify(view)).not.toMatch(/piece-\d+/);
    // A mesma peça tem o mesmo apelido para todos (a animação do monte para a mão funciona).
    expect(views[0].drawPile.map((p) => p.id)).toEqual(views[1].drawPile.map((p) => p.id));
    expect(views[0].initialPileOrder).toEqual(views[2].initialPileOrder);
  });

  it('cada sala tem apelidos diferentes: não dá para decorar', () => {
    const other = createPieceMask();
    const a = maskGameState(state, 0, mask).drawPile.map((p) => p.id);
    const b = maskGameState(state, 0, other).drawPile.map((p) => p.id);
    expect(a.some((id, i) => id === b[i])).toBe(false);
    expect(new Set(mask.toMask.values()).size).toBe(28);
  });

  it('a peça comprada por outro jogador continua virada para mim', () => {
    const drawn = gameReducer(state, { type: 'DRAW_PIECE', pieceId: state.drawPile[0].id });
    const other = (drawn.currentPlayerIndex + 1) % 3;
    const view = maskGameState(drawn, other, mask);
    const piece = view.players[drawn.currentPlayerIndex].hand.find((p) => p.id === view.drawnPieceId);
    expect(piece && [piece.left, piece.right]).toEqual([-1, -1]);
  });

  it('com a partida terminada, todas as mãos vêm abertas', () => {
    const finished = { ...state, phase: 'finished' as const };
    const view = maskGameState(finished, 0, mask);
    for (const player of view.players) for (const piece of player.hand) expect(piece.left).toBeGreaterThanOrEqual(0);
  });
});

describe('nomes dos jogadores', () => {
  it('limpa espaços e caracteres de controle e corta no tamanho máximo', () => {
    expect(cleanName('  Ana   Maria ')).toBe('Ana Maria');
    expect(cleanName('Jo\u0000ão')).toBe('João');
    expect(cleanName('A'.repeat(40))).toHaveLength(20);
    expect(cleanName('   ')).toBeNull();
    expect(cleanName('!!!')).toBeNull();
    expect(cleanName(42)).toBeNull();
  });

  it('nomes repetidos ganham número', () => {
    expect(uniqueName('Ana', ['Beto'])).toBe('Ana');
    expect(uniqueName('ana', ['Ana'])).toBe('ana 2');
    expect(uniqueName('Ana', ['Ana', 'Ana 2'])).toBe('Ana 3');
    expect(uniqueName('A'.repeat(20), ['A'.repeat(20)])).toBe(`${'A'.repeat(18)} 2`);
  });
});
