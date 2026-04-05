import { useEffect, useRef } from 'react';
import gsap from 'gsap';

declare global {
  interface Window {
    THREE: any;
  }
}

type SliderOptions = {
  speed: number;
  threshold: number;
  ease: number;
};

type SliderItem = {
  el: Element;
  plane: Plane;
  left: number;
  right: number;
  width: number;
  min: number;
  max: number;
  tl: gsap.core.Timeline;
  out: boolean;
};

type SliderState = {
  target: number;
  current: number;
  currentRounded: number;
  y: number;
  on: {
    x: number;
    y: number;
  };
  off: number;
  progress: number;
  diff: number;
  max: number;
  min: number;
  snap: {
    points: number[];
  };
  flags: {
    dragging: boolean;
    resize?: boolean;
  };
};

type SliderEvents = {
  move: 'touchmove' | 'mousemove';
  up: 'touchend' | 'mouseup';
  down: 'touchstart' | 'mousedown';
};

type Store = {
  ww: number;
  wh: number;
  isDevice: boolean;
};

type ProjectsSectionProps = {
  onVideoHoverChange?: (isHoveringVideo: boolean) => void;
  onCardInViewChange?: (isCardInView: boolean) => void;
};

const backgroundCoverUv = `
vec2 backgroundCoverUv(vec2 screenSize, vec2 imageSize, vec2 uv) {
  float screenRatio = screenSize.x / screenSize.y;
  float imageRatio = imageSize.x / imageSize.y;

  vec2 newSize = screenRatio < imageRatio
      ? vec2(imageSize.x * screenSize.y / imageSize.y, screenSize.y)
      : vec2(screenSize.x, imageSize.y * screenSize.x / imageSize.x);

  vec2 newOffset = (screenRatio < imageRatio
      ? vec2((newSize.x - screenSize.x) / 2.0, 0.0)
      : vec2(0.0, (newSize.y - screenSize.y) / 2.0)) / newSize;

  return uv * screenSize / newSize + newOffset;
}
`;

const vertexShader = `
precision mediump float;

uniform float uVelo;

varying vec2 vUv;

#define M_PI 3.1415926535897932384626433832795

void main(){
  vec3 pos = position;
  pos.x = pos.x + ((sin(uv.y * M_PI) * uVelo) * 0.125);

  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.);
}
`;

const fragmentShader = `
precision mediump float;

${backgroundCoverUv}

uniform sampler2D uTexture;

uniform vec2 uMeshSize;
uniform vec2 uImageSize;

uniform float uVelo;
uniform float uScale;

varying vec2 vUv;

void main() {
  vec2 uv = vUv;

  vec2 texCenter = vec2(0.5);
  vec2 texUv = backgroundCoverUv(uMeshSize, uImageSize, uv);
  vec2 texScale = (texUv - texCenter) * uScale + texCenter;
  vec4 texture = texture2D(uTexture, texScale);

  texScale.x += 0.15 * uVelo;
  if(uv.x < 1.) texture.g = texture2D(uTexture, texScale).g;

  texScale.x += 0.10 * uVelo;
  if(uv.x < 1.) texture.b = texture2D(uTexture, texScale).b;

  gl_FragColor = texture;
}
`;

let gl: Gl | null = null;

const THREE = (window as any).THREE ?? null;
const loader = THREE ? new THREE.TextureLoader() : null;
if (loader) loader.crossOrigin = 'anonymous';

class Gl {
  scene: any;
  camera: any;
  renderer: any;
  store: Store;

  constructor(store: Store, parent: HTMLElement) {
    this.store = store;
    this.scene = new THREE.Scene();

    this.camera = new THREE.OrthographicCamera(
      store.ww / -2,
      store.ww / 2,
      store.wh / 2,
      store.wh / -2,
      1,
      10,
    );
    this.camera.lookAt(this.scene.position);
    this.camera.position.z = 1;

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.setSize(store.ww, store.wh);
    this.renderer.setClearColor(0xffffff, 0);

    const domEl = this.renderer.domElement;
    domEl.classList.add('dom-gl');
    parent.appendChild(domEl);
  }

