import { DominoPiece } from './DominoPiece';
import { PieceMotion } from './PieceMotion';
import { CpuIcon } from './icons';
import type { Player } from '../game/state/game-types';
import './OpponentSeat.css';

interface OpponentSeatProps {
  player: Player;
  /** Onde o adversário fica em relação à mesa. */
  position: 'top' | 'left' | 'right';
  /** Destaca o adversário quando é a vez dele. */
  active?: boolean;
  testId?: string;
}

/** Adversário em volta da mesa: nome, quantidade de peças e os versos (somas). */
export function OpponentSeat({ player, position, active = false, testId }: OpponentSeatProps) {
  const count = player.hand.length;
  return (
    <div
      className={`seat seat--${position} ${active ? 'seat--active' : ''}`}
      data-testid={testId}
      aria-current={active ? 'true' : undefined}
    >
      <span className="seat__name">
        {player.botLevel && (
          <span className="seat__bot" role="img" aria-label="Computador">
            <CpuIcon size={13} />
          </span>
        )}
        {player.name}
      </span>
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
