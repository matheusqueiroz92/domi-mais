/** Temas visuais do jogo. Escuro é o padrão. */
export type Theme = 'dark' | 'light';

export const DEFAULT_THEME: Theme = 'dark';
export const THEME_STORAGE_KEY = 'domimais:theme';

/** Cor da barra do navegador em cada tema (igual ao fundo da página). */
const THEME_COLORS: Record<Theme, string> = { dark: '#12141C', light: '#F4F6FB' };

/** Lê o tema salvo neste navegador. Sem acesso ao armazenamento, usa o padrão. */
export function readStoredTheme(): Theme {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

/** Salva a preferência. Falhas de armazenamento (modo privado etc.) são ignoradas. */
export function storeTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // A preferência só não fica salva; o tema continua aplicado nesta visita.
  }
}

/** Aplica o tema na página: as cores vêm dos tokens em src/index.css. */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
}

export function otherTheme(theme: Theme): Theme {
  return theme === 'dark' ? 'light' : 'dark';
}
