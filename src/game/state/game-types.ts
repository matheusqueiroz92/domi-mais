// Tipos do jogo DomeMais

export interface DominoPiece {
  id: string;
  left: number;
  right: number;
  sum: number;
  isFaceUp: boolean;
}

export interface Player {
  id: string;
  name: string;
  hand: DominoPiece[];
  score: number;
}

export type GamePhase = 'setup' | 'choosing-initial' | 'playing' | 'transition' | 'finished';

export interface Table {
  leftEnd: number | null;
  rightEnd: number | null;
  pieces: DominoPiece[];
}

export interface GameState {
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  table: Table;
  drawPile: DominoPiece[];
  selectedPiece: DominoPiece | null;
  activePlayerVisible: boolean;
  hasDrawnPieceThisTurn: boolean; // Flag para rastrear se o jogador comprou uma peça nesta rodada
  logs: string[];
}

export type GameAction =
  | { type: 'INITIALIZE_GAME'; player1Name: string; player2Name: string }
  | { type: 'START_GAME' }
  | { type: 'CHOOSE_INITIAL_PIECE'; pieceId: string }
  | { type: 'DRAW_PIECE'; pieceId: string }
  | { type: 'SELECT_PIECE'; pieceId: string }
  | { type: 'PLAY_PIECE'; pieceId: string; position: 'left' | 'right' }
  | { type: 'BLUFF'; pieceId: string }
  | { type: 'END_TURN' }
  | { type: 'END_GAME' }
  | { type: 'RESET_GAME' }
  | { type: 'AUTO_ADD_TO_HAND' };

