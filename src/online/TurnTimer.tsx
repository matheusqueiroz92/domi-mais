import { useEffect, useRef, useState } from 'react';
import './TurnTimer.css';

interface TurnTimerProps {
  /** Hora do fim da jogada, no relógio do servidor. */
  deadline: number;
  /** Relógio do servidor menos o do aparelho. */
  clockOffset: number;
  /** De quem é a vez ("Seu tempo" quando é de quem está olhando). */
  label: string;
  /** Chamado uma vez quando o tempo chega a 10 segundos (só na sua vez). */
  onWarning?: () => void;
}

/** Abaixo disto, o tempo aparece em destaque. */
export const TIMER_WARNING_SECONDS = 10;

function remainingSeconds(deadline: number, clockOffset: number): number {
  return Math.max(0, Math.ceil((deadline - (Date.now() + clockOffset)) / 1000));
}

/** Contagem regressiva da jogada (60 segundos no modo online). */
export function TurnTimer({ deadline, clockOffset, label, onWarning }: TurnTimerProps) {
  const [, setTick] = useState(0);
  const warning = useRef(onWarning);
  useEffect(() => {
    warning.current = onWarning;
  }, [onWarning]);

  useEffect(() => {
    // Avisa uma vez por prazo, e só se a contagem começou acima de 10 s.
    let armed = remainingSeconds(deadline, clockOffset) > TIMER_WARNING_SECONDS;
    const timer = window.setInterval(() => {
      setTick((tick) => tick + 1);
      if (armed && remainingSeconds(deadline, clockOffset) <= TIMER_WARNING_SECONDS) {
        armed = false;
        warning.current?.();
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [deadline, clockOffset]);

  const seconds = remainingSeconds(deadline, clockOffset);
  return (
    <p
      className={`turn-timer ${seconds <= TIMER_WARNING_SECONDS ? 'turn-timer--warning' : ''}`}
      data-testid="turn-timer"
    >
      <span className="turn-timer__label">{label}</span>
      <span className="turn-timer__value">{seconds} s</span>
    </p>
  );
}
