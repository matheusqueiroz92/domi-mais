import { MAX_NAME_LENGTH } from '../../src/online/protocol';

/**
 * Nome de jogador limpo: sem espaços sobrando, sem caracteres de controle e
 * com no máximo `MAX_NAME_LENGTH` caracteres. `null` se não sobrar nenhuma
 * letra ou número.
 */
export function cleanName(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const name = input
    .replace(/\p{C}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  const short = [...name].slice(0, MAX_NAME_LENGTH).join('').trim();
  return /[\p{L}\p{N}]/u.test(short) ? short : null;
}

/** Evita dois jogadores com o mesmo nome na sala: "Ana", "Ana 2", "Ana 3"... */
export function uniqueName(name: string, taken: readonly string[]): string {
  const lower = new Set(taken.map((existing) => existing.toLocaleLowerCase('pt-BR')));
  if (!lower.has(name.toLocaleLowerCase('pt-BR'))) return name;
  for (let n = 2; ; n++) {
    const suffix = ` ${n}`;
    const base = [...name].slice(0, MAX_NAME_LENGTH - suffix.length).join('').trim();
    const candidate = `${base}${suffix}`;
    if (!lower.has(candidate.toLocaleLowerCase('pt-BR'))) return candidate;
  }
}
