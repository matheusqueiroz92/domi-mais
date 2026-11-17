import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import App from './App';
import { seededRandom } from './game/logic/__tests__/helpers';
import { SAVE_KEY } from './game/state/saved-game';

const FACE_DOWN = /^Peça virada, soma \d+$/;
const KEEP = /^(Ficar com a peça|Passar a vez)$/;
const pileButtons = () => screen.queryAllByRole('button', { name: FACE_DOWN });
const resumeCard = () => screen.queryByRole('region', { name: 'Partida em andamento' });
const saved = () => window.localStorage.getItem(SAVE_KEY);

function startSameDevice() {
  fireEvent.click(screen.getByRole('button', { name: /Mesmo aparelho/ }));
  ['Ana', 'Beto'].forEach((name, index) => {
    fireEvent.change(screen.getByLabelText(`Nome do Jogador ${index + 1}`), {
      target: { value: name },
    });
  });
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar Jogo' }));
  fireEvent.click(screen.getByRole('button', { name: 'Pular animação' }));
}

/** Joga até o segundo jogador ter comprado uma peça (falta jogar ou ficar). */
function playUntilDrawn() {
  fireEvent.click(pileButtons()[0]); // peça inicial
  fireEvent.click(screen.getByRole('button', { name: 'Estou pronto' }));
  fireEvent.click(pileButtons()[0]); // compra
}

beforeEach(() => {
  window.localStorage.clear();
  vi.spyOn(Math, 'random').mockImplementation(seededRandom(99));
});

describe('partida salva no aparelho', () => {
  it('sem partida guardada, a tela inicial não oferece continuar', () => {
    render(<App />);
    expect(resumeCard()).not.toBeInTheDocument();
  });

  it('a partida é guardada a cada jogada', () => {
    render(<App />);
    startSameDevice();
    expect(JSON.parse(saved()!).state.phase).toBe('choosing-initial');
    playUntilDrawn();
    const state = JSON.parse(saved()!).state;
    expect(state.phase).toBe('playing');
    expect(state.drawPile).toHaveLength(26);
    expect(state.drawnPieceId).not.toBeNull();
  });

  it('fechar e reabrir: "Continuar" retoma na troca de turno, do ponto em que parou', () => {
    const first = render(<App />);
    startSameDevice();
    playUntilDrawn();
    const handBefore = within(screen.getByTestId('hand'))
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label'));
    first.unmount(); // fecha a página

    render(<App />);
    const card = resumeCard()!;
    expect(card).toHaveTextContent('Ana, Beto');
    expect(card).toHaveTextContent('26 peças no monte');

    fireEvent.click(within(card).getByRole('button', { name: 'Continuar' }));
    // Sem embaralhar de novo e sem mostrar a mão antes de o jogador confirmar.
    expect(screen.queryByRole('button', { name: 'Pular animação' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('hand')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Estou pronto' }));

    const handAfter = within(screen.getByTestId('hand'))
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label'));
    expect(handAfter).toEqual(handBefore);
    // A peça já estava comprada: não há nova compra, só jogar ou ficar.
    expect(pileButtons()).toHaveLength(0);
    expect(screen.getByRole('button', { name: KEEP })).toBeInTheDocument();
  });

  it('"Descartar" apaga a partida guardada', () => {
    const first = render(<App />);
    startSameDevice();
    first.unmount();

    render(<App />);
    fireEvent.click(within(resumeCard()!).getByRole('button', { name: 'Descartar' }));
    expect(resumeCard()).not.toBeInTheDocument();
    expect(saved()).toBeNull();
  });

  it('sair da partida pelo botão descarta a partida guardada', () => {
    render(<App />);
    startSameDevice();
    expect(saved()).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Sair da partida' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sim, sair' }));
    expect(saved()).toBeNull();
    expect(resumeCard()).not.toBeInTheDocument();
  });

  it('o tutorial não é guardado nem apaga uma partida guardada', () => {
    const first = render(<App />);
    startSameDevice();
    const before = saved();
    first.unmount();

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Tutorial' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    fireEvent.click(pileButtons()[0]); // peça inicial do tutorial
    expect(saved()).toBe(before);
    fireEvent.click(screen.getByRole('button', { name: 'Sair do tutorial' }));
    expect(saved()).toBe(before);
    expect(resumeCard()).toBeInTheDocument();
  });

  it('partida guardada corrompida é ignorada e apagada', () => {
    window.localStorage.setItem(SAVE_KEY, '{"version":1,"state":{"phase":"playing"}}');
    render(<App />);
    expect(resumeCard()).not.toBeInTheDocument();
    expect(saved()).toBeNull();
  });

  it('contra o computador: retoma direto na partida', () => {
    const first = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Contra o computador/ }));
    fireEvent.change(screen.getByLabelText('Seu nome'), { target: { value: 'Ana' } });
    fireEvent.click(screen.getByRole('button', { name: 'Jogar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pular animação' }));
    expect(saved()).not.toBeNull();
    first.unmount();

    render(<App />);
    expect(resumeCard()).toHaveTextContent('Ana, Bia');
    fireEvent.click(within(resumeCard()!).getByRole('button', { name: 'Continuar' }));
    expect(screen.queryByRole('button', { name: 'Estou pronto' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sair da partida' })).toBeInTheDocument();
  });
});
