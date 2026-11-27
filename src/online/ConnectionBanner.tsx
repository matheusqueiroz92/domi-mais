import './ConnectionBanner.css';
import { useI18n } from '../i18n/useI18n';

/** Faixa no alto da tela enquanto a conexão com o servidor está caída. */
export function ConnectionBanner({ inLobby = false }: { inLobby?: boolean }) {
  const { m } = useI18n();
  return (
    <div className="connection-banner" role="alert">
      {inLobby ? m.connection.lobby : m.connection.game}
    </div>
  );
}
