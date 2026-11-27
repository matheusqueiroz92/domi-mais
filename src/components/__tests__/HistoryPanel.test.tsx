import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HistoryPanel } from '../HistoryPanel';

describe('HistoryPanel (histórico de jogadas)', () => {
  it('sem jogadas, avisa que ainda não há nada', () => {
    render(<HistoryPanel logs={['Vez de Ana']} />);
    expect(screen.getByText('Nenhuma jogada ainda.')).toBeInTheDocument();
  });

  it('mostra da mais recente para a mais antiga e esconde as linhas "Vez de"', () => {
    render(
      <HistoryPanel
        logs={[
          'Jogo iniciado! Ana deve escolher a peça inicial',
          'Vez de Bia',
          'Bia comprou uma peça do monte (soma: 7)',
          'Bia ficou com a peça',
          'Vez de Ana',
        ]}
      />
    );
    const items = screen.getAllByRole('listitem').map((item) => item.textContent);
    expect(items).toEqual([
      'Bia ficou com a peça',
      'Bia comprou uma peça do monte (soma: 7)',
      'Jogo iniciado! Ana deve escolher a peça inicial',
    ]);
    expect(screen.getAllByRole('listitem')[0]).toHaveClass('history__item--last');
  });
});
