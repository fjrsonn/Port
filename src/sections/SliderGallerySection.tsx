import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import * as THREE from 'three';
import './slider-gallery.css';

type SliderOptions = {
  speed?: number;
  threshold?: number;
  ease?: number;
};

type SliderItemData = {
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

type PointerLikeEvent =
  | MouseEvent
  | TouchEvent
  | {
      changedTouches?: TouchList;
      clientX?: number;
      clientY?: number;
      target?: EventTarget | null;
      cancelable?: boolean;
      preventDefault?: () => void;
      stopPropagation?: () => void;
    };

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
  vec4 texture = texture2D(uTexture, texScale);

  texScale.x += 0.15 * uVelo;
  if(uv.x < 1.) texture.g = texture2D(uTexture, texScale).g;

  texScale.x += 0.10 * uVelo;
  if(uv.x < 1.) texture.b = texture2D(uTexture, texScale).b;

  gl_FragColor = texture;
}
`;

const loader = new THREE.TextureLoader();
loader.crossOrigin = 'anonymous';


const hasWebGLSupport = () => {
  try {
    const canvas = document.createElement('canvas');
    const context =
      canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true }) ||
      canvas.getContext('webgl', { failIfMajorPerformanceCaveat: true }) ||
      canvas.getContext('experimental-webgl');

    return Boolean(context);
  } catch {
    return false;
  }
};


class Gl {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  mountNode: HTMLElement;

  constructor(mountNode: HTMLElement) {
    this.mountNode = mountNode;
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
    this.mountNode.appendChild(domEl);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    this.camera.left = store.ww / -2;
    this.camera.right = store.ww / 2;
    this.camera.top = store.wh / 2;
    this.camera.bottom = store.wh / -2;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(store.ww, store.wh);
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

    this.position.y = this.pos.y;
    this.position.x = this.pos.x;

    this.updateX();
  }

  updateX(current?: number) {
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
  geo!: THREE.PlaneGeometry;
  mat!: THREE.ShaderMaterial;
  mesh!: THREE.Mesh;
  img!: HTMLImageElement;
  texture!: THREE.Texture;

  init(el: HTMLElement, gl: Gl) {
    super.init(el);

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

    const img = this.el.querySelector('img');
    if (!img) {
      throw new Error('Imagem não encontrada dentro do slide.');
    }

    this.img = img;

    this.texture = loader.load(this.img.src, (texture: THREE.Texture) => {
      texture.minFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;

      this.mat.uniforms.uTexture.value = texture;
      this.mat.uniforms.uImageSize.value = new THREE.Vector2(
        this.img.naturalWidth,
        this.img.naturalHeight
      );
    });

    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.scale.set(this.rect.width, this.rect.height, 1);
    this.add(this.mesh);
    gl.scene.add(this);
  }

  resize() {
    super.resize();

    if (this.mat?.uniforms?.uMeshSize) {
      this.mat.uniforms.uMeshSize.value = new THREE.Vector2(
        this.rect.width,
        this.rect.height
      );
    }

    if (this.mesh) {
      this.mesh.scale.set(this.rect.width, this.rect.height, 1);
    }
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
  state: SliderState;
  items: SliderItemData[];
  events: {
    move: string;
    up: string;
    down: string;
  };
  tl?: gsap.core.Timeline;
  gl: Gl;

  constructor(el: HTMLElement, gl: Gl, opts: SliderOptions = {}) {
    this.el = el;
    this.gl = gl;

    this.opts = Object.assign(
      {
        speed: 2,
        threshold: 50,
        ease: 0.075,
      },
      opts
    );

    this.ui = {
      items: this.el.querySelectorAll<HTMLElement>('.js-slide'),
      titles: this.el.closest('.slider-gallery-root')?.querySelectorAll<HTMLElement>('.js-title') ?? document.querySelectorAll<HTMLElement>('.js-title'),
      lines: this.el.closest('.slider-gallery-root')?.querySelectorAll<HTMLElement>('.js-progress-line') ?? document.querySelectorAll<HTMLElement>('.js-progress-line'),
    };

    this.state = {
      target: 0,
      current: 0,
      currentRounded: 0,
      y: 0,
      on: {
        x: 0,
        y: 0,
      },
      off: 0,
      progress: 0,
      diff: 0,
      max: 0,
      min: 0,
      snap: {
        points: [],
      },
      flags: {
        dragging: false,
        resize: false,
      },
    };

    this.items = [];

    this.events = {
      move: store.isDevice ? 'touchmove' : 'mousemove',
      up: store.isDevice ? 'touchend' : 'mouseup',
      down: store.isDevice ? 'touchstart' : 'mousedown',
    };

    this.bindAll();
    this.init();
  }

  bindAll() {
    this.onDown = this.onDown.bind(this);
    this.onMove = this.onMove.bind(this);
    this.onUp = this.onUp.bind(this);
    this.onResize = this.onResize.bind(this);
  }

  init() {
    this.setup();
    this.on();
  }

  destroy() {
    this.off();
    this.tl?.kill();

    this.items.forEach((item) => {
      item.tl.kill();
      this.gl.scene.remove(item.plane);
    });

    this.items = [];
  }

  on() {
    const { move, up, down } = this.events;

    window.addEventListener(down, this.onDown as EventListener, { passive: false });
    window.addEventListener(move, this.onMove as EventListener, { passive: false });
    window.addEventListener(up, this.onUp as EventListener);
    window.addEventListener('resize', this.onResize);
  }

  off() {
    const { move, up, down } = this.events;

    window.removeEventListener(down, this.onDown as EventListener);
    window.removeEventListener(move, this.onMove as EventListener);
    window.removeEventListener(up, this.onUp as EventListener);
    window.removeEventListener('resize', this.onResize);
  }

  onResize() {
    updateStoreSize();
    this.gl.resize();
    this.state.flags.resize = true;

    this.items.forEach((item) => {
      item.plane.resize();
    });

    this.setup();

    requestAnimationFrame(() => {
      this.state.flags.resize = false;
    });
  }

  setup() {
    const { ww } = store;
    const state = this.state;
    const { items, titles } = this.ui;

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
        this.ui.lines[1],
        { scaleX: 1 },
        {
          scaleX: 0,
          duration: 0.5,
          ease: 'power3',
        },
        0
      )
      .fromTo(
        '.js-titles',
        { yPercent: 0 },
        {
          yPercent: -(100 - 100 / titles.length),
        },
        0
      )
      .fromTo(
        this.ui.lines[0],
        { scaleX: 0 },
        {
          scaleX: 1,
        },
        0
      );

    if (this.items.length === 0) {
      for (let i = 0; i < items.length; i++) {
        const el = items[i];
        const { left, right, width } = el.getBoundingClientRect();

        const plane = new Plane();
        plane.init(el, this.gl);

        const tl = gsap
          .timeline({ paused: true })
          .fromTo(
            plane.mat.uniforms.uScale,
            {
              value: 0.65,
            },
            {
              value: 1,
              duration: 1,
              ease: 'linear',
            }
          );

        this.items.push({
          el,
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
      this.items = this.items.map((item) => {
        const { left, right, width } = item.el.getBoundingClientRect();

        item.left = left;
        item.right = right;
        item.width = width;
        item.min = left < ww ? ww * 0.775 : -(ww * 0.225 - wrapWidth * 0.2);
        item.max =
          left > ww
            ? state.max - ww * 0.775
            : state.max + (ww * 0.225 - wrapWidth * 0.2);

        return item;
      });
    }

    this.clampTarget();
  }

  calc() {
    const state = this.state;
    state.current += (state.target - state.current) * this.opts.ease;
    state.currentRounded = Math.round(state.current * 100) / 100;
    state.diff = (state.target - state.current) * 0.0005;
    state.progress = gsap.utils.wrap(0, 1, state.currentRounded / state.max);

    if (this.tl) {
      this.tl.progress(state.progress);
    }
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

  isVisible({ left, right, width, min, max }: SliderItemData) {
    const { ww } = store;
    const { currentRounded } = this.state;
    const translate = gsap.utils.wrap(min, max, currentRounded);
    const threshold = this.opts.threshold;
    const start = left + translate;
    const end = right + translate;
    const isVisible = start < threshold + ww && end > -threshold;
    const progress = gsap.utils.clamp(
      0,
      1,
      1 - (translate + left + width) / (ww + width)
    );

    return {
      translate,
      isVisible,
      progress,
    };
  }

  clampTarget() {
    const state = this.state;
    state.target = gsap.utils.clamp(state.max, 0, state.target);
  }

  getPos(e: PointerLikeEvent) {
    const touch = 'changedTouches' in e && e.changedTouches ? e.changedTouches[0] : null;

    const mouseX = !touch && "clientX" in e ? e.clientX : 0;
    const mouseY = !touch && "clientY" in e ? e.clientY : 0;
    const x = Number(touch ? touch.clientX : mouseX) || 0;
    const y = Number(touch ? touch.clientY : mouseY) || 0;

    return {
      x,
      y,
      target: e.target ?? null,
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
      e.preventDefault?.();
      e.stopPropagation?.();
    }

    state.target = off + moveX * this.opts.speed;
    this.clampTarget();
  }
}

const slides = [
  {
    title: 'Moonrocket',
    image: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex1.jpg',
    left: '0%',
  },
  {
    title: 'Spaceman',
    image: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex2.jpg',
    left: '120%',
  },
  {
    title: 'Moonrocket',
    image: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex1.jpg',
    left: '240%',
  },
  {
    title: 'Spaceman',
    image: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex2.jpg',
    left: '360%',
  },
  {
    title: 'Moonrocket',
    image: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex1.jpg',
    left: '480%',
  },
  {
    title: 'Spaceman',
    image: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex2.jpg',
    left: '600%',
  },
  {
    title: 'Moonrocket',
    image: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex1.jpg',
    left: '720%',
  },
  {
    title: 'Spaceman',
    image: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex2.jpg',
    left: '840%',
  },
  {
    title: 'Moonrocket',
    image: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex1.jpg',
    left: '960%',
  },
];

export function SliderGallerySection() {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const [webglEnabled, setWebglEnabled] = useState(true);
  const hasLoggedWebglFallbackRef = useRef(false);

  useEffect(() => {
    if (!wrapperRef.current || !sliderRef.current) return;

    updateStoreSize();

    let gl: Gl | null = null;
    let slider: Slider | null = null;

    if (!hasWebGLSupport()) {
      if (!hasLoggedWebglFallbackRef.current) {
        console.info('WebGL indisponível para SliderGallerySection. Exibindo fallback estático.');
        hasLoggedWebglFallbackRef.current = true;
      }
      setWebglEnabled(false);
      return;
    }

    try {
      gl = new Gl(wrapperRef.current);
      slider = new Slider(sliderRef.current, gl);
      setWebglEnabled(true);
    } catch (error) {
      if (!hasLoggedWebglFallbackRef.current) {
        console.info('Falha ao inicializar WebGL na SliderGallerySection. Exibindo fallback estático.', error);
        hasLoggedWebglFallbackRef.current = true;
      }
      setWebglEnabled(false);
      return;
    }

    const tick = () => {
      gl?.render();
      slider?.render();
    };

    gsap.ticker.add(tick);

    return () => {
      gsap.ticker.remove(tick);
      slider?.destroy();
      gl?.destroy();
    };
  }, []);

  return (
    <section className="slider-gallery-section" id="slider-gallery">
      <div
        ref={wrapperRef}
        className={`slider-gallery-root ${webglEnabled ? '' : 'no-webgl'}`.trim()}
      >
        <header className="head">
          <a
            href="https://codepen.io/ReGGae/live/povjKxV"
            target="_blank"
            rel="noreferrer"
            data-txt="fullscreen is best"
          >
            <div>fullscreen is best</div>
          </a>

          <div>
            <a
              href="https://twitter.com/Jesper_Landberg"
              target="_blank"
              rel="noreferrer"
              data-txt="about"
            >
              <div>about</div>
            </a>

            <a
              href="https://twitter.com/Jesper_Landberg"
              target="_blank"
              rel="noreferrer"
              data-txt="contact"
            >
              <div>contact</div>
            </a>
          </div>
        </header>

        <div className="slider js-drag-area">
          <div ref={sliderRef} className="slider__inner js-slider">
            {slides.slice(0, 8).map((slide, index) => (
              <div
                key={`${slide.title}-${index}`}
                className="slide js-slide"
                style={index === 0 ? undefined : { left: slide.left }}
              >
                <div className="slide__inner js-slide__inner">
                  <img
                    className="js-slide__img"
                    src={slide.image}
                    alt={slide.title}
                    crossOrigin="anonymous"
                    draggable={false}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="titles">
          <div className="titles__title titles__title--proxy">Lorem ipsum</div>
          <div className="titles__list js-titles">
            {slides.map((slide, index) => (
              <div key={`title-${index}`} className="titles__title js-title">
                {slide.title}
              </div>
            ))}
          </div>
        </div>

        <div className="progress">
          <div className="progress__line js-progress-line" />
          <div className="progress__line js-progress-line-2" />
        </div>
      </div>
    </section>
  );
}
