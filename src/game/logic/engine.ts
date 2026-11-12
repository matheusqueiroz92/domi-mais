/**
 * Motor de regras do DomiMais.
 *
 * Todas as funções são puras: recebem o estado e devolvem um novo estado,
 * sem sorteios nem efeitos colaterais. Uma ação inválida devolve o MESMO
 * objeto de estado recebido (nada muda).
 *
 * Regras oficiais: docs/REGRAS.md.
 */
import type { DominoPiece, GameResult, GameState, Player, TableSide } from '../state/game-types';
import { computeResult, hasPlayablePiece, placePiece } from './rules';

function currentPlayer(state: GameState): Player {
  return state.players[state.currentPlayerIndex];
}

function replaceCurrentHand(state: GameState, hand: DominoPiece[]): Player[] {
  return state.players.map((player, index) =>
    index === state.currentPlayerIndex ? { ...player, hand } : player
  );
}

function sideLabel(side: TableSide): string {
  return side === 'left' ? 'esquerda' : 'direita';
}

/** Encerra a partida: grava o resultado e a pontuação de cada jogador. */
function finishGame(state: GameState, result: GameResult): GameState {
  const players = state.players.map((player, index) => ({
    ...player,
    score: result.scores[index],
  }));

  const reasonLog =
    result.reason === 'empty-hand'
      ? 'Fim de jogo: há jogador sem peças na mão.'
      : 'Jogo fechado! Nenhuma peça das mãos encaixa nas pontas.';

  const winnerNames = result.winnerIndexes.map((index) => players[index].name);
  const outcomeLog =
    winnerNames.length === 1
      ? `${winnerNames[0]} venceu!`
      : `A partida terminou empatada entre ${winnerNames.join(' e ')}.`;

  return {
    ...state,
    players,
    phase: 'finished',
    result,
    selectedPieceId: null,
    drawnPieceId: null,
    autoPassedPlayerIndexes: [],
    logs: [...state.logs, reasonLog, outcomeLog],
  };
}

/**
 * Resolve o que acontece depois que o jogador da vez termina sua ação
 * (jogou uma peça ou ficou com a peça comprada):
 * 1. verifica o fim da partida;
 * 2. escolhe o próximo jogador; com o monte vazio, quem não tem peça que
 *    encaixa passa a vez automaticamente;
 * 3. abre o próximo turno (protegido por `transition` quando o jogador muda
 *    e `protectTurns` está ligado).
 */
function endTurn(state: GameState): GameState {
  const cleared: GameState = {
    ...state,
    selectedPieceId: null,
    drawnPieceId: null,
    autoPassedPlayerIndexes: [],
  };

  const result = computeResult(cleared);
  if (result) return finishGame(cleared, result);

  const actorIndex = cleared.currentPlayerIndex;
  const playerCount = cleared.players.length;
  const pileIsEmpty = cleared.drawPile.length === 0;

  const autoPassed: number[] = [];
  let nextIndex = actorIndex;

  for (let step = 1; step <= playerCount; step++) {
    const candidate = (actorIndex + step) % playerCount;
    const canAct = !pileIsEmpty || hasPlayablePiece(cleared.players[candidate].hand, cleared.table);
    if (canAct) {
      nextIndex = candidate;
      break;
    }
    autoPassed.push(candidate);
  }

  const passLogs = autoPassed.map(
    (index) => `${cleared.players[index].name} não tem peça que encaixa e passou a vez`
  );

  const playerChanged = nextIndex !== actorIndex;

  return {
    ...cleared,
    currentPlayerIndex: nextIndex,
    turnStep: pileIsEmpty ? 'play' : 'draw',
    phase: cleared.protectTurns && playerChanged ? 'transition' : 'playing',
    autoPassedPlayerIndexes: autoPassed,
    logs: [...cleared.logs, ...passLogs, `Vez de ${cleared.players[nextIndex].name}`],
  };
}

/** Sai da tela inicial: o jogador sorteado vai escolher a peça inicial. */
export function startGame(state: GameState): GameState {
  if (state.phase !== 'setup') return state;

  return {
    ...state,
    phase: 'choosing-initial',
    logs: [
      ...state.logs,
      `Jogo iniciado! ${currentPlayer(state).name} deve escolher a peça inicial`,
    ],
  };
}

/**
 * O jogador sorteado escolhe qualquer peça do monte (vendo só a soma no
 * verso); ela é aberta na mesa e o mesmo jogador faz o primeiro turno.
 */
