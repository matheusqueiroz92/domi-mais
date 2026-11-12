import { useCallback, useEffect, useState } from 'react';
import { applyTheme, otherTheme, readStoredTheme, storeTheme } from './theme';
import type { Theme } from './theme';

/** Tema atual e função para alternar entre escuro e claro (a escolha fica salva). */
export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [theme, setTheme] = useState<Theme>(readStoredTheme);

  useEffect(() => {
    applyTheme(theme);
    storeTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => setTheme(otherTheme), []);

  return { theme, toggleTheme };
}
