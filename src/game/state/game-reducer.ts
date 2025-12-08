import type { GameState, GameAction, DominoPiece } from './game-types';

// Verifica se uma peça encaixa em uma posição específica
function canFitAtPosition(
  piece: DominoPiece,
  position: 'left' | 'right',
  leftEnd: number | null,
  rightEnd: number | null
): boolean {
  if (position === 'left') {
    return leftEnd === null || piece.right === leftEnd || piece.left === leftEnd;
  } else {
    return rightEnd === null || piece.left === rightEnd || piece.right === rightEnd;
  }
}

// Coloca a peça na posição correta (pode precisar virar)
function placePieceAtPosition(
  piece: DominoPiece,
  position: 'left' | 'right',
  leftEnd: number | null,
  rightEnd: number | null
): DominoPiece {
  const placedPiece = { ...piece, isFaceUp: true };

  if (position === 'left') {
    if (leftEnd === null) {
      // Primeira peça na mesa
      return placedPiece;
    }
    // Precisa encaixar o lado direito ou esquerdo da peça com leftEnd
    if (placedPiece.right !== leftEnd && placedPiece.left !== leftEnd) {
      // Não encaixa, não deveria chegar aqui
      return placedPiece;
    }
    // Se o lado esquerdo encaixa, precisa virar
    if (placedPiece.left === leftEnd) {
      return { ...placedPiece, left: piece.right, right: piece.left };
    }
    return placedPiece;
  } else {
    if (rightEnd === null) {
      // Primeira peça na mesa
      return placedPiece;
    }
    // Precisa encaixar o lado esquerdo ou direito da peça com rightEnd
    if (placedPiece.left !== rightEnd && placedPiece.right !== rightEnd) {
      // Não encaixa, não deveria chegar aqui
      return placedPiece;
    }
    // Se o lado direito encaixa, precisa virar
    if (placedPiece.right === rightEnd) {
      return { ...placedPiece, left: piece.right, right: piece.left };
    }
    return placedPiece;
  }
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'INITIALIZE_GAME': {
      // Estado inicial já é criado pela função createInitialGameState
      // Esta ação pode ser usada para reiniciar o jogo com novos nomes
      return state;
    }

    case 'START_GAME': {
      if (state.phase !== 'setup') return state;

      return {
        ...state,
        phase: 'playing',
        logs: [...state.logs, `Jogo iniciado! Vez de ${state.players[state.currentPlayerIndex].name}`],
      };
    }

    case 'DRAW_PIECE': {
      if (state.phase !== 'playing') return state;
      if (state.drawPile.length === 0) return state;
      if (state.selectedPiece !== null) return state; // Já tem uma peça selecionada

      const currentPlayer = state.players[state.currentPlayerIndex];
      const drawnPiece = state.drawPile[0];
      const newDrawPile = state.drawPile.slice(1);

      // A peça comprada fica visível apenas para o jogador ativo
      const visiblePiece: DominoPiece = {
        ...drawnPiece,
        isFaceUp: true,
      };

      return {
        ...state,
        drawPile: newDrawPile,
        selectedPiece: visiblePiece,
        logs: [
          ...state.logs,
          `${currentPlayer.name} comprou uma peça do monte`,
        ],
      };
    }

    case 'SELECT_PIECE': {
      if (state.phase !== 'playing') return state;

      const piece = state.players[state.currentPlayerIndex].hand.find(
        (p) => p.id === action.pieceId
      );

      if (!piece) return state;

      return {
        ...state,
        selectedPiece: { ...piece, isFaceUp: true },
      };
    }

    case 'PLAY_PIECE': {
      if (state.phase !== 'playing') return state;
      if (state.selectedPiece === null) return state;

      const currentPlayer = state.players[state.currentPlayerIndex];
      const piece = state.selectedPiece;

      // Verifica se a peça encaixa na posição escolhida
      if (
        !canFitAtPosition(
          piece,
          action.position,
          state.table.leftEnd,
          state.table.rightEnd
        )
      ) {
        return state; // Não pode jogar aqui
      }

      // Coloca a peça na mesa
      const placedPiece = placePieceAtPosition(
        piece,
        action.position,
        state.table.leftEnd,
        state.table.rightEnd
      );

      const newTable = {
        leftEnd: action.position === 'left' ? placedPiece.left : state.table.leftEnd,
        rightEnd: action.position === 'right' ? placedPiece.right : state.table.rightEnd,
        pieces:
          action.position === 'left'
            ? [placedPiece, ...state.table.pieces]
            : [...state.table.pieces, placedPiece],
      };

      // Remove a peça da mão do jogador (se estava na mão)
      const pieceInHand = currentPlayer.hand.find((p) => p.id === piece.id);
      const newPlayers = state.players.map((player) => {
        if (player.id === currentPlayer.id) {
          return {
            ...player,
            hand: pieceInHand ? player.hand.filter((p) => p.id !== piece.id) : player.hand,
          };
        }
        return player;
      });

      // Verifica fim de jogo
      const newDrawPile = state.drawPile;
      const isGameOver = newDrawPile.length === 0;

      // Verifica vitória
      const currentPlayerAfterPlay = newPlayers[state.currentPlayerIndex];
      const hasWon = currentPlayerAfterPlay.hand.length === 0;

      return {
        ...state,
        players: newPlayers,
        table: newTable,
        selectedPiece: null,
        phase: isGameOver || hasWon ? 'finished' : 'transition',
        logs: [
          ...state.logs,
          `${currentPlayer.name} jogou [${placedPiece.left}|${placedPiece.right}] na ${action.position === 'left' ? 'esquerda' : 'direita'}`,
        ],
      };
    }

    case 'BLUFF': {
      if (state.phase !== 'playing') return state;
      if (state.selectedPiece === null) return state;

      const currentPlayer = state.players[state.currentPlayerIndex];
      const piece = state.selectedPiece;

      // Adiciona a peça à mão do jogador (mesmo que encaixe, ele blefou)
      const newPlayers = state.players.map((player) => {
        if (player.id === currentPlayer.id) {
          return {
            ...player,
            hand: [...player.hand, { ...piece, isFaceUp: false }],
          };
        }
        return player;
      });

      return {
        ...state,
        players: newPlayers,
        selectedPiece: null,
        phase: 'transition',
        logs: [
          ...state.logs,
          `${currentPlayer.name} declarou que a peça não encaixa`,
        ],
      };
    }

    case 'END_TURN': {
      if (state.phase !== 'transition') return state;

      // Verifica se o jogo acabou
      const isGameOver = state.drawPile.length === 0;
      if (isGameOver) {
        // Calcula pontuação final
        const playersWithScore = state.players.map((player) => {
          const score = player.hand.reduce((sum, piece) => sum + piece.sum, 0);
          return { ...player, score };
        });

        const winner = playersWithScore.reduce((prev, current) =>
          current.score < prev.score ? current : prev
        );

        return {
          ...state,
          players: playersWithScore,
          phase: 'finished',
          logs: [
            ...state.logs,
            `Jogo finalizado! ${winner.name} venceu com ${winner.score} pontos`,
          ],
        };
      }

      // Passa para o próximo jogador
      const nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;

      return {
        ...state,
        currentPlayerIndex: nextPlayerIndex,
        phase: 'playing',
        activePlayerVisible: true,
        logs: [
          ...state.logs,
          `Vez de ${state.players[nextPlayerIndex].name}`,
        ],
      };
    }

    case 'END_GAME': {
      // Calcula pontuação final
      const playersWithScore = state.players.map((player) => {
        const score = player.hand.reduce((sum, piece) => sum + piece.sum, 0);
        return { ...player, score };
      });

      const winner = playersWithScore.reduce((prev, current) =>
        current.score < prev.score ? current : prev
      );

      return {
        ...state,
        players: playersWithScore,
        phase: 'finished',
        logs: [
          ...state.logs,
          `Jogo finalizado! ${winner.name} venceu com ${winner.score} pontos`,
        ],
      };
    }

    default:
      return state;
  }
}

