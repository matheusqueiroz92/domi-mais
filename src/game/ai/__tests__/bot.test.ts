import { describe, expect, it } from 'vitest';
import type { BotLevel, GameState } from '../../state/game-types';
import { gameReducer } from '../../state/game-reducer';
import { createInitialGameState, createRandomSetup } from '../../state/game-inicial-state';
import { BLUFF_CHANCE, chooseBotAction, fitProbability, getBotView, unknownPieces } from '../bot';
import { PLAYER_NAMES, piece, scenario, seededRandom } from '../../logic/__tests__/helpers';

const LEVELS: BotLevel[] = ['easy', 'medium', 'hard'];

/** Torna o jogador da vez (e os demais) controlados pelo computador. */
function asBots(state: GameState, level: BotLevel): GameState {
  return { ...state, players: state.players.map((player) => ({ ...player, botLevel: level })) };
}

describe('visão do computador', () => {
  const state = scenario({
    hands: [[piece(3, 4)], [piece(1, 6), piece(0, 0)], [piece(2, 2)]],
    pile: [piece(5, 6), piece(1, 2)],
  });

  it('enxerga a própria mão aberta e só as somas do monte e dos adversários', () => {
    const view = getBotView(state, 0);
    expect(view.hand).toEqual(state.players[0].hand);
    expect(view.pile).toEqual([
      { id: '5-6', sum: 11 },
      { id: '1-2', sum: 3 },
    ]);
    expect(view.opponents).toEqual([
      [
        { id: '1-6', sum: 7 },
        { id: '0-0', sum: 0 },
      ],
      [{ id: '2-2', sum: 4 }],
    ]);
    // Nenhum lado de peça virada aparece na visão.
    expect(JSON.stringify([view.pile, view.opponents])).not.toMatch(/left|right/);
  });

  it('desconhece 28 peças menos as da mesa e as da própria mão', () => {
    const unknown = unknownPieces(getBotView(state, 0));
    expect(unknown).toHaveLength(28 - 1 - 1);
    expect(unknown.some((p) => p.left === 3 && p.right === 5)).toBe(false);
    expect(unknown.some((p) => p.left === 3 && p.right === 4)).toBe(false);
    expect(unknown.some((p) => p.left === 5 && p.right === 6)).toBe(true);
  });

  it('a mesma visão leva à mesma decisão, mesmo que as peças viradas sejam outras', () => {
    // Troca os lados de uma peça virada do monte por outra peça de mesma soma (7).
    const a = asBots(scenario({ handA: [piece(0, 1)], handB: [], pile: [piece(1, 6, 'x'), piece(0, 2, 'y')] }), 'hard');
    const b = asBots(scenario({ handA: [piece(0, 1)], handB: [], pile: [piece(2, 5, 'x'), piece(0, 2, 'y')] }), 'hard');
    expect(getBotView(a, 0)).toEqual(getBotView(b, 0));
    for (let seed = 1; seed <= 20; seed++) {
      expect(chooseBotAction(a, seededRandom(seed))).toEqual(chooseBotAction(b, seededRandom(seed)));
    }
  });
});

describe('dedução pela soma (fitProbability)', () => {
  const all = unknownPieces({ table: { leftEnd: null, rightEnd: null, pieces: [] }, hand: [], drawnPieceId: null, pile: [], opponents: [] });

  it('soma 12 só pode ser 6|6', () => {
    expect(fitProbability(12, [6, 3], all)).toBe(1);
    expect(fitProbability(12, [5, 3], all)).toBe(0);
  });

  it('soma 7 pode ser 1|6, 2|5 ou 3|4', () => {
    expect(fitProbability(7, [6], all)).toBeCloseTo(1 / 3);
    expect(fitProbability(7, [6, 2], all)).toBeCloseTo(2 / 3);
    expect(fitProbability(7, [0], all)).toBe(0);
  });

  it('descarta as peças que já foram vistas', () => {
    const without16 = all.filter((p) => !(p.left === 1 && p.right === 6));
    expect(fitProbability(7, [6], without16)).toBe(0);
  });

  it('soma impossível tem probabilidade zero', () => {
    expect(fitProbability(13, [6], all)).toBe(0);
  });
});

