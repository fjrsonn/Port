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

### 2.1) Rodar a API Python do agente

Crie um arquivo `.env` na raiz do projeto com base em `.env.example`.

Hoje o projeto estÃ¡ configurado para usar **Grok/xAI** por padrÃ£o, com `LLM_PROVIDER=xai` e `XAI_API_KEY`.
As configuraÃ§Ãµes da **OpenAI** continuam disponÃ­veis no mesmo `.env` para uso futuro, bastando trocar `LLM_PROVIDER=openai`.

Instale as dependencias do backend:

```bash
pip install -r backend/requirements.txt
```

Depois, rode a API:

```bash
npm run dev:api
```

Com isso, o front em desenvolvimento vai encaminhar `/api/*` para `http://127.0.0.1:8000` usando o proxy do Vite.

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


npm.cmd run dev:api
npm.cmd run dev

http://localhost:5173/
http://localhost:5173/api/health
http://127.0.0.1:8000/

beckend2.png = PYTHON
beckend3.png = NODE.JS
beckend4.png = MYSQL
beckend5.png = DOCKER
frontend1.png = JAVA SCRIPT
frontend2.png = TYPE SCRIPT
frontend3.png = HTML5
frontend4.png = CSS3
frontend5.png = REACT
frontend6.png = NEXT.JS
SEC1.png = PYTHON
SEC2.png = NUMPY
SEC3.png = PANDAS
SEC4.png = SEABORN
SEC5.png = SCIKIT LEARN
SEC6.png = TENSOR FLOW
SEC7.png = PYTORCH
SEC8.png = MLFLOW
SEC9.png = MYSQL
SEC10.png = AWS
SEC11.png = AZURE
SEC12.png = CISCO
SEC13.png = PFSENSE
SEC14.png = SURICATA
SEC15.png = NMAP
SEC16.png = WIRESHARK
SEC17.png = WAZUH
SEC18.png = SPLUNK
SEC19.png = LINUX
SEC20.png = WINDOWS SERVER
SEC21.png = BASH
SEC22.png = POWERSHEL
SEC23.png = APACHE
SEC24.png = VMWEARE
SEC25.png = MICROSOFT HYPER-V
SEC26.png = VIRTUALBOX
SEC27.png = GIT


