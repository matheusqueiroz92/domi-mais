import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
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
import { TurnAlert } from "./components/TurnAlert";
import { PwaNotice } from "./components/PwaNotice";
import { usePwa } from "./pwa/usePwa";
import { loadSavedGame } from "./game/state/saved-game";
import { ExitIcon, HelpIcon, HistoryIcon } from "./components/icons";
import { HistoryPanel } from "./components/HistoryPanel";
import { createScatter, seatOpponents } from "./components/table-layout";
import type { ScatterPoint } from "./components/table-layout";
import { useSound } from "./sound/useSound";
import { useMediaQuery } from "./components/useMediaQuery";
import { useTheme } from "./theme/useTheme";
import { usePersistentFlag } from "./hooks/usePersistentFlag";
import { TUTORIAL_PLAYERS, createTutorialSetup } from "./tutorial/script";
import { useTutorial } from "./tutorial/useTutorial";
import { inviteCodeFromUrl, readSavedName, useOnlineRoom } from "./online/useOnlineRoom";
import type { OnlineRoom } from "./online/useOnlineRoom";
import { OnlineGameProvider } from "./online/OnlineGameProvider";
import { LobbyScreen } from "./online/LobbyScreen";
import { TurnTimer } from "./online/TurnTimer";
import { ConnectionBanner } from "./online/ConnectionBanner";
import { useMatchCount } from "./stats/match-stats";
import { ChatPanel } from "./online/ChatPanel";
import { ChatIcon } from "./components/icons";
import type { SeatView } from "./online/protocol";
import { ONLINE_ENABLED } from "./online/config";
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

/** Situação de um adversário no modo online, mostrada junto do nome. */
function onlineSeatNote(seat: SeatView | undefined): string | undefined {
  if (!seat) return undefined;
  if (seat.left) return "Saiu da partida";
  if (seat.takenOver) return "Computador jogando";
  if (seat.kind === "human" && !seat.connected) return "Sem conexão";
  return undefined;
}

const prefersReducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/** Quantos turnos já começaram (cada um registra "Vez de ..."). */
function turnNumber(state: GameState): number {
  return state.logs.reduce((count, log) => (log.startsWith("Vez de ") ? count + 1 : count), 0);
}

/** O que fazer agora, na faixa "Sua vez!". */
function turnHint(state: GameState): string {
  if (state.phase === "choosing-initial") return "Escolha a peça inicial no monte";
  if (mustDraw(state)) return "Compre uma peça do monte";
  return canKeepPiece(state) ? "Jogue ou fique com a peça" : "Jogue uma peça que encaixe";
}

/** Título da aba do navegador fora da sua vez. */
const DEFAULT_TITLE = "DomiMais";

/** Chave da preferência do modo "dica" no navegador. */
export const HINTS_STORAGE_KEY = "domimais:hints";

/** Telas grandes: a partida ocupa a janela inteira, sem rolagem. */
const WIDE_SCREEN = "(min-width: 1024px) and (min-height: 640px)";
/** Celular (de pé): monte em 4 fileiras, adversários lado a lado em cima. */
const PHONE = "(max-width: 699px)";
/** Celular com altura para a partida caber inteira na tela, sem rolar. */
const TALL_PHONE = "(max-width: 699px) and (min-height: 760px)";

interface GameContentProps {
  online: OnlineRoom;
  /** Código de um link de convite ainda não usado. */
  invite?: string | null;
  onCreateRoom?: (name: string) => Promise<boolean>;
  onJoinRoom?: (code: string, name: string) => Promise<boolean>;
}

