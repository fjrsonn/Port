import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import gsap from 'gsap';
import { FaGithub, FaLinkedin } from 'react-icons/fa';
import { HeroParticlesAdvanced } from '../components/hero-particles/HeroParticlesAdvanced';
import type { ShapeName } from '../components/hero-particles/engine/types';

type HeroSectionProps = {
  isVideoHovering?: boolean;
  isMainVisible?: boolean;
  isProjectCardVisible?: boolean;
};

const heroBioLines = [
  { label: 'Beginning in technology', value: 'since 2012' },
  { label: 'Profile', value: 'bold in the face of technological advances' },
  { label: 'Journey', value: 'marked by constant challenges' },
  { label: 'Learning method', value: 'self-taught' },
  { label: 'Area of interest', value: 'computer science' },
  { label: 'Source of knowledge', value: 'research on the World Wide Web' },
  { label: 'Current profession', value: 'private security' },
  { label: 'Professional role', value: 'monitoring through technology' },
] as const;

export function HeroSection({
  isVideoHovering = false,
  isMainVisible = true,
  isProjectCardVisible = false,
}: HeroSectionProps) {
  const heroRef = useRef<HTMLElement | null>(null);
  const heroStageRef = useRef<HTMLDivElement | null>(null);

  const [showDetails, setShowDetails] = useState(false);
  const [typedSubtitle, setTypedSubtitle] = useState('');
  const [hideFixedTitle, setHideFixedTitle] = useState(false);
  const [currentShape, setCurrentShape] = useState<ShapeName>('fjr');
  const [visibleBioLabels, setVisibleBioLabels] = useState(0);
  const [scrambledValues, setScrambledValues] = useState<string[]>([]);
  const [isBioGlowActive, setIsBioGlowActive] = useState(false);

  const hideDetailsTimerRef = useRef<number | null>(null);
  const subtitleTypingTimerRef = useRef<number | null>(null);
  const bioSequenceTimerRef = useRef<number | null>(null);
  const bioGlowTimerRef = useRef<number | null>(null);
  const bioScrambleRafRef = useRef<number | null>(null);
  const hasScheduledIntroRef = useRef(false);
  const hasPlayedHeroRevealRef = useRef(false);
  const isFixedTitleHiddenRef = useRef(false);

  const subtitleText = 'Machine Learning & Full Stack Dev.';
  const shouldHideFixedTitle = hideFixedTitle || isVideoHovering;

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
    if (!isMainVisible || hasScheduledIntroRef.current) return;
    hasScheduledIntroRef.current = true;

    const introTimer = window.setTimeout(() => {
      revealDetails();
    }, 950);

    return () => window.clearTimeout(introTimer);
  }, [isMainVisible, revealDetails]);

  useLayoutEffect(() => {
    if (!isMainVisible || hasPlayedHeroRevealRef.current || !heroStageRef.current) return;
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
  }, [isMainVisible]);

  useEffect(() => {
    return () => {
      if (hideDetailsTimerRef.current) window.clearTimeout(hideDetailsTimerRef.current);
      if (subtitleTypingTimerRef.current) window.clearTimeout(subtitleTypingTimerRef.current);
      if (bioSequenceTimerRef.current) window.clearTimeout(bioSequenceTimerRef.current);
      if (bioGlowTimerRef.current) window.clearTimeout(bioGlowTimerRef.current);
      if (bioScrambleRafRef.current) window.cancelAnimationFrame(bioScrambleRafRef.current);
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

  useEffect(() => {
    const shouldShowBio = !hideFixedTitle && currentShape === 'profile';

    if (!shouldShowBio) {
      setVisibleBioLabels(0);
      setScrambledValues([]);
      setIsBioGlowActive(false);
      if (bioSequenceTimerRef.current) {
        window.clearTimeout(bioSequenceTimerRef.current);
        bioSequenceTimerRef.current = null;
      }
      if (bioGlowTimerRef.current) {
        window.clearTimeout(bioGlowTimerRef.current);
        bioGlowTimerRef.current = null;
      }
      if (bioScrambleRafRef.current) {
        window.cancelAnimationFrame(bioScrambleRafRef.current);
        bioScrambleRafRef.current = null;
      }
      return;
    }

    const scrambleChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
    const labelsDelay = 260;
    const scrambleDuration = 1200;

    setVisibleBioLabels(0);
    setScrambledValues(new Array(heroBioLines.length).fill(''));
    setIsBioGlowActive(false);

    let labelIndex = 0;
    const revealNextLabel = () => {
      labelIndex += 1;
      setVisibleBioLabels(labelIndex);

      if (labelIndex < heroBioLines.length) {
        bioSequenceTimerRef.current = window.setTimeout(revealNextLabel, labelsDelay);
        return;
      }

      const startedAt = performance.now();

      const scrambleFrame = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / scrambleDuration);
        setScrambledValues(
          heroBioLines.map(({ value }) => {
            const revealCount = Math.floor(progress * value.length);

            return value
              .split('')
              .map((char, index) => {
                if (char === ' ') return ' ';
                if (index < revealCount) return value[index];
                return scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
              })
              .join('');
          }),
        );

        if (progress < 1) {
          bioScrambleRafRef.current = window.requestAnimationFrame(scrambleFrame);
          return;
        }

        setScrambledValues(heroBioLines.map(({ value }) => value));
        setIsBioGlowActive(true);
        bioGlowTimerRef.current = window.setTimeout(() => {
          setIsBioGlowActive(false);
          bioGlowTimerRef.current = null;
        }, 720);
      };

      bioScrambleRafRef.current = window.requestAnimationFrame(scrambleFrame);
      bioSequenceTimerRef.current = null;
    };

    bioSequenceTimerRef.current = window.setTimeout(revealNextLabel, 180);

    return () => {
      if (bioSequenceTimerRef.current) {
        window.clearTimeout(bioSequenceTimerRef.current);
        bioSequenceTimerRef.current = null;
      }
      if (bioGlowTimerRef.current) {
        window.clearTimeout(bioGlowTimerRef.current);
        bioGlowTimerRef.current = null;
      }
      if (bioScrambleRafRef.current) {
        window.cancelAnimationFrame(bioScrambleRafRef.current);
        bioScrambleRafRef.current = null;
      }
    };
  }, [currentShape, hideFixedTitle]);

  const handleShapeChange = useCallback((shape: ShapeName) => {
    setCurrentShape(shape);
    revealDetails();
  }, [revealDetails]);

  return (
    <section ref={heroRef} className="hero-section" id="inicio">
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
        <HeroParticlesAdvanced onShapeChange={handleShapeChange} />

        <div className="hero-subtitle-reveal hero-subtitle-reveal--particles">
          <AnimatePresence mode="wait">
            {showDetails && !hideFixedTitle && currentShape === 'fjr' && (
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
          {!hideFixedTitle && currentShape === 'profile' && (
            <motion.div
              key="hero-profile-bio"
              className="hero-profile-bio"
              initial={{ opacity: 0, x: -24, filter: 'blur(8px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: -24, filter: 'blur(8px)' }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              {heroBioLines.map((line, index) => {
                if (index >= visibleBioLabels) return null;

                return (
                  <motion.p
                    key={line.label}
                    className="hero-profile-bio-line"
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <span className="hero-profile-bio-label">{line.label}:</span>
                    <span
                      className={`hero-profile-bio-value ${isBioGlowActive ? 'hero-profile-bio-value--glow' : ''}`}
                    >
                      {scrambledValues[index] ?? ''}
                    </span>
                  </motion.p>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {showDetails && !hideFixedTitle && (
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
