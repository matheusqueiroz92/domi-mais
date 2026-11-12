import { SoundOffIcon, SoundOnIcon } from './icons';

interface SoundToggleProps {
  soundOn: boolean;
  onToggle: () => void;
}

/** Botão que liga e desliga os sons do jogo. */
export function SoundToggle({ soundOn, onToggle }: SoundToggleProps) {
  return (
    <button
      type="button"
      className="icon-btn"
      onClick={onToggle}
      aria-label={soundOn ? 'Desligar o som' : 'Ligar o som'}
      aria-pressed={soundOn}
      title={soundOn ? 'Som ligado' : 'Som desligado'}
    >
      {soundOn ? <SoundOnIcon /> : <SoundOffIcon />}
    </button>
  );
}
