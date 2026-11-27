import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DrawPile } from '../DrawPile';
import { PlayerHand } from '../PlayerHand';
import { generateDominoPieces } from '../../game/logic/pieces';
import type { Player } from '../../game/state/game-types';

const all = generateDominoPieces();
const player: Player = { id: 'p1', name: 'Ana', hand: all.slice(0, 3), botLevel: null } as Player;

describe('celular: informação só onde precisa', () => {
  it('o cabeçalho do monte mostra o aviso da vez no lugar de "Monte" e da contagem', () => {
    render(
      <DrawPile order={all.map((p) => p.id)} pieces={all} message="Ana, compre uma peça do monte" messageActive />
    );
    const pile = screen.getByRole('region', { name: 'Monte, 28 peças' });
    expect(within(pile).getByRole('status')).toHaveTextContent('Ana, compre uma peça do monte');
    expect(within(pile).getByRole('status')).toHaveClass('pile__message--active');
    expect(within(pile).queryByRole('heading')).toBeNull();
  });

  it('sem aviso (tutorial), volta o título "Monte"', () => {
    render(<DrawPile order={all.map((p) => p.id)} pieces={all} />);
    expect(screen.getByRole('heading', { name: 'Monte' })).toBeInTheDocument();
  });

  it('mão compacta: sem contagem de peças e com o botão de encerrar o turno no cabeçalho', () => {
    render(
      <PlayerHand
        player={player}
        selectedPieceId={null}
        drawnPieceId={player.hand[0].id}
        canSelect
        onSelectPiece={() => {}}
        compact
        action={<button type="button">Ficar com a peça</button>}
      />
    );
    const hand = screen.getByRole('region', { name: 'Mão de Ana' });
    expect(hand).not.toHaveTextContent(/peças|comprada agora/);
    expect(within(hand).getByRole('button', { name: 'Ficar com a peça' })).toBeInTheDocument();
  });

  it('fora do celular, a mão continua com a contagem', () => {
    render(
      <PlayerHand player={player} selectedPieceId={null} drawnPieceId={null} canSelect={false} onSelectPiece={() => {}} />
    );
    expect(screen.getByText('Sua mão · 3 peças')).toBeInTheDocument();
  });
});
