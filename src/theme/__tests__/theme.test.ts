import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { THEME_STORAGE_KEY, applyTheme, otherTheme, readStoredTheme, storeTheme } from '../theme';

describe('tema', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('o padrão é o tema escuro', () => {
    expect(readStoredTheme()).toBe('dark');
  });

  it('lê o tema salvo e ignora valores desconhecidos', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
    expect(readStoredTheme()).toBe('light');
    window.localStorage.setItem(THEME_STORAGE_KEY, 'roxo');
    expect(readStoredTheme()).toBe('dark');
  });

  it('salva a preferência', () => {
    storeTheme('light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('funciona mesmo quando o armazenamento do navegador falha', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    expect(readStoredTheme()).toBe('dark');
    expect(() => storeTheme('light')).not.toThrow();
  });

  it('aplica o tema no elemento raiz da página', () => {
    applyTheme('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    applyTheme('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('alterna entre os dois temas', () => {
    expect(otherTheme('dark')).toBe('light');
    expect(otherTheme('light')).toBe('dark');
  });
});
