declare module 'three' {
  export class Scene {
    position: unknown;
    add(obj: unknown): void;
    remove(obj: unknown): void;
  }

  export class OrthographicCamera {
    left: number;
    right: number;
    top: number;
    bottom: number;
    position: { z: number };
    constructor(
      left: number,
      right: number,
      top: number,
      bottom: number,
      near?: number,
      far?: number
    );
    lookAt(position: unknown): void;
    updateProjectionMatrix(): void;
  }

  export class WebGLRenderer {
    domElement: HTMLCanvasElement;
    constructor(options?: { alpha?: boolean; antialias?: boolean });
    setPixelRatio(value: number): void;
    setSize(width: number, height: number): void;
    setClearColor(color: number, alpha?: number): void;
    render(scene: Scene, camera: OrthographicCamera): void;
    dispose(): void;
  }

  export class Object3D {
    position: { x: number; y: number; z: number };
    add(obj: unknown): void;
  }

  export class PlaneGeometry {
    constructor(width: number, height: number, widthSegments?: number, heightSegments?: number);
  }

  export class Vector2 {
    constructor(x?: number, y?: number);
  }

  export class ShaderMaterial {
    uniforms: Record<string, { value: unknown }>;
    constructor(options?: { transparent?: boolean; fragmentShader?: string; vertexShader?: string });
    clone(): ShaderMaterial;
  }

  export class Mesh {
    scale: { set(x: number, y: number, z: number): void };
    constructor(geometry: PlaneGeometry, material: ShaderMaterial);
  }

  export class Texture {
    minFilter: unknown;
    generateMipmaps: boolean;
  }

  export const LinearFilter: unknown;

  export class TextureLoader {
    crossOrigin: string;
    load(url: string, onLoad?: (texture: Texture) => void): Texture;
  }
}
