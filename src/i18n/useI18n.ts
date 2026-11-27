import { useSyncExternalStore } from 'react';
import { getLang, setLang, subscribeLang } from './lang';
import type { Lang } from './lang';
import { MESSAGES } from './messages';
import type { Messages } from './messages';

/** Idioma atual, os textos dele (`m`) e a função para trocar. */
export function useI18n(): { lang: Lang; m: Messages; setLang: (lang: Lang) => void } {
  const lang = useSyncExternalStore(subscribeLang, getLang, getLang);
  return { lang, m: MESSAGES[lang], setLang };
}

/** Textos do idioma atual fora de componentes React. */
export function currentMessages(): Messages {
  return MESSAGES[getLang()];
}
