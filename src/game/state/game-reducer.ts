import type { GameState, GameAction, DominoPiece } from './game-types';
import { createInitialGameState } from './game-inicial-state';

// Verifica se o jogo está fechado (nenhuma peça disponível encaixa nas pontas)
function isGameBlocked(state: GameState): boolean {
  const { table, players, drawPile } = state;
  
  // Se não há pontas definidas, o jogo não está fechado
  if (table.leftEnd === null || table.rightEnd === null) {
    return false;
  }

  // Se ainda há peças no monte, o jogo não está bloqueado
  // Os jogadores podem comprar peças do monte
  if (drawPile.length > 0) {
    return false;
  }

  // Se o monte está vazio, verifica apenas as peças das mãos dos jogadores
  const allAvailablePieces: DominoPiece[] = [
    ...players.flatMap(player => player.hand),
  ];

  // Se não há peças disponíveis nas mãos, o jogo não está bloqueado
  // (pode ser que algum jogador tenha vencido, mas isso é verificado em hasEmptyHand)
  if (allAvailablePieces.length === 0) {
    return false;
  }

  // Valores que precisam encaixar (pontas da mesa)
  const neededValues = [table.leftEnd, table.rightEnd];

  // Verifica se existe alguma peça disponível que encaixe em alguma ponta
  const canPlay = allAvailablePieces.some(piece => {
    return neededValues.some(value => 
      piece.left === value || piece.right === value
    );
  });

  // Se não há nenhuma peça que encaixe, o jogo está fechado
  return !canPlay;
}

// Verifica se algum jogador não tem mais peças na mão (venceu)
// IMPORTANTE: Só considera vitória se o monte também estiver vazio
// ou se o jogador realmente não tem mais peças disponíveis
function hasEmptyHand(state: GameState): { hasWinner: boolean; winnerIndex: number | null } {
  // Só verifica vitória se o monte está vazio
  // Se ainda há peças no monte, o jogador pode comprar, então não venceu ainda
  if (state.drawPile.length > 0) {
    return {
      hasWinner: false,
      winnerIndex: null,
    };
  }

  // Se o monte está vazio, verifica se algum jogador não tem peças na mão
  const emptyHandIndex = state.players.findIndex(player => player.hand.length === 0);
  return {
    hasWinner: emptyHandIndex !== -1,
    winnerIndex: emptyHandIndex !== -1 ? emptyHandIndex : null,
  };
}

