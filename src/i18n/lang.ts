/**
 * Idioma do jogo (pedido de 27/11/2026: o DomiMais vai ser jogado na América
 * do Sul, nos Estados Unidos e na China).
 *
 * O idioma fica numa "loja" simples do módulo (sem Provider): qualquer
 * componente lê com `useI18n()` e todos atualizam juntos quando muda.
 * Primeira visita: idioma do navegador (pt, es, zh; qualquer outro vira en).
 * Depois, vale a escolha salva no aparelho.
 */
export type Lang = 'pt' | 'en' | 'es' | 'zh';

export const LANGS: readonly { code: Lang; label: string; short: string; htmlLang: string }[] = [
  { code: 'pt', label: 'Português', short: 'PT', htmlLang: 'pt-BR' },
  { code: 'en', label: 'English', short: 'EN', htmlLang: 'en' },
  { code: 'es', label: 'Español', short: 'ES', htmlLang: 'es' },
  { code: 'zh', label: '中文', short: '中', htmlLang: 'zh-CN' },
];

export const LANG_STORAGE_KEY = 'domimais:lang';

const isLang = (value: unknown): value is Lang => LANGS.some((lang) => lang.code === value);

/** Idioma pelo navegador: `pt-BR` → pt, `es-AR` → es, `zh-CN` → zh, o resto → en. */
export function langFromNavigator(languages: readonly string[]): Lang {
  for (const tag of languages) {
    const base = tag.toLowerCase().split('-')[0];
    if (isLang(base)) return base;
  }
  return 'en';
}

function readInitialLang(): Lang {
  try {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (isLang(stored)) return stored;
  } catch {
    // Sem armazenamento: segue para o idioma do navegador.
  }
  // Nos testes, o padrão é português (o jsdom diz que o navegador é en-US).
  if (import.meta.env.MODE === 'test') return 'pt';
  const nav = typeof navigator === 'undefined' ? [] : (navigator.languages ?? [navigator.language]);
  return langFromNavigator(nav.filter(Boolean));
}

let current: Lang = readInitialLang();
const listeners = new Set<() => void>();

function applyLang(lang: Lang): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = LANGS.find((item) => item.code === lang)?.htmlLang ?? lang;
}
applyLang(current);

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang): void {
  if (lang === current) return;
  current = lang;
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // A escolha só não fica salva.
  }
  applyLang(lang);
  listeners.forEach((listener) => listener());
}

export function subscribeLang(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
