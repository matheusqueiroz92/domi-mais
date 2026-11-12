import { describe, expect, it } from 'vitest';
import {
  createScatter,
  fitSnake,
  layoutSnake,
  maxHalfForWidth,
  pieceSize,
  seatOpponents,
} from '../table-layout';
import type { PlacedItem, SnakeLayout } from '../table-layout';
import type { Table, TableSide } from '../../game/state/game-types';
import { generateDominoPieces, shufflePieces } from '../../game/logic/pieces';
import { placePiece } from '../../game/logic/rules';
import { seededRandom } from '../../game/logic/__tests__/helpers';

/** Monta uma mesa válida com `count` peças, jogando ora à direita, ora à esquerda. */
function buildTable(count: number, seed: number): { table: Table; initialPieceId: string } {
  const deck = shufflePieces(generateDominoPieces(), seededRandom(seed));
  const first = deck[0];
  let table: Table = placePiece({ leftEnd: null, rightEnd: null, pieces: [] }, first, 'right')!;
  let pending = deck.slice(1);
  let progress = true;
  while (table.pieces.length < count && progress) {
    progress = false;
    for (const candidate of pending) {
      const sides: TableSide[] = table.pieces.length % 2 === 0 ? ['right', 'left'] : ['left', 'right'];
      const next = placePiece(table, candidate, sides[0]) ?? placePiece(table, candidate, sides[1]);
      if (next) {
        table = next;
        pending = pending.filter((p) => p !== candidate);
        progress = true;
        break;
      }
    }
  }
  return { table, initialPieceId: first.id };
}

const pieceItems = (layout: SnakeLayout) => layout.items.filter((item) => item.kind === 'piece');

/** As duas metades de uma peça como são desenhadas: valor e centro. */
function halves(item: PlacedItem) {
  const piece = item.piece!;
  const [first, second] = item.flipped ? [piece.right, piece.left] : [piece.left, piece.right];
  return item.orientation === 'horizontal'
    ? [
        { value: first, cx: item.x + item.w / 4, cy: item.y + item.h / 2 },
        { value: second, cx: item.x + (3 * item.w) / 4, cy: item.y + item.h / 2 },
      ]
    : [
        { value: first, cx: item.x + item.w / 2, cy: item.y + item.h / 4 },
        { value: second, cx: item.x + item.w / 2, cy: item.y + (3 * item.h) / 4 },
      ];
}

/** Distância entre duas caixas (0 se encostam ou se sobrepõem). */
function boxGap(a: PlacedItem, b: PlacedItem) {
  const dx = Math.max(0, a.x - (b.x + b.w), b.x - (a.x + a.w));
  const dy = Math.max(0, a.y - (b.y + b.h), b.y - (a.y + a.h));
  return Math.max(dx, dy);
}

const overlaps = (a: PlacedItem, b: PlacedItem) =>
  a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;

