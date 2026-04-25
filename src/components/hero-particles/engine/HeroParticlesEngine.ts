import * as THREE from 'three';
import fjrMask from '../../../assets/hero/fjr-mask.png';
import profileMask from '../../../assets/hero/profile-mask.png';
import profileMask2 from '../../../assets/hero/2profile-mask.png';
import profileMask3 from '../../../assets/hero/3profile-mask.png';
import profileMask4 from '../../../assets/hero/4profile-mask.png';
import Particles from './Particles';
import type { EngineOptions, HeroTransitionPhase, ShapeName } from './types';

export class HeroParticlesEngine {
  private container: HTMLDivElement;
  private initialSampleIndex: number;
  private initialLoadRevealMode: 'animated' | 'settled';
  private initialLoadRevealDelayMs: number;
  private lockSample: boolean;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private frameId: number | null = null;
  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;
  private currentShape: ShapeName = 'fjr';
  private currentSample = 0;
  private samples: string[] = [fjrMask, profileMask, profileMask2, profileMask3, profileMask4];
  private onShapeChange?: (shape: ShapeName) => void;
  private onSampleChange?: (sampleIndex: number) => void;
  private onTransitionPhaseChange?: (phase: HeroTransitionPhase) => void;
  private onBeforeSampleTransition?: (fromSampleIndex: number, toSampleIndex: number) => Promise<void> | void;
  private onBeforeShapeTransition?: (from: ShapeName, to: ShapeName) => Promise<void> | void;
  private isTransitioning = false;
  private isDestroyed = false;
  private activeSkillImageSrc: string | null = null;
  private transitionTimers = new Set<number>();
  private transitionResolvers = new Map<number, () => void>();

  public fovHeight = 0;
  public particles: Particles;

  constructor({
    container,
    initialSampleIndex = 0,
    initialLoadRevealMode = 'animated',
    initialLoadRevealDelayMs = 0,
    lockSample = false,
    onShapeChange,
    onSampleChange,
    onTransitionPhaseChange,
    onBeforeSampleTransition,
    onBeforeShapeTransition,
  }: EngineOptions) {
    this.container = container;
    this.initialSampleIndex = Math.min(Math.max(initialSampleIndex, 0), this.samples.length - 1);
    this.initialLoadRevealMode = initialLoadRevealMode;
    this.initialLoadRevealDelayMs = Math.max(0, initialLoadRevealDelayMs);
    this.lockSample = lockSample;
    this.onShapeChange = onShapeChange;
    this.onSampleChange = onSampleChange;
    this.onTransitionPhaseChange = onTransitionPhaseChange;
    this.onBeforeSampleTransition = onBeforeSampleTransition;
    this.onBeforeShapeTransition = onBeforeShapeTransition;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 10000);
    this.camera.position.z = 300;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setClearColor(0x000000, 0);

    this.clock = new THREE.Clock(true);
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.container.appendChild(this.renderer.domElement);

    this.particles = new Particles(this);
    this.scene.add(this.particles.container);

