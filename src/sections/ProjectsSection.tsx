import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import * as THREE from 'three'

type ProjectsSectionProps = {
  onVideoHoverChange?: (isHoveringVideo: boolean) => void
  onCardInViewChange?: (isCardInView: boolean) => void
}

const store = {
  ww: window.innerWidth,
  wh: window.innerHeight,
  isDevice:
    navigator.userAgent.match(/Android/i) ||
    navigator.userAgent.match(/webOS/i) ||
    navigator.userAgent.match(/iPhone/i) ||
    navigator.userAgent.match(/iPad/i) ||
    navigator.userAgent.match(/iPod/i) ||
    navigator.userAgent.match(/BlackBerry/i) ||
    navigator.userAgent.match(/Windows Phone/i),
}

type SliderOptions = {
  speed: number
  threshold: number
  ease: number
}

type SliderItem = {
  el: HTMLElement
  plane: Plane
  left: number
  right: number
  width: number
  min: number
  max: number
  tl: gsap.core.Timeline
  out: boolean
}

type SliderState = {
  target: number
  current: number
  currentRounded: number
  y: number
  on: { x: number; y: number }
  off: number
  progress: number
  diff: number
  max: number
  min: number
  snap: { points: number[] }
  flags: {
    dragging: boolean
    resize?: boolean
  }
}

let gl: Gl | null = null

class Slider {
  el: HTMLElement
  opts: SliderOptions
  ui: {
    items: NodeListOf<HTMLElement>
    titles: NodeListOf<HTMLElement>
    lines: NodeListOf<HTMLElement>
  }
  state: SliderState
  items: SliderItem[]
  events: {
    move: 'touchmove' | 'mousemove'
    up: 'touchend' | 'mouseup'
    down: 'touchstart' | 'mousedown'
  }
  tl?: gsap.core.Timeline

  constructor(el: HTMLElement, opts: Partial<SliderOptions> = {}) {
    this.bindAll()
    this.el = el

    this.opts = Object.assign(
      {
        speed: 2,
        threshold: 50,
        ease: 0.075,
      },
      opts
    )

    this.ui = {
      items: this.el.querySelectorAll<HTMLElement>('.js-slide'),
      titles: document.querySelectorAll<HTMLElement>('.js-title'),
      lines: document.querySelectorAll<HTMLElement>('.js-progress-line'),
    }

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
    }

    this.items = []

    this.events = {
      move: store.isDevice ? 'touchmove' : 'mousemove',
      up: store.isDevice ? 'touchend' : 'mouseup',
      down: store.isDevice ? 'touchstart' : 'mousedown',
    }

