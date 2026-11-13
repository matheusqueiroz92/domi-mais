import { useCallback, useEffect, useState } from 'react';

/** Lê uma opção liga/desliga salva no navegador; sem acesso, usa o padrão. */
export function readFlag(key: string, fallback: boolean): boolean {
  try {
    const stored = window.localStorage.getItem(key);
    return stored === null ? fallback : stored === 'on';
  } catch {
    return fallback;
  }
}

/** Opção liga/desliga que fica salva no navegador (falhas de armazenamento são ignoradas). */
export function usePersistentFlag(key: string, fallback: boolean): [boolean, () => void] {
  const [value, setValue] = useState<boolean>(() => readFlag(key, fallback));

  useEffect(() => {
    try {
      window.localStorage.setItem(key, value ? 'on' : 'off');
    } catch {
      // A preferência vale só para esta visita.
    }
  }, [key, value]);

  const toggle = useCallback(() => setValue((current) => !current), []);
  return [value, toggle];
}
