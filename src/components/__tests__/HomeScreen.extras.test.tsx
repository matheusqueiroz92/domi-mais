import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HomeScreen } from '../HomeScreen';
import { PartnersFooter } from '../PartnersFooter';
import { PARTNERS, PARTNERS_TITLE } from '../../home/partners';

function home(props: Partial<Parameters<typeof HomeScreen>[0]> = {}) {
  return render(
    <HomeScreen
      onStartGame={vi.fn()}
      theme="dark"
      onToggleTheme={vi.fn()}
      soundOn
      onToggleSound={vi.fn()}
      onStartTutorial={vi.fn()}
      {...props}
    />
  );
}

describe('tela inicial: contador, dominó físico e parceiros', () => {
  it('mostra o contador só quando o total chegou', () => {
    const { rerender } = home();
    expect(screen.queryByText(/partidas jogadas/)).toBeNull();
    rerender(
      <HomeScreen
        onStartGame={vi.fn()}
        theme="dark"
        onToggleTheme={vi.fn()}
        soundOn
        onToggleSound={vi.fn()}
        onStartTutorial={vi.fn()}
        matchCount={5342}
      />
    );
    expect(screen.getByText('5.342')).toBeInTheDocument();
    expect(screen.getByText(/partidas jogadas/)).toBeInTheDocument();
  });

  it('o cartão do dominó físico abre o pop-up "Em breve" com a foto', () => {
    home();
    fireEvent.click(screen.getByRole('button', { name: /Dominó físico/ }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Em breve!')).toBeInTheDocument();
    expect(within(dialog).getByRole('img')).toBeInTheDocument();
    expect(within(dialog).queryByRole('link', { name: 'Comprar' })).toBeNull();
  });

  it(`rodapé "${PARTNERS_TITLE}" com uma logo por parceiro`, () => {
    home();
    const footer = screen.getByRole('contentinfo');
    const partners = within(footer).getByRole('region', { name: PARTNERS_TITLE });
    expect(within(partners).getAllByRole('img')).toHaveLength(PARTNERS.length);
  });

  it('rodapé com direitos reservados, Cassiano Ribeiro e a versão digital com link para o portfólio de Matheus Queiroz', () => {
    home();
    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveTextContent(`© ${new Date().getFullYear()} DomiMais. Todos os direitos reservados.`);
    expect(footer).toHaveTextContent('Jogo criado por Cassiano Ribeiro. Versão digital desenvolvida por Matheus Queiroz.');
    expect(footer).not.toHaveTextContent('(');
    const link = within(footer).getByRole('link', { name: 'Matheus Queiroz' });
    expect(link).toHaveAttribute('href', 'https://matheusqueiroz.dev.br');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('em telas grandes, a grade põe a imagem ao lado dos modos e a chamada ao lado das ações', () => {
    const { container } = home({ matchCount: 5000 });
    const layout = container.querySelector('.home__layout')!;
    // Ordem no celular: imagem, chamada (com contador), modos, ações.
    expect([...layout.children].map((el) => el.className)).toEqual([
      'home__logo',
      'home__intro',
      'home__modes',
      'home__more',
    ]);
    expect(layout.querySelector('.home__intro')).toHaveTextContent('5.000 partidas jogadas');
    expect(layout.querySelector('.home__more')).toHaveTextContent('Dominó físico');
  });

  it('o exemplo "soma 7 pode ser" saiu da tela inicial e foi para "Como jogar"', () => {
    home();
    expect(screen.queryByText('pode ser')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Como jogar' }));
    expect(within(screen.getByRole('dialog')).getByText('pode ser')).toBeInTheDocument();
  });

  it('logo com site vira link em nova aba; sem parceiros, o rodapé some', () => {
    const { unmount } = render(
      <PartnersFooter
        partners={[
          { name: 'Loja A', logo: '/a.png', url: 'https://exemplo.com.br' },
          { name: 'Loja B', logo: '/b.png' },
        ]}
      />
    );
    const link = screen.getByRole('link', { name: 'Loja A' });
    expect(link).toHaveAttribute('href', 'https://exemplo.com.br');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(screen.getByRole('img', { name: 'Loja B' }).closest('a')).toBeNull();
    unmount();
    const { container } = render(<PartnersFooter partners={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
