/**
 * Contador de partidas jogadas (pedido de 25/11/2026).
 *
 * Soma cada partida terminada: contra o computador e no mesmo aparelho (o
 * navegador avisa por POST /api/matches) e online (a sala avisa direto). O
 * tutorial não conta. O total fica num arquivo JSON, gravado com atraso curto
 * e por troca de arquivo (nunca fica pela metade); sem arquivo, começa em
 * `initial` (5.000: estimativa das partidas da fase de testes).
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export const MATCH_COUNT_START = 5000;
/** Espera depois de uma partida antes de gravar (junta várias numa gravação). */
export const SAVE_DELAY_MS = 2000;

export interface MatchCounterOptions {
  /** Arquivo onde o total é guardado. Sem arquivo, só conta na memória. */
  file?: string;
  initial?: number;
  saveDelayMs?: number;
}

export class MatchCounter {
  private count: number;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly file?: string;
  private readonly saveDelayMs: number;

  constructor(options: MatchCounterOptions = {}) {
    this.file = options.file;
    this.saveDelayMs = options.saveDelayMs ?? SAVE_DELAY_MS;
    this.count = this.load() ?? Math.max(0, Math.floor(options.initial ?? MATCH_COUNT_START));
  }

  get total(): number {
    return this.count;
  }

  increment(): number {
    this.count++;
    this.scheduleSave();
    return this.count;
  }

  /** Grava agora o que estiver pendente (desligamento do servidor). */
  flush(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.save();
  }

  private load(): number | null {
    if (!this.file) return null;
    try {
      const data = JSON.parse(readFileSync(this.file, 'utf8')) as { matches?: unknown };
      return typeof data.matches === 'number' && Number.isInteger(data.matches) && data.matches >= 0
        ? data.matches
        : null;
    } catch {
      return null;
    }
  }

  private scheduleSave(): void {
    if (!this.file || this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.save();
    }, this.saveDelayMs);
  }

  private save(): void {
    if (!this.file) return;
    try {
      mkdirSync(dirname(this.file), { recursive: true });
      const temp = `${this.file}.tmp`;
      writeFileSync(temp, JSON.stringify({ matches: this.count, updatedAt: new Date().toISOString() }));
      renameSync(temp, this.file);
    } catch (error) {
      console.error('[domimais] não consegui gravar o contador de partidas:', error);
    }
  }
}