describe('layoutSnake (cobrinha com curvas em ângulo reto)', () => {
  it('mesa vazia não gera itens', () => {
    expect(layoutSnake([], null, { width: 300, half: 20 })).toEqual({ items: [], width: 300, height: 0 });
  });

  it('a peça inicial fica no centro da mesa', () => {
    const { table, initialPieceId } = buildTable(9, 1);
    const layout = layoutSnake(table.pieces, initialPieceId, { width: 900, half: 28 });
    const anchor = layout.items.find((item) => item.key === initialPieceId)!;
    expect(anchor.x + anchor.w / 2).toBeCloseTo(450);
  });

  it('linha curta fica em uma fileira só, sem peças de canto', () => {
    const { table, initialPieceId } = buildTable(6, 2);
    const layout = layoutSnake(table.pieces, initialPieceId, { width: 1200, half: 28 });
    const items = pieceItems(layout);
    expect(items).toHaveLength(6);
    expect(items.some((item) => item.corner)).toBe(false);
    const centers = new Set(items.map((item) => Math.round(item.y + item.h / 2)));
    expect(centers.size).toBe(1);
  });

  it('buchas ficam em pé; as demais peças, deitadas (fora dos cantos)', () => {
    const { table, initialPieceId } = buildTable(12, 3);
    for (const item of pieceItems(layoutSnake(table.pieces, initialPieceId, { width: 1400, half: 28 }))) {
      const double = item.piece!.left === item.piece!.right;
      expect(item.orientation).toBe(double ? 'vertical' : 'horizontal');
    }
  });

  describe.each([
    [28, 220, 20],
    [28, 340, 24],
    [27, 600, 32],
    [28, 1100, 44],
    [16, 260, 24],
  ])('%i peças em uma mesa de %i px (meia peça de %i px)', (count, width, half) => {
    const layouts = [1, 2, 3, 4, 5, 6].map((seed) => {
      const { table, initialPieceId } = buildTable(count, seed);
      return { table, layout: layoutSnake(table.pieces, initialPieceId, { width, half }) };
    });

    it('todas as peças ficam dentro da largura da mesa', () => {
      for (const { layout } of layouts) {
        for (const item of layout.items) {
          expect(item.x).toBeGreaterThanOrEqual(0);
          expect(item.x + item.w).toBeLessThanOrEqual(width);
          expect(item.y).toBeGreaterThanOrEqual(0);
          expect(item.y + item.h).toBeLessThanOrEqual(layout.height + 0.01);
        }
      }
    });

    it('nenhuma peça fica em cima de outra', () => {
      for (const { layout } of layouts) {
        const items = pieceItems(layout);
        for (let i = 0; i < items.length; i++) {
          for (let j = i + 1; j < items.length; j++) {
            expect(overlaps(items[i], items[j])).toBe(false);
          }
        }
      }
    });

    it('peças vizinhas na linha encostam uma na outra, pelo lado de mesmo número', () => {
      for (const { table, layout } of layouts) {
        const byId = new Map(layout.items.map((item) => [item.key, item]));
        for (let i = 1; i < table.pieces.length; i++) {
          const a = byId.get(table.pieces[i - 1].id)!;
          const b = byId.get(table.pieces[i].id)!;
          expect(boxGap(a, b)).toBeLessThanOrEqual(3);

          // As metades mais próximas das duas peças mostram o mesmo número.
          let best = { distance: Infinity, same: false };
          for (const ha of halves(a)) {
            for (const hb of halves(b)) {
              const distance = Math.hypot(ha.cx - hb.cx, ha.cy - hb.cy);
              if (distance < best.distance - 0.01) best = { distance, same: ha.value === hb.value };
              else if (Math.abs(distance - best.distance) <= 0.01 && ha.value === hb.value) best.same = true;
            }
          }
          expect(best.same).toBe(true);
        }
      }
    });

    it('a curva é feita por uma peça em pé, perpendicular à anterior, e nunca por uma bucha', () => {
      let corners = 0;
      for (const { layout } of layouts) {
        for (const item of pieceItems(layout).filter((piece) => piece.corner)) {
          corners++;
          expect(item.orientation).toBe('vertical');
          expect(item.piece!.left).not.toBe(item.piece!.right);
        }
      }
      // Em mesas estreitas com muitas peças, a linha precisa fazer curvas.
      if (count >= 27 && width <= 600) expect(corners).toBeGreaterThan(0);
    });
  });

  it('depois de uma curva a fileira volta no sentido contrário, afastada da anterior', () => {
    // Procura uma mesa em que o braço direito faz uma curva e continua depois dela.
    let rightArm: PlacedItem[] = [];
    let cornerAt = -1;
    for (let seed = 1; seed <= 20 && cornerAt < 0; seed++) {
      const { table, initialPieceId } = buildTable(28, seed);
      const layout = layoutSnake(table.pieces, initialPieceId, { width: 300, half: 20 });
      const byId = new Map(layout.items.map((item) => [item.key, item]));
      const anchorIndex = table.pieces.findIndex((p) => p.id === initialPieceId);
      rightArm = table.pieces.slice(anchorIndex + 1).map((p) => byId.get(p.id)!);
      const index = rightArm.findIndex((item) => item.corner);
      if (index > 0 && index < rightArm.length - 1) cornerAt = index;
    }
    expect(cornerAt).toBeGreaterThan(0);

    const before = rightArm[cornerAt - 1];
    const corner = rightArm[cornerAt];
    const after = rightArm[cornerAt + 1];
    // O braço direito vai para a direita, sobe na curva e volta para a esquerda.
    expect(corner.y + corner.h).toBeLessThanOrEqual(before.y + 0.01);
    expect(after.x + after.w).toBeLessThanOrEqual(corner.x + 0.01);
    expect(after.y + after.h / 2).toBeLessThan(before.y + before.h / 2 - 20);
  });

  it('jogar uma peça nova não tira do lugar as que já estavam na mesa', () => {
    const { table, initialPieceId } = buildTable(20, 4);
    const options = { width: 320, half: 20 };
    const anchorIndex = table.pieces.findIndex((p) => p.id === initialPieceId);

    // Mesma mesa sem a última peça da direita e sem a última da esquerda.
    const fewer = table.pieces.slice(1, -1);
    expect(anchorIndex).toBeGreaterThan(0);
    const full = layoutSnake(table.pieces, initialPieceId, options);
    const partial = layoutSnake(fewer, initialPieceId, options);

    const anchorFull = full.items.find((item) => item.key === initialPieceId)!;
    const anchorPartial = partial.items.find((item) => item.key === initialPieceId)!;
    for (const item of pieceItems(partial)) {
      const same = full.items.find((other) => other.key === item.key)!;
      expect(same.x).toBeCloseTo(item.x);
      // A posição vertical é a mesma em relação à peça inicial.
      expect(same.y - anchorFull.y).toBeCloseTo(item.y - anchorPartial.y);
      expect(same.orientation).toBe(item.orientation);
      expect(same.flipped).toBe(item.flipped);
    }
  });

  it('os alvos de jogada ficam nas pontas, encostados na última peça de cada lado', () => {
    const { table, initialPieceId } = buildTable(11, 5);
    const layout = layoutSnake(table.pieces, initialPieceId, {
      width: 360,
      half: 24,
      leftSlot: true,
      rightSlot: true,
    });
    const slots = layout.items.filter((item) => item.kind === 'slot');
    expect(slots.map((slot) => slot.side).sort()).toEqual(['left', 'right']);

    const byId = new Map(layout.items.map((item) => [item.key, item]));
    const first = byId.get(table.pieces[0].id)!;
    const last = byId.get(table.pieces[table.pieces.length - 1].id)!;
    expect(boxGap(slots.find((slot) => slot.side === 'left')!, first)).toBeLessThanOrEqual(3);
    expect(boxGap(slots.find((slot) => slot.side === 'right')!, last)).toBeLessThanOrEqual(3);
    for (const slot of slots) {
      for (const item of pieceItems(layout)) expect(overlaps(slot, item)).toBe(false);
    }
  });

  it('sem alvos pedidos, não há alvos', () => {
    const { table, initialPieceId } = buildTable(5, 1);
    const layout = layoutSnake(table.pieces, initialPieceId, { width: 600, half: 28 });
    expect(layout.items.every((item) => item.kind === 'piece')).toBe(true);
  });
});

