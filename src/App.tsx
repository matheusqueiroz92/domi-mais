import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { GameProvider } from "./game/state/game-context";
import { useGame } from "./game/state/use-game";
import { canKeepPiece } from "./game/logic/engine";
import {
  getCurrentPlayer,
  getSelectedPiece,
  getSelectedPlayableSides,
  getWinners,
  mustDraw,
} from "./game/logic/selectors";
import type { GamePhase, GameState } from "./game/state/game-types";
import { DominoPiece } from "./components/DominoPiece";
import { GameTable } from "./components/GameTable";
import { DrawPile } from "./components/DrawPile";
import { HomeScreen } from "./components/HomeScreen";
import { Modal } from "./components/Modal";
import { TurnTransition } from "./components/TurnTransition";
import "./App.css";

const PHASE_LABELS: Record<GamePhase, string> = {
  setup: "Preparação",
  "choosing-initial": "Escolha da peça inicial",
  transition: "Troca de turno",
  playing: "Em jogo",
  finished: "Partida encerrada",
};

/** Mensagem que orienta o jogador da vez sobre o que fazer agora. */
function getStatusMessage(state: GameState): string | null {
  const player = getCurrentPlayer(state);

  if (state.phase === "choosing-initial") {
    return `${player.name}, escolha a peça inicial do monte`;
  }
  if (state.phase !== "playing") return null;

  const passed = state.autoPassedPlayerIndexes
    .map((index) => state.players[index].name)
    .join(" e ");
  const passNotice = passed
    ? `${passed} ${
        state.autoPassedPlayerIndexes.length > 1 ? "não têm" : "não tem"
      } peça que encaixa e ${
        state.autoPassedPlayerIndexes.length > 1 ? "passaram" : "passou"
      } a vez. `
    : "";

  if (mustDraw(state)) {
    return `${passNotice}${player.name}, compre uma peça do monte`;
  }
  if (canKeepPiece(state)) {
    return `${player.name}, jogue uma peça em uma das pontas ou fique com a peça comprada`;
  }
  return `${passNotice}Monte vazio: ${player.name}, jogue uma peça que encaixe`;
}

