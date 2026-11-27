import { useI18n } from '../i18n/useI18n';
import type { ReactNode } from 'react';
import { DominoPiece } from './DominoPiece';
import { PieceMotion } from './PieceMotion';
import type { Player } from '../game/state/game-types';
import './PlayerHand.css';

interface PlayerHandProps {
  player: Player;
  selectedPieceId: string | null;
  /** Peça comprada do monte neste turno (recebe um destaque no texto). */
  drawnPieceId: string | null;
  /** As peças só podem ser selecionadas na etapa de jogada. */
  canSelect: boolean;
  onSelectPiece: (pieceId: string) => void;
  /** Celular: peças um pouco menores, para sobrar espaço para a mesa e o monte. */
  compact?: boolean;
  /**
   * Celular: botão de encerrar o turno ("Ficar com a peça"/"Passar a vez") no
   * cabeçalho da mão, no lugar do título com a contagem de peças (25/11/2026).
   */
  action?: ReactNode;
}

/** Mão do jogador da vez, aberta, na parte de baixo da tela. */
export function PlayerHand({
  player,
  selectedPieceId,
  drawnPieceId,
  canSelect,
  onSelectPiece,
  compact = false,
  action = null,
}: PlayerHandProps) {
  const { m } = useI18n();
  const count = player.hand.length;
  const drawn = player.hand.find((piece) => piece.id === drawnPieceId);
  // Mãos grandes usam peças menores para caber na tela.
  const half = compact
    ? count > 10 ? 26 : count > 7 ? 30 : 36
    : count > 10 ? 30 : count > 6 ? 36 : 44;

  return (
    <section
      className={`hand ${compact ? 'hand--compact' : ''}`}
      aria-label={m.hand.label(player.name)}
      data-testid="hand"
    >
      {compact ? (
        // Celular: a contagem e a peça comprada já se veem nas próprias peças.
        <div className="hand__header">
          <span className="hand__label">{m.hand.yours}</span>
          {action}
        </div>
      ) : (
        <div className="hand__header">
          <span>
            {m.hand.yours} · {m.common.pieces(count)}
          </span>
          {drawn && (
            <span className="hand__drawn">
              {m.hand.drawnNow(`${drawn.left}|${drawn.right}`)}
            </span>
          )}
        </div>
      )}
      {count > 0 ? (
        <div className="hand__pieces">
          {player.hand.map((piece) => (
            // A peça comprada sai virada do monte e abre ao chegar à mão.
            <PieceMotion key={piece.id} pieceId={piece.id} flip={piece.id === drawnPieceId}>
              <DominoPiece
                piece={piece}
                isFaceUp
                half={half}
                orientation="vertical"
                isSelected={selectedPieceId === piece.id}
                onClick={canSelect ? () => onSelectPiece(piece.id) : undefined}
              />
            </PieceMotion>
          ))}
        </div>
      ) : (
        <p className="hand__empty">{m.hand.empty}</p>
      )}
    </section>
  );
}
