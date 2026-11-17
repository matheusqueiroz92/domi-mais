import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gameReducer } from '../game-reducer';
import { createInitialGameState, createRandomSetup } from '../game-inicial-state';
import { seededRandom } from '../../logic/__tests__/helpers';
import type { GameAction, GameState } from '../game-types';
import {
  SAVE_KEY,
  SAVE_VERSION,
  clearSavedGame,
  isResumable,
  isValidSavedState,
  loadSavedGame,
  prepareForResume,
  saveGame,
} from '../saved-game';

/** Partida de verdade (peças oficiais), parada depois de `turns` turnos. */
function realGame({ players = 2, protectTurns = true, turns = 0, seed = 7 } = {}): GameState {
  const names = ['Ana', 'Beto', 'Caio', 'Dani'].slice(0, players);
  const { shuffledPieces, startingPlayerIndex } = createRandomSetup(players, seededRandom(seed));
  const run = (state: GameState, action: GameAction) => gameReducer(state, action);
  let state = run(
    createInitialGameState(names, { pieces: shuffledPieces, startingPlayerIndex, protectTurns }),
    { type: 'START_GAME' }
  );
  if (turns === 0) return state;
  state = run(state, { type: 'CHOOSE_INITIAL_PIECE', pieceId: state.drawPile[0].id });
  for (let turn = 1; turn < turns; turn++) {
    state = run(state, { type: 'CONFIRM_READY' });
    state = run(state, { type: 'DRAW_PIECE', pieceId: state.drawPile[0].id });
    state = run(state, { type: 'KEEP_PIECE' });
  }
  return state;
}

const clone = (state: GameState): GameState => JSON.parse(JSON.stringify(state));

beforeEach(() => {
  window.localStorage.clear();
});

describe('partida salva: o que é guardado', () => {
  it('só partidas em andamento são guardadas', () => {
    expect(isResumable(realGame())).toBe(true); // escolhendo a peça inicial
    expect(isResumable(realGame({ turns: 3 }))).toBe(true);
    expect(isResumable(createInitialGameState(['Ana', 'Beto']))).toBe(false); // setup
    expect(isResumable({ ...realGame({ turns: 3 }), phase: 'finished' })).toBe(false);

    saveGame(createInitialGameState(['Ana', 'Beto']));
    expect(window.localStorage.getItem(SAVE_KEY)).toBeNull();
  });

  it('salvar e ler devolve a mesma partida', () => {
    const state = realGame({ players: 3, turns: 4, protectTurns: false });
    saveGame(state);
    expect(loadSavedGame()).toEqual(state);
  });

  it('sem partida guardada, ler devolve null', () => {
    expect(loadSavedGame()).toBeNull();
  });

  it('apagar remove a partida', () => {
    saveGame(realGame({ turns: 2 }));
    clearSavedGame();
    expect(loadSavedGame()).toBeNull();
  });

  it('falha do armazenamento não quebra o jogo', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('cheio');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    expect(() => saveGame(realGame({ turns: 2 }))).not.toThrow();
    expect(loadSavedGame()).toBeNull();
  });
});

describe('partida salva: retomada', () => {
  it('no mesmo aparelho volta na troca de turno, sem peça selecionada', () => {
    let state = realGame({ turns: 2 });
    state = gameReducer(state, { type: 'CONFIRM_READY' });
    state = gameReducer(state, { type: 'DRAW_PIECE', pieceId: state.drawPile[0].id });
    state = gameReducer(state, { type: 'SELECT_PIECE', pieceId: state.drawnPieceId! });
    expect(state.phase).toBe('playing');

    const resumed = prepareForResume(state);
    expect(resumed.phase).toBe('transition');
    expect(resumed.selectedPieceId).toBeNull();
    // A jogada continua de onde parou: peça já comprada, falta jogar ou ficar.
    expect(resumed.turnStep).toBe('play');
    expect(resumed.drawnPieceId).toBe(state.drawnPieceId);
    expect(gameReducer(resumed, { type: 'CONFIRM_READY' }).phase).toBe('playing');
  });

  it('contra o computador volta direto na partida', () => {
    const state = realGame({ turns: 3, protectTurns: false });
    expect(prepareForResume(state).phase).toBe('playing');
  });

  it('escolha da peça inicial é retomada como estava', () => {
    expect(prepareForResume(realGame()).phase).toBe('choosing-initial');
  });

  it('RESTORE_GAME aceita uma partida válida e ignora uma inválida', () => {
    const current = createInitialGameState(['Ana', 'Beto']);
    const saved = realGame({ turns: 3 });
    expect(gameReducer(current, { type: 'RESTORE_GAME', state: saved })).toBe(saved);
    const broken = { ...saved, drawPile: saved.drawPile.slice(1) };
    expect(gameReducer(current, { type: 'RESTORE_GAME', state: broken })).toBe(current);
  });
});

