import { useState } from 'react';
import { Modal } from './Modal';
import { DominoPiece } from './DominoPiece';
import { RulesContent } from './RulesContent';
import { SoundToggle } from './SoundToggle';
import { ThemeToggle } from './ThemeToggle';
import { ChevronIcon, CpuIcon, GlobeIcon, UsersIcon } from './icons';
import { MAX_PLAYERS, MIN_PLAYERS } from '../game/logic/rules';
import type { DominoPiece as DominoPieceType } from '../game/state/game-types';
import type { Theme } from '../theme/theme';
import './HomeScreen.css';

interface HomeScreenProps {
  /** Recebe os nomes dos jogadores (de 2 a 4), na ordem dos turnos. */
  onStartGame: (playerNames: string[]) => void;
  theme: Theme;
  onToggleTheme: () => void;
  soundOn: boolean;
  onToggleSound: () => void;
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
}: HomeScreenProps) {
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showRules, setShowRules] = useState(false);
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
            <div className="mode">
              <CpuIcon size={28} />
              <span className="mode__text">
                <span className="mode__title">Contra o computador</span>
                <span className="mode__desc">Jogue sozinho, com 1 a 3 adversários</span>
              </span>
              <span className="mode__soon">Em breve</span>
            </div>
            <div className="mode">
              <GlobeIcon size={28} />
              <span className="mode__text">
                <span className="mode__title">Online com amigos</span>
                <span className="mode__desc">Sala por código, sem cadastro</span>
              </span>
              <span className="mode__soon">Em breve</span>
            </div>
          </div>

          <button type="button" className="btn btn--block" onClick={() => setShowRules(true)}>
            Como jogar
          </button>
        </div>
      </div>

      <Modal isOpen={showRules} onClose={() => setShowRules(false)} title="Como jogar">
        <RulesContent />
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
