import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import App from './App';
import { seededRandom } from './game/logic/__tests__/helpers';

const FACE_UP = /^Peça \d\|\d$/;
const FACE_DOWN = /^Peça virada, soma \d+$/;

function startMatch(names: string[] = ['Ana', 'Beto']) {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Jogar' }));
  if (names.length !== 2) {
    fireEvent.click(screen.getByRole('radio', { name: `${names.length} jogadores` }));
  }
  names.forEach((name, index) => {
    fireEvent.change(screen.getByLabelText(`Nome do Jogador ${index + 1}`), {
      target: { value: name },
    });
  });
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar Jogo' }));
}

/** Peças do monte: são as únicas peças viradas que funcionam como botão. */
function pileButtons() {
  return screen.queryAllByRole('button', { name: FACE_DOWN });
}

function chooseInitialPiece() {
  fireEvent.click(pileButtons()[0]);
}

describe('App (jogo no mesmo dispositivo)', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockImplementation(seededRandom(2026));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('mostra a tela inicial com as regras e só inicia com os dois nomes', () => {
    render(<App />);
    expect(screen.getByText(/Vence quem ficar sem peças na mão/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Jogar' }));
    expect(screen.getByRole('button', { name: 'Iniciar Jogo' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Nome do Jogador 1'), { target: { value: 'Ana' } });
    expect(screen.getByRole('button', { name: 'Iniciar Jogo' })).toBeDisabled();
  });

  it('começa pela escolha da peça inicial, com as 28 peças no monte', () => {
    startMatch();
    expect(screen.getByRole('status')).toHaveTextContent(/escolha a peça inicial do monte/);
    expect(pileButtons()).toHaveLength(28);
    expect(screen.getByText('28 peças')).toBeInTheDocument();
  });

  it('depois da peça inicial, o mesmo jogador compra uma peça e ela aparece aberta na mão', () => {
    startMatch();
    chooseInitialPiece();

    expect(screen.getByRole('status')).toHaveTextContent(/compre uma peça do monte/);
    expect(pileButtons()).toHaveLength(27);
    expect(screen.queryByRole('button', { name: 'Ficar com a peça' })).not.toBeInTheDocument();

    fireEvent.click(pileButtons()[0]);

    // O monte some até o próximo turno e a peça comprada fica selecionada na mão.
    expect(pileButtons()).toHaveLength(0);
    const handPieces = screen.getAllByRole('button', { name: FACE_UP });
    expect(handPieces).toHaveLength(1);
    expect(handPieces[0]).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('26 peças')).toBeInTheDocument();
  });

  it('o botão "Ficar com a peça" aparece sempre após a compra e nada na tela fala em blefe ou encaixe', () => {
    startMatch();
    chooseInitialPiece();
    fireEvent.click(pileButtons()[0]);

    expect(screen.getByRole('button', { name: 'Ficar com a peça' })).toBeInTheDocument();
    expect(screen.queryByText(/blef/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/não encaixa/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Peça encaixa/i)).not.toBeInTheDocument();
  });

  it('troca de turno protegida: esconde as mãos até o próximo jogador tocar em "Estou pronto"', () => {
    startMatch();
    chooseInitialPiece();
    fireEvent.click(pileButtons()[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Ficar com a peça' }));

    const cover = screen.getByRole('dialog', { name: /Passe o dispositivo para/ });
    expect(cover).toBeInTheDocument();
    // Nenhuma peça de mão aberta e nenhuma ação de jogo disponível durante a troca.
    expect(screen.queryAllByRole('button', { name: FACE_UP })).toHaveLength(0);
    for (const index of [0, 1]) {
      expect(
        within(screen.getByTestId(`player-card-${index}`)).queryAllByLabelText(FACE_UP)
      ).toHaveLength(0);
    }
    expect(pileButtons()).toHaveLength(0);

    fireEvent.click(within(cover).getByRole('button', { name: 'Estou pronto' }));

    expect(screen.queryByRole('dialog', { name: /Passe o dispositivo/ })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/compre uma peça do monte/);
    // A peça que o adversário guardou continua virada, mostrando só a soma.
    expect(screen.getAllByRole('img', { name: FACE_DOWN })).toHaveLength(1);
  });

  it('"Sair" pede confirmação e volta para a tela inicial', () => {
    startMatch();
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sim, Abandonar' }));
    expect(screen.getByRole('button', { name: 'Jogar' })).toBeInTheDocument();
  });

  it('permite escolher 2, 3 ou 4 jogadores e pede um nome para cada um', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Jogar' }));

    expect(screen.getByRole('radio', { name: '2 jogadores' })).toBeChecked();
    expect(screen.queryByLabelText('Nome do Jogador 3')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: '4 jogadores' }));
    expect(screen.getByLabelText('Nome do Jogador 4')).toBeInTheDocument();

    ['Ana', 'Beto', 'Caio'].forEach((name, index) => {
      fireEvent.change(screen.getByLabelText(`Nome do Jogador ${index + 1}`), {
        target: { value: name },
      });
    });
    // Falta o quarto nome.
    expect(screen.getByRole('button', { name: 'Iniciar Jogo' })).toBeDisabled();

    fireEvent.click(screen.getByRole('radio', { name: '3 jogadores' }));
    expect(screen.getByRole('button', { name: 'Iniciar Jogo' })).toBeEnabled();
  });

  it('com 3 jogadores mostra as três mãos e a vez passa de um para o outro', () => {
    startMatch(['Ana', 'Beto', 'Caio']);
    expect(screen.getAllByTestId(/^player-card-/)).toHaveLength(3);
    chooseInitialPiece();

    const seen: string[] = [];
    for (let turn = 0; turn < 3; turn++) {
      fireEvent.click(pileButtons()[0]);
      fireEvent.click(screen.getByRole('button', { name: 'Ficar com a peça' }));
      const cover = screen.getByRole('dialog', { name: /Passe o dispositivo para/ });
      seen.push(cover.textContent ?? '');
      fireEvent.click(screen.getByRole('button', { name: 'Estou pronto' }));
    }

    // Em três trocas de turno, cada um dos três jogadores é chamado uma vez.
    for (const name of ['Ana', 'Beto', 'Caio']) {
      expect(seen.filter((text) => text.includes(`Passe o dispositivo para ${name}`))).toHaveLength(1);
    }
  });

  it.each([
    [['Ana', 'Beto']],
    [['Ana', 'Beto', 'Caio']],
    [['Ana', 'Beto', 'Caio', 'Dani']],
  ])('uma partida inteira jogada pela interface chega ao resultado final (%j)', (names) => {
    startMatch(names);
    chooseInitialPiece();

    const isOver = () => screen.queryByRole('dialog', { name: /Fim de jogo|Empate/ });
    let steps = 0;

    while (!isOver()) {
      expect(++steps).toBeLessThan(400);

      const ready = screen.queryByRole('button', { name: 'Estou pronto' });
      if (ready) {
        fireEvent.click(ready);
        continue;
      }

      const pile = pileButtons();
      if (pile.length > 0) {
        fireEvent.click(pile[0]);
        continue;
      }

      // Tenta jogar alguma peça da mão em uma ponta; se nenhuma encaixa, fica com a peça.
      let played = false;
      for (const handPiece of screen.getAllByRole('button', { name: FACE_UP })) {
        if (handPiece.getAttribute('aria-pressed') !== 'true') fireEvent.click(handPiece);
        const ends = screen.queryAllByRole('button', { name: /Jogar na ponta/ });
        if (ends.length > 0) {
          fireEvent.click(ends[0]);
          played = true;
          break;
        }
      }
      if (!played) {
        fireEvent.click(screen.getByRole('button', { name: 'Ficar com a peça' }));
      }
    }

    const result = isOver()!;
    expect(result).toHaveTextContent(
      new RegExp(names.map((name) => `${name}: \\d+`).join(' · '))
    );
    expect(screen.getByText('0 peças')).toBeInTheDocument();

    fireEvent.click(within(result).getByRole('button', { name: 'Nova partida' }));
    expect(screen.getByRole('button', { name: 'Jogar' })).toBeInTheDocument();
  });
});
