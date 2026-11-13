import type { DominoPiece, GameAction } from '../game/state/game-types';
import { generateDominoPieces } from '../game/logic/pieces';

/** Peça citada no roteiro pelos dois lados, em qualquer ordem. */
export type Tile = readonly [number, number];

/** Ação que o roteiro espera (da pessoa) ou executa (pela Bia). */
export type ScriptAction =
  | { type: 'CHOOSE_INITIAL_PIECE'; tile: Tile }
  | { type: 'DRAW_PIECE'; tile: Tile }
  | { type: 'PLAY_PIECE'; tile: Tile; position: 'left' | 'right' }
  | { type: 'KEEP_PIECE' };

export interface TutorialStep {
  title: string;
  /** Parágrafos do cartão de explicação. */
  text: string[];
  /** Passo de ação: a pessoa só avança fazendo exatamente isto. */
  expect?: ScriptAction;
  /** Passo da adversária: ações feitas sozinhas, uma de cada vez. */
  bot?: ScriptAction[];
  /** Texto que substitui `text` depois que as ações de `bot` terminam. */
  after?: string[];
}

/** Nomes dos jogadores da partida guiada (a pessoa é sempre a primeira). */
export const TUTORIAL_PLAYERS = ['Você', 'Bia'];

/**
 * Roteiro da partida guiada. É uma partida de verdade, pelo mesmo motor de
 * regras: o monte tem ordem fixa e cada passo libera uma única ação.
 * O teste `script.test.ts` garante que todas as ações são válidas e que as
 * afirmações do texto (pontas, somas, quem encaixa) batem com o estado.
 */
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Bem-vindo ao DomiMais',
    text: [
      'Aqui as peças ficam viradas: o verso mostra só a soma dos dois lados. Uma peça de soma 7 pode ser 1|6, 2|5 ou 3|4.',
      'Nesta partida guiada contra a Bia você vai comprar, jogar, passar a vez e blefar.',
    ],
  },
  {
    title: 'A peça inicial',
    text: [
      'Ninguém começa com peças na mão. Você foi sorteado para começar: toque na peça de soma 9 destacada no monte. Ela abre a mesa.',
    ],
    expect: { type: 'CHOOSE_INITIAL_PIECE', tile: [4, 5] },
  },
  {
    title: 'Vez da Bia',
    text: [
      'A peça era 4|5: as pontas da mesa são 4 e 5. Quem escolhe a peça inicial não compra; a vez passa adiante.',
      'Em cada turno, o jogador compra uma peça do monte. Observe a Bia.',
    ],
    bot: [
      { type: 'DRAW_PIECE', tile: [4, 6] },
      { type: 'PLAY_PIECE', tile: [4, 6], position: 'left' },
    ],
    after: [
      'A Bia comprou uma peça de soma 10 e jogou: era 4|6, que encaixou no 4.',
      'Agora as pontas da mesa são 6 e 5.',
    ],
  },
  {
    title: 'Sua vez: pense antes de comprar',
    text: [
      'Você precisa de uma peça que tenha 6 ou 5. Soma 11 só pode ser 5|6: encaixa com certeza!',
      'Toque na peça de soma 11 destacada no monte.',
    ],
    expect: { type: 'DRAW_PIECE', tile: [5, 6] },
  },
  {
    title: 'Jogue a peça',
    text: [
      'A peça comprada vai para a sua mão, aberta só para você.',
      'Toque na peça 5|6 e depois em "Jogar" na ponta direita da mesa, ao lado do 5.',
    ],
    expect: { type: 'PLAY_PIECE', tile: [5, 6], position: 'right' },
  },
  {
    title: 'Vez da Bia',
    text: ['As duas pontas agora são 6. Observe o que a Bia faz.'],
    bot: [{ type: 'DRAW_PIECE', tile: [1, 1] }, { type: 'KEEP_PIECE' }],
    after: [
      'A Bia comprou uma peça de soma 2 e ficou com ela.',
      'Soma 2 só pode ser 0|2 ou 1|1, e nenhuma tem 6. Desta vez dá para deduzir: ela não tinha como jogar.',
    ],
  },
  {
    title: 'Nem toda compra encaixa',
    text: [
      'Para ver o que acontece, compre a peça de soma 3 destacada.',
      'Soma 3 pode ser 0|3 ou 1|2: nenhuma delas tem 6.',
    ],
    expect: { type: 'DRAW_PIECE', tile: [1, 2] },
  },
  {
    title: 'Passar a vez',
    text: [
      'Era 1|2 e não encaixa. Quando nenhuma peça da sua mão encaixa, o botão diz "Passar a vez".',
      'Toque nele: a peça fica na sua mão.',
    ],
    expect: { type: 'KEEP_PIECE' },
  },
  {
    title: 'Vez da Bia',
    text: ['A Bia compra outra peça.'],
    bot: [
      { type: 'DRAW_PIECE', tile: [6, 6] },
      { type: 'PLAY_PIECE', tile: [6, 6], position: 'right' },
    ],
    after: [
      'A Bia comprou soma 12, que só pode ser 6|6, e jogou. Peças com os dois lados iguais ficam atravessadas na mesa.',
      'As pontas continuam 6 e 6.',
    ],
  },
  {
    title: 'Uma compra arriscada',
    text: [
      'Soma 8 pode ser 2|6, 3|5 ou 4|4. Só a 2|6 encaixa: 1 chance em 3.',
      'Arrisque: compre a peça de soma 8 destacada.',
    ],
    expect: { type: 'DRAW_PIECE', tile: [2, 6] },
  },
  {
    title: 'O blefe',
    text: [
      'Deu certo: é 2|6 e encaixa! Você pode jogar... ou blefar, ficando com a peça como se ela não encaixasse.',
      'A Bia não tem como saber: para ela, soma 8 também podia ser 3|5 ou 4|4. Blefar confunde a dedução dos adversários, mas custa um turno.',
      'Quando alguma peça encaixa, o botão muda para "Ficar com a peça". Toque nele para blefar.',
    ],
    expect: { type: 'KEEP_PIECE' },
  },
  {
    title: 'Como a partida termina',
    text: [
      'O jogo segue até o monte acabar. Com o monte vazio, quem tem peça que encaixa é obrigado a jogar; quem não tem passa a vez automaticamente.',
      'Vence quem ficar sem peças na mão. Se ninguém mais puder jogar, vence a menor soma das peças na mão.',
      'Nas partidas, toque na lâmpada no alto da tela para ligar as dicas e ver o raciocínio de cada jogada.',
    ],
  },
];

