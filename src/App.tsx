import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type WheelEvent as ReactWheelEvent } from 'react';
import type { HeroAgentTurn } from './components/hero-agent/HeroAgentPanel';
import { SharedProfileSearchOverlay } from './components/SharedProfileSearchOverlay';
import { IntroSection } from './sections/IntroSection';
import { HeroSection, type HeroSharedProfileUiState } from './sections/HeroSection';
import type { HeroTransitionPhase } from './components/hero-particles/engine/types';
import { ProfileOneSection } from './sections/ProfileOneSection';
import { SkillsOneSection } from './sections/SkillsOneSection';
import { ProfileTwoSection } from './sections/ProfileTwoSection';
import { SkillsTwoSection } from './sections/SkillsTwoSection';
import { ProjectSliderSection } from './sections/ProjectSliderSection';

const sectionParticleExitDurationMs = 820;
const sectionTransitionBaseDurationMs = 520;
const sectionTransitionLockMs = sectionTransitionBaseDurationMs + 80;
const deferredSectionTransitionLockMs =
  sectionParticleExitDurationMs + sectionTransitionBaseDurationMs + 120;
const wheelIntentThreshold = 72;
const sharedProfileIdleTimeoutMs = 10000;
const sharedProfileControlsHideDurationMs = 240;
const sharedProfileDematerializeDurationMs = 1150;
const sharedProfileParticleHoldDurationMs = 3000;
const sharedProfileParticleExitDurationMs = 820;
const sharedProfileParticleReturnDurationMs = 820;
const sharedProfileRematerializeDurationMs = 1150;
const sectionNavBlockSelector = [
  'a',
  'button',
  'input',
  'textarea',
  'select',
  'label',
  'form',
  '[role="button"]',
  '[role="link"]',
  '[contenteditable="true"]',
  '[data-search-control="true"]',
  '.hero-search-scene__bar-shell',
  '.hero-profile-guide-particle',
  '.hero-agent-panel',
  '.slider-original-root',
  '.video-overlay',
].join(', ');

const isNavigationBlockedTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return false;
  return target.closest(sectionNavBlockSelector) !== null;
};

const sectionWheelBlockSelector = [
  'input',
  'textarea',
  'select',
  '[contenteditable="true"]',
  '.hero-agent-panel',
  '.slider-original-root',
  '.video-overlay',
].join(', ');

const isWheelNavigationBlockedTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return false;
  return target.closest(sectionWheelBlockSelector) !== null;
};

type SectionTransitionCustom = {
  direction: 1 | -1;
};

const sectionTransitionEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

const isSharedProfileSectionIndex = (index: number) => index >= 1 && index <= 4;

const sectionTransitionVariants = {
  enter: ({ direction }: SectionTransitionCustom) => ({
    opacity: 0,
    y: direction > 0 ? '7%' : '-7%',
    filter: 'blur(10px)',
    transition: {
      duration: sectionTransitionBaseDurationMs / 1000,
      ease: sectionTransitionEase,
    },
  }),
  center: {
    opacity: 1,
    y: '0%',
    filter: 'blur(0px)',
    transition: {
      duration: sectionTransitionBaseDurationMs / 1000,
      ease: sectionTransitionEase,
    },
  },
  exit: ({ direction }: SectionTransitionCustom) => ({
    opacity: 0,
    y: direction > 0 ? '-7%' : '7%',
    filter: 'blur(10px)',
    transition: {
      duration: sectionTransitionBaseDurationMs / 1000,
      ease: sectionTransitionEase,
    },
  }),
};

const sharedProfileGuideMoveDurationMs = 340;

