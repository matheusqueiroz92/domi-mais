import { describe, expect, it } from 'vitest';
import {
  createScatter,
  halfForWidth,
  layoutChain,
  pieceWidth,
  seatOpponents,
  slotWidth,
} from '../table-layout';
import { seededRandom } from '../../game/logic/__tests__/helpers';
import { piece } from '../../game/logic/__tests__/helpers';

const ids = (rows: ReturnType<typeof layoutChain>) =>
  rows.map((row) => row.items.map((item) => (item.kind === 'slot' ? `slot-${item.side}` : item.piece.id)));

describe('layoutChain (mesa em cobrinha)', () => {
  const chain = [piece(2, 5), piece(5, 5), piece(5, 3), piece(3, 6), piece(6, 6), piece(6, 1)];

  it('bucha ocupa meia largura; alvo de jogada tem ao menos 44 px', () => {
    expect(pieceWidth(piece(5, 5), 20)).toBeLessThan(pieceWidth(piece(2, 5), 20));
    expect(slotWidth(20)).toBe(44);
    expect(slotWidth(28)).toBe(56);
  });

  it('mantém tudo em uma fileira quando cabe', () => {
    const rows = layoutChain(chain, { maxWidth: 1000, half: 20 });
    expect(rows).toHaveLength(1);
    expect(rows[0].reversed).toBe(false);
    expect(ids(rows)[0]).toEqual(chain.map((p) => p.id));
  });

  it('dobra em fileiras que alternam o sentido e preserva a ordem das peças', () => {
    const rows = layoutChain(chain, { maxWidth: 110, half: 20 });
    expect(rows.length).toBeGreaterThan(1);
    expect(rows.map((row) => row.reversed)).toEqual(rows.map((_, index) => index % 2 === 1));
    expect(ids(rows).flat()).toEqual(chain.map((p) => p.id));
  });

  it('nenhuma fileira passa da largura disponível', () => {
    const half = 20;
    const maxWidth = 150;
    for (const row of layoutChain(chain, { maxWidth, half, leftSlot: true, rightSlot: true })) {
      const width = row.items.reduce(
        (total, item, index) =>
          total + (index > 0 ? 2 : 0) + (item.kind === 'slot' ? slotWidth(half) : pieceWidth(item.piece, half)),
        0
      );
      expect(width).toBeLessThanOrEqual(maxWidth);
    }
  });

  it('coloca os alvos de jogada nas duas pontas da linha', () => {
    const rows = layoutChain(chain, { maxWidth: 150, half: 20, leftSlot: true, rightSlot: true });
    const flat = ids(rows).flat();
    expect(flat[0]).toBe('slot-left');
    expect(flat[flat.length - 1]).toBe('slot-right');
  });

  it('largura minúscula ainda coloca pelo menos um item por fileira', () => {
    const rows = layoutChain(chain, { maxWidth: 10, half: 20 });
    expect(rows).toHaveLength(chain.length);
  });

  it('mesa vazia não gera fileiras', () => {
    expect(layoutChain([], { maxWidth: 300, half: 20 })).toEqual([]);
  });

  it('usa peças maiores em mesas largas', () => {
    expect(halfForWidth(300)).toBe(20);
    expect(halfForWidth(700)).toBe(28);
  });
});

describe('seatOpponents (adversários em volta da mesa)', () => {
  it('2 jogadores: o adversário fica em cima', () => {
    expect(seatOpponents(2, 0)).toEqual({ top: 1, left: null, right: null });
    expect(seatOpponents(2, 1)).toEqual({ top: 0, left: null, right: null });
  });

  it('3 jogadores: o próximo a jogar fica à esquerda e o seguinte à direita', () => {
    expect(seatOpponents(3, 0)).toEqual({ top: null, left: 1, right: 2 });
    expect(seatOpponents(3, 2)).toEqual({ top: null, left: 0, right: 1 });
  });

  it('4 jogadores: esquerda, em cima e direita, na ordem dos turnos', () => {
    expect(seatOpponents(4, 0)).toEqual({ left: 1, top: 2, right: 3 });
    expect(seatOpponents(4, 3)).toEqual({ left: 0, top: 1, right: 2 });
  });

  it('nunca coloca o próprio jogador em volta da mesa', () => {
    for (const count of [2, 3, 4]) {
      for (let viewer = 0; viewer < count; viewer++) {
        const seats = Object.values(seatOpponents(count, viewer)).filter((seat) => seat !== null);
        expect(seats).not.toContain(viewer);
        expect(new Set(seats).size).toBe(count - 1);
      }
    }
  });
});

describe('createScatter (animação de embaralhar)', () => {
  it('gera um trajeto por peça, com todas as posições dentro da mesa', () => {
    const paths = createScatter(28, seededRandom(3));
    expect(paths).toHaveLength(28);
    for (const path of paths) {
      expect(path).toHaveLength(4);
      for (const point of path) {
        expect(point.x).toBeGreaterThanOrEqual(4);
        expect(point.x).toBeLessThanOrEqual(84);
        expect(point.y).toBeGreaterThanOrEqual(6);
        expect(point.y).toBeLessThanOrEqual(72);
        expect(Math.abs(point.rotate)).toBeLessThanOrEqual(180);
      }
    }
  });

  it('é reproduzível com a mesma semente', () => {
    expect(createScatter(5, seededRandom(9))).toEqual(createScatter(5, seededRandom(9)));
  });
});
