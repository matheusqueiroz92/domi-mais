import { describe, expect, it } from 'vitest';
import {
  canKeepPiece,
  chooseInitialPiece,
  confirmReady,
  drawPiece,
  keepPiece,
  playPiece,
  selectPiece,
  startGame,
} from '../engine';
import {
  currentPlayerCanPlay,
  getSelectedPiece,
  getSelectedPlayableSides,
  getWinners,
  mustDraw,
} from '../selectors';
import { createInitialGameState } from '../../state/game-inicial-state';
import { piece, scenario } from './helpers';

describe('início da partida', () => {
  const setup = createInitialGameState(['Ana', 'Beto'], { startingPlayerIndex: 1 });

  it('nenhum jogador começa com peças e as 28 estão no monte', () => {
    expect(setup.phase).toBe('setup');
    expect(setup.players.map((p) => p.hand.length)).toEqual([0, 0]);
    expect(setup.drawPile).toHaveLength(28);
  });

  it('guarda a ordem inicial do monte, que não muda durante a partida', () => {
    expect(setup.initialPileOrder).toEqual(setup.drawPile.map((p) => p.id));
    const started = startGame(setup);
    const afterInitial = confirmReady(chooseInitialPiece(started, started.drawPile[3].id));
    const afterDraw = drawPiece(afterInitial, afterInitial.drawPile[0].id);
    expect(afterDraw.drawPile).toHaveLength(26);
    expect(afterDraw.initialPileOrder).toEqual(setup.initialPileOrder);
    expect(afterDraw.initialPileOrder).toHaveLength(28);
  });

  it('startGame leva para a escolha da peça inicial', () => {
    const started = startGame(setup);
    expect(started.phase).toBe('choosing-initial');
    expect(startGame(started)).toBe(started);
  });

  it('o jogador sorteado escolhe qualquer peça do monte como inicial', () => {
    const started = startGame(setup);
    const chosen = started.drawPile.find((p) => p.left === 2 && p.right === 5)!;
    const state = chooseInitialPiece(started, chosen.id);

    expect(state.table).toMatchObject({ leftEnd: 2, rightEnd: 5 });
    expect(state.initialPieceId).toBe(chosen.id);
    expect(state.lastPlayed).toEqual({ playerIndex: 1, pieceId: chosen.id });
    expect(state.table.pieces).toHaveLength(1);
    expect(state.table.pieces[0].isFaceUp).toBe(true);
    expect(state.drawPile).toHaveLength(27);
    expect(state.drawPile.some((p) => p.id === chosen.id)).toBe(false);
  });

  it('depois da peça inicial a vez passa ao próximo jogador, que faz a primeira compra', () => {
    const started = startGame(setup);
    expect(started.currentPlayerIndex).toBe(1);

    const state = chooseInitialPiece(started, started.drawPile[0].id);
    // Quem escolheu a peça inicial não compra em seguida: a vez é do outro.
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.phase).toBe('transition');
    expect(state.players.map((p) => p.hand.length)).toEqual([0, 0]);

    const ready = confirmReady(state);
    expect(mustDraw(ready)).toBe(true);
    const drawn = drawPiece(ready, ready.drawPile[0].id);
    expect(drawn.players.map((p) => p.hand.length)).toEqual([1, 0]);
  });

  it('com 3 ou 4 jogadores a primeira compra é de quem vem depois de quem começou', () => {
    for (const [count, starter, next] of [
      [3, 2, 0],
      [4, 1, 2],
      [4, 3, 0],
    ]) {
      const names = ['Ana', 'Beto', 'Caio', 'Dani'].slice(0, count);
      const start = startGame(
        createInitialGameState(names, { startingPlayerIndex: starter, protectTurns: false })
      );
      const state = chooseInitialPiece(start, start.drawPile[0].id);
      expect(state.phase).toBe('playing');
      expect(state.currentPlayerIndex).toBe(next);
      expect(mustDraw(state)).toBe(true);
    }
  });

  it('ignora peça inexistente e escolha fora da fase certa', () => {
    const started = startGame(setup);
    expect(chooseInitialPiece(started, 'nao-existe')).toBe(started);
    expect(chooseInitialPiece(setup, setup.drawPile[0].id)).toBe(setup);
  });
});

