import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import App from './App';
import { seededRandom } from './game/logic/__tests__/helpers';
import { THEME_STORAGE_KEY } from './theme/theme';
import { SOUND_STORAGE_KEY } from './sound/sound';
import { BOT_DELAY_MS } from './game/ai/useBotTurns';

const FACE_UP = /^Peça \d\|\d$/;
const FACE_DOWN = /^Peça virada, soma \d+$/;
const SAME_DEVICE = /Mesmo aparelho/;
const VS_COMPUTER = /Contra o computador/;
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

/** Inicia uma partida contra o computador, já pulando a animação de embaralhar. */
function startSolo(opponents = 1, level = 'Médio') {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: VS_COMPUTER }));
  fireEvent.change(screen.getByLabelText('Seu nome'), { target: { value: 'Ana' } });
  if (opponents !== 1) {
    fireEvent.click(screen.getByRole('radio', { name: `${opponents} adversários` }));
  }
  fireEvent.click(screen.getByRole('radio', { name: level }));
  fireEvent.click(screen.getByRole('button', { name: 'Jogar' }));
  fireEvent.click(screen.getByRole('button', { name: 'Pular animação' }));
}

/** Avança o relógio para o computador fazer a próxima ação. */
function letComputerAct() {
  act(() => {
    vi.advanceTimersByTime(BOT_DELAY_MS + 50);
  });
}

/** É a vez da pessoa quando ela pode comprar, escolher a peça inicial ou encerrar o turno. */
function isHumanTurn() {
  return (
    pileButtons().length > 0 ||
    screen.queryByRole('button', { name: KEEP }) !== null ||
    screen.queryAllByRole('button', { name: /Jogar na ponta/ }).length > 0 ||
    /Ana, |Monte vazio: Ana/.test(screen.getByRole('status').textContent ?? '')
  );
}

/** Peças do monte em destaque: são as únicas peças viradas que funcionam como botão. */
function pileButtons() {
  return screen.queryAllByRole('button', { name: FACE_DOWN });
}

/** Peças da mão do jogador da vez. */
function handButtons() {
  return within(screen.getByTestId('hand')).queryAllByRole('button', { name: FACE_UP });
}

/**
 * Escolhe a peça inicial. Depois dela a vez passa ao próximo jogador; no mesmo
 * aparelho isso abre a tela de troca de turno, que o teste já confirma.
 */
