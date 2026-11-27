import { describe, expect, it } from 'vitest';
import { findBlocked, isClean, normalizeWords } from '../filter';

describe('normalização do texto', () => {
  it('tira acentos, maiúsculas, símbolos, números no lugar de letras e letras repetidas', () => {
    expect(normalizeWords('Ótima JOGADA!!!')).toEqual(['otima', 'jogada']);
    expect(normalizeWords('p0rr4')).toEqual(['pora']);
    expect(normalizeWords('caaaaralhoooo')).toEqual(['caralho']);
    expect(normalizeWords('@rromb@do')).toEqual(['arombado']);
  });

  it('junta letras soltas em sequência', () => {
    expect(normalizeWords('p u t a')).toEqual(['puta']);
    expect(normalizeWords('p.u.t.a que nada')).toEqual(['puta', 'que', 'nada']);
    expect(normalizeWords('c-u')).toEqual(['cu']);
  });
});

describe('o que é bloqueado', () => {
  it.each([
    'porra',
    'que merda de mão',
    'vai se foder',
    'VAI SE FUDER',
    'seu idiota',
    'seuidiota',
    'imbecil',
    'otário',
    'caralho',
    'krl',
    'pqp',
    'fdp',
    'vtnc',
    'filho da puta',
    'filhodaputa',
    'p u t a',
    'p.0.r.r.a',
    'p0rr4',
    'caaaaralho',
    'arrombado',
    'buceta',
    'cu',
    'pau no cu',
    'tomar no c u',
    'viado',
    'bicha',
    'macaco',
    'seu burro',
    'retardado',
    'vagabundo',
    'desgraçado',
    'babaca',
    'cacete',
    'bosta',
    'escroto',
    'fuck',
  ])('"%s"', (text) => {
    expect(isClean(text)).toBe(false);
  });
});

describe('o que passa (sem falsos positivos)', () => {
  it.each([
    'Boa jogada!',
    'Sua vez',
    'computador',
    'cuidado com a mesa',
    'acumulado',
    'disputa acirrada',
    'reputação',
    'o viaduto caiu',
    'enviado',
    'Boston',
    'portela',
    'putz',
    'foi por pouco',
    'porque sim',
    'burocracia',
    'disputaria',
    'as peças',
    'a corporação',
    'o pinto do galo',
    'a bola rola',
  ])('"%s"', (text) => {
    expect(isClean(text)).toBe(true);
  });

  it('frases comuns do jogo passam', () => {
    for (const text of [
      'Será que é blefe?',
      'Comprei um 6|6 kkkk',
      'Ops! Errei a ponta',
      'Haha, boa partida',
      'Faltou o 3 para mim',
      'Pensando...',
      'Vamos de novo?',
      'Ana e eu e o Beto',
    ]) {
      expect(findBlocked(text)).toBeNull();
    }
  });

  it('texto vazio ou só com símbolos passa', () => {
    expect(isClean('')).toBe(true);
    expect(isClean('!!! ???')).toBe(true);
  });

  // 27/11/2026: jogo traduzido para inglês, espanhol e chinês.
  it.each(['you are a b1tch', 'motherfucker', 'eres un pendejo', 'qué mierda', 'cabrón', 'hijo de puta', '你是傻逼', '他 妈 的'])(
    'bloqueia em outros idiomas: "%s"',
    (text) => {
      expect(isClean(text)).toBe(false);
    }
  );

  it.each(['Good game!', 'Nice move', '¡Buena jugada!', 'Tu turno', '打得好！', '轮到你了', 'Dickens', 'Maricá', 'night'])(
    'frases comuns em outros idiomas passam: "%s"',
    (text) => {
      expect(isClean(text)).toBe(true);
    }
  );
});
