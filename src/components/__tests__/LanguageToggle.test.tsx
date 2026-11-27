import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../../App';
import { LANG_STORAGE_KEY, setLang } from '../../i18n/lang';

/** Abre o seletor (globo) e escolhe um idioma pelo nome escrito nele mesmo. */
function chooseLanguage(name: string) {
  fireEvent.click(screen.getByRole('button', { name: /idioma|language|语言/i }));
  fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitemradio', { name }));
}

describe('seletor de idioma', () => {
  afterEach(() => {
    cleanup();
    act(() => setLang('pt'));
    window.localStorage.clear();
  });

  it('fica no topo, ao lado do som e do tema, e lista os quatro idiomas', () => {
    render(<App onlineEnabled={false} />);
    const button = screen.getByRole('button', { name: 'Escolher o idioma (Português)' });
    const actions = button.closest('.home__actions');
    expect(actions).not.toBeNull();
    expect(within(actions as HTMLElement).getByRole('button', { name: 'Desligar o som' })).toBeInTheDocument();
    expect(within(actions as HTMLElement).getByRole('button', { name: /tema/ })).toBeInTheDocument();

    fireEvent.click(button);
    const options = within(screen.getByRole('menu')).getAllByRole('menuitemradio');
    expect(options.map((option) => option.textContent)).toEqual(['Português', 'English', 'Español', '中文']);
    expect(options[0]).toHaveAttribute('aria-checked', 'true');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('troca a tela inicial na hora e guarda a escolha', () => {
    render(<App onlineEnabled={false} />);
    chooseLanguage('English');
    expect(screen.getByRole('heading', { name: 'Bluff. Deduce. Win.' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Against the computer/ })).toBeInTheDocument();
    expect(window.localStorage.getItem(LANG_STORAGE_KEY)).toBe('en');
    expect(document.documentElement.lang).toBe('en');

    chooseLanguage('Español');
    expect(screen.getByRole('heading', { name: 'Blufea. Deduce. Gana.' })).toBeInTheDocument();

    chooseLanguage('中文');
    expect(screen.getByRole('button', { name: /对战电脑/ })).toBeInTheDocument();
  });

  it('a partida, as dicas e o histórico aparecem no idioma escolhido', () => {
    render(<App onlineEnabled={false} />);
    chooseLanguage('English');
    fireEvent.click(screen.getByRole('button', { name: /Against the computer/ }));
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Ana' } });
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skip animation' }));

    expect(screen.getByRole('region', { name: /^Boneyard, 28 tiles$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move history' })).toBeInTheDocument();
    // O seletor também fica no cabeçalho da partida.
    expect(screen.getByRole('button', { name: 'Choose language (English)' }).closest('.game__actions')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Move history' }));
    const dialog = screen.getByRole('dialog', { name: 'Move history' });
    expect(within(dialog).getByText(/Game started! .+ must choose the first tile/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));

    // Trocar no meio da partida também vale (a partida continua).
    chooseLanguage('Español');
    expect(screen.getByRole('region', { name: /^Pozo, 28 fichas$/ })).toBeInTheDocument();
  });

  it('o tutorial usa o nome e os textos do idioma', () => {
    render(<App onlineEnabled={false} />);
    chooseLanguage('English');
    fireEvent.click(screen.getByRole('button', { name: 'Tutorial' }));
    expect(screen.getByRole('heading', { name: 'Welcome to DomiMais' })).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 12')).toBeInTheDocument();
  });
});
