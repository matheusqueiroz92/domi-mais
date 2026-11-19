import './TurnAlert.css';

interface TurnAlertProps {
  /** O que fazer agora ("Compre uma peça do monte"). */
  hint: string;
}

/** Tempo que a faixa "Sua vez!" fica na tela (igual à animação do CSS). */
export const TURN_ALERT_SECONDS = 2.6;

/**
 * Faixa "Sua vez!" que aparece com destaque e some sozinha. Monte uma nova
 * (com `key` diferente) a cada turno para ela aparecer de novo.
 */
export function TurnAlert({ hint }: TurnAlertProps) {
  return (
    <div className="turn-alert" role="alert" aria-live="assertive">
      <span className="turn-alert__title">Sua vez!</span>
      <span className="turn-alert__hint">{hint}</span>
    </div>
  );
}
