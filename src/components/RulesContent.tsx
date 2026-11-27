import { useI18n } from '../i18n/useI18n';
import { DominoPiece } from './DominoPiece';
import type { DominoPiece as DominoPieceType } from '../game/state/game-types';
import './RulesContent.css';

// Peças do exemplo "soma 7 pode ser...", só ilustrativas (antes ficavam na tela inicial).
const example = (left: number, right: number): DominoPieceType => ({
  id: `exemplo-${left}-${right}`,
  left,
  right,
  sum: left + right,
  isFaceUp: true,
});
const EXAMPLE_PIECES = [example(1, 6), example(2, 5), example(3, 4)];

/** Resumo das regras, mostrado em "Como jogar". Regras completas: docs/REGRAS.md. */
export function RulesContent() {
  const { m } = useI18n();
  const r = m.rules;
  return (
    <div className="rules">
      <section>
        <h3>{r.objectiveTitle}</h3>
        <p>{r.objective}</p>
      </section>
      <section>
        <h3>{r.howTitle}</h3>
        <ul>
          <li>{r.players}</li>
          <li>{r.noPieces}</li>
          <li>
            {r.back}
            <div className="rules__example" aria-label={r.exampleLabel}>
              <DominoPiece piece={{ ...EXAMPLE_PIECES[0], isFaceUp: false }} isFaceUp={false} back="md" />
              <span className="rules__example-text">{r.canBe}</span>
              {EXAMPLE_PIECES.map((piece) => (
                <DominoPiece key={piece.id} piece={piece} isFaceUp half={19} orientation="vertical" />
              ))}
            </div>
          </li>
          <li>{r.initial}</li>
          <li>{r.turn}</li>
          <li>{r.emptyPile}</li>
          <li>{r.closed}</li>
        </ul>
      </section>
      <section>
        <h3>{r.bluffTitle}</h3>
        <p>{r.bluff}</p>
      </section>
      <section>
        <h3>{r.learnTitle}</h3>
        <p>{r.learn}</p>
      </section>
    </div>
  );
}
