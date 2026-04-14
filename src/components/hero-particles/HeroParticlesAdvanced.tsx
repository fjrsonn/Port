import { useEffect, useMemo, useRef, useState } from 'react';
import { HeroParticlesEngine } from './engine/HeroParticlesEngine';
import type { HeroTransitionPhase, ShapeName } from './engine/types';
import './heroParticles.scss';

type Props = {
  className?: string;
  onShapeChange?: (shape: ShapeName) => void;
  onSampleChange?: (sampleIndex: number) => void;
  onTransitionPhaseChange?: (phase: HeroTransitionPhase) => void;
  onBeforeSampleTransition?: (fromSampleIndex: number, toSampleIndex: number) => Promise<void> | void;
  onBeforeShapeTransition?: (from: ShapeName, to: ShapeName) => Promise<void> | void;
};

export function HeroParticlesAdvanced({
  className = '',
  onShapeChange,
  onSampleChange,
  onTransitionPhaseChange,
  onBeforeSampleTransition,
  onBeforeShapeTransition,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<HeroParticlesEngine | null>(null);
  const onShapeChangeRef = useRef(onShapeChange);
  const onSampleChangeRef = useRef(onSampleChange);
  const onTransitionPhaseChangeRef = useRef(onTransitionPhaseChange);
  const onBeforeSampleTransitionRef = useRef(onBeforeSampleTransition);
  const onBeforeShapeTransitionRef = useRef(onBeforeShapeTransition);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    onShapeChangeRef.current = onShapeChange;
  }, [onShapeChange]);

  useEffect(() => {
    onSampleChangeRef.current = onSampleChange;
  }, [onSampleChange]);

  useEffect(() => {
    onTransitionPhaseChangeRef.current = onTransitionPhaseChange;
  }, [onTransitionPhaseChange]);

  useEffect(() => {
    onBeforeSampleTransitionRef.current = onBeforeSampleTransition;
  }, [onBeforeSampleTransition]);

  useEffect(() => {
    onBeforeShapeTransitionRef.current = onBeforeShapeTransition;
  }, [onBeforeShapeTransition]);

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

    const engine = new HeroParticlesEngine({
      container,
      onShapeChange: (shape) => onShapeChangeRef.current?.(shape),
      onSampleChange: (sampleIndex) => onSampleChangeRef.current?.(sampleIndex),
      onTransitionPhaseChange: (phase) => onTransitionPhaseChangeRef.current?.(phase),
      onBeforeSampleTransition: (fromSampleIndex, toSampleIndex) =>
        onBeforeSampleTransitionRef.current?.(fromSampleIndex, toSampleIndex),
      onBeforeShapeTransition: (from, to) => onBeforeShapeTransitionRef.current?.(from, to),
    });
    engineRef.current = engine;

    engine.init().then(() => {
      if (mounted) setIsReady(true);
    });

    return () => {
      mounted = false;
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className={classNames} aria-hidden="true" />;
}
