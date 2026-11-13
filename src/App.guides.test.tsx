import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import App, { HINTS_STORAGE_KEY } from './App';
import { seededRandom } from './game/logic/__tests__/helpers';
import { TUTORIAL_STEPS } from './tutorial/script';
import { TUTORIAL_BOT_DELAY_MS } from './tutorial/useTutorial';

const FACE_DOWN = /^Peça virada, soma \d+$/;
const pileButtons = () => screen.queryAllByRole('button', { name: FACE_DOWN });
const coach = () => screen.getByRole('region', { name: 'Tutorial' });
const coachTitle = () => within(coach()).getByRole('heading').textContent;
const next = () => fireEvent.click(within(coach()).getByRole('button', { name: 'Continuar' }));
const letBiaAct = () =>
  act(() => {
    vi.advanceTimersByTime(TUTORIAL_BOT_DELAY_MS + 50);
  });

beforeEach(() => {
  window.localStorage.clear();
  vi.spyOn(Math, 'random').mockImplementation(seededRandom(2026));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('tutorial (partida guiada)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Tutorial' }));
  });

  it('começa sem embaralhar, com o cartão de boas-vindas e o monte parado', () => {
    expect(coachTitle()).toBe('Bem-vindo ao DomiMais');
    expect(within(coach()).getByText(`Passo 1 de ${TUTORIAL_STEPS.length}`)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pular animação' })).not.toBeInTheDocument();
    expect(pileButtons()).toHaveLength(0);
    // No tutorial não há botão de dicas: o cartão já explica tudo.
    expect(screen.queryByRole('button', { name: /as dicas/ })).not.toBeInTheDocument();
  });

  it('em cada passo de ação só a peça pedida pode ser tocada', () => {
    next();
    expect(coachTitle()).toBe('A peça inicial');
    const pile = pileButtons();
    expect(pile).toHaveLength(1);
    expect(pile[0]).toHaveAccessibleName('Peça virada, soma 9');
    expect(within(coach()).queryByRole('button', { name: 'Continuar' })).not.toBeInTheDocument();
  });

  it('percorre o roteiro inteiro: comprar, jogar, passar a vez e blefar', () => {
    next();
    fireEvent.click(pileButtons()[0]); // peça inicial 4|5

    // A Bia compra e joga sozinha; "Continuar" só aparece quando ela termina.
    expect(coachTitle()).toBe('Vez da Bia');
    expect(within(coach()).queryByRole('button', { name: 'Continuar' })).not.toBeInTheDocument();
    letBiaAct();
    letBiaAct();
    expect(coach()).toHaveTextContent('era 4|6');
    next();

    // Compra a peça de soma 11 e joga na ponta direita (a esquerda não é oferecida).
    expect(pileButtons()[0]).toHaveAccessibleName('Peça virada, soma 11');
    fireEvent.click(pileButtons()[0]);
    expect(coachTitle()).toBe('Jogue a peça');
    expect(screen.queryByRole('button', { name: /^(Ficar com a peça|Passar a vez)$/ })).toBeNull();
    const hand = within(screen.getByTestId('hand'));
    const drawn = hand.getByRole('button', { name: 'Peça 5|6' });
    if (drawn.getAttribute('aria-pressed') !== 'true') fireEvent.click(drawn);
    expect(screen.queryByRole('button', { name: 'Jogar na ponta esquerda' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Jogar na ponta direita' }));

    // A Bia compra e fica com a peça.
    letBiaAct();
    letBiaAct();
    expect(coach()).toHaveTextContent('ficou com ela');
    next();

    // Compra que não encaixa: o botão é "Passar a vez".
    fireEvent.click(pileButtons()[0]);
    expect(coachTitle()).toBe('Passar a vez');
    fireEvent.click(screen.getByRole('button', { name: 'Passar a vez' }));

    letBiaAct();
    letBiaAct();
    expect(coach()).toHaveTextContent('6|6');
    next();

    // Compra que encaixa: o botão é "Ficar com a peça" (blefe).
    fireEvent.click(pileButtons()[0]);
    expect(coachTitle()).toBe('O blefe');
    fireEvent.click(screen.getByRole('button', { name: 'Ficar com a peça' }));

    expect(coachTitle()).toBe('Como a partida termina');
    expect(
      within(coach()).getByText(`Passo ${TUTORIAL_STEPS.length} de ${TUTORIAL_STEPS.length}`)
    ).toBeInTheDocument();
    // Parado no fim: a Bia não joga mais nada.
    letBiaAct();
    expect(coachTitle()).toBe('Como a partida termina');
  });

  it('"Sair do tutorial" volta para a tela inicial', () => {
    fireEvent.click(within(coach()).getByRole('button', { name: 'Sair do tutorial' }));
    expect(screen.getByRole('button', { name: 'Tutorial' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Tutorial' })).not.toBeInTheDocument();
  });
});

describe('modo "dica"', () => {
  function startSameDevice() {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Mesmo aparelho/ }));
    ['Ana', 'Beto'].forEach((name, index) => {
      fireEvent.change(screen.getByLabelText(`Nome do Jogador ${index + 1}`), {
        target: { value: name },
      });
    });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar Jogo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pular animação' }));
    fireEvent.click(pileButtons()[0]); // peça inicial
    fireEvent.click(screen.getByRole('button', { name: 'Estou pronto' }));
  }

  it('começa desligado; ligado, mostra o que cada soma pode ser e fica salvo', () => {
    startSameDevice();
    expect(screen.queryByRole('region', { name: 'Dica' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ligar as dicas' }));
    const hint = screen.getByRole('region', { name: 'Dica' });
    expect(hint).toHaveTextContent(/Pontas da mesa: \d e \d/);
    expect(hint).toHaveTextContent(/Soma \d+pode ser \d\|\d/);
    expect(window.localStorage.getItem(HINTS_STORAGE_KEY)).toBe('on');

    fireEvent.click(screen.getByRole('button', { name: 'Desligar as dicas' }));
    expect(screen.queryByRole('region', { name: 'Dica' })).not.toBeInTheDocument();
    expect(window.localStorage.getItem(HINTS_STORAGE_KEY)).toBe('off');
  });

  it('depois da compra, diz quais peças encaixam ou manda passar a vez', () => {
    window.localStorage.setItem(HINTS_STORAGE_KEY, 'on');
    startSameDevice();
    fireEvent.click(pileButtons()[0]);
    const hint = screen.getByRole('region', { name: 'Dica' });
    const canPlay = screen.queryByRole('button', { name: 'Ficar com a peça' }) !== null;
    if (canPlay) {
      expect(hint).toHaveTextContent(/Encaixa: \d\|\d/);
      expect(hint).toHaveTextContent(/Sugestão: jogue \d\|\d na ponta (esquerda|direita)/);
    } else {
      expect(hint).toHaveTextContent('Passe a vez');
    }
  });

  it('some na troca de turno: o próximo jogador não vê a dica do anterior', () => {
    window.localStorage.setItem(HINTS_STORAGE_KEY, 'on');
    startSameDevice();
    fireEvent.click(pileButtons()[0]);
    fireEvent.click(screen.getByRole('button', { name: /^(Ficar com a peça|Passar a vez)$/ }));
    expect(screen.getByRole('button', { name: 'Estou pronto' })).toBeInTheDocument();
    const hint = screen.getByRole('region', { name: 'Dica' });
    expect(hint).toHaveTextContent('As dicas aparecem na sua vez');
    expect(hint).not.toHaveTextContent(/Soma|Encaixa|Sugestão|Passe a vez/);
  });
});
