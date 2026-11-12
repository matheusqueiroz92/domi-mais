import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DominoPiece } from '../DominoPiece';
import { Modal } from '../Modal';
import { TurnTransition } from '../TurnTransition';
import { GameTable } from '../GameTable';
import { DrawPile } from '../DrawPile';
import { SoundToggle } from '../SoundToggle';
import { createScatter } from '../table-layout';
import { generateDominoPieces } from '../../game/logic/pieces';
import { piece, tableWith } from '../../game/logic/__tests__/helpers';

describe('DominoPiece', () => {
  it('virada, mostra só a soma no verso', () => {
    const { container } = render(<DominoPiece piece={piece(2, 5)} isFaceUp={false} />);
    expect(screen.getByLabelText('Peça virada, soma 7')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(container.querySelectorAll('.domino-piece__pip')).toHaveLength(0);
  });

  it('aberta, mostra os pontos dos dois lados e não mostra a soma', () => {
    const { container } = render(<DominoPiece piece={piece(2, 5)} isFaceUp />);
    expect(screen.getByLabelText('Peça 2|5')).toBeInTheDocument();
    expect(container.querySelectorAll('.domino-piece__pip')).toHaveLength(7);
    expect(screen.queryByText('7')).not.toBeInTheDocument();
  });

  it('clicável: é um botão de verdade (o teclado funciona pelo próprio navegador)', () => {
    const onClick = vi.fn();
    render(<DominoPiece piece={piece(1, 1)} isFaceUp onClick={onClick} />);
    const button = screen.getByRole('button', { name: 'Peça 1|1' });
    expect(button.tagName).toBe('BUTTON');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('selecionada, informa o estado para leitores de tela', () => {
    render(<DominoPiece piece={piece(1, 1)} isFaceUp isSelected onClick={() => {}} />);
    expect(screen.getByRole('button', { name: 'Peça 1|1' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('invertida, troca os lados no desenho', () => {
    const { container } = render(<DominoPiece piece={piece(0, 3)} isFaceUp flipped />);
    const halves = container.querySelectorAll('.domino-piece__half');
    expect(halves[0].querySelectorAll('.domino-piece__pip')).toHaveLength(3);
    expect(halves[1].querySelectorAll('.domino-piece__pip')).toHaveLength(0);
  });

  it('sem onClick não é um botão', () => {
    render(<DominoPiece piece={piece(1, 1)} isFaceUp />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('GameTable', () => {
  it('só oferece as pontas em que a peça selecionada encaixa', () => {
    const onPlayPiece = vi.fn();
    render(<GameTable table={tableWith(3, 5)} canFitLeft onPlayPiece={onPlayPiece} />);

    fireEvent.click(screen.getByRole('button', { name: 'Jogar na ponta esquerda' }));
    expect(onPlayPiece).toHaveBeenCalledWith('left');
    expect(screen.queryByRole('button', { name: 'Jogar na ponta direita' })).not.toBeInTheDocument();
  });

  it('mostra os valores das pontas', () => {
    render(<GameTable table={tableWith(3, 5)} />);
    expect(screen.getByText('Pontas da mesa: 3 e 5')).toBeInTheDocument();
  });

  it('durante o embaralhar, mostra as peças viradas espalhadas sobre a mesa', () => {
    const pieces = [piece(1, 2), piece(0, 0), piece(6, 6)];
    const { container } = render(
      <GameTable
        table={{ leftEnd: null, rightEnd: null, pieces: [] }}
        shuffle={{ pieces, paths: createScatter(3, () => 0.5) }}
      />
    );
    expect(screen.getByText('Embaralhando as peças…')).toBeInTheDocument();
    expect(container.querySelectorAll('.game-table__scatter-tile')).toHaveLength(3);
    expect(screen.queryByText('Nenhuma peça na mesa ainda')).not.toBeInTheDocument();
  });

  it('com a mesa vazia não oferece pontas para jogar', () => {
    render(
      <GameTable table={{ leftEnd: null, rightEnd: null, pieces: [] }} canFitLeft canFitRight />
    );
    expect(screen.getByText('Nenhuma peça na mesa ainda')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Jogar na ponta/ })).not.toBeInTheDocument();
  });
});

describe('DrawPile (monte)', () => {
  const all = generateDominoPieces();
  const order = all.map((p) => p.id);

  it('tem sempre 28 lugares, em duas fileiras de 14', () => {
    const { container } = render(<DrawPile order={order} pieces={all} />);
    expect(container.querySelectorAll('.pile__slot')).toHaveLength(28);
    expect(screen.getByText('Monte · 28 peças')).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: /^Peça virada, soma \d+$/ })).toHaveLength(28);
  });

  it('a peça comprada deixa o lugar vazio, sem mover as outras', () => {
    const remaining = all.filter((p) => p.id !== order[3]);
    const { container } = render(<DrawPile order={order} pieces={remaining} />);
    const slots = container.querySelectorAll('.pile__slot');
    expect(slots).toHaveLength(28);
    expect(slots[3].children).toHaveLength(0);
    expect(slots[2].children).toHaveLength(1);
    expect(slots[4].children).toHaveLength(1);
    expect(screen.getByText('Monte · 27 peças')).toBeInTheDocument();
  });

  it('parado, as peças não são clicáveis', () => {
    render(<DrawPile order={order} pieces={all} mode="idle" onSelectPiece={() => {}} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it.each([
    ['draw', 'Toque em uma peça para comprar'],
    ['choose-initial', 'Toque na peça inicial da mesa'],
  ] as const)('no modo %s as peças são botões e avisam qual foi escolhida', (mode, hint) => {
    const onSelectPiece = vi.fn();
    render(<DrawPile order={order} pieces={all} mode={mode} onSelectPiece={onSelectPiece} />);
    expect(screen.getByText(hint)).toBeInTheDocument();
    const buttons = screen.getAllByRole('button', { name: /^Peça virada, soma/ });
    expect(buttons).toHaveLength(28);
    fireEvent.click(buttons[5]);
    expect(onSelectPiece).toHaveBeenCalledWith(order[5]);
  });

  it('durante o embaralhar mostra só os lugares vazios', () => {
    const { container } = render(<DrawPile order={order} pieces={all} mode="draw" hideTiles />);
    expect(container.querySelectorAll('.pile__slot')).toHaveLength(28);
    expect(screen.queryAllByLabelText(/^Peça virada/)).toHaveLength(0);
  });
});

describe('SoundToggle', () => {
  it('mostra o estado e avisa ao ser clicado', () => {
    const onToggle = vi.fn();
    const { rerender } = render(<SoundToggle soundOn onToggle={onToggle} />);
    const on = screen.getByRole('button', { name: 'Desligar o som' });
    expect(on).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(on);
    expect(onToggle).toHaveBeenCalledOnce();

    rerender(<SoundToggle soundOn={false} onToggle={onToggle} />);
    expect(screen.getByRole('button', { name: 'Ligar o som' })).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('TurnTransition', () => {
  it('mostra o nome do próximo jogador e chama onReady', () => {
    const onReady = vi.fn();
    render(<TurnTransition playerName="Beto" onReady={onReady} />);
    expect(screen.getByRole('dialog', { name: 'Passe o dispositivo para Beto' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Estou pronto' }));
    expect(onReady).toHaveBeenCalledOnce();
  });
});

describe('Modal', () => {
  it('fecha ao clicar fora, mas não ao clicar no conteúdo', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal isOpen onClose={onClose} title="Aviso">
        <p>Conteúdo</p>
      </Modal>
    );

    fireEvent.click(screen.getByText('Conteúdo'));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(container.querySelector('.modal-overlay')!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('não renderiza nada quando fechado', () => {
    render(
      <Modal isOpen={false} title="Aviso">
        <p>Conteúdo</p>
      </Modal>
    );
    expect(screen.queryByText('Conteúdo')).not.toBeInTheDocument();
  });
});
