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

type SliderEvents = {
  move: 'touchmove' | 'mousemove';
  up: 'touchend' | 'mouseup';
  down: 'touchstart' | 'mousedown';
};

type SliderItem = {
  el: HTMLElement;
  img: HTMLImageElement | null;
  left: number;
  right: number;
  width: number;
  min: number;
  max: number;
  out: boolean;
};

type SliderState = {
  target: number;
  current: number;
  currentRounded: number;
  diff: number;
  on: { x: number; y: number };
  off: number;
  progress: number;
  max: number;
  min: number;
  flags: { dragging: boolean; resize?: boolean };
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
  el: HTMLElement;
  opts: SliderOptions;
  state: SliderState;
  items: SliderItem[];
  titles: HTMLElement[];
  events: SliderEvents;
  tl?: gsap.core.Timeline;

  constructor(root: HTMLElement, el: HTMLElement, opts: Partial<SliderOptions> = {}) {
    this.root = root;
    this.el = el;
    this.opts = Object.assign({ speed: 2, threshold: 50, ease: 0.075 }, opts);

    this.state = {
      target: 0,
      current: 0,
      currentRounded: 0,
      diff: 0,
      on: { x: 0, y: 0 },
      off: 0,
      progress: 0,
      max: 0,
      min: 0,
      flags: { dragging: false },
    };

    this.items = [];
    this.titles = Array.from(this.root.querySelectorAll('.js-title')) as HTMLElement[];

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
    const slideEls = Array.from(this.el.querySelectorAll('.js-slide')) as HTMLElement[];
    if (!slideEls.length) return;

    this.items = [];

    const ww = this.root.clientWidth;
    const { width: wrapWidth, left: wrapDiff } = this.el.getBoundingClientRect();
    this.state.max = -(slideEls[slideEls.length - 1].getBoundingClientRect().right - wrapWidth - wrapDiff);
    this.state.min = 0;

    this.tl?.kill();
    this.tl = gsap
      .timeline({ paused: true, defaults: { duration: 1, ease: 'linear' } })
      .fromTo(this.root.querySelector('.js-progress-line-2'), { scaleX: 1 }, { scaleX: 0, duration: 0.5, ease: 'power3' }, 0)
      .fromTo(this.root.querySelector('.js-titles'), { yPercent: 0 }, { yPercent: -(100 - 100 / this.titles.length) }, 0)
      .fromTo(this.root.querySelectorAll('.js-progress-line'), { scaleX: 0 }, { scaleX: 1 }, 0);

    slideEls.forEach((slide) => {
      const { left, right, width } = slide.getBoundingClientRect();
      this.items.push({
        el: slide,
        img: slide.querySelector('img'),
        left,
        right,
        width,
        min: left < ww ? ww * 0.775 : -(ww * 0.225 - wrapWidth * 0.2),
        max: left > ww ? this.state.max - ww * 0.775 : this.state.max + (ww * 0.225 - wrapWidth * 0.2),
        out: false,
      });
    });
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
    this.state.flags.resize = true;
    this.setup();
    this.state.flags.resize = false;
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

  calc(): void {
    const state = this.state;
    state.current += (state.target - state.current) * this.opts.ease;
    state.currentRounded = Math.round(state.current * 100) / 100;
    state.diff = (state.target - state.current) * 0.0005;
    state.progress = gsap.utils.wrap(0, 1, state.currentRounded / (state.max || -1));

    this.tl?.progress(state.progress);
  }

  isVisible(item: SliderItem): { translate: number; isVisible: boolean; progress: number } {
    const ww = this.root.clientWidth;
    const translate = this.state.currentRounded;
    const start = item.left + translate;
    const end = item.right + translate;
    const isVisible = start < this.opts.threshold + ww && end > -this.opts.threshold;
    const progress = gsap.utils.clamp(0, 1, 1 - (translate + item.left + item.width) / (ww + item.width));

    return { translate, isVisible, progress };
  }

  transformItems(): void {
    this.items.forEach((item) => {
      const { translate, isVisible, progress } = this.isVisible(item);
      gsap.set(item.el, { x: translate });

      if (item.img) {
        const velocity = this.state.diff * 17000;
        const scale = 0.9 + progress * 0.1;
        const blur = Math.min(2.2, Math.abs(this.state.diff) * 1500);

        gsap.set(item.img, {
          xPercent: velocity,
          scale,
          filter: `blur(${blur}px) saturate(${1 + progress * 0.2})`,
          transformOrigin: 'center center',
        });
      }

      if (isVisible || this.state.flags.resize) {
        item.out = false;
      } else if (!item.out) {
        item.out = true;
      }
    });
  }

  render(): void {
    this.calc();
    this.transformItems();
  }

  destroy(): void {
    this.off();
    this.tl?.kill();
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

    const tick = () => {
      sliderInstanceRef.current?.render();
    };

    const startSlider = () => {
      if (sliderInstanceRef.current) return;
      sliderInstanceRef.current = new Slider(sectionEl, sliderEl);
      gsap.ticker.add(tick);
      setHasStarted(true);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isVisible = entry.isIntersecting && entry.intersectionRatio > 0.25;
        onCardInViewChange?.(isVisible);
        if (isVisible) startSlider();
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
