import { useCallback, useEffect, useState } from 'react';
import type { Dispatch } from 'react';
import type { GameAction } from '../game/state/game-types';
import { TUTORIAL_STEPS, tileId, toGameAction } from './script';
import type { ScriptAction, TutorialStep } from './script';

/** Pausa antes de cada ação da adversária na partida guiada. */
export const TUTORIAL_BOT_DELAY_MS = 1000;

export interface Tutorial {
  active: boolean;
  step: TutorialStep | null;
  stepIndex: number;
  totalSteps: number;
  /** A adversária ainda está fazendo as ações do passo. */
  botBusy: boolean;
  /** Ação que a pessoa precisa fazer agora, se o passo pedir uma. */
  expected: ScriptAction | null;
  /** Id da peça do monte que deve ser tocada agora, se houver. */
  pilePieceId: string | null;
  isLastStep: boolean;
  start: () => void;
  stop: () => void;
  /** Avança um passo de explicação. */
  next: () => void;
  /** Tenta fazer uma ação da pessoa; só passa a que o roteiro espera. */
  perform: (action: GameAction) => void;
}

interface TutorialOptions {
  /** Chamado logo antes de cada ação da adversária (para tocar o som). */
  onBotAction?: (action: GameAction) => void;
}

function sameAction(action: GameAction, expected: GameAction): boolean {
  if (action.type !== expected.type) return false;
  if (action.type === 'KEEP_PIECE') return true;
  if (action.type === 'PLAY_PIECE' && expected.type === 'PLAY_PIECE') {
    return action.pieceId === expected.pieceId && action.position === expected.position;
  }
  return 'pieceId' in action && 'pieceId' in expected && action.pieceId === expected.pieceId;
}

/**
 * Conduz a partida guiada: guarda o passo atual, libera só a ação esperada
 * da pessoa e faz as ações da adversária, uma de cada vez.
 */
export function useTutorial(
  dispatch: Dispatch<GameAction>,
  { onBotAction }: TutorialOptions = {}
): Tutorial {
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  const [botDone, setBotDone] = useState(0);

  const step = stepIndex === null ? null : TUTORIAL_STEPS[stepIndex];
  const botActions = step?.bot;
  const botBusy = botActions !== undefined && botDone < botActions.length;

  useEffect(() => {
    if (!botActions || botDone >= botActions.length) return;
    const timer = window.setTimeout(() => {
      const action = toGameAction(botActions[botDone]);
      onBotAction?.(action);
      dispatch(action);
      setBotDone(botDone + 1);
    }, TUTORIAL_BOT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [botActions, botDone, dispatch, onBotAction]);

  const goTo = useCallback((index: number | null) => {
    setStepIndex(index);
    setBotDone(0);
  }, []);

  const start = useCallback(() => goTo(0), [goTo]);
  const stop = useCallback(() => goTo(null), [goTo]);

  const next = useCallback(() => {
    if (stepIndex === null || step?.expect || botBusy) return;
    if (stepIndex < TUTORIAL_STEPS.length - 1) goTo(stepIndex + 1);
  }, [stepIndex, step, botBusy, goTo]);

  const expected = step?.expect ?? null;

  const perform = useCallback(
    (action: GameAction) => {
      if (stepIndex === null || !expected) return;
      // Selecionar a peça é o primeiro toque de uma jogada.
      if (action.type === 'SELECT_PIECE') {
        if (expected.type === 'PLAY_PIECE' && action.pieceId === tileId(expected.tile)) {
          dispatch(action);
        }
        return;
      }
      if (!sameAction(action, toGameAction(expected))) return;
      dispatch(action);
      goTo(stepIndex + 1);
    },
    [stepIndex, expected, dispatch, goTo]
  );

  const pilePieceId =
    expected && (expected.type === 'DRAW_PIECE' || expected.type === 'CHOOSE_INITIAL_PIECE')
      ? tileId(expected.tile)
      : null;

  return {
    active: stepIndex !== null,
    step,
    stepIndex: stepIndex ?? 0,
    totalSteps: TUTORIAL_STEPS.length,
    botBusy,
    expected,
    pilePieceId,
    isLastStep: stepIndex === TUTORIAL_STEPS.length - 1,
    start,
    stop,
    next,
    perform,
  };
}