function GameContent() {
  const { state, dispatch, initializeGame } = useGame();
  const [showHomeScreen, setShowHomeScreen] = useState(true);
  const [showAbandonModal, setShowAbandonModal] = useState(false);
  const [resultDismissed, setResultDismissed] = useState(false);

  const currentPlayer = getCurrentPlayer(state);
  const selectedPiece = getSelectedPiece(state);
  const playableSides = getSelectedPlayableSides(state);
  const isPlaying = state.phase === "playing";
  const isFinished = state.phase === "finished";
  const canSelectFromHand = isPlaying && state.turnStep === "play";
  const showDrawPile = state.phase === "choosing-initial" || mustDraw(state);
  const statusMessage = getStatusMessage(state);
  const winners = getWinners(state);
  const winner = winners.length === 1 ? winners[0] : null;
  const tiedNames = winners.map((player) => player.name).join(" e ");

  const handleStartGame = (playerNames: string[]) => {
    initializeGame(playerNames);
    dispatch({ type: "START_GAME" });
    setResultDismissed(false);
    setShowHomeScreen(false);
  };

  const handlePilePiece = (pieceId: string) => {
    dispatch({
      type: state.phase === "choosing-initial" ? "CHOOSE_INITIAL_PIECE" : "DRAW_PIECE",
      pieceId,
    });
  };

  const handlePlayPiece = (position: "left" | "right") => {
    if (selectedPiece) {
      dispatch({ type: "PLAY_PIECE", pieceId: selectedPiece.id, position });
    }
  };

  const backToHome = () => {
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
            <span className="game-info__value">{PHASE_LABELS[state.phase]}</span>
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
          {isFinished ? (
            <button className="btn btn--primary" onClick={backToHome}>
              Nova partida
            </button>
          ) : (
            <button
              className="btn btn--danger"
              onClick={() => setShowAbandonModal(true)}
              title="Abandonar partida"
            >
              Sair
            </button>
          )}
        </div>
      </motion.header>

      <div className="game-container">
        {/* Orientação para o jogador da vez */}
        {statusMessage && (
          <div className="choose-initial-message" role="status">
            <p className="choose-initial-message__text">{statusMessage}</p>
          </div>
        )}

        {/* Encerrar o turno sem jogar. O botão é o mesmo quando a peça não
            encaixa e quando o jogador está blefando: nada na tela denuncia o blefe. */}
        {canKeepPiece(state) && (
          <div className="bluff-action-container">
            <button
              className="btn btn--warning"
              onClick={() => dispatch({ type: "KEEP_PIECE" })}
            >
              Ficar com a peça
            </button>
          </div>
        )}

        {/* Mesa do Jogo */}
        <GameTable
          table={state.table}
          canFitLeft={playableSides.left}
          canFitRight={playableSides.right}
          onPlayPiece={handlePlayPiece}
        />

        {/* Container com Jogadores e Monte */}
        <div className="players-and-pile-container">
          <div className="players-section">
            <h2>Jogadores</h2>
            <div className="players-grid">
              {state.players.map((player, index) => {
                const isCurrentPlayer = index === state.currentPlayerIndex;
                // A mão só fica aberta para o jogador da vez, durante o turno
                // dele. Na troca de turno (transition) ninguém vê nada.
                const handVisible = isFinished || (isCurrentPlayer && isPlaying);

                return (
                  <motion.div
                    key={player.id}
                    className={`player-card ${
                      isCurrentPlayer && !isFinished ? "player-card--active" : ""
                    }`}
                    data-testid={`player-card-${index}`}
                    initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <h3>{player.name}</h3>
                    <div className="player-stats">
                      <div className="player-stat">
                        <span className="player-stat__label">Peças:</span>
                        <span className="player-stat__value">
                          {player.hand.length}
                        </span>
                      </div>
                      {state.result && (
                        <div className="player-stat">
                          <span className="player-stat__label">Soma:</span>
                          <span className="player-stat__value">
                            {state.result.scores[index]}
                          </span>
                        </div>
                      )}
                    </div>
                    {player.hand.length > 0 && (
                      <div className="player-hand">
                        <AnimatePresence mode="popLayout">
                          {player.hand.map((piece) => (
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
                                isFaceUp={handVisible}
                                isSelected={
                                  isCurrentPlayer &&
                                  isPlaying &&
                                  state.selectedPieceId === piece.id
                                }
                                onClick={
                                  isCurrentPlayer && canSelectFromHand
                                    ? () =>
                                        dispatch({
                                          type: "SELECT_PIECE",
                                          pieceId: piece.id,
                                        })
                                    : undefined
                                }
                              />
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Monte de Peças */}
          {showDrawPile && (
            <DrawPile
              pieces={state.drawPile}
              onSelectPiece={handlePilePiece}
              isChoosingInitial={state.phase === "choosing-initial"}
            />
          )}
        </div>
      </div>

      {/* Troca de turno protegida: cobre a tela até o próximo jogador confirmar */}
      {state.phase === "transition" && (
        <TurnTransition
          playerName={currentPlayer.name}
          onReady={() => dispatch({ type: "CONFIRM_READY" })}
        />
      )}

      {/* Resultado da partida */}
      <Modal
        isOpen={isFinished && !resultDismissed}
        onClose={() => setResultDismissed(true)}
        title={winner ? "🎉 Fim de jogo!" : "🤝 Empate!"}
        type="success"
        showCloseButton={false}
      >
        {state.result && (
          <>
            <p style={{ marginBottom: "12px", textAlign: "center" }}>
              {state.result.reason === "empty-hand"
                ? winner
                  ? `${winner.name} venceu: ficou sem peças na mão!`
                  : `Empate entre ${tiedNames}: ficaram sem peças na mão.`
                : winner
                  ? `Jogo fechado. ${winner.name} venceu com a menor soma!`
                  : `Jogo fechado. Empate entre ${tiedNames}, com a menor soma.`}
            </p>
            <p style={{ marginBottom: "20px", textAlign: "center" }}>
              {state.players
                .map((player, index) => `${player.name}: ${state.result?.scores[index]}`)
                .join(" · ")}
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button className="btn btn--primary" onClick={backToHome} style={{ flex: 1 }}>
                Nova partida
              </button>
              <button
                className="btn btn--secondary"
                onClick={() => setResultDismissed(true)}
                style={{ flex: 1 }}
              >
                Ver a mesa
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* Modal de Confirmação para Abandonar */}
      <Modal
        isOpen={showAbandonModal}
        onClose={() => setShowAbandonModal(false)}
        title="Abandonar Partida"
        type="warning"
        showCloseButton={false}
      >
        <p style={{ marginBottom: "20px", textAlign: "center" }}>
          Tem certeza que deseja abandonar a partida? Todo o progresso será perdido.
        </p>
        <div style={{ display: "flex", gap: "12px" }}>
          <button className="btn btn--danger" onClick={backToHome} style={{ flex: 1 }}>
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
