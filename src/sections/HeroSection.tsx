import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TextScramble } from '../components/TextScramble';

export function HeroSection() {
  const [introVisible, setIntroVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [scrambleKey, setScrambleKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setIntroVisible(true), 250);
    return () => window.clearTimeout(timer);
  }, []);

  const onEnter = () => {
    setHovered(true);
    setScrambleKey((prev) => prev + 1);
  };

  return (
    <section className="hero-section" id="inicio">
      <motion.div
        className="hero-title-wrapper"
        initial={{ opacity: 0, y: 8, filter: 'blur(5px)' }}
        animate={{ opacity: introVisible ? 1 : 0, y: introVisible ? 0 : 8, filter: 'blur(0px)' }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        onMouseEnter={onEnter}
        onMouseLeave={() => setHovered(false)}
      >
        <h1 className={`hero-title ${hovered ? 'is-glow' : ''}`}>
          <TextScramble key={scrambleKey} as="span" trigger={hovered} duration={0.65} speed={0.035}>
            FJR.
          </TextScramble>
        </h1>
      </motion.div>
    </section>
  );
}
