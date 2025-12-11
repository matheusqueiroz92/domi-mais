import { motion, AnimatePresence } from "framer-motion";
import { GameProvider, useGame } from "./game/state/game-context";
import { DominoPiece } from "./components/DominoPiece";
import { GameTable } from "./components/GameTable";
import { GameModal } from "./components/GameModal";
import { DrawPile } from "./components/DrawPile";
import { useGameModals } from "./hooks/useGameModals";
import "./App.css";

function GameContent() {
  const { state, dispatch } = useGame();
  const { currentModal, closeModal } = useGameModals(state);

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
  const canEndTurn =
    state.phase === "transition" ||
    (state.phase === "playing" &&
      state.selectedPiece !== null &&
      !selectedPieceFits);

  const handleStartGame = () => {
    dispatch({ type: "START_GAME" });
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

  const handleEndTurn = () => {
    dispatch({ type: "END_TURN" });
  };

  return (
    <div className="app">
      <motion.header
        className="app-header"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="app-title">DomeMais</h1>
        <div className="app-header-info">
          {state.phase === "setup" ? (
            <motion.button
              className="btn btn--primary"
              onClick={handleStartGame}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              Iniciar Jogo
            </motion.button>
          ) : (
            <>
              <div className="game-info__item">
                <span className="game-info__label">Fase:</span>
                <span className="game-info__value">{state.phase}</span>
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
            </>
          )}
        </div>
      </motion.header>

      <div className="game-container">
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

        {/* Botão Finalizar Turno */}
        <AnimatePresence>
          {canEndTurn && (
            <motion.div
              className="end-turn-container"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              <motion.button
                className="btn btn--primary btn--large"
                onClick={handleEndTurn}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Finalizar Turno
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
                    className={`player-card ${
                      isCurrentPlayer ? "player-card--active" : ""
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
                            // Permite selecionar peças da mão apenas se:
                            // 1. É o jogador atual
                            // 2. Está na fase de jogo
                            // 3. Já comprou uma peça do monte nesta rodada
                            const canSelect =
                              isCurrentPlayer &&
                              state.phase === "playing" &&
                              state.hasDrawnPieceThisTurn;

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
                                    isCurrentPlayer && state.activePlayerVisible
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
                                  isFaceUp={state.activePlayerVisible}
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
          {canDraw && (
            <DrawPile
              pieces={state.drawPile}
              onSelectPiece={handleDrawPiece}
              disabled={false}
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
      />
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
