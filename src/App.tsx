import { GameProvider, useGame } from './game/state/game-context';
import './App.css';

function GameContent() {
  const { state, dispatch } = useGame();

  const currentPlayer = state.players[state.currentPlayerIndex];
  const canDraw = state.phase === 'playing' && state.selectedPiece === null && state.drawPile.length > 0;
  const canPlay = state.phase === 'playing' && state.selectedPiece !== null;
  const canBluff = state.phase === 'playing' && state.selectedPiece !== null;
  const canEndTurn = state.phase === 'transition';

  const handleStartGame = () => {
    dispatch({ type: 'START_GAME' });
  };

  const handleDrawPiece = () => {
    dispatch({ type: 'DRAW_PIECE' });
  };

  const handlePlayPiece = (position: 'left' | 'right') => {
    if (state.selectedPiece) {
      dispatch({ type: 'PLAY_PIECE', pieceId: state.selectedPiece.id, position });
    }
  };

  const handleBluff = () => {
    if (state.selectedPiece) {
      dispatch({ type: 'BLUFF', pieceId: state.selectedPiece.id });
    }
  };

  const handleEndTurn = () => {
    dispatch({ type: 'END_TURN' });
  };

  return (
    <div className="game-container">
      <h1>DomeMais</h1>

      <div className="game-info">
        <div className="phase">Fase: {state.phase}</div>
        <div className="current-player">Jogador atual: {currentPlayer.name}</div>
        <div className="draw-pile-count">Peças no monte: {state.drawPile.length}</div>
      </div>

      {state.phase === 'setup' && (
        <button onClick={handleStartGame} className="action-button">
          Iniciar Jogo
        </button>
      )}

      {state.phase === 'playing' && (
        <div className="playing-actions">
          {canDraw && (
            <button onClick={handleDrawPiece} className="action-button">
              Comprar Peça
            </button>
          )}

          {state.selectedPiece && (
            <div className="selected-piece">
              <h3>Peça Selecionada:</h3>
              <div className="piece-display">
                [{state.selectedPiece.left}|{state.selectedPiece.right}]
              </div>
              <div className="piece-sum">Soma: {state.selectedPiece.sum}</div>

              {canPlay && (
                <div className="play-actions">
                  {state.table.leftEnd !== null && (
                    <button
                      onClick={() => handlePlayPiece('left')}
                      className="action-button"
                    >
                      Jogar na Esquerda
                    </button>
                  )}
                  {state.table.rightEnd !== null && (
                    <button
                      onClick={() => handlePlayPiece('right')}
                      className="action-button"
                    >
                      Jogar na Direita
                    </button>
                  )}
                  {canBluff && (
                    <button onClick={handleBluff} className="action-button bluff">
                      Blefar (não encaixa)
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {canEndTurn && (
        <button onClick={handleEndTurn} className="action-button">
          Finalizar Turno
        </button>
      )}

      <div className="table">
        <h2>Mesa</h2>
        <div className="table-ends">
          <div>Esquerda: {state.table.leftEnd ?? 'N/A'}</div>
          <div>Direita: {state.table.rightEnd ?? 'N/A'}</div>
        </div>
        <div className="table-pieces">
          {state.table.pieces.map((piece) => (
            <span key={piece.id} className="piece-display">
              [{piece.left}|{piece.right}]
            </span>
          ))}
        </div>
      </div>

      <div className="players">
        {state.players.map((player) => (
          <div key={player.id} className="player">
            <h3>
              {player.name} {player.id === currentPlayer.id && '(Atual)'}
            </h3>
            <div>Peças na mão: {player.hand.length}</div>
            {state.phase === 'finished' && <div>Pontuação: {player.score}</div>}
          </div>
        ))}
      </div>

      <div className="logs">
        <h3>Logs</h3>
        <div className="log-content">
          {state.logs.map((log, index) => (
            <div key={index} className="log-entry">
              {log}
            </div>
          ))}
        </div>
      </div>
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
