# 🎲 DomiMais

<div align="center">

![Version](https://img.shields.io/badge/version-0.8.0-blue.svg)
![React](https://img.shields.io/badge/React-19-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6.svg)
![Vite](https://img.shields.io/badge/Vite-7-646cff.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**Jogo de dominó com blefe: estratégia, dedução e raciocínio**

[Jogar agora](https://domimais.com.br) • [Regras](docs/REGRAS.md) • [Arquitetura](docs/ARQUITETURA.md) • [Changelog](CHANGELOG.md)

</div>

---

## 📋 Sobre o projeto

O **DomiMais** é um jogo de dominó digital inspirado no dominó tradicional, com
uma mecânica própria de **blefe**. O verso de cada peça mostra a **soma** dos
seus dois lados, o que permite ao adversário deduzir informações sem ver a peça
(soma 7 pode ser 1|6, 2|5 ou 3|4). O jogo foi criado com intuito educacional,
para estimular o raciocínio lógico.

A versão atual tem dois modos, sempre com 2, 3 ou 4 jogadores, cada um por si:
no mesmo dispositivo, ou sozinho contra o computador (níveis Fácil, Médio e
Difícil). Está publicada
em [domimais.com.br](https://domimais.com.br).

## 🎯 Como jogar

1. As 28 peças ficam no monte, viradas, mostrando só a soma.
2. Um jogador é sorteado e escolhe no monte a peça inicial da mesa; a vez
   passa ao próximo jogador.
3. Em cada turno, o jogador **compra uma peça** do monte e depois **joga** uma
   peça que encaixe em uma das pontas ou **fica com a peça** comprada.
4. **Blefe:** mesmo quando a peça comprada encaixa, o jogador pode ficar com
   ela e fingir que não encaixava. O jogo nunca revela o blefe.
5. Quando o monte acaba, o jogo continua com as peças das mãos: quem tem peça
   que encaixa é obrigado a jogar e quem não tem passa a vez automaticamente.
6. **Vence** quem ficar sem peças. Se o jogo fechar, vence a menor soma das
   peças da mão; quem empatar na menor soma divide a vitória.

As regras completas estão em [docs/REGRAS.md](docs/REGRAS.md).

O jogo tem tema escuro e claro e sons de peças: os botões no topo da tela
alternam o tema e ligam ou desligam o som, e as escolhas ficam salvas no
navegador.

## 🛠️ Tecnologias

- **React 19**, **TypeScript 5.9** e **Vite 7**
- **Framer Motion** (animações) e **clsx**
- **Vitest** e **Testing Library** (testes)
- **ESLint** com typescript-eslint

## 🚀 Instalação

Pré-requisito: Node.js 20 ou superior.

```bash
git clone https://github.com/matheusqueiroz92/domi-mais.git
cd domi-mais
npm install
npm run dev
```

O jogo abre em `http://localhost:5173`.

## 🧪 Scripts

```bash
npm run dev         # servidor de desenvolvimento
npm test            # roda todos os testes uma vez
npm run test:watch  # testes em modo interativo
npm run lint        # linter
npm run build       # checagem de tipos + build de produção
npm run preview     # pré-visualiza o build
```

Antes de enviar uma alteração, rode `npm test`, `npm run lint` e
`npm run build`.

## 📁 Estrutura

```
domi-mais/
├── docs/
│   ├── REGRAS.md          Regras oficiais (fonte de verdade)
│   └── ARQUITETURA.md     Estado, ações, motor de regras e testes
├── public/                Arquivos estáticos (logo)
├── src/
│   ├── game/
│   │   ├── logic/         Motor de regras (funções puras) e seus testes
│   │   ├── ai/            Jogador controlado pelo computador
│   │   └── state/         Tipos, reducer e contexto React
│   ├── components/        Componentes visuais e cálculo do layout da mesa
│   ├── theme/             Tema escuro/claro
│   ├── sound/             Sons do jogo
│   ├── test/              Configuração dos testes
│   ├── App.tsx            Tela da partida
│   └── main.tsx           Ponto de entrada
├── CHANGELOG.md
├── deploy-notes.md        Como publicar na VPS
└── package.json
```

Toda regra do jogo mora em `src/game/logic`; os componentes só leem o estado e
disparam ações. Detalhes em [docs/ARQUITETURA.md](docs/ARQUITETURA.md).

## 🔮 Próximos passos

- [x] Nova tela inicial, novo layout da mesa e temas escuro/claro
- [x] Modo contra o computador, em partidas de 2, 3 ou 4 jogadores
- [x] Tutorial interativo e modo "dica"
- [ ] PWA com partida salva para uso offline
- [ ] Multiplayer online por sala com código, com chat

O modo no mesmo dispositivo será removido quando os modos
contra o computador e online estiverem prontos.

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE).

## 📧 Contato

Dúvidas, sugestões ou problemas: abra uma
[issue](https://github.com/matheusqueiroz92/domi-mais/issues).

---

<div align="center">

**Desenvolvido por [Matheus Queiroz](https://matheusqueiroz.dev.br)**

</div>
