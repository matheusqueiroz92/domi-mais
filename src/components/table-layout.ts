/**
 * Cálculos de layout da mesa (sem React): a linha de peças em "cobrinha", com
 * curvas em ângulo reto, e os adversários distribuídos em volta da mesa.
 */
import type { DominoPiece, TableSide } from '../game/state/game-types';
import { isDouble } from '../game/logic/pieces';

/** Um item posicionado na mesa: uma peça ou um alvo de jogada ("Jogar"). */
export interface PlacedItem {
  key: string;
  kind: 'piece' | 'slot';
  /** Peça desenhada (quando `kind` é `piece`). */
  piece?: DominoPiece;
  /** Ponta da mesa a que o alvo corresponde (quando `kind` é `slot`). */
  side?: TableSide;
  /** Canto superior esquerdo e tamanho, em px, dentro da área da linha de peças. */
  x: number;
  y: number;
  w: number;
  h: number;
  orientation: 'horizontal' | 'vertical';
  /** Desenhar a peça com os lados trocados. */
  flipped: boolean;
  /** Peça de canto: faz a curva de 90 graus da cobrinha. */
  corner: boolean;
}

export interface SnakeLayout {
  items: PlacedItem[];
  width: number;
  height: number;
}

export interface SnakeOptions {
  /** Largura disponível, em px. */
  width: number;
  /** Lado de meia peça, em px. */
  half: number;
  /** Espaço entre peças, em px. */
  gap?: number;
  /** Mostrar o alvo de jogada na ponta esquerda / direita. */
  leftSlot?: boolean;
  rightSlot?: boolean;
}

/** Folga para borda e divisória da peça. */
const PIECE_EXTRA = 4;

/** Comprimento (lado maior) e largura (lado menor) de uma peça desenhada. */
export function pieceSize(half: number): { long: number; short: number } {
  return { long: half * 2 + PIECE_EXTRA, short: half + PIECE_EXTRA };
}

interface ArmItem {
  key: string;
  piece?: DominoPiece;
  side?: TableSide;
}

/**
 * Posiciona a linha de peças em "cobrinha", com curvas em ângulo reto.
 *
 * A peça inicial fica no centro. O que foi jogado à direita dela cresce para a
 * direita e, ao chegar à borda, faz a curva para CIMA; o que foi jogado à
 * esquerda cresce para a esquerda e faz a curva para BAIXO. Em cada curva, a
 * peça de canto fica em pé (perpendicular à anterior) e a fileira seguinte
 * volta no sentido contrário.
 *
 * A bucha fica sempre atravessada na linha: em pé no meio de uma fileira e
 * deitada sobre a ponta da peça de canto quando vem logo depois da curva.
 *
 * Como cada braço só cresce pela ponta, as peças já colocadas não mudam de
 * lugar quando outra é jogada.
 */
