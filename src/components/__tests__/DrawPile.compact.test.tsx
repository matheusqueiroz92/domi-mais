import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DrawPile } from '../DrawPile';
import { generateDominoPieces } from '../../game/logic/pieces';

const all = generateDominoPieces();
const order = all.map((piece) => piece.id);

describe('monte no celular', () => {
  it('usa 7 colunas (4 fileiras) quando pedido; o padrão continua 14', () => {
    const { container, rerender } = render(<DrawPile order={order} pieces={all} />);
    const grid = () => container.querySelector('.pile__grid') as HTMLElement;
    expect(grid().style.gridTemplateColumns).toMatch(/^repeat\(14,/);
    rerender(<DrawPile order={order} pieces={all} columns={7} />);
    expect(grid().style.gridTemplateColumns).toMatch(/^repeat\(7,/);
    expect(grid()).toHaveClass('pile__grid--compact');
    expect(container.querySelectorAll('.pile__slot')).toHaveLength(28);
  });

  it('esconde só as fileiras que ficaram todas vazias, sem mudar o lugar das outras peças', () => {
    // Compradas todas as 7 peças da segunda fileira e uma da primeira.
    const bought = new Set([...order.slice(7, 14), order[0]]);
    const pieces = all.filter((piece) => !bought.has(piece.id));
    const { container } = render(<DrawPile order={order} pieces={pieces} columns={7} collapseEmptyRows />);
    const slots = container.querySelectorAll('.pile__slot');
    expect(slots).toHaveLength(21);
    // A primeira fileira continua com o lugar vazio da peça comprada.
    expect(slots[0].children).toHaveLength(0);
    expect(slots[1].children).toHaveLength(1);
  });

  it('durante o embaralhar mostra todos os lugares', () => {
    const { container } = render(<DrawPile order={order} pieces={[]} columns={7} collapseEmptyRows hideTiles />);
    expect(container.querySelectorAll('.pile__slot')).toHaveLength(28);
  });
});
