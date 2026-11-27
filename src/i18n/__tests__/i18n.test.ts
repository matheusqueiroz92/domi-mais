import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { LANG_STORAGE_KEY, getLang, langFromNavigator, setLang } from '../lang';
import { MESSAGES } from '../messages';
import { pt } from '../messages/pt';
import { translateLog, translateQuickMessage, translateServerText } from '../translate';
import { TUTORIAL_STEPS } from '../../tutorial/script';
import { QUICK_MESSAGES } from '../../online/protocol';
import { createInitialGameState, createRandomSetup } from '../../game/state/game-inicial-state';
import { gameReducer } from '../../game/state/game-reducer';
import { chooseBotAction } from '../../game/ai/bot';
import { seededRandom } from '../../game/logic/__tests__/helpers';
import type { GameState } from '../../game/state/game-types';

const OTHER = ['en', 'es', 'zh'] as const;

/** Formato de um objeto de textos: chaves e tipo de cada valor (funções contam como "function"). */
function shape(value: unknown): unknown {
  if (Array.isArray(value)) return 'array';
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, shape((value as Record<string, unknown>)[key])]));
  }
  return typeof value;
}

/** Joga uma partida inteira com o computador nos dois lugares e devolve o estado final. */
function playBotGame(seed: number, players: number): GameState {
  const rng = seededRandom(seed);
  const { shuffledPieces, startingPlayerIndex } = createRandomSetup(players, rng);
  let state = createInitialGameState(['Ana', 'Beto', 'Caio', 'Dani'].slice(0, players), {
    pieces: shuffledPieces,
    startingPlayerIndex,
    protectTurns: false,
    botLevels: Array(players).fill('medium'),
  });
  state = gameReducer(state, { type: 'START_GAME' });
  for (let step = 0; step < 600 && state.phase !== 'finished'; step++) {
    const action = chooseBotAction(state, rng);
    if (!action) throw new Error(`sem ação na fase ${state.phase}`);
    state = gameReducer(state, action);
  }
  return state;
}