describe('compra obrigatória', () => {
  const base = scenario({ handA: [piece(3, 4)], pile: [piece(0, 0), piece(5, 6)] });

  it('a peça comprada vai para a mão e fica selecionada', () => {
    const state = drawPiece(base, '5-6');
    expect(state.players[0].hand.map((p) => p.id)).toEqual(['3-4', '5-6']);
    expect(state.drawPile.map((p) => p.id)).toEqual(['0-0']);
    expect(state.drawnPieceId).toBe('5-6');
    expect(getSelectedPiece(state)?.id).toBe('5-6');
    expect(state.turnStep).toBe('play');
  });

  it('só permite comprar UMA peça por turno', () => {
    const state = drawPiece(base, '5-6');
    expect(drawPiece(state, '0-0')).toBe(state);
  });

  it('não permite jogar, selecionar ou ficar com a peça antes de comprar', () => {
    expect(playPiece(base, '3-4', 'left')).toBe(base);
    expect(selectPiece(base, '3-4')).toBe(base);
    expect(keepPiece(base)).toBe(base);
    expect(canKeepPiece(base)).toBe(false);
  });

  it('ignora peça que não está no monte', () => {
    expect(drawPiece(base, '3-4')).toBe(base);
  });
});

describe('jogar peça', () => {
  const base = scenario({
    handA: [piece(3, 4), piece(1, 1)],
    handB: [piece(2, 2)],
    pile: [piece(5, 6), piece(0, 0)],
  });
  const afterDraw = drawPiece(base, '5-6');

  it('joga a peça comprada na ponta em que encaixa', () => {
    const state = playPiece(afterDraw, '5-6', 'right');
    expect(state.table).toMatchObject({ leftEnd: 3, rightEnd: 6 });
    expect(state.players[0].hand.map((p) => p.id)).toEqual(['3-4', '1-1']);
    expect(state.currentPlayerIndex).toBe(1);
  });

  it('pode jogar outra peça da mão em vez da comprada', () => {
    const state = playPiece(afterDraw, '3-4', 'left');
    expect(state.table).toMatchObject({ leftEnd: 4, rightEnd: 5 });
    expect(state.players[0].hand.map((p) => p.id)).toEqual(['1-1', '5-6']);
  });

  it('recusa ponta em que a peça não encaixa', () => {
    expect(playPiece(afterDraw, '5-6', 'left')).toBe(afterDraw);
    expect(playPiece(afterDraw, '1-1', 'right')).toBe(afterDraw);
  });

  it('recusa peça que não é da mão do jogador da vez', () => {
    expect(playPiece(afterDraw, '2-2', 'left')).toBe(afterDraw);
    expect(selectPiece(afterDraw, '2-2')).toBe(afterDraw);
  });

  it('selecionar troca a peça selecionada e clicar de novo desmarca', () => {
    const selected = selectPiece(afterDraw, '3-4');
    expect(getSelectedPiece(selected)?.id).toBe('3-4');
    expect(getSelectedPlayableSides(selected)).toEqual({ left: true, right: false });
    expect(getSelectedPiece(selectPiece(selected, '3-4'))).toBeNull();
  });

  it('jogar com o monte ainda cheio e ficar sem peças NÃO encerra a partida', () => {
    const start = scenario({ handA: [], handB: [], pile: [piece(5, 6), piece(0, 0)] });
    const state = playPiece(drawPiece(start, '5-6'), '5-6', 'right');
    expect(state.players[0].hand).toHaveLength(0);
    expect(state.phase).not.toBe('finished');
    expect(state.result).toBeNull();
  });
});

