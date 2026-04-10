import * as THREE from 'three';

export type ShapeName = 'fjr' | 'profile';

export type ProcessedTexture = {
  texture: THREE.CanvasTexture;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
};

export type EngineOptions = {
  container: HTMLDivElement;
  onShapeChange?: (shape: ShapeName) => void;
};