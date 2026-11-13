import { useState } from 'react';
import type { GameState } from '../game/state/game-types';
import { canKeepPiece } from '../game/logic/engine';
import { formatCandidates, formatFitting, getDrawHints, getPlayHints } from '../game/logic/hints';
import { BulbIcon } from './icons';
import './HintPanel.css';

interface HintPanelProps {
  state: GameState;
  /** Jogador que está vendo a tela (as dicas usam só o que ele pode ver). */
  playerIndex: number;
  /** Fora da vez do jogador (ou na troca de turno): só o aviso, sem dica nenhuma. */
  hidden?: boolean;
}

/** Quantas somas aparecem antes de "Ver todas". */
const VISIBLE_SUMS = 4;

const SIDE_LABEL = { left: 'esquerda', right: 'direita' } as const;

/**
 * Modo "dica": explica o raciocínio da vez do jogador.
 * Na compra, mostra o que cada soma do monte pode ser e a chance de encaixar;
 * na jogada, quais peças da mão encaixam e uma sugestão com o motivo.
 */
export function HintPanel({ state, playerIndex, hidden = false }: HintPanelProps) {
  const [showAll, setShowAll] = useState(false);

  const isTurn =
    !hidden && state.phase === 'playing' && state.currentPlayerIndex === playerIndex;

  let body;
  if (!isTurn) {
    body = <p className="hint__intro">As dicas aparecem na sua vez de comprar e de jogar.</p>;
  } else if (state.turnStep === 'draw' && state.drawPile.length > 0) {
    const hints = getDrawHints(state, playerIndex);
    const visible = showAll ? hints : hints.slice(0, VISIBLE_SUMS);
    const { leftEnd, rightEnd } = state.table;

    body = (
      <>
        <p className="hint__intro">
          Pontas da mesa: {leftEnd} e {rightEnd}. Pela soma, veja o que cada peça do monte pode ser:
        </p>
        <ul className="hint__list">
          {visible.map((hint) => (
            <li key={hint.sum} className={hint.probability === 1 ? 'hint__item--sure' : undefined}>
              <span className="hint__sum">Soma {hint.sum}</span>
              <span>
                pode ser {formatCandidates(hint.candidates)}: <strong>{formatFitting(hint)}</strong>
              </span>
            </li>
          ))}
        </ul>
        {hints.length > VISIBLE_SUMS && (
          <button type="button" className="hint__more" onClick={() => setShowAll((all) => !all)}>
            {showAll ? 'Ver menos' : `Ver todas as ${hints.length} somas`}
          </button>
        )}
      </>
    );
  } else {
    const { playable, suggestion } = getPlayHints(state, playerIndex);
    const mayKeep = canKeepPiece(state);

    body =
      playable.length === 0 ? (
        <p className="hint__intro">
          Nenhuma peça da sua mão tem {state.table.leftEnd} ou {state.table.rightEnd}. Passe a vez.
        </p>
      ) : (
        <>
          <p className="hint__intro">
            {playable.length === 1 ? 'Encaixa: ' : 'Encaixam: '}
            {playable
              .map(
                (piece) =>
                  `${piece.left}|${piece.right} (${piece.sides.map((side) => SIDE_LABEL[side]).join(' ou ')})`
              )
              .join(', ')}
            .
          </p>
          {suggestion && (
            <p className="hint__suggestion">
              Sugestão: jogue <strong>{suggestion.left}|{suggestion.right}</strong> na ponta{' '}
              {SIDE_LABEL[suggestion.side]}, porque {suggestion.reason}.
            </p>
          )}
          {mayKeep && (
            <p className="hint__note">
              Você também pode ficar com a peça comprada (blefe), mas isso custa um turno.
            </p>
          )}
        </>
      );
  }

  return (
    <section className="hint" aria-label="Dica">
      <h2 className="hint__title">
        <BulbIcon size={16} /> Dica
      </h2>
      {body}
    </section>
  );
}
