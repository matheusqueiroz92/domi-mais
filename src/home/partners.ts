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
 * As logos vieram como SVG com imagem PNG embutida (até 290 KB cada); foram
 * convertidas para PNG (até 480 px de largura, de 13 a 27 KB), com o fundo branco e
 * sem a margem branca em volta, para a logo ocupar bem o cartão.
 *
 * TODO(Matheus): preencher o `url` de cada empresa.
 */
export interface Partner {
  name: string;
  logo: string;
  url?: string;
}

export const PARTNERS_TITLE = 'Parceiros';

export const PARTNERS: Partner[] = [
  { name: 'AZ News', logo: '/parceiros/az-news.png' },
  { name: 'Mandacaru Bistrô & Gastrobar', logo: '/parceiros/mandacaru.png' },
  { name: 'Supera Estimulação Cognitiva', logo: '/parceiros/supera.png' },
  { name: "Domino's Pizza", logo: '/parceiros/dominos.png' },
  { name: 'Sua marca aqui', logo: '/parceiros/sua-marca-aqui.png' },
];
