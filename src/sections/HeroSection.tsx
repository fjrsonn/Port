// src/sections/HeroSection.tsx - VERSÃO FINAL E FUNCIONAL

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import gsap from 'gsap';
import { FaGithub, FaLinkedin } from 'react-icons/fa';
import { TextScramble } from '../components/TextScramble';

type HeroSectionProps = {
  isVideoHovering?: boolean;
  isMainVisible?: boolean;
  isProjectCardVisible?: boolean;
};

export function HeroSection({
  isVideoHovering = false,
  isMainVisible = true,
  isProjectCardVisible = false,
}: HeroSectionProps) {
  const [hovered, setHovered] = useState(false);
  const isScramblingRef = useRef(false);
  const hasCompletedPrimaryScrambleRef = useRef(false);
  const pointerInsideRef = useRef(false);
  const isScrollLockedRef = useRef(false);
  const scrollUnlockTimerRef = useRef<number | null>(null);
  const autoScrambleTimerRef = useRef<number | null>(null);
  const hideDetailsTimerRef = useRef<number | null>(null);
  const hasAutoScrambledRef = useRef(false);
  const hasScheduledIntroRef = useRef(false);
  const hasPlayedHeroRevealRef = useRef(false);
  const heroTitleRef = useRef<HTMLHeadingElement>(null);
  const [scrambleKey, setScrambleKey] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [typedSubtitle, setTypedSubtitle] = useState('');
  const subtitleTypingTimerRef = useRef<number | null>(null);
  const subtitleText = 'Machine Learning & Full Stack Dev.';

  useEffect(() => {
    if (!isMainVisible || hasScheduledIntroRef.current) return;
    hasScheduledIntroRef.current = true;

    const heroAppearDuration = 800;
    autoScrambleTimerRef.current = window.setTimeout(() => {
      if (hasAutoScrambledRef.current) return;
      hasAutoScrambledRef.current = true;
      startScramble();
    }, heroAppearDuration + 150);
  }, [isMainVisible]);

  useEffect(() => {
    if (!isMainVisible || hasPlayedHeroRevealRef.current || !heroTitleRef.current) return;
    hasPlayedHeroRevealRef.current = true;

    const titleEl = heroTitleRef.current;
    const tl = gsap.timeline();

    tl.set(titleEl, { opacity: 0, scale: 1.36, filter: 'blur(10px)' }).to(titleEl, {
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
      duration: 0.8,
      ease: 'power3.out',
    });

    return () => {
      tl.kill();
      gsap.set(titleEl, { clearProps: 'opacity,scale,filter' });
    };
  }, [isMainVisible]);

  useEffect(() => {

    return () => {
      if (scrollUnlockTimerRef.current) {
        window.clearTimeout(scrollUnlockTimerRef.current);
      }
      if (autoScrambleTimerRef.current) {
        window.clearTimeout(autoScrambleTimerRef.current);
      }
      if (hideDetailsTimerRef.current) {
        window.clearTimeout(hideDetailsTimerRef.current);
      }
      if (subtitleTypingTimerRef.current) {
        window.clearTimeout(subtitleTypingTimerRef.current);
      }
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

  const startScramble = () => {
    if (isScramblingRef.current) return;
    isScramblingRef.current = true;
    setScrambleKey((prev) => prev + 1);
  };

  const handleTitlePointerEnter = () => {
    pointerInsideRef.current = true;
    setHovered(true);
  };

  const handleTitlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointerInsideRef.current) return;
    if (event.pointerType !== 'mouse') return;
    if (isScrollLockedRef.current) return;
    if (event.movementX === 0 && event.movementY === 0) return;
    if (hasCompletedPrimaryScrambleRef.current && !showDetails) {
      revealDetails();
    }
    startScramble();
  };

  const handleTitleWheel = () => {
    isScrollLockedRef.current = true;
    if (scrollUnlockTimerRef.current) {
      window.clearTimeout(scrollUnlockTimerRef.current);
    }
    scrollUnlockTimerRef.current = window.setTimeout(() => {
      isScrollLockedRef.current = false;
      scrollUnlockTimerRef.current = null;
    }, 180);
  };

  const handleScrambleComplete = useCallback(() => {
    isScramblingRef.current = false;
    hasCompletedPrimaryScrambleRef.current = true;
    revealDetails();
  }, [revealDetails]);

  useEffect(() => {
    if (!isProjectCardVisible) return;
    setShowDetails(false);
    if (hideDetailsTimerRef.current) {
      window.clearTimeout(hideDetailsTimerRef.current);
      hideDetailsTimerRef.current = null;
    }
  }, [isProjectCardVisible]);

  useEffect(() => {
    if (subtitleTypingTimerRef.current) {
      window.clearTimeout(subtitleTypingTimerRef.current);
      subtitleTypingTimerRef.current = null;
    }

    if (!showDetails) {
      setTypedSubtitle('');
      return;
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

      const cinematicDelay = 58 + Math.random() * 48;
      subtitleTypingTimerRef.current = window.setTimeout(typeNext, cinematicDelay);
    };

    subtitleTypingTimerRef.current = window.setTimeout(typeNext, 260);

    return () => {
      if (subtitleTypingTimerRef.current) {
        window.clearTimeout(subtitleTypingTimerRef.current);
        subtitleTypingTimerRef.current = null;
      }
    };
  }, [showDetails, subtitleText]);

  const handleTitlePointerLeave = () => {
    pointerInsideRef.current = false;
    setHovered(false);
  };

  return (
    <section className="hero-section" id="inicio">
      <motion.div
        className="hero-title-wrapper"
        initial={{ opacity: 0, filter: 'blur(6px)' }}
        animate={{ opacity: isVideoHovering ? 0 : 1, filter: isVideoHovering ? 'blur(6px)' : 'blur(0px)' }}
        style={{ pointerEvents: isVideoHovering ? 'none' : 'auto' }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        onPointerEnter={handleTitlePointerEnter}
        onPointerMove={handleTitlePointerMove}
        onPointerLeave={handleTitlePointerLeave}
        onWheel={handleTitleWheel}
      >
        <h1 ref={heroTitleRef} className={`hero-title ${hovered ? 'is-glow' : ''}`}>
          <span className="hero-title-measure" aria-hidden="true">FJR.</span>
          <span className="hero-title-live">
            <TextScramble
              as="span"
              triggerKey={scrambleKey}
              duration={3}
              speed={0.045}
              onScrambleComplete={handleScrambleComplete}
            >
              FJR.
            </TextScramble>
          </span>
        </h1>

        <div className="hero-subtitle-reveal">
          <AnimatePresence mode="wait">
            {showDetails && (
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
      </motion.div>

      <AnimatePresence>
        {showDetails && (
          <motion.div
            className="social-icons"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 1, ease: 'easeInOut' }}
          >
            <a
              href="https://github.com/fjrsonn"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
            >
              <FaGithub />
            </a>
            <a
              href="https://www.linkedin.com/in/flaviojuniorls"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
            >
              <FaLinkedin />
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
