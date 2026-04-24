import * as THREE from 'three';
import { gsap } from 'gsap';
import TouchTexture from './TouchTexture';
import {
  createFittedImageProcessedTexture,
  createProcessedTexture,
} from './textureUtils';
import type { ProcessedTexture } from './types';
import vertexShader from '../shaders/particle.vert.glsl?raw';
import fragmentShader from '../shaders/particle.frag.glsl?raw';

type VisiblePoints = {
  data: Float32Array;
  count: number;
};

type ParticleRevealMode = 'animated' | 'settled';

const visiblePixelThreshold = 34;

export default class Particles {
  public container: THREE.Object3D;
  public object3D: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.RawShaderMaterial> | null = null;
  public hitArea: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | null = null;
  public texture: ProcessedTexture | null = null;
  public touch: TouchTexture | null = null;

  private engine: any;
  private width = 0;
  private height = 0;
  private currentTextureKey: string | null = null;
  private morphSourceTexture: ProcessedTexture | null = null;
  private textureTransitionId = 0;
  private revealTimer: number | null = null;

  constructor(engine: any) {
    this.engine = engine;
    this.container = new THREE.Object3D();
  }

  async init(src: string, options?: { revealMode?: ParticleRevealMode; revealDelayMs?: number }) {
    const texture = await createProcessedTexture(src, 360, 360);
    this.setProcessedTexture(texture, `image:${src}`);

    if (options?.revealMode === 'settled') {
      this.applySettledVisibleState();
      return;
    }

    if (this.revealTimer !== null) {
      window.clearTimeout(this.revealTimer);
      this.revealTimer = null;
    }

    const revealDelayMs = Math.max(0, options?.revealDelayMs ?? 0);
    if (revealDelayMs > 0) {
      if (this.object3D) {
        this.object3D.visible = false;
      }

      this.revealTimer = window.setTimeout(() => {
        this.revealTimer = null;
        if (!this.object3D) return;
        void this.show();
      }, revealDelayMs);
      return;
    }

    void this.show();
  }

  async transitionToImage(src: string) {
    const key = `image:${src}`;
    if (this.currentTextureKey === key) return true;

    const transitionId = this.textureTransitionId + 1;
    this.textureTransitionId = transitionId;

    const texture = await createProcessedTexture(src, 360, 360);
    if (transitionId !== this.textureTransitionId) {
      texture.texture.dispose();
      return false;
    }

    return this.transitionToProcessedTexture(texture, key, 0.9, transitionId);
  }

  async transitionToSkillImage(src: string) {
    const normalizedSrc = src.trim();
    if (!normalizedSrc) return false;

    const key = `skill-image:${normalizedSrc}`;
    if (this.currentTextureKey === key) return true;

    const transitionId = this.textureTransitionId + 1;
    this.textureTransitionId = transitionId;
    const texture = await createFittedImageProcessedTexture(
      normalizedSrc,
      this.texture?.width ?? 360,
      this.texture?.height ?? 360,
    );

    if (transitionId !== this.textureTransitionId) {
      texture.texture.dispose();
      return false;
    }

    return this.transitionToProcessedTexture(texture, key, 0.9, transitionId);
  }

  private getVisiblePoints(texture: ProcessedTexture): VisiblePoints {
    const ctx = texture.canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('Nao foi possivel ler os pixels da textura de particulas.');
    }

    const imageData = ctx.getImageData(0, 0, texture.width, texture.height);
    const points: number[] = [];

    for (let index = 0; index < texture.width * texture.height; index += 1) {
      if (imageData.data[index * 4] <= visiblePixelThreshold) continue;
      points.push(index % texture.width, Math.floor(index / texture.width));
    }

    if (points.length === 0) {
      points.push(texture.width * 0.5, texture.height * 0.5);
    }

