import { useCallback, useEffect, useState } from "react";
import { MotionConfig } from "framer-motion";
import clsx from "clsx";
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
import type { BotLevel, GameAction, GameState } from "./game/state/game-types";
import { useBotTurns } from "./game/ai/useBotTurns";
import { DominoPiece } from "./components/DominoPiece";
import { GameTable, SHUFFLE_SECONDS } from "./components/GameTable";
import { DrawPile } from "./components/DrawPile";
import { HintPanel } from "./components/HintPanel";
import { HintToggle } from "./components/HintToggle";
import { HomeScreen } from "./components/HomeScreen";
import { Modal } from "./components/Modal";
import { OpponentSeat } from "./components/OpponentSeat";
import { PlayerHand } from "./components/PlayerHand";
import { RulesContent } from "./components/RulesContent";
import { SoundToggle } from "./components/SoundToggle";
import { ThemeToggle } from "./components/ThemeToggle";
import { TurnTransition } from "./components/TurnTransition";
import { TutorialCoach } from "./components/TutorialCoach";
import { ExitIcon, HelpIcon } from "./components/icons";
import { createScatter, seatOpponents } from "./components/table-layout";
import type { ScatterPoint } from "./components/table-layout";
import { useSound } from "./sound/useSound";
import { useMediaQuery } from "./components/useMediaQuery";
import { useTheme } from "./theme/useTheme";
import { usePersistentFlag } from "./hooks/usePersistentFlag";
import { TUTORIAL_PLAYERS, createTutorialSetup } from "./tutorial/script";
import { useTutorial } from "./tutorial/useTutorial";
import "./App.css";

/**
 * Índice de quem está olhando para a tela. Com uma única pessoa na partida
 * (contra o computador) é sempre ela; no mesmo aparelho é o jogador da vez.
 */
function getViewerIndex(state: GameState): number {
  const humans = state.players
    .map((player, index) => (player.botLevel === null ? index : -1))
    .filter((index) => index !== -1);
  return humans.length === 1 ? humans[0] : state.currentPlayerIndex;
}

/**
 * Ação mais recente de outro jogador, para a pessoa acompanhar o que o
 * computador fez. O registro é neutro: nunca diz se a peça encaixava.
 */
function getLastOpponentAction(state: GameState, viewerIndex: number): string | null {
  const ownPrefix = `${state.players[viewerIndex].name} `;
  for (let i = state.logs.length - 1; i >= 0; i--) {
    const log = state.logs[i];
    if (log.startsWith("Vez de ") || log.startsWith("Jogo iniciado")) continue;
    if (log.startsWith(ownPrefix)) continue;
    return log;
  }
  return null;
}

