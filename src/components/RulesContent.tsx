import './RulesContent.css';

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
          <li>O verso de cada peça mostra a soma dos seus dois lados.</li>
          <li>O jogador sorteado escolhe no monte a peça inicial da mesa.</li>
          <li>
            Em cada turno você compra uma peça do monte e pode jogar uma peça que encaixe em uma
            das pontas, ou ficar com a peça comprada.
          </li>
          <li>
            Quando o monte acaba, o jogo continua com as peças das mãos: quem tem peça que encaixa
            é obrigado a jogar, e quem não tem passa a vez automaticamente.
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
    </div>
  );
}
