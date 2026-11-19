/**
 * O modo online aparece no jogo? Ligado em desenvolvimento (`npm run dev`,
 * testes) e no build só com `VITE_ONLINE=on`. Assim o site publicado não
 * oferece o modo online antes de o servidor estar no ar (fase 4, deploy).
 */
export const ONLINE_ENABLED: boolean =
  import.meta.env.DEV || import.meta.env.VITE_ONLINE === 'on';
