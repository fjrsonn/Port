import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react';
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
const sharedProfileRematerializeOnSectionEntryPhases = new Set([
  'dematerializing',
  'particleHold',
  'particleExit',
  'hidden',
  'particleReturn',
  'rematerializing',
]);
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
const skillImageModules = import.meta.glob('./assets/skills/*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

type SkillAmbientImage = {
  fileName: string;
  label: string;
  src: string;
};

const getSkillImageUrl = (fileName: string) => skillImageModules[`./assets/skills/${fileName}`] ?? '';

const getSkillImage = ({
  fileName,
  label,
}: {
  fileName: string;
  label: string;
}): SkillAmbientImage | null => {
  const src = getSkillImageUrl(fileName);
  return src.length > 0 ? { fileName, label, src } : null;
};

const isSkillAmbientImage = (image: SkillAmbientImage | null): image is SkillAmbientImage => image !== null;

const fullstackSkillImages = [
  { fileName: 'frontend1.png', label: 'JAVA SCRIPT' },
  { fileName: 'frontend2.png', label: 'TYPE SCRIPT' },
  { fileName: 'frontend3.png', label: 'HTML5' },
  { fileName: 'frontend4.png', label: 'CSS3' },
  { fileName: 'frontend5.png', label: 'REACT' },
  { fileName: 'frontend6.png', label: 'NEXT.JS' },
  { fileName: 'backend2.png', label: 'PYTHON' },
  { fileName: 'backend3.png', label: 'NODE.JS' },
  { fileName: 'backend4.png', label: 'MYSQL' },
  { fileName: 'backend5.png', label: 'DOCKER' },
].map(getSkillImage).filter(isSkillAmbientImage);

const securitySkillImages = [
  { fileName: 'SEC1.png', label: 'PYTHON' },
  { fileName: 'SEC2.png', label: 'NUMPY' },
  { fileName: 'SEC3.png', label: 'PANDAS' },
  { fileName: 'SEC4.png', label: 'SEABORN' },
  { fileName: 'SEC5.png', label: 'SCIKIT LEARN' },
  { fileName: 'SEC6.png', label: 'TENSOR FLOW' },
  { fileName: 'SEC7.png', label: 'PYTORCH' },
  { fileName: 'SEC8.png', label: 'MLFLOW' },
  { fileName: 'SEC9.png', label: 'MYSQL' },
  { fileName: 'SEC10.png', label: 'AWS' },
  { fileName: 'SEC11.png', label: 'AZURE' },
  { fileName: 'SEC12.png', label: 'CISCO' },
  { fileName: 'SEC13.png', label: 'PFSENSE' },
  { fileName: 'SEC14.png', label: 'SURICATA' },
  { fileName: 'SEC15.png', label: 'NMAP' },
  { fileName: 'SEC16.png', label: 'WIRESHARK' },
  { fileName: 'SEC17.png', label: 'WAZUH' },
  { fileName: 'SEC18.png', label: 'SPLUNK' },
  { fileName: 'SEC19.png', label: 'LINUX' },
  { fileName: 'SEC20.png', label: 'WINDOWS SERVER' },
  { fileName: 'SEC21.png', label: 'BASH' },
  { fileName: 'SEC22.png', label: 'POWERSHEL' },
  { fileName: 'SEC23.png', label: 'APACHE' },
  { fileName: 'SEC24.png', label: 'VMWEARE' },
  { fileName: 'SEC25.png', label: 'MICROSOFT HYPER-V' },
  { fileName: 'SEC26.png', label: 'VIRTUALBOX' },
  { fileName: 'SEC27.png', label: 'GIT' },
].map(getSkillImage).filter(isSkillAmbientImage);

type SkillAmbientContent = {
  title: string;
  images: SkillAmbientImage[];
};

const scrambleCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';

function ScrambleSkillTitle({
  text,
  isVisible,
  triggerKey,
}: {
  text: string;
  isVisible: boolean;
  triggerKey: number;
}) {
  const [displayText, setDisplayText] = useState(text);
  const rafRef = useRef<number | null>(null);

  const stopScramble = useCallback(() => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const runScramble = useCallback(() => {
    stopScramble();

    const duration = 940;
    const startedAt = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const revealCount = Math.floor(progress * text.length);
      const nextText = text
        .split('')
        .map((char, index) => {
          if (char === ' ') return char;
          if (index < revealCount) return text[index];
          return scrambleCharacters[Math.floor(Math.random() * scrambleCharacters.length)];
        })
        .join('');

      setDisplayText(progress >= 1 ? text : nextText);

      if (progress < 1) {
        rafRef.current = window.requestAnimationFrame(tick);
        return;
      }

      rafRef.current = null;
    };

    rafRef.current = window.requestAnimationFrame(tick);
  }, [stopScramble, text]);

  useEffect(() => {
    stopScramble();
    setDisplayText(text);

    if (!isVisible) return;

    const timer = window.setTimeout(runScramble, 220);
    return () => {
      window.clearTimeout(timer);
      stopScramble();
    };
  }, [isVisible, runScramble, stopScramble, text]);

  useEffect(() => stopScramble, [stopScramble]);

  useEffect(() => {
    if (!isVisible || triggerKey === 0) return;
    runScramble();
  }, [isVisible, runScramble, triggerKey]);

  return (
    <span className="skill-section-heading">
      {displayText}
    </span>
  );
}

export default function App() {
  const totalSections = 6;
  const [showIntro, setShowIntro] = useState(true);
  const [showMain, setShowMain] = useState(false);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [navigationDirection, setNavigationDirection] = useState<1 | -1>(1);
  const skillHeadingShellRef = useRef<HTMLDivElement | null>(null);
  const isPointerOverSkillHeadingRef = useRef(false);

  // Mantidos para compatibilidade com a HeroSection nova
  const [isVideoHovering] = useState(false);
  const [isProjectCardVisible] = useState(false);
  const sectionTransitionLockRef = useRef<number | null>(null);
  const deferredSectionTransitionTimerRef = useRef<number | null>(null);
  const wheelIntentRef = useRef(0);
  const isHeroTransitionInProgressRef = useRef(false);
  const activeSectionIndexRef = useRef(activeSectionIndex);
  const previousSharedProfileSectionIndexRef = useRef(activeSectionIndex);
  const sharedProfileAmbientSequenceRef = useRef(0);
  const shouldRematerializeSharedProfileAfterNavigationRef = useRef(false);
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
  const [skillTitleScrambleTrigger, setSkillTitleScrambleTrigger] = useState(0);
  const [skillHeadingOverride, setSkillHeadingOverride] = useState<string | null>(null);
  const [activeSkillImageKey, setActiveSkillImageKey] = useState<string | null>(null);
  const skillHoverLabelRef = useRef<string | null>(null);
  const skillHoverKeyRef = useRef<string | null>(null);
  const skillStripPointerRef = useRef<{ x: number; y: number } | null>(null);
  const skillStripRafRef = useRef<number | null>(null);
  const isSharedProfileSection = isSharedProfileSectionIndex(activeSectionIndex);
  const isSharedAgentPanelVisible =
    isSharedProfileSection &&
    !isSharedAgentPanelDismissed &&
    sharedAgentTurns.length > 0;

  activeSectionIndexRef.current = activeSectionIndex;

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
  const activeSkillAmbientContent: SkillAmbientContent | null =
    activeSectionIndex === 2
      ? { title: 'FULLSTACK', images: fullstackSkillImages }
      : activeSectionIndex === 4
        ? { title: 'SECURITY', images: securitySkillImages }
        : null;
  const activeSkillImageItems = activeSkillAmbientContent?.images ?? [];
  const activeSkillHeadingText = skillHeadingOverride ?? activeSkillAmbientContent?.title ?? '';
  const isSkillAmbientSection = activeSkillAmbientContent !== null;
  const shouldShowSkillAmbient =
    showMain &&
    isSkillAmbientSection &&
    isSharedProfileTypingComplete &&
    !isSectionParticleExitActive &&
    !isSharedAgentPanelVisible &&
    (
      sharedProfileAmbientPhase === 'active' ||
      sharedProfileAmbientPhase === 'controlsHiding' ||
      sharedProfileAmbientPhase === 'dematerializing' ||
      sharedProfileAmbientPhase === 'particleHold'
    );
  const shouldSinkSkillAmbient =
    isSkillAmbientSection &&
    (
      isSectionParticleExitActive ||
      sharedProfileAmbientPhase === 'particleExit' ||
      sharedProfileAmbientPhase === 'hidden'
    );

  const setSkillHoverItem = useCallback((label: string | null, itemKey: string | null) => {
    if (skillHoverLabelRef.current === label && skillHoverKeyRef.current === itemKey) return;

    skillHoverLabelRef.current = label;
    skillHoverKeyRef.current = itemKey;
    setSkillHeadingOverride(label);
    setActiveSkillImageKey(itemKey);
  }, []);

  const updateSkillHeadingFromPoint = useCallback(
    (x: number, y: number) => {
      const skillItems = document.querySelectorAll<HTMLElement>('.hero-skill-image-strip__item');
      const skillItem = Array.from(skillItems).find((item) => {
        const rect = item.getBoundingClientRect();

        return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
      });

      setSkillHoverItem(skillItem?.dataset.skillLabel ?? null, skillItem?.dataset.skillKey ?? null);
    },
    [setSkillHoverItem],
  );

  const clearSkillHover = useCallback(() => {
    skillStripPointerRef.current = null;
    setSkillHoverItem(null, null);
  }, [setSkillHoverItem]);

  const handleSkillStripPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      skillStripPointerRef.current = {
        x: event.clientX,
        y: event.clientY,
      };
      updateSkillHeadingFromPoint(event.clientX, event.clientY);
    },
    [updateSkillHeadingFromPoint],
  );

  const handleSkillStripPointerLeave = useCallback(() => {
    clearSkillHover();
  }, [clearSkillHover]);

  const handleSkillImagePointerEnter = useCallback((label: string, itemKey: string) => {
    setSkillHoverItem(label, itemKey);
  }, [setSkillHoverItem]);

  useEffect(() => {
    isPointerOverSkillHeadingRef.current = false;
    clearSkillHover();
  }, [activeSkillAmbientContent?.title, clearSkillHover, shouldShowSkillAmbient]);

  useEffect(() => {
    if (!shouldShowSkillAmbient) return;

    const tick = () => {
      const pointer = skillStripPointerRef.current;

      if (pointer) {
        updateSkillHeadingFromPoint(pointer.x, pointer.y);
      }

      skillStripRafRef.current = window.requestAnimationFrame(tick);
    };

    skillStripRafRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (skillStripRafRef.current !== null) {
        window.cancelAnimationFrame(skillStripRafRef.current);
        skillStripRafRef.current = null;
      }
    };
  }, [shouldShowSkillAmbient, updateSkillHeadingFromPoint]);

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

  const handleSharedProfileTypingCompleteChange = useCallback((sectionIndex: number, isComplete: boolean) => {
    if (sectionIndex !== activeSectionIndexRef.current) return;
    setIsSharedProfileTypingComplete(isComplete);
  }, []);

  useEffect(() => {
    const previousSectionIndex = previousSharedProfileSectionIndexRef.current;
    previousSharedProfileSectionIndexRef.current = activeSectionIndex;

    const movedBetweenSharedProfileSections =
      previousSectionIndex !== activeSectionIndex &&
      isSharedProfileSectionIndex(previousSectionIndex) &&
      isSharedProfileSectionIndex(activeSectionIndex);

    if (
      movedBetweenSharedProfileSections &&
      sharedProfileRematerializeOnSectionEntryPhases.has(sharedProfileAmbientPhase)
    ) {
      shouldRematerializeSharedProfileAfterNavigationRef.current = true;
    }
  }, [activeSectionIndex, sharedProfileAmbientPhase]);

  useEffect(() => {
    if (!showMain || !isSharedProfileSection) {
      shouldRematerializeSharedProfileAfterNavigationRef.current = false;
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

    if (isSharedAgentPanelVisible) {
      clearSharedProfileAmbientTimers();
      setSharedProfileAmbientPhase('active');
      setIsSharedProfileBioVisible(false);
      return;
    }

    if (shouldRematerializeSharedProfileAfterNavigationRef.current) {
      shouldRematerializeSharedProfileAfterNavigationRef.current = false;
      startSharedProfileAmbientReturn();
      return;
    }

    if (!isSharedProfileTypingComplete) {
      if (
        sharedProfileAmbientPhase === 'particleReturn' ||
        sharedProfileAmbientPhase === 'rematerializing'
      ) {
        return;
      }

      sharedProfileAmbientSequenceRef.current += 1;
      clearSharedProfileAmbientTimers();
      setSharedProfileAmbientPhase('active');
      setIsSharedProfileBioVisible(true);
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
    startSharedProfileAmbientReturn,
  ]);

  const navigateSections = useCallback(
    (direction: 'next' | 'prev') => {
      if (!showMain || sectionTransitionLockRef.current !== null) return;

      const directionValue = direction === 'next' ? 1 : -1;
      const shouldWaitForParticleExit = isSharedProfileSectionIndex(activeSectionIndex);
      const nextSectionIndex = (activeSectionIndex + directionValue + totalSections) % totalSections;
      const shouldReplayAmbientReturnAfterNavigation =
        shouldWaitForParticleExit &&
        isSharedProfileSectionIndex(nextSectionIndex) &&
        sharedProfileRematerializeOnSectionEntryPhases.has(sharedProfileAmbientPhase);
      const isMovingBetweenSharedProfileSections =
        shouldWaitForParticleExit && isSharedProfileSectionIndex(nextSectionIndex);
      setNavigationDirection(directionValue);

      const completeSectionNavigation = () => {
        if (isMovingBetweenSharedProfileSections) {
          setIsSharedProfileTypingComplete(false);
        }
        setActiveSectionIndex(nextSectionIndex);
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
      shouldRematerializeSharedProfileAfterNavigationRef.current = shouldReplayAmbientReturnAfterNavigation;
      if (shouldReplayAmbientReturnAfterNavigation) {
        setSharedProfileAmbientPhase('hidden');
      }
      setIsSharedProfileBioVisible(false);
      setIsSectionParticleExitActive(true);

      deferredSectionTransitionTimerRef.current = window.setTimeout(() => {
        deferredSectionTransitionTimerRef.current = null;
        setIsSectionParticleExitActive(false);
        completeSectionNavigation();
      }, sectionParticleExitDurationMs);
    },
    [activeSectionIndex, clearSharedProfileAmbientTimers, sharedProfileAmbientPhase, showMain, totalSections],
  );

  const registerSharedProfileInteraction = useCallback(() => {
    if (!showMain || !isSharedProfileSection) return;
    if (isSectionParticleExitActive) return;

    if (isSharedAgentPanelVisible) {
      clearSharedProfileAmbientTimers();
      setSharedProfileAmbientPhase('active');
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

  const handleMainPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const headingShell = skillHeadingShellRef.current;

    if (shouldShowSkillAmbient && headingShell) {
      const rect = headingShell.getBoundingClientRect();
      const isPointerInsideHeading =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;

      if (isPointerInsideHeading && !isPointerOverSkillHeadingRef.current) {
        setSkillTitleScrambleTrigger((current) => current + 1);
      }

      isPointerOverSkillHeadingRef.current = isPointerInsideHeading;
    } else {
      isPointerOverSkillHeadingRef.current = false;
    }

    if (shouldShowSkillAmbient) {
      skillStripPointerRef.current = {
        x: event.clientX,
        y: event.clientY,
      };
      updateSkillHeadingFromPoint(event.clientX, event.clientY);
    }

    if (!showMain || !isSharedProfileSection) return;
    registerSharedProfileInteraction();
  }, [isSharedProfileSection, registerSharedProfileInteraction, shouldShowSkillAmbient, showMain, updateSkillHeadingFromPoint]);

  const handleMainPointerLeave = useCallback(() => {
    isPointerOverSkillHeadingRef.current = false;
    clearSkillHover();
  }, [clearSkillHover]);

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
          onProfileTypingCompleteChange={(isComplete) => handleSharedProfileTypingCompleteChange(1, isComplete)}
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
          onProfileTypingCompleteChange={(isComplete) => handleSharedProfileTypingCompleteChange(2, isComplete)}
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
          onProfileTypingCompleteChange={(isComplete) => handleSharedProfileTypingCompleteChange(3, isComplete)}
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
          onProfileTypingCompleteChange={(isComplete) => handleSharedProfileTypingCompleteChange(4, isComplete)}
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
        onPointerLeave={handleMainPointerLeave}
        onPointerMove={handleMainPointerMove}
        onWheel={handleMainWheel}
      >
        <div className="main-content__viewport">
          {activeSkillAmbientContent && (
            <div className="main-content__skill-layer">
              <div
                ref={skillHeadingShellRef}
                className={[
                  'skill-section-heading-shell',
                  shouldShowSkillAmbient ? 'skill-section-heading-shell--visible' : '',
                  shouldSinkSkillAmbient ? 'skill-section-heading-shell--sink' : '',
                ].filter(Boolean).join(' ')}
              >
                <ScrambleSkillTitle
                  key={activeSkillAmbientContent.title}
                  text={activeSkillHeadingText}
                  isVisible={shouldShowSkillAmbient}
                  triggerKey={skillTitleScrambleTrigger}
                />
              </div>

              {activeSkillImageItems.length > 0 && (
                <div
                  className={[
                    'hero-skill-image-strip',
                    activeSkillAmbientContent.title === 'SECURITY' ? 'hero-skill-image-strip--security' : '',
                    shouldShowSkillAmbient ? 'hero-skill-image-strip--visible' : '',
                    shouldSinkSkillAmbient ? 'hero-skill-image-strip--sink' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={(event) => event.stopPropagation()}
                  onPointerLeave={handleSkillStripPointerLeave}
                  onPointerMove={handleSkillStripPointerMove}
                  aria-hidden="true"
                >
                  <div className="hero-skill-image-strip__track">
                    {[...activeSkillImageItems, ...activeSkillImageItems].map((image, index) => {
                      const skillItemKey = `${image.fileName}-${index}`;

                      return (
                        <span
                          className={[
                            'hero-skill-image-strip__item',
                            activeSkillImageKey === skillItemKey ? 'hero-skill-image-strip__item--active' : '',
                          ].filter(Boolean).join(' ')}
                          data-skill-key={skillItemKey}
                          data-skill-label={image.label}
                          key={skillItemKey}
                          onPointerEnter={() => handleSkillImagePointerEnter(image.label, skillItemKey)}
                        >
                          <img className="hero-skill-image-strip__image" src={image.src} alt="" />
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

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
