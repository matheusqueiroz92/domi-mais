/**
 * Limite de avisos de partida por endereço, para ninguém inflar o contador
 * com um script. É folgado: uma sala de aula inteira sai pelo mesmo endereço
 * de internet, e cada partida leva bem mais que alguns segundos.
 */
export const MATCH_REPORTS_PER_WINDOW = 60;
export const MATCH_REPORT_WINDOW_MS = 10 * 60 * 1000;

export class RateLimiter {
  private hits = new Map<string, number[]>();
  private readonly limit: number;
  private readonly windowMs: number;

  constructor(limit = MATCH_REPORTS_PER_WINDOW, windowMs = MATCH_REPORT_WINDOW_MS) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  /** `true` se o endereço ainda pode; já conta esta tentativa. */
  allow(key: string, now = Date.now()): boolean {
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 10_000) this.prune(now);
    return true;
  }

  private prune(now: number): void {
    for (const [key, times] of this.hits) {
      if (times.every((t) => now - t >= this.windowMs)) this.hits.delete(key);
    }
  }
}
