import { describe, expect, it } from 'vitest';
import type { BotLevel, GameState } from '../../state/game-types';
import { gameReducer } from '../../state/game-reducer';
import { createInitialGameState, createRandomSetup } from '../../state/game-inicial-state';
import { BLUFF_CHANCE, chooseBotAction, fitProbability, getBotView, unknownPieces } from '../bot';
import { generateDominoPieces } from '../../logic/pieces';
import { PLAYER_NAMES, piece, scenario, seededRandom } from '../../logic/__tests__/helpers';

const LEVELS: BotLevel[] = ['easy', 'medium', 'hard'];

/**
 * Completa a mesa com todas as peças que não estão nas mãos nem no monte,
 * como acontece em uma partida de verdade (as pontas não mudam). Assim o
 * computador vê uma situação coerente: 28 peças no total.
 */
function withFullTable(state: GameState): GameState {
  const key = (p: { left: number; right: number }) => [p.left, p.right].sort().join('-');
  const used = new Set(
    [...state.table.pieces, ...state.drawPile, ...state.players.flatMap((p) => p.hand)].map(key)
  );
  const filler = generateDominoPieces()
    .filter((p) => !used.has(key(p)))
    .map((p) => ({ ...p, id: `mesa-${p.id}`, isFaceUp: true }));
  return { ...state, table: { ...state.table, pieces: [...state.table.pieces, ...filler] } };
}

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

  it.each(['medium', 'hard'] as const)(
    '%s compra a peça com mais chance de encaixar, deduzida pela soma',
    (level) => {
      // Pontas 6 e 5. Soma 12 só pode ser 6|6 (encaixa com certeza); soma 2 não pode ter 5 nem 6.
      const state = asBots(
        scenario({ table: [6, 5], pile: [piece(0, 2), piece(6, 6), piece(1, 1)] }),
        level
      );
      for (let seed = 1; seed <= 10; seed++) {
        expect(chooseBotAction(state, seededRandom(seed))).toEqual({ type: 'DRAW_PIECE', pieceId: '6-6' });
      }
    }
  );

  it('fácil compra no escuro: acaba escolhendo peças diferentes', () => {
    const state = asBots(scenario({ table: [6, 5], pile: [piece(0, 2), piece(6, 6), piece(1, 1)] }), 'easy');
    const picks = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const action = chooseBotAction(state, seededRandom(seed));
      if (action?.type === 'DRAW_PIECE') picks.add(action.pieceId);
    }
    expect(picks.size).toBe(3);
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

  it('médio prefere deixar pontas em que suas outras peças encaixam', () => {
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
      'medium'
    );
    const actions = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => chooseBotAction(state, seededRandom(seed)));
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
    [['easy', 'easy'], 60],
    [['medium', 'easy', 'medium'], 60],
    [['medium', 'medium', 'easy', 'easy'], 60],
    [['hard', 'medium'], 10],
    [['easy', 'hard', 'medium'], 6],
    [['hard', 'hard', 'hard', 'hard'], 4],
  ] as [BotLevel[], number][])(
    '%j: %i partidas terminam com resultado válido',
    (levels, games) => {
      for (let seed = 1; seed <= games; seed++) {
        const state = playBotGame(levels, seed);
        expect(state.phase).toBe('finished');
        expect(state.result!.winnerIndexes.length).toBeGreaterThan(0);
        expect(state.players.every((p, i) => p.botLevel === levels[i])).toBe(true);
      }
    },
    120_000
  );

  /** Vitórias de `a` e de `b` em partidas de dois jogadores, alternando os lugares. */
  function duel(a: BotLevel, b: BotLevel, games: number) {
    let winsA = 0;
    let winsB = 0;
    for (let seed = 1; seed <= games; seed++) {
      // Alterna os lugares para não favorecer quem começa.
      const seatA = seed % 2;
      const levels: BotLevel[] = seatA === 0 ? [a, b] : [b, a];
      const winners = playBotGame(levels, seed).result!.winnerIndexes;
      if (winners.length === 1) {
        if (winners[0] === seatA) winsA++;
        else winsB++;
      }
    }
    return { winsA, winsB };
  }

  it('o nível médio vence o fácil na grande maioria das partidas', () => {
    const { winsA, winsB } = duel('medium', 'easy', 300);
    expect(winsA).toBeGreaterThan(winsB * 3);
  });

  it(
    'o nível difícil vence o médio na maioria das partidas',
    () => {
      const { winsA, winsB } = duel('hard', 'medium', 60);
      expect(winsA).toBeGreaterThan(winsB * 1.5);
    },
    120_000
  );
});