function GameContent({ online, invite = null, onCreateRoom, onJoinRoom }: GameContentProps) {
  const { state, dispatch, initializeGame, resumeGame, discardSavedGame } = useGame();
  // Partida online: o estado vem do servidor (OnlineGameProvider).
  const onlineView = online.view?.game ? online.view : null;
  const isOnline = onlineView !== null;
  const pwa = usePwa();
  const { theme, toggleTheme } = useTheme();
  const { soundOn, toggleSound, play } = useSound();
  const isWide = useMediaQuery(WIDE_SCREEN);
  const isPhone = useMediaQuery(PHONE);
  const isTallPhone = useMediaQuery(TALL_PHONE);
  // Trajetos da animação de embaralhar; `null` quando ela não está em andamento.
  // No online, a partida que acabou de começar abre com a mistura das peças.
  const [shuffle, setShuffle] = useState<ScatterPoint[][] | null>(() =>
    isOnline && state.table.pieces.length === 0 && state.drawPile.length === 28 && !prefersReducedMotion()
      ? createScatter(28)
      : null
  );
  const [showHomeScreen, setShowHomeScreen] = useState(true);
  // Muda sempre que a partida guardada pode ter mudado, para a tela inicial reler.
  const [savedGameVersion, setSavedGameVersion] = useState(0);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [resultDismissed, setResultDismissed] = useState(false);
  const [hintsOn, toggleHints] = usePersistentFlag(HINTS_STORAGE_KEY, false);
  // Vindo do fim do tutorial: a tela inicial já abre na partida contra o computador.
  const [openBotSetup, setOpenBotSetup] = useState(false);

  const currentPlayer = getCurrentPlayer(state);
  const viewerIndex = onlineView ? onlineView.youIndex : getViewerIndex(state);
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
  const canKeep = isViewerTurn && canKeepPiece(state);
  const lastPlayed = state.lastPlayed;
  // A peça abre ao chegar à mesa quando vem virada: do monte (peça inicial)
  // ou da mão de um jogador do computador.
  const flipPieceId =
    lastPlayed &&
    (state.table.pieces.length === 1 ||
      state.players[lastPlayed.playerIndex].botLevel !== null ||
      (isOnline && lastPlayed.playerIndex !== viewerIndex))
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

  // Online: som da partida que começa e das ações dos outros jogadores.
  const initialShuffle = useRef(shuffle !== null);
  useEffect(() => {
    if (initialShuffle.current) play("shuffle");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só ao abrir a partida
  }, []);
  const seen = useRef({ pile: state.drawPile.length, table: state.table.pieces.length });
  useEffect(() => {
    const before = seen.current;
    seen.current = { pile: state.drawPile.length, table: state.table.pieces.length };
    if (!isOnline) return;
    const othersTurn = state.currentPlayerIndex !== viewerIndex;
    if (state.drawPile.length < before.pile && othersTurn && state.table.pieces.length === before.table) {
      play("draw");
    }
    if (state.table.pieces.length > before.table && state.lastPlayed?.playerIndex !== viewerIndex) {
      play("place");
    }
  }, [isOnline, play, state.drawPile.length, state.table.pieces.length, state.currentPlayerIndex, state.lastPlayed, viewerIndex]);

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
  // O aviso fica no cabeçalho do monte. No online, um aviso do servidor
  // (tempo esgotado, alguém caiu ou voltou) vem antes. O que os outros
  // jogaram fica no histórico (botão do relógio).
  const pileMessage = inTutorial
    ? null
    : [isShuffling ? null : onlineView?.notice, statusMessage].filter(Boolean).join(" ") || null;
  const expected = tutorial.expected;
  /** Ação da pessoa: no tutorial passa pelo roteiro; fora dele vai direto ao jogo. */
  const act = (action: GameAction) => (inTutorial ? tutorial.perform(action) : dispatch(action));
  // Encerrar o turno sem jogar. Para o motor é sempre a mesma ação
  // (KEEP_PIECE); o texto muda só na tela do próprio jogador: "Passar a vez"
  // quando nada encaixa, "Ficar com a peça" quando ele poderia jogar.
  const keepButton =
    canKeep && (!inTutorial || expected?.type === "KEEP_PIECE") ? (
      <button
        type="button"
        className={`btn ${isPhone ? "btn--small" : "btn--block"} ${inTutorial ? "btn--target" : ""}`}
        onClick={() => act({ type: "KEEP_PIECE" })}
      >
        {hasPlayablePiece ? "Ficar com a peça" : "Passar a vez"}
      </button>
    ) : null;

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
    // No online quem joga pelo computador é o servidor.
    paused: showHomeScreen || isShuffling || showRules || showHistory || showExitModal || inTutorial || isOnline,
    onAction: handleBotAction,
  });
  const tutorialAllowsSide = (side: "left" | "right") =>
    !inTutorial || (expected?.type === "PLAY_PIECE" && expected.position === side);
  // Guia: cartão do tutorial ou, com as dicas ligadas, o painel de dicas.
  // Fim com mais de uma mão vazia: o resultado explica quem ficou sem peças primeiro.
  const severalEmptyHands = state.players.filter((p) => p.hand.length === 0).length > 1;
  // Fim porque a mesa fechou (pode acontecer com peças no monte).
  const closedEnd = state.result?.closedEnd;
  const closedNote =
    closedEnd === undefined
      ? ""
      : `Jogo fechado: as duas pontas são ${closedEnd} e todas as peças com ${closedEnd} já estão na mesa. `;
  const hasGuide = !isFinished && (inTutorial || hintsOn);
  // Celular: a partida ocupa a altura exata da tela e a mesa fica com o que
  // sobrar (as peças da mesa se ajustam a ela). Com tutorial ou dicas abertas,
  // a tela volta a rolar para o cartão caber.
  const fitPhone = isTallPhone && !hasGuide && !isFinished;

  // Aviso de "sua vez": online e contra o computador, onde há uma só pessoa na
  // tela. No mesmo aparelho a tela de troca de turno já faz esse papel, e no
  // tutorial o cartão guia cada passo.
  const turnAlerts = (isOnline || hasBots) && !inTutorial;
  const yourTurn =
    turnAlerts &&
    isViewerTurn &&
    (isPlaying || state.phase === "choosing-initial") &&
    !isShuffling;
  const turnKey = turnNumber(state);
  const playRef = useRef(play);
  useEffect(() => {
    playRef.current = play;
  }, [play]);
  useEffect(() => {
    if (!yourTurn) return;
    playRef.current("turn");
    // Celular: uma vibração curta (onde o navegador permite).
    try {
      navigator.vibrate?.([120, 60, 120]);
    } catch {
      // Sem vibração: o aviso na tela basta.
    }
  }, [yourTurn, turnKey]);
  useEffect(() => {
    // Quem trocou de aba vê no título que é a vez dele.
    document.title = yourTurn ? `● Sua vez — ${DEFAULT_TITLE}` : DEFAULT_TITLE;
  }, [yourTurn]);
  useEffect(() => () => {
    document.title = DEFAULT_TITLE;
  }, []);
  const hasSideSeats = seats.left !== null || seats.right !== null;
  const opponentCount = [seats.top, seats.left, seats.right].filter((seat) => seat !== null).length;

  const handleResumeGame = () => {
    if (!resumeGame()) {
      // A partida guardada sumiu ou estava inválida: a tela inicial se atualiza.
      setSavedGameVersion((version) => version + 1);
      return;
    }
    tutorial.stop();
    setResultDismissed(false);
    setShuffle(null);
    setOpenBotSetup(false);
    setShowHomeScreen(false);
  };

  const handleDiscardSavedGame = () => {
    discardSavedGame();
    setSavedGameVersion((version) => version + 1);
  };

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

  const isHost = onlineView?.seats[onlineView.youIndex]?.isHost ?? false;

  // Chat (online): mensagens novas dos outros desde a última vez que a janela abriu.
  const chatMessages = onlineView?.chat.messages ?? [];
  const lastChatId = chatMessages.length ? chatMessages[chatMessages.length - 1].id : 0;
  const [chatSeen, setChatSeen] = useState(lastChatId);
  const [showChat, setShowChat] = useState(false);
  const yourSeatId = onlineView?.seats[onlineView.youIndex]?.id;
  const unreadChat = showChat
    ? []
    : chatMessages.filter(
        (message) =>
          message.id > chatSeen && message.seatId !== yourSeatId && !online.muted.has(message.seatId)
      );
  const latestUnread = unreadChat.length ? unreadChat[unreadChat.length - 1] : null;
  const openChat = () => {
    setChatSeen(lastChatId);
    setShowChat(true);
  };
  const closeChat = () => {
    setChatSeen(lastChatId);
    setShowChat(false);
  };
  const onlineHost = onlineView?.seats.find((seat) => seat.isHost);
  const leaveOnline = () => {
    setShowExitModal(false);
    void online.leave();
  };

  const backToHome = (botSetup = false) => {
    // Sair de uma partida comum descarta a partida guardada; sair do tutorial
    // não mexe em uma partida guardada antes dele.
    if (!inTutorial) discardSavedGame();
    setSavedGameVersion((version) => version + 1);
    tutorial.stop();
    setOpenBotSetup(botSetup);
    dispatch({ type: "RESET_GAME" });
    setShuffle(null);
    setShowHomeScreen(true);
    setShowExitModal(false);
  };

  // Mostra a tela inicial se ainda não iniciou o jogo
  const onHome = !isOnline && (showHomeScreen || state.phase === "setup");
  // Partida guardada neste aparelho, mostrada na tela inicial como "Continuar".
  const savedGame = useMemo(() => {
    const saved = onHome ? loadSavedGame() : null;
    return saved
      ? { playerNames: saved.players.map((p) => p.name), pileCount: saved.drawPile.length }
      : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- relê quando a versão muda
  }, [onHome, savedGameVersion]);
  // Contador de partidas: relido sempre que a tela inicial aparece.
  const matchCount = useMatchCount(onHome);

  if (onHome) {
    return (
      <>
      <HomeScreen
        onStartGame={handleStartGame}
        theme={theme}
        onToggleTheme={toggleTheme}
        soundOn={soundOn}
        onToggleSound={toggleSound}
        onStartTutorial={handleStartTutorial}
        openBotSetup={openBotSetup}
        savedGame={savedGame}
        onResumeGame={handleResumeGame}
        onDiscardSavedGame={handleDiscardSavedGame}
        canInstall={pwa.canInstall}
        onInstall={pwa.install}
        onCreateRoom={onCreateRoom}
        onJoinRoom={onJoinRoom}
        onlineBusy={online.busy}
        onlineError={online.error}
        inviteCode={invite}
        savedName={readSavedName()}
        savedRoomCode={onCreateRoom ? (online.savedSession?.code ?? null) : null}
        onResumeRoom={() => void online.resume()}
        onLeaveSavedRoom={() => void online.leaveSaved()}
        matchCount={matchCount}
      />
      <Modal
        isOpen={online.closedReason !== null}
        onClose={online.dismissClosed}
        title="Você saiu da sala"
        showCloseButton={false}
      >
        <p>{online.closedReason}</p>
        <div className="modal__actions">
          <button type="button" className="btn btn--primary" onClick={online.dismissClosed}>
            Entendi
          </button>
        </div>
      </Modal>
      <PwaNotice pwa={pwa} />
      </>
    );
  }

  return (
    <main
      className={clsx(
        "game",
        isFinished && "game--finished",
        hasGuide && "game--guided",
        inTutorial && "game--tutorial",
        yourTurn && "game--your-turn",
        isOnline && "game--online",
        fitPhone && "game--fit"
      )}
    >
      {yourTurn && <TurnAlert key={turnKey} hint={turnHint(state)} />}
      <header className="game__header">
        <span className="wordmark">DomiMais</span>
        <div className="game__actions">
          {isOnline && (
            <button
              type="button"
              className="icon-btn chat-btn"
              onClick={openChat}
              aria-label={unreadChat.length ? `Chat: ${unreadChat.length} mensagens novas` : "Chat"}
              title="Chat"
            >
              <ChatIcon />
              {unreadChat.length > 0 && <span className="chat-btn__badge">{unreadChat.length}</span>}
            </button>
          )}
          {!inTutorial && <HintToggle hintsOn={hintsOn} onToggle={toggleHints} />}
          <SoundToggle soundOn={soundOn} onToggle={toggleSound} />
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          {!inTutorial && (
            <button
              type="button"
              className="icon-btn"
              aria-label="Histórico de jogadas"
              title="Histórico de jogadas"
              onClick={() => setShowHistory(true)}
            >
              <HistoryIcon />
            </button>
          )}
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
            onClick={
              isFinished ? (isOnline ? leaveOnline : () => backToHome()) : () => setShowExitModal(true)
            }
          >
            <ExitIcon />
          </button>
        </div>
      </header>

      <div
        className={`board ${hasSideSeats ? "board--sides" : ""}`}
        style={{ "--seats": opponentCount } as CSSProperties}
      >
        {showHands &&
          (["top", "left", "right"] as const).map((position) => {
            const index = seats[position];
            return index === null ? null : (
              <OpponentSeat
                key={position}
                player={state.players[index]}
                position={position}
                active={isPlaying && !isShuffling && index === state.currentPlayerIndex}
                note={onlineSeatNote(onlineView?.seats[index])}
                testId={`seat-${index}`}
              />
            );
          })}
        <GameTable
          table={state.table}
          initialPieceId={state.initialPieceId}
          fitHeight={(isWide || fitPhone) && !isFinished}
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
              columns={isPhone ? 7 : 14}
              collapseEmptyRows={isPhone}
              message={pileMessage}
              messageActive={isViewerTurn && !isShuffling}
            />
          </div>

          <div className="game__me-col">
            {/* Online: 60 segundos por jogada. */}
            {onlineView?.turnDeadline && !isShuffling && (
              <TurnTimer
                deadline={onlineView.turnDeadline}
                clockOffset={online.clockOffset}
                label={isViewerTurn ? "Seu tempo" : `Tempo de ${currentPlayer.name}`}
                onWarning={isViewerTurn ? () => play("warning") : undefined}
              />
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
                compact={isPhone}
                action={isPhone ? keepButton : null}
              />
            )}

            {/* Encerrar o turno sem jogar. Para o motor é sempre a mesma ação
                (KEEP_PIECE); o texto muda só na tela do próprio jogador: "Passar a
                vez" quando nada encaixa, "Ficar com a peça" quando ele poderia jogar.
                O espaço do botão fica reservado em telas grandes. */}
            {/* No celular o botão fica no cabeçalho da mão (sem espaço reservado). */}
            {!isPhone && <div className="game__keep">{keepButton}</div>}
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
          {isOnline ? (
            <OnlineFinishActions
              isHost={isHost}
              hostName={onlineHost?.name}
              onRestart={() => void online.restart()}
              onLeave={leaveOnline}
            />
          ) : (
            <button type="button" className="btn btn--primary btn--block" onClick={() => backToHome()}>
              Nova partida
            </button>
          )}
        </section>
      )}

      {/* Troca de turno protegida: cobre a tela até o próximo jogador confirmar */}
      {inTransition && (
        <TurnTransition
          playerName={currentPlayer.name}
          onReady={() => dispatch({ type: "CONFIRM_READY" })}
        />
      )}

      {/* Prévia da mensagem nova do chat (some sozinha). */}
      {latestUnread && (
        <button type="button" key={latestUnread.id} className="chat-toast" onClick={openChat}>
          <strong>{latestUnread.name}:</strong> {latestUnread.text}
        </button>
      )}

      {onlineView && (
        <Modal isOpen={showChat} onClose={closeChat} title="Chat da sala">
          <ChatPanel view={onlineView} online={online} hideTitle />
        </Modal>
      )}

      <Modal isOpen={showHistory} onClose={() => setShowHistory(false)} title="Histórico de jogadas">
        <HistoryPanel logs={state.logs} />
      </Modal>
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
              {closedNote}
              {state.result.reason === "empty-hand"
                ? winner
                  ? severalEmptyHands
                    ? `${closedNote ? "Mais de um jogador estava sem peças." : "O monte acabou com mais de um jogador sem peças."} ${winner.name} venceu: ficou sem peças primeiro!`
                    : `${winner.name} venceu: ficou sem peças na mão!`
                  : `Empate entre ${tiedNames}: ficaram sem peças na mão.`
                : winner
                  ? `${closedNote ? "" : "Jogo fechado. "}${winner.name} venceu com a menor soma!`
                  : `${closedNote ? "" : "Jogo fechado. "}Empate entre ${tiedNames}, com a menor soma.`}
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
              {!isOnline ? (
                <button type="button" className="btn btn--primary" onClick={() => backToHome()}>
                  Nova partida
                </button>
              ) : isHost ? (
                <button type="button" className="btn btn--primary" onClick={() => void online.restart()}>
                  Jogar de novo
                </button>
              ) : (
                <button type="button" className="btn btn--primary" onClick={leaveOnline}>
                  Sair da sala
                </button>
              )}
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
        <p>
          {isOnline
            ? "O computador vai jogar no seu lugar até o fim, e você não poderá voltar para esta partida."
            : "Todo o progresso desta partida será perdido."}
        </p>
        <div className="modal__actions">
          <button type="button" className="btn" onClick={() => setShowExitModal(false)}>
            Continuar jogando
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={isOnline ? leaveOnline : () => backToHome()}
          >
            Sim, sair
          </button>
        </div>
      </Modal>
      <PwaNotice pwa={pwa} />
    </main>
  );
}

