import { describe, expect, it } from 'vitest';
import {
  computeResult,
  fitsSide,
  getPlayableSides,
  hasPlayablePiece,
  isBlocked,
  orientPieceForSide,
  pieceFits,
  placePiece,
} from '../rules';
import { piece, scenario, tableWith } from './helpers';

const emptyTable = { leftEnd: null, rightEnd: null, pieces: [] };

describe('encaixe', () => {
  const table = tableWith(3, 5);

  it('a peça encaixa na ponta quando um dos lados é igual ao valor da ponta', () => {
    expect(fitsSide(piece(3, 6), 'left', table)).toBe(true);
    expect(fitsSide(piece(6, 3), 'left', table)).toBe(true);
    expect(fitsSide(piece(3, 6), 'right', table)).toBe(false);
    expect(fitsSide(piece(5, 0), 'right', table)).toBe(true);
  });

  it('informa em quais pontas a peça encaixa', () => {
    expect(getPlayableSides(piece(3, 5), table)).toEqual({ left: true, right: true });
    expect(getPlayableSides(piece(3, 3), table)).toEqual({ left: true, right: false });
    expect(getPlayableSides(piece(1, 2), table)).toEqual({ left: false, right: false });
  });

  it('pieceFits e hasPlayablePiece', () => {
    expect(pieceFits(piece(0, 5), table)).toBe(true);
    expect(pieceFits(piece(0, 1), table)).toBe(false);
    expect(hasPlayablePiece([piece(0, 1), piece(2, 2)], table)).toBe(false);
    expect(hasPlayablePiece([piece(0, 1), piece(2, 3)], table)).toBe(true);
    expect(hasPlayablePiece([], table)).toBe(false);
  });

  it('com a mesa vazia qualquer peça encaixa', () => {
    expect(getPlayableSides(piece(1, 2), emptyTable)).toEqual({ left: true, right: true });
  });
});

describe('colocar peça na mesa', () => {
  const table = tableWith(3, 5);

  it('à esquerda, vira a peça para o lado direito tocar a ponta', () => {
    expect(orientPieceForSide(piece(3, 6), 'left', table)).toMatchObject({ left: 6, right: 3 });
    expect(orientPieceForSide(piece(6, 3), 'left', table)).toMatchObject({ left: 6, right: 3 });
  });

  it('à direita, vira a peça para o lado esquerdo tocar a ponta', () => {
    expect(orientPieceForSide(piece(5, 1), 'right', table)).toMatchObject({ left: 5, right: 1 });
    expect(orientPieceForSide(piece(1, 5), 'right', table)).toMatchObject({ left: 5, right: 1 });
  });

  it('atualiza a ponta esquerda e coloca a peça no início', () => {
    const result = placePiece(table, piece(3, 6), 'left');
    expect(result).not.toBeNull();
    expect(result!.leftEnd).toBe(6);
    expect(result!.rightEnd).toBe(5);
    expect(result!.pieces).toHaveLength(2);
    expect(result!.pieces[0]).toMatchObject({ left: 6, right: 3, isFaceUp: true });
  });

  it('atualiza a ponta direita e coloca a peça no fim', () => {
    const result = placePiece(table, piece(1, 5), 'right');
    expect(result!.leftEnd).toBe(3);
    expect(result!.rightEnd).toBe(1);
    expect(result!.pieces[1]).toMatchObject({ left: 5, right: 1, isFaceUp: true });
  });

  it('devolve null quando a peça não encaixa na ponta escolhida', () => {
    expect(placePiece(table, piece(3, 6), 'right')).toBeNull();
    expect(placePiece(table, piece(1, 2), 'left')).toBeNull();
  });

  it('não altera a mesa original', () => {
    const before = JSON.stringify(table);
    placePiece(table, piece(3, 6), 'left');
    expect(JSON.stringify(table)).toBe(before);
  });

  it('a primeira peça define as duas pontas', () => {
    expect(placePiece(emptyTable, piece(2, 4), 'right')).toMatchObject({
      leftEnd: 2,
      rightEnd: 4,
    });
  });
});

describe('fim de jogo (computeResult)', () => {
  it('nunca termina enquanto houver peças no monte, mesmo com mão vazia', () => {
    const state = scenario({ handA: [], handB: [piece(1, 1)], pile: [piece(0, 0)] });
    expect(computeResult(state)).toBeNull();
  });

  it('com o monte vazio, vence quem está sem peças na mão', () => {
    const state = scenario({ handA: [piece(3, 4)], handB: [] });
    expect(computeResult(state)).toEqual({ reason: 'empty-hand', winnerIndexes: [1], scores: [7, 0] });
  });

  it('dois jogadores sem peças: empate', () => {
    const state = scenario({ handA: [], handB: [] });
    expect(computeResult(state)).toEqual({ reason: 'empty-hand', winnerIndexes: [0, 1], scores: [0, 0] });
  });

  it('jogo fechado: vence a menor soma', () => {
    const state = scenario({ handA: [piece(1, 1), piece(2, 2)], handB: [piece(0, 1)] });
    expect(isBlocked(state.players, state.table)).toBe(true);
    expect(computeResult(state)).toEqual({ reason: 'blocked', winnerIndexes: [1], scores: [6, 1] });
  });

  it('jogo fechado com somas iguais: empate', () => {
    const state = scenario({ handA: [piece(1, 2)], handB: [piece(0, 1), piece(1, 1)] });
    expect(computeResult(state)).toEqual({ reason: 'blocked', winnerIndexes: [0, 1], scores: [3, 3] });
  });

  it('continua quando alguma peça ainda encaixa', () => {
    const state = scenario({ handA: [piece(1, 1)], handB: [piece(3, 6)] });
    expect(isBlocked(state.players, state.table)).toBe(false);
    expect(computeResult(state)).toBeNull();
  });
});
