import { motion } from 'framer-motion';
import { useState } from 'react';
import { Modal } from './Modal';
import { MAX_PLAYERS, MIN_PLAYERS } from '../game/logic/rules';
import './HomeScreen.css';

interface HomeScreenProps {
  /** Recebe os nomes dos jogadores (de 2 a 4), na ordem dos turnos. */
  onStartGame: (playerNames: string[]) => void;
}

export function HomeScreen({ onStartGame }: HomeScreenProps) {
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [playerCount, setPlayerCount] = useState(MIN_PLAYERS);
  const [names, setNames] = useState<string[]>(() => Array(MAX_PLAYERS).fill(''));

  const playerNames = names.slice(0, playerCount).map((name) => name.trim());
  const canStart = playerNames.every((name) => name.length > 0);
  const countOptions = Array.from(
    { length: MAX_PLAYERS - MIN_PLAYERS + 1 },
    (_, index) => MIN_PLAYERS + index
  );

  const handlePlayClick = () => {
    setShowPlayerModal(true);
  };

  const handleNameChange = (index: number, value: string) => {
    setNames((current) => current.map((name, i) => (i === index ? value : name)));
  };

  const handleStartGame = () => {
    if (canStart) {
      onStartGame(playerNames);
    }
  };

  return (
    <>
      <div className="home-screen">
        <motion.div
          className="home-screen__content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.h1
            className="home-screen__title"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <img src="/logo-domi-mais.jpeg" alt="DomiMais" className="home-screen__logo" width={700} height={350} />
          </motion.h1>

          <motion.div
            className="home-screen__rules"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <h2 className="home-screen__section-title">📋 Como Jogar</h2>

            <div className="home-screen__rule-section">
              <h3 className="home-screen__rule-title">🎯 Objetivo</h3>
              <p className="home-screen__rule-text">
                Vence quem ficar sem peças na mão. Se o jogo fechar (nenhuma
                peça encaixa), vence quem tiver a menor soma das peças da mão;
                quem empatar na menor soma divide a vitória.
              </p>
            </div>

            <div className="home-screen__rule-section">
              <h3 className="home-screen__rule-title">🎮 Funcionamento</h3>
              <p className="home-screen__rule-text">
                - Ninguém começa com peças: as 28 ficam no monte, viradas
              </p>
              <p className="home-screen__rule-text">
                - O verso de cada peça mostra a soma dos seus dois lados
              </p>
              <p className="home-screen__rule-text">
                - O jogador sorteado escolhe no monte a peça inicial da mesa
              </p>
              <p className="home-screen__rule-text">
                - Em cada turno você compra uma peça do monte e pode jogar uma
                peça que encaixe em uma das pontas, ou ficar com a peça
                comprada
              </p>
              <p className="home-screen__rule-text">
                - Quando o monte acaba, o jogo continua com as peças das mãos:
                quem tem peça que encaixa é obrigado a jogar, e quem não tem
                passa a vez automaticamente
              </p>
            </div>

            <div className="home-screen__rule-section">
              <h3 className="home-screen__rule-title">🎭 Blefe</h3>
              <p className="home-screen__rule-text">
                Mesmo quando a peça comprada encaixa, você pode ficar com ela e
                fingir que não encaixava. O jogo nunca revela o blefe: use a
                soma do verso para deduzir o que o adversário guardou!
              </p>
            </div>

            <div className="home-screen__rule-section">
              <h3 className="home-screen__rule-title">✨ Características</h3>
              <p className="home-screen__rule-text">
                - 28 peças de dominó (todas as combinações de 0-0 até 6-6)
              </p>
              <p className="home-screen__rule-text">
                - De 2 a 4 jogadores no mesmo dispositivo, cada um por si
              </p>
              <p className="home-screen__rule-text">
                - Interface moderna com animações suaves
              </p>
              <p className="home-screen__rule-text">
                - Mesa realista com visualização 3D
              </p>
              <p className="home-screen__rule-text">
                - Sistema de turnos protegidos
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            <motion.button
              className="btn btn--primary btn--large home-screen__play-button"
              onClick={handlePlayClick}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Jogar
            </motion.button>
          </motion.div>
        </motion.div>
      </div>

      <Modal
        isOpen={showPlayerModal}
        onClose={() => setShowPlayerModal(false)}
        title="Configurar Jogadores"
        type="info"
        showCloseButton={false}
      >
        <div className="player-names-form">
          <fieldset className="player-names-form__field player-count">
            <legend className="player-names-form__label">Quantos jogadores?</legend>
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
            <div className="player-names-form__field" key={index}>
              <label htmlFor={`player${index + 1}`} className="player-names-form__label">
                Nome do Jogador {index + 1}
              </label>
              <input
                id={`player${index + 1}`}
                type="text"
                className="player-names-form__input"
                placeholder={`Digite o nome do jogador ${index + 1}`}
                value={names[index]}
                onChange={(e) => handleNameChange(index, e.target.value)}
                autoFocus={index === 0}
              />
            </div>
          ))}

          <div className="player-names-form__actions">
            <button
              className="btn btn--primary"
              onClick={handleStartGame}
              disabled={!canStart}
            >
              Iniciar Jogo
            </button>
            <button
              className="btn btn--secondary"
              onClick={() => setShowPlayerModal(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