  resize(): void {
    this.camera.left = this.store.ww / -2;
    this.camera.right = this.store.ww / 2;
    this.camera.top = this.store.wh / 2;
    this.camera.bottom = this.store.wh / -2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.store.ww, this.store.wh);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  destroy(): void {
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

class GlObject extends (window as any).THREE.Object3D {
  el!: HTMLElement;
  rect!: DOMRect;
  pos!: { x: number; y: number };
  store: Store;

  constructor(store: Store) {
    super();
    this.store = store;
  }

  init(el: HTMLElement): void {
    this.el = el;
    this.resize();
  }

  resize(): void {
    this.rect = this.el.getBoundingClientRect();
    const { left, top, width, height } = this.rect;

    this.pos = {
      x: left + width / 2 - this.store.ww / 2,
      y: top + height / 2 - this.store.wh / 2,
    };

    this.position.y = this.pos.y;
    this.position.x = this.pos.x;

    this.updateX();
  }

  updateX(current?: number): void {
    if (typeof current === 'number') {
      this.position.x = current + this.pos.x;
    }
  }
}

const planeGeo = new THREE.PlaneGeometry(1, 1, 32, 32);
const planeMat = new THREE.ShaderMaterial({
  transparent: true,
  fragmentShader,
  vertexShader,
});

class Plane extends GlObject {
  mat!: any;
  img!: HTMLImageElement;
  mesh!: any;

  init(el: HTMLElement): void {
    super.init(el);

    this.mat = planeMat.clone();

    this.mat.uniforms = {
      uTime: { value: 0 },
      uTexture: { value: 0 },
      uMeshSize: { value: new THREE.Vector2(this.rect.width, this.rect.height) },
      uImageSize: { value: new THREE.Vector2(0, 0) },
      uScale: { value: 0.75 },
      uVelo: { value: 0 },
    };

    this.img = this.el.querySelector('img') as HTMLImageElement;

    loader?.load(this.img.src, (texture: any) => {
      texture.minFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;

      this.mat.uniforms.uTexture.value = texture;
      this.mat.uniforms.uImageSize.value = [this.img.naturalWidth, this.img.naturalHeight];
    });

    this.mesh = new THREE.Mesh(planeGeo, this.mat);
    this.mesh.scale.set(this.rect.width, this.rect.height, 1);
    this.add(this.mesh);
    gl?.scene.add(this);
  }

  override resize(): void {
    super.resize();
    if (this.mesh) {
      this.mesh.scale.set(this.rect.width, this.rect.height, 1);
      this.mat.uniforms.uMeshSize.value = new THREE.Vector2(this.rect.width, this.rect.height);
    }
  }
}

class Slider {
  el: Element;
  opts: SliderOptions;
  ui: {
    items: NodeListOf<Element>;
    titles: NodeListOf<Element>;
    lines: NodeListOf<Element>;
  };
  state: SliderState;
  items: SliderItem[];
  events: SliderEvents;
  tl?: gsap.core.Timeline;
  store: Store;

  constructor(el: Element, store: Store, opts: Partial<SliderOptions> = {}) {
    this.bindAll();

    this.el = el;
    this.store = store;

    this.opts = Object.assign(
      {
        speed: 2,
        threshold: 50,
        ease: 0.075,
      },
      opts,
    );

    this.ui = {
      items: this.el.querySelectorAll('.js-slide'),
      titles: document.querySelectorAll('.js-title'),
      lines: document.querySelectorAll('.js-progress-line'),
    };

    this.state = {
      target: 0,
      current: 0,
      currentRounded: 0,
      y: 0,
      on: { x: 0, y: 0 },
      off: 0,
      progress: 0,
      diff: 0,
      max: 0,
      min: 0,
      snap: { points: [] },
      flags: { dragging: false },
    };

    this.items = [];

    this.events = {
      move: store.isDevice ? 'touchmove' : 'mousemove',
      up: store.isDevice ? 'touchend' : 'mouseup',
      down: store.isDevice ? 'touchstart' : 'mousedown',
    };

    this.init();
  }

  bindAll(): void {
    (['onDown', 'onMove', 'onUp'] as const).forEach((fn) => {
      (this as any)[fn] = (this as any)[fn].bind(this);
    });
  }

  init(): void {
    this.setup();
    this.on();
  }

  destroy(): void {
    this.off();
    this.tl?.kill();
    this.items.forEach((item) => item.tl.kill());
  }

  on(): void {
    const { move, up, down } = this.events;

    window.addEventListener(down, this.onDown as EventListener, { passive: false });
    window.addEventListener(move, this.onMove as EventListener, { passive: false });
    window.addEventListener(up, this.onUp as EventListener);
  }

  off(): void {
    const { move, up, down } = this.events;

    window.removeEventListener(down, this.onDown as EventListener);
    window.removeEventListener(move, this.onMove as EventListener);
    window.removeEventListener(up, this.onUp as EventListener);
  }

  setup(): void {
    const { ww } = this.store;
    const state = this.state;
    const { items, titles } = this.ui;

    this.items = [];

    const { width: wrapWidth, left: wrapDiff } = this.el.getBoundingClientRect();

    state.max = -(items[items.length - 1].getBoundingClientRect().right - wrapWidth - wrapDiff);
    state.min = 0;

    this.tl?.kill();
    this.tl = gsap
      .timeline({
        paused: true,
        defaults: { duration: 1, ease: 'linear' },
      })
      .fromTo('.js-progress-line-2', { scaleX: 1 }, { scaleX: 0, duration: 0.5, ease: 'power3' }, 0)
      .fromTo('.js-titles', { yPercent: 0 }, { yPercent: -(100 - 100 / titles.length) }, 0)
      .fromTo('.js-progress-line', { scaleX: 0 }, { scaleX: 1 }, 0);

    for (let i = 0; i < items.length; i += 1) {
      const el = items[i];
      const { left, right, width } = el.getBoundingClientRect();

      const plane = new Plane(this.store);
      plane.init(el as HTMLElement);

      const tl = gsap.timeline({ paused: true }).fromTo(
        plane.mat.uniforms.uScale,
        { value: 0.65 },
        { value: 1, duration: 1, ease: 'linear' },
      );

      this.items.push({
        el,
        plane,
        left,
        right,
        width,
        min: left < ww ? ww * 0.775 : -(ww * 0.225 - wrapWidth * 0.2),
        max: left > ww ? state.max - ww * 0.775 : state.max + (ww * 0.225 - wrapWidth * 0.2),
        tl,
        out: false,
      });
    }
  }

  resize(): void {
    this.state.flags.resize = true;
    this.setup();
    this.items.forEach((item) => item.plane.resize());
    this.state.flags.resize = false;
  }

  calc(): void {
    const state = this.state;
    state.current += (state.target - state.current) * this.opts.ease;
    state.currentRounded = Math.round(state.current * 100) / 100;
    state.diff = (state.target - state.current) * 0.0005;
    state.progress = gsap.utils.wrap(0, 1, state.currentRounded / state.max);

    this.tl?.progress(state.progress);
  }

  render(): void {
    this.clampTarget();
    this.calc();
    this.transformItems();
  }

  transformItems(): void {
    const { flags } = this.state;

    for (let i = 0; i < this.items.length; i += 1) {
      const item = this.items[i];
      const { translate, isVisible, progress } = this.isVisible(item);

      item.plane.updateX(translate);
      item.plane.mat.uniforms.uVelo.value = this.state.diff;

      if (!item.out) {
        item.tl.progress(progress);
      }

      if (isVisible || flags.resize) {
        item.out = false;
      } else if (!item.out) {
        item.out = true;
      }
    }
  }

  isVisible({ left, right, width, min, max }: { left: number; right: number; width: number; min: number; max: number }) {
    const { ww } = this.store;
    const { currentRounded } = this.state;
    const translate = gsap.utils.wrap(min, max, currentRounded);
    const threshold = this.opts.threshold;
    const start = left + translate;
    const end = right + translate;
    const isVisible = start < threshold + ww && end > -threshold;
    const progress = gsap.utils.clamp(0, 1, 1 - (translate + left + width) / (ww + width));

    return { translate, isVisible, progress };
  }

  clampTarget(): void {
    const state = this.state;
    state.target = gsap.utils.clamp(state.max, 0, state.target);
  }

  getPos(e: TouchEvent | MouseEvent): { x: number; y: number; target: EventTarget | null } {
    const touchEvent = 'changedTouches' in e && e.changedTouches.length ? e.changedTouches[0] : null;
    const x = touchEvent ? touchEvent.clientX : 'clientX' in e ? e.clientX : 0;
    const y = touchEvent ? touchEvent.clientY : 'clientY' in e ? e.clientY : 0;

    return { x, y, target: e.target };
  }

  onDown(e: TouchEvent | MouseEvent): void {
    const { x, y } = this.getPos(e);
    const { flags, on } = this.state;

    flags.dragging = true;
    on.x = x;
    on.y = y;
  }

  onUp(): void {
    const state = this.state;

    state.flags.dragging = false;
    state.off = state.target;
  }

  onMove(e: TouchEvent | MouseEvent): void {
    const { x, y } = this.getPos(e);
    const state = this.state;

    if (!state.flags.dragging) return;

    const { off, on } = state;
    const moveX = x - on.x;
    const moveY = y - on.y;

    if (Math.abs(moveX) > Math.abs(moveY) && e.cancelable) {
      e.preventDefault();
      e.stopPropagation();
    }

    state.target = off + moveX * this.opts.speed;
  }
}

const createStore = (): Store => ({
  ww: window.innerWidth,
  wh: window.innerHeight,
  isDevice:
    /Android/i.test(navigator.userAgent) ||
    /webOS/i.test(navigator.userAgent) ||
    /iPhone/i.test(navigator.userAgent) ||
    /iPad/i.test(navigator.userAgent) ||
    /iPod/i.test(navigator.userAgent) ||
    /BlackBerry/i.test(navigator.userAgent) ||
    /Windows Phone/i.test(navigator.userAgent),
});

export function ProjectsSection({ onVideoHoverChange, onCardInViewChange }: ProjectsSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    onVideoHoverChange?.(false);

    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        onCardInViewChange?.(entry.isIntersecting);
      },
      { threshold: 0.2 },
    );
    observer.observe(section);