export function layoutSnake(
  pieces: readonly DominoPiece[],
  initialPieceId: string | null,
  options: SnakeOptions
): SnakeLayout {
  const { width, half, gap = 2, leftSlot = false, rightSlot = false } = options;
  if (pieces.length === 0) return { items: [], width, height: 0 };

  const { long, short } = pieceSize(half);
  const anchorIndex = Math.max(
    0,
    pieces.findIndex((piece) => piece.id === initialPieceId)
  );
  const anchor = pieces[anchorIndex];
  const items: PlacedItem[] = [];

  // Peça inicial, centralizada. A linha da primeira fileira é y = 0.
  const anchorDouble = isDouble(anchor);
  const anchorW = anchorDouble ? short : long;
  const anchorX = (width - anchorW) / 2;
  items.push({
    key: anchor.id,
    kind: 'piece',
    piece: anchor,
    x: anchorX,
    y: anchorDouble ? -long / 2 : -short / 2,
    w: anchorW,
    h: anchorDouble ? long : short,
    orientation: anchorDouble ? 'vertical' : 'horizontal',
    flipped: false,
    corner: false,
  });

  /**
   * Percorre um braço a partir da peça inicial.
   * `dir`: +1 para a direita, -1 para a esquerda. `vdir`: +1 curva para baixo, -1 para cima.
   */
  const layoutArm = (arm: TableSide, list: ArmItem[]) => {
    let dir = arm === 'right' ? 1 : -1;
    const vdir = arm === 'right' ? -1 : 1;
    let cursor = arm === 'right' ? anchorX + anchorW + gap : anchorX - gap;
    let line = 0;
    let prevDouble = anchorDouble;
    // Peça de canto recém-colocada: se a próxima for uma bucha, ela fica
    // atravessada na ponta dessa peça, e não ao lado.
    let pendingCorner: { x: number; y: number } | null = null;
    // Lado da peça que encosta na anterior é o "de dentro": no braço direito é `left`.
    const innerIsLeft = arm === 'right';

    for (const item of list) {
      const double = item.piece ? isDouble(item.piece) : false;
      const base = { key: item.key, kind: item.piece ? 'piece' : 'slot', piece: item.piece, side: item.side } as const;

      if (double && pendingCorner) {
        // Bucha logo depois da curva: deitada, atravessada na ponta da peça
        // de canto. A fileira continua a partir de um dos lados dela.
        const x = pendingCorner.x + short / 2 - long / 2;
        const y = vdir > 0 ? pendingCorner.y + long + gap : pendingCorner.y - gap - short;
        items.push({
          ...base,
          x,
          y,
          w: long,
          h: short,
          orientation: 'horizontal',
          flipped: false,
          corner: false,
        });
        line = y + short / 2;
        cursor = dir > 0 ? x + long + gap : x - gap;
        prevDouble = false;
        pendingCorner = null;
        continue;
      }
      pendingCorner = null;

      if (double) {
        // Bucha: em pé, atravessada na fileira.
        items.push({
          ...base,
          x: dir > 0 ? cursor : cursor - short,
          y: line - long / 2,
          w: short,
          h: long,
          orientation: 'vertical',
          flipped: false,
          corner: false,
        });
        cursor += dir * (short + gap);
        prevDouble = true;
        continue;
      }

      // Cabe deitada nesta fileira? Reserva na borda o espaço de uma bucha em
      // pé e a sobra de uma bucha deitada sobre a peça de canto.
      const reserve = short + gap + Math.ceil(half / 2);
      const fits = dir > 0 ? cursor + long <= width - reserve : cursor - long >= reserve;

      if (fits) {
        items.push({
          ...base,
          x: dir > 0 ? cursor : cursor - long,
          y: line - short / 2,
          w: long,
          h: short,
          orientation: 'horizontal',
          // O lado esquerdo do desenho é o "de dentro" quando a fileira vai para a direita.
          flipped: (dir > 0) !== innerIsLeft,
          corner: false,
        });
        cursor += dir * (long + gap);
        prevDouble = false;
        continue;
      }

      // Não cabe: peça de canto, em pé, presa à ponta da peça anterior.
      const prevEdge = dir > 0 ? cursor - gap : cursor + gap;
      const columnX = dir > 0 ? prevEdge - short : prevEdge;
      const prevHalf = prevDouble ? long / 2 : short / 2;
      const y = vdir > 0 ? line + prevHalf + gap : line - prevHalf - gap - long;
      items.push({
        ...base,
        x: columnX,
        y,
        w: short,
        h: long,
        orientation: 'vertical',
        // O lado de cima do desenho é o "de dentro" quando a curva desce.
        flipped: (vdir > 0) !== innerIsLeft,
        corner: true,
      });
      // A fileira seguinte passa pela metade de fora da peça de canto e volta.
      line = vdir > 0 ? y + long - short / 2 : y + short / 2;
      dir = -dir;
      cursor = dir > 0 ? columnX + short + gap : columnX - gap;
      prevDouble = false;
      pendingCorner = { x: columnX, y };
    }
  };

  const toItem = (piece: DominoPiece): ArmItem => ({ key: piece.id, piece });
  const rightArm = pieces.slice(anchorIndex + 1).map(toItem);
  const leftArm = pieces.slice(0, anchorIndex).reverse().map(toItem);
  if (rightSlot) rightArm.push({ key: 'slot-right', side: 'right' });
  if (leftSlot) leftArm.push({ key: 'slot-left', side: 'left' });

  layoutArm('right', rightArm);
  layoutArm('left', leftArm);

  // Normaliza: a linha de cima passa a ser y = 0.
  const top = Math.min(...items.map((item) => item.y));
  const bottom = Math.max(...items.map((item) => item.y + item.h));
  for (const item of items) item.y -= top;

  return { items, width, height: bottom - top };
}

