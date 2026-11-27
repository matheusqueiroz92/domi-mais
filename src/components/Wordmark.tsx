import './Wordmark.css';

/**
 * Logomarca do DomiMais no topo das telas (27/11/2026, no lugar do nome em
 * texto). Duas versões: "Domi" branco no tema escuro e "Domi" escuro no tema
 * claro; o CSS mostra a do tema atual. Arquivos em `public/logo/`.
 */
export function Wordmark() {
  return (
    <span className="wordmark">
      <img className="wordmark__img wordmark__img--dark" src="/logo/logo-dark.webp" alt="DomiMais" width={486} height={120} />
      <img className="wordmark__img wordmark__img--light" src="/logo/logo-light.webp" alt="DomiMais" width={486} height={120} />
    </span>
  );
}
