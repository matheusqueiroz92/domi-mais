import { describe, expect, it } from 'vitest';
import type { GameAction } from '../game-types';
import { gameReducer } from '../game-reducer';
import { createInitialGameState, createRandomSetup } from '../game-inicial-state';
import { generateDominoPieces } from '../../logic/pieces';
import { seededRandom } from '../../logic/__tests__/helpers';

const initAction: GameAction = {
  type: 'INITIALIZE_GAME',
  playerNames: ['Ana', 'Beto'],
  shuffledPieces: generateDominoPieces().reverse(),
  startingPlayerIndex: 1,
};

describe('gameReducer', () => {
  const blank = createInitialGameState(['Jogador 1', 'Jogador 2']);

  it('INITIALIZE_GAME cria a partida com os nomes, o monte e o jogador inicial recebidos', () => {
    const state = gameReducer(blank, initAction);
    expect(state.phase).toBe('setup');
    expect(state.players.map((p) => p.name)).toEqual(['Ana', 'Beto']);
    expect(state.currentPlayerIndex).toBe(1);
    expect(state.drawPile[0]).toMatchObject({ left: 6, right: 6 });
    expect(state.protectTurns).toBe(true);
  });

  it('aceita 3 e 4 jogadores', () => {
    for (const playerNames of [['Ana', 'Beto', 'Caio'], ['Ana', 'Beto', 'Caio', 'Dani']]) {
      const state = gameReducer(blank, { ...initAction, playerNames, startingPlayerIndex: 2 });
      expect(state.players.map((p) => p.name)).toEqual(playerNames);
      expect(new Set(state.players.map((p) => p.id)).size).toBe(playerNames.length);
      expect(state.currentPlayerIndex).toBe(2);
    }
  });

  it('ignora configuração inválida (menos de 2, mais de 4 ou jogador inicial inexistente)', () => {
    expect(gameReducer(blank, { ...initAction, playerNames: ['Ana'] })).toBe(blank);
    expect(
      gameReducer(blank, { ...initAction, playerNames: ['A', 'B', 'C', 'D', 'E'] })
    ).toBe(blank);
    expect(gameReducer(blank, { ...initAction, startingPlayerIndex: 2 })).toBe(blank);
  });

  it('é puro: a mesma ação sobre o mesmo estado dá o mesmo resultado', () => {
    expect(gameReducer(blank, initAction)).toEqual(gameReducer(blank, initAction));
  });

  it('percorre o fluxo completo de um turno', () => {
    let state = gameReducer(blank, initAction);
    state = gameReducer(state, { type: 'START_GAME' });
    expect(state.phase).toBe('choosing-initial');

    state = gameReducer(state, { type: 'CHOOSE_INITIAL_PIECE', pieceId: state.drawPile[0].id });
    expect(state.phase).toBe('playing');

    const drawn = state.drawPile[0];
    state = gameReducer(state, { type: 'DRAW_PIECE', pieceId: drawn.id });
    expect(state.players[1].hand).toHaveLength(1);

    state = gameReducer(state, { type: 'SELECT_PIECE', pieceId: drawn.id });
    expect(state.selectedPieceId).toBeNull();

    state = gameReducer(state, { type: 'KEEP_PIECE' });
    expect(state.phase).toBe('transition');
    expect(state.currentPlayerIndex).toBe(0);

    state = gameReducer(state, { type: 'CONFIRM_READY' });
    expect(state.phase).toBe('playing');
  });

  it('PLAY_PIECE coloca a peça na mesa', () => {
    let state = gameReducer(blank, initAction);
    state = gameReducer(state, { type: 'START_GAME' });
    // Monte invertido: a primeira peça é [6|6] e a segunda [5|6].
    state = gameReducer(state, { type: 'CHOOSE_INITIAL_PIECE', pieceId: state.drawPile[0].id });
    const drawn = state.drawPile[0];
    state = gameReducer(state, { type: 'DRAW_PIECE', pieceId: drawn.id });
    state = gameReducer(state, { type: 'PLAY_PIECE', pieceId: drawn.id, position: 'left' });
    expect(state.table).toMatchObject({ leftEnd: 5, rightEnd: 6 });
    expect(state.table.pieces).toHaveLength(2);
  });

  it('RESET_GAME volta para uma partida em branco', () => {
    const started = gameReducer(gameReducer(blank, initAction), { type: 'START_GAME' });
    expect(gameReducer(started, { type: 'RESET_GAME' })).toEqual(blank);
  });

  it('ação desconhecida não altera o estado', () => {
    expect(gameReducer(blank, { type: 'INEXISTENTE' } as unknown as GameAction)).toBe(blank);
  });
});

describe('createRandomSetup', () => {
  it('sorteia as 28 peças e um jogador inicial válido, de forma reproduzível', () => {
    const a = createRandomSetup(2, seededRandom(7));
    const b = createRandomSetup(2, seededRandom(7));
    expect(a).toEqual(b);
    expect(a.shuffledPieces).toHaveLength(28);
    expect([0, 1]).toContain(a.startingPlayerIndex);
  });

  it.each([2, 3, 4])('com %i jogadores, qualquer um pode ser sorteado para começar', (count) => {
    const starters = new Set<number>();
    for (let seed = 1; seed <= 80; seed++) {
      starters.add(createRandomSetup(count, seededRandom(seed)).startingPlayerIndex);
    }
    expect(starters).toEqual(new Set(Array.from({ length: count }, (_, i) => i)));
  });
});

describe('createInitialGameState', () => {
  it.each([0, 1, 5])('recusa partida com %i jogadores', (count) => {
    const names = Array.from({ length: count }, (_, i) => `J${i}`);
    expect(() => createInitialGameState(names)).toThrow(/de 2 a 4 jogadores/);
  });

  it('recusa jogador inicial fora da lista', () => {
    expect(() => createInitialGameState(['Ana', 'Beto'], { startingPlayerIndex: 2 })).toThrow();
  });
});
