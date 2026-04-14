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
  private transitionTimers = new Set<number>();
  private transitionResolvers = new Map<number, () => void>();

  public fovHeight = 0;
  public particles: Particles;

  constructor({
    container,
    onShapeChange,
    onSampleChange,
    onTransitionPhaseChange,
    onBeforeSampleTransition,
    onBeforeShapeTransition,
  }: EngineOptions) {
    this.container = container;
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
    await this.goto(0, false);
    this.handleResize();
    window.addEventListener('resize', this.handleResize);
    this.container.addEventListener('pointermove', this.handlePointerMove);
    this.container.addEventListener('click', this.handleClick);
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

  private async runFjrToProfileTransition(
    particleHoldBeforeGrowMs: number,
    particleGrowDurationMs: number,
    particlePulseDurationMs: number,
  ) {
    const searchGlowDurationMs = 2500;

    if (particleHoldBeforeGrowMs > 0) {
      await this.wait(particleHoldBeforeGrowMs);
      if (this.isDestroyed) return;
    }

    this.setTransitionPhase('particleGrow');
    await this.wait(particleGrowDurationMs);
    if (this.isDestroyed) return;

    this.setTransitionPhase('particlePulse');
    await this.wait(particlePulseDurationMs);
    if (this.isDestroyed) return;

    this.setTransitionPhase('searchMaterialize');
    await this.wait(1150);
    if (this.isDestroyed) return;

    this.setTransitionPhase('searchGlow');
    await this.wait(searchGlowDurationMs);
    if (this.isDestroyed) return;

    this.setTransitionPhase('searchDrop');
    await this.wait(1150);
  }

  private async goto(index: number, animated = true) {
    if (this.isTransitioning || this.isDestroyed) return;

    const nextShape: ShapeName = index === 0 ? 'fjr' : 'profile';
    const isFjrToProfileTransition = animated && this.currentSample === 0 && index === 1;
    const isProfileSampleExit = animated && this.currentSample >= 1;
    const hideDurationSeconds = 0.8;
    const profileGuideTriggerLeadMs = 280;
    const particleSmallDurationMs = 2000;
    const particleGrowDurationMs = 1000;
    const particlePulseDurationMs = 4000;
    this.isTransitioning = true;

    try {
      if (animated) {
        await this.onBeforeShapeTransition?.(this.currentShape, nextShape);
        if (this.isDestroyed) return;
      }

      if (animated && this.particles.object3D) {
        if (isFjrToProfileTransition) {
          this.setTransitionPhase('particle');
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
        const particleHoldBeforeGrowMs = Math.max(
          0,
          particleSmallDurationMs - hideDurationSeconds * 1000,
        );

        await this.runFjrToProfileTransition(
          particleHoldBeforeGrowMs,
          particleGrowDurationMs,
          particlePulseDurationMs,
        );
        if (this.isDestroyed) return;
      }

      await this.particles.init(this.samples[index]);
      if (this.isDestroyed) return;

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

  private handleClick() {
    if (this.isTransitioning) return;
    const next = this.currentSample < this.samples.length - 1 ? this.currentSample + 1 : 0;
    this.goto(next, true);
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
    this.container.removeEventListener('click', this.handleClick);

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
