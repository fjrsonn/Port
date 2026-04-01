# Portfólio Landing Page (Vite + React + TypeScript + GSAP)

Landing page de portfólio com 4 níveis de navegação/experiência visual:

1. **Intro**: tela preta com texto `Flavio Junior` aparecendo com fade suave.
2. **Início (Hero)**: texto `FJR.` centralizado com efeito **TextScramble** + **glow** no hover.
3. **Projetos**: 3 vídeos fullscreen com transição horizontal usando **GSAP ScrollTrigger**.
4. **Apresentação**: seção de história pessoal.

## Tecnologias

- [Vite](https://vitejs.dev/)
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- CSS
- [GSAP](https://gsap.com/) + ScrollTrigger
- Framer Motion

## Pré-requisitos

- **Node.js 18+** (recomendado Node.js 20+)
- **npm 9+**

## Como iniciar o projeto

### 1) Instalar dependências

```bash
npm install
```

> Esse comando instala todas as dependências do `package.json`.

### 2) Rodar em desenvolvimento

```bash
npm run dev
```

Depois, abra a URL exibida no terminal (normalmente `http://localhost:5173`).

### 3) Build de produção

```bash
npm run build
```

### 4) Preview da build

```bash
npm run preview
```

## Estrutura de pastas

```txt
.
├─ src/
│  ├─ components/
│  │  └─ TextScramble.tsx
│  ├─ sections/
│  │  ├─ IntroSection.tsx
│  │  ├─ HeroSection.tsx
│  │  ├─ ProjectsSection.tsx
│  │  └─ AboutSection.tsx
│  ├─ App.tsx
│  ├─ main.tsx
│  └─ styles.css
├─ index.html
├─ package.json
├─ tsconfig.json
├─ tsconfig.app.json
├─ tsconfig.node.json
└─ vite.config.ts
```

## Observações

- Se `npm install` falhar por bloqueio de rede/política (ex.: `403 Forbidden`), rode em um ambiente com acesso ao registro npm.
- Os vídeos da seção de projetos usam links remotos de exemplo e podem ser substituídos por assets locais em `src/assets`.
