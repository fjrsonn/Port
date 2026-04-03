// src/sections/HeroSection.tsx - VERSÃO FINAL E FUNCIONAL

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { motion } from 'framer-motion';
import { TextScramble } from '../components/TextScramble';

type HeroSectionProps = {
  videoUnderTitleProgress?: number;
  isVideoHovering?: boolean;
};

type OverlapRect = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  area: number;
};

export function HeroSection({ videoUnderTitleProgress = 0, isVideoHovering = false }: HeroSectionProps) {
  const [hovered, setHovered] = useState(false);
  const isScramblingRef = useRef(false);
  const pointerInsideRef = useRef(false);
  const isScrollLockedRef = useRef(false);
  const scrollUnlockTimerRef = useRef<number | null>(null);
  const [scrambleKey, setScrambleKey] = useState(0);
  
  // ✅ Refs para mascaramento de texto
  const titleRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLHeadingElement>(null);
  const [clipPath, setClipPath] = useState('');

  useEffect(() => {
    return () => {
      if (scrollUnlockTimerRef.current) {
        window.clearTimeout(scrollUnlockTimerRef.current);
      }
    };
  }, []);

  // ✅ Atualiza o clip-path conforme vídeos passam
  useEffect(() => {
    const updateClipPath = () => {
      if (!titleRef.current) return;

      const titleRect = titleRef.current.getBoundingClientRect();
      const videos = document.querySelectorAll('.project-video');

      let bestOverlap: OverlapRect | undefined;

      videos.forEach((video) => {
        if (!(video instanceof HTMLElement)) return;
        const videoRect = video.getBoundingClientRect();

        // Calcula a interseção entre título e vídeo
        const x1 = Math.max(titleRect.left, videoRect.left);
        const x2 = Math.min(titleRect.right, videoRect.right);
        const y1 = Math.max(titleRect.top, videoRect.top);
        const y2 = Math.min(titleRect.bottom, videoRect.bottom);

        // Se houver interseção
        if (x1 < x2 && y1 < y2) {
          const area = (x2 - x1) * (y2 - y1);
          if (!bestOverlap || area > bestOverlap.area) {
            bestOverlap = { left: x1, right: x2, top: y1, bottom: y2, area };
          }
        }
      });

      const overlap = bestOverlap;
      if (overlap) {
        const left = ((overlap.left - titleRect.left) / titleRect.width) * 100;
        const right = ((overlap.right - titleRect.left) / titleRect.width) * 100;
        const top = ((overlap.top - titleRect.top) / titleRect.height) * 100;
        const bottom = ((overlap.bottom - titleRect.top) / titleRect.height) * 100;
        setClipPath(`inset(${top}% ${100 - right}% ${100 - bottom}% ${left}%)`);
      } else {
        setClipPath('');
      }
    };

    const frameId = requestAnimationFrame(updateClipPath);
    return () => cancelAnimationFrame(frameId);
  }, [videoUnderTitleProgress]);

  const startScramble = () => {
    if (isScramblingRef.current) return;
    isScramblingRef.current = true;
    setScrambleKey((prev) => prev + 1);
  };

  const handleTitlePointerEnter = () => {
    pointerInsideRef.current = true;
    setHovered(true);
  };

  const handleTitlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointerInsideRef.current) return;
    if (event.pointerType !== 'mouse') return;
    if (isScrollLockedRef.current) return;
    if (event.movementX === 0 && event.movementY === 0) return;
    startScramble();
  };

  const handleTitleWheel = () => {
    isScrollLockedRef.current = true;
    if (scrollUnlockTimerRef.current) {
      window.clearTimeout(scrollUnlockTimerRef.current);
    }
    scrollUnlockTimerRef.current = window.setTimeout(() => {
      isScrollLockedRef.current = false;
      scrollUnlockTimerRef.current = null;
    }, 180);
  };

  const handleScrambleComplete = useCallback(() => {
    isScramblingRef.current = false;
  }, []);

  const handleTitlePointerLeave = () => {
    pointerInsideRef.current = false;
    setHovered(false);
  };

  return (
    <section className="hero-section" id="inicio">
      <motion.div
        className="hero-title-wrapper"
        initial={{ opacity: 0, filter: 'blur(6px)' }}
        animate={{ opacity: isVideoHovering ? 0 : 1, filter: isVideoHovering ? 'blur(6px)' : 'blur(0px)' }}
        style={{ pointerEvents: isVideoHovering ? 'none' : 'auto' }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        onPointerEnter={handleTitlePointerEnter}
        onPointerMove={handleTitlePointerMove}
        onPointerLeave={handleTitlePointerLeave}
        onWheel={handleTitleWheel}
      >
        {/* ✅ Container para mascaramento */}
        <div 
          ref={titleRef} 
          style={{ 
            position: 'relative', 
            display: 'inline-block',
            margin: 0
          }}
        >
          {/* Texto branco original */}
          <h1 
            className={`hero-title ${hovered ? 'is-glow' : ''}`} 
            style={{ 
              color: '#fff',
              margin: 0,
              position: 'relative',
              zIndex: 1
            }}
          >
            <TextScramble
              as="span"
              triggerKey={scrambleKey}
              duration={3}
              speed={0.045}
              onScrambleComplete={handleScrambleComplete}
            >
              FJR.
            </TextScramble>
          </h1>

          {/* ✅ Overlay preto com clip-path dinâmico */}
          {clipPath && (
            <h1
              ref={overlayRef}
              className="hero-title hero-title-overlay"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                margin: 0,
                color: '#000000',
                pointerEvents: 'none',
                clipPath: clipPath,
                transition: videoUnderTitleProgress > 0 ? 'none' : 'clip-path 0.08s linear',
                zIndex: 2,
              }}
            >
              <TextScramble
                as="span"
                triggerKey={scrambleKey}
                duration={3}
                speed={0.045}
                onScrambleComplete={handleScrambleComplete}
              >
                FJR.
              </TextScramble>
            </h1>
          )}
        </div>
      </motion.div>
    </section>
  );
}