    this.init()
  }

  bindAll(): void {
    const bound = this as unknown as Record<'onDown' | 'onMove' | 'onUp', (...args: unknown[]) => void>
    ;(['onDown', 'onMove', 'onUp'] as const).forEach((fn) => {
      bound[fn] = bound[fn].bind(this)
    })
  }

  init(): void {
    this.setup()
    this.on()
  }

  destroy(): void {
    this.off()
  }

  on(): void {
    const { move, up, down } = this.events
    window.addEventListener(down, this.onDown as EventListener)
    window.addEventListener(move, this.onMove as EventListener, { passive: false })
    window.addEventListener(up, this.onUp as EventListener)
  }

  off(): void {
    const { move, up, down } = this.events
    window.removeEventListener(down, this.onDown as EventListener)
    window.removeEventListener(move, this.onMove as EventListener)
    window.removeEventListener(up, this.onUp as EventListener)
  }

  setup(): void {
    const { ww } = store
    const state = this.state
    const { items, titles } = this.ui

    const { width: wrapWidth, left: wrapDiff } = this.el.getBoundingClientRect()

    state.max = -(items[items.length - 1].getBoundingClientRect().right - wrapWidth - wrapDiff)
    state.min = 0

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
      .fromTo('.js-progress-line', { scaleX: 0 }, { scaleX: 1 }, 0)

    for (let i = 0; i < items.length; i++) {
      const el = items[i]
      const { left, right, width } = el.getBoundingClientRect()

      const plane = new Plane()
      plane.init(el)

      const tl = gsap
        .timeline({ paused: true })
        .fromTo(
          plane.mat.uniforms.uScale,
          { value: 0.65 },
          { value: 1, duration: 1, ease: 'linear' }
        )

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
      })
    }
  }

  calc(): void {
    const state = this.state
    state.current += (state.target - state.current) * this.opts.ease
    state.currentRounded = Math.round(state.current * 100) / 100
    state.diff = (state.target - state.current) * 0.0005
    state.progress = gsap.utils.wrap(0, 1, state.currentRounded / state.max)

    this.tl?.progress(state.progress)
  }

  render(): void {
    this.calc()
    this.transformItems()
  }

  transformItems(): void {
    const { flags } = this.state

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i]
      const { translate, isVisible, progress } = this.isVisible(item)

      item.plane.updateX(translate)
      item.plane.mat.uniforms.uVelo.value = this.state.diff

      if (!item.out && item.tl) {
        item.tl.progress(progress)
      }

      if (isVisible || flags.resize) {
        item.out = false
      } else if (!item.out) {
        item.out = true
      }
    }
  }

  isVisible({
    left,
    right,
    width,
    min,
    max,
  }: {
    left: number
    right: number
    width: number
    min: number
    max: number
  }) {
    const { ww } = store
    const { currentRounded } = this.state
    const translate = gsap.utils.wrap(min, max, currentRounded)
    const threshold = this.opts.threshold
    const start = left + translate
    const end = right + translate
    const isVisible = start < threshold + ww && end > -threshold
    const progress = gsap.utils.clamp(0, 1, 1 - (translate + left + width) / (ww + width))

    return { translate, isVisible, progress }
  }

  getPos(e: TouchEvent | MouseEvent) {
    const touch = 'changedTouches' in e ? e.changedTouches?.[0] : null
    const x = touch ? touch.clientX : (e as MouseEvent).clientX
    const y = touch ? touch.clientY : (e as MouseEvent).clientY

    return { x, y }
  }

  onDown(e: TouchEvent | MouseEvent): void {
    const { x, y } = this.getPos(e)
    const { flags, on } = this.state

    flags.dragging = true
    on.x = x
    on.y = y
  }

  onUp(): void {
    const state = this.state
    state.flags.dragging = false
    state.off = state.target
  }

  onMove(e: TouchEvent | MouseEvent): void {
    const { x, y } = this.getPos(e)
    const state = this.state

    if (!state.flags.dragging) return

    const { off, on } = state
    const moveX = x - on.x
    const moveY = y - on.y

    if (Math.abs(moveX) > Math.abs(moveY) && e.cancelable) {
      e.preventDefault()
      e.stopPropagation()
    }

    state.target = off + moveX * this.opts.speed
  }
}

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
`

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
`

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
`

const loader = new THREE.TextureLoader()
loader.crossOrigin = 'anonymous'

class Gl {
  scene: THREE.Scene
  camera: THREE.OrthographicCamera
  renderer: THREE.WebGLRenderer

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene()

    this.camera = new THREE.OrthographicCamera(
      store.ww / -2,
      store.ww / 2,
      store.wh / 2,
      store.wh / -2,
      1,
      10
    )
    this.camera.lookAt(this.scene.position)
    this.camera.position.z = 1

    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    })
    this.renderer.setPixelRatio(1.5)
    this.renderer.setSize(store.ww, store.wh)
    this.renderer.setClearColor(0xffffff, 0)

    this.init(container)
  }

  render(): void {
    this.renderer.render(this.scene, this.camera)
  }

  init(container: HTMLElement): void {
    const domEl = this.renderer.domElement
    domEl.classList.add('dom-gl')
    container.appendChild(domEl)
  }

  destroy(): void {
    this.renderer.dispose()
  }
}

class GlObject extends THREE.Object3D {
  el!: HTMLElement
  rect!: DOMRect
  pos!: { x: number; y: number }

  init(el: HTMLElement): void {
    this.el = el
    this.resize()
  }

  resize(): void {
    this.rect = this.el.getBoundingClientRect()
    const { left, top, width, height } = this.rect

    this.pos = {
      x: left + width / 2 - store.ww / 2,
      y: top + height / 2 - store.wh / 2,
    }

    this.position.y = this.pos.y
    this.position.x = this.pos.x
    this.updateX()
  }

  updateX(current?: number): void {
    if (typeof current === 'number') {
      this.position.x = current + this.pos.x
    }
  }
}

const planeGeo = new THREE.PlaneGeometry(1, 1, 32, 32)
const planeMat = new THREE.ShaderMaterial({
  transparent: true,
  fragmentShader,
  vertexShader,
})

class Plane extends GlObject {
  geo!: THREE.PlaneGeometry
  mat!: THREE.ShaderMaterial
  img!: HTMLImageElement
  texture!: THREE.Texture
  mesh!: THREE.Mesh

  init(el: HTMLElement): void {
    super.init(el)

    this.geo = planeGeo
    this.mat = planeMat.clone()

    this.mat.uniforms = {
      uTime: { value: 0 },
      uTexture: { value: 0 },
      uMeshSize: { value: new THREE.Vector2(this.rect.width, this.rect.height) },
      uImageSize: { value: new THREE.Vector2(0, 0) },
      uScale: { value: 0.75 },
      uVelo: { value: 0 },
    }

    this.img = this.el.querySelector('img') as HTMLImageElement

    this.texture = loader.load(this.img.src, (texture: THREE.Texture) => {
      texture.minFilter = THREE.LinearFilter
      texture.generateMipmaps = false

      this.mat.uniforms.uTexture.value = texture
      this.mat.uniforms.uImageSize.value = new THREE.Vector2(
        this.img.naturalWidth,
        this.img.naturalHeight
      )
    })

    this.mesh = new THREE.Mesh(this.geo, this.mat)
    this.mesh.scale.set(this.rect.width, this.rect.height, 1)
    this.add(this.mesh)

    gl?.scene.add(this)
  }
}

export function ProjectsSection({
  onVideoHoverChange,
  onCardInViewChange,
}: ProjectsSectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null)
  const sliderRef = useRef<HTMLDivElement | null>(null)
  const glHostRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const sliderEl = sliderRef.current
    const glHostEl = glHostRef.current
    const sectionEl = sectionRef.current

    if (!sliderEl || !glHostEl || !sectionEl) return

    onCardInViewChange?.(true)
    onVideoHoverChange?.(false)

    gl = new Gl(glHostEl)
    const slider = new Slider(sliderEl)

    const tick = () => {
      gl?.render()
      slider.render()
    }

    gsap.ticker.add(tick)

    return () => {
      gsap.ticker.remove(tick)
      slider.destroy()
      gl?.destroy()
      glHostEl.innerHTML = ''
      gl = null
      onCardInViewChange?.(false)
      onVideoHoverChange?.(false)
    }
  }, [onCardInViewChange, onVideoHoverChange])

  return (
    <section ref={sectionRef} className="projects-section projects-webgl-section">
      <div ref={glHostRef} className="projects-gl-host" />

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
          <div className="slide js-slide">
            <div className="slide__inner js-slide__inner">
              <img
                className="js-slide__img"
                src="http://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex1.jpg"
                alt=""
                crossOrigin="anonymous"
                draggable={false}
              />
            </div>
          </div>

          <div className="slide js-slide" style={{ left: '120%' }}>
            <div className="slide__inner js-slide__inner">
              <img
                className="js-slide__img"
                src="http://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex2.jpg"
                alt=""
                crossOrigin="anonymous"
                draggable={false}
              />
            </div>
          </div>

          <div className="slide js-slide" style={{ left: '240%' }}>
            <div className="slide__inner js-slide__inner">
              <img
                className="js-slide__img"
                src="http://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex1.jpg"
                alt=""
                crossOrigin="anonymous"
                draggable={false}
              />
            </div>
          </div>

          <div className="slide js-slide" style={{ left: '360%' }}>
            <div className="slide__inner js-slide__inner">
              <img
                className="js-slide__img"
                src="http://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex2.jpg"
                alt=""
                crossOrigin="anonymous"
                draggable={false}
              />
            </div>
          </div>

          <div className="slide js-slide" style={{ left: '480%' }}>
            <div className="slide__inner js-slide__inner">
              <img
                className="js-slide__img"
                src="http://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex1.jpg"
                alt=""
                crossOrigin="anonymous"
                draggable={false}
              />
            </div>
          </div>

          <div className="slide js-slide" style={{ left: '600%' }}>
            <div className="slide__inner js-slide__inner">
              <img
                className="js-slide__img"
                src="http://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex2.jpg"
                alt=""
                crossOrigin="anonymous"
                draggable={false}
              />
            </div>
          </div>

          <div className="slide js-slide" style={{ left: '720%' }}>
            <div className="slide__inner js-slide__inner">
              <img
                className="js-slide__img"
                src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex1.jpg"
                alt=""
                crossOrigin="anonymous"
                draggable={false}
              />
            </div>
          </div>

          <div className="slide js-slide" style={{ left: '840%' }}>
            <div className="slide__inner js-slide__inner">
              <img
                className="js-slide__img"
                src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/58281/tex2.jpg"
                alt=""
                crossOrigin="anonymous"
                draggable={false}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="titles">
        <div className="titles__title titles__title--proxy">Lorem ipsum</div>

        <div className="titles__list js-titles">
          <div className="titles__title js-title">Moonrocket</div>
          <div className="titles__title js-title">Spaceman</div>
          <div className="titles__title js-title">Moonrocket</div>
          <div className="titles__title js-title">Spaceman</div>
          <div className="titles__title js-title">Moonrocket</div>
          <div className="titles__title js-title">Spaceman</div>
          <div className="titles__title js-title">Moonrocket</div>
          <div className="titles__title js-title">Spaceman</div>
          <div className="titles__title js-title">Moonrocket</div>
        </div>
      </div>

      <div className="progress">
        <div className="progress__line js-progress-line"></div>
        <div className="progress__line js-progress-line-2"></div>
      </div>
    </section>
  )
}
