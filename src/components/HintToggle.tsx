import { BulbIcon } from './icons';

interface HintToggleProps {
  hintsOn: boolean;
  onToggle: () => void;
}

/** Botão que liga e desliga o modo "dica". */
export function HintToggle({ hintsOn, onToggle }: HintToggleProps) {
  return (
    <button
      type="button"
      className={`icon-btn ${hintsOn ? 'icon-btn--on' : ''}`}
      onClick={onToggle}
      aria-label={hintsOn ? 'Desligar as dicas' : 'Ligar as dicas'}
      aria-pressed={hintsOn}
      title={hintsOn ? 'Dicas ligadas' : 'Dicas desligadas'}
    >
      <BulbIcon />
    </button>
  );
}
