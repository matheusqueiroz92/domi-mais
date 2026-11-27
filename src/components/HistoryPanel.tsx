import { translateLog } from '../i18n/translate';
import { useI18n } from '../i18n/useI18n';
import './HistoryPanel.css';

/**
 * Histórico de jogadas da partida, aberto pelo botão do relógio (pedido de
 * 25/11/2026: substitui a linha "Última jogada" embaixo da mesa). Usa o
 * registro neutro do motor (`state.logs`): diz quem comprou (com a soma do
 * verso), quem jogou e onde, e quem ficou com a peça, nunca se ela encaixava.
 * As jogadas mais recentes vêm primeiro.
 */
function historyEntries(logs: string[]): string[] {
  return logs.filter((log) => !log.startsWith('Vez de ')).reverse();
}

export function HistoryPanel({ logs }: { logs: string[] }) {
  const { m } = useI18n();
  const entries = historyEntries(logs);
  if (entries.length === 0) {
    return <p className="history__empty">{m.history.empty}</p>;
  }
  return (
    <ol className="history" aria-label={m.history.label}>
      {entries.map((entry, index) => (
        <li key={entries.length - index} className={index === 0 ? 'history__item history__item--last' : 'history__item'}>
          {translateLog(entry, m)}
        </li>
      ))}
    </ol>
  );
}
