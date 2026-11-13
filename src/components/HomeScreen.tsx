import { useState } from 'react';
import { Modal } from './Modal';
import { DominoPiece } from './DominoPiece';
import { RulesContent } from './RulesContent';
import { SoundToggle } from './SoundToggle';
import { ThemeToggle } from './ThemeToggle';
import { ChevronIcon, CpuIcon, GlobeIcon, UsersIcon } from './icons';
import { MAX_PLAYERS, MIN_PLAYERS } from '../game/logic/rules';
import { BOT_LEVEL_LABELS, BOT_NAMES } from '../game/ai/bot';
import type { BotLevel, DominoPiece as DominoPieceType } from '../game/state/game-types';
import type { Theme } from '../theme/theme';
import './HomeScreen.css';

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
}

// Peças do exemplo "soma 7 pode ser...", só ilustrativas.
const example = (left: number, right: number): DominoPieceType => ({
  id: `exemplo-${left}-${right}`,
  left,
  right,
  sum: left + right,
  isFaceUp: true,
});
const EXAMPLE_PIECES = [example(1, 6), example(2, 5), example(3, 4)];

export function HomeScreen({
  onStartGame,
  theme,
  onToggleTheme,
  soundOn,
  onToggleSound,
  onStartTutorial,
  openBotSetup = false,
}: HomeScreenProps) {
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showBotModal, setShowBotModal] = useState(openBotSetup);
  const [soloName, setSoloName] = useState('');
  const [botCount, setBotCount] = useState(1);
  const [botLevel, setBotLevel] = useState<BotLevel>('medium');
  const [playerCount, setPlayerCount] = useState(MIN_PLAYERS);
  const [names, setNames] = useState<string[]>(() => Array(MAX_PLAYERS).fill(''));

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
        <span className="wordmark">DomiMais</span>
        <div className="home__actions">
          <SoundToggle soundOn={soundOn} onToggle={onToggleSound} />
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </div>

      <div className="home__layout">
        <img
          className="home__logo"
          src="/logo-domi-mais.jpeg"
          alt="DomiMais: o nome do jogo montado com peças de dominó sobre feltro verde"
          width={1280}
          height={853}
        />

        <div className="home__content">
          <div className="home__intro">
            <h1 className="home__title">Blefe. Deduza. Vença.</h1>
            <p className="home__subtitle">
              O verso de cada peça entrega só a soma. O resto é com você.
            </p>
          </div>

          <div className="home__example" aria-label="Exemplo: uma peça de soma 7 pode ser 1|6, 2|5 ou 3|4">
            <DominoPiece piece={{ ...EXAMPLE_PIECES[0], isFaceUp: false }} isFaceUp={false} back="md" />
            <span className="home__example-text">pode ser</span>
            {EXAMPLE_PIECES.map((piece) => (
              <DominoPiece key={piece.id} piece={piece} isFaceUp half={19} orientation="vertical" />
            ))}
          </div>

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
            <div className="mode">
              <GlobeIcon size={28} />
              <span className="mode__text">
                <span className="mode__title">Online com amigos</span>
                <span className="mode__desc">Sala por código, sem cadastro</span>
              </span>
              <span className="mode__soon">Em breve</span>
            </div>
          </div>

          <div className="home__learn">
            <button type="button" className="btn" onClick={onStartTutorial}>
              Tutorial
            </button>
            <button type="button" className="btn" onClick={() => setShowRules(true)}>
              Como jogar
            </button>
          </div>
        </div>
      </div>

      <Modal isOpen={showRules} onClose={() => setShowRules(false)} title="Como jogar">
        <RulesContent />
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
