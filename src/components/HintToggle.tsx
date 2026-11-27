import { BulbIcon } from './icons';
import { useI18n } from '../i18n/useI18n';

interface HintToggleProps {
  hintsOn: boolean;
  onToggle: () => void;
}

/** Botão que liga e desliga o modo "dica". */
export function HintToggle({ hintsOn, onToggle }: HintToggleProps) {
  const { m } = useI18n();
  return (
    <button
      type="button"
      className={`icon-btn ${hintsOn ? 'icon-btn--on' : ''}`}
      onClick={onToggle}
      aria-label={hintsOn ? m.toggles.turnHintsOff : m.toggles.turnHintsOn}
      aria-pressed={hintsOn}
      title={hintsOn ? m.toggles.hintsOnTitle : m.toggles.hintsOffTitle}
    >
      <BulbIcon />
    </button>
  );
}
