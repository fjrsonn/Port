import { useState } from 'react';
import { motion } from 'framer-motion';
import { TextScramble } from '../components/TextScramble';

type HeroSectionProps = {
  isVideoHovering?: boolean;
};

export function HeroSection({ isVideoHovering = false }: HeroSectionProps) {
  const [hovered, setHovered] = useState(false);
  const [scrambleKey, setScrambleKey] = useState(0);

  const handleTitleMouseEnter = () => {
    if (!hovered) {
      setScrambleKey((prev) => prev + 1);
    }
    setHovered(true);
  };

  const handleTitleMouseLeave = () => {
    setHovered(false);
  };

  const onScrambleComplete = () => {
    if (hovered) {
      setScrambleKey((prev) => prev + 1);
    }
  };

  return (
    <section className="hero-section" id="inicio">
      <motion.div
        className="hero-title-wrapper"
        initial={{ opacity: 0, filter: 'blur(6px)' }}
        animate={{ opacity: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        onMouseEnter={handleTitleMouseEnter}
        onMouseLeave={handleTitleMouseLeave}
      >
        <h1 className={`hero-title ${hovered ? 'is-glow' : ''} ${isVideoHovering ? 'is-video-hovering' : ''}`}>
          <TextScramble as="span" triggerKey={scrambleKey} duration={3} speed={0.045} isActive={hovered} onScrambleComplete={onScrambleComplete}>
            FJR.
          </TextScramble>
        </h1>
      </motion.div>
    </section>
  );
}
