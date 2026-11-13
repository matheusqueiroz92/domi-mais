import { describe, expect, it } from 'vitest';
import { gameReducer } from '../../game/state/game-reducer';
import { createInitialGameState } from '../../game/state/game-inicial-state';
import { canKeepPiece } from '../../game/logic/engine';
import { currentPlayerCanPlay } from '../../game/logic/selectors';
import { getDrawHints } from '../../game/logic/hints';
import type { GameState } from '../../game/state/game-types';
import {
  TUTORIAL_PLAYERS,
  TUTORIAL_STEPS,
  createTutorialSetup,
  tileId,
  toGameAction,
} from '../script';
import type { ScriptAction } from '../script';

function initialState(): GameState {
  const { shuffledPieces, startingPlayerIndex } = createTutorialSetup();
  return gameReducer(
    createInitialGameState(TUTORIAL_PLAYERS, {
      pieces: shuffledPieces,
      startingPlayerIndex,
      protectTurns: false,
      botLevels: [null, 'easy'],
    }),
    { type: 'START_GAME' }
  );
}

/** Aplica uma ação do roteiro e exige que o motor a aceite. */
function apply(state: GameState, action: ScriptAction): GameState {
  let current = state;
  if (action.type === 'PLAY_PIECE') {
    current = gameReducer(current, { type: 'SELECT_PIECE', pieceId: tileId(action.tile) });
  }
  const next = gameReducer(current, toGameAction(action));
  expect(next, `ação recusada pelo motor: ${JSON.stringify(action)}`).not.toBe(current);
  return next;
}

/** Estado logo antes de cada passo do roteiro. */
function statesBeforeSteps(): GameState[] {
  const states: GameState[] = [];
  let state = initialState();
  for (const step of TUTORIAL_STEPS) {
    states.push(state);
    const expectedPlayer = step.expect ? 0 : 1;
    for (const action of step.expect ? [step.expect] : (step.bot ?? [])) {
      expect(state.currentPlayerIndex).toBe(expectedPlayer);
      state = apply(state, action);
    }
  }
  states.push(state);
  return states;
}

const stepIndex = (title: string, nth = 0) =>
  TUTORIAL_STEPS.map((step, index) => (step.title === title ? index : -1)).filter((i) => i >= 0)[nth];

describe('roteiro do tutorial', () => {
  it('o monte tem as 28 peças, sem repetir', () => {
    const { shuffledPieces } = createTutorialSetup();
    expect(new Set(shuffledPieces.map((piece) => piece.id)).size).toBe(28);
  });

  it('todas as ações do roteiro são válidas no motor de regras, na vez certa', () => {
    const states = statesBeforeSteps();
    const end = states[states.length - 1];
    expect(end.phase).toBe('playing');
    // A partida guiada termina com a vez de volta para a adversária.
    expect(end.currentPlayerIndex).toBe(1);
  });

  it('cada passo é de um tipo só: explicação, ação da pessoa ou ações da adversária', () => {
    for (const step of TUTORIAL_STEPS) {
      expect(step.expect && step.bot).toBeFalsy();
      expect(Boolean(step.after)).toBe(Boolean(step.bot));
      expect(step.text.length).toBeGreaterThan(0);
    }
    expect(TUTORIAL_STEPS[0].expect ?? TUTORIAL_STEPS[0].bot).toBeUndefined();
    const last = TUTORIAL_STEPS[TUTORIAL_STEPS.length - 1];
    expect(last.expect ?? last.bot).toBeUndefined();
  });

  it('o que o texto afirma bate com a partida', () => {
    const states = statesBeforeSteps();
    const ends = (state: GameState) => [state.table.leftEnd, state.table.rightEnd];
    const hint = (state: GameState, sum: number) =>
      getDrawHints(state, 0).find((entry) => entry.sum === sum)!;
    const names = (state: GameState, sum: number) =>
      hint(state, sum).candidates.map((c) => `${c.left}|${c.right}`);

    // Depois da primeira jogada da Bia: pontas 6 e 5; soma 11 só pode ser 5|6.
    const firstDraw = states[stepIndex('Sua vez: pense antes de comprar')];
    expect(ends(firstDraw)).toEqual([6, 5]);
    expect(names(firstDraw, 11)).toEqual(['5|6']);
    expect(hint(firstDraw, 11).probability).toBe(1);

    // A Bia fica com soma 2 quando as pontas são 6 e 6: 0|2 ou 1|1, nenhuma encaixa.
    const biaKeeps = states[stepIndex('Vez da Bia', 1)];
    expect(ends(biaKeeps)).toEqual([6, 6]);
    expect(names(biaKeeps, 2)).toEqual(['0|2', '1|1']);
    expect(hint(biaKeeps, 2).probability).toBe(0);

    // Soma 3: 0|3 ou 1|2, nenhuma encaixa; depois da compra o botão é "Passar a vez".
    const badDraw = states[stepIndex('Nem toda compra encaixa')];
    expect(names(badDraw, 3)).toEqual(['0|3', '1|2']);
    expect(hint(badDraw, 3).fitting).toBe(0);
    const pass = states[stepIndex('Passar a vez')];
    expect(canKeepPiece(pass)).toBe(true);
    expect(currentPlayerCanPlay(pass)).toBe(false);

    // Soma 8: 2|6, 3|5 ou 4|4; só uma encaixa. Depois da compra, ficar é blefe.
    const riskyDraw = states[stepIndex('Uma compra arriscada')];
    expect(ends(riskyDraw)).toEqual([6, 6]);
    expect(names(riskyDraw, 8)).toEqual(['2|6', '3|5', '4|4']);
    expect(hint(riskyDraw, 8).fitting).toBe(1);
    const bluff = states[stepIndex('O blefe')];
    expect(canKeepPiece(bluff)).toBe(true);
    expect(currentPlayerCanPlay(bluff)).toBe(true);
  });
});
