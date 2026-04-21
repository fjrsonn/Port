import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type Dispatch,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
} from 'react';
import { AnimatePresence, motion, useIsPresent } from 'framer-motion';
import gsap from 'gsap';
import { FaGithub, FaLinkedin, FaMicrophone, FaPaperPlane, FaSearch } from 'react-icons/fa';
import { HeroAgentPanel, type HeroAgentTurn } from '../components/hero-agent/HeroAgentPanel';
import { HeroParticlesAdvanced } from '../components/hero-particles/HeroParticlesAdvanced';
import type { HeroTransitionPhase, ShapeName } from '../components/hero-particles/engine/types';
import { sendAgentMessage } from '../lib/agentApi';

export type HeroSharedProfileUiState = {
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  activeSearchPromptIndex: number;
  setActiveSearchPromptIndex: Dispatch<SetStateAction<number>>;
  agentTurns: HeroAgentTurn[];
  setAgentTurns: Dispatch<SetStateAction<HeroAgentTurn[]>>;
  isAgentPanelDismissed: boolean;
  setIsAgentPanelDismissed: Dispatch<SetStateAction<boolean>>;
};

export type HeroSectionProps = {
  sectionId?: string;
  sampleIndex?: number;
  renderSearchUi?: boolean;
  renderProfileGuideParticle?: boolean;
  transitionTargetSampleIndex?: number | null;
  transitionRequestId?: number;
  transitionSkipFinalSampleLoad?: boolean;
  disableAmbientAutoHide?: boolean;
  externalProfileBioVisible?: boolean;
  isSectionParticleExitActive?: boolean;
  isVideoHovering?: boolean;
  isMainVisible?: boolean;
  isProjectCardVisible?: boolean;
  sharedProfileUiState?: HeroSharedProfileUiState;
  onExternalSampleChange?: (sampleIndex: number) => void;
  onExternalShapeChange?: (shape: ShapeName) => void;
  onExternalTransitionPhaseChange?: (phase: HeroTransitionPhase) => void;
  onProfileTypingCompleteChange?: (isComplete: boolean) => void;
};

