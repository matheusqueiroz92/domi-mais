import { useI18n } from '../i18n/useI18n';
import type { TutorialStep } from '../tutorial/script';
import './TutorialCoach.css';

interface TutorialCoachProps {
  step: TutorialStep;
  stepIndex: number;
  totalSteps: number;
  /** A adversária ainda está jogando: o texto final do passo ainda não aparece. */
  botBusy: boolean;
  isLastStep: boolean;
  onNext: () => void;
  onExit: () => void;
  /** Último passo: ir direto para uma partida contra o computador. */
  onPlayComputer: () => void;
}

/** Cartão que conduz a partida guiada, um passo de cada vez. */
export function TutorialCoach({
  step,
  stepIndex,
  totalSteps,
  botBusy,
  isLastStep,
  onNext,
  onExit,
  onPlayComputer,
}: TutorialCoachProps) {
  const { m } = useI18n();
  // Textos do passo no idioma atual (as ações continuam vindo de `step`).
  const words = m.tutorial.steps[stepIndex] ?? step;
  const paragraphs = step.bot && !botBusy && words.after ? words.after : words.text;
  const waitingUser = step.expect !== undefined;

  return (
    <section className="coach" aria-label={m.tutorial.label}>
      <div className="coach__top">
        <span className="coach__progress">
          {m.tutorial.step(stepIndex + 1, totalSteps)}
        </span>
        {!isLastStep && (
          <button type="button" className="coach__exit" onClick={onExit}>
            {m.tutorial.exit}
          </button>
        )}
      </div>
      <h2 className="coach__title">{words.title}</h2>
      {/* role="status": leitores de tela anunciam cada novo passo. */}
      <div className="coach__text" role="status">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      {isLastStep ? (
        <div className="coach__actions">
          <button type="button" className="btn" onClick={onExit}>
            {m.tutorial.backHome}
          </button>
          <button type="button" className="btn btn--primary" onClick={onPlayComputer}>
            {m.tutorial.playComputer}
          </button>
        </div>
      ) : waitingUser ? (
        <p className="coach__cue">{m.tutorial.yourAction}</p>
      ) : botBusy ? (
        <p className="coach__cue">{m.tutorial.botPlaying}</p>
      ) : (
        <div className="coach__actions">
          <button type="button" className="btn btn--primary" onClick={onNext}>
            {m.common.continue}
          </button>
        </div>
      )}
    </section>
  );
}