    return {
      data: Float32Array.from(points),
      count: Math.max(1, Math.floor(points.length / 2)),
    };
  }

  private getGreatestCommonDivisor(a: number, b: number): number {
    let left = Math.abs(a);
    let right = Math.abs(b);

    while (right > 0) {
      const next = left % right;
      left = right;
      right = next;
    }

    return Math.max(1, left);
  }

  private getCoprimeStride(count: number, salt: number) {
    if (count <= 1) return 1;

    let stride = Math.max(1, Math.floor(count * salt));
    while (this.getGreatestCommonDivisor(stride, count) !== 1) {
      stride += 1;
    }

    return stride;
  }

  private getDistributedPointIndex(index: number, selectedCount: number, pointCount: number, salt: number) {
    if (pointCount <= 1) return 0;

    const bucketIndex = Math.min(
      selectedCount - 1,
      Math.floor(((index + 0.5) / selectedCount) * selectedCount),
    );
    const stride = this.getCoprimeStride(pointCount, salt);
    const offset = Math.floor(pointCount * (1 - salt));

    return (bucketIndex * stride + offset) % pointCount;
  }

  private createMaterial(
    sourceTexture: ProcessedTexture,
    targetTexture: ProcessedTexture,
    morphProgress: number,
  ) {
    const uniforms = {
      uTime: { value: 0 },
      uRandom: { value: 1.2 },
      uDepth: { value: 4.0 },
      uSize: { value: 1.5 },
      uOpacity: { value: 1 },
      uMorphProgress: { value: morphProgress },
      uTextureSize: { value: new THREE.Vector2(sourceTexture.width, sourceTexture.height) },
      uTexture: { value: sourceTexture.texture },
      uTargetTexture: { value: targetTexture.texture },
      uTouch: { value: null as THREE.Texture | null },
    };

    return new THREE.RawShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      depthTest: false,
      transparent: true,
    });
  }

  private createGeometry(sourceTexture: ProcessedTexture, targetTexture: ProcessedTexture) {
    const geometry = new THREE.InstancedBufferGeometry();
    const sourcePoints = this.getVisiblePoints(sourceTexture);
    const targetPoints = this.getVisiblePoints(targetTexture);
    const numVisible = targetPoints.count;

    const positions = new THREE.BufferAttribute(new Float32Array(4 * 3), 3);
    positions.setXYZ(0, -0.5,  0.5,  0.0);
    positions.setXYZ(1,  0.5,  0.5,  0.0);
    positions.setXYZ(2, -0.5, -0.5,  0.0);
    positions.setXYZ(3,  0.5, -0.5,  0.0);
    geometry.setAttribute('position', positions);

    const uvs = new THREE.BufferAttribute(new Float32Array(4 * 2), 2);
    uvs.setXY(0, 0.0, 0.0);
    uvs.setXY(1, 1.0, 0.0);
    uvs.setXY(2, 0.0, 1.0);
    uvs.setXY(3, 1.0, 1.0);
    geometry.setAttribute('uv', uvs);

    geometry.setIndex([0, 2, 1, 2, 3, 1]);

    const indices = new Float32Array(numVisible);
    const offsets = new Float32Array(numVisible * 3);
    const targetOffsets = new Float32Array(numVisible * 3);
    const angles = new Float32Array(numVisible);

    for (let index = 0; index < numVisible; index += 1) {
      const sourcePointIndex = this.getDistributedPointIndex(index, numVisible, sourcePoints.count, 0.61803398875);
      const targetPointIndex = this.getDistributedPointIndex(index, numVisible, targetPoints.count, 0.38196601125);
      const sourceOffset = sourcePointIndex * 2;
      const targetOffset = targetPointIndex * 2;

      offsets[index * 3] = sourcePoints.data[sourceOffset];
      offsets[index * 3 + 1] = sourcePoints.data[sourceOffset + 1];
      offsets[index * 3 + 2] = 0;

      targetOffsets[index * 3] = targetPoints.data[targetOffset];
      targetOffsets[index * 3 + 1] = targetPoints.data[targetOffset + 1];
      targetOffsets[index * 3 + 2] = 0;

      indices[index] = index;
      angles[index] = Math.random() * Math.PI;
    }

    geometry.setAttribute('pindex', new THREE.InstancedBufferAttribute(indices, 1, false));
    geometry.setAttribute('offset', new THREE.InstancedBufferAttribute(offsets, 3, false));
    geometry.setAttribute('targetOffset', new THREE.InstancedBufferAttribute(targetOffsets, 3, false));
    geometry.setAttribute('angle', new THREE.InstancedBufferAttribute(angles, 1, false));

    return geometry;
  }

  private createParticleObject(
    sourceTexture: ProcessedTexture,
    targetTexture: ProcessedTexture,
    morphProgress = 0,
  ) {
    const geometry = this.createGeometry(sourceTexture, targetTexture);
    const material = this.createMaterial(sourceTexture, targetTexture, morphProgress);

    this.object3D = new THREE.Mesh(geometry, material);
    this.container.add(this.object3D);
  }

  private initTouch() {
    if (!this.touch) this.touch = new TouchTexture();
    if (this.object3D) {
      this.object3D.material.uniforms.uTouch.value = this.touch.texture;
    }
  }

  private initHitArea() {
    const geometry = new THREE.PlaneGeometry(this.width, this.height, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, depthTest: false });
    material.visible = false;

    this.hitArea = new THREE.Mesh(geometry, material);
    this.container.add(this.hitArea);
  }

  private setProcessedTexture(texture: ProcessedTexture, key: string) {
    this.disposeCurrentShape();
    this.texture = texture;
    this.currentTextureKey = key;
    this.width = texture.width;
    this.height = texture.height;

    this.createParticleObject(texture, texture, 0);
    this.initHitArea();
    this.initTouch();
    this.resize();
  }

  private disposeObjectAndHitArea() {
    if (this.revealTimer !== null) {
      window.clearTimeout(this.revealTimer);
      this.revealTimer = null;
    }

    if (this.object3D) {
      gsap.killTweensOf(Object.values(this.object3D.material.uniforms));
      this.object3D.parent?.remove(this.object3D);
      this.object3D.geometry.dispose();
      this.object3D.material.dispose();
      this.object3D = null;
    }

    if (this.hitArea) {
      this.hitArea.parent?.remove(this.hitArea);
      this.hitArea.geometry.dispose();
      this.hitArea.material.dispose();
      this.hitArea = null;
    }
  }

  private disposeCurrentShape() {
    this.disposeObjectAndHitArea();

    if (this.texture) {
      this.texture.texture.dispose();
      this.texture = null;
    }

    if (this.morphSourceTexture) {
      this.morphSourceTexture.texture.dispose();
      this.morphSourceTexture = null;
    }
  }

  update(delta: number) {
    if (!this.object3D) return;
    if (this.touch) this.touch.update();
    this.object3D.material.uniforms.uTime.value += delta;
  }

  private applySettledVisibleState() {
    if (!this.object3D) return;

    if (this.revealTimer !== null) {
      window.clearTimeout(this.revealTimer);
      this.revealTimer = null;
    }

    this.object3D.visible = true;
    const { uMorphProgress, uOpacity, uSize, uRandom, uDepth } = this.object3D.material.uniforms;
    gsap.killTweensOf([uMorphProgress, uOpacity, uSize, uRandom, uDepth]);

    uMorphProgress.value = 0;
    uOpacity.value = 1;
    uSize.value = 1.5;
    uRandom.value = 2.0;
    uDepth.value = 4.0;
  }

  show(time = 1.0) {
    if (!this.object3D) return Promise.resolve(false);

    this.object3D.visible = true;

    const { uSize, uRandom, uDepth } = this.object3D.material.uniforms;
    gsap.killTweensOf([uSize, uRandom, uDepth]);

    return new Promise<boolean>((resolve) => {
      let isResolved = false;
      const resolveOnce = (completed: boolean) => {
        if (isResolved) return;
        isResolved = true;
        resolve(completed);
      };

      gsap.fromTo(uSize, { value: 0.5 }, { value: 1.5, duration: time });
      gsap.to(uRandom, { value: 2.0, duration: time });
      gsap.fromTo(uDepth, { value: 40.0 }, {
        value: 4.0,
        duration: time * 1.5,
        onComplete: () => resolveOnce(true),
        onInterrupt: () => resolveOnce(false),
      });
    });
  }

  hide(time = 0.8) {
    if (!this.object3D) return Promise.resolve(false);

    this.object3D.visible = true;

    return new Promise<boolean>((resolve) => {
      let isResolved = false;
      const resolveOnce = (completed: boolean) => {
        if (isResolved) return;
        isResolved = true;
        resolve(completed);
      };
      const { uSize, uRandom, uDepth } = this.object3D!.material.uniforms;
      gsap.killTweensOf([uSize, uRandom, uDepth]);

      gsap.to(uRandom, {
        value: 5.0,
        duration: time,
        onComplete: () => resolveOnce(true),
        onInterrupt: () => resolveOnce(false),
      });
      gsap.to(uDepth, {
        value: -20.0,
        duration: time,
        ease: 'power2.in',
      });
      gsap.to(uSize, {
        value: 0.0,
        duration: time * 0.8,
      });
    });
  }

  fadeObjectOpacity(opacity: number, time = 0.24) {
    if (!this.object3D) return Promise.resolve(false);

    this.object3D.visible = true;
    const { uOpacity } = this.object3D.material.uniforms;
    gsap.killTweensOf(uOpacity);

    return new Promise<boolean>((resolve) => {
      let isResolved = false;
      const resolveOnce = () => {
        if (isResolved) return;
        isResolved = true;
        resolve(true);
      };

      gsap.to(uOpacity, {
        value: opacity,
        duration: time,
        ease: 'power2.out',
        onComplete: resolveOnce,
        onInterrupt: resolveOnce,
      });
    });
  }

  async transitionToProcessedTexture(
    texture: ProcessedTexture,
    key: string,
    time = 0.78,
    transitionId = this.textureTransitionId + 1,
  ) {
    if (this.currentTextureKey === key) {
      texture.texture.dispose();
      return true;
    }

    this.textureTransitionId = transitionId;

    if (!this.texture || !this.object3D) {
      this.setProcessedTexture(texture, key);
      this.show(time);
      return true;
    }

    const sourceTexture = this.texture;
    if (this.morphSourceTexture && this.morphSourceTexture !== sourceTexture) {
      this.morphSourceTexture.texture.dispose();
    }

    this.disposeObjectAndHitArea();
    this.morphSourceTexture = sourceTexture;
    this.texture = texture;
    this.currentTextureKey = key;
    this.width = texture.width;
    this.height = texture.height;

    this.createParticleObject(sourceTexture, texture, 0);
    this.initHitArea();
    this.initTouch();
    this.resize();

    if (!this.object3D) return false;

    const { uMorphProgress, uSize, uRandom, uDepth } = this.object3D.material.uniforms;
    gsap.killTweensOf([uMorphProgress, uSize, uRandom, uDepth]);

    await new Promise<void>((resolve) => {
      gsap.fromTo(
        uMorphProgress,
        { value: 0 },
        {
          value: 1,
          duration: time,
          ease: 'power2.inOut',
          onComplete: resolve,
          onInterrupt: resolve,
        },
      );

      gsap.fromTo(uRandom, { value: 0.22 }, { value: 0.82, duration: time, ease: 'power2.out' });
      gsap.fromTo(uDepth, { value: 2.4 }, { value: 4.0, duration: time * 1.1, ease: 'power2.out' });
      gsap.fromTo(uSize, { value: 1.18 }, { value: 1.5, duration: time * 0.82, ease: 'power2.out' });
    });

    if (transitionId !== this.textureTransitionId) return false;

    if (this.morphSourceTexture && this.morphSourceTexture !== this.texture) {
      this.morphSourceTexture.texture.dispose();
    }
    this.morphSourceTexture = null;

    return true;
  }

  destroy() {
    this.textureTransitionId += 1;
    this.disposeCurrentShape();
    this.currentTextureKey = null;
  }

  resize() {
    if (!this.object3D || !this.hitArea) return;
    const scale = this.engine.fovHeight / this.height;
    this.object3D.scale.set(scale, scale, 1);
    this.hitArea.scale.set(scale, scale, 1);
  }

  addTouch(uv: { x: number; y: number }) {
    if (this.touch) this.touch.addTouch(uv);
  }

  setObjectVisible(isVisible: boolean) {
    if (this.object3D) {
      this.object3D.visible = isVisible;
    }
  }

  setObjectOpacity(opacity: number) {
    if (this.object3D) {
      this.object3D.material.uniforms.uOpacity.value = opacity;
    }
  }

  setObjectDissolveProgress(progress: number) {
    if (!this.object3D) return;

    const nextProgress = Math.min(1, Math.max(0, progress));
    const sizeProgress = Math.min(1, nextProgress / 0.8);
    const depthProgress = nextProgress * nextProgress;
    const { uSize, uRandom, uDepth } = this.object3D.material.uniforms;

    gsap.killTweensOf([uSize, uRandom, uDepth]);

    uRandom.value = 2.0 + (5.0 - 2.0) * nextProgress;
    uDepth.value = 4.0 + (-20.0 - 4.0) * depthProgress;
    uSize.value = 1.5 * (1 - sizeProgress);
    this.object3D.visible = nextProgress < 0.995;
  }
}
