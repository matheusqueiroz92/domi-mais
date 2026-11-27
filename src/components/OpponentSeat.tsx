import { useI18n } from '../i18n/useI18n';
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
  /** Situação no modo online ("Sem conexão", "Computador jogando"...). */
  note?: string;
  testId?: string;
}

/** Adversário em volta da mesa: nome, quantidade de peças e os versos (somas). */
export function OpponentSeat({ player, position, active = false, note, testId }: OpponentSeatProps) {
  const { m } = useI18n();
  const count = player.hand.length;
  return (
    <div
      className={`seat seat--${position} ${active ? 'seat--active' : ''}`}
      data-testid={testId}
      aria-current={active ? 'true' : undefined}
    >
      <span className="seat__name">
        {player.botLevel && (
          <span className="seat__bot" role="img" aria-label={m.common.computer}>
            <CpuIcon size={13} />
          </span>
        )}
        {player.name}
      </span>
      {note && <span className="seat__note">{note}</span>}
      <span className="seat__count">
        {m.common.pieces(count)}
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
