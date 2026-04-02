import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { motion } from 'framer-motion';
import { TextScramble } from '../components/TextScramble';

type HeroSectionProps = {
  videoUnderTitleProgress?: number;
  isVideoHovering?: boolean;
};

export function HeroSection({ videoUnderTitleProgress = 0, isVideoHovering = false }: HeroSectionProps) {
  const [hovered, setHovered] = useState(false);
  const isScramblingRef = useRef(false);
  const pointerInsideRef = useRef(false);
  const isScrollLockedRef = useRef(false);
  const scrollUnlockTimerRef = useRef<number | null>(null);
  const [scrambleKey, setScrambleKey] = useState(0);
  const channelValue = Math.round(255 * (1 - Math.max(0, Math.min(1, videoUnderTitleProgress))));
  const dynamicColor = `rgb(${channelValue}, ${channelValue}, ${channelValue})`;

  useEffect(() => {
    return () => {
      if (scrollUnlockTimerRef.current) {
        window.clearTimeout(scrollUnlockTimerRef.current);
      }
    };
  }, []);

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
  }, []);

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
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        onPointerEnter={handleTitlePointerEnter}
        onPointerMove={handleTitlePointerMove}
        onPointerLeave={handleTitlePointerLeave}
        onWheel={handleTitleWheel}
      >
        <h1 className={`hero-title ${hovered ? 'is-glow' : ''}`} style={{ color: dynamicColor }}>
          <TextScramble
            as="span"
            triggerKey={scrambleKey}
            duration={3}
            speed={0.045}
            onScrambleComplete={handleScrambleComplete}
          >
            FJR.
          </TextScramble>
        </h1>
      </motion.div>
    </section>
  );
}