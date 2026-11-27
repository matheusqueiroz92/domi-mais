import { SoundOffIcon, SoundOnIcon } from './icons';
import { useI18n } from '../i18n/useI18n';

interface SoundToggleProps {
  soundOn: boolean;
  onToggle: () => void;
}

/** Botão que liga e desliga os sons do jogo. */
export function SoundToggle({ soundOn, onToggle }: SoundToggleProps) {
  const { m } = useI18n();
  return (
    <button
      type="button"
      className="icon-btn"
      onClick={onToggle}
      aria-label={soundOn ? m.toggles.turnSoundOff : m.toggles.turnSoundOn}
      aria-pressed={soundOn}
      title={soundOn ? m.toggles.soundOn : m.toggles.soundOff}
    >
      {soundOn ? <SoundOnIcon /> : <SoundOffIcon />}
    </button>
  );
}
