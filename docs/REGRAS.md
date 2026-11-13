# DomiMais — Regras oficiais

Este documento é a fonte de verdade das regras do jogo. A implementação fica em
`src/game/logic` e cada regra abaixo tem testes automatizados
(`src/game/logic/__tests__`).

## Conceito

- O DomiMais usa as 28 peças do dominó tradicional (de 0-0 até 6-6).
- O **verso** de cada peça mostra a **soma** dos seus dois lados. Quem vê uma
  peça virada sabe a soma, mas não os valores (soma 7 pode ser 1|6, 2|5 ou 3|4).
- Jogam **2, 3 ou 4 jogadores**, cada um por si (não há duplas).

## Início da partida

1. As 28 peças ficam no **monte**, viradas (mostrando a soma).
2. Nenhum jogador começa com peças na mão.
3. A ordem dos turnos é a ordem em que os jogadores foram cadastrados. Um
   jogador é sorteado para começar. Ele **escolhe qualquer peça do monte** para
   ser a peça inicial; ela é aberta na mesa e define as duas pontas.
4. Escolher a peça inicial é o turno inteiro de quem começa: ele **não compra
   em seguida**. A vez passa ao próximo jogador, que faz a primeira compra.

## O turno enquanto há peças no monte

1. **Compra obrigatória:** o jogador escolhe **uma** peça do monte (vendo só a
   soma). A peça vai para a mão dele e só ele vê os valores.
2. Em seguida ele escolhe **uma** destas opções:
   - **Jogar** uma peça que encaixe em uma das pontas da mesa. Pode ser a peça
     que acabou de comprar ou outra que já estava na mão.
   - **Ficar com a peça**: encerrar o turno sem jogar.
3. A vez passa para o próximo jogador, em ordem.

Uma peça encaixa em uma ponta quando um dos seus lados é igual ao valor da
ponta. Só se joga uma peça por turno.

## Blefe

- Quando a peça comprada **encaixa**, o jogador pode mesmo assim ficar com ela,
  fingindo que não encaixava. Isso é o blefe.
- O blefe serve apenas para confundir o adversário. **Não existe ação de
  duvidar** nem penalidade.
- O jogo **nunca valida, registra ou expõe o blefe**: "ficar com a peça" é a
  mesma ação e gera o mesmo registro, encaixando ou não. Os adversários nunca
  recebem nenhuma indicação de que a peça encaixava.
- Só a tela do **próprio jogador** informa se ele tem jogada: quando nenhuma
  peça da mão encaixa, aparece "nenhuma peça da sua mão encaixa na mesa" e o
  botão "Passar a vez"; quando alguma encaixa, o botão é "Ficar com a peça".

## Quando o monte acaba

A partida **não termina** quando o monte fica vazio. Ela continua só com as
peças das mãos:

- Não há mais compra.
- Quem tem peça que encaixa é **obrigado a jogar** (não é possível blefar).
- Quem não tem peça que encaixa **passa a vez automaticamente**. Com 3 ou 4
  jogadores, podem ser pulados vários jogadores seguidos.

Exceção: quem compra a **última** peça do monte ainda pode ficar com ela nesse
mesmo turno, como em qualquer turno de compra.

## Fim da partida

Enquanto houver peças no monte, a partida nunca termina. Com o monte vazio, ela
termina em uma destas situações:

| Situação | Quem vence |
|---|---|
| Um jogador está **sem peças na mão** | Esse jogador |
| **Jogo fechado**: nenhuma peça de nenhuma mão encaixa | Quem tem a **menor soma** das peças da mão |
| Jogo fechado com dois ou mais jogadores na **mesma menor soma** | **Empate entre eles**; os demais perdem |
| Mais de um jogador sem peças na mão | **Empate entre eles**; os demais perdem |

A soma de cada jogador é a soma dos versos das peças que sobraram na mão. Mão
vazia vence mesmo que o adversário tenha soma zero (só a peça 0|0).

## Quantidade de jogadores

