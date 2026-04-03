// src/sections/HeroSection.tsx - VERSÃO FINAL E FUNCIONAL

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { motion } from 'framer-motion';
import { TextScramble } from '../components/TextScramble';

type HeroSectionProps = {
  videoUnderTitleProgress?: number;
  isVideoHovering?: boolean;
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
  const overlayRef = useRef<HTMLDivElement>(null);
  const [clipPath, setClipPath] = useState('');

  const channelValue = Math.round(255 * (1 - Math.max(0, Math.min(1, videoUnderTitleProgress))));
  const dynamicColor = `rgb(${channelValue}, ${channelValue}, ${channelValue})`;

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

      let polygonPoints: string[] = [];
      let hasOverlap = false;

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
          hasOverlap = true;

          // Converte para percentuais
          const left = ((x1 - titleRect.left) / titleRect.width) * 100;
          const right = ((x2 - titleRect.left) / titleRect.width) * 100;
          const top = ((y1 - titleRect.top) / titleRect.height) * 100;
          const bottom = ((y2 - titleRect.top) / titleRect.height) * 100;

          // Cria os pontos do polígono
          polygonPoints.push(`${left}% ${top}%`);
          polygonPoints.push(`${right}% ${top}%`);
          polygonPoints.push(`${right}% ${bottom}%`);
          polygonPoints.push(`${left}% ${bottom}%`);
        }
      });

      if (hasOverlap && polygonPoints.length > 0) {
        setClipPath(`polygon(${polygonPoints.join(', ')})`);
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
              color: dynamicColor, 
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
            <div
              ref={overlayRef}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                color: '#000',
                pointerEvents: 'none',
                margin: 0,
                padding: 0,
                clipPath: clipPath,
                transition: 'clip-path 0.05s linear',
                zIndex: 2,
                fontFamily: 'inherit',
                fontSize: 'inherit',
                fontWeight: 'inherit',
                lineHeight: 'inherit',
                letterSpacing: 'inherit',
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
            </div>
          )}
        </div>
      </motion.div>
    </section>
  );
}
