import { useEffect, useState } from "react";
import { MotionConfig } from "framer-motion";
import { GameProvider } from "./game/state/game-context";
import { useGame } from "./game/state/use-game";
import { canKeepPiece } from "./game/logic/engine";
import {
  currentPlayerCanPlay,
  getCurrentPlayer,
  getSelectedPiece,
  getSelectedPlayableSides,
  getWinners,
  mustDraw,
} from "./game/logic/selectors";
import type { GameState } from "./game/state/game-types";
import { DominoPiece } from "./components/DominoPiece";
import { GameTable, SHUFFLE_SECONDS } from "./components/GameTable";
import { DrawPile } from "./components/DrawPile";
import { HomeScreen } from "./components/HomeScreen";
import { Modal } from "./components/Modal";
import { OpponentSeat } from "./components/OpponentSeat";
import { PlayerHand } from "./components/PlayerHand";
import { RulesContent } from "./components/RulesContent";
import { SoundToggle } from "./components/SoundToggle";
import { ThemeToggle } from "./components/ThemeToggle";
import { TurnTransition } from "./components/TurnTransition";
import { ExitIcon, HelpIcon } from "./components/icons";
import { createScatter, seatOpponents } from "./components/table-layout";
import type { ScatterPoint } from "./components/table-layout";
import { useSound } from "./sound/useSound";
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
    // Só o próprio jogador vê esta mensagem: ela não é registrada no histórico.
    return currentPlayerCanPlay(state)
      ? `${player.name}, jogue uma peça em uma das pontas ou fique com a peça comprada`
      : `${player.name}, nenhuma peça da sua mão encaixa na mesa`;
  }
  return `${passNotice}Monte vazio: ${player.name}, jogue uma peça que encaixe`;
}

function GameContent() {
  const { state, dispatch, initializeGame } = useGame();
  const { theme, toggleTheme } = useTheme();
  const { soundOn, toggleSound, play } = useSound();
  // Trajetos da animação de embaralhar; `null` quando ela não está em andamento.
  const [shuffle, setShuffle] = useState<ScatterPoint[][] | null>(null);
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
  const isShuffling = shuffle !== null;
  const pileMode =
    state.phase === "choosing-initial" ? "choose-initial" : mustDraw(state) ? "draw" : "idle";
  // As mãos só aparecem durante o turno. Na troca de turno ninguém vê nada.
  const showHands = isPlaying || state.phase === "choosing-initial";
  const statusMessage = isShuffling ? "Embaralhando as peças…" : getStatusMessage(state);
  const canKeep = canKeepPiece(state);
  const hasPlayablePiece = currentPlayerCanPlay(state);

  // A mistura dura pouco: depois dela as peças se enfileiram no monte.
  useEffect(() => {
    if (!isShuffling) return;
    const timer = window.setTimeout(() => setShuffle(null), SHUFFLE_SECONDS * 1000 + 100);
    return () => window.clearTimeout(timer);
  }, [isShuffling]);
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

    // Quem pede menos movimento no sistema pula a animação de embaralhar.
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (!reduceMotion) {
      setShuffle(createScatter(28));
      play("shuffle");
    }
  };

  const handlePilePiece = (pieceId: string) => {
    play(state.phase === "choosing-initial" ? "place" : "draw");
    dispatch({
      type: state.phase === "choosing-initial" ? "CHOOSE_INITIAL_PIECE" : "DRAW_PIECE",
      pieceId,
    });
  };

  const handlePlayPiece = (position: "left" | "right") => {
    if (selectedPiece) {
      play("place");
      dispatch({ type: "PLAY_PIECE", pieceId: selectedPiece.id, position });
    }
  };

  const backToHome = () => {
    dispatch({ type: "RESET_GAME" });
    setShuffle(null);
    setShowHomeScreen(true);
    setShowExitModal(false);
  };

  // Mostra a tela inicial se ainda não iniciou o jogo
  if (showHomeScreen || state.phase === "setup") {
    return (
      <HomeScreen
        onStartGame={handleStartGame}
        theme={theme}
        onToggleTheme={toggleTheme}
        soundOn={soundOn}
        onToggleSound={toggleSound}
      />
    );
  }

  return (
    <main className="game">
      <header className="game__header">
        <span className="wordmark">DomiMais</span>
        <div className="game__actions">
          <SoundToggle soundOn={soundOn} onToggle={toggleSound} />
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
          shuffle={shuffle ? { pieces: state.drawPile, paths: shuffle } : null}
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

      {isShuffling && (
        <button type="button" className="btn btn--block" onClick={() => setShuffle(null)}>
          Pular animação
        </button>
      )}

      {!isFinished && (
        <DrawPile
          order={state.initialPileOrder}
          pieces={state.drawPile}
          mode={isShuffling ? "idle" : pileMode}
          hideTiles={isShuffling}
          onSelectPiece={handlePilePiece}
        />
      )}

      {showHands && !isShuffling && (
        <PlayerHand
          player={currentPlayer}
          selectedPieceId={state.selectedPieceId}
          drawnPieceId={state.drawnPieceId}
          canSelect={isPlaying && state.turnStep === "play"}
          onSelectPiece={(pieceId) => dispatch({ type: "SELECT_PIECE", pieceId })}
        />
      )}

      {/* Encerrar o turno sem jogar. Para o motor é sempre a mesma ação
          (KEEP_PIECE); o texto muda só na tela do próprio jogador: "Passar a
          vez" quando nada encaixa, "Ficar com a peça" quando ele poderia jogar. */}
      {canKeep && (
        <button
          type="button"
          className="btn btn--block"
          onClick={() => dispatch({ type: "KEEP_PIECE" })}
        >
          {hasPlayablePiece ? "Ficar com a peça" : "Passar a vez"}
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
    // reducedMotion="user": respeita quem pede menos movimento no sistema.
    <MotionConfig reducedMotion="user">
      <GameProvider>
        <GameContent />
      </GameProvider>
    </MotionConfig>
  );
}

export default App;
