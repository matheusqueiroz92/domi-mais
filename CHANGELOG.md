# Changelog

## 0.2.0 — 11/11/2026

### Regras

- A partida continua depois que o monte acaba; com o monte vazio, quem tem peça
  que encaixa é obrigado a jogar e quem não tem passa a vez automaticamente.
- Vence quem fica sem peças; no jogo fechado vence a menor soma; somas iguais
  dão empate.
- "Ficar com a peça" passou a ser uma única ação, igual para a peça que não
  encaixa e para o blefe. Os avisos "Peça encaixa" e "Peça não encaixa" e o
  botão "Blefar" foram removidos, porque denunciavam o blefe ao adversário.
- Regras oficiais documentadas em `docs/REGRAS.md`.

### Correções

- A partida travava com o monte vazio quando o jogador da vez não tinha peça
  que encaixasse.
- Blefar com uma peça que já estava na mão duplicava a peça.
- Empate de soma dava sempre vitória ao Jogador 1.
- A troca de turno não escondia a mão: agora há a tela "Passe o dispositivo"
  com o botão "Estou pronto".
- Modais apareciam fora do centro (e fora da tela no celular).
- O clique em uma peça do monte era disparado duas vezes.

### Técnico

- Regras extraídas para funções puras em `src/game/logic`; o reducer só
  encaminha as ações e não faz mais sorteios.
- Testes automatizados com Vitest e Testing Library (`npm test`).
- Peças e pontas da mesa acessíveis por teclado e leitor de tela.
- Removidos código morto e a dependência `uuid`.
- `lang="pt-BR"` no HTML; `.dockerignore` adicionado.
- Arquitetura documentada em `docs/ARQUITETURA.md`.