describe('idiomas', () => {
  afterEach(() => {
    setLang('pt');
    window.localStorage.clear();
  });

  it('os quatro dicionários têm as mesmas chaves que o português', () => {
    for (const lang of OTHER) expect(shape(MESSAGES[lang])).toEqual(shape(pt));
  });

  it('o tutorial tem os mesmos passos em todos os idiomas', () => {
    for (const lang of OTHER) {
      const steps = MESSAGES[lang].tutorial.steps;
      expect(steps).toHaveLength(TUTORIAL_STEPS.length);
      steps.forEach((step, index) => {
        const source = TUTORIAL_STEPS[index];
        expect(step.text).toHaveLength(source.text.length);
        expect(step.after?.length).toBe(source.after?.length);
        // As peças citadas (5|6, 2|6...) são as mesmas do roteiro.
        const tiles = (texts: string[] | undefined) => (texts ?? []).join(' ').match(/\d\|\d/g)?.sort();
        expect(tiles(step.text)).toEqual(tiles(source.text));
        expect(tiles(step.after)).toEqual(tiles(source.after));
      });
    }
  });

  it('o idioma do navegador escolhe o idioma inicial (o resto vira inglês)', () => {
    expect(langFromNavigator(['pt-BR'])).toBe('pt');
    expect(langFromNavigator(['es-AR', 'en'])).toBe('es');
    expect(langFromNavigator(['zh-CN'])).toBe('zh');
    expect(langFromNavigator(['zh-TW'])).toBe('zh');
    expect(langFromNavigator(['en-US'])).toBe('en');
    expect(langFromNavigator(['fr-FR', 'de'])).toBe('en');
    expect(langFromNavigator(['fr-FR', 'pt-PT'])).toBe('pt');
    expect(langFromNavigator([])).toBe('en');
  });

  it('trocar o idioma salva a escolha e muda o lang da página', () => {
    setLang('zh');
    expect(getLang()).toBe('zh');
    expect(window.localStorage.getItem(LANG_STORAGE_KEY)).toBe('zh');
    expect(document.documentElement.lang).toBe('zh-CN');
    setLang('es');
    expect(document.documentElement.lang).toBe('es');
  });

  it('todas as linhas do histórico de partidas de verdade são traduzidas', () => {
    const logs = new Set<string>();
    for (let seed = 1; seed <= 30; seed++) {
      for (const line of playBotGame(seed, 2 + (seed % 3)).logs) logs.add(line);
    }
    // As partidas passaram por compra, jogada, blefe, passe automático e fim.
    expect([...logs].some((line) => line.includes('ficou com a peça'))).toBe(true);
    expect([...logs].some((line) => line.includes('passou a vez'))).toBe(true);
    expect([...logs].some((line) => line.endsWith('venceu!'))).toBe(true);

    for (const lang of OTHER) {
      const m = MESSAGES[lang];
      for (const line of logs) {
        const translated = translateLog(line, m);
        expect(translated, `${lang}: ${line}`).not.toBe(line);
        expect(translated).not.toMatch(/peça|monte|jogou|comprou|venceu/);
      }
    }
  });

  it('cada modelo do histórico em português volta traduzido', () => {
    const samples: [string, (m: typeof pt) => string][] = [
      [pt.log.started('Ana'), (m) => m.log.started('Ana')],
      [pt.log.chose('Ana', '[6|6]'), (m) => m.log.chose('Ana', '[6|6]')],
      [pt.log.drew('Ana', 7), (m) => m.log.drew('Ana', 7)],
      [pt.log.played('Ana', '[3|4]', 'left'), (m) => m.log.played('Ana', '[3|4]', 'left')],
      [pt.log.played('Ana', '[3|4]', 'right'), (m) => m.log.played('Ana', '[3|4]', 'right')],
      [pt.log.kept('Ana'), (m) => m.log.kept('Ana')],
      [pt.log.passed('Ana'), (m) => m.log.passed('Ana')],
      [pt.log.turn('Ana'), (m) => m.log.turn('Ana')],
      [pt.log.closedEnd(5), (m) => m.log.closedEnd(5)],
      [pt.log.emptyHand, (m) => m.log.emptyHand],
      [pt.log.blocked, (m) => m.log.blocked],
      [pt.log.won('Ana'), (m) => m.log.won('Ana')],
      [pt.log.tie(['Ana', 'Beto', 'Caio']), (m) => m.log.tie(['Ana', 'Beto', 'Caio'])],
    ];
    for (const lang of OTHER) {
      for (const [source, expected] of samples) expect(translateLog(source, MESSAGES[lang])).toBe(expected(MESSAGES[lang]));
    }
    expect(translateLog('texto desconhecido', MESSAGES.en)).toBe('texto desconhecido');
    expect(translateLog(pt.log.kept('Ana'), pt)).toBe(pt.log.kept('Ana'));
  });

  it('os avisos e erros do servidor são traduzidos', () => {
    const dynamic = {
      back: pt.server.back('Ana'),
      lostConnection: pt.server.lostConnection('Ana'),
      left: pt.server.left('Ana'),
      timeUp: pt.server.timeUp('Ana'),
      chatLong: pt.server.chatLong(200),
    };
    for (const lang of OTHER) {
      const m = MESSAGES[lang];
      for (const [key, value] of Object.entries(pt.server)) {
        if (typeof value === 'string') expect(translateServerText(value, m)).toBe(m.server[key as keyof typeof m.server]);
      }
      expect(translateServerText(dynamic.back, m)).toBe(m.server.back('Ana'));
      expect(translateServerText(dynamic.lostConnection, m)).toBe(m.server.lostConnection('Ana'));
      expect(translateServerText(dynamic.left, m)).toBe(m.server.left('Ana'));
      expect(translateServerText(dynamic.timeUp, m)).toBe(m.server.timeUp('Ana'));
      expect(translateServerText(dynamic.chatLong, m)).toBe(m.server.chatLong(200));
    }
  });

  it('as mensagens rápidas do chat são as mesmas do servidor e são traduzidas', () => {
    expect(pt.chat.quick).toEqual(QUICK_MESSAGES);
    expect(translateQuickMessage(QUICK_MESSAGES.gg, MESSAGES.en)).toBe('Good game!');
    expect(translateQuickMessage(QUICK_MESSAGES.blefe, MESSAGES.zh)).toBe(MESSAGES.zh.chat.quick.blefe);
    expect(translateQuickMessage('outra coisa', MESSAGES.es)).toBe('outra coisa');
  });

  it('nenhum texto fixo do servidor fica sem tradução', () => {
    const files = ['server/src/room.ts', 'server/src/room-manager.ts', 'server/src/socket-server.ts', 'src/online/useOnlineRoom.ts'];
    const texts = files.flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(/'([A-ZÀ-Ú][^'$\n]*[.!])'/g)].map((match) => match[1])
    );
    expect(texts.length).toBeGreaterThan(30);
    for (const text of texts) expect(translateServerText(text, MESSAGES.en), text).not.toBe(text);
  });
});