/** Mensagem que orienta o jogador da vez sobre o que fazer agora. */
function getStatusMessage(state: GameState, viewerIndex: number): string | null {
  const player = getCurrentPlayer(state);
  const isViewerTurn = state.currentPlayerIndex === viewerIndex;

  if (state.phase === "choosing-initial") {
    return isViewerTurn
      ? `${player.name}, escolha a peça inicial do monte`
      : `${player.name} está escolhendo a peça inicial…`;
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

  if (!isViewerTurn) {
    // Vez do computador: nada aqui revela se a peça dele encaixa.
    return mustDraw(state)
      ? `${passNotice}${player.name} está comprando uma peça…`
      : `${passNotice}${player.name} está decidindo a jogada…`;
  }

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

/** Chave da preferência do modo "dica" no navegador. */
export const HINTS_STORAGE_KEY = "domimais:hints";

/** Telas grandes: a partida ocupa a janela inteira, sem rolagem. */
const WIDE_SCREEN = "(min-width: 1024px) and (min-height: 640px)";

function GameContent() {
  const { state, dispatch, initializeGame } = useGame();
  const { theme, toggleTheme } = useTheme();
  const { soundOn, toggleSound, play } = useSound();
  const isWide = useMediaQuery(WIDE_SCREEN);
  // Trajetos da animação de embaralhar; `null` quando ela não está em andamento.
  const [shuffle, setShuffle] = useState<ScatterPoint[][] | null>(null);
  const [showHomeScreen, setShowHomeScreen] = useState(true);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [resultDismissed, setResultDismissed] = useState(false);
  const [hintsOn, toggleHints] = usePersistentFlag(HINTS_STORAGE_KEY, false);
  // Vindo do fim do tutorial: a tela inicial já abre na partida contra o computador.
  const [openBotSetup, setOpenBotSetup] = useState(false);

  const currentPlayer = getCurrentPlayer(state);
  const viewerIndex = getViewerIndex(state);
  const viewer = state.players[viewerIndex];
  const isViewerTurn = state.currentPlayerIndex === viewerIndex;
  const hasBots = state.players.some((player) => player.botLevel !== null);
  // Seleção e pontas jogáveis só valem na vez de quem está olhando: durante a
  // vez do computador a tela não pode mostrar se a peça dele encaixa.
  const selectedPiece = isViewerTurn ? getSelectedPiece(state) : null;
  const playableSides = isViewerTurn
    ? getSelectedPlayableSides(state)
    : { left: false, right: false };
  const isPlaying = state.phase === "playing";
  const isFinished = state.phase === "finished";
  const inTransition = state.phase === "transition";
  const isShuffling = shuffle !== null;
  const pileMode = !isViewerTurn
    ? "idle"
    : state.phase === "choosing-initial"
      ? "choose-initial"
      : mustDraw(state)
        ? "draw"
        : "idle";
  // As mãos só aparecem durante o turno. Na troca de turno ninguém vê nada.
  const showHands = isPlaying || state.phase === "choosing-initial";
  const statusMessage = isShuffling
    ? "Embaralhando as peças…"
    : getStatusMessage(state, viewerIndex);
  const lastOpponentAction =
    hasBots && isPlaying && !isShuffling ? getLastOpponentAction(state, viewerIndex) : null;
  const canKeep = isViewerTurn && canKeepPiece(state);
  const lastPlayed = state.lastPlayed;
  // A peça abre ao chegar à mesa quando vem virada: do monte (peça inicial)
  // ou da mão de um jogador do computador.
  const flipPieceId =
    lastPlayed &&
    (state.table.pieces.length === 1 || state.players[lastPlayed.playerIndex].botLevel !== null)
      ? lastPlayed.pieceId
      : null;
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
  // Quem está olhando para a tela fica embaixo; os outros, em volta da mesa.
  const seats = seatOpponents(state.players.length, viewerIndex);

  // Som das ações do computador.
  const handleBotAction = useCallback(
    (action: GameAction) => {
      if (action.type === "DRAW_PIECE") play("draw");
      if (action.type === "PLAY_PIECE" || action.type === "CHOOSE_INITIAL_PIECE") play("place");
    },
    [play]
  );

  // Partida guiada: a adversária segue o roteiro e a pessoa só faz a ação pedida.
  const tutorial = useTutorial(dispatch, { onBotAction: handleBotAction });
  const inTutorial = tutorial.active;
  const expected = tutorial.expected;
  /** Ação da pessoa: no tutorial passa pelo roteiro; fora dele vai direto ao jogo. */
  const act = (action: GameAction) => (inTutorial ? tutorial.perform(action) : dispatch(action));

  // No celular a tela rola: a cada passo do tutorial, o que deve ser tocado
  // (peça do monte ou botão) é trazido para a área visível.
  const tutorialStepIndex = inTutorial ? tutorial.stepIndex : null;
  useEffect(() => {
    if (tutorialStepIndex === null) return;
    const target = document.querySelector(".pile__tile--target, .btn--target");
    target?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [tutorialStepIndex]);

  // O computador joga sozinho na vez dele; espera o embaralhar e as janelas abertas.
  useBotTurns(state, dispatch, {
    paused: showHomeScreen || isShuffling || showRules || showExitModal || inTutorial,
    onAction: handleBotAction,
  });
  const tutorialAllowsSide = (side: "left" | "right") =>
    !inTutorial || (expected?.type === "PLAY_PIECE" && expected.position === side);
  // Guia: cartão do tutorial ou, com as dicas ligadas, o painel de dicas.
  const hasGuide = !isFinished && (inTutorial || hintsOn);
  const hasSideSeats = seats.left !== null || seats.right !== null;

  const handleStartTutorial = () => {
    // Monte em ordem fixa e sem animação de embaralhar: o roteiro começa na hora.
    initializeGame(TUTORIAL_PLAYERS, [null, "easy"], createTutorialSetup());
    dispatch({ type: "START_GAME" });
    setResultDismissed(false);
    setShuffle(null);
    setOpenBotSetup(false);
    setShowHomeScreen(false);
    tutorial.start();
  };

  const handleStartGame = (playerNames: string[], botLevels?: (BotLevel | null)[]) => {
    tutorial.stop();
    setOpenBotSetup(false);
    initializeGame(playerNames, botLevels);
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
    act({
      type: state.phase === "choosing-initial" ? "CHOOSE_INITIAL_PIECE" : "DRAW_PIECE",
      pieceId,
    });
  };

  const handlePlayPiece = (position: "left" | "right") => {
    if (selectedPiece) {
      play("place");
      act({ type: "PLAY_PIECE", pieceId: selectedPiece.id, position });
    }
  };

  const backToHome = (botSetup = false) => {
    tutorial.stop();
    setOpenBotSetup(botSetup);
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
        onStartTutorial={handleStartTutorial}
        openBotSetup={openBotSetup}
      />
    );
  }

  return (
    <main
      className={clsx(
        "game",
        isFinished && "game--finished",
        hasGuide && "game--guided",
        inTutorial && "game--tutorial"
      )}
    >
      <header className="game__header">
        <span className="wordmark">DomiMais</span>
        <div className="game__actions">
          {!inTutorial && <HintToggle hintsOn={hintsOn} onToggle={toggleHints} />}
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
            onClick={isFinished ? () => backToHome() : () => setShowExitModal(true)}
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
                active={isPlaying && !isShuffling && index === state.currentPlayerIndex}
                testId={`seat-${index}`}
              />
            );
          })}
        <GameTable
          table={state.table}
          initialPieceId={state.initialPieceId}
          fitHeight={isWide && !isFinished}
          shuffle={shuffle ? { pieces: state.drawPile, paths: shuffle } : null}
          lastPlayedId={lastPlayed?.pieceId ?? null}
          flipPieceId={flipPieceId}
          canFitLeft={playableSides.left && tutorialAllowsSide("left")}
          canFitRight={playableSides.right && tutorialAllowsSide("right")}
          onPlayPiece={handlePlayPiece}
        />
      </div>

      {/* Guia ao lado da mesa (embaixo dela no celular): cartão do tutorial ou
          painel de dicas. O lugar fica reservado para a mesa não mudar de tamanho. */}
      {hasGuide && (
        <aside className="game__guide">
          {inTutorial && tutorial.step ? (
            <TutorialCoach
              step={tutorial.step}
              stepIndex={tutorial.stepIndex}
              totalSteps={tutorial.totalSteps}
              botBusy={tutorial.botBusy}
              isLastStep={tutorial.isLastStep}
              onNext={tutorial.next}
              onExit={() => backToHome()}
              onPlayComputer={() => backToHome(true)}
            />
          ) : (
            <HintPanel
              key={`${state.currentPlayerIndex}-${state.turnStep}-${state.drawPile.length}`}
              state={state}
              playerIndex={viewerIndex}
              hidden={!isViewerTurn || isShuffling || inTransition}
            />
          )}
        </aside>
      )}

      {/* Parte de baixo. No celular os itens ficam empilhados; em telas
          grandes, o monte fica à esquerda e a mão do jogador à direita. */}
      {!isFinished && (
        <div className="game__bottom">
          <div className="game__pile-col">
            {isShuffling && (
              <button type="button" className="btn btn--block game__skip" onClick={() => setShuffle(null)}>
                Pular animação
              </button>
            )}
            <DrawPile
              order={state.initialPileOrder}
              pieces={state.drawPile}
              mode={isShuffling || (inTutorial && !tutorial.pilePieceId) ? "idle" : pileMode}
              onlyPieceId={tutorial.pilePieceId}
              hideTiles={isShuffling}
              onSelectPiece={handlePilePiece}
            />
          </div>

          <div className="game__me-col">
            {/* Orientação para o jogador da vez */}
            {!inTutorial && statusMessage && (
              <p className="game__status" role="status">
                {statusMessage}
              </p>
            )}

            {/* Contra o computador: o espaço fica reservado para a tela não pular. */}
            {hasBots && !inTutorial && (
              <p className="game__last-action">
                {lastOpponentAction && `Última jogada: ${lastOpponentAction}`}
              </p>
            )}

            {showHands && !isShuffling && (
              <PlayerHand
                player={viewer}
                selectedPieceId={isViewerTurn ? state.selectedPieceId : null}
                drawnPieceId={isViewerTurn ? state.drawnPieceId : null}
                canSelect={
                  isViewerTurn &&
                  isPlaying &&
                  state.turnStep === "play" &&
                  (!inTutorial || expected?.type === "PLAY_PIECE")
                }
                onSelectPiece={(pieceId) => act({ type: "SELECT_PIECE", pieceId })}
              />
            )}

            {/* Encerrar o turno sem jogar. Para o motor é sempre a mesma ação
                (KEEP_PIECE); o texto muda só na tela do próprio jogador: "Passar a
                vez" quando nada encaixa, "Ficar com a peça" quando ele poderia jogar.
                O espaço do botão fica reservado em telas grandes. */}
            <div className="game__keep">
              {canKeep && (!inTutorial || expected?.type === "KEEP_PIECE") && (
                <button
                  type="button"
                  className={`btn btn--block ${inTutorial ? "btn--target" : ""}`}
                  onClick={() => act({ type: "KEEP_PIECE" })}
                >
                  {hasPlayablePiece ? "Ficar com a peça" : "Passar a vez"}
                </button>
              )}
            </div>
          </div>
        </div>
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
          <button type="button" className="btn btn--primary btn--block" onClick={() => backToHome()}>
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
              <button type="button" className="btn btn--primary" onClick={() => backToHome()}>
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
          <button type="button" className="btn btn--danger" onClick={() => backToHome()}>
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
