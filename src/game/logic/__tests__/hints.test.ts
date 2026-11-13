import { describe, expect, it } from 'vitest';
import { formatCandidates, formatFitting, getDrawHints, getPlayHints } from '../hints';
import { getPlayerView } from '../deduction';
import { piece, scenario } from './helpers';

describe('dicas para a compra (getDrawHints)', () => {
  // Pontas 3 e 5. Monte com somas 12, 7, 7 e 2.
  const state = scenario({
    handA: [piece(1, 6)],
    handB: [piece(0, 0)],
    pile: [piece(6, 6), piece(2, 5), piece(3, 4), piece(0, 2)],
  });
  const hints = getDrawHints(state, 0);

  it('há uma linha por soma do monte, com a quantidade de peças de cada soma', () => {
    expect(hints.map((h) => h.sum).sort((a, b) => a - b)).toEqual([2, 7, 12]);
    expect(hints.find((h) => h.sum === 7)!.tiles).toBe(2);
    expect(hints.find((h) => h.sum === 12)!.tiles).toBe(1);
  });

  it('lista as peças que cada soma ainda pode ser, descontando as já vistas', () => {
    // 1|6 está na mão do jogador: soma 7 só pode ser 2|5 ou 3|4.
    const seven = hints.find((h) => h.sum === 7)!;
    expect(seven.candidates.map((c) => `${c.left}|${c.right}`)).toEqual(['2|5', '3|4']);
    // Soma 12 só pode ser 6|6; soma 2 pode ser 0|2 ou 1|1.
    expect(hints.find((h) => h.sum === 12)!.candidates).toHaveLength(1);
    expect(hints.find((h) => h.sum === 2)!.candidates.map((c) => `${c.left}|${c.right}`)).toEqual([
      '0|2',
      '1|1',
    ]);
  });

  it('calcula a chance de encaixar e ordena da maior para a menor', () => {
    const seven = hints.find((h) => h.sum === 7)!;
    expect(seven.fitting).toBe(2);
    expect(seven.probability).toBe(1);
    expect(hints.find((h) => h.sum === 12)!.probability).toBe(0);
    expect(hints.find((h) => h.sum === 2)!.probability).toBe(0);
    expect(hints[0].sum).toBe(7);
    // Empate na chance: a menor soma vem primeiro.
    expect(hints.slice(1).map((h) => h.sum)).toEqual([2, 12]);
  });

  it('não revela peças viradas: a dica depende só do que o jogador vê', () => {
    // Mesmo monte visto de fora (somas 12, 7, 7, 2), com outras peças por baixo.
    const other = scenario({
      handA: [piece(1, 6)],
      handB: [piece(0, 0)],
      pile: [piece(6, 6, '6-6'), piece(3, 4, '2-5'), piece(2, 5, '3-4'), piece(1, 1, '0-2')],
    });
    expect(getPlayerView(other, 0)).toEqual(getPlayerView(state, 0));
    expect(getDrawHints(other, 0)).toEqual(hints);
  });

  it('monte vazio não gera dicas', () => {
    expect(getDrawHints(scenario({ handA: [piece(1, 6)] }), 0)).toEqual([]);
  });
});

describe('dicas para a jogada (getPlayHints)', () => {
  it('lista as peças da mão que encaixam e em quais pontas', () => {
    const state = scenario({ handA: [piece(3, 5), piece(1, 1), piece(5, 6)] });
    const { playable } = getPlayHints(state, 0);
    expect(playable).toEqual([
      { pieceId: '3-5', left: 3, right: 5, sides: ['left', 'right'] },
      { pieceId: '5-6', left: 5, right: 6, sides: ['right'] },
    ]);
  });

  it('sem peça que encaixe, não há sugestão', () => {
    const hints = getPlayHints(scenario({ handA: [piece(1, 1), piece(0, 2)] }), 0);
    expect(hints).toEqual({ playable: [], suggestion: null });
  });

  it('sugere a jogada que deixa outras peças da mão encaixando', () => {
    // Pontas 3 e 5. Jogar [5|2] deixa 3 e 2: [2|2] e [2|0] continuam encaixando.
    const state = scenario({ handA: [piece(3, 1), piece(5, 2), piece(2, 2), piece(2, 0)] });
    const { suggestion } = getPlayHints(state, 0);
    expect(suggestion).toMatchObject({ pieceId: '5-2', side: 'right' });
    expect(suggestion!.reason).toBe('depois dela, outras 3 peças suas continuam encaixando');
  });

  it('sem diferença no que continua encaixando, sugere a peça de mais pontos', () => {
    const state = scenario({ handA: [piece(3, 0), piece(3, 6), piece(1, 1)] });
    const { suggestion } = getPlayHints(state, 0);
    expect(suggestion).toMatchObject({ pieceId: '3-6', side: 'left' });
    expect(suggestion!.reason).toBe('é a que tira mais pontos da sua mão (soma 9)');
  });

  it('avisa quando é a última peça', () => {
    const { suggestion } = getPlayHints(scenario({ handA: [piece(3, 0)] }), 0);
    expect(suggestion).toMatchObject({ pieceId: '3-0', reason: 'é a sua última peça' });
  });
});

describe('textos das dicas', () => {
  const c = (left: number, right: number) => ({ left, right, sum: left + right });

  it('escreve as peças possíveis', () => {
    expect(formatCandidates([c(6, 6)])).toBe('6|6');
    expect(formatCandidates([c(2, 5), c(3, 4)])).toBe('2|5 ou 3|4');
    expect(formatCandidates([c(1, 6), c(2, 5), c(3, 4)])).toBe('1|6, 2|5 ou 3|4');
  });

  it('escreve quantas encaixam', () => {
    expect(formatFitting({ candidates: [c(6, 6)], fitting: 1 })).toBe('encaixa com certeza');
    expect(formatFitting({ candidates: [c(6, 6)], fitting: 0 })).toBe('não encaixa');
    expect(formatFitting({ candidates: [c(2, 5), c(3, 4)], fitting: 2 })).toBe('as duas encaixam');
    expect(formatFitting({ candidates: [c(1, 6), c(2, 5), c(3, 4)], fitting: 3 })).toBe('as 3 encaixam');
    expect(formatFitting({ candidates: [c(1, 6), c(2, 5), c(3, 4)], fitting: 1 })).toBe('1 de 3 encaixa');
    expect(formatFitting({ candidates: [c(1, 6), c(2, 5), c(3, 4)], fitting: 2 })).toBe('2 de 3 encaixam');
    expect(formatFitting({ candidates: [c(0, 2), c(1, 1)], fitting: 0 })).toBe('nenhuma encaixa');
  });
});