/** Tamanhos de meia peça disponíveis, do maior para o menor. */
export const HALF_SIZES = [52, 44, 38, 32, 28, 24, 20];

/** Maior tamanho de meia peça adequado à largura da mesa. */
export function maxHalfForWidth(width: number): number {
  if (width >= 1300) return 52;
  if (width >= 1000) return 44;
  if (width >= 760) return 38;
  if (width >= 520) return 32;
  if (width >= 360) return 28;
  if (width >= 260) return 24;
  return 20;
}

/**
 * Escolhe o maior tamanho de peça com que a linha cabe na área disponível.
 * `maxHeight` só é informado quando a altura da mesa é fixa (telas grandes);
 * sem ele, vale só o limite pela largura e a mesa cresce para baixo.
 */
export function fitSnake(
  pieces: readonly DominoPiece[],
  initialPieceId: string | null,
  options: Omit<SnakeOptions, 'half'> & { maxHeight?: number }
): SnakeLayout & { half: number } {
  const { maxHeight = Infinity, ...rest } = options;
  const cap = maxHalfForWidth(rest.width);
  const sizes = HALF_SIZES.filter((half) => half <= cap);

  let last: (SnakeLayout & { half: number }) | null = null;
  for (const half of sizes) {
    last = { ...layoutSnake(pieces, initialPieceId, { ...rest, half }), half };
    if (last.height <= maxHeight) return last;
  }
  return last ?? { ...layoutSnake(pieces, initialPieceId, { ...rest, half: 20 }), half: 20 };
}

/** Posição de uma peça espalhada na mesa, em % da área da mesa, e seu giro em graus. */
export interface ScatterPoint {
  x: number;
  y: number;
  rotate: number;
}

/**
 * Trajeto de cada peça na animação de embaralhar: uma sequência de posições
 * sorteadas sobre a mesa. Recebe o gerador aleatório para ser testável.
 */
export function createScatter(
  count: number,
  rng: () => number = Math.random,
  stops = 4
): ScatterPoint[][] {
  return Array.from({ length: count }, () =>
    Array.from({ length: stops }, () => ({
      x: 4 + rng() * 80,
      y: 6 + rng() * 66,
      rotate: Math.round(rng() * 360 - 180),
    }))
  );
}

export interface Seats {
  top: number | null;
  left: number | null;
  right: number | null;
}

/**
 * Posição de cada adversário em volta da mesa, vista por `viewerIndex`
 * (que fica embaixo). Os adversários seguem a ordem dos turnos, em sentido
 * horário: esquerda, em cima, direita.
 */
export function seatOpponents(playerCount: number, viewerIndex: number): Seats {
  const others = Array.from(
    { length: Math.max(0, playerCount - 1) },
    (_, step) => (viewerIndex + step + 1) % playerCount
  );

  if (others.length === 1) return { top: others[0], left: null, right: null };
  if (others.length === 2) return { top: null, left: others[0], right: others[1] };
  return { left: others[0] ?? null, top: others[1] ?? null, right: others[2] ?? null };
}
