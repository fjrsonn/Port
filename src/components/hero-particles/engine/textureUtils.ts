import * as THREE from 'three';
import type { ProcessedTexture } from './types';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function createProcessedTexture(
  src: string,
  maxWidth = 360,
  maxHeight = 360,
): Promise<ProcessedTexture> {
  const image = await loadImage(src);

  const ratio = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
  const width = Math.max(2, Math.floor(image.width * ratio));
  const height = Math.max(2, Math.floor(image.height * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Não foi possível criar o contexto 2D da textura processada.');
  }

  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.flipY = false;
  texture.needsUpdate = true;

  return {
    texture,
    canvas,
    width,
    height,
  };
}

export async function createFittedImageProcessedTexture(
  src: string,
  width = 360,
  height = width,
  fitScale = 0.4,
): Promise<ProcessedTexture> {
  const image = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Nao foi possivel criar o contexto 2D da imagem de particulas.');
  }

  const maxDrawWidth = width * fitScale;
  const maxDrawHeight = height * fitScale;
  const ratio = Math.min(maxDrawWidth / image.width, maxDrawHeight / image.height);
  const drawWidth = image.width * ratio;
  const drawHeight = image.height * ratio;
  const drawX = (width - drawWidth) * 0.5;
  const drawY = (height - drawHeight) * 0.5;

  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.flipY = false;
  texture.needsUpdate = true;

  return {
    texture,
    canvas,
    width,
    height,
  };
}