describe('final de partida calculado (dois jogadores, monte vazio)', () => {
  /** Posição aleatória de final: 5 peças para cada um, mesa com uma peça, vez do jogador 0. */
  function randomEndgame(seed: number): GameState | null {
    const rng = seededRandom(seed);
    const { shuffledPieces } = createRandomSetup(2, rng);
    const [first, ...rest] = shuffledPieces;
    const base = withFullTable(
      scenario({
        table: [first.left, first.right],
        handA: rest.slice(0, 5),
        handB: rest.slice(5, 10),
        protectTurns: false,
      })
    );
    const ends = [base.table.leftEnd, base.table.rightEnd];
    const canPlay = base.players[0].hand.some((p) => ends.includes(p.left) || ends.includes(p.right));
    return canPlay ? base : null;
  }

  function finish(start: GameState, levels: BotLevel[], seed: number): GameState {
    const rng = seededRandom(seed);
    let state: GameState = {
      ...start,
      players: start.players.map((player, index) => ({ ...player, botLevel: levels[index] })),
    };
    for (let step = 0; step < 60 && state.phase !== 'finished'; step++) {
      state = gameReducer(state, chooseBotAction(state, rng)!);
    }
    return state;
  }

  it('partindo das mesmas posições, o difícil vence mais do que o médio venceria', () => {
    let hardWins = 0;
    let mediumWins = 0;
    let positions = 0;

    for (let seed = 1; seed <= 400; seed++) {
      const start = randomEndgame(seed);
      if (!start) continue;
      positions++;
      const withHard = finish(start, ['hard', 'medium'], seed).result!.winnerIndexes;
      const withMedium = finish(start, ['medium', 'medium'], seed).result!.winnerIndexes;
      const hardWon = withHard.length === 1 && withHard[0] === 0;
      const mediumWon = withMedium.length === 1 && withMedium[0] === 0;
      if (hardWon) hardWins++;
      if (mediumWon) mediumWins++;
    }

    expect(positions).toBeGreaterThan(200);
    expect(hardWins).toBeGreaterThan(mediumWins * 1.1);
  });

  it('enxerga a jogada que vence mesmo quando ela parece pior no momento', () => {
    // Pontas 3 e 5. Jogar [5|6] (mais pontos) deixa 3 e 6 e o adversário fecha com [6|3]... e vence.
    // Jogar [3|1] deixa 1 e 5: o adversário não tem jogada e o computador termina com [5|6].
    const state = asBots(
      withFullTable(
        scenario({ handA: [piece(5, 6), piece(3, 1)], handB: [piece(6, 3)], protectTurns: false })
      ),
      'hard'
    );
    const first = chooseBotAction(state, seededRandom(1));
    expect(first).toMatchObject({ type: 'PLAY_PIECE', pieceId: '3-1' });

    let end = state;
    const rng = seededRandom(2);
    for (let step = 0; step < 10 && end.phase !== 'finished'; step++) {
      end = gameReducer(end, chooseBotAction(end, rng)!);
    }
    expect(end.result).toMatchObject({ reason: 'empty-hand', winnerIndexes: [0] });

    // O médio cai na armadilha: joga a peça de mais pontos.
    const medium = chooseBotAction(asBots(state, 'medium'), seededRandom(1));
    expect(medium).toMatchObject({ type: 'PLAY_PIECE', pieceId: '5-6' });
  });
});