const ALL_PIECES = generateDominoPieces();

/** Id da peça com os dois lados dados (em qualquer ordem). */
export function tileId([a, b]: Tile): string {
  const found = ALL_PIECES.find(
    (piece) => (piece.left === a && piece.right === b) || (piece.left === b && piece.right === a)
  );
  if (!found) throw new Error(`Peça inexistente no roteiro: ${a}|${b}`);
  return found.id;
}

/** Ação do jogo correspondente a uma ação do roteiro. */
export function toGameAction(action: ScriptAction): GameAction {
  switch (action.type) {
    case 'CHOOSE_INITIAL_PIECE':
    case 'DRAW_PIECE':
      return { type: action.type, pieceId: tileId(action.tile) };
    case 'PLAY_PIECE':
      return { type: 'PLAY_PIECE', pieceId: tileId(action.tile), position: action.position };
    case 'KEEP_PIECE':
      return { type: 'KEEP_PIECE' };
  }
}

/**
 * Monte da partida guiada: as 28 peças em uma ordem fixa e bem misturada
 * (11 e 28 são primos entre si, então cada peça aparece uma única vez).
 */
export function createTutorialSetup(): { shuffledPieces: DominoPiece[]; startingPlayerIndex: number } {
  const shuffledPieces = ALL_PIECES.map((_, index) => ALL_PIECES[(index * 11 + 5) % ALL_PIECES.length]);
  return { shuffledPieces, startingPlayerIndex: 0 };
}
