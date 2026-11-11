// Tipos do jogo DomiMais.
// As regras oficiais estão em docs/REGRAS.md e a implementação em src/game/logic.

/** Uma peça de dominó. O verso mostra `sum` (soma dos dois lados). */
export interface DominoPiece {
  id: string;
  left: number;
  right: number;
  /** Soma dos dois lados: é o valor exibido no verso da peça. */
  sum: number;
  /** `true` quando a peça está aberta na mesa. */
  isFaceUp: boolean;
}

export interface Player {
  id: string;
  name: string;
  hand: DominoPiece[];
  /** Soma das peças da mão ao fim da partida (0 durante o jogo). */
  score: number;
}

/**
 * Fases da partida:
 * - `setup`: partida ainda não iniciada (tela inicial);
 * - `choosing-initial`: o jogador sorteado escolhe a peça inicial no monte;
 * - `transition`: troca de turno protegida; as mãos ficam ocultas até o
 *   próximo jogador confirmar que está com o dispositivo;
 * - `playing`: o jogador da vez está jogando;
 * - `finished`: partida encerrada, com `result` preenchido.
 */
export type GamePhase =
  | 'setup'
  | 'choosing-initial'
  | 'transition'
  | 'playing'
  | 'finished';

/**
 * Etapa do turno:
 * - `draw`: o jogador precisa comprar uma peça do monte;
 * - `play`: o jogador joga uma peça ou (se comprou neste turno) fica com ela.
 */
export type TurnStep = 'draw' | 'play';

export type TableSide = 'left' | 'right';

export interface Table {
  leftEnd: number | null;
  rightEnd: number | null;
  pieces: DominoPiece[];
}

/**
 * Motivo do fim da partida:
 * - `empty-hand`: com o monte vazio, algum jogador ficou sem peças;
 * - `blocked`: com o monte vazio, nenhuma peça das mãos encaixa (jogo fechado).
 */
export type GameEndReason = 'empty-hand' | 'blocked';

export interface GameResult {
  reason: GameEndReason;
  /**
   * Índices dos vencedores em `players`. Um único índice é vitória;
   * dois ou mais é empate entre eles (os demais jogadores perdem).
   */
  winnerIndexes: number[];
  /** Soma da mão de cada jogador, na ordem de `players`. */
  scores: number[];
}

export interface GameState {
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  table: Table;
  drawPile: DominoPiece[];
  turnStep: TurnStep;
  /** Peça comprada do monte neste turno (ela já está na mão do jogador). */
  drawnPieceId: string | null;
  /** Peça da mão do jogador da vez selecionada para jogar. */
  selectedPieceId: string | null;
  /**
   * Jogadores que passaram a vez automaticamente na última troca de turno
   * (monte vazio e nenhuma peça que encaixa). É limpo na ação seguinte.
   */
  autoPassedPlayerIndexes: number[];
  /**
   * Quando `true`, a troca de turno passa pela fase `transition`
   * (jogo no mesmo dispositivo). Modos futuros (contra o computador, online)
   * usam `false`.
   */
  protectTurns: boolean;
  /** Preenchido quando `phase === 'finished'`. */
  result: GameResult | null;
  logs: string[];
}

export type GameAction =
  | {
      type: 'INITIALIZE_GAME';
      /** Nomes dos jogadores, na ordem dos turnos (de 2 a 4). */
      playerNames: string[];
      /** As 28 peças já embaralhadas (o reducer não sorteia nada). */
      shuffledPieces: DominoPiece[];
      /** Índice do jogador que começa (sorteado fora do reducer). */
      startingPlayerIndex: number;
      protectTurns?: boolean;
    }
  | { type: 'START_GAME' }
  | { type: 'CHOOSE_INITIAL_PIECE'; pieceId: string }
  | { type: 'CONFIRM_READY' }
  | { type: 'DRAW_PIECE'; pieceId: string }
  | { type: 'SELECT_PIECE'; pieceId: string }
  | { type: 'PLAY_PIECE'; pieceId: string; position: TableSide }
  | { type: 'KEEP_PIECE' }
  | { type: 'RESET_GAME' };