    this.handleResize = this.handleResize.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.tick = this.tick.bind(this);
  }

  async init() {
    await this.particles.init(this.samples[this.initialSampleIndex], {
      revealMode: this.initialLoadRevealMode,
      revealDelayMs: this.initialLoadRevealDelayMs,
    });
    if (this.isDestroyed) return;

    this.activeSkillImageSrc = null;
    this.currentSample = this.initialSampleIndex;
    this.currentShape = this.initialSampleIndex === 0 ? 'fjr' : 'profile';
    this.onShapeChange?.(this.currentShape);
    this.onSampleChange?.(this.currentSample);

    this.handleResize();
    window.addEventListener('resize', this.handleResize);
    this.container.addEventListener('pointermove', this.handlePointerMove);
    if (!this.lockSample) {
      this.container.addEventListener('click', this.handleClick);
    }
    this.tick();
  }

  private tick() {
    const delta = this.clock.getDelta();
    this.particles.update(delta);
    this.renderer.render(this.scene, this.camera);
    this.frameId = window.requestAnimationFrame(this.tick);
  }

  private setTransitionPhase(phase: HeroTransitionPhase) {
    if (this.isDestroyed) return;
    this.onTransitionPhaseChange?.(phase);
  }

  private wait(ms: number) {
    return new Promise<void>((resolve) => {
      const timer = window.setTimeout(() => {
        this.transitionTimers.delete(timer);
        this.transitionResolvers.delete(timer);
        resolve();
      }, ms);

      this.transitionTimers.add(timer);
      this.transitionResolvers.set(timer, resolve);
    });
  }

  private clearTransitionTimers() {
    this.transitionTimers.forEach((timer) => {
      window.clearTimeout(timer);
      this.transitionResolvers.get(timer)?.();
    });
    this.transitionTimers.clear();
    this.transitionResolvers.clear();
  }

  private async runFjrToProfileTransition(initialDelayMs: number) {
    const searchMaterializeDurationMs = 1150;
    const searchGlowDurationMs = 2500;

    this.setTransitionPhase('searchMaterialize');
    if (searchMaterializeDurationMs > initialDelayMs) {
      await this.wait(searchMaterializeDurationMs - initialDelayMs);
      if (this.isDestroyed) return;
    }

    if (this.isDestroyed) return;

    this.setTransitionPhase('searchGlow');
    await this.wait(searchGlowDurationMs);
    if (this.isDestroyed) return;

    this.setTransitionPhase('searchDrop');
    await this.wait(1150);
  }

  public async goTo(
    index: number,
    animated = true,
    options?: {
      skipFinalSampleLoad?: boolean;
    },
  ) {
    if (this.isTransitioning || this.isDestroyed) return;

    const nextShape: ShapeName = index === 0 ? 'fjr' : 'profile';
    const isFjrToProfileTransition = animated && this.currentSample === 0 && index === 1;
    const shouldSkipFinalSampleLoad = Boolean(options?.skipFinalSampleLoad) && isFjrToProfileTransition;
    const isProfileSampleExit = animated && this.currentSample >= 1;
    const hideDurationSeconds = 0.8;
    const profileGuideTriggerLeadMs = 280;
    let fjrToProfileTransitionPromise: Promise<void> | null = null;
    this.isTransitioning = true;

    try {
      if (animated) {
        await this.onBeforeShapeTransition?.(this.currentShape, nextShape);
        if (this.isDestroyed) return;
      }

      if (animated && this.particles.object3D) {
        if (isFjrToProfileTransition) {
          fjrToProfileTransitionPromise = this.runFjrToProfileTransition(hideDurationSeconds * 1000);
        }
        const hidePromise = this.particles.hide(hideDurationSeconds);

        if (isProfileSampleExit) {
          await this.wait(Math.max(0, hideDurationSeconds * 1000 - profileGuideTriggerLeadMs));
          if (this.isDestroyed) return;

          this.onBeforeSampleTransition?.(this.currentSample, index);
          if (this.isDestroyed) return;
        }

        await hidePromise;
        if (this.isDestroyed) return;
        this.particles.destroy();
      }

      if (isFjrToProfileTransition) {
        await (fjrToProfileTransitionPromise ?? this.runFjrToProfileTransition(0));
        if (this.isDestroyed) return;
      }

      if (shouldSkipFinalSampleLoad) {
        this.setTransitionPhase('idle');
        return;
      }

      await this.particles.init(this.samples[index]);
      if (this.isDestroyed) return;

      this.activeSkillImageSrc = null;
      this.currentSample = index;
      this.currentShape = nextShape;
      this.onShapeChange?.(this.currentShape);
      this.onSampleChange?.(this.currentSample);

      if (isFjrToProfileTransition) {
        this.setTransitionPhase('idle');
      }
    } finally {
      this.isTransitioning = false;
    }
  }

  public async goto(
    index: number,
    animated = true,
    options?: {
      skipFinalSampleLoad?: boolean;
    },
  ) {
    return this.goTo(index, animated, options);
  }

  public hideCurrent(time = 0.8) {
    if (this.isDestroyed) return Promise.resolve();
    return this.particles.hide(time);
  }

  public dissolveCurrentProfileParticles(time = 0.72) {
    if (this.isDestroyed || this.isTransitioning) return Promise.resolve(false);

    this.activeSkillImageSrc = null;
    this.particles.setObjectVisible(true);
    this.particles.setObjectOpacity(1);
    return this.particles.hide(time);
  }

  public materializeCurrentProfileParticles(time = 0.72) {
    if (this.isDestroyed || this.isTransitioning) return Promise.resolve(false);

    this.activeSkillImageSrc = null;
    this.particles.setObjectVisible(true);
    this.particles.setObjectOpacity(1);
    return this.particles.show(time);
  }

  public showSkillImage(src: string) {
    if (this.isDestroyed || this.isTransitioning) return Promise.resolve(false);

    const normalizedSrc = src.trim();
    if (!normalizedSrc) return Promise.resolve(false);

    this.particles.setObjectVisible(true);
    this.particles.setObjectOpacity(1);
    if (this.activeSkillImageSrc === normalizedSrc) return Promise.resolve(true);
    this.activeSkillImageSrc = normalizedSrc;
    return this.particles.transitionToSkillImage(normalizedSrc);
  }

  public clearSkillImage() {
    if (this.isDestroyed || this.isTransitioning) return Promise.resolve(false);
    if (this.activeSkillImageSrc === null) return Promise.resolve(true);

    this.activeSkillImageSrc = null;
    this.particles.setObjectVisible(true);
    this.particles.setObjectOpacity(1);
    return this.particles.transitionToImage(this.samples[this.currentSample]);
  }

  public setSkillParticlesVisible(isVisible: boolean) {
    if (this.isDestroyed) return;
    this.particles.setObjectVisible(isVisible);
  }

  public setSkillParticlesOpacity(opacity: number) {
    if (this.isDestroyed) return;
    this.particles.setObjectOpacity(opacity);
  }

  public setSkillParticlesDissolveProgress(progress: number) {
    if (this.isDestroyed) return;
    this.particles.setObjectDissolveProgress(progress);
  }

  public fadeSkillParticlesOpacity(opacity: number, time = 0.24) {
    if (this.isDestroyed) return Promise.resolve(false);
    return this.particles.fadeObjectOpacity(opacity, time);
  }

  private handleClick() {
    if (this.lockSample) return;
    if (this.isTransitioning) return;
    const next = this.currentSample < this.samples.length - 1 ? this.currentSample + 1 : 0;
    this.goTo(next, true);
  }

  private handleResize() {
    const width = Math.max(1, this.container.clientWidth || window.innerWidth);
    const height = Math.max(1, this.container.clientHeight || window.innerHeight);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.fovHeight = 2 * Math.tan((this.camera.fov * Math.PI) / 180 / 2) * this.camera.position.z;

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(width, height, true);

    this.particles.resize();
  }

  private handlePointerMove(event: PointerEvent) {
    if (!this.particles.hitArea) return;

    const rect = this.container.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObject(this.particles.hitArea);

    if (hits.length > 0 && hits[0].uv) {
      this.particles.addTouch({
        x: hits[0].uv.x,
        y: 1 - hits[0].uv.y,
      });
    }
  }

  destroy() {
    this.isDestroyed = true;
    this.clearTransitionTimers();
    window.removeEventListener('resize', this.handleResize);
    this.container.removeEventListener('pointermove', this.handlePointerMove);
    if (!this.lockSample) {
      this.container.removeEventListener('click', this.handleClick);
    }

    if (this.frameId !== null) {
      window.cancelAnimationFrame(this.frameId);
    }

    this.particles.destroy();
    this.scene.remove(this.particles.container);
    this.renderer.dispose();

    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
