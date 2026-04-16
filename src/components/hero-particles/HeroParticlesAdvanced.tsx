import { useEffect, useMemo, useRef, useState } from 'react';
import { HeroParticlesEngine } from './engine/HeroParticlesEngine';
import type { HeroTransitionPhase, ShapeName } from './engine/types';
import './heroParticles.scss';

type Props = {
  className?: string;
  isExiting?: boolean;
  exitHideDuration?: number;
  initialSampleIndex?: number;
  lockSample?: boolean;
  transitionTargetSampleIndex?: number | null;
  transitionRequestId?: number;
  transitionSkipFinalSampleLoad?: boolean;
  onShapeChange?: (shape: ShapeName) => void;
  onSampleChange?: (sampleIndex: number) => void;
  onTransitionPhaseChange?: (phase: HeroTransitionPhase) => void;
  onBeforeSampleTransition?: (fromSampleIndex: number, toSampleIndex: number) => Promise<void> | void;
  onBeforeShapeTransition?: (from: ShapeName, to: ShapeName) => Promise<void> | void;
};

export function HeroParticlesAdvanced({
  className = '',
  isExiting = false,
  exitHideDuration = 0.82,
  initialSampleIndex = 0,
  lockSample = false,
  transitionTargetSampleIndex = null,
  transitionRequestId = 0,
  transitionSkipFinalSampleLoad = false,
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
  const hasRunExitHideRef = useRef(false);
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
      initialSampleIndex,
      lockSample,
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
  }, [initialSampleIndex, lockSample]);

  useEffect(() => {
    if (transitionRequestId === 0) return;
    if (transitionTargetSampleIndex === null) return;
    void engineRef.current?.goTo(transitionTargetSampleIndex, true, {
      skipFinalSampleLoad: transitionSkipFinalSampleLoad,
    });
  }, [transitionRequestId, transitionSkipFinalSampleLoad, transitionTargetSampleIndex]);

  useEffect(() => {
    if (!isExiting) {
      hasRunExitHideRef.current = false;
      return;
    }

    if (hasRunExitHideRef.current) return;
    hasRunExitHideRef.current = true;
    void engineRef.current?.hideCurrent(exitHideDuration);
  }, [exitHideDuration, isExiting]);

  return <div ref={containerRef} className={classNames} aria-hidden="true" />;
}