describe('partida salva: validação', () => {
  const valid = () => clone(realGame({ players: 4, turns: 5 }));

  it('aceita partidas reais de 2, 3 e 4 jogadores em vários momentos', () => {
    for (const players of [2, 3, 4]) {
      for (const turns of [0, 1, 2, 6, 12]) {
        for (const protectTurns of [true, false]) {
          const state = realGame({ players, turns, protectTurns, seed: players * 31 + turns });
          expect(isValidSavedState(clone(state)), `${players} jogadores, ${turns} turnos`).toBe(true);
        }
      }
    }
  });

  it('aceita a partida com peça virada ao contrário na mesa', () => {
    const state = valid();
    const [first] = state.table.pieces;
    state.table.pieces[0] = { ...first, left: first.right, right: first.left };
    expect(isValidSavedState(state)).toBe(true);
  });

  const cases: [string, (state: GameState) => unknown][] = [
    ['não é objeto', () => 'partida'],
    ['null', () => null],
    ['fase que não se retoma', (s) => ({ ...s, phase: 'finished' })],
    ['fase desconhecida', (s) => ({ ...s, phase: 'pausada' })],
    ['um jogador só', (s) => ({ ...s, players: s.players.slice(0, 1) })],
    ['jogador da vez fora da lista', (s) => ({ ...s, currentPlayerIndex: 9 })],
    ['peça faltando', (s) => ({ ...s, drawPile: s.drawPile.slice(1) })],
    ['peça repetida', (s) => ({ ...s, drawPile: [...s.drawPile.slice(1), s.table.pieces[0]] })],
    [
      'peça com valores trocados',
      (s) => ({ ...s, drawPile: [{ ...s.drawPile[0], left: 6, right: 6 }, ...s.drawPile.slice(1)] }),
    ],
    ['peça inventada', (s) => ({ ...s, drawPile: [{ ...s.drawPile[0], id: 'piece-99' }, ...s.drawPile.slice(1)] })],
    ['ponta da mesa impossível', (s) => ({ ...s, table: { ...s.table, leftEnd: 9 } })],
    ['mesa vazia no meio da partida', (s) => ({ ...s, table: { leftEnd: null, rightEnd: null, pieces: [] } })],
    ['ordem do monte incompleta', (s) => ({ ...s, initialPileOrder: s.initialPileOrder.slice(2) })],
    ['etapa do turno desconhecida', (s) => ({ ...s, turnStep: 'esperar' })],
    ['peça comprada que não está na mão', (s) => ({ ...s, drawnPieceId: s.drawPile[0].id })],
    ['nível de computador desconhecido', (s) => ({ ...s, players: s.players.map((p) => ({ ...p, botLevel: 'genio' })) })],
    ['fila de mão vazia com quem tem peças', (s) => ({ ...s, emptyHandOrder: [s.players.findIndex((p) => p.hand.length > 0)] })],
    ['sem a fila de mão vazia', (s) => ({ ...s, emptyHandOrder: undefined })],
    ['com resultado', (s) => ({ ...s, result: { reason: 'blocked', winnerIndexes: [0], scores: [] } })],
    ['registro que não é texto', (s) => ({ ...s, logs: [1, 2] })],
    ['sem a troca de turno definida', (s) => ({ ...s, protectTurns: undefined })],
  ];

  it.each(cases)('recusa: %s', (_name, breakIt) => {
    expect(isValidSavedState(breakIt(valid()))).toBe(false);
  });

  it('partida guardada inválida ou de outra versão é descartada ao ler', () => {
    window.localStorage.setItem(SAVE_KEY, 'isto não é JSON');
    expect(loadSavedGame()).toBeNull();
    expect(window.localStorage.getItem(SAVE_KEY)).toBeNull();

    const state = realGame({ turns: 3 });
    window.localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({ version: SAVE_VERSION + 1, savedAt: 0, state })
    );
    expect(loadSavedGame()).toBeNull();
    expect(window.localStorage.getItem(SAVE_KEY)).toBeNull();

    window.localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({ version: SAVE_VERSION, savedAt: 0, state: { ...state, players: [] } })
    );
    expect(loadSavedGame()).toBeNull();
  });
});
