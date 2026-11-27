import type { Theme } from '../theme/theme';
import { MoonIcon, SunIcon } from './icons';
import { useI18n } from '../i18n/useI18n';

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

/** Botão que alterna entre o tema escuro e o claro. */
export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const { m } = useI18n();
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      className="icon-btn"
      onClick={onToggle}
      aria-label={isDark ? m.toggles.toLight : m.toggles.toDark}
      title={isDark ? m.toggles.lightTitle : m.toggles.darkTitle}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
