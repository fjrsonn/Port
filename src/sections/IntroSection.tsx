import { motion, AnimatePresence } from 'framer-motion';

type IntroSectionProps = {
  visible: boolean;
};

export function IntroSection({ visible }: IntroSectionProps) {
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
          <motion.h1
            className="intro-title"
            initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 1, delay: 2 }}
          >
            Flavio Junior
          </motion.h1>
        </motion.section>
      )}
    </AnimatePresence>
  );
}