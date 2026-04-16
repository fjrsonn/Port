import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { FaMicrophone, FaPaperPlane, FaSearch } from 'react-icons/fa';
import { HeroAgentPanel } from './hero-agent/HeroAgentPanel';
import type { HeroTransitionPhase } from './hero-particles/engine/types';
import type { HeroSharedProfileUiState } from '../sections/HeroSection';
import { sendAgentMessage } from '../lib/agentApi';

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

type SharedProfileSearchOverlayProps = {
  sharedState: HeroSharedProfileUiState;
  scenePhase: HeroTransitionPhase | null;
  isReady: boolean;
  showGuideParticle: boolean;
  guideIndex: number;
  ambientPhase?:
    | 'active'
    | 'controlsHiding'
    | 'dematerializing'
    | 'particleHold'
    | 'particleExit'
    | 'hidden'
    | 'particleReturn'
    | 'rematerializing';
};

const rotatingSearchPrompts = [
  'Pergunte sobre Flavio Jr. ou qualquer tema!',
  'Quais sao as habilidades do Flavio Jr.?',
  'Quantos anos tem Flavio Jr.?',
  'Qual e o curriculo completo do Flavio Jr.?',
  'Por quais empresas o Flavio Jr. passou?',
  'Quais sao os projetos do Flavio Jr.?',
] as const;

const searchIntroMessage = 'Ola, Sejam Bem vindos!';
const profileGuideMoveDurationMs = 340;

const getElasticDragOffset = (delta: number, limit: number) => {
  const softness = Math.max(limit * 1.65, 52);
  return limit * Math.tanh(delta / softness);
};

