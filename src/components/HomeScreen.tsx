import { motion } from 'framer-motion';
import { useState } from 'react';
import { Modal } from './Modal';
import './HomeScreen.css';

interface HomeScreenProps {
  onStartGame: (player1Name: string, player2Name: string) => void;
}

export function HomeScreen({ onStartGame }: HomeScreenProps) {
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [player1Name, setPlayer1Name] = useState('');
  const [player2Name, setPlayer2Name] = useState('');

  const handlePlayClick = () => {
    setShowPlayerModal(true);
  };

  const handleStartGame = () => {
    if (player1Name.trim() && player2Name.trim()) {
      onStartGame(player1Name.trim(), player2Name.trim());
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
                somas iguais dão empate.
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
                - Jogo local para 2 jogadores no mesmo dispositivo
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
          <div className="player-names-form__field">
            <label htmlFor="player1" className="player-names-form__label">
              Nome do Jogador 1
            </label>
            <input
              id="player1"
              type="text"
              className="player-names-form__input"
              placeholder="Digite o nome do primeiro jogador"
              value={player1Name}
              onChange={(e) => setPlayer1Name(e.target.value)}
              autoFocus
            />
          </div>

          <div className="player-names-form__field">
            <label htmlFor="player2" className="player-names-form__label">
              Nome do Jogador 2
            </label>
            <input
              id="player2"
              type="text"
              className="player-names-form__input"
              placeholder="Digite o nome do segundo jogador"
              value={player2Name}
              onChange={(e) => setPlayer2Name(e.target.value)}
            />
          </div>

          <div className="player-names-form__actions">
            <button
              className="btn btn--primary"
              onClick={handleStartGame}
              disabled={!player1Name.trim() || !player2Name.trim()}
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
