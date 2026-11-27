/**
 * Filtro de palavrões e ofensas do chat (e dos nomes) do modo online.
 *
 * O texto é normalizado antes de comparar, para pegar os disfarces comuns:
 * maiúsculas e acentos, números e símbolos no lugar de letras (p0rr4, @),
 * letras repetidas (caaaralho), letras separadas (p u t a, p.u.t.a) e "k" no
 * lugar de "c". Depois, cada palavra é comparada com três listas:
 *
 * - EXACT: a palavra inteira (para termos curtos, que aparecem dentro de
 *   palavras normais: "cu" está em "cuidado");
 * - PREFIX: o começo da palavra (pega as variações: foder, fodido, fodase);
 * - EMBEDDED: em qualquer lugar do texto sem espaços (frases coladas como
 *   "seuidiota"); só termos longos que não aparecem em palavras comuns.
 *
 * Atenção: a normalização reduz letras repetidas também nas listas ("porr"
 * vira "por", que bloquearia "por" e "porque"). Prefira palavras inteiras em
 * EXACT para termos curtos e confira os testes de falso positivo.
 *
 * Nenhum filtro é perfeito. Para acrescentar um termo, escreva-o como se
 * escreve normalmente (o filtro normaliza as listas do mesmo jeito) e
 * acrescente um teste em `__tests__/filter.test.ts`, inclusive de falso
 * positivo, se o termo puder aparecer dentro de palavras comuns.
 */

const LEET: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  $: 's',
  k: 'c',
};

/** Texto em palavras normalizadas (sem acento, sem disfarces, letras repetidas reduzidas). */
export function normalizeWords(text: string): string[] {
  const plain = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[0-9@$k]/g, (char) => LEET[char] ?? char)
    .replace(/[^a-z]+/g, ' ')
    .replace(/([a-z])\1+/g, '$1')
    .trim();
  if (!plain) return [];

  // Letras soltas em sequência viram uma palavra: "p u t a" → "puta".
  const words: string[] = [];
  let letters = '';
  for (const word of plain.split(' ')) {
    if (word.length === 1) {
      letters += word;
      continue;
    }
    if (letters) words.push(letters.length > 1 ? letters.replace(/([a-z])\1+/g, '$1') : letters);
    letters = '';
    words.push(word);
  }
  if (letters) words.push(letters.length > 1 ? letters.replace(/([a-z])\1+/g, '$1') : letters);
  return words;
}

const normalizeTerm = (term: string) => normalizeWords(term).join('');

/** Palavras proibidas só quando aparecem inteiras. */
const EXACT = [
  'cu', 'cuzao', 'cuzinho', 'pqp', 'fdp', 'vsf', 'vtnc', 'vtmnc', 'tnc', 'tmnc', 'krl', 'crl', 'pnc',
  'porra', 'porras', 'burro', 'burra', 'burros', 'burras', 'burrice',
  'viado', 'viadinho', 'viadao', 'bicha', 'sapatao', 'boiola', 'traveco', 'corno', 'cornos',
  'macaco', 'macaca', 'macacos', 'shit', 'bitch',
  // Inglês e espanhol (27/11/2026: jogadores dos Estados Unidos e da América do Sul).
  'shits', 'bitches', 'cunt', 'cunts', 'dick', 'dicks', 'asshole', 'assholes', 'faggot', 'faggots',
  'nigger', 'niggers', 'nigga', 'niggas', 'pinche', 'verga', 'culo', 'puto', 'putos',
];

/** Começos de palavra proibidos (pegam as variações). */
const PREFIX = [
  'put', 'fod', 'fud', 'merd', 'bost', 'cacet', 'caralh', 'arromb', 'babac', 'otari',
  'imbecil', 'idiot', 'retardad', 'estupid', 'cretin', 'escrot', 'vagabund', 'desgrac',
  'safad', 'mongol', 'bucet', 'xoxot', 'xerec', 'piroc', 'punhet', 'siriric', 'chifrud',
  'crioul', 'fuck', 'bastard', 'nojent',
  'motherf', 'whor', 'slut', 'pendej', 'cabron', 'chinga', 'mierd', 'gilipoll', 'culer',
];

/** Termos em chinês, procurados no texto sem espaços (a normalização acima só guarda a-z). */
const CJK = ['傻逼', '煞笔', '操你', '肏', '他妈的', '草泥马', '狗日', '贱人', '婊子', '王八蛋'];

/** Termos proibidos em qualquer lugar do texto, mesmo colados a outras palavras. */
const EMBEDDED = [
  'caralho', 'arrombad', 'buceta', 'imbecil', 'idiota', 'filho da puta', 'filha da puta',
  'puta que pariu', 'tomar no cu', 'pau no cu', 'vai se fuder', 'vai se foder', 'foda se',
  'desgracad', 'vagabund',
];

const EXACT_SET = new Set(EXACT.map(normalizeTerm));
const PREFIXES = PREFIX.map(normalizeTerm);
const EMBEDDED_TERMS = EMBEDDED.map(normalizeTerm);

/** Palavras que começam com um prefixo proibido, mas não são ofensa. */
const ALLOWED = new Set(
  ['putz', 'fudge', 'boston', 'mongolia', 'safadeza'].map(normalizeTerm)
);
// "putz" e "safadeza" ficam permitidos de propósito: são leves e comuns no jogo.

/**
 * O termo proibido encontrado no texto (já normalizado), ou `null` se o texto
 * pode passar.
 */
export function findBlocked(text: string): string | null {
  const compact = text.replace(/\s+/g, '');
  const cjk = CJK.find((term) => compact.includes(term));
  if (cjk) return cjk;

  const words = normalizeWords(text);
  if (words.length === 0) return null;

  for (const word of words) {
    if (ALLOWED.has(word)) continue;
    if (EXACT_SET.has(word)) return word;
    const prefix = PREFIXES.find((p) => word.startsWith(p));
    if (prefix) return prefix;
  }

  // Frases inteiras e termos colados ("seuidiota", "pau no cu").
  const joined = words.join('');
  return EMBEDDED_TERMS.find((term) => joined.includes(term)) ?? null;
}

/** O texto pode ser mostrado aos outros jogadores? */
export function isClean(text: string): boolean {
  return findBlocked(text) === null;
}
