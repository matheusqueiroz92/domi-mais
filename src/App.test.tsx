import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import App from './App';
import { seededRandom } from './game/logic/__tests__/helpers';
import { THEME_STORAGE_KEY } from './theme/theme';
import { SOUND_STORAGE_KEY } from './sound/sound';

const FACE_UP = /^Peça \d\|\d$/;
const FACE_DOWN = /^Peça virada, soma \d+$/;
const SAME_DEVICE = /Mesmo aparelho/;
/** Botão de encerrar o turno sem jogar: o texto depende de alguma peça encaixar. */
const KEEP = /^(Ficar com a peça|Passar a vez)$/;

function startMatch(names: string[] = ['Ana', 'Beto'], skipShuffle = true) {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: SAME_DEVICE }));
  if (names.length !== 2) {
    fireEvent.click(screen.getByRole('radio', { name: `${names.length} jogadores` }));
  }
  names.forEach((name, index) => {
    fireEvent.change(screen.getByLabelText(`Nome do Jogador ${index + 1}`), {
      target: { value: name },
    });
  });
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar Jogo' }));
  // A partida começa com a animação de embaralhar; os testes pulam direto ao jogo.
  if (skipShuffle) fireEvent.click(screen.getByRole('button', { name: 'Pular animação' }));
}

/** Peças do monte em destaque: são as únicas peças viradas que funcionam como botão. */
function pileButtons() {
  return screen.queryAllByRole('button', { name: FACE_DOWN });
}

/** Peças da mão do jogador da vez. */
function handButtons() {
  return within(screen.getByTestId('hand')).queryAllByRole('button', { name: FACE_UP });
}

function chooseInitialPiece() {
  fireEvent.click(pileButtons()[0]);
}

