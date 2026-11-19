import './ConnectionBanner.css';

/** Faixa no alto da tela enquanto a conexão com o servidor está caída. */
export function ConnectionBanner() {
  return (
    <div className="connection-banner" role="alert">
      Sem conexão. Tentando reconectar… Você tem 1 minuto antes de o computador jogar por você.
    </div>
  );
}
