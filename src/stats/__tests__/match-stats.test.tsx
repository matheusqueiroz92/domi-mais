import { act, render, renderHook, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { chooseBotAction } from '../../game/ai/bot';
import { seededRandom } from '../../game/logic/__tests__/helpers';
import { createRandomSetup } from '../../game/state/game-inicial-state';
import { GameProvider } from '../../game/state/game-context';
import { useGame } from '../../game/state/use-game';
import type { GameContextType } from '../../game/state/use-game';
import {
  MATCHES_URL,
  STATS_ENABLED,
  STATS_URL,
  fetchMatchCount,
  formatMatchCount,
  reportMatchFinished,
  useMatchCount,
} from '../match-stats';

const ok = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));

describe('contador de partidas no navegador', () => {
  it('fica desligado nos testes (não chama o servidor de verdade)', () => {
    expect(STATS_ENABLED).toBe(false);
    const fetchFn = vi.fn();
    reportMatchFinished(fetchFn);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('avisa o servidor com POST e ignora falha de rede', async () => {
    const fetchFn = vi.fn(() => Promise.reject(new Error('sem internet')));
    reportMatchFinished(fetchFn as unknown as typeof fetch, true);
    expect(fetchFn).toHaveBeenCalledWith(MATCHES_URL, { method: 'POST', keepalive: true });
    await Promise.resolve();
  });

  it('lê o total; resposta ruim ou erro viram null', async () => {
    expect(await fetchMatchCount((() => ok({ matches: 5342 })) as unknown as typeof fetch)).toBe(5342);
    expect(await fetchMatchCount((() => ok({ nada: 1 })) as unknown as typeof fetch)).toBeNull();
    expect(
      await fetchMatchCount((() => Promise.resolve(new Response('', { status: 500 }))) as unknown as typeof fetch)
    ).toBeNull();
    expect(await fetchMatchCount((() => Promise.reject(new Error('x'))) as unknown as typeof fetch)).toBeNull();
  });

  it('formata com ponto de milhar', () => {
    expect(formatMatchCount(5000)).toBe('5.000');
    expect(formatMatchCount(12345)).toBe('12.345');
  });

  it('o hook busca o total quando a tela inicial está ativa', async () => {
    const fetchFn = vi.fn(() => ok({ matches: 5001 })) as unknown as typeof fetch;
    const { result, rerender } = renderHook(({ active }) => useMatchCount(active, true, fetchFn), {
      initialProps: { active: false },
    });
    expect(result.current).toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
    rerender({ active: true });
    await waitFor(() => expect(result.current).toBe(5001));
    expect(fetchFn).toHaveBeenCalledWith(STATS_URL);
  });
});

describe('GameProvider conta a partida', () => {
  function setup(onMatchFinished: () => void) {
    let ctx!: GameContextType;
    function Probe() {
      const value = useGame();
      useEffect(() => {
        ctx = value;
      });
      return null;
    }
    render(
      <GameProvider onMatchFinished={onMatchFinished}>
        <Probe />
      </GameProvider>
    );
    return () => ctx;
  }

  function playToEnd(get: () => GameContextType, seed: number) {
    const rng = seededRandom(seed);
    act(() => get().dispatch({ type: 'START_GAME' }));
    for (let step = 0; step < 2000 && get().state.phase !== 'finished'; step++) {
      const action = chooseBotAction(get().state, rng);
      if (!action) throw new Error('sem ação');
      act(() => get().dispatch(action));
    }
    expect(get().state.phase).toBe('finished');
  }

  it('conta uma vez cada partida comum terminada', () => {
    const counted = vi.fn();
    const get = setup(counted);
    act(() => get().initializeGame(['Ana', 'Bia'], ['medium', 'medium']));
    playToEnd(get, 3);
    expect(counted).toHaveBeenCalledTimes(1);

    // Outra partida conta de novo.
    act(() => get().initializeGame(['Ana', 'Bia', 'Caio'], ['easy', 'easy', 'easy']));
    playToEnd(get, 4);
    expect(counted).toHaveBeenCalledTimes(2);
  });

  it('a partida do tutorial não conta', () => {
    const counted = vi.fn();
    const get = setup(counted);
    act(() => get().initializeGame(['Ana', 'Bia'], ['medium', 'medium'], createRandomSetup(2, seededRandom(9))));
    playToEnd(get, 9);
    expect(counted).not.toHaveBeenCalled();
  });
});
