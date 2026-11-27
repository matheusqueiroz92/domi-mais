import { useState } from 'react';
import { Modal } from './Modal';
import { RulesContent } from './RulesContent';
import { SoundToggle } from './SoundToggle';
import { ThemeToggle } from './ThemeToggle';
import { BagIcon, ChevronIcon, CpuIcon, GlobeIcon, UsersIcon } from './icons';
import { PartnersFooter } from './PartnersFooter';
import { PHYSICAL_GAME } from '../home/physical-game';
import { MAX_PLAYERS, MIN_PLAYERS } from '../game/logic/rules';
import { BOT_LEVEL_LABELS, BOT_NAMES } from '../game/ai/bot';
import type { BotLevel } from '../game/state/game-types';
import type { Theme } from '../theme/theme';
import { formatMatchCount } from '../stats/match-stats';
import './HomeScreen.css';
import { Wordmark } from './Wordmark';

interface HomeScreenProps {
  /**
   * Recebe os nomes dos jogadores (de 2 a 4), na ordem dos turnos, e, no modo
   * contra o computador, o nível de cada jogador do computador (`null` = pessoa).
   */
  onStartGame: (playerNames: string[], botLevels?: (BotLevel | null)[]) => void;
  theme: Theme;
  onToggleTheme: () => void;
  soundOn: boolean;
  onToggleSound: () => void;
  /** Inicia a partida guiada. */
  onStartTutorial: () => void;
  /** Abre direto a configuração da partida contra o computador (vindo do tutorial). */
  openBotSetup?: boolean;
  /** Partida guardada neste aparelho, se houver: nomes dos jogadores e peças no monte. */
  savedGame?: { playerNames: string[]; pileCount: number } | null;
  onResumeGame?: () => void;
  onDiscardSavedGame?: () => void;
  /** O navegador permite instalar o jogo como aplicativo. */
  canInstall?: boolean;
  onInstall?: () => void;
  /** Modo online: criar ou entrar em uma sala. Devolvem `true` quando deu certo. */
  onCreateRoom?: (name: string) => Promise<boolean>;
  onJoinRoom?: (code: string, name: string) => Promise<boolean>;
  onlineBusy?: boolean;
  onlineError?: string | null;
  /** Código vindo de um link de convite: abre a entrada já preenchida. */
  inviteCode?: string | null;
  /** Nome usado da última vez no modo online. */
  savedName?: string;
  /** Sala online guardada neste aparelho, para voltar. */
  savedRoomCode?: string | null;
  onResumeRoom?: () => void;
  onLeaveSavedRoom?: () => void;
  /** Total de partidas jogadas no DomiMais (`null` = ainda não carregou ou sem servidor). */
  matchCount?: number | null;
}

