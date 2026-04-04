import { useEffect, useRef } from 'react';

type TrailSquare = {
  x: number;
  y: number;
  size: number;
  rotation: number;
  alpha: number;
  decay: number;
};

const MAX_SQUARES = 28;
const BASE_SIZE = 18;
const MAX_SIZE_BOOST = 34;

export function CursorTrailCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) {
      return;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    let rafId = 0;
    let width = 0;
    let height = 0;
    let lastX = window.innerWidth / 2;
    let lastY = window.innerHeight / 2;
    let lastTimestamp = performance.now();
    const squares: TrailSquare[] = [];

    const setCanvasSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const spawnSquare = (x: number, y: number, velocity: number) => {
      const normalizedVelocity = Math.min(velocity / 1600, 1);
      const size = BASE_SIZE + normalizedVelocity * MAX_SIZE_BOOST;

      squares.push({
        x,
        y,
        size,
        rotation: Math.random() * Math.PI,
        alpha: 0.55 + normalizedVelocity * 0.35,
        decay: 0.025 + Math.random() * 0.022,
      });

      if (squares.length > MAX_SQUARES) {
        squares.shift();
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (document.visibilityState !== 'visible') {
        return;
      }
      const now = performance.now();
      const deltaTime = Math.max(now - lastTimestamp, 16);
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      const distance = Math.hypot(dx, dy);
      const velocity = (distance / deltaTime) * 1000;

      const spawnCount = velocity > 1100 ? 2 : 1;
      for (let i = 0; i < spawnCount; i += 1) {
        spawnSquare(
          event.clientX - dx * (i * 0.26),
          event.clientY - dy * (i * 0.26),
          velocity,
        );
      }

      lastX = event.clientX;
      lastY = event.clientY;
      lastTimestamp = now;
    };

    const render = () => {
      if (document.visibilityState !== 'visible') {
        context.clearRect(0, 0, width, height);
        rafId = window.requestAnimationFrame(render);
        return;
      }

      context.clearRect(0, 0, width, height);

      for (const square of squares) {
        context.save();
        context.translate(square.x, square.y);
        context.rotate(square.rotation);
        context.strokeStyle = `rgba(255, 255, 255, ${Math.max(square.alpha, 0)})`;
        context.lineWidth = 1.2;
        context.strokeRect(-square.size / 2, -square.size / 2, square.size, square.size);
        context.restore();

        square.alpha -= square.decay;
        square.size += 0.22;
      }

      while (squares.length && squares[0].alpha <= 0) {
        squares.shift();
      }

      rafId = window.requestAnimationFrame(render);
    };

    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);
    window.addEventListener('pointermove', onPointerMove);
    rafId = window.requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', setCanvasSize);
      window.removeEventListener('pointermove', onPointerMove);
      window.cancelAnimationFrame(rafId);
    };
  }, []);

  return <canvas className="cursor-trail-canvas" ref={canvasRef} aria-hidden="true" />;
}
