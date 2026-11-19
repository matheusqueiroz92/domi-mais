import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { io as connect } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import App from './App';
import { createDomiMaisServer } from '../server/src/socket-server';
import type { DomiMaisServer } from '../server/src/socket-server';
import { SOCKET_PATH } from './online/protocol';
import type { Ack, ClientToServerEvents, RoomView, ServerToClientEvents, Session } from './online/protocol';
import { ONLINE_NAME_KEY, ONLINE_SESSION_KEY } from './online/useOnlineRoom';
import { simulatedHumanAction } from '../server/src/__tests__/test-utils';
import { seededRandom } from './game/logic/__tests__/helpers';

/**
 * Modo online na tela, com o servidor de verdade rodando no próprio teste.
 * O outro jogador é um cliente Socket.IO direto (como outro aparelho).
 */

type Client = Socket<ServerToClientEvents, ClientToServerEvents>;

let server: DomiMaisServer;
let url: string;
const others: Client[] = [];

beforeEach(async () => {
  window.localStorage.clear();
  const http = createServer();
  server = createDomiMaisServer(http, { botDelayMs: 5 });
  await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
});

afterEach(async () => {
  for (const client of others.splice(0)) client.disconnect();
  await server.close();
});

/** Outro jogador, em "outro aparelho". */
function otherPlayer() {
  const socket: Client = connect(url, { path: SOCKET_PATH, transports: ['websocket'], forceNew: true });
  others.push(socket);
  const state = { view: null as RoomView | null };
  socket.on('room:state', (view) => {
    state.view = view;
  });
  const ask = <T extends object = object>(event: keyof ClientToServerEvents, payload?: unknown) =>
    new Promise<Ack<T>>((resolve) => {
      const emit = socket.emit as unknown as (...args: unknown[]) => void;
      if (payload === undefined) emit.call(socket, event, resolve);
      else emit.call(socket, event, payload, resolve);
    });
  return { socket, state, ask };
}

const roomCode = () => server.manager.rooms.keys().next().value as string;