describe('ficar com a peça (inclui o blefe)', () => {
  const pile = [piece(5, 6), piece(1, 2), piece(0, 0)];

  it('a peça que não encaixa fica na mão e a vez passa', () => {
    const state = keepPiece(drawPiece(scenario({ pile }), '1-2'));
    expect(state.players[0].hand.map((p) => p.id)).toEqual(['1-2']);
    expect(state.currentPlayerIndex).toBe(1);
    expect(state.drawnPieceId).toBeNull();
    expect(state.selectedPieceId).toBeNull();
  });

  it('currentPlayerCanPlay diz se alguma peça da mão do jogador da vez encaixa', () => {
    expect(currentPlayerCanPlay(drawPiece(scenario({ pile }), '1-2'))).toBe(false);
    expect(currentPlayerCanPlay(drawPiece(scenario({ pile }), '5-6'))).toBe(true);
    // A peça comprada não encaixa, mas outra da mão sim.
    expect(currentPlayerCanPlay(drawPiece(scenario({ handA: [piece(3, 4)], pile }), '1-2'))).toBe(true);
  });

  it('blefe: pode ficar com uma peça que encaixa', () => {
    const drawn = drawPiece(scenario({ pile }), '5-6');
    expect(canKeepPiece(drawn)).toBe(true);
    const state = keepPiece(drawn);
    expect(state.players[0].hand.map((p) => p.id)).toEqual(['5-6']);
    expect(state.table.pieces).toHaveLength(1);
  });

  it('o blefe não é registrado nem exposto: o estado é igual ao de uma peça que não encaixa', () => {
    const bluff = keepPiece(drawPiece(scenario({ pile }), '5-6'));
    const honest = keepPiece(drawPiece(scenario({ pile }), '1-2'));

    expect(bluff.logs[bluff.logs.length - 2]).toBe('Ana ficou com a peça');
    expect(bluff.logs.slice(-2)).toEqual(honest.logs.slice(-2));
    expect(bluff.logs.join(' ').toLowerCase()).not.toContain('blef');
    expect(Object.keys(bluff)).toEqual(Object.keys(honest));
    expect({ ...bluff, players: null, drawPile: null, logs: null }).toEqual({
      ...honest,
      players: null,
      drawPile: null,
      logs: null,
    });
  });

  it('regressão (bug 2): ficar com a peça nunca duplica peças na mão', () => {
    const start = scenario({ handA: [piece(3, 4)], pile });
    const drawn = drawPiece(start, '5-6');
    const state = keepPiece(selectPiece(drawn, '3-4'));
    const ids = state.players[0].hand.map((p) => p.id);
    expect(ids).toEqual(['3-4', '5-6']);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('quem comprou a ÚLTIMA peça do monte ainda pode ficar com ela', () => {
    const start = scenario({ handA: [piece(1, 1)], handB: [piece(3, 3)], pile: [piece(5, 6)] });
    const drawn = drawPiece(start, '5-6');
    expect(drawn.drawPile).toHaveLength(0);
    expect(canKeepPiece(drawn)).toBe(true);
    expect(keepPiece(drawn).currentPlayerIndex).toBe(1);
  });
});

describe('monte vazio', () => {
  it('não há compra: o turno começa direto na jogada', () => {
    const state = scenario({ handA: [piece(3, 4)], handB: [piece(5, 5)] });
    expect(mustDraw(state)).toBe(false);
    expect(drawPiece(state, 'qualquer')).toBe(state);
  });

  it('quem tem peça que encaixa é obrigado a jogar (não pode ficar/blefar)', () => {
    const state = scenario({ handA: [piece(3, 4), piece(0, 0)], handB: [piece(5, 5)] });
    expect(canKeepPiece(state)).toBe(false);
    expect(keepPiece(state)).toBe(state);
  });

  it('regressão (bug 1): quem não tem peça que encaixa passa a vez automaticamente', () => {
    // Ana joga [3|4] na esquerda: pontas 4 e 5. Beto só tem [1|1]; Ana ainda tem [4|4].
    const start = scenario({
      handA: [piece(3, 4), piece(4, 4)],
      handB: [piece(1, 1)],
      protectTurns: false,
    });
    const state = playPiece(start, '3-4', 'left');

    expect(state.phase).toBe('playing');
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.autoPassedPlayerIndexes).toEqual([1]);
    expect(state.logs).toContain('Beto não tem peça que encaixa e passou a vez');
    expect(state.turnStep).toBe('play');
  });

  it('o aviso de passe automático some na ação seguinte', () => {
    const start = scenario({
      handA: [piece(3, 4), piece(4, 4), piece(4, 6)],
      handB: [piece(1, 1), piece(6, 6)],
      protectTurns: false,
    });
    const passed = playPiece(start, '3-4', 'left');
    expect(passed.autoPassedPlayerIndexes).toEqual([1]);
    const next = playPiece(passed, '4-6', 'left');
    expect(next.autoPassedPlayerIndexes).toEqual([]);
    expect(next.currentPlayerIndex).toBe(1);
  });

  it('sem passe automático quando o próximo jogador tem jogada', () => {
    const start = scenario({ handA: [piece(3, 4), piece(4, 4)], handB: [piece(5, 1)] });
    const state = playPiece(start, '3-4', 'left');
    expect(state.currentPlayerIndex).toBe(1);
    expect(state.autoPassedPlayerIndexes).toEqual([]);
  });
});

describe('fim de jogo', () => {
  it('com o monte vazio, quem joga a última peça da mão vence', () => {
    const start = scenario({ handA: [piece(3, 4)], handB: [piece(5, 5), piece(1, 1)] });
    const state = playPiece(start, '3-4', 'left');

    expect(state.phase).toBe('finished');
    expect(state.result).toEqual({ reason: 'empty-hand', winnerIndexes: [0], scores: [0, 12] });
    expect(getWinners(state).map((p) => p.name)).toEqual(['Ana']);
    expect(state.players.map((p) => p.score)).toEqual([0, 12]);
  });

  it('mão vazia vence mesmo que o adversário só tenha o [0|0] (soma zero)', () => {
    const start = scenario({ handA: [piece(3, 4)], handB: [piece(0, 0)] });
    const state = playPiece(start, '3-4', 'left');
    expect(state.result).toEqual({ reason: 'empty-hand', winnerIndexes: [0], scores: [0, 0] });
  });

  it('quando o monte acaba, quem já estava sem peças vence', () => {
    // Beto está sem peças; Ana compra a última peça do monte e fica com ela.
    const start = scenario({ handA: [], handB: [], pile: [piece(1, 2)] });
    const state = keepPiece(drawPiece(start, '1-2'));
    expect(state.phase).toBe('finished');
    expect(state.result).toMatchObject({ reason: 'empty-hand', winnerIndexes: [1] });
  });

  it('jogo fechado: vence a menor soma', () => {
    // Ana joga [3|6]: pontas 6 e 5. Sobram [1|1] (Ana) e [2|2],[0|4] (Beto): ninguém encaixa.
    const start = scenario({
      handA: [piece(3, 6), piece(1, 1)],
      handB: [piece(2, 2), piece(0, 4)],
    });
    const state = playPiece(start, '3-6', 'left');

    expect(state.phase).toBe('finished');
    expect(state.result).toEqual({ reason: 'blocked', winnerIndexes: [0], scores: [2, 8] });
  });

  it('regressão (bug 3): somas iguais no jogo fechado dão empate', () => {
    const start = scenario({
      handA: [piece(3, 6), piece(1, 2)],
      handB: [piece(0, 1), piece(1, 1)],
    });
    const state = playPiece(start, '3-6', 'left');

    expect(state.phase).toBe('finished');
    expect(state.result).toEqual({ reason: 'blocked', winnerIndexes: [0, 1], scores: [3, 3] });
    expect(getWinners(state).map((p) => p.name)).toEqual(['Ana', 'Beto']);
    expect(state.logs[state.logs.length - 1]).toBe('A partida terminou empatada entre Ana e Beto.');
  });

  it('o monte acabar NÃO encerra a partida se ainda há jogadas', () => {
    const start = scenario({ handA: [piece(3, 3)], handB: [piece(5, 5)], pile: [piece(1, 2)] });
    const state = keepPiece(drawPiece(start, '1-2'));
    expect(state.phase).not.toBe('finished');
    expect(state.drawPile).toHaveLength(0);
    expect(state.currentPlayerIndex).toBe(1);
    expect(state.turnStep).toBe('play');
  });

  it('depois do fim nenhuma ação altera o estado', () => {
    const start = scenario({ handA: [piece(3, 4)], handB: [piece(5, 5)] });
    const finished = playPiece(start, '3-4', 'left');
    expect(playPiece(finished, '5-5', 'right')).toBe(finished);
    expect(keepPiece(finished)).toBe(finished);
    expect(drawPiece(finished, 'x')).toBe(finished);
    expect(confirmReady(finished)).toBe(finished);
  });
});

describe('troca de turno protegida', () => {
  const pile = [piece(5, 6), piece(0, 0)];

  it('regressão (bug 4): ao mudar o jogador, a partida entra em `transition`', () => {
    const state = keepPiece(drawPiece(scenario({ pile }), '5-6'));
    expect(state.phase).toBe('transition');
    expect(state.currentPlayerIndex).toBe(1);
  });

  it('durante a transição nenhuma jogada é aceita', () => {
    const state = keepPiece(drawPiece(scenario({ pile }), '5-6'));
    expect(drawPiece(state, '0-0')).toBe(state);
    expect(playPiece(state, '5-6', 'right')).toBe(state);
    expect(keepPiece(state)).toBe(state);
    expect(selectPiece(state, '5-6')).toBe(state);
  });

  it('"Estou pronto" libera o turno do próximo jogador', () => {
    const state = confirmReady(keepPiece(drawPiece(scenario({ pile }), '5-6')));
    expect(state.phase).toBe('playing');
    expect(mustDraw(state)).toBe(true);
    expect(confirmReady(state)).toBe(state);
  });

  it('sem transição quando o mesmo jogador continua (passe automático do adversário)', () => {
    const start = scenario({ handA: [piece(3, 4), piece(4, 4)], handB: [piece(1, 1)] });
    const state = playPiece(start, '3-4', 'left');
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.phase).toBe('playing');
  });

  it('com protectTurns desligado a vez passa direto', () => {
    const state = keepPiece(drawPiece(scenario({ pile, protectTurns: false }), '5-6'));
    expect(state.phase).toBe('playing');
    expect(state.currentPlayerIndex).toBe(1);
  });
});
