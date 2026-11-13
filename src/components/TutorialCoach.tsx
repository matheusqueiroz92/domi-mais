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
  const paragraphs = step.bot && !botBusy && step.after ? step.after : step.text;
  const waitingUser = step.expect !== undefined;

  return (
    <section className="coach" aria-label="Tutorial">
      <div className="coach__top">
        <span className="coach__progress">
          Passo {stepIndex + 1} de {totalSteps}
        </span>
        {!isLastStep && (
          <button type="button" className="coach__exit" onClick={onExit}>
            Sair do tutorial
          </button>
        )}
      </div>
      <h2 className="coach__title">{step.title}</h2>
      {/* role="status": leitores de tela anunciam cada novo passo. */}
      <div className="coach__text" role="status">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      {isLastStep ? (
        <div className="coach__actions">
          <button type="button" className="btn" onClick={onExit}>
            Voltar ao início
          </button>
          <button type="button" className="btn btn--primary" onClick={onPlayComputer}>
            Jogar contra o computador
          </button>
        </div>
      ) : waitingUser ? (
        <p className="coach__cue">Sua vez de agir</p>
      ) : botBusy ? (
        <p className="coach__cue">A Bia está jogando…</p>
      ) : (
        <div className="coach__actions">
          <button type="button" className="btn btn--primary" onClick={onNext}>
            Continuar
          </button>
        </div>
      )}
    </section>
  );
}
