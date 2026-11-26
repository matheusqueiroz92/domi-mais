import './ConnectionBanner.css';

/** Faixa no alto da tela enquanto a conexão com o servidor está caída. */
export function ConnectionBanner({ inLobby = false }: { inLobby?: boolean }) {
  return (
    <div className="connection-banner" role="alert">
      {inLobby
        ? 'Sem conexão. Tentando reconectar… Seu lugar na sala fica guardado por 30 minutos.'
        : 'Sem conexão. Tentando reconectar… Você tem 1 minuto antes de o computador jogar por você.'}
    </div>
  );
}
