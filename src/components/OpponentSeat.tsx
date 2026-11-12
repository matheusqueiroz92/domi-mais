import { DominoPiece } from './DominoPiece';
import { PieceMotion } from './PieceMotion';
import type { Player } from '../game/state/game-types';
import './OpponentSeat.css';

interface OpponentSeatProps {
  player: Player;
  /** Onde o adversário fica em relação à mesa. */
  position: 'top' | 'left' | 'right';
  testId?: string;
}

/** Adversário em volta da mesa: nome, quantidade de peças e os versos (somas). */
export function OpponentSeat({ player, position, testId }: OpponentSeatProps) {
  const count = player.hand.length;
  return (
    <div className={`seat seat--${position}`} data-testid={testId}>
      <span className="seat__name">{player.name}</span>
      <span className="seat__count">
        {count} {count === 1 ? 'peça' : 'peças'}
      </span>
      {count > 0 && (
        <div className="seat__tiles">
          {player.hand.map((piece) => (
            <PieceMotion key={piece.id} pieceId={piece.id}>
              <DominoPiece piece={piece} isFaceUp={false} back="sm" />
            </PieceMotion>
          ))}
        </div>
      )}
    </div>
  );
}
