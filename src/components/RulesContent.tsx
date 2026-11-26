import { DominoPiece } from './DominoPiece';
import type { DominoPiece as DominoPieceType } from '../game/state/game-types';
import './RulesContent.css';

// Peças do exemplo "soma 7 pode ser...", só ilustrativas (antes ficavam na tela inicial).
const example = (left: number, right: number): DominoPieceType => ({
  id: `exemplo-${left}-${right}`,
  left,
  right,
  sum: left + right,
  isFaceUp: true,
});
const EXAMPLE_PIECES = [example(1, 6), example(2, 5), example(3, 4)];

/** Resumo das regras, mostrado em "Como jogar". Regras completas: docs/REGRAS.md. */
export function RulesContent() {
  return (
    <div className="rules">
      <section>
        <h3>Objetivo</h3>
        <p>
          Vence quem ficar sem peças na mão. Se o jogo fechar (nenhuma peça encaixa), vence quem
          tiver a menor soma das peças da mão; quem empatar na menor soma divide a vitória.
        </p>
      </section>
      <section>
        <h3>Como funciona</h3>
        <ul>
          <li>Jogam de 2 a 4 pessoas, cada uma por si.</li>
          <li>Ninguém começa com peças: as 28 ficam no monte, viradas.</li>
          <li>
            O verso de cada peça mostra a soma dos seus dois lados. Uma peça de soma 7, por
            exemplo, pode ser 1|6, 2|5 ou 3|4:
            <div className="rules__example" aria-label="Exemplo: uma peça de soma 7 pode ser 1|6, 2|5 ou 3|4">
              <DominoPiece piece={{ ...EXAMPLE_PIECES[0], isFaceUp: false }} isFaceUp={false} back="md" />
              <span className="rules__example-text">pode ser</span>
              {EXAMPLE_PIECES.map((piece) => (
                <DominoPiece key={piece.id} piece={piece} isFaceUp half={19} orientation="vertical" />
              ))}
            </div>
          </li>
          <li>
            O jogador sorteado escolhe no monte a peça inicial da mesa. Depois disso a vez passa
            ao próximo jogador.
          </li>
          <li>
            Em cada turno você compra uma peça do monte e pode jogar uma peça que encaixe em uma
            das pontas, ou ficar com a peça comprada.
          </li>
          <li>
            Quando o monte acaba, o jogo continua com as peças das mãos: quem tem peça que encaixa
            é obrigado a jogar, e quem não tem passa a vez automaticamente.
          </li>
          <li>
            Se as duas pontas da mesa ficarem com o mesmo número e todas as 7 peças desse número já
            estiverem na mesa, o jogo fecha e a partida acaba na hora, mesmo com peças no monte.
          </li>
        </ul>
      </section>
      <section>
        <h3>Blefe</h3>
        <p>
          Mesmo quando a peça comprada encaixa, você pode ficar com ela e fingir que não encaixava.
          O jogo nunca revela o blefe: use a soma do verso para deduzir o que cada adversário
          guardou.
        </p>
      </section>
      <section>
        <h3>Para aprender</h3>
        <p>
          O tutorial, na tela inicial, ensina o jogo em uma partida guiada. Durante as partidas, o
          botão da lâmpada liga as dicas: elas mostram o que cada soma pode ser e sugerem uma
          jogada.
        </p>
      </section>
    </div>
  );
}
