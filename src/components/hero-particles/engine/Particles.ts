import * as THREE from 'three';
import { gsap } from 'gsap';
import TouchTexture from './TouchTexture';
import { createProcessedTexture } from './textureUtils';
import type { ProcessedTexture } from './types';
import vertexShader from '../shaders/particle.vert.glsl?raw';
import fragmentShader from '../shaders/particle.frag.glsl?raw';

export default class Particles {
  public container: THREE.Object3D;
  public object3D: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.RawShaderMaterial> | null = null;
  public hitArea: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | null = null;
  public texture: ProcessedTexture | null = null;
  public touch: TouchTexture | null = null;

  private engine: any;
  private width = 0;
  private height = 0;
  private numPoints = 0;
  private moveHandler?: (uv: { x: number; y: number }) => void;

  constructor(engine: any) {
    this.engine = engine;
    this.container = new THREE.Object3D();
  }

  async init(src: string) {
    this.texture = await createProcessedTexture(src, 360, 360);
    this.width = this.texture.width;
    this.height = this.texture.height;

    this.initPoints(true);
    this.initHitArea();
    this.initTouch();
    this.resize();
    this.show();
  }

  private initPoints(discardDarkPixels: boolean) {
    if (!this.texture) return;

    this.numPoints = this.width * this.height;

    let numVisible = this.numPoints;
    let threshold = 0;
    let originalColors: Float32Array | undefined;

    if (discardDarkPixels) {
      numVisible = 0;
      threshold = 34;

      const ctx = this.texture.canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        throw new Error('Não foi possível ler os pixels da textura processada.');
      }

      const imgData = ctx.getImageData(0, 0, this.width, this.height);
      originalColors = Float32Array.from(imgData.data);

      for (let i = 0; i < this.numPoints; i += 1) {
        if (originalColors[i * 4] > threshold) numVisible += 1;
      }
    }

    const uniforms = {
      uTime: { value: 0 },
      uRandom: { value: 1.0 },
      uDepth: { value: 2.0 },
      uSize: { value: 0.0 },
      uTextureSize: { value: new THREE.Vector2(this.width, this.height) },
      uTexture: { value: this.texture.texture },
      uTouch: { value: null as THREE.Texture | null },
    };

    const material = new THREE.RawShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      depthTest: false,
      transparent: true,
    });

    const geometry = new THREE.InstancedBufferGeometry();

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
    const angles = new Float32Array(numVisible);

    for (let i = 0, j = 0; i < this.numPoints; i += 1) {
      if (discardDarkPixels && originalColors && originalColors[i * 4] <= threshold) continue;

      offsets[j * 3] = i % this.width;
      offsets[j * 3 + 1] = Math.floor(i / this.width);
      offsets[j * 3 + 2] = 0;

      indices[j] = i;
      angles[j] = Math.random() * Math.PI;
      j += 1;
    }

    geometry.setAttribute('pindex', new THREE.InstancedBufferAttribute(indices, 1, false));
    geometry.setAttribute('offset', new THREE.InstancedBufferAttribute(offsets, 3, false));
    geometry.setAttribute('angle', new THREE.InstancedBufferAttribute(angles, 1, false));

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

  update(delta: number) {
    if (!this.object3D) return;
    if (this.touch) this.touch.update();
    this.object3D.material.uniforms.uTime.value += delta;
  }

  show(time = 1.0) {
    if (!this.object3D) return;

    gsap.fromTo(this.object3D.material.uniforms.uSize, { value: 0.5 }, { value: 1.5, duration: time });
    gsap.to(this.object3D.material.uniforms.uRandom, { value: 2.0, duration: time });
    gsap.fromTo(this.object3D.material.uniforms.uDepth, { value: 40.0 }, { value: 4.0, duration: time * 1.5 });
  }

  hide(time = 0.8) {
    if (!this.object3D) return Promise.resolve();

    return new Promise<void>((resolve) => {
      gsap.to(this.object3D!.material.uniforms.uRandom, {
        value: 5.0,
        duration: time,
        onComplete: () => resolve(),
      });
      gsap.to(this.object3D!.material.uniforms.uDepth, {
        value: -20.0,
        duration: time,
        ease: 'power2.in',
      });
      gsap.to(this.object3D!.material.uniforms.uSize, {
        value: 0.0,
        duration: time * 0.8,
      });
    });
  }

  destroy() {
    if (this.object3D) {
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

    if (this.texture) {
      this.texture.texture.dispose();
      this.texture = null;
    }
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
}