export function HomeScreen({
  onStartGame,
  theme,
  onToggleTheme,
  soundOn,
  onToggleSound,
  onStartTutorial,
  openBotSetup = false,
  savedGame = null,
  onResumeGame,
  onDiscardSavedGame,
  canInstall = false,
  onInstall,
  onCreateRoom,
  onJoinRoom,
  onlineBusy = false,
  onlineError = null,
  inviteCode = null,
  savedName = '',
  savedRoomCode = null,
  onResumeRoom,
  onLeaveSavedRoom,
  matchCount = null,
}: HomeScreenProps) {
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showBotModal, setShowBotModal] = useState(openBotSetup);
  const [soloName, setSoloName] = useState('');
  const [botCount, setBotCount] = useState(1);
  const [botLevel, setBotLevel] = useState<BotLevel>('medium');
  const [playerCount, setPlayerCount] = useState(MIN_PLAYERS);
  const [names, setNames] = useState<string[]>(() => Array(MAX_PLAYERS).fill(''));
  const [showOnlineModal, setShowOnlineModal] = useState(inviteCode !== null);
  const [onlineName, setOnlineName] = useState(savedName);
  const [roomCode, setRoomCode] = useState(inviteCode ?? '');
  const onlineEnabled = Boolean(onCreateRoom && onJoinRoom);
  const hasOnlineName = onlineName.trim().length > 0;
  const hasRoomCode = roomCode.trim().length > 0;

  const playerNames = names.slice(0, playerCount).map((name) => name.trim());
  const canStart = playerNames.every((name) => name.length > 0);
  const countOptions = Array.from(
    { length: MAX_PLAYERS - MIN_PLAYERS + 1 },
    (_, index) => MIN_PLAYERS + index
  );

  const handleNameChange = (index: number, value: string) => {
    setNames((current) => current.map((name, i) => (i === index ? value : name)));
  };

  const handleStartGame = () => {
    if (canStart) {
      onStartGame(playerNames);
    }
  };

  const canStartSolo = soloName.trim().length > 0;

  const handleStartSolo = () => {
    if (!canStartSolo) return;
    const bots = BOT_NAMES.slice(0, botCount);
    onStartGame([soloName.trim(), ...bots], [null, ...bots.map(() => botLevel)]);
  };

  return (
    <main className="home">
      <div className="home__topbar">
        <Wordmark />
        <div className="home__actions">
          <SoundToggle soundOn={soundOn} onToggle={onToggleSound} />
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </div>

      {/*
        Celular: uma coluna, nesta ordem. Telas grandes (a partir de 900 px): grade
        de duas colunas (25/11/2026). Em cima, a imagem e os três modos de jogo com a
        mesma altura; embaixo, a chamada e o contador ao lado de Tutorial, Como jogar
        e Dominó físico, também com a mesma altura.
      */}
      <div className="home__layout">
        <img
          className="home__logo"
          src="/logo-domi-mais.jpeg"
          alt="DomiMais: o nome do jogo montado com peças de dominó sobre feltro verde"
          width={1280}
          height={853}
        />

        <div className="home__intro">
          <h1 className="home__title">Blefe. Deduza. Vença.</h1>
          <p className="home__subtitle">
            O verso de cada peça entrega só a soma. O resto é com você.
          </p>
          {matchCount != null && (
            <p className="home__counter" aria-live="polite">
              <strong>{formatMatchCount(matchCount)}</strong> partidas jogadas
            </p>
          )}
        </div>

        {(savedRoomCode || savedGame) && (
          <div className="home__resume">
            {savedRoomCode && (
              <section className="resume" aria-label="Sala online">
                <div className="resume__text">
                  <span className="resume__title">Sala online {savedRoomCode}</span>
                  <span className="resume__desc">Você estava nesta sala</span>
                </div>
                <div className="resume__actions">
                  <button type="button" className="btn" onClick={onLeaveSavedRoom} disabled={onlineBusy}>
                    Sair da sala
                  </button>
                  <button type="button" className="btn btn--primary" onClick={onResumeRoom} disabled={onlineBusy}>
                    Voltar
                  </button>
                </div>
              </section>
            )}

            {savedGame && (
              <section className="resume" aria-label="Partida em andamento">
                <div className="resume__text">
                  <span className="resume__title">Partida em andamento</span>
                  <span className="resume__desc">
                    {savedGame.playerNames.join(', ')} ·{' '}
                    {savedGame.pileCount === 1
                      ? '1 peça no monte'
                      : `${savedGame.pileCount} peças no monte`}
                  </span>
                </div>
                <div className="resume__actions">
                  <button type="button" className="btn" onClick={onDiscardSavedGame}>
                    Descartar
                  </button>
                  <button type="button" className="btn btn--primary" onClick={onResumeGame}>
                    Continuar
                  </button>
                </div>
              </section>
            )}
          </div>
        )}

        <div className="home__modes">
          <button
            type="button"
            className="mode mode--primary"
            onClick={() => setShowPlayerModal(true)}
          >
            <UsersIcon size={28} />
            <span className="mode__text">
              <span className="mode__title">Mesmo aparelho</span>
              <span className="mode__desc">De 2 a 4 jogadores, cada um por si</span>
            </span>
            <ChevronIcon />
          </button>
          <button type="button" className="mode mode--button" onClick={() => setShowBotModal(true)}>
            <CpuIcon size={28} />
            <span className="mode__text">
              <span className="mode__title">Contra o computador</span>
              <span className="mode__desc">Jogue sozinho, com 1 a 3 adversários</span>
            </span>
            <ChevronIcon />
          </button>
          {onlineEnabled ? (
            <button type="button" className="mode mode--button" onClick={() => setShowOnlineModal(true)}>
              <GlobeIcon size={28} />
              <span className="mode__text">
                <span className="mode__title">Online com amigos</span>
                <span className="mode__desc">Sala por código, cada um no seu aparelho</span>
              </span>
              <ChevronIcon />
            </button>
          ) : (
            <div className="mode">
              <GlobeIcon size={28} />
              <span className="mode__text">
                <span className="mode__title">Online com amigos</span>
                <span className="mode__desc">Sala por código, sem cadastro</span>
              </span>
              <span className="mode__soon">Em breve</span>
            </div>
          )}
        </div>

        <div className="home__more">
          <div className="home__learn">
            <button type="button" className="btn" onClick={onStartTutorial}>
              Tutorial
            </button>
            <button type="button" className="btn" onClick={() => setShowRules(true)}>
              Como jogar
            </button>
          </div>

          <button type="button" className="shop" onClick={() => setShowShop(true)}>
            <BagIcon size={24} />
            <span className="mode__text">
              <span className="shop__title">Dominó físico</span>
              <span className="mode__desc">Para jogar na mesa</span>
            </span>
            {!PHYSICAL_GAME.buyUrl && <span className="mode__soon">Em breve</span>}
            <ChevronIcon />
          </button>

          {canInstall && (
            <button type="button" className="btn btn--block" onClick={onInstall}>
              Instalar no aparelho
            </button>
          )}
        </div>
      </div>

      <footer className="home__footer">
        <PartnersFooter />

        <div className="credits">
          <p>© {new Date().getFullYear()} DomiMais. Todos os direitos reservados.</p>
          <p>
            Jogo criado por <strong>Cassiano Ribeiro</strong>. Versão digital desenvolvida por{' '}
            <a href="https://matheusqueiroz.dev.br" target="_blank" rel="noopener noreferrer">
              Matheus Queiroz
            </a>
            .
          </p>
        </div>
      </footer>

      <Modal isOpen={showShop} onClose={() => setShowShop(false)} title="Dominó físico">
        <div className="shop-modal">
          <img className="shop-modal__image" src={PHYSICAL_GAME.image} alt={PHYSICAL_GAME.imageAlt} />
          {PHYSICAL_GAME.buyUrl ? (
            <>
              <p>O DomiMais também existe em peças de verdade, para jogar na mesa com a família e os amigos.</p>
              <a className="btn btn--primary btn--block" href={PHYSICAL_GAME.buyUrl} target="_blank" rel="noopener noreferrer">
                Comprar
              </a>
            </>
          ) : (
            <>
              <p className="shop-modal__soon">Em breve!</p>
              <p>
                Estamos finalizando a fabricação do DomiMais em peças de verdade. Em breve as vendas estarão
                disponíveis aqui.
              </p>
            </>
          )}
        </div>
      </Modal>

      <Modal isOpen={showRules} onClose={() => setShowRules(false)} title="Como jogar">
        <RulesContent />
      </Modal>

      <Modal
        isOpen={showOnlineModal}
        onClose={() => setShowOnlineModal(false)}
        title="Jogar online"
        showCloseButton={false}
      >
        <form
          className="player-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (hasOnlineName && hasRoomCode) void onJoinRoom?.(roomCode, onlineName);
          }}
        >
          <div className="player-form__field">
            <label htmlFor="online-name" className="player-form__label">
              Seu nome
            </label>
            <input
              id="online-name"
              type="text"
              className="player-form__input"
              placeholder="Como os outros vão ver você"
              value={onlineName}
              maxLength={20}
              autoComplete="nickname"
              onChange={(e) => setOnlineName(e.target.value)}
              autoFocus
            />
          </div>

          <button
            type="button"
            className="btn btn--primary btn--block"
            disabled={!hasOnlineName || onlineBusy}
            onClick={() => void onCreateRoom?.(onlineName)}
          >
            Criar uma sala
          </button>

          <p className="online-form__or">ou entre na sala de um amigo</p>

          <div className="player-form__field">
            <label htmlFor="room-code" className="player-form__label">
              Código da sala
            </label>
            <input
              id="room-code"
              type="text"
              className="player-form__input online-form__code"
              placeholder="Ex.: K7M2Q"
              value={roomCode}
              maxLength={7}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            />
          </div>

          {onlineError && (
            <p className="online-form__error" role="alert">
              {onlineError}
            </p>
          )}

          <div className="modal__actions">
            <button type="button" className="btn" onClick={() => setShowOnlineModal(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary" disabled={!hasOnlineName || !hasRoomCode || onlineBusy}>
              Entrar na sala
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showBotModal}
        onClose={() => setShowBotModal(false)}
        title="Contra o computador"
        showCloseButton={false}
      >
        <div className="player-form">
          <div className="player-form__field">
            <label htmlFor="solo-name" className="player-form__label">
              Seu nome
            </label>
            <input
              id="solo-name"
              type="text"
              className="player-form__input"
              placeholder="Digite o seu nome"
              value={soloName}
              maxLength={16}
              onChange={(e) => setSoloName(e.target.value)}
              autoFocus
            />
          </div>

          <fieldset className="player-count">
            <legend className="player-form__label">Quantos adversários?</legend>
            <div className="player-count__options">
              {BOT_NAMES.map((_, index) => {
                const count = index + 1;
                return (
                  <label
                    key={count}
                    className={`player-count__option ${
                      botCount === count ? 'player-count__option--active' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="bot-count"
                      value={count}
                      checked={botCount === count}
                      onChange={() => setBotCount(count)}
                    />
                    {count} {count === 1 ? 'adversário' : 'adversários'}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="player-count">
            <legend className="player-form__label">Dificuldade</legend>
            <div className="player-count__options">
              {(Object.keys(BOT_LEVEL_LABELS) as BotLevel[]).map((level) => (
                <label
                  key={level}
                  className={`player-count__option ${
                    botLevel === level ? 'player-count__option--active' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="bot-level"
                    value={level}
                    checked={botLevel === level}
                    onChange={() => setBotLevel(level)}
                  />
                  {BOT_LEVEL_LABELS[level]}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="modal__actions">
            <button type="button" className="btn" onClick={() => setShowBotModal(false)}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleStartSolo}
              disabled={!canStartSolo}
            >
              Jogar
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showPlayerModal}
        onClose={() => setShowPlayerModal(false)}
        title="Quem vai jogar?"
        showCloseButton={false}
      >
        <div className="player-form">
          <fieldset className="player-count">
            <legend className="player-form__label">Quantos jogadores?</legend>
            <div className="player-count__options">
              {countOptions.map((count) => (
                <label
                  key={count}
                  className={`player-count__option ${
                    playerCount === count ? 'player-count__option--active' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="player-count"
                    value={count}
                    checked={playerCount === count}
                    onChange={() => setPlayerCount(count)}
                  />
                  {count} jogadores
                </label>
              ))}
            </div>
          </fieldset>

          {Array.from({ length: playerCount }, (_, index) => (
            <div className="player-form__field" key={index}>
              <label htmlFor={`player${index + 1}`} className="player-form__label">
                Nome do Jogador {index + 1}
              </label>
              <input
                id={`player${index + 1}`}
                type="text"
                className="player-form__input"
                placeholder={`Digite o nome do jogador ${index + 1}`}
                value={names[index]}
                maxLength={16}
                onChange={(e) => handleNameChange(index, e.target.value)}
                autoFocus={index === 0}
              />
            </div>
          ))}

          <div className="modal__actions">
            <button type="button" className="btn" onClick={() => setShowPlayerModal(false)}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleStartGame}
              disabled={!canStart}
            >
              Iniciar Jogo
            </button>
          </div>
        </div>
      </Modal>
    </main>
  );
}
