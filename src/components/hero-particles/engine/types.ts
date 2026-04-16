import * as THREE from 'three';

export type ShapeName = 'fjr' | 'profile';
export type HeroTransitionPhase =
  | 'idle'
  | 'particle'
  | 'particleGrow'
  | 'particlePulse'
  | 'searchMaterialize'
  | 'searchTrace'
  | 'searchGlow'
  | 'searchDrop';

export type ProcessedTexture = {
  texture: THREE.CanvasTexture;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
};

export type LoadedShape = {
  texture: THREE.DataTexture;
  width: number;
  height: number;
};

export type EngineOptions = {
  container: HTMLDivElement;
  initialSampleIndex?: number;
  lockSample?: boolean;
  onShapeChange?: (shape: ShapeName) => void;
  onSampleChange?: (sampleIndex: number) => void;
  onTransitionPhaseChange?: (phase: HeroTransitionPhase) => void;
  onBeforeSampleTransition?: (fromSampleIndex: number, toSampleIndex: number) => Promise<void> | void;
  onBeforeShapeTransition?: (from: ShapeName, to: ShapeName) => Promise<void> | void;
};