describe('App (jogo no mesmo dispositivo)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.spyOn(Math, 'random').mockImplementation(seededRandom(2026));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('tela inicial', () => {
    it('mostra os modos de jogo: só "Mesmo aparelho" está disponível', () => {
      render(<App />);
      expect(screen.getByRole('button', { name: SAME_DEVICE })).toBeEnabled();
      expect(screen.getByText('Contra o computador')).toBeInTheDocument();
      expect(screen.getByText('Online com amigos')).toBeInTheDocument();
      expect(screen.getAllByText('Em breve')).toHaveLength(2);
      expect(screen.queryByRole('button', { name: /Contra o computador|Online/ })).toBeNull();
    });

    it('"Como jogar" abre as regras', () => {
      render(<App />);
      expect(screen.queryByText(/Vence quem ficar sem peças na mão/)).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Como jogar' }));
      const dialog = screen.getByRole('dialog', { name: 'Como jogar' });
      expect(within(dialog).getByText(/Vence quem ficar sem peças na mão/)).toBeInTheDocument();
      expect(within(dialog).getByText(/O jogo nunca revela o blefe/)).toBeInTheDocument();
    });

    it('só inicia quando todos os nomes estão preenchidos', () => {
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: SAME_DEVICE }));
      expect(screen.getByRole('button', { name: 'Iniciar Jogo' })).toBeDisabled();

      fireEvent.change(screen.getByLabelText('Nome do Jogador 1'), { target: { value: 'Ana' } });
      expect(screen.getByRole('button', { name: 'Iniciar Jogo' })).toBeDisabled();

      fireEvent.change(screen.getByLabelText('Nome do Jogador 2'), { target: { value: '  ' } });
      expect(screen.getByRole('button', { name: 'Iniciar Jogo' })).toBeDisabled();
    });

    it('permite escolher 2, 3 ou 4 jogadores e pede um nome para cada um', () => {
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: SAME_DEVICE }));

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
  });

  describe('tema', () => {
    it('começa no tema escuro e alterna para o claro, salvando a escolha', () => {
      render(<App />);
      expect(document.documentElement.dataset.theme).toBe('dark');

      fireEvent.click(screen.getByRole('button', { name: 'Mudar para o tema claro' }));
      expect(document.documentElement.dataset.theme).toBe('light');
      expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');

      fireEvent.click(screen.getByRole('button', { name: 'Mudar para o tema escuro' }));
      expect(document.documentElement.dataset.theme).toBe('dark');
      expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    });

    it('abre no tema salvo e mantém o botão de tema durante a partida', () => {
      window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
      startMatch();
      expect(document.documentElement.dataset.theme).toBe('light');
      fireEvent.click(screen.getByRole('button', { name: 'Mudar para o tema escuro' }));
      expect(document.documentElement.dataset.theme).toBe('dark');
    });
  });

  describe('som', () => {
    it('começa ligado e pode ser desligado; a escolha fica salva', () => {
      render(<App />);
      const toggle = screen.getByRole('button', { name: 'Desligar o som' });
      expect(toggle).toHaveAttribute('aria-pressed', 'true');

      fireEvent.click(toggle);
      expect(screen.getByRole('button', { name: 'Ligar o som' })).toHaveAttribute('aria-pressed', 'false');
      expect(window.localStorage.getItem(SOUND_STORAGE_KEY)).toBe('off');
    });

    it('abre com o som desligado quando essa foi a última escolha, também na partida', () => {
      window.localStorage.setItem(SOUND_STORAGE_KEY, 'off');
      startMatch();
      expect(screen.getByRole('button', { name: 'Ligar o som' })).toBeInTheDocument();
    });
  });

  describe('embaralhar', () => {
    it('a partida começa misturando as peças; o monte fica vazio e nada é clicável', () => {
      startMatch(['Ana', 'Beto'], false);

      expect(screen.getByRole('status')).toHaveTextContent('Embaralhando as peças…');
      const pile = screen.getByRole('region', { name: 'Monte' });
      expect(pile.querySelectorAll('.pile__slot')).toHaveLength(28);
      expect(within(pile).queryAllByLabelText(FACE_DOWN)).toHaveLength(0);
      expect(pileButtons()).toHaveLength(0);
      expect(screen.queryByTestId('hand')).not.toBeInTheDocument();
      expect(document.querySelectorAll('.game-table__scatter-tile')).toHaveLength(28);
    });

    it('"Pular animação" leva direto à escolha da peça inicial', () => {
      startMatch(['Ana', 'Beto'], false);
      fireEvent.click(screen.getByRole('button', { name: 'Pular animação' }));

      expect(screen.getByRole('status')).toHaveTextContent(/escolha a peça inicial do monte/);
      expect(pileButtons()).toHaveLength(28);
      expect(document.querySelectorAll('.game-table__scatter-tile')).toHaveLength(0);
    });

    it('termina sozinha depois de pouco tempo', () => {
      vi.useFakeTimers();
      try {
        startMatch(['Ana', 'Beto'], false);
        expect(pileButtons()).toHaveLength(0);
        act(() => {
          vi.advanceTimersByTime(2000);
        });
        expect(pileButtons()).toHaveLength(28);
        expect(screen.queryByRole('button', { name: 'Pular animação' })).not.toBeInTheDocument();
      } finally {
        vi.useRealTimers();
      }
    });

    it('não acontece para quem pede menos movimento no sistema', () => {
      vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce') }));
      try {
        startMatch(['Ana', 'Beto'], false);
        expect(screen.queryByRole('button', { name: 'Pular animação' })).not.toBeInTheDocument();
        expect(pileButtons()).toHaveLength(28);
      } finally {
        vi.unstubAllGlobals();
      }
    });
  });

  describe('partida', () => {
    it('começa pela escolha da peça inicial, com as 28 peças no monte', () => {
      startMatch();
      expect(screen.getByRole('status')).toHaveTextContent(/escolha a peça inicial do monte/);
      expect(pileButtons()).toHaveLength(28);
      expect(screen.getByText('Monte · 28 peças')).toBeInTheDocument();
    });

    it('depois da peça inicial, o mesmo jogador compra uma peça e ela aparece aberta na mão', () => {
      startMatch();
      chooseInitialPiece();

      expect(screen.getByRole('status')).toHaveTextContent(/compre uma peça do monte/);
      expect(pileButtons()).toHaveLength(27);
      expect(screen.queryByRole('button', { name: KEEP })).not.toBeInTheDocument();

      fireEvent.click(pileButtons()[0]);

      // O monte deixa de ser clicável e a peça comprada fica selecionada na mão.
      expect(pileButtons()).toHaveLength(0);
      expect(handButtons()).toHaveLength(1);
      expect(handButtons()[0]).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByText('Monte · 26 peças')).toBeInTheDocument();
      expect(screen.getByText(/comprada agora/)).toBeInTheDocument();
    });

    it('fora da compra, o monte mostra só as somas, sem ser clicável, e mantém os 28 lugares', () => {
      startMatch();
      chooseInitialPiece();
      fireEvent.click(pileButtons()[0]);

      const pile = screen.getByRole('region', { name: 'Monte' });
      expect(within(pile).getAllByRole('img', { name: FACE_DOWN })).toHaveLength(26);
      expect(within(pile).queryAllByRole('button', { name: FACE_DOWN })).toHaveLength(0);
      expect(pile.querySelectorAll('.pile__slot')).toHaveLength(28);
    });

    it('após a compra: "Passar a vez" quando nenhuma peça encaixa, "Ficar com a peça" quando alguma encaixa', () => {
      startMatch();
      chooseInitialPiece();

      const seen = new Set<string>();
      for (let turn = 0; turn < 12 && seen.size < 2; turn++) {
        fireEvent.click(pileButtons()[0]);

        // Alguma peça da mão abre um alvo "Jogar" em uma ponta?
        let anyFits = false;
        for (const handPiece of handButtons()) {
          if (handPiece.getAttribute('aria-pressed') !== 'true') fireEvent.click(handPiece);
          if (screen.queryAllByRole('button', { name: /Jogar na ponta/ }).length > 0) anyFits = true;
        }

        const keep = screen.getByRole('button', { name: /^(Ficar com a peça|Passar a vez)$/ });
        if (anyFits) {
          expect(keep).toHaveTextContent('Ficar com a peça');
          expect(screen.getByRole('status')).toHaveTextContent(/jogue uma peça em uma das pontas/);
        } else {
          expect(keep).toHaveTextContent('Passar a vez');
          expect(screen.getByRole('status')).toHaveTextContent(/nenhuma peça da sua mão encaixa/);
        }
        seen.add(keep.textContent ?? '');
        // A palavra "blefe" nunca aparece durante a partida.
        expect(screen.queryByText(/blef/i)).not.toBeInTheDocument();

        fireEvent.click(keep);
        fireEvent.click(screen.getByRole('button', { name: 'Estou pronto' }));
      }

      // Os dois casos aconteceram nesta partida.
      expect(seen).toEqual(new Set(['Ficar com a peça', 'Passar a vez']));
    });

    it('troca de turno protegida: esconde as mãos até o próximo jogador tocar em "Estou pronto"', () => {
      startMatch();
      chooseInitialPiece();
      fireEvent.click(pileButtons()[0]);
      fireEvent.click(screen.getByRole('button', { name: KEEP }));

      const cover = screen.getByRole('dialog', { name: /Passe o dispositivo para/ });
      expect(cover).toBeInTheDocument();
      // Nenhuma mão (própria ou de adversário) e nenhuma ação de jogo durante a troca.
      expect(screen.queryByTestId('hand')).not.toBeInTheDocument();
      expect(screen.queryAllByTestId(/^seat-/)).toHaveLength(0);
      expect(pileButtons()).toHaveLength(0);
      expect(screen.queryByRole('button', { name: KEEP })).not.toBeInTheDocument();

      fireEvent.click(within(cover).getByRole('button', { name: 'Estou pronto' }));

      expect(screen.queryByRole('dialog', { name: /Passe o dispositivo/ })).not.toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent(/compre uma peça do monte/);
      // A peça que o adversário guardou aparece virada, mostrando só a soma.
      const seat = screen.getByTestId(/^seat-/);
      expect(within(seat).getAllByRole('img', { name: FACE_DOWN })).toHaveLength(1);
      expect(within(seat).queryAllByLabelText(FACE_UP)).toHaveLength(0);
      expect(seat).toHaveTextContent('1 peça');
    });

    it('"Sair da partida" pede confirmação e volta para a tela inicial', () => {
      startMatch();
      fireEvent.click(screen.getByRole('button', { name: 'Sair da partida' }));
      expect(screen.getByRole('dialog', { name: 'Sair da partida?' })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Continuar jogando' }));
      expect(screen.getByRole('status')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Sair da partida' }));
      fireEvent.click(screen.getByRole('button', { name: 'Sim, sair' }));
      expect(screen.getByRole('button', { name: SAME_DEVICE })).toBeInTheDocument();
    });

    it('as regras podem ser abertas durante a partida', () => {
      startMatch();
      fireEvent.click(screen.getByRole('button', { name: 'Como jogar' }));
      expect(screen.getByRole('dialog', { name: 'Como jogar' })).toBeInTheDocument();
    });

    it.each([
      [2, 1],
      [3, 2],
      [4, 3],
    ])('com %i jogadores, %i adversários ficam em volta da mesa', (count, opponents) => {
      startMatch(['Ana', 'Beto', 'Caio', 'Dani'].slice(0, count));
      expect(screen.getAllByTestId(/^seat-/)).toHaveLength(opponents);
      expect(screen.getByTestId('hand')).toBeInTheDocument();
    });

    it('com 3 jogadores a vez passa de um para o outro', () => {
      startMatch(['Ana', 'Beto', 'Caio']);
      chooseInitialPiece();

      const seen: string[] = [];
      for (let turn = 0; turn < 3; turn++) {
        fireEvent.click(pileButtons()[0]);
        fireEvent.click(screen.getByRole('button', { name: KEEP }));
        const cover = screen.getByRole('dialog', { name: /Passe o dispositivo para/ });
        seen.push(cover.textContent ?? '');
        fireEvent.click(screen.getByRole('button', { name: 'Estou pronto' }));
      }

      // Em três trocas de turno, cada um dos três jogadores é chamado uma vez.
      for (const name of ['Ana', 'Beto', 'Caio']) {
        expect(
          seen.filter((text) => text.includes(`Passe o dispositivo para ${name}`))
        ).toHaveLength(1);
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
        for (const handPiece of handButtons()) {
          if (handPiece.getAttribute('aria-pressed') !== 'true') fireEvent.click(handPiece);
          const ends = screen.queryAllByRole('button', { name: /Jogar na ponta/ });
          if (ends.length > 0) {
            fireEvent.click(ends[0]);
            played = true;
            break;
          }
        }
        if (!played) {
          fireEvent.click(screen.getByRole('button', { name: KEEP }));
        }
      }

      const result = isOver()!;
      expect(result).toHaveTextContent(
        new RegExp(names.map((name) => `${name}: \\d+`).join(' · '))
      );
      expect(screen.queryByRole('region', { name: 'Monte' })).not.toBeInTheDocument();

      // Depois do fim, todas as mãos ficam abertas no painel de resultado.
      fireEvent.click(within(result).getByRole('button', { name: 'Ver a mesa' }));
      const final = screen.getByRole('region', { name: 'Resultado' });
      names.forEach((name, index) => {
        expect(within(final).getByTestId(`final-${index}`)).toHaveTextContent(name);
      });
      expect(within(final).queryAllByLabelText(FACE_DOWN)).toHaveLength(0);
      expect(within(final).getAllByText(/Venceu|Empatou/).length).toBeGreaterThan(0);

      fireEvent.click(within(final).getByRole('button', { name: 'Nova partida' }));
      expect(screen.getByRole('button', { name: SAME_DEVICE })).toBeInTheDocument();
    });
  });
});