/** Abre o jogo e cria uma sala pela tela. */
async function createRoomOnScreen(name = 'Ana') {
  const rendered = render(<App onlineUrl={url} />);
  fireEvent.click(screen.getByRole('button', { name: /Online com amigos/ }));
  const dialog = screen.getByRole('dialog', { name: 'Jogar online' });
  fireEvent.change(within(dialog).getByLabelText('Seu nome'), { target: { value: name } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Criar uma sala' }));
  await screen.findByRole('region', { name: 'Sala de espera' }, { timeout: 4000 });
  return rendered;
}

describe('modo online na tela', () => {
  it('criar sala mostra o código, o link e os lugares; o nome fica lembrado', async () => {
    await createRoomOnScreen('Ana');
    const code = roomCode();
    expect(screen.getByText(code)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copiar link' })).toBeInTheDocument();
    const seats = screen.getAllByTestId('lobby-seat');
    expect(seats).toHaveLength(1);
    expect(seats[0]).toHaveTextContent('Ana');
    expect(seats[0]).toHaveTextContent('Você');
    expect(seats[0]).toHaveTextContent('Dono da sala');
    expect(screen.getAllByText('Vaga livre')).toHaveLength(3);
    // Sozinho não dá para começar.
    expect(screen.getByRole('button', { name: 'Começar partida' })).toBeDisabled();
    expect(window.localStorage.getItem(ONLINE_NAME_KEY)).toBe('Ana');
    expect(JSON.parse(window.localStorage.getItem(ONLINE_SESSION_KEY)!).code).toBe(code);
  });

  it('quem entra pelo código aparece na sala de espera de quem criou', async () => {
    await createRoomOnScreen('Ana');
    const beto = otherPlayer();
    expect((await beto.ask('room:join', { code: roomCode(), name: 'Beto' })).ok).toBe(true);
    await waitFor(() => expect(screen.getAllByTestId('lobby-seat')).toHaveLength(2));
    expect(screen.getAllByTestId('lobby-seat')[1]).toHaveTextContent('Beto');
    expect(screen.getByRole('button', { name: 'Começar partida' })).toBeEnabled();
  });

  it('entrar pela tela com o código de outra pessoa', async () => {
    const bia = otherPlayer();
    const created = await bia.ask<{ session: Session }>('room:create', { name: 'Bia' });
    if (!created.ok) throw new Error(created.error);

    render(<App onlineUrl={url} />);
    fireEvent.click(screen.getByRole('button', { name: /Online com amigos/ }));
    const dialog = screen.getByRole('dialog', { name: 'Jogar online' });
    fireEvent.change(within(dialog).getByLabelText('Seu nome'), { target: { value: 'Caio' } });
    fireEvent.change(within(dialog).getByLabelText('Código da sala'), {
      target: { value: created.session.code.toLowerCase() },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Entrar na sala' }));
    await screen.findByRole('region', { name: 'Sala de espera' }, { timeout: 4000 });
    expect(screen.getByText('Aguardando Bia começar a partida…')).toBeInTheDocument();
    // Quem não é dono não começa nem tira ninguém.
    expect(screen.queryByRole('button', { name: 'Começar partida' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Tirar/ })).not.toBeInTheDocument();
  });

  it('código errado mostra o erro na própria janela', async () => {
    render(<App onlineUrl={url} />);
    fireEvent.click(screen.getByRole('button', { name: /Online com amigos/ }));
    const dialog = screen.getByRole('dialog', { name: 'Jogar online' });
    fireEvent.change(within(dialog).getByLabelText('Seu nome'), { target: { value: 'Caio' } });
    fireEvent.change(within(dialog).getByLabelText('Código da sala'), { target: { value: 'ZZZZZ' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Entrar na sala' }));
    expect(await within(dialog).findByRole('alert', {}, { timeout: 4000 })).toHaveTextContent(
      'Sala não encontrada. Confira o código.'
    );
  });

  it('o link de convite abre a entrada com o código preenchido', async () => {
    window.history.replaceState(null, '', '/?sala=k7m2q');
    render(<App onlineUrl={url} />);
    const dialog = screen.getByRole('dialog', { name: 'Jogar online' });
    expect(within(dialog).getByLabelText('Código da sala')).toHaveValue('K7M2Q');
    // O endereço volta a ser o normal.
    expect(window.location.search).toBe('');
  });

  it('o dono completa com o computador, começa, e a partida online vai até o fim', async () => {
    vi.spyOn(Math, 'random').mockImplementation(seededRandom(5));
    await createRoomOnScreen('Ana');
    fireEvent.click(screen.getByRole('radio', { name: 'Difícil' }));
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar computador' }));
    await waitFor(() => expect(screen.getAllByTestId('lobby-seat')).toHaveLength(2));
    expect(screen.getAllByTestId('lobby-seat')[1]).toHaveTextContent('Computador · Difícil');

    fireEvent.click(screen.getByRole('button', { name: 'Começar partida' }));
    // A partida abre com a mistura das peças.
    fireEvent.click(await screen.findByRole('button', { name: 'Pular animação' }, { timeout: 4000 }));
    expect(screen.getByTestId('seat-1')).toHaveTextContent('Bia');

    // Joga pela tela até o fim, usando a mesma tática das pessoas simuladas.
    const room = server.manager.get(roomCode())!;
    const seatId = room.seats[0].id;
    const rng = seededRandom(3);
    for (let step = 0; step < 400 && room.status === 'playing'; step++) {
      const view = room.viewFor(seatId)!;
      if (view.status !== 'playing') break;
      if (view.game!.currentPlayerIndex !== 0) {
        await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
        continue;
      }
      await waitFor(() => expect(screen.getByTestId('turn-timer')).toHaveTextContent('Seu tempo'));
      const action = simulatedHumanAction(view, rng)!;
      if (action.type === 'CHOOSE_INITIAL_PIECE' || action.type === 'DRAW_PIECE') {
        // Na tela as peças do monte só mostram a soma: toca uma com a soma escolhida.
        const sum = view.game!.drawPile.find((p) => p.id === action.pieceId)!.sum;
        fireEvent.click(screen.getAllByRole('button', { name: `Peça virada, soma ${sum}` })[0]);
      } else if (action.type === 'PLAY_PIECE') {
        const piece = view.game!.players[0].hand.find((p) => p.id === action.pieceId)!;
        const button = within(screen.getByTestId('hand')).getByRole('button', { name: `Peça ${piece.left}|${piece.right}` });
        if (button.getAttribute('aria-pressed') !== 'true') fireEvent.click(button);
        fireEvent.click(
          await screen.findByRole('button', {
            name: action.position === 'left' ? 'Jogar na ponta esquerda' : 'Jogar na ponta direita',
          })
        );
      } else {
        fireEvent.click(screen.getByRole('button', { name: /^(Ficar com a peça|Passar a vez)$/ }));
      }
      // Espera o servidor aceitar a jogada e a tela receber o estado novo.
      await waitFor(() => expect(room.viewFor(seatId)!.game).not.toEqual(view.game), { timeout: 2000 });
      await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
    }

    expect(room.status).toBe('finished');
    const dialog = await screen.findByRole('dialog', {}, { timeout: 4000 });
    expect(within(dialog).getByRole('button', { name: 'Jogar de novo' })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Jogar de novo' }));
    await screen.findByRole('region', { name: 'Sala de espera' }, { timeout: 4000 });
  }, 60_000);

  it('quem não é o dono vê o tempo do outro, o aviso de queda e espera no fim', async () => {
    vi.spyOn(Math, 'random').mockImplementation(seededRandom(8));
    const bia = otherPlayer();
    const created = await bia.ask<{ session: Session }>('room:create', { name: 'Bia' });
    if (!created.ok) throw new Error(created.error);

    render(<App onlineUrl={url} />);
    fireEvent.click(screen.getByRole('button', { name: /Online com amigos/ }));
    const dialog = screen.getByRole('dialog', { name: 'Jogar online' });
    fireEvent.change(within(dialog).getByLabelText('Seu nome'), { target: { value: 'Caio' } });
    fireEvent.change(within(dialog).getByLabelText('Código da sala'), { target: { value: created.session.code } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Entrar na sala' }));
    await screen.findByRole('region', { name: 'Sala de espera' }, { timeout: 4000 });

    expect((await bia.ask('room:start')).ok).toBe(true);
    fireEvent.click(await screen.findByRole('button', { name: 'Pular animação' }, { timeout: 4000 }));
    const room = server.manager.get(created.session.code)!;
    const biaPlays = room.game!.currentPlayerIndex === 0;
    if (biaPlays) {
      expect(await screen.findByTestId('turn-timer')).toHaveTextContent('Tempo de Bia');
    }

    // Bia cai: o assento dela mostra "Sem conexão".
    bia.socket.disconnect();
    await waitFor(() => expect(screen.getByTestId('seat-0')).toHaveTextContent('Sem conexão'), { timeout: 4000 });
  });

  it('recarregar a página: a tela inicial oferece voltar para a sala, no mesmo lugar', async () => {
    const first = await createRoomOnScreen('Ana');
    const code = roomCode();
    // "Fecha" a página: desmonta tudo (a conexão cai).
    first.unmount();

    render(<App onlineUrl={url} />);
    const card = screen.getByRole('region', { name: 'Sala online' });
    expect(card).toHaveTextContent(`Sala online ${code}`);
    fireEvent.click(within(card).getByRole('button', { name: 'Voltar' }));
    await screen.findByRole('region', { name: 'Sala de espera' }, { timeout: 4000 });
    expect(screen.getAllByTestId('lobby-seat')[0]).toHaveTextContent('Você');
  });

  it('quem é tirado da sala volta para a tela inicial com o aviso', async () => {
    const bia = otherPlayer();
    const created = await bia.ask<{ session: Session }>('room:create', { name: 'Bia' });
    if (!created.ok) throw new Error(created.error);
    render(<App onlineUrl={url} />);
    fireEvent.click(screen.getByRole('button', { name: /Online com amigos/ }));
    const dialog = screen.getByRole('dialog', { name: 'Jogar online' });
    fireEvent.change(within(dialog).getByLabelText('Seu nome'), { target: { value: 'Caio' } });
    fireEvent.change(within(dialog).getByLabelText('Código da sala'), { target: { value: created.session.code } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Entrar na sala' }));
    await screen.findByRole('region', { name: 'Sala de espera' }, { timeout: 4000 });

    await waitFor(() => expect(bia.state.view?.seats).toHaveLength(2));
    expect((await bia.ask('room:remove-seat', { seatId: bia.state.view!.seats[1].id })).ok).toBe(true);
    const notice = await screen.findByRole('dialog', { name: 'Você saiu da sala' }, { timeout: 4000 });
    expect(notice).toHaveTextContent('Quem criou a sala tirou você dela.');
    expect(window.localStorage.getItem(ONLINE_SESSION_KEY)).toBeNull();
  });

  it('conexão caída: aparece o aviso no alto da tela', async () => {
    await createRoomOnScreen('Ana');
    expect(screen.queryByText(/Sem conexão/)).not.toBeInTheDocument();
    server.io.disconnectSockets(true);
    expect(await screen.findByText(/Sem conexão\. Tentando reconectar/, {}, { timeout: 4000 })).toBeInTheDocument();
  });

  it('sair da sala de espera volta para a tela inicial e esquece a sala', async () => {
    await createRoomOnScreen('Ana');
    fireEvent.click(screen.getByRole('button', { name: 'Sair da sala' }));
    expect(await screen.findByRole('button', { name: /Online com amigos/ }, { timeout: 4000 })).toBeInTheDocument();
    expect(window.localStorage.getItem(ONLINE_SESSION_KEY)).toBeNull();
    await waitFor(() => expect(server.manager.rooms.size).toBe(0));
  });
});
