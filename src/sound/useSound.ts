import { useCallback, useEffect, useState } from 'react';
import { playSound, readStoredSound, storeSound } from './sound';
import type { SoundName } from './sound';

/** Preferência de som (salva no navegador) e função para tocar os sons do jogo. */
export function useSound(): {
  soundOn: boolean;
  toggleSound: () => void;
  play: (name: SoundName) => void;
} {
  const [soundOn, setSoundOn] = useState<boolean>(readStoredSound);

  useEffect(() => {
    storeSound(soundOn);
  }, [soundOn]);

  const toggleSound = useCallback(() => setSoundOn((on) => !on), []);

  const play = useCallback(
    (name: SoundName) => {
      if (soundOn) playSound(name);
    },
    [soundOn]
  );

  return { soundOn, toggleSound, play };
}
