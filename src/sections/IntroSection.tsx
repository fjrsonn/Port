import { useLayoutEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';

type IntroSectionProps = {
  visible: boolean;
};

export function IntroSection({ visible }: IntroSectionProps) {
  const introTitleRef = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    if (!visible || !introTitleRef.current) return;

    const titleEl = introTitleRef.current;
    const tl = gsap.timeline();

    tl.set(titleEl, { opacity: 0, scale: 0.82, filter: 'blur(10px)' })
      .to(titleEl, {
        opacity: 1,
        scale: 1,
        filter: 'blur(0px)',
        duration: 0.9,
        ease: 'power3.out',
      })
      .to({}, { duration: 1.1 })
      .to(titleEl, {
        opacity: 0,
        scale: 0.96,
        filter: 'blur(6px)',
        duration: 0.9,
        ease: 'power2.inOut',
      });

    return () => {
      tl.kill();
    };
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.section
          className="intro-screen"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        >
          <h1
            ref={introTitleRef}
            className="intro-title"
          >
            Flavio Junior
          </h1>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
