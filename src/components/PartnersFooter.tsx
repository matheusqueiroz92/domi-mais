import { PARTNERS } from '../home/partners';
import { useI18n } from '../i18n/useI18n';
import type { Partner } from '../home/partners';
import './PartnersFooter.css';

/** Logos dos parceiros, no rodapé da tela inicial. */
export function PartnersFooter({ partners = PARTNERS }: { partners?: Partner[] }) {
  const { m } = useI18n();
  if (partners.length === 0) return null;
  return (
    <section className="partners" aria-labelledby="partners-title">
      <h2 id="partners-title" className="partners__title">
        {m.home.partners}
      </h2>
      <ul className="partners__list">
        {partners.map((partner) => {
          const logo = <img className="partners__logo" src={partner.logo} alt={partner.name} loading="lazy" />;
          return (
            <li key={partner.name} className="partners__item">
              {partner.url ? (
                <a
                  className="partners__link"
                  href={partner.url}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  title={partner.name}
                >
                  {logo}
                </a>
              ) : (
                <span className="partners__link">{logo}</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
