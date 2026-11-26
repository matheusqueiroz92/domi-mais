/**
 * Dominó físico do DomiMais (pedido de 25/11/2026). Enquanto a fabricação não
 * termina, a tela inicial mostra "Em breve". Quando a loja existir, basta
 * preencher `buyUrl`: o pop-up passa a mostrar o botão "Comprar".
 *
 * TODO(Matheus): trocar `image` pela foto do jogo físico (em `public/`).
 */
export const PHYSICAL_GAME = {
  image: '/logo-domi-mais.jpeg',
  imageAlt: 'Peças do DomiMais formando o nome do jogo',
  buyUrl: null as string | null,
};
