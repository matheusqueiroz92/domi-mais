import type { Lang } from '../lang';
import { en } from './en';
import { es } from './es';
import { pt } from './pt';
import type { Messages } from './pt';
import { zh } from './zh';

export type { Messages };

/** Textos de cada idioma. O português é a referência: os outros têm a mesma forma. */
export const MESSAGES: Record<Lang, Messages> = { pt, en, es, zh };
