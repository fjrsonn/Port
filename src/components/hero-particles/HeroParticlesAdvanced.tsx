import { useEffect, useMemo, useRef, useState } from 'react';
import { HeroParticlesEngine } from './engine/HeroParticlesEngine';
import type { ShapeName } from './engine/types';
import './heroParticles.scss';

type Props = {
  className?: string;
  onShapeChange?: (shape: ShapeName) => void;
};

export function HeroParticlesAdvanced({ className = '', onShapeChange }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<HeroParticlesEngine | null>(null);
  const [isReady, setIsReady] = useState(false);

  const classNames = useMemo(() => {
    const base = 'hero-particle-stage';
    const ready = isReady ? ' is-ready' : '';
    const extra = className ? ` ${className}` : '';
    return `${base}${ready}${extra}`;
  }, [className, isReady]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let mounted = true;

    const engine = new HeroParticlesEngine({ container, onShapeChange });
    engineRef.current = engine;

    engine.init().then(() => {
      if (mounted) setIsReady(true);
    });

    return () => {
      mounted = false;
      engine.destroy();
      engineRef.current = null;
    };
  }, [onShapeChange]);

  return <div ref={containerRef} className={classNames} aria-hidden="true" />;
}