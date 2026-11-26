/**
 * Parceiros que patrocinam o DomiMais, mostrados no rodapé da tela inicial
 * (pedido de 25/11/2026). Para incluir, trocar ou tirar um parceiro, basta
 * editar esta lista: a fileira se ajusta sozinha (quebra em mais linhas se
 * passar de 5).
 *
 * - `logo`: arquivo em `public/parceiros/` (SVG ou PNG com fundo
 *   transparente, de preferência horizontal).
 * - `url`: site ou Instagram da empresa; abre em outra aba. Sem `url`, a logo
 *   aparece sem link.
 *
 * TODO(Matheus): trocar os 5 lugares reservados pelas logos e links reais.
 */
export interface Partner {
  name: string;
  logo: string;
  url?: string;
}

export const PARTNERS_TITLE = 'Parceiros';

export const PARTNERS: Partner[] = [
  { name: 'Parceiro 1', logo: '/parceiros/parceiro-1.svg' },
  { name: 'Parceiro 2', logo: '/parceiros/parceiro-2.svg' },
  { name: 'Parceiro 3', logo: '/parceiros/parceiro-3.svg' },
  { name: 'Parceiro 4', logo: '/parceiros/parceiro-4.svg' },
  { name: 'Parceiro 5', logo: '/parceiros/parceiro-5.svg' },
];