Depois da peça inicial sobram 27 peças no monte, e cada jogador compra uma por
turno:

| Jogadores | Compras por jogador |
|---|---|
| 2 | 14 para quem joga depois da peça inicial e 13 para quem começou |
| 3 | 9 cada |
| 4 | 7, 7, 7 e 6 (quem começou compra 6) |

Com mais de 4 jogadores as mãos ficariam pequenas demais para a dedução, por
isso o limite é 4.

## Contra o computador

- Uma pessoa joga contra 1, 2 ou 3 jogadores controlados pelo computador
  (partidas de 2, 3 ou 4 jogadores). As regras são exatamente as mesmas.
- Há três níveis: **Fácil**, **Médio** e **Difícil**.
- O computador **não trapaceia**: ele só usa o que uma pessoa também veria — a
  mesa, a própria mão e a soma no verso das peças do monte e dos adversários.
- O computador **também blefa**, de vez em quando, nos níveis Médio e Difícil.
- A tela nunca mostra as peças do computador nem indica se a peça dele
  encaixava. O que aparece é só o registro público: comprou (com a soma),
  jogou ou ficou com a peça.
- Não há tela de troca de turno neste modo, porque só uma pessoa vê a tela.

## Tutorial e modo "dica"

- O **tutorial** é uma partida guiada de verdade, contra a Bia, com monte em
  ordem fixa. As regras são as mesmas; a única diferença é que, em cada passo,
  só a ação pedida fica disponível. A partida guiada não vai até o fim: ela
  termina depois do blefe, com a explicação de como o jogo acaba.
- O **modo "dica"** é opcional (botão da lâmpada, desligado por padrão) e vale
  nos modos mesmo aparelho e contra o computador. Ele mostra, na vez do
  jogador:
  - antes da compra, o que cada soma do monte pode ser e quantas dessas peças
    encaixam nas pontas;
  - depois da compra, quais peças da mão encaixam e uma sugestão de jogada.
- A dica **não trapaceia**: usa só o que o jogador vê (mesa, a própria mão e as
  somas dos versos). Nunca revela uma peça virada e nunca diz se um adversário
  blefou.
- Na troca de turno do mesmo aparelho o painel fica vazio, para um jogador não
  ver a dica do outro.

## Jogo no mesmo dispositivo

Enquanto existir o modo de dois jogadores no mesmo dispositivo, a troca de turno
é **protegida**: a tela é coberta e as mãos ficam ocultas até o próximo jogador
tocar em **"Estou pronto"**.

## Decisões registradas

| Data | Decisão |
|---|---|
| 11/11/2026 | A peça inicial é escolhida livremente no monte pelo jogador sorteado. |
| 11/11/2026 | A partida continua depois que o monte acaba. |
| 11/11/2026 | Com o monte vazio, jogar é obrigatório e quem não pode jogar passa automaticamente. |
| 11/11/2026 | Somas iguais no jogo fechado dão empate. |
| 11/11/2026 | Não há ação "Duvido": o blefe é só para confundir. |
| 11/11/2026 | De 2 a 4 jogadores, cada um por si, sem duplas. |
| 11/11/2026 | No empate, só os jogadores empatados na condição de vitória dividem o resultado. |
| 11/11/2026 | O modo contra o computador (etapa futura) deverá aceitar 2, 3 ou 4 jogadores. |
| 12/11/2026 | O monte fica em duas fileiras de 14 peças; cada peça mantém o seu lugar. |
| 13/11/2026 | O modo "dica" usa só informação pública do jogador e fica desligado por padrão. |
| 12/11/2026 | Sem jogada possível, o botão do jogador passa a ser "Passar a vez". |
| 12/11/2026 | Depois da peça inicial a vez passa ao próximo jogador; quem começou não compra em seguida. |
| 12/11/2026 | Modo contra o computador: 1 a 3 adversários, níveis Fácil, Médio e Difícil; o computador joga só com informação pública e também blefa. |
