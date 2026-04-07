import SliderOriginal from '../components/SliderOriginal';

type ProjectsSliderSectionProps = {
  isMainVisible?: boolean;
};

export function ProjectsSliderSection({
  isMainVisible = true,
}: ProjectsSliderSectionProps) {
  return (
    <section className="projects-slider-section" id="projects" aria-label="Projetos">
      {isMainVisible && <SliderOriginal />}
    </section>
  );
}