export function SharedProfileSearchOverlay({
  sharedState,
  scenePhase,
  isReady,
  showGuideParticle,
  guideIndex,
  ambientPhase = 'active',
}: SharedProfileSearchOverlayProps) {
  const {
    searchQuery,
    setSearchQuery,
    activeSearchPromptIndex,
    setActiveSearchPromptIndex,
    agentTurns,
    setAgentTurns,
    isAgentPanelDismissed,
    setIsAgentPanelDismissed,
  } = sharedState;

  const [isListeningToSearch, setIsListeningToSearch] = useState(false);
  const [searchIntroDisplayText, setSearchIntroDisplayText] = useState('');
  const searchBarShellRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const profileGuideParticleRef = useRef<HTMLDivElement | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const searchIntroTextRef = useRef('');
  const searchIntroModeRef = useRef<'idle' | 'typingIn' | 'typingOut' | 'completed'>('idle');
  const rotatingSearchPromptTimerRef = useRef<number | null>(null);
  const searchIntroTypingTimerRef = useRef<number | null>(null);
  const searchBarDragRafRef = useRef<number | null>(null);
  const profileGuideDragRafRef = useRef<number | null>(null);
  const agentRequestAbortRef = useRef<AbortController | null>(null);
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

  const activeSearchPrompt = rotatingSearchPrompts[activeSearchPromptIndex] ?? rotatingSearchPrompts[0];
  const shouldShowAgentPanel = isReady && !isAgentPanelDismissed && agentTurns.length > 0;
  const agentPanelRoute =
    [...agentTurns].reverse().find((turn) => turn.route !== null)?.route ?? null;
  const profileGuideLayerStyle = {
    '--hero-profile-guide-move-duration': `${profileGuideMoveDurationMs}ms`,
  } as CSSProperties;
  const shouldShowSearchIntroText = searchIntroDisplayText.length > 0;
  const isAmbientActive = ambientPhase === 'active';
  const isSearchInteractionReady = isReady && isAmbientActive;
  const searchSceneClassName = [
    'hero-search-scene',
    'hero-search-scene--visible',
    scenePhase ? `hero-search-scene--${scenePhase}` : '',
    shouldShowSearchIntroText ? 'hero-search-scene--intro-visible' : '',
    isReady && ambientPhase === 'controlsHiding' ? 'hero-search-scene--ambient-controls-hide' : '',
    isReady && ambientPhase === 'dematerializing' ? 'hero-search-scene--ambient-collapse' : '',
    isReady && ambientPhase === 'particleHold' ? 'hero-search-scene--ambient-particle-hold' : '',
    isReady && ambientPhase === 'particleExit' ? 'hero-search-scene--ambient-particle-exit' : '',
    isReady && ambientPhase === 'hidden' ? 'hero-search-scene--ambient-hidden' : '',
    isReady && ambientPhase === 'particleReturn' ? 'hero-search-scene--ambient-particle-return' : '',
    isReady && ambientPhase === 'rematerializing' ? 'hero-search-scene--ambient-rematerialize' : '',
    isReady && isAmbientActive ? 'hero-search-scene--ready hero-search-scene--controls-ready' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const focusSearchInput = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  const clearSearchIntroTypingTimer = useCallback(() => {
    if (searchIntroTypingTimerRef.current !== null) {
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

    searchIntroTypingTimerRef.current = window.setTimeout(deletePreviousCharacter, 40);
  }, [clearSearchIntroTypingTimer]);

  const handleSearchInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(event.target.value);
    },
    [setSearchQuery],
  );

  const reopenAgentPanelFromSearchField = useCallback(() => {
    if (!isSearchInteractionReady) return;
    if (agentTurns.length === 0) return;
    setIsAgentPanelDismissed(false);
  }, [agentTurns.length, isSearchInteractionReady, setIsAgentPanelDismissed]);

  const primeActiveSearchPrompt = useCallback(() => {
    if (!activeSearchPrompt) return;
    setSearchQuery(activeSearchPrompt);

    window.requestAnimationFrame(() => {
      const input = searchInputRef.current;
      if (!input) return;
      input.focus();
      input.setSelectionRange(0, activeSearchPrompt.length);
    });
  }, [activeSearchPrompt, setSearchQuery]);

  const prunePendingAgentTurns = useCallback(() => {
    setAgentTurns((prev) => prev.filter((turn) => turn.status !== 'loading'));
  }, [setAgentTurns]);

  const closeAgentPanel = useCallback(() => {
    agentRequestAbortRef.current?.abort();
    agentRequestAbortRef.current = null;
    prunePendingAgentTurns();
    setIsAgentPanelDismissed(true);
  }, [prunePendingAgentTurns, setIsAgentPanelDismissed]);

  const submitSearchQuery = useCallback(
    async (overrideQuery?: string) => {
      const normalizedQuery = (overrideQuery ?? searchQuery).trim();

      if (!normalizedQuery) {
        primeActiveSearchPrompt();
        return;
      }

      if (!isReady) return;

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
    [
      isReady,
      primeActiveSearchPrompt,
      prunePendingAgentTurns,
      searchQuery,
      setAgentTurns,
      setIsAgentPanelDismissed,
      setSearchQuery,
    ],
  );

  const handleSearchSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void submitSearchQuery();
    },
    [submitSearchQuery],
  );

  const handleSearchMicToggle = useCallback(() => {
    if (!isSearchInteractionReady) return;

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
  }, [focusSearchInput, isListeningToSearch, isSearchInteractionReady, setSearchQuery]);

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
      if (!isSearchInteractionReady) return;

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
    [applySearchBarDragOffset, isSearchInteractionReady],
  );

  const handleSearchBarPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const state = searchBarDragStateRef.current;
      if (!isSearchInteractionReady || state.activePointerId !== event.pointerId) return;

      const deltaX = event.clientX - state.startPointerX;
      const deltaY = event.clientY - state.startPointerY;
      const offsetX = getElasticDragOffset(deltaX, state.maxOffsetX);
      const offsetY = getElasticDragOffset(deltaY, state.maxOffsetY);

      scheduleSearchBarDragOffset(offsetX, offsetY, true);
      event.preventDefault();
    },
    [isSearchInteractionReady, scheduleSearchBarDragOffset],
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
      if (!showGuideParticle) return;

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
    [applyProfileGuideDragOffset, showGuideParticle],
  );

  const handleProfileGuidePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const state = profileGuideDragStateRef.current;
      if (!showGuideParticle || state.activePointerId !== event.pointerId) return;

      const deltaX = event.clientX - state.startPointerX;
      const deltaY = event.clientY - state.startPointerY;
      const offsetX = getElasticDragOffset(deltaX, state.maxOffsetX);
      const offsetY = getElasticDragOffset(deltaY, state.maxOffsetY);

      scheduleProfileGuideDragOffset(offsetX, offsetY, true);
      event.preventDefault();
      event.stopPropagation();
    },
    [scheduleProfileGuideDragOffset, showGuideParticle],
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

  const handleRetryAgentResponse = useCallback(
    (question: string) => {
      void submitSearchQuery(question);
    },
    [submitSearchQuery],
  );

  const handleAgentQuestionTypingComplete = useCallback(
    (turnId: string) => {
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
    },
    [setAgentTurns],
  );

  const handleAgentAnswerTypingComplete = useCallback(
    (turnId: string) => {
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
    },
    [setAgentTurns],
  );

  useEffect(() => {
    if (scenePhase !== 'idle' && scenePhase !== null) return;
    if (!isReady) return;

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
  }, [isReady, scenePhase, setActiveSearchPromptIndex]);

  useEffect(() => {
    if (scenePhase === 'searchMaterialize') {
      startSearchIntroTypingIn();
      return;
    }

    if (scenePhase === 'searchDrop') {
      startSearchIntroTypingOut();
      return;
    }

    if (
      scenePhase === 'particle' ||
      scenePhase === 'particleGrow' ||
      scenePhase === 'particlePulse'
    ) {
      clearSearchIntroTypingTimer();
      searchIntroModeRef.current = 'idle';
      searchIntroTextRef.current = '';
      setSearchIntroDisplayText('');
    }
  }, [clearSearchIntroTypingTimer, scenePhase, startSearchIntroTypingIn, startSearchIntroTypingOut]);

  useEffect(() => {
    if (showGuideParticle) return;
    resetProfileGuideDrag();
  }, [resetProfileGuideDrag, showGuideParticle]);

  useEffect(() => {
    if (isReady) return;
    speechRecognitionRef.current?.abort();
    setIsListeningToSearch(false);
    agentRequestAbortRef.current?.abort();
    agentRequestAbortRef.current = null;
    prunePendingAgentTurns();
    resetSearchBarDrag();
  }, [isReady, prunePendingAgentTurns, resetSearchBarDrag]);

  useEffect(() => {
    return () => {
      agentRequestAbortRef.current?.abort();
      prunePendingAgentTurns();
      speechRecognitionRef.current?.abort();
      clearSearchIntroTypingTimer();
      resetSearchBarDrag();
      resetProfileGuideDrag();
      if (rotatingSearchPromptTimerRef.current) {
        window.clearTimeout(rotatingSearchPromptTimerRef.current);
        rotatingSearchPromptTimerRef.current = null;
      }
    };
  }, [clearSearchIntroTypingTimer, prunePendingAgentTurns, resetProfileGuideDrag, resetSearchBarDrag]);

  return (
    <>
      <div
        className={`hero-profile-guide-particle-layer${showGuideParticle ? ' hero-profile-guide-particle-layer--visible' : ''}`}
        data-profile={String(guideIndex)}
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

      <div className={searchSceneClassName}>
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
                disabled={!isSearchInteractionReady}
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
                disabled={!isSearchInteractionReady}
              />
            </form>

            <div className="hero-search-scene__actions hero-search-scene__actions--right">
              <button
                type="button"
                className="hero-search-scene__action-button"
                aria-label={isListeningToSearch ? 'Parar ditado' : 'Ditado por voz'}
                aria-pressed={isListeningToSearch}
                data-search-control="true"
                disabled={!isSearchInteractionReady}
                onClick={handleSearchMicToggle}
              >
                <FaMicrophone className="hero-search-scene__icon" />
              </button>
              <button
                type="button"
                className="hero-search-scene__action-button"
                aria-label="Enviar busca"
                data-search-control="true"
                disabled={!isSearchInteractionReady}
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
    </>
  );
}
