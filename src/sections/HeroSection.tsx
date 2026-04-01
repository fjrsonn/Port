import { useState } from 'react';
import { motion } from 'framer-motion';
import { TextScramble } from '../components/TextScramble';

type HeroSectionProps = {
  hidden?: boolean;
};

export function HeroSection({ hidden = false }: HeroSectionProps) {
  const [hovered, setHovered] = useState(false);
  const [scrambleKey, setScrambleKey] = useState(0);

  const onEnter = () => {
    setHovered(true);
    setScrambleKey((prev) => prev + 1);
  };

  return (
    <section className="hero-section" id="inicio">
      <motion.div
        className={`hero-title-wrapper ${hidden ? 'hero-title-wrapper-hidden' : ''}`}
        initial={{ opacity: 0, filter: 'blur(6px)' }}
        animate={{ opacity: 1, filter: 'blur(0px)' }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        onMouseEnter={onEnter}
        onMouseLeave={() => setHovered(false)}
      >
        <h1 className={`hero-title ${hovered ? 'is-glow' : ''}`}>
          <TextScramble as="span" triggerKey={scrambleKey} duration={3} speed={0.045}>
            FJR.
          </TextScramble>
        </h1>
      </motion.div>
    </section>
  );
}