describe('decisões do computador', () => {
  it('não decide nada quando o jogador da vez é uma pessoa', () => {
    expect(chooseBotAction(scenario({ pile: [piece(0, 0)] }))).toBeNull();
  });

  it('não decide nada fora do jogo (troca de turno, fim)', () => {
    const state = asBots(scenario({ pile: [piece(0, 0)] }), 'hard');
    expect(chooseBotAction({ ...state, phase: 'transition' })).toBeNull();
    expect(chooseBotAction({ ...state, phase: 'finished' })).toBeNull();
    expect(chooseBotAction({ ...state, phase: 'setup' })).toBeNull();
  });

  it.each(LEVELS)('nível %s: na compra, escolhe uma peça que está no monte', (level) => {
    const state = asBots(scenario({ pile: [piece(5, 6), piece(1, 2), piece(0, 0)] }), level);
    const action = chooseBotAction(state, seededRandom(1));
    expect(action?.type).toBe('DRAW_PIECE');
    expect(gameReducer(state, action!)).not.toBe(state);
  });

  it('difícil compra a peça com mais chance de encaixar, deduzida pela soma', () => {
    // Pontas 6 e 5. Soma 12 só pode ser 6|6 (encaixa com certeza); soma 2 não pode ter 5 nem 6.
    const state = asBots(scenario({ table: [6, 5], pile: [piece(0, 2), piece(6, 6), piece(1, 1)] }), 'hard');
    for (let seed = 1; seed <= 10; seed++) {
      expect(chooseBotAction(state, seededRandom(seed))).toEqual({ type: 'DRAW_PIECE', pieceId: '6-6' });
    }
  });

  it('médio compra a peça de menor soma', () => {
    const state = asBots(scenario({ pile: [piece(5, 6), piece(0, 1), piece(4, 4)] }), 'medium');
    expect(chooseBotAction(state, seededRandom(1))).toEqual({ type: 'DRAW_PIECE', pieceId: '0-1' });
  });

  it.each(LEVELS)('nível %s: fica com a peça quando nada encaixa', (level) => {
    const state = asBots(
      scenario({ handA: [piece(1, 1)], pile: [piece(0, 0)], turnStep: 'play', drawnPieceId: '1-1' }),
      level
    );
    expect(chooseBotAction(state, seededRandom(1))).toEqual({ type: 'KEEP_PIECE' });
  });

  it.each(LEVELS)('nível %s: com o monte vazio, sempre joga (nunca tenta blefar)', (level) => {
    const state = asBots(scenario({ handA: [piece(3, 4), piece(5, 5)], handB: [piece(1, 1)] }), level);
    for (let seed = 1; seed <= 30; seed++) {
      const action = chooseBotAction(state, seededRandom(seed));
      expect(action?.type).toBe('PLAY_PIECE');
      expect(gameReducer(state, action!)).not.toBe(state);
    }
  });

  it('médio joga a peça de maior soma', () => {
    const state = asBots(scenario({ handA: [piece(3, 0), piece(5, 6)], handB: [piece(1, 1)] }), 'medium');
    expect(chooseBotAction(state, seededRandom(1))).toMatchObject({ type: 'PLAY_PIECE', pieceId: '5-6' });
  });

  it('difícil joga a última peça para vencer, mesmo havendo jogada de mais pontos', () => {
    const state = asBots(scenario({ handA: [piece(3, 0)], handB: [piece(1, 1)] }), 'hard');
    const next = gameReducer(state, chooseBotAction(state, seededRandom(1))!);
    expect(next.result).toMatchObject({ reason: 'empty-hand', winnerIndexes: [0] });
  });

  it('difícil prefere deixar pontas em que suas outras peças encaixam', () => {
    // [3|1] deixaria pontas 1 e 5; [5|2] deixaria 3 e 2. A mão tem [2|2] e [2|0]:
    // jogar [5|2] mantém duas peças jogáveis.
    const state = asBots(
      scenario({
        handA: [piece(3, 1), piece(5, 2), piece(2, 2), piece(2, 0)],
        handB: [piece(6, 6)],
        pile: [piece(0, 0)],
        turnStep: 'play',
        drawnPieceId: '3-1',
      }),
      'hard'
    );
    // Sementes que não caem no blefe.
    const actions = [3, 4, 5, 6, 7].map((seed) => chooseBotAction(state, seededRandom(seed)));
    for (const action of actions.filter((a) => a?.type === 'PLAY_PIECE')) {
      expect(action).toMatchObject({ pieceId: '5-2' });
    }
    expect(actions.some((a) => a?.type === 'PLAY_PIECE')).toBe(true);
  });

  it('fácil nunca blefa; médio e difícil blefam às vezes, mas pouco', () => {
    const count = (level: BotLevel) => {
      const state = asBots(
        scenario({ handA: [piece(3, 0)], handB: [], pile: Array.from({ length: 12 }, (_, i) => piece(6, 6, `p${i}`)), turnStep: 'play', drawnPieceId: '3-0' }),
        level
      );
      let keeps = 0;
      for (let seed = 1; seed <= 600; seed++) {
        if (chooseBotAction(state, seededRandom(seed))?.type === 'KEEP_PIECE') keeps++;
      }
      return keeps / 600;
    };

    expect(BLUFF_CHANCE.easy).toBe(0);
    expect(count('easy')).toBe(0);
    for (const level of ['medium', 'hard'] as const) {
      const rate = count(level);
      expect(rate).toBeGreaterThan(0.01);
      expect(rate).toBeLessThan(0.2);
    }
  });

  it('difícil não blefa com peça de soma alta', () => {
    const state = asBots(
      scenario({ handA: [piece(5, 6)], handB: [], pile: Array.from({ length: 12 }, (_, i) => piece(0, 0, `p${i}`)), turnStep: 'play', drawnPieceId: '5-6' }),
      'hard'
    );
    for (let seed = 1; seed <= 300; seed++) {
      expect(chooseBotAction(state, seededRandom(seed))?.type).toBe('PLAY_PIECE');
    }
  });
});