function chooseInitialPiece() {
  fireEvent.click(pileButtons()[0]);
  const ready = screen.queryByRole('button', { name: 'Estou pronto' });
  if (ready) fireEvent.click(ready);
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
    it('mostra os modos de jogo: "Mesmo aparelho" e "Contra o computador" disponíveis; online em breve', () => {
      render(<App />);
      expect(screen.getByRole('button', { name: SAME_DEVICE })).toBeEnabled();
      expect(screen.getByRole('button', { name: VS_COMPUTER })).toBeEnabled();
      expect(screen.getByText('Online com amigos')).toBeInTheDocument();
      expect(screen.getAllByText('Em breve')).toHaveLength(1);
      expect(screen.queryByRole('button', { name: /Online/ })).toBeNull();
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

    it('quem escolhe a peça inicial não compra em seguida: a vez passa ao outro jogador', () => {
      startMatch();
      const starter = (screen.getByRole('status').textContent ?? '').split(',')[0];
      const other = starter === 'Ana' ? 'Beto' : 'Ana';

      fireEvent.click(pileButtons()[0]);

      // A peça inicial está na mesa e a tela pede para passar o aparelho ao outro jogador.
      expect(screen.getByRole('dialog', { name: `Passe o dispositivo para ${other}` })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Estou pronto' }));
      expect(screen.getByRole('status')).toHaveTextContent(`${other}, compre uma peça do monte`);
      expect(screen.getByRole('region', { name: `Mão de ${other}` })).toHaveTextContent('0 peças');
    });

    it('na compra, a peça aparece aberta e selecionada na mão', () => {
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

  describe('contra o computador', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('a configuração pede o nome, a quantidade de adversários e a dificuldade', () => {
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: VS_COMPUTER }));

      expect(screen.getByRole('button', { name: 'Jogar' })).toBeDisabled();
      expect(screen.getByRole('radio', { name: '1 adversário' })).toBeChecked();
      expect(screen.getByRole('radio', { name: 'Médio' })).toBeChecked();
      expect(screen.getByRole('radio', { name: 'Fácil' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Difícil' })).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText('Seu nome'), { target: { value: 'Ana' } });
      expect(screen.getByRole('button', { name: 'Jogar' })).toBeEnabled();
    });

    it.each([
      [1, 1],
      [2, 2],
      [3, 3],
    ])('com %i adversário(s), a pessoa fica embaixo e os %i do computador em volta da mesa', (opponents, seats) => {
      startSolo(opponents);
      expect(screen.getAllByTestId(/^seat-/)).toHaveLength(seats);
      expect(screen.getAllByRole('img', { name: 'Computador' })).toHaveLength(seats);
      expect(screen.getByRole('region', { name: 'Mão de Ana' })).toBeInTheDocument();
    });

    it('quando a pessoa escolhe a peça inicial, a primeira compra é do computador', () => {
      // Procura uma semente em que a pessoa começa.
      for (let seed = 1; seed <= 30; seed++) {
        vi.spyOn(Math, 'random').mockImplementation(seededRandom(seed));
        startSolo(1, 'Fácil');
        const humanStarts = /Ana, escolha a peça inicial/.test(
          screen.getByRole('status').textContent ?? ''
        );
        if (humanStarts) {
          fireEvent.click(pileButtons()[0]);
          expect(screen.getByRole('status')).toHaveTextContent('Bia está comprando uma peça…');
          expect(pileButtons()).toHaveLength(0);
          expect(screen.getByRole('region', { name: 'Mão de Ana' })).toHaveTextContent('0 peças');
          return;
        }
        cleanup();
      }
      throw new Error('nenhuma semente em que a pessoa começa');
    });

    it('na vez do computador a pessoa não pode agir, e nada revela a peça dele', () => {
      startSolo(1, 'Fácil');

      let checked = 0;
      for (let step = 0; step < 60 && checked < 6; step++) {
        if (screen.queryByRole('dialog', { name: /Fim de jogo|Empate/ })) break;

        if (isHumanTurn()) {
          // A pessoa compra e fica com a peça, só para devolver a vez.
          if (pileButtons().length > 0) fireEvent.click(pileButtons()[0]);
          const keep = screen.queryByRole('button', { name: KEEP });
          if (keep) fireEvent.click(keep);
          continue;
        }

        // Vez do computador.
        expect(screen.getByRole('status')).toHaveTextContent(/Bia está/);
        expect(pileButtons()).toHaveLength(0);
        expect(screen.queryByRole('button', { name: KEEP })).not.toBeInTheDocument();
        expect(screen.queryAllByRole('button', { name: /Jogar na ponta/ })).toHaveLength(0);
        expect(handButtons()).toHaveLength(0);
        // As peças do computador aparecem sempre viradas.
        const seat = screen.getByTestId(/^seat-/);
        expect(within(seat).queryAllByLabelText(FACE_UP)).toHaveLength(0);
        expect(seat).toHaveAttribute('aria-current', 'true');
        // Sem troca de turno protegida neste modo.
        expect(screen.queryByRole('dialog', { name: /Passe o dispositivo/ })).not.toBeInTheDocument();
        checked++;
        letComputerAct();
      }

      expect(checked).toBeGreaterThanOrEqual(6);
    });

    it('mostra a última jogada do computador, sem dizer se a peça encaixava', () => {
      startSolo(1, 'Fácil');

      const seen = new Set<string>();
      for (let step = 0; step < 80 && seen.size < 2; step++) {
        if (screen.queryByRole('dialog', { name: /Fim de jogo|Empate/ })) break;
        const last = screen.queryByText(/^Última jogada:/);
        if (last) {
          const text = last.textContent ?? '';
          expect(text).toMatch(/Bia /);
          expect(text).not.toMatch(/blef|encaix/i);
          if (/ficou com a peça/.test(text)) seen.add('ficou');
          if (/jogou/.test(text)) seen.add('jogou');
        }
        if (isHumanTurn()) {
          if (pileButtons().length > 0) fireEvent.click(pileButtons()[0]);
          const keep = screen.queryByRole('button', { name: KEEP });
          if (keep) fireEvent.click(keep);
        } else {
          letComputerAct();
        }
      }

      expect(seen).toEqual(new Set(['ficou', 'jogou']));
    });

    it('o computador espera enquanto as regras estão abertas', () => {
      startSolo(1, 'Fácil');
      // Garante que é a vez do computador.
      for (let step = 0; step < 6 && isHumanTurn(); step++) {
        if (pileButtons().length > 0) fireEvent.click(pileButtons()[0]);
        const keep = screen.queryByRole('button', { name: KEEP });
        if (keep) fireEvent.click(keep);
      }
      expect(isHumanTurn()).toBe(false);

      fireEvent.click(screen.getByRole('button', { name: 'Como jogar' }));
      const before = screen.getByRole('status').textContent;
      letComputerAct();
      letComputerAct();
      expect(screen.getByRole('status').textContent).toBe(before);

      fireEvent.click(within(screen.getByRole('dialog', { name: 'Como jogar' })).getByRole('button', { name: 'Fechar' }));
      act(() => {
        vi.advanceTimersByTime(BOT_DELAY_MS * 4);
      });
      expect(screen.getByRole('status').textContent).not.toBe(before);
    });

    it.each([
      [1, 'Fácil'],
      [2, 'Médio'],
      [3, 'Difícil'],
    ])('uma partida inteira contra %i computador(es) no nível %s chega ao resultado', (opponents, level) => {
      startSolo(opponents, level);

      const isOver = () => screen.queryByRole('dialog', { name: /Fim de jogo|Empate/ });
      let steps = 0;

      while (!isOver()) {
        expect(++steps).toBeLessThan(600);

        if (!isHumanTurn()) {
          letComputerAct();
          continue;
        }

        const pile = pileButtons();
        if (pile.length > 0) {
          fireEvent.click(pile[0]);
          continue;
        }

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
        if (!played) fireEvent.click(screen.getByRole('button', { name: KEEP }));
      }

      const result = isOver()!;
      expect(result).toHaveTextContent(/Ana: \d+ · Bia: \d+/);
      // Em nenhum momento houve tela de troca de turno.
      expect(screen.queryByRole('dialog', { name: /Passe o dispositivo/ })).not.toBeInTheDocument();
    });
  });
});
