import { motion } from "framer-motion";
import type { DominoPiece as DominoPieceType } from "../game/state/game-types";
import clsx from "clsx";
import "./DominoPiece.css";

interface DominoPieceProps {
  piece: DominoPieceType;
  isSelected?: boolean;
  isFaceUp?: boolean;
  onClick?: () => void;
  size?: "small" | "medium" | "large";
  animated?: boolean;
  orientation?: "horizontal" | "vertical";
}

// Função para renderizar os pontos (pips) de um dominó
// Padrões baseados em peças de dominó reais
function renderPips(value: number, size: "small" | "medium" | "large") {
  // Tamanho dos pontos baseado no tamanho da peça
  const pipSize = size === "small" ? 6 : size === "medium" ? 8 : 10;

  // Espaçamento dos pontos (margem das bordas) - reduzido para pips mais espaçados
  const margin = size === "small" ? 0.15 : size === "medium" ? 0.12 : 0.1;

  // Padrões de pontos para cada valor (0-6) - posições em porcentagem
  // Baseado em peças de dominó reais
  const patterns: { [key: number]: Array<[number, number]> } = {
    0: [], // Sem pontos
    1: [[0.5, 0.5]], // Centro
    2: [
      [0.35, 0.35], // Canto superior esquerdo
      [0.65, 0.65], // Canto inferior direito (diagonal transversal)
    ],
    3: [
      [0.35, 0.35], // Canto superior esquerdo
      [0.5, 0.5], // Centro
      [0.65, 0.65], // Canto inferior direito (diagonal transversal)
    ],
    4: [
      [0.35, 0.35], // Canto superior esquerdo
      [0.65, 0.35], // Canto superior direito
      [0.35, 0.65], // Canto inferior esquerdo
      [0.65, 0.65], // Canto inferior direito
    ],
    5: [
      [0.35, 0.3], // Canto superior esquerdo
      [0.65, 0.3], // Canto superior direito
      [0.5, 0.5], // Centro
      [0.35, 0.7], // Canto inferior esquerdo
      [0.65, 0.7], // Canto inferior direito
    ],
    6: [
      [0.3, 0.3], // Fileira superior - esquerda
      [0.5, 0.3], // Fileira superior - centro
      [0.7, 0.3], // Fileira superior - direita
      [0.3, 0.7], // Fileira inferior - esquerda
      [0.5, 0.7], // Fileira inferior - centro
      [0.7, 0.7], // Fileira inferior - direita
    ],
  };

  const positions = patterns[value] || [];

  return (
    <div className="domino-piece__pips">
      {positions.map(([x, y], index) => (
        <div
          key={index}
          className="domino-piece__pip"
          style={{
            position: "absolute",
            left: `${(margin + x * (1 - 2 * margin)) * 100}%`,
            top: `${(margin + y * (1 - 2 * margin)) * 100}%`,
            transform: "translate(-50%, -50%)",
            width: `${pipSize}px`,
            height: `${pipSize}px`,
          }}
        />
      ))}
    </div>
  );
}

export function DominoPiece({
  piece,
  isSelected = false,
  isFaceUp = piece.isFaceUp,
  onClick,
  size = "medium",
  animated = false,
  orientation = "horizontal",
}: DominoPieceProps) {
  const isBucha = piece.left === piece.right;

  // Se não especificou orientação, buchas ficam verticais, outras horizontais
  const finalOrientation = orientation || (isBucha ? "vertical" : "horizontal");

  const pieceContent = (
    <div
      className={clsx("domino-piece", `domino-piece--${size}`, {
        "domino-piece--selected": isSelected,
        "domino-piece--face-down": !isFaceUp,
        "domino-piece--clickable": onClick !== undefined,
        "domino-piece--vertical": finalOrientation === "vertical",
        "domino-piece--horizontal": finalOrientation === "horizontal",
      })}
      onClick={onClick}
    >
      <div className="domino-piece__left">
        {isFaceUp ? renderPips(piece.left, size) : null}
      </div>
      <div className="domino-piece__divider"></div>
      <div className="domino-piece__right">
        {isFaceUp ? renderPips(piece.right, size) : null}
      </div>
      {!isFaceUp && (
        <div className="domino-piece__sum domino-piece__sum--face-down">
          {piece.sum}
        </div>
      )}
    </div>
  );

  if (animated) {
    return (
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.5, type: "spring" }}
      >
        {pieceContent}
      </motion.div>
    );
  }

  return pieceContent;
}
