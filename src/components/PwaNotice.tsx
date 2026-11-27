import { useI18n } from '../i18n/useI18n';
import { useEffect } from 'react';
import type { Pwa } from '../pwa/usePwa';
import './PwaNotice.css';

/** Aviso no rodapé: versão nova disponível ou jogo pronto para uso sem internet. */
/** Tempo que o aviso "pronto para uso sem internet" fica na tela. */
export const OFFLINE_NOTICE_MS = 8000;

export function PwaNotice({ pwa }: { pwa: Pwa }) {
  const { offlineReady, needRefresh, dismiss } = pwa;
  const { m } = useI18n();

  // O aviso de "pronto" é só informativo: some sozinho para não cobrir a tela.
  useEffect(() => {
    if (!offlineReady || needRefresh) return;
    const timer = window.setTimeout(dismiss, OFFLINE_NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [offlineReady, needRefresh, dismiss]);

  if (pwa.needRefresh) {
    return (
      <div className="pwa-notice" role="status">
        <p>{m.pwa.update}</p>
        <div className="pwa-notice__actions">
          <button type="button" className="btn" onClick={pwa.dismiss}>
            {m.pwa.later}
          </button>
          <button type="button" className="btn btn--primary" onClick={pwa.update}>
            {m.pwa.updateNow}
          </button>
        </div>
      </div>
    );
  }

  if (pwa.offlineReady) {
    return (
      <div className="pwa-notice" role="status">
        <p>{m.pwa.offline}</p>
        <div className="pwa-notice__actions">
          <button type="button" className="btn" onClick={pwa.dismiss}>
            {m.common.understood}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
