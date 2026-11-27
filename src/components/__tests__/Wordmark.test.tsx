import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Wordmark } from '../Wordmark';
import { HomeScreen } from '../HomeScreen';

describe('Wordmark (logomarca)', () => {
  it('tem uma versão para cada tema, as duas com o nome do jogo', () => {
    render(<Wordmark />);
    const imgs = screen.getAllByRole('img', { name: 'DomiMais' });
    expect(imgs.map((img) => img.getAttribute('src'))).toEqual(['/logo/logo-dark.webp', '/logo/logo-light.webp']);
    expect(imgs[0]).toHaveClass('wordmark__img--dark');
    expect(imgs[1]).toHaveClass('wordmark__img--light');
  });

  it('aparece no topo da tela inicial, no lugar do nome em texto', () => {
    const noop = () => {};
    const { container } = render(
      <HomeScreen onStartGame={noop} theme="dark" onToggleTheme={noop} soundOn onToggleSound={noop} onStartTutorial={noop} />
    );
    const topbar = container.querySelector('.home__topbar')!;
    expect(topbar.querySelector('.wordmark img')).not.toBeNull();
    expect(topbar.querySelector('.wordmark')).not.toHaveTextContent('DomiMais');
  });
});
