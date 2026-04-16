import { useCallback, useEffect, useRef, useState, type WheelEvent as ReactWheelEvent } from 'react';
import gsap from 'gsap';
import * as THREE from 'three';
import './slider-original.scss';

type SliderOptions = {
  speed?: number;
  threshold?: number;
  ease?: number;
};

type PointerLikeEvent = globalThis.MouseEvent | globalThis.TouchEvent;

type SlideMedia = {
  title: string;
  image: string;
  left: string;
  useVideo?: boolean;
  previewVideo?: string;
  fullVideo?: string;
};

type SliderItem = {
  el: HTMLElement;
  plane: Plane;
  left: number;
  right: number;
  width: number;
  min: number;
  max: number;
  tl: gsap.core.Timeline;
  out: boolean;
};

type SliderCallbacks = {
  onReachEnd?: () => void;
  onReachStart?: () => void;
};

const ENABLE_VIDEO_MODE = false;

const store = {
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
};

const updateStoreSize = () => {
  store.ww = window.innerWidth;
  store.wh = window.innerHeight;
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

  vec4 texColor = texture2D(uTexture, texScale);

  texScale.x += 0.15 * uVelo;
  if (uv.x < 1.0) texColor.g = texture2D(uTexture, texScale).g;

  texScale.x += 0.10 * uVelo;
  if (uv.x < 1.0) texColor.b = texture2D(uTexture, texScale).b;

  gl_FragColor = texColor;
}
`;

const loader = new THREE.TextureLoader();
loader.crossOrigin = 'anonymous';

class Gl {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  mountEl: HTMLElement;

  constructor(mountEl: HTMLElement) {
    this.mountEl = mountEl;
    this.scene = new THREE.Scene();

    this.camera = new THREE.OrthographicCamera(
      store.ww / -2,
      store.ww / 2,
      store.wh / 2,
      store.wh / -2,
      1,
      10
    );

    this.camera.lookAt(this.scene.position);
    this.camera.position.z = 1;

    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });

    this.renderer.setPixelRatio(1.5);
    this.renderer.setSize(store.ww, store.wh);
    this.renderer.setClearColor(0xffffff, 0);

    this.init();
  }

  init() {
    const domEl = this.renderer.domElement;
    domEl.classList.add('dom-gl');
    this.mountEl.appendChild(domEl);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    this.renderer.dispose();
    const domEl = this.renderer.domElement;
    if (domEl.parentNode) {
      domEl.parentNode.removeChild(domEl);
    }
  }
}

class GlObject extends THREE.Object3D {
  el!: HTMLElement;
  rect!: DOMRect;
  pos!: { x: number; y: number };

  constructor() {
    super();
  }

  init(el: HTMLElement, _gl?: Gl) {
    this.el = el;
    this.resize();
  }

  resize() {
    this.rect = this.el.getBoundingClientRect();
    const { left, top, width, height } = this.rect;

    this.pos = {
      x: left + width / 2 - store.ww / 2,
      y: top + height / 2 - store.wh / 2,
    };

    (this as THREE.Object3D).position.x = this.pos.x;
    (this as THREE.Object3D).position.y = -this.pos.y;

    this.updateX();
  }

  updateY() {
    this.rect = this.el.getBoundingClientRect();
    const { top, height } = this.rect;

    this.pos.y = top + height / 2 - store.wh / 2;
    (this as THREE.Object3D).position.y = -this.pos.y;
  }

  updateX(current?: number) {
    if (typeof current === 'number') {
      (this as THREE.Object3D).position.x = current + this.pos.x;
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
  geo!: THREE.PlaneGeometry;
  mat!: THREE.ShaderMaterial;
  img?: HTMLImageElement;
  video?: HTMLVideoElement;
  texture!: THREE.Texture | THREE.VideoTexture;
  mesh!: THREE.Mesh;
  gl!: Gl;

  init(el: HTMLElement, gl: Gl) {
    super.init(el);
    this.gl = gl;

    this.geo = planeGeo;
    this.mat = planeMat.clone();

    this.mat.uniforms = {
      uTime: { value: 0 },
      uTexture: { value: 0 },
      uMeshSize: { value: new THREE.Vector2(this.rect.width, this.rect.height) },
      uImageSize: { value: new THREE.Vector2(0, 0) },
      uScale: { value: 0.75 },
      uVelo: { value: 0 },
    };

    const video = this.el.querySelector('video');
    const img = this.el.querySelector('img');

    if (video) {
      this.video = video;
      this.video.muted = true;
      this.video.loop = true;
      this.video.playsInline = true;

      const videoTexture = new THREE.VideoTexture(this.video);
      videoTexture.minFilter = THREE.LinearFilter;
      videoTexture.magFilter = THREE.LinearFilter;
      videoTexture.generateMipmaps = false;

      this.texture = videoTexture;
      this.mat.uniforms.uTexture.value = videoTexture;

      const setVideoSize = () => {
        this.mat.uniforms.uImageSize.value = new THREE.Vector2(
          this.video?.videoWidth || this.rect.width,
          this.video?.videoHeight || this.rect.height
        );
      };

      this.video.addEventListener('loadedmetadata', setVideoSize);
      this.video.play().catch(() => {});
    } else if (img) {
      this.img = img;

      this.texture = loader.load(this.img.src, (texture: THREE.Texture) => {
        texture.minFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;

        this.mat.uniforms.uTexture.value = texture;
        this.mat.uniforms.uImageSize.value = new THREE.Vector2(
          this.img?.naturalWidth || this.rect.width,
          this.img?.naturalHeight || this.rect.height
        );
      });
    } else {
      throw new Error('Nenhuma mídia encontrada no slide.');
    }

    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.scale.set(this.rect.width, this.rect.height, 1);
    (this as THREE.Object3D).add(this.mesh);
    this.gl.scene.add(this);
  }
}

class Slider {
  el: HTMLElement;
  opts: Required<SliderOptions>;
  ui: {
    items: NodeListOf<HTMLElement>;
    titles: NodeListOf<HTMLElement>;
    lines: NodeListOf<HTMLElement>;
  };
  state: {
    target: number;
    current: number;
    currentRounded: number;
    y: number;
    on: { x: number; y: number };
    off: number;
    progress: number;
    diff: number;
    max: number;
    min: number;
    snap: { points: number[] };
    flags: { dragging: boolean; resize?: boolean };
  };
  items: SliderItem[];
  events: { move: string; up: string; down: string };
  tl?: gsap.core.Timeline;
  gl: Gl;
  onResizeBound: () => void;
  onScrollBound: () => void;
  onReachEnd?: () => void;
  onReachStart?: () => void;

  constructor(el: HTMLElement, gl: Gl, opts: SliderOptions = {}, callbacks: SliderCallbacks = {}) {
    this.el = el;
    this.gl = gl;
    this.onReachEnd = callbacks.onReachEnd;
    this.onReachStart = callbacks.onReachStart;

    this.opts = Object.assign(
      {
        speed: 2,
        threshold: 50,
        ease: 0.075,
      },
      opts
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
      flags: { dragging: false, resize: false },
    };

    this.items = [];

    this.events = {
      move: store.isDevice ? 'touchmove' : 'mousemove',
      up: store.isDevice ? 'touchend' : 'mouseup',
      down: store.isDevice ? 'touchstart' : 'mousedown',
    };

    this.onDown = this.onDown.bind(this);
    this.onMove = this.onMove.bind(this);
    this.onUp = this.onUp.bind(this);
    this.onResizeBound = this.handleResize.bind(this);
    this.onScrollBound = this.handleScroll.bind(this);

    this.init();
  }

  init() {
    this.setup();
    this.on();
  }

  destroy() {
    this.off();
    this.items.forEach((item) => {
      item.tl.kill();
      this.gl.scene.remove(item.plane);
    });
    this.items = [];
  }

  on() {
    const { move, up, down } = this.events;
    window.addEventListener(down, this.onDown as EventListener);
    window.addEventListener(move, this.onMove as EventListener);
    window.addEventListener(up, this.onUp as EventListener);
    window.addEventListener('resize', this.onResizeBound);
    window.addEventListener('scroll', this.onScrollBound, { passive: true });
  }

  off() {
    const { move, up, down } = this.events;
    window.removeEventListener(down, this.onDown as EventListener);
    window.removeEventListener(move, this.onMove as EventListener);
    window.removeEventListener(up, this.onUp as EventListener);
    window.removeEventListener('resize', this.onResizeBound);
    window.removeEventListener('scroll', this.onScrollBound);
  }

  handleResize() {
    updateStoreSize();
    this.state.flags.resize = true;

    this.items.forEach((item) => {
      const { left, right, width } = item.el.getBoundingClientRect();
      item.left = left;
      item.right = right;
      item.width = width;
      item.plane.resize();
    });

    this.setup();

    window.setTimeout(() => {
      this.state.flags.resize = false;
    }, 50);
  }

  handleScroll() {
    this.items.forEach((item) => {
      item.plane.updateY();
    });
  }

  setup() {
    const { ww } = store;
    const state = this.state;
    const { items, titles } = this.ui;

    if (!items.length) return;

    const { width: wrapWidth, left: wrapDiff } = this.el.getBoundingClientRect();

    state.max = -(
      items[items.length - 1].getBoundingClientRect().right -
      wrapWidth -
      wrapDiff
    );
    state.min = 0;

    this.tl?.kill();

    this.tl = gsap
      .timeline({
        paused: true,
        defaults: {
          duration: 1,
          ease: 'linear',
        },
      })
      .fromTo(
        '.js-progress-line-2',
        { scaleX: 1 },
        { scaleX: 0, duration: 0.5, ease: 'power3' },
        0
      )
      .fromTo(
        '.js-titles',
        { yPercent: 0 },
        { yPercent: -(100 - 100 / titles.length) },
        0
      )
      .fromTo('.js-progress-line', { scaleX: 0 }, { scaleX: 1 }, 0);

    if (this.items.length === 0) {
      for (let i = 0; i < items.length; i++) {
        const slideEl = items[i];
        const { left, right, width } = slideEl.getBoundingClientRect();

        const plane = new Plane();
        plane.init(slideEl, this.gl);

        const tl = gsap.timeline({ paused: true }).fromTo(
          plane.mat.uniforms.uScale,
          { value: 0.65 },
          { value: 1, duration: 1, ease: 'linear' }
        );

        this.items.push({
          el: slideEl,
          plane,
          left,
          right,
          width,
          min: left < ww ? ww * 0.775 : -(ww * 0.225 - wrapWidth * 0.2),
          max:
            left > ww
              ? state.max - ww * 0.775
              : state.max + (ww * 0.225 - wrapWidth * 0.2),
          tl,
          out: false,
        });
      }
    } else {
      this.items.forEach((item) => {
        const { left, right, width } = item.el.getBoundingClientRect();
        item.left = left;
        item.right = right;
        item.width = width;
        item.min = left < ww ? ww * 0.775 : -(ww * 0.225 - wrapWidth * 0.2);
        item.max =
          left > ww
            ? state.max - ww * 0.775
            : state.max + (ww * 0.225 - wrapWidth * 0.2);
        item.plane.resize();
      });
    }
  }

  calc() {
    const state = this.state;
    state.target = this.clampPosition(state.target);
    state.current += (state.target - state.current) * this.opts.ease;
    state.current = this.clampPosition(state.current);
    state.currentRounded = Math.round(this.clampPosition(state.current) * 100) / 100;
    state.diff = (state.target - state.current) * 0.0005;
    state.progress =
      state.max !== 0 ? gsap.utils.clamp(0, 1, state.currentRounded / state.max) : 0;

    this.tl?.progress(state.progress);
  }

  render() {
    this.calc();
    this.transformItems();
  }

  transformItems() {
    const { flags } = this.state;

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const { translate, isVisible, progress } = this.isVisible(item);

      item.plane.updateX(translate);
      item.plane.mat.uniforms.uVelo.value = this.state.diff;

      if (!item.out && item.tl) {
        item.tl.progress(progress);
      }

      if (isVisible || flags.resize) {
        item.out = false;
      } else if (!item.out) {
        item.out = true;
      }
    }
  }

  isVisible({
    left,
    width,
  }: {
    left: number;
    width: number;
  }) {
    const { ww } = store;
    const translate = this.clampPosition(this.state.currentRounded);
    const threshold = this.opts.threshold;
    const start = left + translate;
    const end = start + width;
    const isVisible = start < threshold + ww && end > -threshold;
    const progress = gsap.utils.clamp(
      0,
      1,
      1 - (translate + left + width) / (ww + width)
    );

    return { translate, isVisible, progress };
  }

  clampPosition(value: number) {
    return Math.min(this.state.min, Math.max(this.state.max, value));
  }

  isAtEnd(threshold = 14) {
    return this.clampPosition(Math.min(this.state.currentRounded, this.state.target)) <= this.state.max + threshold;
  }

  isAtStart(threshold = 14) {
    return this.clampPosition(Math.max(this.state.currentRounded, this.state.target)) >= this.state.min - threshold;
  }

  applyWheelDelta(deltaY: number) {
    if (Math.abs(deltaY) < 1) return false;

    if (deltaY > 0 && this.isAtEnd()) {
      this.onReachEnd?.();
      return true;
    }

    if (deltaY < 0 && this.isAtStart()) {
      this.onReachStart?.();
      return true;
    }

    this.state.off = this.state.target;
    this.state.target = this.clampPosition(this.state.target - deltaY * this.opts.speed * 0.9);
    return true;
  }

  getPos(e: PointerLikeEvent) {
    if ('changedTouches' in e && e.changedTouches && e.changedTouches.length > 0) {
      return {
        x: e.changedTouches[0].clientX,
        y: e.changedTouches[0].clientY,
        target: e.target,
      };
    }

    const mouseEvent = e as globalThis.MouseEvent;

    return {
      x: mouseEvent.clientX,
      y: mouseEvent.clientY,
      target: mouseEvent.target,
    };
  }

  onDown(e: PointerLikeEvent) {
    const { x, y } = this.getPos(e);
    const { flags, on } = this.state;

    flags.dragging = true;
    on.x = x;
    on.y = y;
  }

  onUp() {
    const state = this.state;
    state.flags.dragging = false;
    state.off = state.target;
  }

  onMove(e: PointerLikeEvent) {
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

    state.target = this.clampPosition(off + moveX * this.opts.speed);
  }
}

const slides: SlideMedia[] = [
  {
    title: 'Moonrocket',
    image: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex1.jpg',
    left: '0%',
    useVideo: false,
    previewVideo: '',
    fullVideo: '',
  },
  {
    title: 'Spaceman',
    image: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex2.jpg',
    left: '120%',
    useVideo: false,
    previewVideo: '',
    fullVideo: '',
  },
  {
    title: 'Moonrocket',
    image: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex1.jpg',
    left: '240%',
    useVideo: false,
    previewVideo: '',
    fullVideo: '',
  },
  {
    title: 'Spaceman',
    image: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex2.jpg',
    left: '360%',
    useVideo: false,
    previewVideo: '',
    fullVideo: '',
  },
  {
    title: 'Moonrocket',
    image: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex1.jpg',
    left: '480%',
    useVideo: false,
    previewVideo: '',
    fullVideo: '',
  },
  {
    title: 'Spaceman',
    image: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex2.jpg',
    left: '600%',
    useVideo: false,
    previewVideo: '',
    fullVideo: '',
  },
  {
    title: 'Moonrocket',
    image: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex1.jpg',
    left: '720%',
    useVideo: false,
    previewVideo: '',
    fullVideo: '',
  },
  {
    title: 'Spaceman',
    image: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex2.jpg',
    left: '840%',
    useVideo: false,
    previewVideo: '',
    fullVideo: '',
  },
  {
    title: 'Moonrocket',
    image: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex1.jpg',
    left: '960%',
    useVideo: false,
    previewVideo: '',
    fullVideo: '',
  },
];

type RootWithCleanup = HTMLDivElement & {
  __sliderCleanup?: () => void;
};

type SliderOriginalProps = {
  onReachEnd?: () => void;
  onReachStart?: () => void;
};

export default function SliderOriginal({
  onReachEnd,
  onReachStart,
}: SliderOriginalProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const sliderInstanceRef = useRef<Slider | null>(null);
  const fullscreenVideoRef = useRef<HTMLVideoElement | null>(null);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  useEffect(() => {
    if (!rootRef.current || !sliderRef.current) return;

    let gl: Gl | null = null;
    let slider: Slider | null = null;
    let raf1 = 0;
    let raf2 = 0;
    let tick: (() => void) | null = null;

    updateStoreSize();

    raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        try {
          if (!rootRef.current || !sliderRef.current) return;

          gl = new Gl(rootRef.current);
          slider = new Slider(sliderRef.current, gl, {}, { onReachEnd, onReachStart });
          sliderInstanceRef.current = slider;

          window.dispatchEvent(new Event('resize'));

          tick = () => {
            gl?.render();
            slider?.render();
          };

          gsap.ticker.add(tick);

          (rootRef.current as RootWithCleanup).__sliderCleanup = () => {
            if (tick) gsap.ticker.remove(tick);
            slider?.destroy();
            gl?.destroy();
            sliderInstanceRef.current = null;
          };
        } catch (error) {
          console.error('Falha ao iniciar WebGL:', error);
        }
      });
    });

    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);

      const root = rootRef.current as RootWithCleanup | null;
      root?.__sliderCleanup?.();
    };
  }, []);

  useEffect(() => {
    const videoEl = fullscreenVideoRef.current;
    if (!videoEl || !activeVideo) return;

    videoEl.currentTime = 0;
    videoEl.play().catch(() => {});
  }, [activeVideo]);

  const handleOpenVideo = async (slide: SlideMedia) => {
    if (!ENABLE_VIDEO_MODE) return;
    if (!slide.fullVideo) return;

    setActiveVideo(slide.fullVideo);

    setTimeout(async () => {
      const el = fullscreenVideoRef.current;
      if (!el) return;

      try {
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        }
      } catch (error) {
        console.error('Erro ao abrir fullscreen:', error);
      }
    }, 50);
  };

  const handleCloseVideo = async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch (error) {
        console.error('Erro ao sair do fullscreen:', error);
      }
    }

    const videoEl = fullscreenVideoRef.current;
    if (videoEl) {
      videoEl.pause();
    }

    setActiveVideo(null);
  };

  const handleWheel = useCallback(
    (event: ReactWheelEvent<HTMLDivElement>) => {
      if (activeVideo) return;

      const slider = sliderInstanceRef.current;
      if (!slider) return;

      const handled = slider.applyWheelDelta(event.deltaY);
      if (!handled) return;

      event.stopPropagation();
    },
    [activeVideo],
  );

  return (
    <div ref={rootRef} className="slider-original-root" onWheel={handleWheel}>
      <div className="slider js-drag-area">
        <div ref={sliderRef} className="slider__inner js-slider">
          {slides.slice(0, 8).map((slide, index) => {
            const shouldUseVideo =
              ENABLE_VIDEO_MODE && slide.useVideo && !!slide.previewVideo;

            return (
              <div
                key={`${slide.title}-${index}`}
                className="slide js-slide"
                style={index === 0 ? undefined : { left: slide.left }}
                onClick={() => handleOpenVideo(slide)}
              >
                <div className="slide__inner js-slide__inner">
                  {shouldUseVideo ? (
                    <video
                      className="js-slide__video"
                      src={slide.previewVideo}
                      muted
                      loop
                      playsInline
                      autoPlay
                      preload="metadata"
                    />
                  ) : (
                    <img
                      className="js-slide__img"
                      src={slide.image}
                      alt={slide.title}
                      crossOrigin="anonymous"
                      draggable={false}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="slider-titles">
        <div className="slider-titles__title slider-titles__title--proxy">
          Lorem ipsum
        </div>
        <div className="slider-titles__list js-titles">
          {slides.map((slide, index) => (
            <div
              key={`${slide.title}-${index}`}
              className="slider-titles__title js-title"
            >
              {slide.title}
            </div>
          ))}
        </div>
      </div>

      <div className="slider-progress">
        <div className="slider-progress__line js-progress-line"></div>
        <div className="slider-progress__line js-progress-line-2"></div>
      </div>

      {activeVideo && (
        <div className="video-overlay">
          <button className="video-overlay__close" onClick={handleCloseVideo}>
            Fechar
          </button>

          <video
            ref={fullscreenVideoRef}
            className="video-overlay__player"
            src={activeVideo}
            controls
            playsInline
            autoPlay
          />
        </div>
      )}
    </div>
  );
}