/** Joga uma partida inteira só com computadores e devolve o estado final. */
function playBotGame(levels: BotLevel[], seed: number): GameState {
  const rng = seededRandom(seed);
  const { shuffledPieces, startingPlayerIndex } = createRandomSetup(levels.length, rng);
  let state = gameReducer(createInitialGameState(PLAYER_NAMES.slice(0, levels.length)), {
    type: 'INITIALIZE_GAME',
    playerNames: PLAYER_NAMES.slice(0, levels.length),
    shuffledPieces,
    startingPlayerIndex,
    protectTurns: false,
    botLevels: levels,
  });
  state = gameReducer(state, { type: 'START_GAME' });

  for (let step = 0; step < 400 && state.phase !== 'finished'; step++) {
    const action = chooseBotAction(state, rng);
    // O computador sempre tem o que fazer e nunca propõe uma jogada inválida.
    expect(action).not.toBeNull();
    const next = gameReducer(state, action!);
    expect(next).not.toBe(state);
    state = next;
  }
  return state;
}

describe('partidas inteiras entre computadores', () => {
  it.each([
    [['easy', 'easy']],
    [['medium', 'hard']],
    [['easy', 'medium', 'hard']],
    [['hard', 'hard', 'hard', 'hard']],
    [['easy', 'hard', 'medium', 'easy']],
  ] as BotLevel[][][])('%j: 60 partidas terminam com resultado válido', (levels) => {
    for (let seed = 1; seed <= 60; seed++) {
      const state = playBotGame(levels, seed);
      expect(state.phase).toBe('finished');
      expect(state.result!.winnerIndexes.length).toBeGreaterThan(0);
      expect(state.players.every((p, i) => p.botLevel === levels[i])).toBe(true);
    }
  });

  it('o nível difícil vence o fácil na maioria das partidas', () => {
    let hard = 0;
    let easy = 0;
    for (let seed = 1; seed <= 400; seed++) {
      // Alterna os lugares para não favorecer quem começa.
      const hardSeat = seed % 2;
      const levels: BotLevel[] = hardSeat === 0 ? ['hard', 'easy'] : ['easy', 'hard'];
      const winners = playBotGame(levels, seed).result!.winnerIndexes;
      if (winners.length === 1) {
        if (winners[0] === hardSeat) hard++;
        else easy++;
      }
    }
    expect(hard).toBeGreaterThan(easy * 1.3);
  });

  it('o nível médio também vence o fácil na maioria das partidas', () => {
    let medium = 0;
    let easy = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const seat = seed % 2;
      const levels: BotLevel[] = seat === 0 ? ['medium', 'easy'] : ['easy', 'medium'];
      const winners = playBotGame(levels, seed).result!.winnerIndexes;
      if (winners.length === 1) {
        if (winners[0] === seat) medium++;
        else easy++;
      }
    }
    expect(medium).toBeGreaterThan(easy);
  });
});
