# 🎲 DomiMais

<div align="center">

![Version](https://img.shields.io/badge/version-0.0.0-blue.svg)
![React](https://img.shields.io/badge/React-19.2.0-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178c6.svg)
![Vite](https://img.shields.io/badge/Vite-7.2.4-646cff.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**Jogo de Dominó com Blefe - Uma experiência única de estratégia e dedução**

[Funcionalidades](#-funcionalidades) • [Tecnologias](#-tecnologias) • [Instalação](#-instalação) • [Como Jogar](#-como-jogar) • [Estrutura do Projeto](#-estrutura-do-projeto)

</div>

---

## 📋 Sobre o Projeto

**DomeMais** é um jogo de dominó digital inspirado no dominó tradicional, trazendo uma mecânica exclusiva de **blefe** que adiciona camadas estratégicas ao jogo. Um diferencial é que o verso de cada peça exibe o valor da soma dos seus lados, permitindo aos adversários deduzirem informações sem revelar a peça completamente. O jogo foi desenvolvido como MVP (Minimum Viable Product) para ser jogado localmente por 2 jogadores no mesmo dispositivo.

### 🎯 Características Principais

- **Jogo Local**: 2 jogadores no mesmo dispositivo
- **Mecânica de Blefe**: Jogadores podem blefar quando uma peça encaixa
- **Valor no Verso**: O verso de cada peça de dominó exibe a soma dos seus dois lados, permitindo dedução estratégica sem revelar os valores específicos
- **Interface Moderna**: Design inspirado em jogos mobile com animações suaves
- **Mesa Realista**: Visualização de mesa de madeira com peças 3D
- **Sistema de Turnos Protegidos**: Cada jogador vê apenas suas próprias peças
- **Detecção de Jogo Fechado**: Sistema inteligente que detecta quando não há mais jogadas possíveis

---

## ✨ Funcionalidades

### 🎮 Mecânicas de Jogo

- ✅ **28 Peças de Dominó**: Todas as combinações possíveis (0-0 até 6-6)
- ✅ **Peça Inicial**: Jogo começa com [0|0] ou [6|6] revelada na mesa
- ✅ **Compra Obrigatória**: Cada jogador deve comprar uma peça do monte por turno antes de jogar
- ✅ **Compra de Peças**: Jogadores escolhem peças do monte (mostrando apenas o verso com a soma)
- ✅ **Visualização de Soma**: Peças viradas mostram a soma dos valores no verso
- ✅ **Pontos Reais**: Peças exibem pontos (pips) como em dominó físico, não números
- ✅ **Jogada de Peças**: Sistema de encaixe nas pontas esquerda e direita
- ✅ **Indicadores Visuais**: Pontas da mesa piscam quando uma peça pode ser jogada
- ✅ **Blefe**: Jogadores podem blefar quando a peça encaixa, fingindo que não encaixa
- ✅ **Peças da Mão**: Jogadores podem jogar peças da mão após comprar do monte
- ✅ **Orientação Inteligente**: Buchas (valores iguais) ficam horizontais, outras verticais
- ✅ **Animações de Arraste**: Peças compradas do monte animam para a mão do jogador
- ✅ **Jogo Fechado**: Detecta automaticamente quando não há mais peças que encaixam
- ✅ **Cálculo de Pontuação**: Soma o valor do verso das peças restantes

### 🎨 Interface e UX

- ✅ **Design Moderno**: Interface limpa e intuitiva inspirada em jogos mobile
- ✅ **Animações Suaves**: Transições e animações de arraste com Framer Motion
- ✅ **Mesa Realista**: Textura de madeira com efeitos 3D e brilho realista
- ✅ **Pop-ups Informativos**: Feedback visual constante para o jogador
- ✅ **Layout Otimizado**: Jogadores e monte lado a lado, maximizando espaço da mesa
- ✅ **Peças 3D**: Efeitos de profundidade e sombras nas peças de dominó
- ✅ **Responsivo**: Funciona bem em desktop e mobile
- ✅ **Escala Dinâmica**: Peças se ajustam automaticamente para caber na tela sem scroll
- ✅ **Feedback Visual**: Destaque para peças selecionadas, pontas clicáveis e ações disponíveis

### 🔧 Funcionalidades Técnicas

- ✅ **Estado Global**: Gerenciamento com useReducer + Context API
- ✅ **TypeScript**: Tipagem completa e segura
- ✅ **Validação de Jogadas**: Sistema que verifica encaixe antes de permitir jogar
- ✅ **Logs de Jogo**: Histórico completo de todas as ações
- ✅ **Fases do Jogo**: Setup → Playing → Transition → Finished

---

## 🛠️ Tecnologias

### Core

- **[React](https://react.dev/)** 19.2.0 - Biblioteca JavaScript para construção de interfaces
- **[TypeScript](https://www.typescriptlang.org/)** 5.9.3 - Superset JavaScript com tipagem estática
- **[Vite](https://vitejs.dev/)** 7.2.4 - Build tool e dev server rápido

### Animações e UI

- **[Framer Motion](https://www.framer.com/motion/)** 12.23.25 - Biblioteca de animações para React
- **[clsx](https://github.com/lukeed/clsx)** 2.1.1 - Utilitário para construção de classes CSS
- **CSS3** - Estilização moderna com gradientes, sombras e efeitos 3D

### Utilitários

- **[uuid](https://github.com/uuidjs/uuid)** 13.0.0 - Geração de IDs únicos

### Desenvolvimento

- **[ESLint](https://eslint.org/)** 9.39.1 - Linter para qualidade de código
- **[TypeScript ESLint](https://typescript-eslint.io/)** 8.46.4 - Linter específico para TypeScript

---

## 🚀 Instalação

### Pré-requisitos

- **Node.js** 18+ (recomendado: versão LTS)
- **npm** ou **yarn**

### Passos

1. **Clone o repositório**

   ```bash
   git clone https://github.com/seu-usuario/domi-mais.git
   cd domi-mais
   ```

2. **Instale as dependências**

   ```bash
   npm install
   ```

3. **Execute o projeto em desenvolvimento**

   ```bash
   npm run dev
   ```

   O jogo estará disponível em `http://localhost:5173`

4. **Build para produção**

   ```bash
   npm run build
   ```

5. **Preview da build**
   ```bash
   npm run preview
   ```

---

## 🎯 Como Jogar

### Início do Jogo

1. Ao iniciar, uma peça inicial é revelada na mesa ([0|0] ou [6|6])
2. Um jogador é escolhido aleatoriamente para começar
3. Clique em "Iniciar Jogo" para começar a partida

### Durante o Jogo

1. **Comprar Peça** (Obrigatório):

   - **IMPORTANTE**: Você DEVE comprar uma peça do monte a cada turno
   - Clique em uma peça do monte (mostra apenas o verso com a soma)
   - A peça será animada e revelada apenas para você, aparecendo na sua mão
   - Apenas uma peça pode ser comprada por turno

2. **Jogar Peça**:

   - Se a peça encaixa, as pontas da mesa começarão a piscar
   - Você pode:
     - **Clicar na ponta esquerda** da mesa (se piscar) para jogar à esquerda
     - **Clicar na ponta direita** da mesa (se piscar) para jogar à direita
     - **Blefar**: Clicar no botão "Blefar" para fingir que não encaixa e ficar com a peça
   - Se a peça não encaixa, você deve ficar com ela na mão

3. **Jogar Peça da Mão**:

   - Após comprar uma peça do monte, você pode selecionar peças da sua mão
   - Clique em uma peça da sua mão para selecioná-la
   - Siga as mesmas opções acima (clicar nas pontas ou blefar)

4. **Finalizar Turno**:
   - Após jogar ou blefar, o turno passa automaticamente
   - Se não jogou, clique em "Finalizar Turno"
   - O turno passa para o próximo jogador

### Fim do Jogo

O jogo termina quando:

- **Monte vazio**: Não há mais peças para comprar
- **Jogo fechado**: Não há mais peças que encaixem nas pontas

**Vitória**: O jogador com **menor soma** das peças restantes na mão vence.

---

## 📁 Estrutura do Projeto

```
domi-mais/
├── .cursor/                 # Documentação e regras do projeto
│   ├── bootstrap.mdc
│   ├── code_style.mdc
│   ├── game_logic.mdc
│   ├── game_rules.mdc
│   ├── libraries.mdc
│   ├── mvp_scope.mdc
│   ├── tech_stack.mdc
│   └── ux_ui.mdc
├── public/                  # Arquivos estáticos
│   └── vite.svg
├── src/
│   ├── components/         # Componentes React
│   │   ├── DominoPiece.tsx      # Componente de peça de dominó
│   │   ├── DominoPiece.css
│   │   ├── DrawPile.tsx         # Componente do monte de peças
│   │   ├── DrawPile.css
│   │   ├── GameModal.tsx        # Modais do jogo
│   │   ├── GameTable.tsx        # Componente da mesa
│   │   ├── GameTable.css
│   │   ├── Modal.tsx            # Modal genérico
│   │   └── Modal.css
│   ├── game/               # Lógica do jogo
│   │   ├── state/
│   │   │   ├── game-context.tsx      # Context API
│   │   │   ├── game-inicial-state.ts # Estado inicial
│   │   │   ├── game-reducer.ts       # Reducer com lógica
│   │   │   └── game-types.ts         # Tipos TypeScript
│   │   └── utils/
│   │       └── game-modals.ts        # Tipos de modais
│   ├── hooks/              # Custom hooks
│   │   └── useGameModals.ts          # Hook para modais
│   ├── App.tsx             # Componente principal
│   ├── App.css             # Estilos principais
│   ├── index.css           # Estilos globais
│   └── main.tsx            # Entry point
├── .gitignore
├── eslint.config.js
├── index.html
├── package.json
├── README.md
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
└── vite.config.ts
```

---

## 🎲 Regras do Jogo

### Conceito Base

- **28 peças** no total (combinações de 0-0 até 6-6)
- Cada peça possui dois valores numéricos (0 a 6)
- Cada peça possui um **valor oculto (verso)** igual à soma dos lados
- O jogo estimula raciocínio lógico, dedução e blefe

### Início da Partida

- Nenhum jogador inicia com peças na mão
- Jogador inicial é escolhido aleatoriamente
- Peça inicial [0|0] ou [6|6] é revelada na mesa
- Em cada turno, o jogador escolhe uma peça do monte

### Regras de Jogada

**Se a peça encaixa:**

- Pode jogar na esquerda ou direita
- Pode blefar (fingir que não encaixa)

**Se a peça não encaixa:**

- O jogador é obrigado a ficar com a peça

### Blefe

- Mecânica válida e estratégica
- Só é possível quando a peça realmente encaixa
- O sistema não valida ou expõe o blefe

### Fim de Jogo

O jogo termina quando:

1. Não há mais peças no monte, OU
2. O jogo está fechado (nenhuma peça disponível encaixa nas pontas)

**Vitória**: Jogador com menor soma das peças restantes na mão.

---

## 🔄 Processo de Desenvolvimento

### Fase 1: Bootstrap e Estrutura

- ✅ Criação do projeto Vite + React + TypeScript
- ✅ Organização da estrutura de pastas
- ✅ Configuração de linting e TypeScript

### Fase 2: Estado e Lógica

- ✅ Implementação do estado global com useReducer + Context API
- ✅ Criação dos tipos TypeScript
- ✅ Desenvolvimento do reducer com todas as ações
- ✅ Lógica de geração e embaralhamento das peças

### Fase 3: Componentes Base

- ✅ Componente de peça de dominó estilizada
- ✅ Componente de mesa do jogo
- ✅ Sistema de modais/pop-ups
- ✅ Componente do monte de peças

### Fase 4: Interface e UX

- ✅ Layout responsivo e moderno
- ✅ Animações com Framer Motion
- ✅ Sistema de feedback visual
- ✅ Otimização de espaço e layout

### Fase 5: Funcionalidades Avançadas

- ✅ Sistema de blefe
- ✅ Detecção de jogo fechado
- ✅ Validação de encaixe por lado
- ✅ Orientação inteligente das peças (buchas verticais)
- ✅ Escala dinâmica para visualização

### Fase 6: Refinamentos

- ✅ Otimização de performance
- ✅ Ajustes de UX/UI
- ✅ Correção de bugs
- ✅ Melhorias de responsividade

### Fase 7: Melhorias Visuais e de UX

- ✅ Implementação de pontos (pips) reais nas peças de dominó
- ✅ Layout otimizado: jogadores e monte lado a lado
- ✅ Animações de arraste de peças do monte para a mão
- ✅ Indicadores visuais piscantes nas pontas da mesa
- ✅ Sistema de compra obrigatória por turno
- ✅ Correção de bugs de desaparecimento de peças
- ✅ Visualização de soma no verso das peças

---

## 🎨 Design e UX

### Princípios de Design

- **Moderno e Limpo**: Interface inspirada em jogos mobile
- **Feedback Constante**: Pop-ups informativos em momentos-chave
- **Animações Suaves**: Transições que melhoram a experiência
- **Visual Realista**: Mesa de madeira com peças 3D

### Pop-ups Implementados

- ✅ "Sua vez" - Quando é a vez do jogador
- ✅ "Peça encaixa" - Quando a peça comprada encaixa
- ✅ "Peça não encaixa" - Quando a peça não encaixa
- ✅ "Blefe realizado" - Após blefar
- ✅ "Passe o dispositivo" - Entre turnos
- ✅ "Fim de jogo" - Quando o jogo termina

### Melhorias Recentes

- ✅ **Peças com Pontos Reais**: Implementação de padrões de pontos (pips) como em dominó físico
- ✅ **Layout Otimizado**: Jogadores e monte organizados lado a lado, maximizando espaço da mesa
- ✅ **Animações de Arraste**: Peças compradas do monte animam suavemente para a mão do jogador
- ✅ **Indicadores Visuais**: Pontas da mesa piscam quando uma peça pode ser jogada
- ✅ **Compra Obrigatória**: Sistema que garante que cada jogador compre uma peça por turno
- ✅ **Visualização de Soma**: Peças viradas mostram a soma dos valores no verso
- ✅ **Correções de Bugs**: Resolução de problemas de desaparecimento de peças e seleção

---

## 🧪 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev          # Inicia servidor de desenvolvimento

# Build
npm run build        # Compila para produção

# Qualidade
npm run lint         # Executa o linter

# Preview
npm run preview      # Preview da build de produção
```

---

## 📝 Convenções de Código

### Estrutura

- Componentes em PascalCase
- Hooks com prefixo `use`
- Funções em camelCase
- Tipos TypeScript explícitos (sem `any`)

### Organização

- Componentes em `/components`
- Lógica do jogo em `/game`
- Hooks customizados em `/hooks`
- Estilos junto aos componentes

### TypeScript

- Tipagem explícita obrigatória
- Uso de `import type` para tipos
- Sem uso de `any`

---

## 🚧 Limitações do MVP

- ❌ Sem multiplayer online
- ❌ Sem backend
- ❌ Sem persistência de dados
- ❌ Sem sistema de login
- ❌ Sem ranking ou estatísticas
- ❌ Apenas 2 jogadores

---

## 🔮 Futuras Melhorias

- [ ] Sistema de ranking
- [ ] Estatísticas de partidas
- [ ] Multiplayer online
- [ ] Modo single-player com IA
- [ ] Temas visuais personalizáveis
- [ ] Sons e efeitos sonoros
- [ ] Tutorial interativo
- [ ] Histórico de partidas

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 👥 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para:

1. Fazer fork do projeto
2. Criar uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abrir um Pull Request

---

## 📧 Contato

Para dúvidas, sugestões ou problemas, abra uma [issue](https://github.com/seu-usuario/domi-mais/issues) no repositório.

---

<div align="center">

**Desenvolvido por [Matheus Queiroz](https://matheusqueiroz.dev.br)**

</div>




Precisamos agora fazer o deploy de um novo repositório na VPS. O repositório está no github e é público. Esse repositório se trata de uma aplicação fullstack (backend + frontend) chamada etern-ai. Ela está disponível em um único repositório monorepo, utilizando o Turborepo.

O backend foi desenvolvido com Node.js, TypeScript, Fastify, Drizzle, Postgres e Docker. O frontend foi desenvolvido com React, Vite, TrypeScript, TailwindCSS, Tanstack Query e Tanstack Router.

Essa aplicação vai estar disponível no domínio eternai.com.br.

Precisamos configurar tanto o NGINX quanto o PM2 para realizar o deploy dessa aplicação na VPS.

Os nomes das pastas:

Backend: apps/api
Frontend: apps/web
Vou te mostrar os scripts do frontend e backend que eu uso na aplicação:

Backend:
"scripts": {
"dev": "tsx watch --env-file=.env src/server.ts",
"build": "tsc",
"start": "node dist/server.js",
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:studio": "drizzle-kit studio",
"db:push": "drizzle-kit push"
},

Frontend:
"scripts": {
"dev": "vite --host",
"build": "tsc -b && vite build",
"preview": "vite preview"
},