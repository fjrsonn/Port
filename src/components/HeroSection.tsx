import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { motion } from 'framer-motion';

type HeroSectionProps = {
  videoUnderTitleProgress?: number;
  isVideoHovering?: boolean;
};

export function HeroSection({ videoUnderTitleProgress = 0, isVideoHovering = false }: HeroSectionProps) {
  const [hovered, setHovered] = useState(false);
  const pointerInsideRef = useRef(false);
  const isScrollLockedRef = useRef(false);
  const scrollUnlockTimerRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const titleWrapperRef = useRef<HTMLDivElement>(null);
  const [maskImage, setMaskImage] = useState<string>('');
  
  const channelValue = Math.round(255 * (1 - Math.max(0, Math.min(1, videoUnderTitleProgress))));
  const dynamicColor = `rgb(${channelValue}, ${channelValue}, ${channelValue})`;

  useEffect(() => {
    return () => {
      if (scrollUnlockTimerRef.current) {
        window.clearTimeout(scrollUnlockTimerRef.current);
      }
    };
  }, []);

  // Calculate and update the mask based on video overlap
  useEffect(() => {
    const updateMask = () => {
      const heroTitle = document.querySelector('.hero-title');
      const canvas = canvasRef.current;
      const titleWrapper = titleWrapperRef.current;

      if (!heroTitle || !canvas || !titleWrapper || !(heroTitle instanceof HTMLElement)) {
        return;
      }

      const titleRect = heroTitle.getBoundingClientRect();
      // Set canvas size to match title
      canvas.width = titleRect.width;
      canvas.height = titleRect.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Fill with white by default
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Get all video elements and calculate overlaps
      const videos = document.querySelectorAll('.project-video');
      videos.forEach((video) => {
        if (!(video instanceof HTMLElement)) return;
        
        const videoRect = video.getBoundingClientRect();
        
        // Calculate overlap region relative to title
        const overlapLeft = Math.max(0, videoRect.left - titleRect.left);
        const overlapTop = Math.max(0, videoRect.top - titleRect.top);
        const overlapRight = Math.min(titleRect.width, videoRect.right - titleRect.left);
        const overlapBottom = Math.min(titleRect.height, videoRect.bottom - titleRect.top);

        // Draw black rectangle for overlap area
        if (overlapRight > overlapLeft && overlapBottom > overlapTop) {
          ctx.fillStyle = '#000000';
          ctx.fillRect(overlapLeft, overlapTop, overlapRight - overlapLeft, overlapBottom - overlapTop);
        }
      });

      // Convert canvas to data URL for mask-image
      const dataUrl = canvas.toDataURL('image/png');
      setMaskImage(dataUrl);
    };

    // Update on scroll/animation
    const animationFrameId = requestAnimationFrame(updateMask);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [videoUnderTitleProgress]);

  const handleTitlePointerEnter = () => {
    pointerInsideRef.current = true;
    setHovered(true);
  };

  const handleTitlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointerInsideRef.current) return;
    if (event.pointerType !== 'mouse') return;
    if (isScrollLockedRef.current) return;
    if (event.movementX === 0 && event.movementY === 0) return;
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

  const handleTitlePointerLeave = () => {
    pointerInsideRef.current = false;
    setHovered(false);
  };

  return (
    <section className="hero-section" id="inicio">
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <motion.div
        ref={titleWrapperRef}
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
        <h1 
          className={`hero-title ${hovered ? 'is-glow' : ''}`}
          style={{
            color: dynamicColor,
            backgroundImage: maskImage ? `url(${maskImage})` : 'none',
            backgroundSize: '100% 100%',
            backgroundPosition: '0 0',
            backgroundRepeat: 'no-repeat',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            position: 'relative',
          }}
        >
          FJR.
        </h1>
      </motion.div>
    </section>
  );
}
