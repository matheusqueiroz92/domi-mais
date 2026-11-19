import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import App from './App';
import { BOT_DELAY_MS } from './game/ai/useBotTurns';
import { seededRandom, piece, scenario } from './game/logic/__tests__/helpers';
import { drawPiece } from './game/logic/engine';
import { useGame } from './game/state/use-game';
import type { GameState } from './game/state/game-types';
import { OnlineGameProvider } from './online/OnlineGameProvider';
import type { OnlineRoom } from './online/useOnlineRoom';
import type { RoomView } from './online/protocol';
import { TurnTimer } from './online/TurnTimer';
import * as sound from './sound/sound';

const FACE_DOWN = /^Peça virada, soma \d+$/;
const alert = () => screen.queryByRole('alert');
const isYourTurn = () => document.querySelector('main')?.classList.contains('game--your-turn') ?? false;

function startSolo() {
  render(<App onlineEnabled={false} />);
  fireEvent.click(screen.getByRole('button', { name: /Contra o computador/ }));
  fireEvent.change(screen.getByLabelText('Seu nome'), { target: { value: 'Ana' } });
  fireEvent.click(screen.getByRole('button', { name: 'Jogar' }));
  fireEvent.click(screen.getByRole('button', { name: 'Pular animação' }));
}

/** Avança até ser a vez da pessoa (o computador joga sozinho). */
function untilAnaTurn() {
  for (let i = 0; i < 20 && !isYourTurn(); i++) {
    act(() => {
      vi.advanceTimersByTime(BOT_DELAY_MS + 50);
    });
  }
}

let played: string[];

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers();
  played = [];
  vi.spyOn(sound, 'playSound').mockImplementation((name) => {
    played.push(name);
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.title = 'DomiMais';
});

describe('aviso de "sua vez" (contra o computador)', () => {
  it('na sua vez: faixa "Sua vez!" com o que fazer, área em destaque, som e título da aba', () => {
    vi.spyOn(Math, 'random').mockImplementation(seededRandom(11));
    startSolo();
    untilAnaTurn();

    expect(isYourTurn()).toBe(true);
    const banner = alert();
    expect(banner).toHaveTextContent('Sua vez!');
    expect(banner).toHaveTextContent(/Escolha a peça inicial no monte|Compre uma peça do monte/);
    expect(document.title).toBe('● Sua vez — DomiMais');
    expect(played.filter((name) => name === 'turn')).toHaveLength(1);
  });

  it('fora da sua vez, nada de aviso; ele volta (com som) no próximo turno', () => {
    vi.spyOn(Math, 'random').mockImplementation(seededRandom(11));
    startSolo();
    untilAnaTurn();
    // Ana compra e fica com a peça: a vez passa para o computador.
    if (screen.getByRole('region', { name: 'Monte' })) {
      fireEvent.click(screen.getAllByRole('button', { name: FACE_DOWN })[0]);
    }
    const keep = screen.queryByRole('button', { name: /^(Ficar com a peça|Passar a vez)$/ });
    if (keep) fireEvent.click(keep);
    expect(isYourTurn()).toBe(false);
    expect(alert()).toBeNull();
    expect(document.title).toBe('DomiMais');

    untilAnaTurn();
    expect(isYourTurn()).toBe(true);
    expect(alert()).toHaveTextContent('Sua vez!');
    expect(played.filter((name) => name === 'turn')).toHaveLength(2);
  });

  it('o som segue o botão de som: desligado, não toca', () => {
    window.localStorage.setItem('domimais:sound', 'off');
    vi.spyOn(Math, 'random').mockImplementation(seededRandom(11));
    startSolo();
    untilAnaTurn();
    expect(alert()).toHaveTextContent('Sua vez!');
    expect(played).not.toContain('turn');
  });
});

