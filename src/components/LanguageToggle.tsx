import { useEffect, useRef, useState } from 'react';
import { LANGS } from '../i18n/lang';
import { useI18n } from '../i18n/useI18n';
import { GlobeIcon } from './icons';
import './LanguageToggle.css';

/**
 * Botão de idioma (globo) ao lado do som e do tema: abre a lista com
 * Português, English, Español e 中文. A escolha vale na hora e fica salva.
 * Cada idioma aparece escrito nele mesmo, para quem não lê o idioma atual.
 */
export function LanguageToggle() {
  const { lang, m, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const current = LANGS.find((item) => item.code === lang) ?? LANGS[0];

  // Fecha ao tocar fora ou com Esc.
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="lang" ref={boxRef}>
      <button
        type="button"
        className="icon-btn lang__btn"
        aria-label={`${m.toggles.chooseLanguage} (${current.label})`}
        title={m.toggles.language}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <GlobeIcon size={20} />
        <span className="lang__code" aria-hidden="true">
          {current.short}
        </span>
      </button>
      {open && (
        <ul className="lang__menu" role="menu" aria-label={m.toggles.language}>
          {LANGS.map((item) => (
            <li key={item.code} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={item.code === lang}
                lang={item.htmlLang}
                className={`lang__option ${item.code === lang ? 'lang__option--active' : ''}`}
                onClick={() => {
                  setLang(item.code);
                  setOpen(false);
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