// Alterna automaticamente para o próximo jogador
function switchToNextPlayer(state: GameState): GameState {
  const nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  
  return {
    ...state,
    currentPlayerIndex: nextPlayerIndex,
    phase: 'playing',
    activePlayerVisible: true,
    // Se o monte está vazio, permite jogar peças da mão sem precisar comprar
    hasDrawnPieceThisTurn: state.drawPile.length === 0,
    logs: [
      ...state.logs,
      `Vez de ${state.players[nextPlayerIndex].name}`,
    ],
  };
}

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
      // Cria um novo estado inicial com os nomes dos jogadores
      return createInitialGameState(action.player1Name, action.player2Name);
    }

    case 'START_GAME': {
      if (state.phase !== 'setup') return state;

      return {
        ...state,
        phase: 'choosing-initial', // Nova fase para escolher peça inicial
        logs: [...state.logs, `Jogo iniciado! ${state.players[state.currentPlayerIndex].name} deve escolher a peça inicial`],
      };
    }

    case 'CHOOSE_INITIAL_PIECE': {
      // Só permite escolher peça inicial na fase 'choosing-initial'
      if (state.phase !== 'choosing-initial') return state;
      if (state.drawPile.length === 0) return state;

      const currentPlayer = state.players[state.currentPlayerIndex];
      
      // Encontra a peça específica no monte
      const pieceIndex = state.drawPile.findIndex((p) => p.id === action.pieceId);
      if (pieceIndex === -1) return state; // Peça não encontrada

      const chosenPiece = state.drawPile[pieceIndex];
      const newDrawPile = state.drawPile.filter((p) => p.id !== action.pieceId);

      // Coloca a peça inicial na mesa virada para cima
      const initialPiece: DominoPiece = {
        ...chosenPiece,
        isFaceUp: true,
      };

      return {
        ...state,
        phase: 'playing',
        drawPile: newDrawPile,
        table: {
          leftEnd: initialPiece.left,
          rightEnd: initialPiece.right,
          pieces: [initialPiece],
        },
        logs: [
          ...state.logs,
          `${currentPlayer.name} escolheu a peça inicial: [${initialPiece.left}|${initialPiece.right}]`,
          `Vez de ${currentPlayer.name}`,
        ],
      };
    }

    case 'DRAW_PIECE': {
      if (state.phase !== 'playing') return state;
      // Se o monte está vazio, não permite comprar (jogador deve usar peças da mão)
      if (state.drawPile.length === 0) return state;
      // Não permite comprar peça se já tiver uma selecionada que não foi jogada/blefada
      if (state.selectedPiece !== null) {
        // Verifica se a peça selecionada está na mão do jogador (já foi comprada anteriormente)
        const selectedInHand = state.players[state.currentPlayerIndex].hand.find(
          (p) => p.id === state.selectedPiece!.id
        );
        // Se não está na mão, significa que foi comprada neste turno e ainda não foi jogada/blefada
        if (!selectedInHand) {
          return state; // Não permite comprar outra peça
        }
      }

      const currentPlayer = state.players[state.currentPlayerIndex];
      
      // Encontra a peça específica no monte
      const pieceIndex = state.drawPile.findIndex((p) => p.id === action.pieceId);
      if (pieceIndex === -1) return state; // Peça não encontrada

      const drawnPiece = state.drawPile[pieceIndex];
      const newDrawPile = state.drawPile.filter((p) => p.id !== action.pieceId);

      // A peça comprada fica visível apenas para o jogador ativo
      const visiblePiece: DominoPiece = {
        ...drawnPiece,
        isFaceUp: true,
      };

      return {
        ...state,
        drawPile: newDrawPile,
        selectedPiece: visiblePiece,
        hasDrawnPieceThisTurn: true, // Marca que o jogador comprou uma peça nesta rodada
        logs: [
          ...state.logs,
          `${currentPlayer.name} comprou uma peça do monte (soma: ${drawnPiece.sum})`,
        ],
      };
    }

    case 'SELECT_PIECE': {
      if (state.phase !== 'playing') return state;
      // Permite selecionar peça da mão se:
      // 1. Já comprou uma peça do monte nesta rodada, OU
      // 2. O monte está vazio (pode jogar apenas com peças da mão)
      const canSelect = state.hasDrawnPieceThisTurn || state.drawPile.length === 0;
      if (!canSelect) return state;

      const currentPlayer = state.players[state.currentPlayerIndex];
      const piece = currentPlayer.hand.find((p) => p.id === action.pieceId);

      if (!piece) return state;

      // Se havia uma peça selecionada que foi comprada do monte (não está na mão),
      // adiciona ela à mão antes de selecionar a nova peça
      let newPlayers = state.players;
      if (state.selectedPiece && !currentPlayer.hand.find((p) => p.id === state.selectedPiece!.id)) {
        newPlayers = state.players.map((player) => {
          if (player.id === currentPlayer.id) {
            return {
              ...player,
              hand: [...player.hand, { ...state.selectedPiece!, isFaceUp: false }],
            };
          }
          return player;
        });
      }

      return {
        ...state,
        players: newPlayers,
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

      // Cria estado temporário para verificar condições de fim de jogo
      const tempState: GameState = {
        ...state,
        players: newPlayers,
        table: newTable,
        drawPile: state.drawPile,
      };

      // Verifica se algum jogador não tem mais peças (venceu)
      const { hasWinner, winnerIndex } = hasEmptyHand(tempState);
      
      if (hasWinner && winnerIndex !== null) {
        // Jogador venceu por não ter mais peças
        const playersWithScore = newPlayers.map((player) => {
          const score = player.hand.reduce((sum, piece) => sum + piece.sum, 0);
          return { ...player, score };
        });

        // Revela todas as peças dos jogadores
        const playersWithRevealedPieces = playersWithScore.map((player) => ({
          ...player,
          hand: player.hand.map((p) => ({ ...p, isFaceUp: true })),
        }));

        return {
          ...state,
          players: playersWithRevealedPieces,
          table: newTable,
          selectedPiece: null,
          phase: 'finished',
          activePlayerVisible: true, // Mostra todas as peças
          logs: [
            ...state.logs,
            `${currentPlayer.name} jogou [${placedPiece.left}|${placedPiece.right}] na ${action.position === 'left' ? 'esquerda' : 'direita'}`,
            `${newPlayers[winnerIndex].name} não tem mais peças na mão!`,
            `Jogo finalizado! ${newPlayers[winnerIndex].name} venceu!`,
          ],
        };
      }

      // Verifica se o jogo está fechado (nenhuma peça encaixa)
      const isBlocked = isGameBlocked(tempState);
      
      if (isBlocked) {
        // Jogo fechado - calcula pontuação
        const playersWithScore = newPlayers.map((player) => {
          const score = player.hand.reduce((sum, piece) => sum + piece.sum, 0);
          return { ...player, score };
        });

        const winner = playersWithScore.reduce((prev, current) =>
          current.score < prev.score ? current : prev
        );

        // Revela todas as peças dos jogadores
        const playersWithRevealedPieces = playersWithScore.map((player) => ({
          ...player,
          hand: player.hand.map((p) => ({ ...p, isFaceUp: true })),
        }));

        return {
          ...state,
          players: playersWithRevealedPieces,
          table: newTable,
          selectedPiece: null,
          phase: 'finished',
          activePlayerVisible: true, // Mostra todas as peças
          logs: [
            ...state.logs,
            `${currentPlayer.name} jogou [${placedPiece.left}|${placedPiece.right}] na ${action.position === 'left' ? 'esquerda' : 'direita'}`,
            'Jogo fechado! Nenhuma peça disponível encaixa nas pontas.',
            `Jogo finalizado! ${winner.name} venceu com ${winner.score} pontos`,
          ],
        };
      }

      // Jogo continua - alterna para o próximo jogador automaticamente
      const stateAfterPlay: GameState = {
        ...state,
        players: newPlayers,
        table: newTable,
        selectedPiece: null,
        phase: 'transition',
        logs: [
          ...state.logs,
          `${currentPlayer.name} jogou [${placedPiece.left}|${placedPiece.right}] na ${action.position === 'left' ? 'esquerda' : 'direita'}`,
        ],
      };

      // Alterna automaticamente após um pequeno delay (será tratado no componente)
      return switchToNextPlayer(stateAfterPlay);
    }

    case 'BLUFF': {
      if (state.phase !== 'playing') return state;
      if (state.selectedPiece === null) return state;

      const currentPlayer = state.players[state.currentPlayerIndex];
      const piece = state.selectedPiece;

      // Verifica se a peça encaixa - blefe só é possível se encaixar
      const canFit =
        state.table.leftEnd === null ||
        state.table.rightEnd === null ||
        piece.left === state.table.leftEnd ||
        piece.right === state.table.leftEnd ||
        piece.left === state.table.rightEnd ||
        piece.right === state.table.rightEnd;

      // Se não encaixa, não pode blefar
      if (!canFit) {
        return state;
      }

      // Adiciona a peça à mão do jogador (ele blefou, fingindo que não encaixa)
      const newPlayers = state.players.map((player) => {
        if (player.id === currentPlayer.id) {
          return {
            ...player,
            hand: [...player.hand, { ...piece, isFaceUp: false }],
          };
        }
        return player;
      });

      const stateAfterBluff: GameState = {
        ...state,
        players: newPlayers,
        selectedPiece: null,
        phase: 'transition',
        logs: [
          ...state.logs,
          `${currentPlayer.name} declarou que a peça não encaixa (blefe)`,
        ],
      };

      // Alterna automaticamente para o próximo jogador
      return switchToNextPlayer(stateAfterBluff);
    }

    case 'AUTO_ADD_TO_HAND': {
      // Adiciona automaticamente a peça selecionada à mão quando não encaixa
      if (state.phase !== 'playing' || !state.selectedPiece) return state;

      const currentPlayer = state.players[state.currentPlayerIndex];
      const pieceInHand = currentPlayer.hand.find((p) => p.id === state.selectedPiece!.id);
      
      // Se já está na mão, não faz nada
      if (pieceInHand) return state;

      const newPlayers = state.players.map((player) => {
        if (player.id === currentPlayer.id) {
          return {
            ...player,
            hand: [...player.hand, { ...state.selectedPiece!, isFaceUp: false }],
          };
        }
        return player;
      });

      // Verifica condições de fim de jogo
      const tempState: GameState = {
        ...state,
        players: newPlayers,
        selectedPiece: null,
      };

      const { hasWinner, winnerIndex } = hasEmptyHand(tempState);
      const isBlocked = isGameBlocked(tempState);

      if (hasWinner && winnerIndex !== null) {
        const playersWithScore = newPlayers.map((player) => {
          const score = player.hand.reduce((sum, piece) => sum + piece.sum, 0);
          return { ...player, score };
        });

        const playersWithRevealedPieces = playersWithScore.map((player) => ({
          ...player,
          hand: player.hand.map((p) => ({ ...p, isFaceUp: true })),
        }));

        return {
          ...state,
          players: playersWithRevealedPieces,
          selectedPiece: null,
          phase: 'finished',
          activePlayerVisible: true,
          logs: [
            ...state.logs,
            `${newPlayers[winnerIndex].name} não tem mais peças na mão!`,
            `Jogo finalizado! ${newPlayers[winnerIndex].name} venceu!`,
          ],
        };
      }

      if (isBlocked) {
        const playersWithScore = newPlayers.map((player) => {
          const score = player.hand.reduce((sum, piece) => sum + piece.sum, 0);
          return { ...player, score };
        });

        const playersWithRevealedPieces = playersWithScore.map((player) => ({
          ...player,
          hand: player.hand.map((p) => ({ ...p, isFaceUp: true })),
        }));

        const winner = playersWithRevealedPieces.reduce((prev, current) =>
          current.score < prev.score ? current : prev
        );

        return {
          ...state,
          players: playersWithRevealedPieces,
          selectedPiece: null,
          phase: 'finished',
          activePlayerVisible: true,
          logs: [
            ...state.logs,
            'Jogo fechado! Nenhuma peça disponível encaixa nas pontas.',
            `Jogo finalizado! ${winner.name} venceu com ${winner.score} pontos`,
          ],
        };
      }

      // Alterna para o próximo jogador
      return switchToNextPlayer({
        ...state,
        players: newPlayers,
        selectedPiece: null,
      });
    }

    case 'END_TURN': {
      // Esta ação não é mais usada, mas mantida para compatibilidade
      // A alternância de turnos agora é automática
      return state;
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

    case 'RESET_GAME': {
      // Reseta o jogo para o estado inicial
      return createInitialGameState('Jogador 1', 'Jogador 2');
    }

    default:
      return state;
  }
}

