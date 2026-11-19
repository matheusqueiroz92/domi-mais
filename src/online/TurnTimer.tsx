import { useEffect, useState } from 'react';
import './TurnTimer.css';

interface TurnTimerProps {
  /** Hora do fim da jogada, no relógio do servidor. */
  deadline: number;
  /** Relógio do servidor menos o do aparelho. */
  clockOffset: number;
  /** De quem é a vez ("Seu tempo" quando é de quem está olhando). */
  label: string;
}

/** Abaixo disto, o tempo aparece em destaque. */
export const TIMER_WARNING_SECONDS = 10;

function remainingSeconds(deadline: number, clockOffset: number): number {
  return Math.max(0, Math.ceil((deadline - (Date.now() + clockOffset)) / 1000));
}

/** Contagem regressiva da jogada (60 segundos no modo online). */
export function TurnTimer({ deadline, clockOffset, label }: TurnTimerProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((tick) => tick + 1), 250);
    return () => window.clearInterval(timer);
  }, [deadline]);

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
