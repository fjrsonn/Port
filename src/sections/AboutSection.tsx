import { motion } from 'framer-motion';

export function AboutSection() {
  return (
    <section className="about-section" id="apresentacao">
      <motion.div
        className="about-content"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      >
        <p className="about-kicker">Apresentação</p>
        <h2>Minha história</h2>
        <p>
          Sou Flavio Junior. Este espaço foi criado para apresentar minha jornada como desenvolvedor,
          projetos que unem design e tecnologia, e a evolução constante na construção de experiências
          digitais modernas.
        </p>
      </motion.div>
    </section>
  );
}