type SpeechRecognitionAlternativeLike = {
  transcript: string;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type SearchBarDragState = {
  activePointerId: number | null;
  isDragging: boolean;
  maxOffsetX: number;
  maxOffsetY: number;
  pendingX: number;
  pendingY: number;
  startPointerX: number;
  startPointerY: number;
};

const getElasticDragOffset = (delta: number, limit: number) => {
  const softness = Math.max(limit * 1.65, 52);
  return limit * Math.tanh(delta / softness);
};

const rotatingSearchPrompts = [
  'Pergunte sobre Flavio Jr. ou qualquer tema!',
  'Quais são as habilidades do Flavio Jr.?',
  'Quantos anos tem Flavio Jr.?',
  'Qual é o currículo completo do Flavio Jr.?',
  'Por quais empresas o Flavio Jr. passou?',
  'Quais são os projetos do Flavio Jr.?',
] as const;

const searchIntroMessage = 'Olá, Sejam Bem vindos!';

const profileGuideMoveDurationMs = 340;
const profileGuideProfileCount = 4;
const bioHoverGlowExitDelayMs = 3000;

type HeroBioLine = {
  label: string;
  value: string;
};

const heroBioContent: Record<number, { left: HeroBioLine[]; right: HeroBioLine[] }> = {
  1: {
    left: [
      { label: 'Idade', value: '26 anos' },
      { label: 'País', value: 'Brasil' },
      { label: 'Estado', value: 'São Paulo' },
      { label: 'Cidade', value: 'São Bernardo do Campo' },
      { label: 'Método de aprendizado', value: 'Autodidata' },
      { label: 'Área de interesse', value: 'Tecnologia da Informação e Ciência da computação' },
      { label: 'Profissão atual', value: 'Segurança privada' },
      { label: 'Função profissional', value: 'Monitoramento por meio da tecnologia' },
      { label: 'Experiência profissional', value: '4 anos' },
    ],
    right: [
      {
        label: 'Responsabilidades',
        value:
          'Desenvolvimento e manutenção de aplicações utilizando JavaScript, TypeScript, React, Next.js, HTML5, CSS3 e Tailwind CSS no frontend, com integração via REST e GraphQL. No backend, atuação com Python, Node.js, Express.js, Django e FastAPI, além de gerenciamento de dados com PostgreSQL, MySQL e MongoDB e implementação de segurança com JWT e OAuth. Experiência em CI/CD (GitHub Actions, GitLab CI), Docker, Kubernetes, AWS, Azure, Terraform e automação de processos com n8n e Python.',
      },
    ],
  },
  2: {
    left: [
      {
        label: 'Frontend',
        value: ['JavaScript \u2022 TypeScript', 'React \u2022 Next.js', 'HTML5 \u2022 CSS3 \u2022 Tailwind CSS', 'REST \u2022 GraphQL'].join('\n'),
      },
      {
        label: 'Backend',
        value: [
          'Python',
          'Node.js \u2022 Express.js',
          'Django \u2022 FastAPI',
          'PostgreSQL \u2022 MySQL \u2022 MongoDB',
          'JWT \u2022 OAuth',
          'APIs \u2022 RESTful',
        ].join('\n'),
      },
      {
        label: 'DevOps',
        value: ['CI/CD \u2022 GitHub Actions \u2022 GitLab CI', 'Docker \u2022 Kubernetes', 'AWS \u2022 Azure', 'Terraform', 'n8n'].join('\n'),
      },
      {
        label: 'Automation & Machine Learning',
        value: [
          'Python Automation',
          'Scripts \u2022 Web Scraping \u2022 Data Processing',
          'Task Automation \u2022 Workflow Automation',
          'API Integration \u2022 Log Parsing',
          'Machine Learning \u2022 Model Training',
          'Data Analysis \u2022 Pattern Detection',
          'Model Handling \u2022 Prediction Systems',
        ].join('\n'),
      },
    ],
    right: [
      {
        label: 'Acess',
        value:
          'Projeto voltado ao controle e gerenciamento de acessos em portarias e ambientes privados, com foco em triagem, organização e reforço da segurança operacional.',
      },
      {
        label: 'Aut-A',
        value:
          'Projeto desenvolvido para automações inteligentes em chats, utilizando agentes capazes de otimizar fluxos de atendimento, interação e execução de tarefas automatizadas.',
      },
      {
        label: 'Prom-Pt',
        value:
          'Projeto voltado à curadoria e disponibilização de prompts estratégicos para desenvolvimento com Inteligência Artificial, facilitando a produtividade, experimentação e criação de soluções assistidas por IA.',
      },
    ],
  },
  3: {
    left: [
      { label: 'Área de interesse', value: 'Desenvolvimento seguro e cibersegurança' },
      { label: 'Foco profissional', value: 'DevSecOps, automação e infraestrutura segura' },
      { label: 'Especialidade técnica', value: 'Monitoramento, gestão de vulnerabilidades e proteção de ambientes' },
      { label: 'Modelo de atuação', value: 'Integração entre desenvolvimento, operações e segurança' },
      {
        label: 'Stacks utilizadas',
        value:
          'Detection Stack \u2022 Security Operations \u2022 Attack Surface Management \u2022 Secure Network Architecture',
      },
      {
        label: 'Objetivo técnico',
        value:
          'Construção de sistemas, redes e ambientes resilientes, escaláveis e seguros',
      },
    ],
    right: [
      {
        label: 'Responsabilidades',
        value:
          'Desenvolvedor com foco em automação de segurança, cibersegurança e Machine Learning, utilizando Python para integração entre ferramentas, análise de dados, detecção de padrões, resposta a incidentes e construção de soluções inteligentes voltadas à segurança.',
      },
    ],
  },
  4: {
    left: [
      {
        label: 'Detection Stack',
        value: [
          'SIEM \u2022 EDR/XDR \u2022 SOAR',
          'Threat Intelligence \u2022 IOC Feeds',
          'Splunk \u2022 Microsoft Sentinel',
          'CrowdStrike \u2022 Microsoft Defender',
          'Automação \u2022 Orquestração',
        ].join('\n'),
      },
      {
        label: 'Security Operations',
        value: [
          'CI/CD \u2022 GitHub Actions \u2022 GitLab CI',
          'SAST \u2022 DAST \u2022 SCA',
          'IaC Scanning \u2022 Container Scanning',
          'Policy as Code \u2022 Secrets Scanning',
          'Segurança em Pipeline',
        ].join('\n'),
      },
      {
        label: 'SOC Automation & ML Stack',
        value: [
          'Python \u2022 Machine Learning \u2022 SIEM \u2022 SOAR',
          'Log Analysis \u2022 Alert Enrichment',
          'Threat Intelligence \u2022 IOC Correlation',
          'Anomaly Detection \u2022 Pattern Detection',
          'Incident Response \u2022 Playbook Automation',
        ].join('\n'),
      },
    ],
    right: [
      {
        label: 'IDS-ML Private',
        value:
          'Projeto voltado ao desenvolvimento de um Sistema de Detecção de Intrusos (IDS) baseado em técnicas de Machine Learning, com foco na identificação de padrões suspeitos, análise de tráfego e apoio à detecção de ameaças em ambientes privados.',
      },
      {
        label: 'D-ML Private',
        value:
          'Projeto desenvolvido para detecção de malware com Machine Learning, utilizando modelos capazes de analisar comportamentos, identificar arquivos maliciosos e fortalecer os processos de prevenção e resposta a ameaças digitais.',
      },
    ],
  },
};

const emptyHeroBioContent: { left: HeroBioLine[]; right: HeroBioLine[] } = {
  left: [],
  right: [],
};

const profileTwoBioContent: { left: HeroBioLine[]; right: HeroBioLine[] } = {
  left: heroBioContent[3].left,
  right: [],
};

export function HeroSection({
  sectionId = 'inicio',
  sampleIndex = 0,
  renderSearchUi = true,
  renderProfileGuideParticle = true,
  transitionTargetSampleIndex = null,
  transitionRequestId = 0,
  transitionSkipFinalSampleLoad = false,
  disableAmbientAutoHide = false,
  externalProfileBioVisible = true,
  isSectionParticleExitActive = false,
  isVideoHovering = false,
  isMainVisible = true,
  isProjectCardVisible = false,
  sharedProfileUiState,
  onExternalSampleChange,
  onExternalShapeChange,
  onExternalTransitionPhaseChange,
  onProfileTypingCompleteChange,
}: HeroSectionProps) {
  const resolvedSampleIndex = Math.min(Math.max(sampleIndex, 0), profileGuideProfileCount);
  const initialShape: ShapeName = resolvedSampleIndex === 0 ? 'fjr' : 'profile';
  const activeBioContent =
    resolvedSampleIndex === 1
      ? heroBioContent[1]
      : resolvedSampleIndex === 3
        ? profileTwoBioContent
        : emptyHeroBioContent;
  const activeHeroBioLines = activeBioContent.left;
  const activeHeroBioRightLines = activeBioContent.right;
  const hasProfileBioContent = activeHeroBioLines.length > 0 || activeHeroBioRightLines.length > 0;
  const heroRef = useRef<HTMLElement | null>(null);
  const heroStageRef = useRef<HTMLDivElement | null>(null);
  const profileGuideParticleRef = useRef<HTMLDivElement | null>(null);
  const searchBarShellRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const searchIntroTextRef = useRef('');
  const searchIntroModeRef = useRef<'idle' | 'typingIn' | 'typingOut' | 'completed'>('idle');
  const isPresent = useIsPresent();
  const isPresenceExiting = !isPresent;

  const [hasEnteredViewport, setHasEnteredViewport] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [typedSubtitle, setTypedSubtitle] = useState('');
  const [hideFixedTitle, setHideFixedTitle] = useState(false);
  const [currentShape, setCurrentShape] = useState<ShapeName>(initialShape);
  const [currentParticleSampleIndex, setCurrentParticleSampleIndex] = useState(resolvedSampleIndex);
  const [particleTransitionPhase, setParticleTransitionPhase] = useState<HeroTransitionPhase>('idle');
  const [searchQuery, setSearchQuery] = useState('');
  const [isListeningToSearch, setIsListeningToSearch] = useState(false);
  const [activeSearchPromptIndex, setActiveSearchPromptIndex] = useState(0);
  const [searchIntroDisplayText, setSearchIntroDisplayText] = useState('');
  const [agentTurns, setAgentTurns] = useState<HeroAgentTurn[]>([]);
  const [isAgentPanelDismissed, setIsAgentPanelDismissed] = useState(false);
  const [visibleBioLabels, setVisibleBioLabels] = useState(0);
  const [typedBioLabels, setTypedBioLabels] = useState<string[]>([]);
  const [displayBioValues, setDisplayBioValues] = useState<string[]>([]);
  const [glowingBioIndexes, setGlowingBioIndexes] = useState<Set<number>>(new Set());
  const [isInitialBioGlowActive, setIsInitialBioGlowActive] = useState(false);
  const [visibleBioRightLabels, setVisibleBioRightLabels] = useState(0);
  const [typedBioRightLabels, setTypedBioRightLabels] = useState<string[]>([]);
  const [displayBioRightValues, setDisplayBioRightValues] = useState<string[]>([]);
  const [glowingBioRightIndexes, setGlowingBioRightIndexes] = useState<Set<number>>(new Set());
  const [isInitialBioRightGlowActive, setIsInitialBioRightGlowActive] = useState(false);
  const [isProfileBioVisible, setIsProfileBioVisible] = useState(true);
  const [isSearchBarRestVisible, setIsSearchBarRestVisible] = useState(true);
  const [activeProfileGuideIndex, setActiveProfileGuideIndex] = useState<number | null>(
    resolvedSampleIndex >= 1 && resolvedSampleIndex <= profileGuideProfileCount ? resolvedSampleIndex : null,
  );
  const [isProfileGuideVisible, setIsProfileGuideVisible] = useState(
    resolvedSampleIndex >= 1 && resolvedSampleIndex <= profileGuideProfileCount,
  );
  const [isProfileSceneExiting, setIsProfileSceneExiting] = useState(false);
  const [isProfileTypingComplete, setIsProfileTypingComplete] = useState(false);

  const hideDetailsTimerRef = useRef<number | null>(null);
  const subtitleTypingTimerRef = useRef<number | null>(null);
  const searchIntroTypingTimerRef = useRef<number | null>(null);
  const rotatingSearchPromptTimerRef = useRef<number | null>(null);
  const bioTypingTimerRef = useRef<number | null>(null);
  const bioInitialGlowTimerRef = useRef<number | null>(null);
  const bioInitialScrambleRafRef = useRef<number | null>(null);
  const bioScrambleRafRefs = useRef<Map<number, number>>(new Map());
  const bioHoverGlowTimerRefs = useRef<Map<number, number>>(new Map());
  const bioRightTypingTimerRef = useRef<number | null>(null);
  const bioRightInitialGlowTimerRef = useRef<number | null>(null);
  const bioRightInitialScrambleRafRef = useRef<number | null>(null);
  const bioRightScrambleRafRefs = useRef<Map<number, number>>(new Map());
  const bioRightHoverGlowTimerRefs = useRef<Map<number, number>>(new Map());
  const hasScheduledIntroRef = useRef(false);
  const hasPlayedHeroRevealRef = useRef(false);
  const isFixedTitleHiddenRef = useRef(false);
  const profileAmbientHideTimerRef = useRef<number | null>(null);
  const wasProfileAmbientActiveRef = useRef(false);
  const isBottomEdgeTriggerReadyRef = useRef(true);
  const profileGuideDragRafRef = useRef<number | null>(null);
  const searchBarDragRafRef = useRef<number | null>(null);
  const agentRequestAbortRef = useRef<AbortController | null>(null);
  const profileGuideDragStateRef = useRef<SearchBarDragState>({
    activePointerId: null,
    isDragging: false,
    maxOffsetX: 0,
    maxOffsetY: 0,
    pendingX: 0,
    pendingY: 0,
    startPointerX: 0,
    startPointerY: 0,
  });
  const searchBarDragStateRef = useRef<SearchBarDragState>({
    activePointerId: null,
    isDragging: false,
    maxOffsetX: 0,
    maxOffsetY: 0,
    pendingX: 0,
    pendingY: 0,
    startPointerX: 0,
    startPointerY: 0,
  });

  const subtitleText = 'Machine Learning & Full Stack Dev.';
  const shouldRenderEmbeddedSearchUi = renderSearchUi && !sharedProfileUiState;
  const isSectionActive = isMainVisible && hasEnteredViewport;
  const shouldHideFixedTitle = hideFixedTitle || isVideoHovering;
  const isParticleSceneActive = particleTransitionPhase !== 'idle';
  const isProfileExitActive = isProfileSceneExiting || isPresenceExiting || isSectionParticleExitActive;
  const shouldShowSearchBar = shouldRenderEmbeddedSearchUi && (currentShape === 'profile' || isParticleSceneActive);
  const isSearchBarElasticReady =
    shouldRenderEmbeddedSearchUi &&
    currentShape === 'profile' &&
    particleTransitionPhase === 'idle' &&
    !shouldHideFixedTitle;
  const isSearchBarInteractionReady =
    isSearchBarElasticReady &&
    isSearchBarRestVisible &&
    !isProfileExitActive &&
    searchIntroDisplayText.length === 0;
  const shouldShowAgentPanel =
    shouldRenderEmbeddedSearchUi &&
    isSearchBarElasticReady &&
    !isAgentPanelDismissed &&
    !isProfileExitActive &&
    agentTurns.length > 0;
  const resolvedProfileGuideIndex =
    activeProfileGuideIndex !== null && activeProfileGuideIndex >= 1 && activeProfileGuideIndex <= profileGuideProfileCount
      ? activeProfileGuideIndex
      : 1;
  const shouldShowProfileGuideParticle =
    renderProfileGuideParticle &&
    !isProfileExitActive &&
    currentShape === 'profile' &&
    currentParticleSampleIndex >= 1 &&
    currentParticleSampleIndex <= profileGuideProfileCount &&
    particleTransitionPhase === 'idle' &&
    isProfileGuideVisible;
  const profileGuideLayerStyle = {
    '--hero-profile-guide-move-duration': `${profileGuideMoveDurationMs}ms`,
  } as CSSProperties;
  const activeSearchPrompt = rotatingSearchPrompts[activeSearchPromptIndex] ?? rotatingSearchPrompts[0];
  const shouldShowSearchIntroText = searchIntroDisplayText.length > 0;
  const agentPanelRoute =
    [...agentTurns].reverse().find((turn) => turn.route !== null)?.route ?? null;
  const effectiveProfileBioVisible =
    (disableAmbientAutoHide ? externalProfileBioVisible : isProfileBioVisible) &&
    !isProfileExitActive &&
    !shouldShowAgentPanel;
  const searchSceneClassName = [
    'hero-search-scene',
    shouldShowSearchBar ? 'hero-search-scene--visible' : '',
    isParticleSceneActive ? `hero-search-scene--${particleTransitionPhase}` : '',
    currentShape === 'profile' ? 'hero-search-scene--ready' : '',
    shouldShowSearchIntroText ? 'hero-search-scene--intro-visible' : '',
    isSearchBarInteractionReady ? 'hero-search-scene--controls-ready' : '',
    isSearchBarElasticReady && !isSearchBarRestVisible && !shouldShowAgentPanel ? 'hero-search-scene--rest-hidden' : '',
  ]
    .filter(Boolean)
    .join(' ');

  useEffect(() => {
    onProfileTypingCompleteChange?.(isProfileTypingComplete);
  }, [isProfileTypingComplete, onProfileTypingCompleteChange]);

  useEffect(() => {
    const element = heroRef.current;
    if (!element || hasEnteredViewport) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setHasEnteredViewport(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.2,
        rootMargin: '160px 0px',
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [hasEnteredViewport]);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;

    let rafId: number | null = null;

    const updateTitleVisibility = () => {
      const { top, height } = el.getBoundingClientRect();
      const hideAt = -(height * 0.9);
      const showAt = -(height * 0.78);

      if (!isFixedTitleHiddenRef.current && top <= hideAt) {
        isFixedTitleHiddenRef.current = true;
        setHideFixedTitle(true);
      } else if (isFixedTitleHiddenRef.current && top >= showAt) {
        isFixedTitleHiddenRef.current = false;
        setHideFixedTitle(false);
      }
    };

    const onScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        updateTitleVisibility();
      });
    };

    updateTitleVisibility();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, []);

  const scheduleDetailsAutoHide = useCallback(() => {
    if (hideDetailsTimerRef.current) {
      window.clearTimeout(hideDetailsTimerRef.current);
    }

    hideDetailsTimerRef.current = window.setTimeout(() => {
      setShowDetails(false);
      hideDetailsTimerRef.current = null;
    }, 5000);
  }, []);

  const revealDetails = useCallback(() => {
    if (isProjectCardVisible) return;
    setShowDetails(true);
    scheduleDetailsAutoHide();
  }, [isProjectCardVisible, scheduleDetailsAutoHide]);

  useEffect(() => {
    if (!isSectionActive || hasScheduledIntroRef.current) return;
    hasScheduledIntroRef.current = true;

    const introTimer = window.setTimeout(() => {
      revealDetails();
    }, 950);

    return () => window.clearTimeout(introTimer);
  }, [isSectionActive, revealDetails]);

  useLayoutEffect(() => {
    if (!isSectionActive || hasPlayedHeroRevealRef.current || !heroStageRef.current) return;
    hasPlayedHeroRevealRef.current = true;

    const stageEl = heroStageRef.current;
    const tl = gsap.timeline();

    tl.set(stageEl, { opacity: 0, scale: 1.03, y: 10, filter: 'blur(8px)' }).to(stageEl, {
      opacity: 1,
      scale: 1,
      y: 0,
      filter: 'blur(0px)',
      duration: 0.8,
      ease: 'power3.out',
    });

    return () => {
      tl.kill();
      gsap.set(stageEl, { clearProps: 'opacity,scale,y,filter' });
    };
  }, [isSectionActive]);

  useEffect(() => {
    return () => {
      if (hideDetailsTimerRef.current) window.clearTimeout(hideDetailsTimerRef.current);
      if (subtitleTypingTimerRef.current) window.clearTimeout(subtitleTypingTimerRef.current);
      if (searchIntroTypingTimerRef.current) window.clearTimeout(searchIntroTypingTimerRef.current);
      if (rotatingSearchPromptTimerRef.current) window.clearTimeout(rotatingSearchPromptTimerRef.current);
      if (bioTypingTimerRef.current) window.clearTimeout(bioTypingTimerRef.current);
      if (bioInitialGlowTimerRef.current) window.clearTimeout(bioInitialGlowTimerRef.current);
      if (bioInitialScrambleRafRef.current) window.cancelAnimationFrame(bioInitialScrambleRafRef.current);
      bioScrambleRafRefs.current.forEach((rafId) => window.cancelAnimationFrame(rafId));
      bioScrambleRafRefs.current.clear();
      bioHoverGlowTimerRefs.current.forEach((timerId) => window.clearTimeout(timerId));
      bioHoverGlowTimerRefs.current.clear();
      if (bioRightTypingTimerRef.current) window.clearTimeout(bioRightTypingTimerRef.current);
      if (bioRightInitialGlowTimerRef.current) window.clearTimeout(bioRightInitialGlowTimerRef.current);
      if (bioRightInitialScrambleRafRef.current) window.cancelAnimationFrame(bioRightInitialScrambleRafRef.current);
      bioRightScrambleRafRefs.current.forEach((rafId) => window.cancelAnimationFrame(rafId));
      bioRightScrambleRafRefs.current.clear();
      bioRightHoverGlowTimerRefs.current.forEach((timerId) => window.clearTimeout(timerId));
      bioRightHoverGlowTimerRefs.current.clear();
      if (profileAmbientHideTimerRef.current) window.clearTimeout(profileAmbientHideTimerRef.current);
      agentRequestAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!showDetails) {
      setTypedSubtitle('');
      return;
    }

    if (subtitleTypingTimerRef.current) {
      window.clearTimeout(subtitleTypingTimerRef.current);
      subtitleTypingTimerRef.current = null;
    }

    let charIndex = 0;
    setTypedSubtitle('');

    const typeNext = () => {
      charIndex += 1;
      setTypedSubtitle(subtitleText.slice(0, charIndex));

      if (charIndex >= subtitleText.length) {
        subtitleTypingTimerRef.current = null;
        return;
      }

      subtitleTypingTimerRef.current = window.setTimeout(typeNext, 58 + Math.random() * 48);
    };

    subtitleTypingTimerRef.current = window.setTimeout(typeNext, 260);

    return () => {
      if (subtitleTypingTimerRef.current) {
        window.clearTimeout(subtitleTypingTimerRef.current);
        subtitleTypingTimerRef.current = null;
      }
    };
  }, [showDetails]);

  useLayoutEffect(() => {
    const shouldShowBio = isSectionActive && !hideFixedTitle && currentShape === 'profile' && hasProfileBioContent;

    if (!shouldShowBio) {
      setVisibleBioLabels(0);
      setTypedBioLabels([]);
      setDisplayBioValues([]);
      setGlowingBioIndexes(new Set());
      setIsInitialBioGlowActive(false);
      setVisibleBioRightLabels(0);
      setTypedBioRightLabels([]);
      setDisplayBioRightValues([]);
      setGlowingBioRightIndexes(new Set());
      setIsInitialBioRightGlowActive(false);
      setIsProfileTypingComplete(!hasProfileBioContent && isSectionActive && currentShape === 'profile');
      setIsProfileBioVisible(true);
      setIsSearchBarRestVisible(true);
      setIsProfileSceneExiting(false);
      wasProfileAmbientActiveRef.current = false;
      if (bioTypingTimerRef.current) {
        window.clearTimeout(bioTypingTimerRef.current);
        bioTypingTimerRef.current = null;
      }
      if (bioRightTypingTimerRef.current) {
        window.clearTimeout(bioRightTypingTimerRef.current);
        bioRightTypingTimerRef.current = null;
      }
      if (bioInitialGlowTimerRef.current) {
        window.clearTimeout(bioInitialGlowTimerRef.current);
        bioInitialGlowTimerRef.current = null;
      }
      if (bioRightInitialGlowTimerRef.current) {
        window.clearTimeout(bioRightInitialGlowTimerRef.current);
        bioRightInitialGlowTimerRef.current = null;
      }
      if (bioInitialScrambleRafRef.current) {
        window.cancelAnimationFrame(bioInitialScrambleRafRef.current);
        bioInitialScrambleRafRef.current = null;
      }
      if (bioRightInitialScrambleRafRef.current) {
        window.cancelAnimationFrame(bioRightInitialScrambleRafRef.current);
        bioRightInitialScrambleRafRef.current = null;
      }
      bioScrambleRafRefs.current.forEach((rafId) => window.cancelAnimationFrame(rafId));
      bioScrambleRafRefs.current.clear();
      bioRightScrambleRafRefs.current.forEach((rafId) => window.cancelAnimationFrame(rafId));
      bioRightScrambleRafRefs.current.clear();
      bioHoverGlowTimerRefs.current.forEach((timerId) => window.clearTimeout(timerId));
      bioHoverGlowTimerRefs.current.clear();
      bioRightHoverGlowTimerRefs.current.forEach((timerId) => window.clearTimeout(timerId));
      bioRightHoverGlowTimerRefs.current.clear();
      if (profileAmbientHideTimerRef.current) {
        window.clearTimeout(profileAmbientHideTimerRef.current);
        profileAmbientHideTimerRef.current = null;
      }
      return;
    }

    setVisibleBioLabels(0);
    setTypedBioLabels(new Array(activeHeroBioLines.length).fill(''));
    setDisplayBioValues(new Array(activeHeroBioLines.length).fill(''));
    setGlowingBioIndexes(new Set());
    setIsInitialBioGlowActive(false);
    setVisibleBioRightLabels(0);
    setTypedBioRightLabels(new Array(activeHeroBioRightLines.length).fill(''));
    setDisplayBioRightValues(new Array(activeHeroBioRightLines.length).fill(''));
    setGlowingBioRightIndexes(new Set());
    setIsInitialBioRightGlowActive(false);
    setIsProfileTypingComplete(false);
    setIsProfileBioVisible(true);
    setIsSearchBarRestVisible(true);
    setIsProfileSceneExiting(false);
    wasProfileAmbientActiveRef.current = false;

    const labelsDelay = 220;
    const charDelay = 28;
    const rightBioStartDelay = 1000;
    const runLineValueScramble = (lineIndex: number, onComplete: () => void) => {
      const scrambleChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
      const duration = 760;
      const startedAt = performance.now();
      const targetValue = activeHeroBioLines[lineIndex].value;

      const scrambleFrame = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        const revealCount = Math.floor(progress * targetValue.length);
        const scrambled = targetValue
          .split('')
          .map((char, charIndex) => {
            if (char === ' ' || char === '\n') return char;
            if (charIndex < revealCount) return targetValue[charIndex];
            return scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
          })
          .join('');

        setDisplayBioValues((prev) => {
          const next = [...prev];
          next[lineIndex] = scrambled;
          return next;
        });

        if (progress < 1) {
          bioInitialScrambleRafRef.current = window.requestAnimationFrame(scrambleFrame);
          return;
        }

        setDisplayBioValues((prev) => {
          const next = [...prev];
          next[lineIndex] = targetValue;
          return next;
        });
        onComplete();
      };

      bioInitialScrambleRafRef.current = window.requestAnimationFrame(scrambleFrame);
    };

    let rightLabelIndex = 0;
    const typeRightLine = () => {
      if (rightLabelIndex >= activeHeroBioRightLines.length) {
        setIsInitialBioRightGlowActive(true);
        bioRightInitialGlowTimerRef.current = window.setTimeout(() => {
          setIsInitialBioRightGlowActive(false);
          bioRightInitialGlowTimerRef.current = null;
        }, 700);
        setIsProfileTypingComplete(true);
        bioRightTypingTimerRef.current = null;
        return;
      }

      const fullLabel = activeHeroBioRightLines[rightLabelIndex].label;
      setVisibleBioRightLabels(rightLabelIndex + 1);
      let charIndex = 0;

      const typeRightChar = () => {
        charIndex += 1;
        setTypedBioRightLabels((prev) => {
          const next = [...prev];
          next[rightLabelIndex] = fullLabel.slice(0, charIndex);
          return next;
        });

        if (charIndex < fullLabel.length) {
          bioRightTypingTimerRef.current = window.setTimeout(typeRightChar, charDelay);
          return;
        }

        const fullValue = activeHeroBioRightLines[rightLabelIndex].value;
        const valueCharDelay = Math.max(3, Math.min(charDelay, Math.floor(1800 / Math.max(fullValue.length, 1))));
        let valueCharIndex = 0;
        const typeRightValue = () => {
          valueCharIndex += 1;
          setDisplayBioRightValues((prev) => {
            const next = [...prev];
            next[rightLabelIndex] = fullValue.slice(0, valueCharIndex);
            return next;
          });

          if (valueCharIndex < fullValue.length) {
            bioRightTypingTimerRef.current = window.setTimeout(typeRightValue, valueCharDelay);
            return;
          }

          rightLabelIndex += 1;
          bioRightTypingTimerRef.current = window.setTimeout(typeRightLine, labelsDelay);
        };

        bioRightTypingTimerRef.current = window.setTimeout(typeRightValue, 20);
      };

      bioRightTypingTimerRef.current = window.setTimeout(typeRightChar, 20);
    };

    let labelIndex = 0;
    const typeLine = () => {
      if (labelIndex >= activeHeroBioLines.length) {
        bioTypingTimerRef.current = null;
        return;
      }

      const fullLabel = activeHeroBioLines[labelIndex].label;
      setVisibleBioLabels(labelIndex + 1);
      let charIndex = 0;

      const typeChar = () => {
        charIndex += 1;
        setTypedBioLabels((prev) => {
          const next = [...prev];
          next[labelIndex] = fullLabel.slice(0, charIndex);
          return next;
        });

        if (charIndex < fullLabel.length) {
          bioTypingTimerRef.current = window.setTimeout(typeChar, charDelay);
          return;
        }

        runLineValueScramble(labelIndex, () => {
          if (labelIndex >= activeHeroBioLines.length - 1) {
            setIsInitialBioGlowActive(true);
            bioInitialGlowTimerRef.current = window.setTimeout(() => {
              setIsInitialBioGlowActive(false);
              bioInitialGlowTimerRef.current = null;
            }, 700);
            bioTypingTimerRef.current = null;
            bioRightTypingTimerRef.current = window.setTimeout(typeRightLine, rightBioStartDelay);
            return;
          }

          labelIndex += 1;
          bioTypingTimerRef.current = window.setTimeout(typeLine, labelsDelay);
        });
      };

      bioTypingTimerRef.current = window.setTimeout(typeChar, 20);
    };

    bioTypingTimerRef.current = window.setTimeout(typeLine, 160);

    return () => {
      if (bioTypingTimerRef.current) {
        window.clearTimeout(bioTypingTimerRef.current);
        bioTypingTimerRef.current = null;
      }
      if (bioInitialGlowTimerRef.current) {
        window.clearTimeout(bioInitialGlowTimerRef.current);
        bioInitialGlowTimerRef.current = null;
      }
      if (bioRightTypingTimerRef.current) {
        window.clearTimeout(bioRightTypingTimerRef.current);
        bioRightTypingTimerRef.current = null;
      }
      if (bioRightInitialGlowTimerRef.current) {
        window.clearTimeout(bioRightInitialGlowTimerRef.current);
        bioRightInitialGlowTimerRef.current = null;
      }
      if (bioInitialScrambleRafRef.current) {
        window.cancelAnimationFrame(bioInitialScrambleRafRef.current);
        bioInitialScrambleRafRef.current = null;
      }
      if (bioRightInitialScrambleRafRef.current) {
        window.cancelAnimationFrame(bioRightInitialScrambleRafRef.current);
        bioRightInitialScrambleRafRef.current = null;
      }
      bioScrambleRafRefs.current.forEach((rafId) => window.cancelAnimationFrame(rafId));
      bioScrambleRafRefs.current.clear();
      bioRightScrambleRafRefs.current.forEach((rafId) => window.cancelAnimationFrame(rafId));
      bioRightScrambleRafRefs.current.clear();
      bioHoverGlowTimerRefs.current.forEach((timerId) => window.clearTimeout(timerId));
      bioHoverGlowTimerRefs.current.clear();
      bioRightHoverGlowTimerRefs.current.forEach((timerId) => window.clearTimeout(timerId));
      bioRightHoverGlowTimerRefs.current.clear();
    };
  }, [activeHeroBioLines, activeHeroBioRightLines, currentShape, hasProfileBioContent, hideFixedTitle, isSectionActive]);

  useEffect(() => {
    if (!isSectionActive || currentShape !== 'fjr' || hideFixedTitle || isProjectCardVisible) return;

    const bottomThreshold = 84;
    const onPointerMove = (event: MouseEvent) => {
      const isNearBottom = event.clientY >= window.innerHeight - bottomThreshold;
      if (isNearBottom && isBottomEdgeTriggerReadyRef.current) {
        isBottomEdgeTriggerReadyRef.current = false;
        revealDetails();
      } else if (!isNearBottom) {
        isBottomEdgeTriggerReadyRef.current = true;
      }
    };

    window.addEventListener('mousemove', onPointerMove, { passive: true });
    return () => window.removeEventListener('mousemove', onPointerMove);
  }, [currentShape, hideFixedTitle, isProjectCardVisible, isSectionActive, revealDetails]);

  const clearProfileAmbientHideTimer = useCallback(() => {
    if (profileAmbientHideTimerRef.current) {
      window.clearTimeout(profileAmbientHideTimerRef.current);
      profileAmbientHideTimerRef.current = null;
    }
  }, []);

  const scheduleProfileAmbientHide = useCallback(
    (hideSearchBar: boolean) => {
      clearProfileAmbientHideTimer();
      profileAmbientHideTimerRef.current = window.setTimeout(() => {
        setIsProfileBioVisible(false);
        if (hideSearchBar) {
          setIsSearchBarRestVisible(false);
        }
        profileAmbientHideTimerRef.current = null;
      }, 10000);
    },
    [clearProfileAmbientHideTimer],
  );

  useEffect(() => {
    if (!disableAmbientAutoHide) return;
    clearProfileAmbientHideTimer();
    setIsProfileBioVisible(true);
    setIsSearchBarRestVisible(true);
    wasProfileAmbientActiveRef.current = false;
  }, [clearProfileAmbientHideTimer, disableAmbientAutoHide]);

  useEffect(() => {
    if (!disableAmbientAutoHide) return;
    setIsProfileBioVisible(externalProfileBioVisible);
  }, [disableAmbientAutoHide, externalProfileBioVisible]);

  useEffect(() => {
    const isProfileAmbientActive =
      isSectionActive &&
      currentShape === 'profile' &&
      !hideFixedTitle &&
      isProfileTypingComplete &&
      !isProfileExitActive;

    if (disableAmbientAutoHide) {
      clearProfileAmbientHideTimer();
      return;
    }

    if (isProfileExitActive) {
      clearProfileAmbientHideTimer();
      return;
    }

    if (!isProfileAmbientActive) {
      clearProfileAmbientHideTimer();
      wasProfileAmbientActiveRef.current = false;
      setIsProfileBioVisible(true);
      setIsSearchBarRestVisible(true);
      return;
    }

    const isFreshActivation = !wasProfileAmbientActiveRef.current;
    wasProfileAmbientActiveRef.current = true;

    if (isFreshActivation) {
      setIsProfileBioVisible(true);
      setIsSearchBarRestVisible(true);
    } else {
      setIsSearchBarRestVisible(true);
    }

    scheduleProfileAmbientHide(!shouldShowAgentPanel);

    const onPointerMove = () => {
      setIsProfileBioVisible(true);
      setIsSearchBarRestVisible(true);
      scheduleProfileAmbientHide(!shouldShowAgentPanel);
    };

    window.addEventListener('mousemove', onPointerMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', onPointerMove);
      clearProfileAmbientHideTimer();
    };
  }, [
    clearProfileAmbientHideTimer,
    currentShape,
    disableAmbientAutoHide,
    hideFixedTitle,
    isProfileExitActive,
    isProfileTypingComplete,
    isSectionActive,
    scheduleProfileAmbientHide,
    shouldShowAgentPanel,
  ]);

  const waitForUiTransition = useCallback((durationMs: number) => {
    return new Promise<void>((resolve) => {
      window.setTimeout(resolve, durationMs);
    });
  }, []);

  const runBioValueScramble = useCallback((index: number) => {
    const targetValue = activeHeroBioLines[index]?.value ?? '';
    if (!targetValue) return;

    const scrambleChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
    const duration = 720;
    const runningRaf = bioScrambleRafRefs.current.get(index);

    if (runningRaf) window.cancelAnimationFrame(runningRaf);

    const startedAt = performance.now();
    const scrambleFrame = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const revealCount = Math.floor(progress * targetValue.length);
      const scrambled = targetValue
        .split('')
        .map((char, charIndex) => {
          if (char === ' ' || char === '\n') return char;
          if (charIndex < revealCount) return targetValue[charIndex];
          return scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
        })
        .join('');

      setDisplayBioValues((prev) => {
        const next = [...prev];
        next[index] = scrambled;
        return next;
      });

      if (progress < 1) {
        const rafId = window.requestAnimationFrame(scrambleFrame);
        bioScrambleRafRefs.current.set(index, rafId);
        return;
      }

      setDisplayBioValues((prev) => {
        const next = [...prev];
        next[index] = targetValue;
        return next;
      });
      bioScrambleRafRefs.current.delete(index);
      setGlowingBioIndexes((prev) => {
        const next = new Set(prev);
        next.add(index);
        return next;
      });
    };

    const rafId = window.requestAnimationFrame(scrambleFrame);
    bioScrambleRafRefs.current.set(index, rafId);
  }, [activeHeroBioLines]);

  const handleBioValueMouseEnter = useCallback((index: number) => {
    const runningGlowTimer = bioHoverGlowTimerRefs.current.get(index);
    if (runningGlowTimer) {
      window.clearTimeout(runningGlowTimer);
      bioHoverGlowTimerRefs.current.delete(index);
    }

    setGlowingBioIndexes((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
    runBioValueScramble(index);
  }, [runBioValueScramble]);

  const handleBioValueMouseLeave = useCallback((index: number) => {
    const runningGlowTimer = bioHoverGlowTimerRefs.current.get(index);
    if (runningGlowTimer) {
      window.clearTimeout(runningGlowTimer);
      bioHoverGlowTimerRefs.current.delete(index);
    }

    const glowTimer = window.setTimeout(() => {
      setGlowingBioIndexes((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
      bioHoverGlowTimerRefs.current.delete(index);
    }, bioHoverGlowExitDelayMs);
    bioHoverGlowTimerRefs.current.set(index, glowTimer);
  }, []);

  const handleShapeChange = useCallback((shape: ShapeName) => {
    setCurrentShape(shape);
    setIsProfileSceneExiting(false);
    revealDetails();
    onExternalShapeChange?.(shape);
  }, [onExternalShapeChange, revealDetails]);

  const handleParticleTransitionPhaseChange = useCallback((phase: HeroTransitionPhase) => {
    setParticleTransitionPhase(phase);
    onExternalTransitionPhaseChange?.(phase);
  }, [onExternalTransitionPhaseChange]);

  const handleParticleSampleChange = useCallback((sampleIndex: number) => {
    setCurrentParticleSampleIndex(sampleIndex);
    onExternalSampleChange?.(sampleIndex);

    if (sampleIndex < 1 || sampleIndex > profileGuideProfileCount) {
      setActiveProfileGuideIndex(null);
      setIsProfileGuideVisible(false);
      return;
    }

    setActiveProfileGuideIndex(sampleIndex);
    setIsProfileGuideVisible(true);
  }, [onExternalSampleChange]);

  const handleBeforeParticleSampleTransition = useCallback((fromSampleIndex: number, toSampleIndex: number) => {
    const isFromProfileSample = fromSampleIndex >= 1 && fromSampleIndex <= profileGuideProfileCount;
    const isToProfileSample = toSampleIndex >= 1 && toSampleIndex <= profileGuideProfileCount;

    if (isFromProfileSample && isToProfileSample) {
      setActiveProfileGuideIndex(toSampleIndex);
      setIsProfileGuideVisible(true);
      return;
    }

    if (fromSampleIndex === profileGuideProfileCount && !isToProfileSample) {
      setIsProfileGuideVisible(false);
    }
  }, []);

  const applyProfileGuideDragOffset = useCallback((x: number, y: number, dragging: boolean) => {
    const particle = profileGuideParticleRef.current;
    if (!particle) return;
    particle.style.setProperty('--hero-profile-guide-drag-x', `${x.toFixed(2)}px`);
    particle.style.setProperty('--hero-profile-guide-drag-y', `${y.toFixed(2)}px`);
    particle.dataset.dragging = dragging ? 'true' : 'false';
  }, []);

  const scheduleProfileGuideDragOffset = useCallback(
    (x: number, y: number, dragging: boolean) => {
      const state = profileGuideDragStateRef.current;
      state.pendingX = x;
      state.pendingY = y;
      state.isDragging = dragging;

      if (profileGuideDragRafRef.current !== null) return;

      profileGuideDragRafRef.current = window.requestAnimationFrame(() => {
        profileGuideDragRafRef.current = null;
        const nextState = profileGuideDragStateRef.current;
        applyProfileGuideDragOffset(nextState.pendingX, nextState.pendingY, nextState.isDragging);
      });
    },
    [applyProfileGuideDragOffset],
  );

  const resetProfileGuideDrag = useCallback(() => {
    const particle = profileGuideParticleRef.current;
    const state = profileGuideDragStateRef.current;

    if (particle && state.activePointerId !== null && particle.hasPointerCapture(state.activePointerId)) {
      particle.releasePointerCapture(state.activePointerId);
    }

    state.activePointerId = null;
    state.isDragging = false;
    state.maxOffsetX = 0;
    state.maxOffsetY = 0;
    state.pendingX = 0;
    state.pendingY = 0;

    if (profileGuideDragRafRef.current !== null) {
      window.cancelAnimationFrame(profileGuideDragRafRef.current);
      profileGuideDragRafRef.current = null;
    }

    applyProfileGuideDragOffset(0, 0, false);
  }, [applyProfileGuideDragOffset]);

  const handleProfileGuidePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!shouldShowProfileGuideParticle) return;

      const particle = profileGuideParticleRef.current;
      if (!particle) return;

      const rect = particle.getBoundingClientRect();
      const state = profileGuideDragStateRef.current;
      state.activePointerId = event.pointerId;
      state.startPointerX = event.clientX;
      state.startPointerY = event.clientY;
      state.maxOffsetX = Math.min(Math.max(rect.width * 10, 26), 42);
      state.maxOffsetY = Math.min(Math.max(rect.height * 10, 26), 42);
      state.isDragging = true;

      particle.setPointerCapture(event.pointerId);
      applyProfileGuideDragOffset(0, 0, true);
      event.preventDefault();
      event.stopPropagation();
    },
    [applyProfileGuideDragOffset, shouldShowProfileGuideParticle],
  );

  const handleProfileGuidePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const state = profileGuideDragStateRef.current;
      if (!shouldShowProfileGuideParticle || state.activePointerId !== event.pointerId) return;

      const deltaX = event.clientX - state.startPointerX;
      const deltaY = event.clientY - state.startPointerY;
      const offsetX = getElasticDragOffset(deltaX, state.maxOffsetX);
      const offsetY = getElasticDragOffset(deltaY, state.maxOffsetY);

      scheduleProfileGuideDragOffset(offsetX, offsetY, true);
      event.preventDefault();
      event.stopPropagation();
    },
    [scheduleProfileGuideDragOffset, shouldShowProfileGuideParticle],
  );

  const handleProfileGuidePointerRelease = useCallback(
    (pointerId?: number) => {
      const state = profileGuideDragStateRef.current;
      if (pointerId !== undefined && state.activePointerId !== pointerId) return;
      if (state.activePointerId === null && !state.isDragging) return;

      state.activePointerId = null;
      scheduleProfileGuideDragOffset(0, 0, false);
    },
    [scheduleProfileGuideDragOffset],
  );

  useEffect(() => {
    if (shouldShowProfileGuideParticle) return;
    resetProfileGuideDrag();
  }, [resetProfileGuideDrag, shouldShowProfileGuideParticle]);

  useEffect(() => {
    searchIntroTextRef.current = searchIntroDisplayText;
  }, [searchIntroDisplayText]);

  const clearSearchIntroTypingTimer = useCallback(() => {
    if (searchIntroTypingTimerRef.current) {
      window.clearTimeout(searchIntroTypingTimerRef.current);
      searchIntroTypingTimerRef.current = null;
    }
  }, []);

  const startSearchIntroTypingIn = useCallback(() => {
    if (
      searchIntroModeRef.current === 'typingIn' ||
      searchIntroModeRef.current === 'typingOut' ||
      searchIntroModeRef.current === 'completed'
    ) {
      return;
    }

    clearSearchIntroTypingTimer();
    searchIntroModeRef.current = 'typingIn';
    searchIntroTextRef.current = '';
    setSearchIntroDisplayText('');

    let nextIndex = 0;
    const typeNextCharacter = () => {
      nextIndex += 1;
      const nextText = searchIntroMessage.slice(0, nextIndex);
      searchIntroTextRef.current = nextText;
      setSearchIntroDisplayText(nextText);

      if (nextIndex < searchIntroMessage.length) {
        searchIntroTypingTimerRef.current = window.setTimeout(typeNextCharacter, 72);
        return;
      }

      searchIntroModeRef.current = 'completed';
      searchIntroTypingTimerRef.current = null;
    };

    searchIntroTypingTimerRef.current = window.setTimeout(typeNextCharacter, 200);
  }, [clearSearchIntroTypingTimer]);

  const startSearchIntroTypingOut = useCallback(() => {
    if (searchIntroModeRef.current === 'typingOut') return;

    clearSearchIntroTypingTimer();

    let nextText = searchIntroTextRef.current || searchIntroMessage;
    if (!nextText) {
      searchIntroModeRef.current = 'idle';
      setSearchIntroDisplayText('');
      return;
    }

    searchIntroModeRef.current = 'typingOut';
    searchIntroTextRef.current = nextText;
    setSearchIntroDisplayText(nextText);

    const deletePreviousCharacter = () => {
      nextText = nextText.slice(0, -1);
      searchIntroTextRef.current = nextText;
      setSearchIntroDisplayText(nextText);

      if (nextText.length > 0) {
        searchIntroTypingTimerRef.current = window.setTimeout(deletePreviousCharacter, 46);
        return;
      }

      searchIntroModeRef.current = 'idle';
      searchIntroTypingTimerRef.current = null;
    };

    searchIntroTypingTimerRef.current = window.setTimeout(deletePreviousCharacter, 120);
  }, [clearSearchIntroTypingTimer]);

  const focusSearchInput = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  const handleSearchInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  }, []);

  const primeActiveSearchPrompt = useCallback(() => {
    if (!activeSearchPrompt) return;
    setSearchQuery(activeSearchPrompt);

    window.requestAnimationFrame(() => {
      const input = searchInputRef.current;
      if (!input) return;
      input.focus();
      input.setSelectionRange(0, activeSearchPrompt.length);
    });
  }, [activeSearchPrompt]);

  const reopenAgentPanelFromSearchField = useCallback(() => {
    if (!isSearchBarInteractionReady) return;
    if (agentTurns.length === 0) return;
    setIsAgentPanelDismissed(false);
  }, [agentTurns.length, isSearchBarInteractionReady]);

  const prunePendingAgentTurns = useCallback(() => {
    setAgentTurns((prev) => prev.filter((turn) => turn.status !== 'loading'));
  }, []);

  const closeAgentPanel = useCallback(() => {
    agentRequestAbortRef.current?.abort();
    agentRequestAbortRef.current = null;
    prunePendingAgentTurns();
    setIsAgentPanelDismissed(true);
  }, [prunePendingAgentTurns]);

  const handleBeforeShapeTransition = useCallback(
    async (from: ShapeName, to: ShapeName) => {
      if (from !== 'profile' || to !== 'fjr') return;

      const shouldAnimateProfileExit = shouldShowAgentPanel || isProfileBioVisible || isSearchBarRestVisible;
      setIsProfileSceneExiting(true);

      if (shouldShowAgentPanel) {
        closeAgentPanel();
        await waitForUiTransition(480);
      }

      setIsProfileBioVisible(false);
      setIsSearchBarRestVisible(false);

      if (shouldAnimateProfileExit) {
        await waitForUiTransition(820);
      }
    },
    [
      closeAgentPanel,
      isProfileBioVisible,
      isSearchBarRestVisible,
      shouldShowAgentPanel,
      waitForUiTransition,
    ],
  );

  const submitSearchQuery = useCallback(
    async (overrideQuery?: string) => {
      const normalizedQuery = (overrideQuery ?? searchQuery).trim();

      if (!normalizedQuery) {
        primeActiveSearchPrompt();
        return;
      }

      if (!isSearchBarElasticReady) {
        focusSearchInput();
        return;
      }

      speechRecognitionRef.current?.stop();
      setSearchQuery(normalizedQuery);
      agentRequestAbortRef.current?.abort();
      prunePendingAgentTurns();

      const controller = new AbortController();
      agentRequestAbortRef.current = controller;
      const turnId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      setAgentTurns((prev) => [
        ...prev,
        {
          id: turnId,
          question: normalizedQuery,
          answer: '',
          error: '',
          status: 'loading',
          route: null,
          questionTypingPlayed: false,
          answerTypingPlayed: false,
        },
      ]);
      setSearchQuery('');
      setIsAgentPanelDismissed(false);

      try {
        const response = await sendAgentMessage(normalizedQuery, controller.signal);
        if (controller.signal.aborted) return;

        setAgentTurns((prev) =>
          prev.map((turn) =>
            turn.id === turnId
              ? {
                  ...turn,
                  answer: response.answer,
                  error: '',
                  route: response.route,
                  status: 'answered',
                  answerTypingPlayed: false,
                }
              : turn,
          ),
        );
      } catch (error) {
        if (controller.signal.aborted) return;

        setAgentTurns((prev) =>
          prev.map((turn) =>
            turn.id === turnId
              ? {
                  ...turn,
                  answer: '',
                  error:
                    error instanceof Error ? error.message : 'Nao foi possivel obter uma resposta do agente agora.',
                  route: null,
                  status: 'error',
                  answerTypingPlayed: false,
                }
              : turn,
          ),
        );
      } finally {
        if (agentRequestAbortRef.current === controller) {
          agentRequestAbortRef.current = null;
        }
      }
    },
    [focusSearchInput, isSearchBarElasticReady, primeActiveSearchPrompt, prunePendingAgentTurns, searchQuery],
  );

  const handleSearchSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void submitSearchQuery();
    },
    [submitSearchQuery],
  );

  const handleSearchMicToggle = useCallback(() => {
    if (!isSearchBarInteractionReady) return;

    const speechApiWindow = window as Window &
      typeof globalThis & {
        SpeechRecognition?: new () => SpeechRecognitionLike;
        webkitSpeechRecognition?: new () => SpeechRecognitionLike;
      };

    const SpeechRecognitionCtor = speechApiWindow.SpeechRecognition ?? speechApiWindow.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      focusSearchInput();
      return;
    }

    if (isListeningToSearch) {
      speechRecognitionRef.current?.stop();
      return;
    }

    const recognition = speechRecognitionRef.current ?? new SpeechRecognitionCtor();
    speechRecognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'pt-BR';
    recognition.onresult = (event) => {
      let transcript = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index][0]?.transcript ?? '';
      }

      setSearchQuery(transcript.trim());
    };
    recognition.onend = () => {
      setIsListeningToSearch(false);
    };
    recognition.onerror = () => {
      setIsListeningToSearch(false);
    };

    try {
      recognition.start();
      setIsListeningToSearch(true);
      focusSearchInput();
    } catch {
      setIsListeningToSearch(false);
    }
  }, [focusSearchInput, isListeningToSearch, isSearchBarInteractionReady]);

  const applySearchBarDragOffset = useCallback((x: number, y: number, dragging: boolean) => {
    const shell = searchBarShellRef.current;
    if (!shell) return;
    shell.style.setProperty('--search-drag-x', `${x.toFixed(2)}px`);
    shell.style.setProperty('--search-drag-y', `${y.toFixed(2)}px`);
    shell.dataset.dragging = dragging ? 'true' : 'false';
  }, []);

  const scheduleSearchBarDragOffset = useCallback(
    (x: number, y: number, dragging: boolean) => {
      const state = searchBarDragStateRef.current;
      state.pendingX = x;
      state.pendingY = y;
      state.isDragging = dragging;

      if (searchBarDragRafRef.current !== null) return;

      searchBarDragRafRef.current = window.requestAnimationFrame(() => {
        searchBarDragRafRef.current = null;
        const nextState = searchBarDragStateRef.current;
        applySearchBarDragOffset(nextState.pendingX, nextState.pendingY, nextState.isDragging);
      });
    },
    [applySearchBarDragOffset],
  );

  const resetSearchBarDrag = useCallback(() => {
    const shell = searchBarShellRef.current;
    const state = searchBarDragStateRef.current;

    if (shell && state.activePointerId !== null && shell.hasPointerCapture(state.activePointerId)) {
      shell.releasePointerCapture(state.activePointerId);
    }

    state.activePointerId = null;
    state.isDragging = false;
    state.maxOffsetX = 0;
    state.maxOffsetY = 0;
    state.pendingX = 0;
    state.pendingY = 0;

    if (searchBarDragRafRef.current !== null) {
      window.cancelAnimationFrame(searchBarDragRafRef.current);
      searchBarDragRafRef.current = null;
    }

    applySearchBarDragOffset(0, 0, false);
  }, [applySearchBarDragOffset]);

  const handleSearchBarPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!isSearchBarElasticReady) return;

      const target = event.target as HTMLElement;
      if (target.closest('[data-search-control="true"]')) return;

      const shell = searchBarShellRef.current;
      if (!shell) return;

      const rect = shell.getBoundingClientRect();
      const state = searchBarDragStateRef.current;
      state.activePointerId = event.pointerId;
      state.startPointerX = event.clientX;
      state.startPointerY = event.clientY;
      state.maxOffsetX = Math.min(rect.width * 0.14, 86);
      state.maxOffsetY = Math.min(rect.height * 0.9, 48);
      state.isDragging = true;

      shell.setPointerCapture(event.pointerId);
      applySearchBarDragOffset(0, 0, true);
      event.preventDefault();
    },
    [applySearchBarDragOffset, isSearchBarElasticReady],
  );

  const handleSearchBarPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const state = searchBarDragStateRef.current;
      if (!isSearchBarElasticReady || state.activePointerId !== event.pointerId) return;

      const deltaX = event.clientX - state.startPointerX;
      const deltaY = event.clientY - state.startPointerY;
      const offsetX = getElasticDragOffset(deltaX, state.maxOffsetX);
      const offsetY = getElasticDragOffset(deltaY, state.maxOffsetY);

      scheduleSearchBarDragOffset(offsetX, offsetY, true);
      event.preventDefault();
    },
    [isSearchBarElasticReady, scheduleSearchBarDragOffset],
  );

  const handleSearchBarPointerRelease = useCallback(
    (pointerId?: number) => {
      const state = searchBarDragStateRef.current;
      if (pointerId !== undefined && state.activePointerId !== pointerId) return;
      if (state.activePointerId === null && !state.isDragging) return;

      state.activePointerId = null;
      scheduleSearchBarDragOffset(0, 0, false);
    },
    [scheduleSearchBarDragOffset],
  );

  useEffect(() => {
    if (isSearchBarElasticReady) return;
    speechRecognitionRef.current?.abort();
    setIsListeningToSearch(false);
    agentRequestAbortRef.current?.abort();
    agentRequestAbortRef.current = null;
    prunePendingAgentTurns();
    resetSearchBarDrag();
  }, [isSearchBarElasticReady, prunePendingAgentTurns, resetSearchBarDrag]);

  useEffect(() => {
    if (rotatingSearchPromptTimerRef.current) {
      window.clearTimeout(rotatingSearchPromptTimerRef.current);
      rotatingSearchPromptTimerRef.current = null;
    }

    if (!isSectionActive || !isSearchBarElasticReady) return;

    const rotatePrompt = () => {
      rotatingSearchPromptTimerRef.current = window.setTimeout(() => {
        setActiveSearchPromptIndex((prev) => (prev + 1) % rotatingSearchPrompts.length);
        rotatePrompt();
      }, 4000);
    };

    rotatePrompt();

    return () => {
      if (rotatingSearchPromptTimerRef.current) {
        window.clearTimeout(rotatingSearchPromptTimerRef.current);
        rotatingSearchPromptTimerRef.current = null;
      }
    };
  }, [isSearchBarElasticReady, isSectionActive]);

  useEffect(() => {
    if (particleTransitionPhase === 'searchMaterialize') {
      startSearchIntroTypingIn();
      return;
    }

    if (particleTransitionPhase === 'searchDrop') {
      startSearchIntroTypingOut();
      return;
    }

    if (
      particleTransitionPhase === 'particle' ||
      particleTransitionPhase === 'particleGrow' ||
      particleTransitionPhase === 'particlePulse'
    ) {
      clearSearchIntroTypingTimer();
      searchIntroModeRef.current = 'idle';
      searchIntroTextRef.current = '';
      setSearchIntroDisplayText('');
    }
  }, [
    clearSearchIntroTypingTimer,
    particleTransitionPhase,
    startSearchIntroTypingIn,
    startSearchIntroTypingOut,
  ]);

  useEffect(() => {
    return () => {
      clearSearchIntroTypingTimer();
      agentRequestAbortRef.current?.abort();
      prunePendingAgentTurns();
      speechRecognitionRef.current?.abort();
      resetProfileGuideDrag();
      resetSearchBarDrag();
    };
  }, [clearSearchIntroTypingTimer, prunePendingAgentTurns, resetProfileGuideDrag, resetSearchBarDrag]);

  const handleRetryAgentResponse = useCallback(
    (question: string) => {
      void submitSearchQuery(question);
    },
    [submitSearchQuery],
  );

  const handleAgentQuestionTypingComplete = useCallback((turnId: string) => {
    setAgentTurns((prev) =>
      prev.map((turn) =>
        turn.id === turnId && !turn.questionTypingPlayed
          ? {
              ...turn,
              questionTypingPlayed: true,
            }
          : turn,
      ),
    );
  }, []);

  const handleAgentAnswerTypingComplete = useCallback((turnId: string) => {
    setAgentTurns((prev) =>
      prev.map((turn) =>
        turn.id === turnId && !turn.answerTypingPlayed
          ? {
              ...turn,
              answerTypingPlayed: true,
            }
          : turn,
      ),
    );
  }, []);

  const handleBioRightValueMouseEnter = useCallback((index: number) => {
    const runningGlowTimer = bioRightHoverGlowTimerRefs.current.get(index);
    if (runningGlowTimer) {
      window.clearTimeout(runningGlowTimer);
      bioRightHoverGlowTimerRefs.current.delete(index);
    }

    setGlowingBioRightIndexes((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }, []);

  const handleBioRightValueMouseLeave = useCallback((index: number) => {
    const runningGlowTimer = bioRightHoverGlowTimerRefs.current.get(index);
    if (runningGlowTimer) {
      window.clearTimeout(runningGlowTimer);
      bioRightHoverGlowTimerRefs.current.delete(index);
    }

    const glowTimer = window.setTimeout(() => {
      setGlowingBioRightIndexes((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
      bioRightHoverGlowTimerRefs.current.delete(index);
    }, bioHoverGlowExitDelayMs);
    bioRightHoverGlowTimerRefs.current.set(index, glowTimer);
  }, []);

  return (
    <section ref={heroRef} className="hero-section" id={sectionId}>
      {hasEnteredViewport && (
        <motion.div
          ref={heroStageRef}
          className="hero-title-wrapper hero-title-wrapper--particles"
          initial={{ opacity: 0, filter: 'blur(6px)' }}
          animate={{
            opacity: shouldHideFixedTitle ? 0 : 1,
            filter: shouldHideFixedTitle ? 'blur(6px)' : 'blur(0px)',
          }}
          style={{
            pointerEvents: shouldHideFixedTitle ? 'none' : 'auto',
            visibility: shouldHideFixedTitle ? 'hidden' : 'visible',
          }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <HeroParticlesAdvanced
            isExiting={isProfileExitActive && resolvedSampleIndex > 0}
            initialSampleIndex={resolvedSampleIndex}
            lockSample
            transitionRequestId={transitionRequestId}
            transitionSkipFinalSampleLoad={transitionSkipFinalSampleLoad}
            transitionTargetSampleIndex={transitionTargetSampleIndex}
            onBeforeSampleTransition={handleBeforeParticleSampleTransition}
            onBeforeShapeTransition={handleBeforeShapeTransition}
            onSampleChange={handleParticleSampleChange}
            onShapeChange={handleShapeChange}
            onTransitionPhaseChange={handleParticleTransitionPhaseChange}
          />

        <div
          className={`hero-profile-guide-particle-layer${shouldShowProfileGuideParticle ? ' hero-profile-guide-particle-layer--visible' : ''}`}
          data-profile={String(resolvedProfileGuideIndex)}
          style={profileGuideLayerStyle}
          aria-hidden="true"
        >
          <div
            ref={profileGuideParticleRef}
            className="hero-profile-guide-particle"
            onClick={(event) => event.stopPropagation()}
            onLostPointerCapture={() => handleProfileGuidePointerRelease()}
            onPointerCancel={(event) => {
              event.stopPropagation();
              handleProfileGuidePointerRelease(event.pointerId);
            }}
            onPointerDown={handleProfileGuidePointerDown}
            onPointerMove={handleProfileGuidePointerMove}
            onPointerUp={(event) => {
              event.stopPropagation();
              handleProfileGuidePointerRelease(event.pointerId);
            }}
          >
            <div className="hero-profile-guide-particle__core" />
          </div>
        </div>

        {shouldRenderEmbeddedSearchUi && (
          <div className={searchSceneClassName} aria-hidden={!isSearchBarElasticReady}>
            <div className="hero-search-scene__core-shell">
              <div className="hero-search-scene__core" />
            </div>
            <div className="hero-search-scene__pulse" />

            <div
              ref={searchBarShellRef}
              className="hero-search-scene__bar-shell"
              onLostPointerCapture={() => handleSearchBarPointerRelease()}
              onPointerCancel={(event) => handleSearchBarPointerRelease(event.pointerId)}
              onPointerDown={handleSearchBarPointerDown}
              onPointerMove={handleSearchBarPointerMove}
              onPointerUp={(event) => handleSearchBarPointerRelease(event.pointerId)}
            >
              <div className="hero-search-scene__border-glow" />

              <svg
                className="hero-search-scene__beam-svg"
                viewBox="0 0 1000 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  className="hero-search-scene__beam-path hero-search-scene__beam-path--glow"
                  pathLength={100}
                  d="M 500 0 H 50 A 50 50 0 0 0 0 50 A 50 50 0 0 0 50 100 H 950 A 50 50 0 0 0 1000 50 A 50 50 0 0 0 950 0 H 500"
                />
                <path
                  className="hero-search-scene__beam-path hero-search-scene__beam-path--core"
                  pathLength={100}
                  d="M 500 0 H 50 A 50 50 0 0 0 0 50 A 50 50 0 0 0 50 100 H 950 A 50 50 0 0 0 1000 50 A 50 50 0 0 0 950 0 H 500"
                />
              </svg>

              <div className="hero-search-scene__bar">
                <div className="hero-search-scene__intro-copy" aria-hidden={!shouldShowSearchIntroText}>
                  {searchIntroDisplayText}
                </div>

                <div className="hero-search-scene__actions hero-search-scene__actions--left">
                  <button
                    type="button"
                    className="hero-search-scene__action-button"
                    aria-label="Abrir busca"
                    data-search-control="true"
                    disabled={!isSearchBarInteractionReady}
                    onClick={focusSearchInput}
                  >
                    <FaSearch className="hero-search-scene__icon" />
                  </button>
                </div>

                <form className="hero-search-scene__field" onSubmit={handleSearchSubmit}>
                  <input
                    ref={searchInputRef}
                    className="hero-search-scene__field-input"
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchInputChange}
                    onClick={reopenAgentPanelFromSearchField}
                    onFocus={reopenAgentPanelFromSearchField}
                    placeholder={isListeningToSearch ? 'Ouvindo...' : activeSearchPrompt}
                    aria-label="Pesquisar"
                    autoComplete="off"
                    spellCheck={false}
                    data-search-control="true"
                    disabled={!isSearchBarInteractionReady}
                  />
                </form>

                <div className="hero-search-scene__actions hero-search-scene__actions--right">
                  <button
                    type="button"
                    className="hero-search-scene__action-button"
                    aria-label={isListeningToSearch ? 'Parar ditado' : 'Ditado por voz'}
                    aria-pressed={isListeningToSearch}
                    data-search-control="true"
                    disabled={!isSearchBarInteractionReady}
                    onClick={handleSearchMicToggle}
                  >
                    <FaMicrophone className="hero-search-scene__icon" />
                  </button>
                  <button
                    type="button"
                    className="hero-search-scene__action-button"
                    aria-label="Enviar busca"
                    data-search-control="true"
                    disabled={!isSearchBarInteractionReady}
                    onClick={() => void submitSearchQuery()}
                  >
                    <FaPaperPlane className="hero-search-scene__icon" />
                  </button>
                </div>
              </div>
            </div>

            <HeroAgentPanel
              isVisible={shouldShowAgentPanel}
              turns={agentTurns}
              route={agentPanelRoute}
              onClose={closeAgentPanel}
              onRetry={handleRetryAgentResponse}
              onQuestionTypingComplete={handleAgentQuestionTypingComplete}
              onAnswerTypingComplete={handleAgentAnswerTypingComplete}
            />
          </div>
        )}

        <div className="hero-subtitle-reveal hero-subtitle-reveal--particles">
          <AnimatePresence mode="wait">
            {showDetails && !hideFixedTitle && currentShape === 'fjr' && !isParticleSceneActive && (
              <motion.p
                key="hero-subtitle"
                className="hero-subtitle"
                initial={{ opacity: 0, filter: 'blur(6px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, filter: 'blur(6px)' }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              >
                {typedSubtitle}
                <span className="hero-subtitle-caret" aria-hidden="true">|</span>
              </motion.p>
            )}
          </AnimatePresence>
        </div>

          <AnimatePresence>
            {!hideFixedTitle && currentShape === 'profile' && hasProfileBioContent && (
              <div className="hero-profile-bio-stack">
                <motion.div
                  key="hero-profile-bio-left"
                  className="hero-profile-bio hero-profile-bio--upper"
                  initial={{ opacity: 0, x: '-6%', filter: 'blur(8px)' }}
                  animate={
                    effectiveProfileBioVisible
                      ? { opacity: 1, x: '0%', filter: 'blur(0px)' }
                      : { opacity: 0, x: '-112%', filter: 'blur(10px)' }
                  }
                  exit={{ opacity: 0, x: '-6%', filter: 'blur(10px)' }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                >
                  {activeHeroBioLines.map((line, index) => {
                    if (index >= visibleBioLabels) return null;

                    return (
                      <motion.p
                        key={`${line.label}-${index}`}
                        className="hero-profile-bio-line"
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <span className="hero-profile-bio-label">
                          {typedBioLabels[index] ?? ''}
                          {(typedBioLabels[index] ?? '').length >= line.label.length ? ':' : ''}
                        </span>
                        <span
                          className={`hero-profile-bio-value ${(isInitialBioGlowActive || glowingBioIndexes.has(index)) ? 'hero-profile-bio-value--glow' : ''}`}
                          onMouseEnter={() => handleBioValueMouseEnter(index)}
                          onMouseLeave={() => handleBioValueMouseLeave(index)}
                        >
                          {displayBioValues[index] ?? ''}
                        </span>
                      </motion.p>
                    );
                  })}
                </motion.div>

                <motion.div
                  key="hero-profile-bio-right"
                  className="hero-profile-bio hero-profile-bio--lower"
                  initial={{ opacity: 0, x: '-6%', filter: 'blur(8px)' }}
                  animate={
                    effectiveProfileBioVisible
                      ? { opacity: 1, x: '0%', filter: 'blur(0px)' }
                      : { opacity: 0, x: '-112%', filter: 'blur(10px)' }
                  }
                  exit={{ opacity: 0, x: '-6%', filter: 'blur(10px)' }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                >
                  {activeHeroBioRightLines.map((line, index) => {
                    if (index >= visibleBioRightLabels) return null;

                    return (
                      <motion.p
                        key={`${line.label}-${index}`}
                        className="hero-profile-bio-line"
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <span className="hero-profile-bio-label">
                          {typedBioRightLabels[index] ?? ''}
                          {(typedBioRightLabels[index] ?? '').length >= line.label.length && !line.label.endsWith(':') ? ':' : ''}
                        </span>
                        <span
                          className={`hero-profile-bio-value ${(isInitialBioRightGlowActive || glowingBioRightIndexes.has(index)) ? 'hero-profile-bio-value--glow' : ''}`}
                          onMouseEnter={() => handleBioRightValueMouseEnter(index)}
                          onMouseLeave={() => handleBioRightValueMouseLeave(index)}
                        >
                          {displayBioRightValues[index] ?? ''}
                        </span>
                      </motion.p>
                    );
                  })}
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      <AnimatePresence>
        {showDetails && !shouldHideFixedTitle && !isParticleSceneActive && !isProfileExitActive && (
          <motion.div
            className="social-icons"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 1, ease: 'easeInOut' }}
          >
            <a href="https://github.com/fjrsonn" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
              <FaGithub />
            </a>
            <a href="https://www.linkedin.com/in/flaviojuniorls" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <FaLinkedin />
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
