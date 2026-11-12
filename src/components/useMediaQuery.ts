import { useEffect, useState } from 'react';

/** `true` enquanto a consulta de mídia CSS (ex.: largura mínima) for verdadeira. */
export function useMediaQuery(query: string): boolean {
  const read = () => window.matchMedia?.(query).matches ?? false;
  const [matches, setMatches] = useState<boolean>(read);

  useEffect(() => {
    const media = window.matchMedia?.(query);
    if (!media || !media.addEventListener) return;
    const onChange = () => setMatches(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
