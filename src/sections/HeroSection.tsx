import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

const HeroSection = ({ videoUnderTitleProgress }) => {
  const overlayRef = useRef(null);
  const titleRef = useRef(null);

  useEffect(() => {
    // function to update the clip-path based on the title's position and video progression
    const updateClipPath = () => {
      const titleRect = titleRef.current.getBoundingClientRect();
      const overlay = overlayRef.current;

      // Calculate the clip-path polygon points based on the intersection
      const offset = window.innerHeight - titleRect.top;

      // Example calculation based on videoUnderTitleProgress
      const clipPathValue = `polygon(0% 0%, 100% 0%, 100% ${videoUnderTitleProgress * 100}%, 0% ${videoUnderTitleProgress * 100}%`;

      overlay.style.clipPath = clipPathValue;

      // Request the next animation frame
      requestAnimationFrame(updateClipPath);
    };

    requestAnimationFrame(updateClipPath);
  }, [videoUnderTitleProgress]);

  return (
    <div className='hero-section'>
      <h1 ref={titleRef} className='hero-title'>FJR.</h1>
      <div ref={overlayRef} className='overlay'>FJR.</div>
    </div>
  );
};

export default HeroSection;
