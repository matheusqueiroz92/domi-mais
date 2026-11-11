import { describe, expect, it } from 'vitest';
import { TOTAL_PIECES, generateDominoPieces, handSum, isDouble, shufflePieces } from '../pieces';
import { piece, seededRandom } from './helpers';

describe('generateDominoPieces', () => {
  const pieces = generateDominoPieces();

  it('gera as 28 peças do dominó duplo-seis', () => {
    expect(TOTAL_PIECES).toBe(28);
    expect(pieces).toHaveLength(28);
  });

  it('não repete combinações nem ids', () => {
    expect(new Set(pieces.map((p) => `${p.left}-${p.right}`)).size).toBe(28);
    expect(new Set(pieces.map((p) => p.id)).size).toBe(28);
  });

  it('cada peça tem lados de 0 a 6, soma correta e começa virada', () => {
    for (const p of pieces) {
      expect(p.left).toBeGreaterThanOrEqual(0);
      expect(p.right).toBeLessThanOrEqual(6);
      expect(p.left).toBeLessThanOrEqual(p.right);
      expect(p.sum).toBe(p.left + p.right);
      expect(p.isFaceUp).toBe(false);
    }
  });

  it('tem 7 buchas', () => {
    expect(pieces.filter(isDouble)).toHaveLength(7);
  });
});

describe('shufflePieces', () => {
  it('mantém as mesmas peças e não altera o array original', () => {
    const original = generateDominoPieces();
    const copy = [...original];
    const shuffled = shufflePieces(original, seededRandom(1));

    expect(original).toEqual(copy);
    expect(shuffled).toHaveLength(28);
    expect([...shuffled].sort((a, b) => a.id.localeCompare(b.id))).toEqual(
      [...original].sort((a, b) => a.id.localeCompare(b.id))
    );
  });

  it('é reproduzível com a mesma semente e muda com outra', () => {
    const pieces = generateDominoPieces();
    const ids = (seed: number) => shufflePieces(pieces, seededRandom(seed)).map((p) => p.id);

    expect(ids(42)).toEqual(ids(42));
    expect(ids(42)).not.toEqual(ids(43));
  });
});

describe('handSum', () => {
  it('soma os versos das peças', () => {
    expect(handSum([piece(1, 2), piece(6, 6), piece(0, 0)])).toBe(15);
  });

  it('mão vazia soma zero', () => {
    expect(handSum([])).toBe(0);
  });
});
