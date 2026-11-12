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
import type { GameState } from "./game/state/game-types";
import { DominoPiece } from "./components/DominoPiece";
import { GameTable } from "./components/GameTable";
import { DrawPile } from "./components/DrawPile";
import { HomeScreen } from "./components/HomeScreen";
import { Modal } from "./components/Modal";
import { OpponentSeat } from "./components/OpponentSeat";
import { PlayerHand } from "./components/PlayerHand";
import { RulesContent } from "./components/RulesContent";
import { ThemeToggle } from "./components/ThemeToggle";
import { TurnTransition } from "./components/TurnTransition";
import { ExitIcon, HelpIcon } from "./components/icons";
import { seatOpponents } from "./components/table-layout";
import { useTheme } from "./theme/useTheme";
import "./App.css";

/** Mensagem que orienta o jogador da vez sobre o que fazer agora. */
function getStatusMessage(state: GameState): string | null {
  const player = getCurrentPlayer(state);

  if (state.phase === "choosing-initial") {
    return `${player.name}, escolha a peça inicial do monte`;
  }
  if (state.phase !== "playing") return null;

  const passedCount = state.autoPassedPlayerIndexes.length;
  const passed = state.autoPassedPlayerIndexes
    .map((index) => state.players[index].name)
    .join(" e ");
  const passNotice = passed
    ? `${passed} ${passedCount > 1 ? "não têm" : "não tem"} peça que encaixa e ${
        passedCount > 1 ? "passaram" : "passou"
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
  const { theme, toggleTheme } = useTheme();
  const [showHomeScreen, setShowHomeScreen] = useState(true);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [resultDismissed, setResultDismissed] = useState(false);

  const currentPlayer = getCurrentPlayer(state);
  const selectedPiece = getSelectedPiece(state);
  const playableSides = getSelectedPlayableSides(state);
  const isPlaying = state.phase === "playing";
  const isFinished = state.phase === "finished";
  const inTransition = state.phase === "transition";
  const showDrawPile = state.phase === "choosing-initial" || mustDraw(state);
  // As mãos só aparecem durante o turno. Na troca de turno ninguém vê nada.
  const showHands = isPlaying || state.phase === "choosing-initial";
  const statusMessage = getStatusMessage(state);
  const winners = getWinners(state);
  const winner = winners.length === 1 ? winners[0] : null;
  const tiedNames = winners.map((player) => player.name).join(" e ");
  // Quem está com o aparelho (o jogador da vez) fica embaixo; os outros, em volta da mesa.
  const seats = seatOpponents(state.players.length, state.currentPlayerIndex);
  const hasSideSeats = seats.left !== null || seats.right !== null;

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
    setShowExitModal(false);
  };

  // Mostra a tela inicial se ainda não iniciou o jogo
  if (showHomeScreen || state.phase === "setup") {
    return <HomeScreen onStartGame={handleStartGame} theme={theme} onToggleTheme={toggleTheme} />;
  }

  return (
    <main className="game">
      <header className="game__header">
        <span className="wordmark">DomiMais</span>
        <div className="game__actions">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <button
            type="button"
            className="icon-btn"
            aria-label="Como jogar"
            title="Como jogar"
            onClick={() => setShowRules(true)}
          >
            <HelpIcon />
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="Sair da partida"
            title="Sair da partida"
            onClick={isFinished ? backToHome : () => setShowExitModal(true)}
          >
            <ExitIcon />
          </button>
        </div>
      </header>

      <div className={`board ${hasSideSeats ? "board--sides" : ""}`}>
        {showHands &&
          (["top", "left", "right"] as const).map((position) => {
            const index = seats[position];
            return index === null ? null : (
              <OpponentSeat
                key={position}
                player={state.players[index]}
                position={position}
                testId={`seat-${index}`}
              />
            );
          })}
        <GameTable
          table={state.table}
          drawPile={state.drawPile}
          hidePileTiles={showDrawPile}
          canFitLeft={playableSides.left}
          canFitRight={playableSides.right}
          onPlayPiece={handlePlayPiece}
        />
      </div>

      {/* Orientação para o jogador da vez */}
      {statusMessage && (
        <p className="game__status" role="status">
          {statusMessage}
        </p>
      )}

      {showDrawPile && (
        <DrawPile
          pieces={state.drawPile}
          onSelectPiece={handlePilePiece}
          isChoosingInitial={state.phase === "choosing-initial"}
        />
      )}

      {showHands && (
        <PlayerHand
          player={currentPlayer}
          selectedPieceId={state.selectedPieceId}
          drawnPieceId={state.drawnPieceId}
          canSelect={isPlaying && state.turnStep === "play"}
          onSelectPiece={(pieceId) => dispatch({ type: "SELECT_PIECE", pieceId })}
        />
      )}

      {/* Encerrar o turno sem jogar. O botão é o mesmo quando a peça não
          encaixa e quando o jogador está blefando: nada na tela denuncia o blefe. */}
      {canKeepPiece(state) && (
        <button
          type="button"
          className="btn btn--block"
          onClick={() => dispatch({ type: "KEEP_PIECE" })}
        >
          Ficar com a peça
        </button>
      )}

      {/* Fim de jogo: todas as mãos abertas, com a soma de cada jogador */}
      {state.result && (
        <section className="final" aria-label="Resultado">
          <h2 className="final__title">Resultado</h2>
          {state.players.map((player, index) => (
            <div className="final__player" key={player.id} data-testid={`final-${index}`}>
              <div className="final__row">
                <span className="final__name">{player.name}</span>
                {state.result?.winnerIndexes.includes(index) && (
                  <span className="final__badge">{winner ? "Venceu" : "Empatou"}</span>
                )}
                <span className="final__sum">Soma {state.result?.scores[index]}</span>
              </div>
              <div className="final__pieces">
                {player.hand.length === 0 ? (
                  <span className="final__none">Sem peças na mão</span>
                ) : (
                  player.hand.map((piece) => (
                    <DominoPiece key={piece.id} piece={piece} isFaceUp half={18} />
                  ))
                )}
              </div>
            </div>
          ))}
          <button type="button" className="btn btn--primary btn--block" onClick={backToHome}>
            Nova partida
          </button>
        </section>
      )}

      {/* Troca de turno protegida: cobre a tela até o próximo jogador confirmar */}
      {inTransition && (
        <TurnTransition
          playerName={currentPlayer.name}
          onReady={() => dispatch({ type: "CONFIRM_READY" })}
        />
      )}

      <Modal isOpen={showRules} onClose={() => setShowRules(false)} title="Como jogar">
        <RulesContent />
      </Modal>

      {/* Resultado da partida */}
      <Modal
        isOpen={isFinished && !resultDismissed}
        onClose={() => setResultDismissed(true)}
        title={winner ? "Fim de jogo!" : "Empate!"}
        showCloseButton={false}
      >
        {state.result && (
          <>
            <p>
              {state.result.reason === "empty-hand"
                ? winner
                  ? `${winner.name} venceu: ficou sem peças na mão!`
                  : `Empate entre ${tiedNames}: ficaram sem peças na mão.`
                : winner
                  ? `Jogo fechado. ${winner.name} venceu com a menor soma!`
                  : `Jogo fechado. Empate entre ${tiedNames}, com a menor soma.`}
            </p>
            <p className="result-scores">
              {state.players
                .map((player, index) => `${player.name}: ${state.result?.scores[index]}`)
                .join(" · ")}
            </p>
            <div className="modal__actions">
              <button type="button" className="btn" onClick={() => setResultDismissed(true)}>
                Ver a mesa
              </button>
              <button type="button" className="btn btn--primary" onClick={backToHome}>
                Nova partida
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* Confirmação para sair */}
      <Modal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        title="Sair da partida?"
        showCloseButton={false}
      >
        <p>Todo o progresso desta partida será perdido.</p>
        <div className="modal__actions">
          <button type="button" className="btn" onClick={() => setShowExitModal(false)}>
            Continuar jogando
          </button>
          <button type="button" className="btn btn--danger" onClick={backToHome}>
            Sim, sair
          </button>
        </div>
      </Modal>
    </main>
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
