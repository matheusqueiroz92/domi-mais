import { pt } from './messages/pt';
import type { Messages } from './messages';

/**
 * O motor de regras e o servidor online escrevem em português (o histórico
 * fica salvo e vai para os outros jogadores assim). Estas funções reconhecem
 * esses textos e os reescrevem no idioma de quem está olhando a tela.
 * Texto desconhecido volta como veio.
 */

const PIECE = String.raw`(\[\d\|\d\])`;

type Rule = [RegExp, (m: Messages, groups: string[]) => string];

const splitNames = (names: string) => names.split(/, | e /);

const LOG_RULES: Rule[] = [
  [/^Vez de (.+)$/, (m, [name]) => m.log.turn(name)],
  [/^(.+) comprou uma peça do monte \(soma: (\d+)\)$/, (m, [name, sum]) => m.log.drew(name, Number(sum))],
  [new RegExp(`^(.+) jogou ${PIECE} na (esquerda|direita)$`), (m, [name, piece, side]) =>
    m.log.played(name, piece, side === 'esquerda' ? 'left' : 'right')],
  [/^(.+) ficou com a peça$/, (m, [name]) => m.log.kept(name)],
  [/^(.+) não tem peça que encaixa e passou a vez$/, (m, [name]) => m.log.passed(name)],
  [new RegExp(`^(.+) escolheu a peça inicial: ${PIECE}$`), (m, [name, piece]) => m.log.chose(name, piece)],
  [/^Jogo iniciado! (.+) deve escolher a peça inicial$/, (m, [name]) => m.log.started(name)],
  [/^Jogo fechado! As duas pontas são (\d) e todas/, (m, [n]) => m.log.closedEnd(Number(n))],
  [/^A partida terminou empatada entre (.+)\.$/, (m, [names]) => m.log.tie(splitNames(names))],
  [/^(.+) venceu!$/, (m, [name]) => m.log.won(name)],
];

const STATIC_LOGS: [string, (m: Messages) => string][] = [
  [pt.log.emptyHand, (m) => m.log.emptyHand],
  [pt.log.blocked, (m) => m.log.blocked],
];

function applyRules(text: string, m: Messages, rules: Rule[]): string | null {
  for (const [pattern, render] of rules) {
    const match = pattern.exec(text);
    if (match) return render(m, match.slice(1));
  }
  return null;
}

/** Uma linha do histórico de jogadas no idioma `m`. */
export function translateLog(log: string, m: Messages): string {
  if (m === pt) return log;
  for (const [source, render] of STATIC_LOGS) if (log === source) return render(m);
  return applyRules(log, m, LOG_RULES) ?? log;
}

type ServerKey = keyof Messages['server'];

/** Textos fixos do servidor (e do cliente online) → chave em `server`. */
const SERVER_STATIC = new Map<string, ServerKey>(
  (Object.keys(pt.server) as ServerKey[])
    .filter((key) => typeof pt.server[key] === 'string')
    .map((key) => [pt.server[key] as string, key])
);

const SERVER_RULES: Rule[] = [
  [/^(.+) voltou para a partida\.$/, (m, [name]) => m.server.back(name)],
  [/^(.+) perdeu a conexão\. O computador joga por .+ até a volta\.$/, (m, [name]) => m.server.lostConnection(name)],
  [/^(.+) saiu da partida\. O computador joga no lugar\.$/, (m, [name]) => m.server.left(name)],
  [/^Tempo esgotado para (.+)\.$/, (m, [name]) => m.server.timeUp(name)],
  [/^Mensagem longa demais \(máximo de (\d+) letras\)\.$/, (m, [max]) => m.server.chatLong(Number(max))],
];

/** Aviso ou erro do servidor online no idioma `m`. */
export function translateServerText(text: string, m: Messages): string {
  if (m === pt) return text;
  const key = SERVER_STATIC.get(text);
  if (key) return m.server[key] as string;
  return applyRules(text, m, SERVER_RULES) ?? text;
}

/** Mensagem rápida do chat (chega em português) no idioma `m`. */
export function translateQuickMessage(text: string, m: Messages): string {
  const id = (Object.keys(pt.chat.quick) as (keyof Messages['chat']['quick'])[]).find(
    (key) => pt.chat.quick[key] === text
  );
  return id ? m.chat.quick[id] : text;
}
