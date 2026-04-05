import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

type ProjectsSectionProps = {
  onVideoHoverChange?: (isHoveringVideo: boolean) => void;
  onCardInViewChange?: (isCardInView: boolean) => void;
};

type SliderOptions = {
  speed: number;
  threshold: number;
  ease: number;
};

type SliderState = {
  target: number;
  current: number;
  currentRounded: number;
  on: { x: number; y: number };
  off: number;
  progress: number;
  max: number;
  min: number;
  flags: { dragging: boolean };
};

type SliderEvents = {
  move: 'touchmove' | 'mousemove';
  up: 'touchend' | 'mouseup';
  down: 'touchstart' | 'mousedown';
};

const sliderData = [
  { id: '1', title: 'Moonrocket', image: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex1.jpg' },
  { id: '2', title: 'Spaceman', image: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex2.jpg' },
  { id: '3', title: 'Moonrocket', image: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex1.jpg' },
  { id: '4', title: 'Spaceman', image: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex2.jpg' },
  { id: '5', title: 'Moonrocket', image: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex1.jpg' },
  { id: '6', title: 'Spaceman', image: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex2.jpg' },
  { id: '7', title: 'Moonrocket', image: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex1.jpg' },
  { id: '8', title: 'Spaceman', image: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex2.jpg' },
];

class Slider {
  root: HTMLElement;
  el: Element;
  opts: SliderOptions;
  state: SliderState;
  items: HTMLElement[];
  titles: HTMLElement[];
  progressLines: HTMLElement[];
  events: SliderEvents;

  constructor(root: HTMLElement, el: Element, opts: Partial<SliderOptions> = {}) {
    this.root = root;
    this.el = el;
    this.opts = Object.assign({ speed: 2, threshold: 50, ease: 0.075 }, opts);

    this.state = {
      target: 0,
      current: 0,
      currentRounded: 0,
      on: { x: 0, y: 0 },
      off: 0,
      progress: 0,
      max: 0,
      min: 0,
      flags: { dragging: false },
    };

    this.items = Array.from(this.el.querySelectorAll('.js-slide')) as HTMLElement[];
    this.titles = Array.from(this.root.querySelectorAll('.js-title')) as HTMLElement[];
    this.progressLines = Array.from(this.root.querySelectorAll('.js-progress-line')) as HTMLElement[];

    const isDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(navigator.userAgent);
    this.events = {
      move: isDevice ? 'touchmove' : 'mousemove',
      up: isDevice ? 'touchend' : 'mouseup',
      down: isDevice ? 'touchstart' : 'mousedown',
    };

    this.bindAll();
    this.setup();
    this.on();
  }

  bindAll(): void {
    this.onDown = this.onDown.bind(this);
    this.onMove = this.onMove.bind(this);
    this.onUp = this.onUp.bind(this);
    this.onResize = this.onResize.bind(this);
  }

  setup(): void {
    const wrapRect = this.el.getBoundingClientRect();
    const lastRect = this.items[this.items.length - 1].getBoundingClientRect();
    this.state.max = -(lastRect.right - wrapRect.width - wrapRect.left);
    this.state.min = 0;
  }

  on(): void {
    const { move, up, down } = this.events;
    window.addEventListener(down, this.onDown as EventListener);
    window.addEventListener(move, this.onMove as EventListener, { passive: false });
    window.addEventListener(up, this.onUp as EventListener);
    window.addEventListener('resize', this.onResize);
  }

  off(): void {
    const { move, up, down } = this.events;
    window.removeEventListener(down, this.onDown as EventListener);
    window.removeEventListener(move, this.onMove as EventListener);
    window.removeEventListener(up, this.onUp as EventListener);
    window.removeEventListener('resize', this.onResize);
  }

  onResize(): void {
    this.setup();
  }

  getPos(e: TouchEvent | MouseEvent): { x: number; y: number } {
    if ('changedTouches' in e && e.changedTouches.length) {
      return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    }

    if ('clientX' in e) {
      return { x: e.clientX, y: e.clientY };
    }

    return { x: 0, y: 0 };
  }

  onDown(e: TouchEvent | MouseEvent): void {
    const { x, y } = this.getPos(e);
    const rect = this.root.getBoundingClientRect();
    if (y < rect.top || y > rect.bottom) return;

    this.state.flags.dragging = true;
    this.state.on.x = x;
    this.state.on.y = y;
  }

  onUp(): void {
    this.state.flags.dragging = false;
    this.state.off = this.state.target;
  }

  onMove(e: TouchEvent | MouseEvent): void {
    if (!this.state.flags.dragging) return;

    const { x, y } = this.getPos(e);
    const moveX = x - this.state.on.x;
    const moveY = y - this.state.on.y;

    if (Math.abs(moveX) > Math.abs(moveY) && e.cancelable) {
      e.preventDefault();
      e.stopPropagation();
    }

    this.state.target = gsap.utils.clamp(this.state.max, 0, this.state.off + moveX * this.opts.speed);
  }

  render(): void {
    const state = this.state;
    state.current += (state.target - state.current) * this.opts.ease;
    state.currentRounded = Math.round(state.current * 100) / 100;

    gsap.set(this.items, { x: state.currentRounded });

    const normalized = Math.abs(state.currentRounded / (state.max || 1));
    state.progress = gsap.utils.clamp(0, 1, normalized);

    const titlesWrap = this.root.querySelector('.js-titles');
    if (titlesWrap) {
      gsap.set(titlesWrap, { yPercent: -(100 - 100 / this.titles.length) * state.progress });
    }

    if (this.progressLines[0]) {
      gsap.set(this.progressLines[0], { scaleX: state.progress, transformOrigin: 'left center' });
    }
    if (this.progressLines[1]) {
      gsap.set(this.progressLines[1], { scaleX: 1 - state.progress, transformOrigin: 'right center' });
    }
  }

  destroy(): void {
    this.off();
  }
}

export function ProjectsSection({ onVideoHoverChange, onCardInViewChange }: ProjectsSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const sliderInstanceRef = useRef<Slider | null>(null);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    onVideoHoverChange?.(false);
  }, [onVideoHoverChange]);

  useEffect(() => {
    const sectionEl = sectionRef.current;
    const sliderEl = sliderRef.current;
    if (!sectionEl || !sliderEl) return;

    const startSlider = () => {
      if (sliderInstanceRef.current) return;
      sliderInstanceRef.current = new Slider(sectionEl, sliderEl);
      gsap.ticker.add(tick);
      setHasStarted(true);
    };

    const tick = () => {
      sliderInstanceRef.current?.render();
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isVisible = entry.isIntersecting && entry.intersectionRatio > 0.25;
        onCardInViewChange?.(isVisible);
        if (isVisible) {
          startSlider();
        }
      },
      { threshold: [0, 0.25, 0.5, 1] },
    );

    observer.observe(sectionEl);

    return () => {
      observer.disconnect();
      onCardInViewChange?.(false);
      gsap.ticker.remove(tick);
      sliderInstanceRef.current?.destroy();
      sliderInstanceRef.current = null;
    };
  }, [onCardInViewChange]);

  return (
    <section id="projetos" className={`projects-section ${hasStarted ? 'is-ready' : ''}`} ref={sectionRef}>
      <div className="slider js-drag-area">
        <div className="slider__inner js-slider" ref={sliderRef}>
          {sliderData.map((item, index) => (
            <div key={item.id} className="slide js-slide" style={index === 0 ? undefined : { left: `${index * 120}%` }}>
              <div className="slide__inner js-slide__inner">
                <img className="js-slide__img" src={item.image} alt={item.title} crossOrigin="anonymous" draggable={false} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="titles">
        <div className="titles__title titles__title--proxy">Lorem ipsum</div>
        <div className="titles__list js-titles">
          {sliderData.map((item) => (
            <div key={`title-${item.id}`} className="titles__title js-title">
              {item.title}
            </div>
          ))}
          <div className="titles__title js-title">Moonrocket</div>
        </div>
      </div>

      <div className="progress">
        <div className="progress__line js-progress-line" />
        <div className="progress__line js-progress-line-2 js-progress-line" />
      </div>
    </section>
  );
}