describe('tamanho das peças (fitSnake)', () => {
  it('mesas largas usam peças maiores', () => {
    expect(maxHalfForWidth(220)).toBe(20);
    expect(maxHalfForWidth(340)).toBe(24);
    expect(maxHalfForWidth(600)).toBe(32);
    expect(maxHalfForWidth(1100)).toBe(44);
    expect(maxHalfForWidth(1500)).toBe(52);
    expect(pieceSize(44).long).toBeGreaterThan(pieceSize(28).long);
  });

  it('sem limite de altura, usa o maior tamanho que a largura permite', () => {
    const { table, initialPieceId } = buildTable(28, 1);
    expect(fitSnake(table.pieces, initialPieceId, { width: 1100 }).half).toBe(44);
    expect(fitSnake(table.pieces, initialPieceId, { width: 300 }).half).toBe(24);
  });

  it('com altura fixa, diminui as peças até a linha caber', () => {
    const { table, initialPieceId } = buildTable(28, 1);
    const free = fitSnake(table.pieces, initialPieceId, { width: 700 });
    const tight = fitSnake(table.pieces, initialPieceId, { width: 700, maxHeight: free.height - 40 });
    expect(tight.half).toBeLessThan(free.half);
    expect(tight.height).toBeLessThanOrEqual(free.height - 40);
  });

  it('se nem o menor tamanho couber, usa o menor mesmo assim', () => {
    const { table, initialPieceId } = buildTable(28, 1);
    expect(fitSnake(table.pieces, initialPieceId, { width: 700, maxHeight: 10 }).half).toBe(20);
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
