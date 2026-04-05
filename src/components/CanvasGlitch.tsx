import { useEffect, useRef } from 'react';

export function CanvasGlitch() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', {
      willReadFrequently: true,
      alpha: false,
      desynchronized: true,
    });
    if (!ctx) return;

    let currentFrame = 0;
    const totalFrame = 10;
    const targetFps = 45;
    const frameInterval = 1000 / targetFps;
    let lastFrameTime = 0;
    let offsetRatio = 0.01;
    let width = 0;
    let height = 0;
    let imgData: ImageData | null = null;
    let rafId = 0;

    const randInt = (a: number, b: number) => Math.floor(Math.random() * (b - a) + a);

    const pixelProcessor = (
      imageData: ImageData,
      step: number,
      callback: (i: number, data: Uint8ClampedArray) => void,
    ) => {
      const data = imageData.data;
      const jump = Math.max(1, step) * 4;

      for (let i = 0; i < data.length; i += jump) {
        callback(i, data);
      }

      return imageData;
    };

    const pixelFlick = (i: number, data: Uint8ClampedArray) => {
      const nextPixel = i + 16;
      if (nextPixel < data.length) {
        data[i] = data[nextPixel] ?? data[i];
      }
    };

    const pixelCooler = (i: number, data: Uint8ClampedArray) => {
      const gray = randInt(4, 28);
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    };

    const clearCanvas = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
    };

    const glitchBlock = (i: number, x: number, y: number) => {
      if (i <= 3) return;

      const spliceHeight = 1 + randInt(0, 10);
      const sourceWidth = Math.max(1, Math.min(width - x, x));

      ctx.drawImage(
        canvas,
        x,
        y,
        sourceWidth,
        spliceHeight,
        randInt(0, Math.max(1, x)),
        y,
        randInt(Math.max(1, x), Math.max(2, width)),
        spliceHeight,
      );
    };

    const glitchLine = (_i: number, _x: number, y: number) => {
      const safeOffset = Math.max(1, Math.floor(width * offsetRatio));
      const spliceHeight = 1 + randInt(1, 50);

      ctx.drawImage(
        canvas,
        safeOffset,
        y,
        width - safeOffset * 2,
        spliceHeight,
        1 + randInt(0, safeOffset * 2),
        y + randInt(0, 10),
        width - safeOffset,
        spliceHeight,
      );
    };

    const drawGlitch = (amount: number, callback: (i: number, x: number, y: number) => void) => {
      for (let i = 0; i < amount; i += 1) {
        const x = Math.floor(Math.random() * width + 1);
        const y = Math.floor(Math.random() * height + 1);
        callback(i, x, y);
      }
    };

    const setupCanvas = () => {
      const pr = window.devicePixelRatio || 1;
      width = Math.floor(window.innerWidth * pr);
      height = Math.floor(window.innerHeight * pr);
      canvas.width = width;
      canvas.height = height;
      offsetRatio = 0.01;
    };

    const glitchAnimation = (timestamp: number) => {
      if (document.hidden) {
        lastFrameTime = timestamp;
        rafId = window.requestAnimationFrame(glitchAnimation);
        return;
      }

      if (timestamp - lastFrameTime < frameInterval) {
        rafId = window.requestAnimationFrame(glitchAnimation);
        return;
      }

      lastFrameTime = timestamp;

      if (currentFrame % totalFrame === 0 || currentFrame > totalFrame || !imgData) {
        clearCanvas();
        imgData = ctx.getImageData(0, 0, width, height);
        imgData = pixelProcessor(imgData, 4, pixelCooler);
        ctx.putImageData(imgData, 0, 0);
        currentFrame = 0;
      }

      if (currentFrame === randInt(0, totalFrame) && imgData) {
        imgData = pixelProcessor(imgData, 1, pixelFlick);
        ctx.putImageData(imgData, 0, 0);

        drawGlitch(randInt(3, 10), glitchBlock);
        drawGlitch(randInt(3, 30), glitchLine);
      }

      currentFrame += 1;
      rafId = window.requestAnimationFrame(glitchAnimation);
    };

    const handleResize = () => {
      setupCanvas();
      imgData = null;
    };

    handleResize();
    rafId = window.requestAnimationFrame(glitchAnimation);
    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleResize);
      window.cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="glitch-image" aria-hidden="true">
      <canvas id="canvas" ref={canvasRef} />
    </div>
  );
}
