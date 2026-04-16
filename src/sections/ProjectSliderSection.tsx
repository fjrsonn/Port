import SliderOriginal from '../components/SliderOriginal';

type ProjectSliderSectionProps = {
  isMainVisible?: boolean;
  onReachEnd?: () => void;
  onReachStart?: () => void;
};

export function ProjectSliderSection({
  isMainVisible = true,
  onReachEnd,
  onReachStart,
}: ProjectSliderSectionProps) {
  return (
    <section className="projects-slider-section" id="projects" aria-label="Projetos">
      {isMainVisible && <SliderOriginal onReachEnd={onReachEnd} onReachStart={onReachStart} />}
    </section>
  );
}
