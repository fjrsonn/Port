import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { TextScramble } from '../components/TextScramble';

type HeroSectionProps = {
  videoUnderTitleProgress?: number;
  isVideoHovering?: boolean;
};

export function HeroSection({ videoUnderTitleProgress = 0, isVideoHovering = false }: HeroSectionProps) {
  const [hovered, setHovered] = useState(false);
  const isScramblingRef = useRef(false);
  const [scrambleKey, setScrambleKey] = useState(0);
  const channelValue = Math.round(255 * (1 - Math.max(0, Math.min(1, videoUnderTitleProgress))));
  const dynamicColor = `rgb(${channelValue}, ${channelValue}, ${channelValue})`;

  const handleTitleMouseEnter = () => {
    if (!isScramblingRef.current) {
      isScramblingRef.current = true;
      setScrambleKey((prev) => prev + 1);
    }
    setHovered(true);
  };

  const handleTitleMouseLeave = () => {
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
        onMouseEnter={handleTitleMouseEnter}
        onMouseLeave={handleTitleMouseLeave}
      >
        <h1 className={`hero-title ${hovered ? 'is-glow' : ''}`} style={{ color: dynamicColor }}>
          <TextScramble
            as="span"
            triggerKey={scrambleKey}
            duration={3}
            speed={0.045}
            onScrambleComplete={() => {
              isScramblingRef.current = false;
            }}
          >
            FJR.
          </TextScramble>
        </h1>
      </motion.div>
    </section>
  );
}