/** Fim da partida online: o dono volta todos para a sala; os outros esperam ou saem. */
function OnlineFinishActions({
  isHost,
  hostName,
  onRestart,
  onLeave,
}: {
  isHost: boolean;
  hostName?: string;
  onRestart: () => void;
  onLeave: () => void;
}) {
  return (
    <div className="final__online">
      {!isHost && (
        <p className="final__wait">Aguardando {hostName ?? "o dono da sala"} começar outra partida…</p>
      )}
      <div className="modal__actions">
        <button type="button" className="btn" onClick={onLeave}>
          Sair da sala
        </button>
        {isHost && (
          <button type="button" className="btn btn--primary" onClick={onRestart}>
            Jogar de novo
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Escolhe a tela: sala de espera e partida online quando há uma sala;
 * senão, a tela inicial e as partidas neste aparelho.
 */
function Root({ onlineUrl, onlineEnabled }: { onlineUrl?: string; onlineEnabled: boolean }) {
  const online = useOnlineRoom(onlineUrl);
  // Link de convite (?sala=ABCDE): abre a entrada já preenchida, uma vez.
  const [invite, setInvite] = useState(() => (onlineEnabled ? inviteCodeFromUrl() : null));
  useEffect(() => {
    if (invite) window.history.replaceState(null, "", window.location.pathname);
  }, [invite]);

  const { create, join } = online;
  const onCreateRoom = useCallback(
    (name: string) => {
      setInvite(null);
      return create(name);
    },
    [create]
  );
  const onJoinRoom = useCallback(
    (code: string, name: string) => {
      setInvite(null);
      return join(code, name);
    },
    [join]
  );

  const view = online.view;
  return (
    <>
      {view?.status === "lobby" ? (
        <LobbyScreen online={online} />
      ) : view?.game ? (
        <OnlineGameProvider online={online}>
          <GameContent online={online} />
        </OnlineGameProvider>
      ) : (
        <GameContent
          online={online}
          invite={invite}
          onCreateRoom={onlineEnabled ? onCreateRoom : undefined}
          onJoinRoom={onlineEnabled ? onJoinRoom : undefined}
        />
      )}
      {view && !online.connected && <ConnectionBanner inLobby={view.status === 'lobby'} />}
      {view && online.error && (
        <p className="online-toast" role="alert">
          {online.error}
        </p>
      )}
    </>
  );
}

interface AppProps {
  /** Endereço do servidor online (testes). Sem ele, o mesmo domínio do jogo. */
  onlineUrl?: string;
  /** Mostrar o modo online (padrão: `ONLINE_ENABLED`). */
  onlineEnabled?: boolean;
}

function App({ onlineUrl, onlineEnabled = ONLINE_ENABLED }: AppProps = {}) {
  return (
    // reducedMotion="user": respeita quem pede menos movimento no sistema.
    <MotionConfig reducedMotion="user">
      <GameProvider>
        <Root onlineUrl={onlineUrl} onlineEnabled={onlineEnabled} />
      </GameProvider>
    </MotionConfig>
  );
}

export default App;
