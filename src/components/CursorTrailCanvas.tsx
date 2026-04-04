import { useEffect, useRef } from 'react';

type Rect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

const CURSOR_FRAME_SIZE = 34;
const TITLE_PROXIMITY_PADDING = 90;

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
    let pointerX = window.innerWidth / 2;
    let pointerY = window.innerHeight / 2;
    let cursorFrameAlpha = 0;
    let shouldShowCursorFrame = false;

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

    const getHeroTitleRect = (): Rect | null => {
      const titleNode = document.querySelector('.hero-title-live');
      if (!titleNode) {
        return null;
      }

      const rect = titleNode.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
      };
    };

    const isPointerNearRect = (x: number, y: number, rect: Rect) => {
      return (
        x >= rect.left - TITLE_PROXIMITY_PADDING &&
        x <= rect.right + TITLE_PROXIMITY_PADDING &&
        y >= rect.top - TITLE_PROXIMITY_PADDING &&
        y <= rect.bottom + TITLE_PROXIMITY_PADDING
      );
    };

    const onPointerMove = (event: PointerEvent) => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      pointerX = event.clientX;
      pointerY = event.clientY;

      const heroRect = getHeroTitleRect();
      shouldShowCursorFrame = heroRect ? isPointerNearRect(pointerX, pointerY, heroRect) : false;
    };

    const render = () => {
      if (document.visibilityState !== 'visible') {
        context.clearRect(0, 0, width, height);
        rafId = window.requestAnimationFrame(render);
        return;
      }

      context.clearRect(0, 0, width, height);

      const cursorFrameTargetAlpha = shouldShowCursorFrame ? 1 : 0;
      cursorFrameAlpha += (cursorFrameTargetAlpha - cursorFrameAlpha) * 0.18;

      if (cursorFrameAlpha > 0.02) {
        context.save();
        context.strokeStyle = `rgba(255, 255, 255, ${cursorFrameAlpha * 0.9})`;
        context.lineWidth = 1.2;
        context.strokeRect(
          pointerX - CURSOR_FRAME_SIZE / 2,
          pointerY - CURSOR_FRAME_SIZE / 2,
          CURSOR_FRAME_SIZE,
          CURSOR_FRAME_SIZE,
        );
        context.restore();
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
