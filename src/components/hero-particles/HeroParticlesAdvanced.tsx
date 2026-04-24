import { useEffect, useMemo, useRef, useState } from 'react';
import { HeroParticlesEngine } from './engine/HeroParticlesEngine';
import type { HeroTransitionPhase, ShapeName } from './engine/types';
import './heroParticles.scss';

export type SkillImageVisualState = 'idle' | 'morphing' | 'returning';

type Props = {
  className?: string;
  isExiting?: boolean;
  exitHideDuration?: number;
  initialSampleIndex?: number;
  initialLoadRevealMode?: 'animated' | 'settled';
  initialLoadRevealDelayMs?: number;
  lockSample?: boolean;
  transitionTargetSampleIndex?: number | null;
  transitionRequestId?: number;
  transitionSkipFinalSampleLoad?: boolean;
  imageTarget?: string | null;
  particleOpacity?: number;
  particleDissolveProgress?: number;
  onImageVisualStateChange?: (state: SkillImageVisualState) => void;
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
  initialLoadRevealMode = 'animated',
  initialLoadRevealDelayMs = 0,
  lockSample = false,
  transitionTargetSampleIndex = null,
  transitionRequestId = 0,
  transitionSkipFinalSampleLoad = false,
  imageTarget = null,
  particleOpacity = 1,
  particleDissolveProgress = 0,
  onImageVisualStateChange,
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
  const onImageVisualStateChangeRef = useRef(onImageVisualStateChange);
  const onBeforeSampleTransitionRef = useRef(onBeforeSampleTransition);
  const onBeforeShapeTransitionRef = useRef(onBeforeShapeTransition);
  const particleOpacityRef = useRef(particleOpacity);
  const particleDissolveProgressRef = useRef(particleDissolveProgress);
  const hasAppliedInitialParticleOpacityRef = useRef(false);
  const hasAppliedInitialParticleDissolveRef = useRef(false);
  const hasRunExitHideRef = useRef(false);
  const requestedSkillImageTargetRef = useRef<string | null>(null);
  const processedSkillImageTargetRef = useRef<string | null>(null);
  const isSkillImageQueueRunningRef = useRef(false);
  const isMountedRef = useRef(false);
  const skillImageTimersRef = useRef<Set<number>>(new Set());
  const skillImageTimerResolversRef = useRef<Map<number, () => void>>(new Map());
  const [isReady, setIsReady] = useState(false);
  const [solidSkillImageSrc, setSolidSkillImageSrc] = useState('');
  const [isSolidSkillImageVisible, setIsSolidSkillImageVisible] = useState(false);

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
    onImageVisualStateChangeRef.current = onImageVisualStateChange;
  }, [onImageVisualStateChange]);

  useEffect(() => {
    onBeforeSampleTransitionRef.current = onBeforeSampleTransition;
  }, [onBeforeSampleTransition]);

  useEffect(() => {
    onBeforeShapeTransitionRef.current = onBeforeShapeTransition;
  }, [onBeforeShapeTransition]);

  useEffect(() => {
    particleOpacityRef.current = particleOpacity;
  }, [particleOpacity]);

  useEffect(() => {
    particleDissolveProgressRef.current = particleDissolveProgress;
  }, [particleDissolveProgress]);

  const classNames = useMemo(() => {
    const base = 'hero-particle-stage';
    const ready = isReady ? ' is-ready' : '';
    const extra = className ? ` ${className}` : '';
    return `${base}${ready}${extra}`;
  }, [className, isReady]);

  const clearSkillImageTimers = () => {
    skillImageTimersRef.current.forEach((timer) => {
      window.clearTimeout(timer);
      skillImageTimerResolversRef.current.get(timer)?.();
    });
    skillImageTimersRef.current.clear();
    skillImageTimerResolversRef.current.clear();
  };

  const waitForSkillImageStep = (ms: number) =>
    new Promise<void>((resolve) => {
      const timer = window.setTimeout(() => {
        skillImageTimersRef.current.delete(timer);
        skillImageTimerResolversRef.current.delete(timer);
        resolve();
      }, ms);

      skillImageTimersRef.current.add(timer);
      skillImageTimerResolversRef.current.set(timer, resolve);
    });

  const processSkillImageQueue = async () => {
    if (!isReady || isSkillImageQueueRunningRef.current) return;

    const engine = engineRef.current;
    if (!engine) return;

    isSkillImageQueueRunningRef.current = true;

    try {
      while (isMountedRef.current && engineRef.current) {
        const nextTarget = requestedSkillImageTargetRef.current;
        const currentTarget = processedSkillImageTargetRef.current;

        if (nextTarget === currentTarget) break;

        clearSkillImageTimers();

        if (currentTarget) {
          onImageVisualStateChangeRef.current?.('returning');
          engine.setSkillParticlesVisible(particleOpacityRef.current > 0.01);
          engine.setSkillParticlesOpacity(particleOpacityRef.current);

          if (particleDissolveProgressRef.current > 0.01) {
            setIsSolidSkillImageVisible(false);
            await waitForSkillImageStep(220);
            if (!isMountedRef.current) break;

            setSolidSkillImageSrc('');
            processedSkillImageTargetRef.current = null;
            engine.setSkillParticlesDissolveProgress(particleDissolveProgressRef.current);
            onImageVisualStateChangeRef.current?.('idle');
            await waitForSkillImageStep(80);
            if (!isMountedRef.current) break;
            continue;
          }

          const materializePromise = engine.materializeCurrentProfileParticles(0.48);
          setIsSolidSkillImageVisible(false);

          await waitForSkillImageStep(130);
          if (!isMountedRef.current) break;

          const materialized = await materializePromise;
          if (!materialized || !isMountedRef.current) break;

          await waitForSkillImageStep(70);
          if (!isMountedRef.current) break;

          setSolidSkillImageSrc('');
          processedSkillImageTargetRef.current = null;
          onImageVisualStateChangeRef.current?.('idle');
          await waitForSkillImageStep(80);
          if (!isMountedRef.current) break;
          continue;
        }

        if (nextTarget) {
          onImageVisualStateChangeRef.current?.('morphing');
          setSolidSkillImageSrc(nextTarget);
          setIsSolidSkillImageVisible(false);
          engine.setSkillParticlesVisible(particleOpacityRef.current > 0.01);
          engine.setSkillParticlesOpacity(particleOpacityRef.current);
          engine.setSkillParticlesDissolveProgress(particleDissolveProgressRef.current);

          const dissolvePromise = engine.dissolveCurrentProfileParticles(0.62);

          await waitForSkillImageStep(120);
          if (!isMountedRef.current) break;

          setSolidSkillImageSrc(nextTarget);
          setIsSolidSkillImageVisible(true);

          const dissolved = await dissolvePromise;
          if (!dissolved || !isMountedRef.current) break;

          await waitForSkillImageStep(90);
          if (!isMountedRef.current) break;

          engine.setSkillParticlesVisible(false);
          processedSkillImageTargetRef.current = nextTarget;
          continue;
        }
      }
    } finally {
      isSkillImageQueueRunningRef.current = false;

      if (
        isMountedRef.current &&
        requestedSkillImageTargetRef.current !== processedSkillImageTargetRef.current
      ) {
        void processSkillImageQueue();
      }
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let mounted = true;
    isMountedRef.current = true;

    const engine = new HeroParticlesEngine({
      container,
      initialSampleIndex,
      initialLoadRevealMode,
      initialLoadRevealDelayMs,
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
      isMountedRef.current = false;
      clearSkillImageTimers();
      engine.destroy();
      engineRef.current = null;
      onImageVisualStateChangeRef.current?.('idle');
    };
  }, [initialLoadRevealDelayMs, initialLoadRevealMode, initialSampleIndex, lockSample]);

  useEffect(() => {
    if (transitionRequestId === 0) return;
    if (transitionTargetSampleIndex === null) return;
    void engineRef.current?.goTo(transitionTargetSampleIndex, true, {
      skipFinalSampleLoad: transitionSkipFinalSampleLoad,
    });
  }, [transitionRequestId, transitionSkipFinalSampleLoad, transitionTargetSampleIndex]);

  useEffect(() => {
    if (!isReady) return;

    const normalizedImageTarget = imageTarget?.trim();
    requestedSkillImageTargetRef.current = normalizedImageTarget && normalizedImageTarget.length > 0
      ? normalizedImageTarget
      : null;
    void processSkillImageQueue();
  }, [imageTarget, isReady]);

  useEffect(() => {
    if (!isReady) return;

    const nextOpacity = Math.min(1, Math.max(0, particleOpacity));
    if (!hasAppliedInitialParticleOpacityRef.current) {
      hasAppliedInitialParticleOpacityRef.current = true;
      if (Math.abs(nextOpacity - 1) < 0.0001) {
        return;
      }
    }

    engineRef.current?.setSkillParticlesVisible(nextOpacity > 0.01);
    engineRef.current?.setSkillParticlesOpacity(nextOpacity);
  }, [isReady, particleOpacity]);

  useEffect(() => {
    if (!isReady) return;

    const nextProgress = Math.min(1, Math.max(0, particleDissolveProgress));
    if (!hasAppliedInitialParticleDissolveRef.current) {
      hasAppliedInitialParticleDissolveRef.current = true;
      if (nextProgress <= 0.0001) {
        return;
      }
    }

    engineRef.current?.setSkillParticlesDissolveProgress(nextProgress);
  }, [isReady, particleDissolveProgress]);

  useEffect(() => {
    if (!isExiting) {
      hasRunExitHideRef.current = false;
      return;
    }

    if (hasRunExitHideRef.current) return;
    hasRunExitHideRef.current = true;
    void engineRef.current?.hideCurrent(exitHideDuration);
  }, [exitHideDuration, isExiting]);

  return (
    <div className={classNames} aria-hidden="true">
      <div ref={containerRef} className="hero-particle-canvas-layer" />
      {solidSkillImageSrc && (
        <img
          className={`hero-particle-solid-image${isSolidSkillImageVisible ? ' is-visible' : ''}`}
          src={solidSkillImageSrc}
          alt=""
        />
      )}
    </div>
  );
}