describe('sem aviso onde ele não faz sentido', () => {
  it('no mesmo aparelho a tela de troca de turno já avisa', () => {
    render(<App onlineEnabled={false} />);
    fireEvent.click(screen.getByRole('button', { name: /Mesmo aparelho/ }));
    fireEvent.change(screen.getByLabelText('Nome do Jogador 1'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText('Nome do Jogador 2'), { target: { value: 'Beto' } });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar Jogo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pular animação' }));
    expect(isYourTurn()).toBe(false);
    expect(screen.queryByText('Sua vez!')).toBeNull();
  });

  it('no tutorial o cartão guia cada passo', () => {
    render(<App onlineEnabled={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tutorial' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.queryByText('Sua vez!')).toBeNull();
  });
});

describe('contagem do tempo: aviso aos 10 segundos', () => {
  it('avisa uma única vez, quando o tempo chega a 10 segundos', () => {
    const onWarning = vi.fn();
    render(<TurnTimer deadline={Date.now() + 15_000} clockOffset={0} label="Seu tempo" onWarning={onWarning} />);
    act(() => {
      vi.advanceTimersByTime(4_000);
    });
    expect(onWarning).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1_300);
    });
    expect(onWarning).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('turn-timer')).toHaveClass('turn-timer--warning');
    act(() => {
      vi.advanceTimersByTime(9_000);
    });
    expect(onWarning).toHaveBeenCalledTimes(1);
  });

  it('se o prazo já começa com menos de 10 segundos (volta de queda), não avisa', () => {
    const onWarning = vi.fn();
    render(<TurnTimer deadline={Date.now() + 6_000} clockOffset={0} label="Seu tempo" onWarning={onWarning} />);
    act(() => {
      vi.advanceTimersByTime(7_000);
    });
    expect(onWarning).not.toHaveBeenCalled();
  });
});

describe('online: a peça comprada já vem selecionada', () => {
  // Pontas 3 e 5; Ana (jogador 0) comprou a 5|6, que encaixa no 5.
  const drawn = drawPiece(scenario({ handA: [piece(1, 1)], handB: [piece(0, 0)], pile: [piece(5, 6)] }), '5-6');

  function fakeOnline(game: GameState, youIndex = 0): OnlineRoom {
    const view = { youIndex, game } as unknown as RoomView;
    return { view, act: vi.fn(() => Promise.resolve(true)) } as unknown as OnlineRoom;
  }

  function Probe() {
    const { state, dispatch } = useGame();
    return (
      <>
        <span data-testid="selected">{state.selectedPieceId ?? 'nenhuma'}</span>
        <button type="button" onClick={() => dispatch({ type: 'SELECT_PIECE', pieceId: '5-6' })}>
          tocar
        </button>
      </>
    );
  }

  const wrap = (online: OnlineRoom, children: ReactNode) => (
    <OnlineGameProvider online={online}>{children}</OnlineGameProvider>
  );

  it('na sua vez, logo depois da compra, a peça comprada está selecionada', () => {
    // O servidor não manda seleção.
    render(wrap(fakeOnline({ ...drawn, selectedPieceId: null }), <Probe />));
    expect(screen.getByTestId('selected')).toHaveTextContent('5-6');
  });

  it('tocar nela de novo tira a seleção, e ela continua sem seleção', () => {
    render(wrap(fakeOnline({ ...drawn, selectedPieceId: null }), <Probe />));
    fireEvent.click(screen.getByRole('button', { name: 'tocar' }));
    expect(screen.getByTestId('selected')).toHaveTextContent('nenhuma');
  });

  it('na vez de outro jogador, nada fica selecionado na sua tela', () => {
    render(wrap(fakeOnline({ ...drawn, selectedPieceId: null }, 1), <Probe />));
    expect(screen.getByTestId('selected')).toHaveTextContent('nenhuma');
  });
});

describe('a peça comprada mostra na hora onde encaixa (na tela)', () => {
  it('contra o computador: depois de comprar, as pontas aparecem sem tocar na mão', () => {
    vi.spyOn(Math, 'random').mockImplementation(seededRandom(11));
    startSolo();
    untilAnaTurn();
    for (let i = 0; i < 12; i++) {
      // Escolhe a peça inicial, se for o caso, e compra.
      const tiles = screen.queryAllByRole('button', { name: FACE_DOWN });
      if (tiles.length === 0) break;
      fireEvent.click(tiles[0]);
      if (!within(screen.getByTestId('hand')).queryAllByRole('button').length) continue;
      const fits = screen.queryAllByRole('button', { name: /^Jogar na ponta/ });
      const drawnButton = within(screen.getByTestId('hand'))
        .getAllByRole('button')
        .find((b) => b.getAttribute('aria-pressed') === 'true');
      if (fits.length > 0) {
        // A peça comprada está selecionada e as pontas já aparecem.
        expect(drawnButton).toBeDefined();
        return;
      }
      const keep = screen.queryByRole('button', { name: /^(Ficar com a peça|Passar a vez)$/ });
      if (keep) fireEvent.click(keep);
      untilAnaTurn();
    }
    throw new Error('nenhuma compra encaixou nas tentativas');
  });
});
