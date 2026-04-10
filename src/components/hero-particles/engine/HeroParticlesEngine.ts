import * as THREE from 'three';
import fjrMask from '../../../assets/hero/fjr-mask.png';
import profileMask from '../../../assets/hero/profile-mask.png';
import Particles from './Particles';
import type { EngineOptions, ShapeName } from './types';

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
  private samples: string[] = [fjrMask, profileMask];
  private onShapeChange?: (shape: ShapeName) => void;

  public fovHeight = 0;
  public particles: Particles;

  constructor({ container, onShapeChange }: EngineOptions) {
    this.container = container;
    this.onShapeChange = onShapeChange;

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

  private async goto(index: number, animated = true) {
    if (animated && this.particles.object3D) {
      await this.particles.hide(0.8);
      this.particles.destroy();
    }

    await this.particles.init(this.samples[index]);

    this.currentSample = index;
    this.currentShape = index === 0 ? 'fjr' : 'profile';
    this.onShapeChange?.(this.currentShape);
  }

  private handleClick() {
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
      this.particles.addTouch(hits[0].uv);
    }
  }

  destroy() {
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