export default function App() {
  const totalSections = 6;
  const [showIntro, setShowIntro] = useState(true);
  const [showMain, setShowMain] = useState(false);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [navigationDirection, setNavigationDirection] = useState<1 | -1>(1);

  // Mantidos para compatibilidade com a HeroSection nova
  const [isVideoHovering] = useState(false);
  const [isProjectCardVisible] = useState(false);
  const sectionTransitionLockRef = useRef<number | null>(null);
  const deferredSectionTransitionTimerRef = useRef<number | null>(null);
  const wheelIntentRef = useRef(0);
  const isHeroTransitionInProgressRef = useRef(false);
  const sharedProfileAmbientSequenceRef = useRef(0);
  const sharedProfileIdleTimerRef = useRef<number | null>(null);
  const sharedProfileControlsHideTimerRef = useRef<number | null>(null);
  const sharedProfileDematerializeTimerRef = useRef<number | null>(null);
  const sharedProfileParticleHoldTimerRef = useRef<number | null>(null);
  const sharedProfileParticleExitTimerRef = useRef<number | null>(null);
  const sharedProfileParticleReturnTimerRef = useRef<number | null>(null);
  const sharedProfileRematerializeTimerRef = useRef<number | null>(null);
  const [sharedSearchQuery, setSharedSearchQuery] = useState('');
  const [sharedActiveSearchPromptIndex, setSharedActiveSearchPromptIndex] = useState(0);
  const [sharedAgentTurns, setSharedAgentTurns] = useState<HeroAgentTurn[]>([]);
  const [isSharedAgentPanelDismissed, setIsSharedAgentPanelDismissed] = useState(false);
  const [heroTransitionRequestId, setHeroTransitionRequestId] = useState(0);
  const [isHeroTransitionInProgress, setIsHeroTransitionInProgress] = useState(false);
  const [heroSharedScenePhase, setHeroSharedScenePhase] = useState<HeroTransitionPhase | null>(null);
  const [sharedProfileAmbientPhase, setSharedProfileAmbientPhase] = useState<
    | 'active'
    | 'controlsHiding'
    | 'dematerializing'
    | 'particleHold'
    | 'particleExit'
    | 'hidden'
    | 'particleReturn'
    | 'rematerializing'
  >('active');
  const [isSharedProfileTypingComplete, setIsSharedProfileTypingComplete] = useState(false);
  const [isSharedProfileBioVisible, setIsSharedProfileBioVisible] = useState(true);
  const [isSectionParticleExitActive, setIsSectionParticleExitActive] = useState(false);

  const sharedProfileUiState: HeroSharedProfileUiState = {
    searchQuery: sharedSearchQuery,
    setSearchQuery: setSharedSearchQuery,
    activeSearchPromptIndex: sharedActiveSearchPromptIndex,
    setActiveSearchPromptIndex: setSharedActiveSearchPromptIndex,
    agentTurns: sharedAgentTurns,
    setAgentTurns: setSharedAgentTurns,
    isAgentPanelDismissed: isSharedAgentPanelDismissed,
    setIsAgentPanelDismissed: setIsSharedAgentPanelDismissed,
  };
  const sharedProfileGuideLayerStyle = {
    '--hero-profile-guide-move-duration': `${sharedProfileGuideMoveDurationMs}ms`,
  } as CSSProperties;

  useEffect(() => {
    const introTextTimelineMs = 2900;

    const hideIntroTimer = window.setTimeout(() => {
      setShowIntro(false);
    }, introTextTimelineMs);

    return () => {
      window.clearTimeout(hideIntroTimer);
    };
  }, []);

  useEffect(() => {
    if (!showIntro) {
      setShowMain(true);
    }
  }, [showIntro]);

  useEffect(() => {
    if (activeSectionIndex >= 1 && activeSectionIndex <= 4) {
      setIsSharedProfileTypingComplete(false);
      return;
    }

    setIsSharedProfileTypingComplete(true);
  }, [activeSectionIndex]);

  useEffect(() => {
    return () => {
      if (sectionTransitionLockRef.current !== null) {
        window.clearTimeout(sectionTransitionLockRef.current);
      }
      if (deferredSectionTransitionTimerRef.current !== null) {
        window.clearTimeout(deferredSectionTransitionTimerRef.current);
      }
      if (sharedProfileIdleTimerRef.current !== null) {
        window.clearTimeout(sharedProfileIdleTimerRef.current);
      }
      if (sharedProfileControlsHideTimerRef.current !== null) {
        window.clearTimeout(sharedProfileControlsHideTimerRef.current);
      }
      if (sharedProfileDematerializeTimerRef.current !== null) {
        window.clearTimeout(sharedProfileDematerializeTimerRef.current);
      }
      if (sharedProfileParticleHoldTimerRef.current !== null) {
        window.clearTimeout(sharedProfileParticleHoldTimerRef.current);
      }
      if (sharedProfileParticleExitTimerRef.current !== null) {
        window.clearTimeout(sharedProfileParticleExitTimerRef.current);
      }
      if (sharedProfileParticleReturnTimerRef.current !== null) {
        window.clearTimeout(sharedProfileParticleReturnTimerRef.current);
      }
      if (sharedProfileRematerializeTimerRef.current !== null) {
        window.clearTimeout(sharedProfileRematerializeTimerRef.current);
      }
    };
  }, []);

  const isSharedProfileSection = isSharedProfileSectionIndex(activeSectionIndex);
  const isSharedAgentPanelVisible =
    isSharedProfileSection &&
    !isSharedAgentPanelDismissed &&
    sharedAgentTurns.length > 0;

  const clearSharedProfileAmbientTimers = useCallback(() => {
    if (sharedProfileIdleTimerRef.current !== null) {
      window.clearTimeout(sharedProfileIdleTimerRef.current);
      sharedProfileIdleTimerRef.current = null;
    }
    if (sharedProfileControlsHideTimerRef.current !== null) {
      window.clearTimeout(sharedProfileControlsHideTimerRef.current);
      sharedProfileControlsHideTimerRef.current = null;
    }
    if (sharedProfileDematerializeTimerRef.current !== null) {
      window.clearTimeout(sharedProfileDematerializeTimerRef.current);
      sharedProfileDematerializeTimerRef.current = null;
    }
    if (sharedProfileParticleHoldTimerRef.current !== null) {
      window.clearTimeout(sharedProfileParticleHoldTimerRef.current);
      sharedProfileParticleHoldTimerRef.current = null;
    }
    if (sharedProfileParticleExitTimerRef.current !== null) {
      window.clearTimeout(sharedProfileParticleExitTimerRef.current);
      sharedProfileParticleExitTimerRef.current = null;
    }
    if (sharedProfileParticleReturnTimerRef.current !== null) {
      window.clearTimeout(sharedProfileParticleReturnTimerRef.current);
      sharedProfileParticleReturnTimerRef.current = null;
    }
    if (sharedProfileRematerializeTimerRef.current !== null) {
      window.clearTimeout(sharedProfileRematerializeTimerRef.current);
      sharedProfileRematerializeTimerRef.current = null;
    }
  }, []);

  const setSharedProfileAmbientActive = useCallback(
    (scheduleHide: boolean) => {
      const sequence = sharedProfileAmbientSequenceRef.current + 1;
      sharedProfileAmbientSequenceRef.current = sequence;
      clearSharedProfileAmbientTimers();
      setSharedProfileAmbientPhase('active');
      setIsSharedProfileBioVisible(true);

      if (!scheduleHide) return;

      sharedProfileIdleTimerRef.current = window.setTimeout(() => {
        if (sequence !== sharedProfileAmbientSequenceRef.current) return;
        setSharedProfileAmbientPhase('controlsHiding');
        setIsSharedProfileBioVisible(true);

        sharedProfileControlsHideTimerRef.current = window.setTimeout(() => {
          if (sequence !== sharedProfileAmbientSequenceRef.current) return;
          setSharedProfileAmbientPhase('dematerializing');
          setIsSharedProfileBioVisible(true);

          sharedProfileDematerializeTimerRef.current = window.setTimeout(() => {
            if (sequence !== sharedProfileAmbientSequenceRef.current) return;
            setSharedProfileAmbientPhase('particleHold');
            setIsSharedProfileBioVisible(true);

            sharedProfileParticleHoldTimerRef.current = window.setTimeout(() => {
              if (sequence !== sharedProfileAmbientSequenceRef.current) return;
              setSharedProfileAmbientPhase('particleExit');
              setIsSharedProfileBioVisible(false);

              sharedProfileParticleExitTimerRef.current = window.setTimeout(() => {
                if (sequence !== sharedProfileAmbientSequenceRef.current) return;
                setSharedProfileAmbientPhase('hidden');
                setIsSharedProfileBioVisible(false);
                sharedProfileParticleExitTimerRef.current = null;
              }, sharedProfileParticleExitDurationMs);

              sharedProfileParticleHoldTimerRef.current = null;
            }, sharedProfileParticleHoldDurationMs);

            sharedProfileDematerializeTimerRef.current = null;
          }, sharedProfileDematerializeDurationMs);

          sharedProfileControlsHideTimerRef.current = null;
        }, sharedProfileControlsHideDurationMs);

        sharedProfileIdleTimerRef.current = null;
      }, sharedProfileIdleTimeoutMs);
    },
    [clearSharedProfileAmbientTimers],
  );

  const startSharedProfileAmbientReturn = useCallback(() => {
    const sequence = sharedProfileAmbientSequenceRef.current + 1;
    sharedProfileAmbientSequenceRef.current = sequence;
    clearSharedProfileAmbientTimers();
    setSharedProfileAmbientPhase('particleReturn');
    setIsSharedProfileBioVisible(true);

    sharedProfileParticleReturnTimerRef.current = window.setTimeout(() => {
      if (sequence !== sharedProfileAmbientSequenceRef.current) return;
      setSharedProfileAmbientPhase('rematerializing');
      setIsSharedProfileBioVisible(true);

      sharedProfileRematerializeTimerRef.current = window.setTimeout(() => {
        if (sequence !== sharedProfileAmbientSequenceRef.current) return;
        setSharedProfileAmbientPhase('active');
        setIsSharedProfileBioVisible(true);
        sharedProfileRematerializeTimerRef.current = null;
      }, sharedProfileRematerializeDurationMs);

      sharedProfileParticleReturnTimerRef.current = null;
    }, sharedProfileParticleReturnDurationMs);
  }, [clearSharedProfileAmbientTimers]);

  const startSharedProfileAmbientRematerialize = useCallback(() => {
    const sequence = sharedProfileAmbientSequenceRef.current + 1;
    sharedProfileAmbientSequenceRef.current = sequence;
    clearSharedProfileAmbientTimers();
    setSharedProfileAmbientPhase('rematerializing');
    setIsSharedProfileBioVisible(true);

    sharedProfileRematerializeTimerRef.current = window.setTimeout(() => {
      if (sequence !== sharedProfileAmbientSequenceRef.current) return;
      setSharedProfileAmbientPhase('active');
      setIsSharedProfileBioVisible(true);
      sharedProfileRematerializeTimerRef.current = null;
    }, sharedProfileRematerializeDurationMs);
  }, [clearSharedProfileAmbientTimers]);

  const startHeroForwardTransition = useCallback(() => {
    setNavigationDirection(1);
    isHeroTransitionInProgressRef.current = true;
    setIsHeroTransitionInProgress(true);
    setHeroSharedScenePhase(null);
    setHeroTransitionRequestId((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!showMain || !isSharedProfileSection) {
      sharedProfileAmbientSequenceRef.current += 1;
      clearSharedProfileAmbientTimers();
      setSharedProfileAmbientPhase('active');
      setIsSharedProfileBioVisible(true);
      return;
    }

    if (isSectionParticleExitActive) {
      clearSharedProfileAmbientTimers();
      setIsSharedProfileBioVisible(false);
      return;
    }

    if (!isSharedProfileTypingComplete) {
      sharedProfileAmbientSequenceRef.current += 1;
      clearSharedProfileAmbientTimers();
      setSharedProfileAmbientPhase('active');
      setIsSharedProfileBioVisible(true);
      return;
    }

    if (isSharedAgentPanelVisible) {
      setSharedProfileAmbientActive(false);
      return;
    }

    if (sharedProfileAmbientPhase === 'active') {
      setSharedProfileAmbientActive(true);
    }
  }, [
    clearSharedProfileAmbientTimers,
    isSharedAgentPanelVisible,
    isSharedProfileSection,
    isSharedProfileTypingComplete,
    isSectionParticleExitActive,
    setSharedProfileAmbientActive,
    showMain,
    sharedProfileAmbientPhase,
  ]);

  const navigateSections = useCallback(
    (direction: 'next' | 'prev') => {
      if (!showMain || sectionTransitionLockRef.current !== null) return;

      const directionValue = direction === 'next' ? 1 : -1;
      const shouldWaitForParticleExit = isSharedProfileSectionIndex(activeSectionIndex);
      setNavigationDirection(directionValue);

      const completeSectionNavigation = () => {
        setActiveSectionIndex((currentIndex) => {
          const nextIndex = (currentIndex + directionValue + totalSections) % totalSections;
          return nextIndex;
        });
      };

      wheelIntentRef.current = 0;
      sectionTransitionLockRef.current = window.setTimeout(() => {
        sectionTransitionLockRef.current = null;
      }, shouldWaitForParticleExit ? deferredSectionTransitionLockMs : sectionTransitionLockMs);

      if (!shouldWaitForParticleExit) {
        setIsSectionParticleExitActive(false);
        completeSectionNavigation();
        return;
      }

      clearSharedProfileAmbientTimers();
      setIsSharedProfileBioVisible(false);
      setIsSectionParticleExitActive(true);

      deferredSectionTransitionTimerRef.current = window.setTimeout(() => {
        deferredSectionTransitionTimerRef.current = null;
        setIsSectionParticleExitActive(false);
        completeSectionNavigation();
      }, sectionParticleExitDurationMs);
    },
    [activeSectionIndex, clearSharedProfileAmbientTimers, showMain, totalSections],
  );

  const registerSharedProfileInteraction = useCallback(() => {
    if (!showMain || !isSharedProfileSection) return;
    if (isSectionParticleExitActive) return;

    if (!isSharedProfileTypingComplete) {
      sharedProfileAmbientSequenceRef.current += 1;
      clearSharedProfileAmbientTimers();
      setSharedProfileAmbientPhase('active');
      setIsSharedProfileBioVisible(true);
      return;
    }

    if (isSharedAgentPanelVisible) {
      setSharedProfileAmbientActive(false);
      return;
    }

    if (sharedProfileAmbientPhase === 'controlsHiding') {
      setSharedProfileAmbientActive(true);
      return;
    }

    if (sharedProfileAmbientPhase === 'hidden') {
      startSharedProfileAmbientReturn();
      return;
    }

    if (
      sharedProfileAmbientPhase === 'dematerializing' ||
      sharedProfileAmbientPhase === 'particleHold'
    ) {
      startSharedProfileAmbientRematerialize();
      return;
    }

    if (sharedProfileAmbientPhase === 'particleExit') {
      startSharedProfileAmbientReturn();
      return;
    }

    if (
      sharedProfileAmbientPhase === 'particleReturn' ||
      sharedProfileAmbientPhase === 'rematerializing'
    ) {
      return;
    }

    setSharedProfileAmbientActive(true);
  }, [
    clearSharedProfileAmbientTimers,
    isSharedAgentPanelVisible,
    isSharedProfileSection,
    isSharedProfileTypingComplete,
    isSectionParticleExitActive,
    setSharedProfileAmbientActive,
    sharedProfileAmbientPhase,
    showMain,
    startSharedProfileAmbientRematerialize,
    startSharedProfileAmbientReturn,
  ]);

  const handleMainClick = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      if (!showMain || event.defaultPrevented) return;
      if (isNavigationBlockedTarget(event.target)) return;

      if (activeSectionIndex === 0 && !isHeroTransitionInProgress) {
        startHeroForwardTransition();
        return;
      }

      if (isHeroTransitionInProgress) return;
      navigateSections('next');
    },
    [
      activeSectionIndex,
      isHeroTransitionInProgress,
      navigateSections,
      showMain,
      startHeroForwardTransition,
    ],
  );

  const handleMainWheel = useCallback(
    (event: ReactWheelEvent<HTMLElement>) => {
      if (!showMain) return;
      if (isWheelNavigationBlockedTarget(event.target)) return;

      wheelIntentRef.current += event.deltaY;

      if (Math.abs(wheelIntentRef.current) < wheelIntentThreshold) {
        return;
      }

      const direction = wheelIntentRef.current > 0 ? 'next' : 'prev';
      wheelIntentRef.current = 0;

      if (activeSectionIndex === 0 && direction === 'next' && !isHeroTransitionInProgress) {
        startHeroForwardTransition();
        return;
      }

      if (isHeroTransitionInProgress) return;
      navigateSections(direction);
    },
    [
      activeSectionIndex,
      isHeroTransitionInProgress,
      navigateSections,
      showMain,
      startHeroForwardTransition,
    ],
  );

  const handleMainPointerMove = useCallback(() => {
    if (!showMain || !isSharedProfileSection) return;
    registerSharedProfileInteraction();
  }, [isSharedProfileSection, registerSharedProfileInteraction, showMain]);

  const handleMainKeyDown = useCallback(() => {
    if (!showMain || !isSharedProfileSection) return;
    registerSharedProfileInteraction();
  }, [isSharedProfileSection, registerSharedProfileInteraction, showMain]);

  const sections = [
    {
      key: 'hero',
      element: (
        <HeroSection
          onExternalTransitionPhaseChange={(phase) => {
            if (activeSectionIndex !== 0) return;
            setHeroSharedScenePhase(phase === 'idle' && !isHeroTransitionInProgressRef.current ? null : phase);

            if (phase === 'idle' && isHeroTransitionInProgressRef.current) {
              isHeroTransitionInProgressRef.current = false;
              setIsHeroTransitionInProgress(false);
              navigateSections('next');
            }
          }}
          renderProfileGuideParticle={false}
          renderSearchUi={false}
          transitionRequestId={heroTransitionRequestId}
          transitionSkipFinalSampleLoad
          transitionTargetSampleIndex={1}
          isVideoHovering={isVideoHovering}
          isMainVisible={showMain}
          isProjectCardVisible={isProjectCardVisible}
        />
      ),
    },
    {
      key: 'profile-one',
      element: (
        <ProfileOneSection
          disableAmbientAutoHide
          externalProfileBioVisible={isSharedProfileBioVisible}
          isSectionParticleExitActive={isSectionParticleExitActive}
          isVideoHovering={isVideoHovering}
          isMainVisible={showMain}
          isProjectCardVisible={isProjectCardVisible}
          onProfileTypingCompleteChange={setIsSharedProfileTypingComplete}
          sharedProfileUiState={sharedProfileUiState}
        />
      ),
    },
    {
      key: 'skills-one',
      element: (
        <SkillsOneSection
          disableAmbientAutoHide
          externalProfileBioVisible={isSharedProfileBioVisible}
          isSectionParticleExitActive={isSectionParticleExitActive}
          isVideoHovering={isVideoHovering}
          isMainVisible={showMain}
          isProjectCardVisible={isProjectCardVisible}
          onProfileTypingCompleteChange={setIsSharedProfileTypingComplete}
          sharedProfileUiState={sharedProfileUiState}
        />
      ),
    },
    {
      key: 'profile-two',
      element: (
        <ProfileTwoSection
          disableAmbientAutoHide
          externalProfileBioVisible={isSharedProfileBioVisible}
          isSectionParticleExitActive={isSectionParticleExitActive}
          isVideoHovering={isVideoHovering}
          isMainVisible={showMain}
          isProjectCardVisible={isProjectCardVisible}
          onProfileTypingCompleteChange={setIsSharedProfileTypingComplete}
          sharedProfileUiState={sharedProfileUiState}
        />
      ),
    },
    {
      key: 'skills-two',
      element: (
        <SkillsTwoSection
          disableAmbientAutoHide
          externalProfileBioVisible={isSharedProfileBioVisible}
          isSectionParticleExitActive={isSectionParticleExitActive}
          isVideoHovering={isVideoHovering}
          isMainVisible={showMain}
          isProjectCardVisible={isProjectCardVisible}
          onProfileTypingCompleteChange={setIsSharedProfileTypingComplete}
          sharedProfileUiState={sharedProfileUiState}
        />
      ),
    },
    {
      key: 'projects',
      element: (
        <ProjectSliderSection
          isMainVisible={showMain}
          onReachEnd={() => navigateSections('next')}
          onReachStart={() => navigateSections('prev')}
        />
      ),
    },
  ];
  const activeSection = sections[activeSectionIndex] ?? sections[0];
  const sectionTransitionCustom: SectionTransitionCustom = {
    direction: navigationDirection,
  };
  const showSharedProfileOverlay =
    isSharedProfileSection ||
    (activeSectionIndex === 0 && isHeroTransitionInProgress);

  return (
    <>
      {showIntro && <IntroSection visible={showIntro} />}

      <main
        className={`main-content ${showMain ? 'main-visible' : 'main-hidden'}`}
        onClick={handleMainClick}
        onKeyDown={handleMainKeyDown}
        onPointerMove={handleMainPointerMove}
        onWheel={handleMainWheel}
      >
        <div className="main-content__viewport">
          {isSharedProfileSection && (
            <div className="main-content__guide-layer" aria-hidden="true">
              <div
                className="hero-profile-guide-particle-layer hero-profile-guide-particle-layer--visible"
                data-profile={String(activeSectionIndex)}
                style={sharedProfileGuideLayerStyle}
              >
                <div className="hero-profile-guide-particle">
                  <div className="hero-profile-guide-particle__core" />
                </div>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait" initial={false} custom={sectionTransitionCustom}>
            <motion.div
              key={activeSection.key}
              custom={sectionTransitionCustom}
              className="main-content__section"
              variants={sectionTransitionVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              {activeSection.element}
            </motion.div>
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {showSharedProfileOverlay && (
              <motion.div
                key="shared-profile-search"
                className="main-content__overlay"
                initial={{ opacity: 0, filter: 'blur(8px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, filter: 'blur(8px)' }}
                transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
              >
                <SharedProfileSearchOverlay
                  ambientPhase={activeSectionIndex >= 1 && activeSectionIndex <= 4 ? sharedProfileAmbientPhase : 'active'}
                  guideIndex={activeSectionIndex >= 1 && activeSectionIndex <= 4 ? activeSectionIndex : 1}
                  isReady={activeSectionIndex >= 1 && activeSectionIndex <= 4}
                  scenePhase={activeSectionIndex === 0 ? heroSharedScenePhase : 'idle'}
                  sharedState={sharedProfileUiState}
                  showGuideParticle={false}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </>
  );
}