    if (!THREE || !loader) {
      return () => {
        onCardInViewChange?.(false);
        observer.disconnect();
      };
    }

    const store = createStore();
    gl = new Gl(store, section);
    section.classList.add('is-webgl-ready');

    const sliderEl = section.querySelector('.js-slider');
    if (!sliderEl) {
      return () => {
        onCardInViewChange?.(false);
        observer.disconnect();
        section.classList.remove('is-webgl-ready');
        gl?.destroy();
        gl = null;
      };
    }

    const slider = new Slider(sliderEl, store);
    const tick = () => {
      gl?.render();
      slider.render();
    };

    gsap.ticker.add(tick);

    const onResize = () => {
      store.ww = window.innerWidth;
      store.wh = window.innerHeight;
      gl?.resize();
      slider.resize();
    };

    window.addEventListener('resize', onResize);

    return () => {
      onCardInViewChange?.(false);
      section.classList.remove('is-webgl-ready');
      window.removeEventListener('resize', onResize);
      observer.disconnect();
      gsap.ticker.remove(tick);
      slider.destroy();
      gl?.destroy();
      gl = null;
    };
  }, [onCardInViewChange, onVideoHoverChange]);

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

      <div className="slider js-drag-area">
        <div className="slider__inner js-slider">
          {[...Array(8)].map((_, index) => {
            const left = index === 0 ? undefined : `${index * 120}%`;
            const isOdd = index % 2 === 1;
            const src = isOdd
              ? 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex2.jpg'
              : 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex1.jpg';

            return (
              <div key={`slide-${index + 1}`} className="slide js-slide" style={{ left }}>
                <div className="slide__inner js-slide__inner">
                  <img className="js-slide__img" src={src} alt="" crossOrigin="anonymous" draggable={false} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="titles">
        <div className="titles__title titles__title--proxy">Lorem ipsum</div>
        <div className="titles__list js-titles">
          {['Moonrocket', 'Spaceman', 'Moonrocket', 'Spaceman', 'Moonrocket', 'Spaceman', 'Moonrocket', 'Spaceman', 'Moonrocket'].map((title, index) => (
            <div key={`title-${index + 1}`} className="titles__title js-title">
              {title}
            </div>
          ))}
        </div>
      </div>

      <div className="progress">
        <div className="progress__line js-progress-line" />
        <div className="progress__line js-progress-line-2" />
      </div>
    </section>
  );
}