export function chooseInitialPiece(state: GameState, pieceId: string): GameState {
  if (state.phase !== 'choosing-initial') return state;

  const piece = state.drawPile.find((p) => p.id === pieceId);
  if (!piece) return state;

  const table = placePiece(state.table, piece, 'right');
  if (!table) return state;

  const player = currentPlayer(state);
  const placed = table.pieces[0];

  return {
    ...state,
    phase: 'playing',
    turnStep: 'draw',
    drawPile: state.drawPile.filter((p) => p.id !== pieceId),
    table,
    lastPlayed: { playerIndex: state.currentPlayerIndex, pieceId },
    logs: [
      ...state.logs,
      `${player.name} escolheu a peça inicial: [${placed.left}|${placed.right}]`,
      `Vez de ${player.name}`,
    ],
  };
}

/** O próximo jogador confirma que está com o dispositivo ("Estou pronto"). */
export function confirmReady(state: GameState): GameState {
  if (state.phase !== 'transition') return state;
  return { ...state, phase: 'playing' };
}

/**
 * Compra obrigatória: o jogador da vez escolhe UMA peça do monte.
 * A peça vai direto para a mão dele e fica selecionada.
 */
export function drawPiece(state: GameState, pieceId: string): GameState {
  if (state.phase !== 'playing' || state.turnStep !== 'draw') return state;

  const piece = state.drawPile.find((p) => p.id === pieceId);
  if (!piece) return state;

  const player = currentPlayer(state);

  return {
    ...state,
    players: replaceCurrentHand(state, [...player.hand, piece]),
    drawPile: state.drawPile.filter((p) => p.id !== pieceId),
    turnStep: 'play',
    drawnPieceId: piece.id,
    selectedPieceId: piece.id,
    autoPassedPlayerIndexes: [],
    logs: [...state.logs, `${player.name} comprou uma peça do monte (soma: ${piece.sum})`],
  };
}

/** Seleciona (ou desmarca, se já estiver selecionada) uma peça da própria mão. */
export function selectPiece(state: GameState, pieceId: string): GameState {
  if (state.phase !== 'playing' || state.turnStep !== 'play') return state;
  if (!currentPlayer(state).hand.some((p) => p.id === pieceId)) return state;

  return {
    ...state,
    selectedPieceId: state.selectedPieceId === pieceId ? null : pieceId,
  };
}

/**
 * Joga uma peça da mão (a comprada neste turno ou qualquer outra) em uma
 * ponta da mesa. Só vale se a peça encaixar nessa ponta. Encerra o turno.
 */
export function playPiece(state: GameState, pieceId: string, side: TableSide): GameState {
  if (state.phase !== 'playing' || state.turnStep !== 'play') return state;

  const player = currentPlayer(state);
  const piece = player.hand.find((p) => p.id === pieceId);
  if (!piece) return state;

  const table = placePiece(state.table, piece, side);
  if (!table) return state;

  const placed = side === 'left' ? table.pieces[0] : table.pieces[table.pieces.length - 1];

  return endTurn({
    ...state,
    players: replaceCurrentHand(
      state,
      player.hand.filter((p) => p.id !== pieceId)
    ),
    table,
    lastPlayed: { playerIndex: state.currentPlayerIndex, pieceId },
    logs: [
      ...state.logs,
      `${player.name} jogou [${placed.left}|${placed.right}] na ${sideLabel(side)}`,
    ],
  });
}

/**
 * O jogador pode encerrar o turno sem jogar? Só quando comprou uma peça do
 * monte neste turno. Com o monte vazio não há compra, então jogar é obrigatório.
 */
export function canKeepPiece(state: GameState): boolean {
  return state.phase === 'playing' && state.turnStep === 'play' && state.drawnPieceId !== null;
}

/**
 * O jogador fica com a peça comprada e encerra o turno sem jogar.
 *
 * É a mesma ação para "a peça não encaixa" e para o blefe (a peça encaixa,
 * mas o jogador finge que não). O motor não distingue os dois casos nem
 * registra qual foi: o blefe nunca é exposto.
 */
export function keepPiece(state: GameState): GameState {
  if (!canKeepPiece(state)) return state;

  return endTurn({
    ...state,
    logs: [...state.logs, `${currentPlayer(state).name} ficou com a peça`],
  });
}
