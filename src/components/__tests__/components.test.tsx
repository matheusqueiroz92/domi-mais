import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DominoPiece } from '../DominoPiece';
import { Modal } from '../Modal';
import { TurnTransition } from '../TurnTransition';
import { GameTable } from '../GameTable';
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

  it('clicável: responde a clique, Enter e espaço', () => {
    const onClick = vi.fn();
    render(<DominoPiece piece={piece(1, 1)} isFaceUp onClick={onClick} />);
    const button = screen.getByRole('button', { name: 'Peça 1|1' });
    fireEvent.click(button);
    fireEvent.keyDown(button, { key: 'Enter' });
    fireEvent.keyDown(button, { key: ' ' });
    expect(onClick).toHaveBeenCalledTimes(3);
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
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
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
