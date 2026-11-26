/**
 * Contador de partidas jogadas, mostrado na tela inicial (pedido de
 * 25/11/2026). O total fica no servidor (`server/src/stats`); o navegador
 * avisa quando uma partida local termina e lê o total ao abrir a tela inicial.
 * Sem internet, nada acontece: a partida não entra na conta e o contador some.
 */
import { useEffect, useState } from 'react';
import { ONLINE_ENABLED } from '../online/config';

export const STATS_URL = '/api/stats';
export const MATCHES_URL = '/api/matches';

/** O servidor existe onde o modo online existe. Nos testes, fica desligado. */
export const STATS_ENABLED: boolean = ONLINE_ENABLED && import.meta.env.MODE !== 'test';

type FetchFn = typeof fetch;

/** Uma partida terminou neste aparelho (contra o computador ou mesmo aparelho). */
export function reportMatchFinished(fetchFn: FetchFn | undefined = globalThis.fetch, enabled = STATS_ENABLED): void {
  if (!enabled || !fetchFn) return;
  // keepalive: o aviso sai mesmo se a pessoa fechar a página logo depois.
  fetchFn(MATCHES_URL, { method: 'POST', keepalive: true }).catch(() => {});
}

export async function fetchMatchCount(fetchFn: FetchFn | undefined = globalThis.fetch): Promise<number | null> {
  if (!fetchFn) return null;
  try {
    const response = await fetchFn(STATS_URL);
    if (!response.ok) return null;
    const data = (await response.json()) as { matches?: unknown };
    return typeof data.matches === 'number' && data.matches >= 0 ? data.matches : null;
  } catch {
    return null;
  }
}

/** "5.342" */
export function formatMatchCount(count: number): string {
  return Math.floor(count).toLocaleString('pt-BR');
}

/** Total de partidas para a tela inicial; `null` enquanto carrega ou sem servidor. */
export function useMatchCount(active: boolean, enabled = STATS_ENABLED, fetchFn?: FetchFn): number | null {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled || !active) return;
    let cancelled = false;
    void fetchMatchCount(fetchFn).then((value) => {
      if (!cancelled && value !== null) setCount(value);
    });
    return () => {
      cancelled = true;
    };
  }, [active, enabled, fetchFn]);
  return count;
}
