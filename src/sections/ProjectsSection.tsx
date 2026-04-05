import { useEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

type ProjectsSectionProps = {
  onVideoHoverChange?: (isHoveringVideo: boolean) => void;
  onCardInViewChange?: (isCardInView: boolean) => void;
};

type SlideItem = {
  image: string;
  title: string;
};

const slides: SlideItem[] = [
  { image: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex1.jpg', title: 'Moonrocket' },
  { image: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex2.jpg', title: 'Spaceman' },
  { image: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex1.jpg', title: 'Moonrocket' },
  { image: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex2.jpg', title: 'Spaceman' },
  { image: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex1.jpg', title: 'Moonrocket' },
  { image: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex2.jpg', title: 'Spaceman' },
  { image: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex1.jpg', title: 'Moonrocket' },
  { image: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex2.jpg', title: 'Spaceman' },
];

export function ProjectsSection({ onVideoHoverChange, onCardInViewChange }: ProjectsSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const sliderAreaRef = useRef<HTMLDivElement>(null);
  const sliderInnerRef = useRef<HTMLDivElement>(null);
  const titlesRef = useRef<HTMLDivElement>(null);
  const titleItemRef = useRef<HTMLDivElement>(null);
  const progressLineRef = useRef<HTMLDivElement>(null);
  const progressLine2Ref = useRef<HTMLDivElement>(null);

  const dragStateRef = useRef({
    dragging: false,
    startX: 0,
    off: 0,
    target: 0,
    current: 0,
    max: 0,
  });

  const titleRange = useMemo(() => Math.max(0, slides.length - 1), []);

  useEffect(() => {
    onVideoHoverChange?.(false);
  }, [onVideoHoverChange]);

  useEffect(() => {
    const sectionEl = sectionRef.current;
    if (!sectionEl) return;

    const visibilityTrigger = ScrollTrigger.create({
      trigger: sectionEl,
      start: 'top bottom',
      end: 'bottom top',
      onEnter: () => onCardInViewChange?.(true),
      onEnterBack: () => onCardInViewChange?.(true),
      onLeave: () => onCardInViewChange?.(false),
      onLeaveBack: () => onCardInViewChange?.(false),
    });

    return () => {
      visibilityTrigger.kill();
      onCardInViewChange?.(false);
    };
  }, [onCardInViewChange]);

  useEffect(() => {
    const area = sliderAreaRef.current;
    const sliderInner = sliderInnerRef.current;
    const titlesList = titlesRef.current;
    const titleItem = titleItemRef.current;
    const progressLine = progressLineRef.current;
    const progressLine2 = progressLine2Ref.current;
    if (!area || !sliderInner || !titlesList || !titleItem || !progressLine || !progressLine2) return;

    const state = dragStateRef.current;

    const setBoundaries = () => {
      const dist = sliderInner.scrollWidth - area.clientWidth;
      state.max = -Math.max(0, dist);
      state.target = gsap.utils.clamp(state.max, 0, state.target);
      state.current = gsap.utils.clamp(state.max, 0, state.current);
      state.off = gsap.utils.clamp(state.max, 0, state.off);
    };

    const update = () => {
      state.current += (state.target - state.current) * 0.075;
      const progress = state.max === 0 ? 0 : gsap.utils.clamp(0, 1, state.current / state.max);
      const titleOffset = -(titleItem.offsetHeight * titleRange * progress);

      gsap.set(sliderInner, { x: state.current });
      gsap.set(titlesList, { y: titleOffset });
      gsap.set(progressLine, { scaleX: progress, transformOrigin: 'left center' });
      gsap.set(progressLine2, { scaleX: 1 - progress, transformOrigin: 'right center' });
    };

    const onDown = (event: PointerEvent) => {
      state.dragging = true;
      state.startX = event.clientX;
      area.setPointerCapture(event.pointerId);
      area.style.cursor = 'grabbing';
    };

    const onMove = (event: PointerEvent) => {
      if (!state.dragging) return;
      const moveX = event.clientX - state.startX;
      state.target = gsap.utils.clamp(state.max, 0, state.off + moveX * 2);
    };

    const onUp = (event: PointerEvent) => {
      if (!state.dragging) return;
      state.dragging = false;
      state.off = state.target;
      area.releasePointerCapture(event.pointerId);
      area.style.cursor = 'grab';
    };

    setBoundaries();
    update();

    gsap.ticker.add(update);
    area.addEventListener('pointerdown', onDown);
    area.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('resize', setBoundaries);

    return () => {
      gsap.ticker.remove(update);
      area.removeEventListener('pointerdown', onDown);
      area.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('resize', setBoundaries);
    };
  }, [titleRange]);

  return (
    <section id="projetos" className="projects-section" ref={sectionRef}>
      <header className="head">
        <a href="https://codepen.io/ReGGae/live/povjKxV" target="_blank" rel="noreferrer" data-txt="fullscreen is best">
          <div>fullscreen is best</div>
        </a>
        <div>
          <a href="https://twitter.com/Jesper_Landberg" target="_blank" rel="noreferrer" data-txt="about">
            <div>about</div>
          </a>
          <a href="https://twitter.com/Jesper_Landberg" target="_blank" rel="noreferrer" data-txt="contact">
            <div>contact</div>
          </a>
        </div>
      </header>

      <div className="slider js-drag-area" ref={sliderAreaRef}>
        <div className="slider__inner js-slider" ref={sliderInnerRef}>
          {slides.map((slide, index) => (
            <div key={`${slide.title}-${index}`} className="slide js-slide" style={index === 0 ? undefined : { left: `${index * 120}%` }}>
              <div className="slide__inner js-slide__inner">
                <img className="js-slide__img" src={slide.image} alt={slide.title} crossOrigin="anonymous" draggable={false} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="titles">
        <div className="titles__title titles__title--proxy">Lorem ipsum</div>
        <div className="titles__list js-titles" ref={titlesRef}>
          {slides.map((slide, index) => (
            <div
              key={`${slide.title}-label-${index}`}
              className="titles__title js-title"
              ref={index === 0 ? titleItemRef : undefined}
            >
              {slide.title}
            </div>
          ))}
        </div>
      </div>

      <div className="progress">
        <div className="progress__line js-progress-line" ref={progressLineRef} />
        <div className="progress__line js-progress-line-2" ref={progressLine2Ref} />
      </div>
    </section>
  );
}
