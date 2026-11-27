import { useI18n } from '../i18n/useI18n';
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

/**
 * Modo "dica": explica o raciocínio da vez do jogador.
 * Na compra, mostra o que cada soma do monte pode ser e a chance de encaixar;
 * na jogada, quais peças da mão encaixam e uma sugestão com o motivo.
 */
export function HintPanel({ state, playerIndex, hidden = false }: HintPanelProps) {
  const [showAll, setShowAll] = useState(false);
  const { m } = useI18n();
  const SIDE_LABEL = m.common.side;

  const isTurn =
    !hidden && state.phase === 'playing' && state.currentPlayerIndex === playerIndex;

  let body;
  if (!isTurn) {
    body = <p className="hint__intro">{m.hints.waiting}</p>;
  } else if (state.turnStep === 'draw' && state.drawPile.length > 0) {
    const hints = getDrawHints(state, playerIndex);
    const visible = showAll ? hints : hints.slice(0, VISIBLE_SUMS);
    const { leftEnd, rightEnd } = state.table;

    body = (
      <>
        <p className="hint__intro">{m.hints.pileIntro(leftEnd, rightEnd)}</p>
        <ul className="hint__list">
          {visible.map((hint) => (
            <li key={hint.sum} className={hint.probability === 1 ? 'hint__item--sure' : undefined}>
              <span className="hint__sum">{m.hints.sum(hint.sum)}</span>
              <span>
                {m.hints.canBe(formatCandidates(hint.candidates, m))}
                <strong>{formatFitting(hint, m)}</strong>
              </span>
            </li>
          ))}
        </ul>
        {hints.length > VISIBLE_SUMS && (
          <button type="button" className="hint__more" onClick={() => setShowAll((all) => !all)}>
            {showAll ? m.hints.showLess : m.hints.showAll(hints.length)}
          </button>
        )}
      </>
    );
  } else {
    const { playable, suggestion } = getPlayHints(state, playerIndex, m);
    const mayKeep = canKeepPiece(state);

    body =
      playable.length === 0 ? (
        <p className="hint__intro">{m.hints.noneFits(state.table.leftEnd, state.table.rightEnd)}</p>
      ) : (
        <>
          <p className="hint__intro">
            {m.hints.fits(playable.length)}
            {playable
              .map((piece) =>
                m.hints.fitsSides(
                  `${piece.left}|${piece.right}`,
                  piece.sides.map((side) => SIDE_LABEL[side]),
                  Boolean(piece.closes)
                )
              )
              .join(', ')}
            .
          </p>
          {suggestion && (
            <p className="hint__suggestion">
              {m.hints.suggestionBefore}
              <strong>
                {suggestion.left}|{suggestion.right}
              </strong>
              {m.hints.suggestionAfter(SIDE_LABEL[suggestion.side], suggestion.reason)}
            </p>
          )}
          {mayKeep && (
            <p className="hint__note">{m.hints.keepNote}</p>
          )}
        </>
      );
  }

  return (
    <section className="hint" aria-label={m.hints.title}>
      <h2 className="hint__title">
        <BulbIcon size={16} /> {m.hints.title}
      </h2>
      {body}
    </section>
  );
}
