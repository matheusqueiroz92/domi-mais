import { useCallback, useEffect, useRef, useState } from 'react';

interface RegisterOptions {
  onNeedRefresh: () => void;
  onOfflineReady: () => void;
}

/** Registra o service worker e devolve a função que aplica a versão nova. */
export type RegisterServiceWorker = (
  options: RegisterOptions
) => Promise<((reload?: boolean) => Promise<void>) | null>;

/** Evento do Chrome/Edge/Android que permite oferecer a instalação. */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<unknown>;
}

/** Registro de verdade: só no site publicado e em navegadores com suporte. */
const registerInBrowser: RegisterServiceWorker = async (options) => {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return null;
  const { registerSW } = await import('virtual:pwa-register');
  return registerSW(options);
};

export interface Pwa {
  /** Há uma versão nova baixada, esperando a pessoa aceitar. */
  needRefresh: boolean;
  /** O jogo acabou de ficar disponível sem internet. */
  offlineReady: boolean;
  /** O navegador permite instalar o jogo como aplicativo. */
  canInstall: boolean;
  /** Aplica a versão nova (recarrega a página). */
  update: () => void;
  /** Fecha o aviso atual. */
  dismiss: () => void;
  /** Abre a janela de instalação do navegador. */
  install: () => void;
}

/**
 * PWA: funcionamento sem internet, aviso de versão nova e instalação.
 * A versão nova nunca é aplicada sozinha: a página só recarrega quando a
 * pessoa toca em "Atualizar".
 */
export function usePwa(register: RegisterServiceWorker = registerInBrowser): Pwa {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const applyUpdate = useRef<((reload?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    let cancelled = false;
    register({
      onNeedRefresh: () => !cancelled && setNeedRefresh(true),
      onOfflineReady: () => !cancelled && setOfflineReady(true),
    })
      .then((apply) => {
        applyUpdate.current = apply;
      })
      .catch(() => {
        // Sem service worker o jogo funciona normalmente, só não fica offline.
      });
    return () => {
      cancelled = true;
    };
  }, [register]);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      // Guarda o evento para oferecer a instalação por um botão do próprio jogo.
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => setInstallEvent(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const update = useCallback(() => {
    setNeedRefresh(false);
    void applyUpdate.current?.(true);
  }, []);

  const dismiss = useCallback(() => {
    setNeedRefresh(false);
    setOfflineReady(false);
  }, []);

  const install = useCallback(() => {
    if (!installEvent) return;
    // O evento só pode ser usado uma vez.
    void installEvent.prompt().catch(() => undefined);
    setInstallEvent(null);
  }, [installEvent]);

  return { needRefresh, offlineReady, canInstall: installEvent !== null, update, dismiss, install };
}
