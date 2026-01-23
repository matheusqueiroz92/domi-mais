import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { GameProvider, useGame } from "./game/state/game-context";
import { DominoPiece } from "./components/DominoPiece";
import { GameTable } from "./components/GameTable";
import { GameModal } from "./components/GameModal";
import { DrawPile } from "./components/DrawPile";
import { HomeScreen } from "./components/HomeScreen";
import { Modal } from "./components/Modal";
import { useGameModals } from "./hooks/useGameModals";
import "./App.css";

function GameContent() {
  const { state, dispatch, initializeGame } = useGame();
  const { currentModal, closeModal, winnerName, winnerScore } = useGameModals(state);
  const [showHomeScreen, setShowHomeScreen] = useState(true);
  const [showAbandonModal, setShowAbandonModal] = useState(false);

  const currentPlayer = state.players[state.currentPlayerIndex];
  const nextPlayer =
    state.players[(state.currentPlayerIndex + 1) % state.players.length];

  // Verifica se a peça selecionada encaixa em cada lado
  const canFitLeft =
    state.selectedPiece &&
    (state.table.leftEnd === null ||
      state.selectedPiece.left === state.table.leftEnd ||
      state.selectedPiece.right === state.table.leftEnd);

  const canFitRight =
    state.selectedPiece &&
    (state.table.rightEnd === null ||
      state.selectedPiece.left === state.table.rightEnd ||
      state.selectedPiece.right === state.table.rightEnd);

  const selectedPieceFits = canFitLeft || canFitRight;

  // Só pode comprar se não tiver uma peça selecionada que foi comprada neste turno
  const hasUnplayedDrawnPiece =
    state.selectedPiece !== null &&
    !state.players[state.currentPlayerIndex].hand.find(
      (p) => p.id === state.selectedPiece?.id
    );
  const canDraw =
    state.phase === "playing" &&
    state.drawPile.length > 0 &&
    !hasUnplayedDrawnPiece;
  const canChooseInitial =
    state.phase === "choosing-initial" && state.drawPile.length > 0;
  
  // Permite selecionar peças da mão se já comprou do monte OU se o monte está vazio
  const canSelectFromHand =
    state.phase === "playing" &&
    (state.hasDrawnPieceThisTurn || state.drawPile.length === 0);

  const handleStartGame = (player1Name: string, player2Name: string) => {
    initializeGame(player1Name, player2Name);
    setShowHomeScreen(false);
    dispatch({ type: "START_GAME" });
  };

  const handleChooseInitialPiece = (pieceId: string) => {
    dispatch({ type: "CHOOSE_INITIAL_PIECE", pieceId });
  };

  const handleDrawPiece = (pieceId: string) => {
    dispatch({ type: "DRAW_PIECE", pieceId });
  };

  const handlePlayPiece = (position: "left" | "right") => {
    if (state.selectedPiece) {
      dispatch({
        type: "PLAY_PIECE",
        pieceId: state.selectedPiece.id,
        position,
      });
    }
  };

  const handleBluff = () => {
    if (state.selectedPiece) {
      dispatch({ type: "BLUFF", pieceId: state.selectedPiece.id });
    }
  };

  const handleSelectPieceFromHand = (pieceId: string) => {
    dispatch({ type: "SELECT_PIECE", pieceId });
  };

  // Ref para rastrear a última peça selecionada que não encaixa
  const lastNonFittingPieceRef = useRef<string | null>(null);
  const autoAddTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Efeito para adicionar automaticamente à mão quando peça não encaixa
  useEffect(() => {
    // Limpa timer anterior se existir
    if (autoAddTimerRef.current) {
      clearTimeout(autoAddTimerRef.current);
      autoAddTimerRef.current = null;
    }

    if (
      state.phase === "playing" &&
      state.selectedPiece &&
      !selectedPieceFits &&
      (state.hasDrawnPieceThisTurn || state.drawPile.length === 0) &&
      lastNonFittingPieceRef.current !== state.selectedPiece.id
    ) {
      // Marca que esta peça já foi processada
      lastNonFittingPieceRef.current = state.selectedPiece.id;
      
      // Adiciona à mão automaticamente após 2.5 segundos (tempo para ver o modal)
      autoAddTimerRef.current = setTimeout(() => {
        const currentPlayer = state.players[state.currentPlayerIndex];
        const pieceInHand = currentPlayer.hand.find(
          (p) => p.id === state.selectedPiece?.id
        );
        
        // Se a peça ainda não está na mão, adiciona
        if (!pieceInHand && state.selectedPiece) {
          dispatch({ type: "AUTO_ADD_TO_HAND" });
        }
        autoAddTimerRef.current = null;
      }, 2500);
    } else if (!state.selectedPiece) {
      // Reset quando não há peça selecionada
      lastNonFittingPieceRef.current = null;
    }

    return () => {
      if (autoAddTimerRef.current) {
        clearTimeout(autoAddTimerRef.current);
        autoAddTimerRef.current = null;
      }
    };
  }, [state.selectedPiece, selectedPieceFits, state.phase, state.hasDrawnPieceThisTurn, state.drawPile.length, state.players, state.currentPlayerIndex, dispatch]);

  const handleAbandonGame = () => {
    setShowAbandonModal(true);
  };

  const confirmAbandonGame = () => {
    dispatch({ type: "RESET_GAME" });
    setShowHomeScreen(true);
    setShowAbandonModal(false);
  };

  // Mostra a tela inicial se ainda não iniciou o jogo
  if (showHomeScreen || state.phase === "setup") {
    return <HomeScreen onStartGame={handleStartGame} />;
  }

  return (
    <div className="app">
      <motion.header
        className="app-header"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="app-title">DomiMais</h1>
        <div className="app-header-info">
          <div className="game-info__item">
            <span className="game-info__label">Fase:</span>
            <span className="game-info__value">
              {state.phase === "choosing-initial" ? "Escolhendo peça inicial" : state.phase}
            </span>
          </div>
          <div className="game-info__item">
            <span className="game-info__label">Jogador:</span>
            <span className="game-info__value">{currentPlayer.name}</span>
          </div>
          <div className="game-info__item">
            <span className="game-info__label">Monte:</span>
            <span className="game-info__value">
              {state.drawPile.length} peças
            </span>
          </div>
          <motion.button
            className="btn btn--danger"
            onClick={handleAbandonGame}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Abandonar partida"
          >
            Sair
          </motion.button>
        </div>
      </motion.header>

      <div className="game-container">
        {/* Mensagem para escolher peça inicial */}
        <AnimatePresence>
          {state.phase === "choosing-initial" && (
            <motion.div
              className="choose-initial-message"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <p className="choose-initial-message__text">
                {currentPlayer.name}, escolha a peça inicial do monte
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fase de Jogo */}
        <AnimatePresence>
          {state.phase === "playing" &&
            state.selectedPiece &&
            selectedPieceFits && (
              <motion.div
                className="bluff-action-container"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <motion.button
                  className="btn btn--warning"
                  onClick={handleBluff}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Blefar (fingir que não encaixa)
                </motion.button>
              </motion.div>
            )}
        </AnimatePresence>


        {/* Mesa do Jogo */}
        <GameTable
          table={state.table}
          selectedPiece={state.selectedPiece}
          canFitLeft={canFitLeft || false}
          canFitRight={canFitRight || false}
          onPlayPiece={handlePlayPiece}
        />

        {/* Container com Jogadores e Monte */}
        <div className="players-and-pile-container">
          {/* Jogadores */}
          <div className="players-section">
            <h2>Jogadores</h2>
            <div className="players-grid">
              {state.players.map((player, index) => {
                const isCurrentPlayer = player.id === currentPlayer.id;
                return (
                  <motion.div
                    key={player.id}
                    className={`player-card ${isCurrentPlayer ? "player-card--active" : ""
                      }`}
                    initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <h3>{player.name}</h3>
                    <div className="player-stats">
                      <div className="player-stat">
                        <span className="player-stat__label">Peças:</span>
                        <span className="player-stat__value">
                          {player.hand.length +
                            (isCurrentPlayer &&
                              state.selectedPiece &&
                              !player.hand.find(
                                (p) => p.id === state.selectedPiece?.id
                              )
                              ? 1
                              : 0)}
                        </span>
                      </div>
                      {state.phase === "finished" && (
                        <div className="player-stat">
                          <span className="player-stat__label">Pontuação:</span>
                          <span className="player-stat__value">
                            {player.score}
                          </span>
                        </div>
                      )}
                    </div>
                    {(player.hand.length > 0 ||
                      (isCurrentPlayer && state.selectedPiece)) && (
                        <div className="player-hand">
                          <AnimatePresence mode="popLayout">
                            {player.hand.map((piece) => {
                              const isSelected =
                                state.selectedPiece?.id === piece.id;
                              // Permite selecionar peças da mão se:
                              // 1. É o jogador atual
                              // 2. Está na fase de jogo
                              // 3. Já comprou uma peça do monte nesta rodada OU o monte está vazio
                              const canSelect =
                                isCurrentPlayer &&
                                state.phase === "playing" &&
                                (state.hasDrawnPieceThisTurn || state.drawPile.length === 0);

                              return (
                                <motion.div
                                  key={piece.id}
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.8 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <DominoPiece
                                    piece={piece}
                                    size="small"
                                    isFaceUp={
                                      (isCurrentPlayer && state.activePlayerVisible) ||
                                      state.phase === "finished"
                                    }
                                    isSelected={isSelected}
                                    onClick={
                                      canSelect
                                        ? () =>
                                          handleSelectPieceFromHand(piece.id)
                                        : undefined
                                    }
                                  />
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>
                          {/* Mostra a peça selecionada do monte na mão do jogador atual */}
                          {isCurrentPlayer &&
                            state.selectedPiece &&
                            !player.hand.find(
                              (p) => p.id === state.selectedPiece?.id
                            ) && (
                              <AnimatePresence mode="wait">
                                <motion.div
                                  key={`selected-drawn-${state.selectedPiece.id}`}
                                  layoutId={`piece-${state.selectedPiece.id}`}
                                  initial={{
                                    scale: 0.5,
                                    opacity: 0,
                                    rotate: -180,
                                  }}
                                  animate={{
                                    scale: 1,
                                    opacity: 1,
                                    rotate: 0,
                                  }}
                                  exit={{
                                    opacity: 0,
                                    scale: 0.5,
                                  }}
                                  transition={{
                                    type: "spring",
                                    stiffness: 300,
                                    damping: 25,
                                    duration: 0.8,
                                  }}
                                >
                                  <DominoPiece
                                    piece={state.selectedPiece}
                                    size="small"
                                    isFaceUp={
                                      state.activePlayerVisible ||
                                      state.phase === "finished"
                                    }
                                    isSelected={true}
                                  />
                                  {/* Botão de Blefe quando a peça encaixa */}
                                  {selectedPieceFits && (
                                    <motion.button
                                      className="btn btn--warning btn--small bluff-hand-button"
                                      onClick={handleBluff}
                                      initial={{ opacity: 0, y: -10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ delay: 0.4 }}
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                    >
                                      Blefar
                                    </motion.button>
                                  )}
                                </motion.div>
                              </AnimatePresence>
                            )}
                        </div>
                      )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Monte de Peças */}
          {(canDraw || canChooseInitial) && (
            <DrawPile
              pieces={state.drawPile}
              onSelectPiece={canChooseInitial ? handleChooseInitialPiece : handleDrawPiece}
              disabled={false}
              isChoosingInitial={canChooseInitial}
            />
          )}
        </div>

        {/* Logs */}
        {/* <motion.div
          className="logs-section"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <h3>Histórico</h3>
          <div className="logs-container">
            {state.logs.map((log, index) => (
              <motion.div
                key={index}
                className="log-entry"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                {log}
              </motion.div>
            ))}
          </div>
        </motion.div> */}
      </div>

      {/* Modais */}
      <GameModal
        type={currentModal}
        onClose={closeModal}
        currentPlayerName={currentPlayer.name}
        nextPlayerName={nextPlayer.name}
        winnerName={winnerName}
        winnerScore={winnerScore}
      />

      {/* Modal de Confirmação para Abandonar */}
      <Modal
        isOpen={showAbandonModal}
        onClose={() => setShowAbandonModal(false)}
        title="Abandonar Partida"
        type="warning"
        showCloseButton={false}
      >
        <p style={{ marginBottom: '20px', textAlign: 'center' }}>
          Tem certeza que deseja abandonar a partida? Todo o progresso será perdido.
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn btn--danger"
            onClick={confirmAbandonGame}
            style={{ flex: 1 }}
          >
            Sim, Abandonar
          </button>
          <button
            className="btn btn--secondary"
            onClick={() => setShowAbandonModal(false)}
            style={{ flex: 1 }}
          >
            Cancelar
          </button>
        </div>
      </Modal>
    </div>
  );
}

function App() {
  return (
    <GameProvider>
      <GameContent />
    </GameProvider>
  );
}

export default App;
