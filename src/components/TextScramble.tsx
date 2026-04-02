import { useEffect, useRef, useState } from 'react';
import type { ElementType, HTMLAttributes } from 'react';

type TextScrambleProps = {
  children: string;
  duration?: number;
  speed?: number;
  characterSet?: string;
  as?: ElementType;
  className?: string;
  triggerKey?: number;
  isActive?: boolean;
  onScrambleComplete?: () => void;
} & HTMLAttributes<HTMLElement>;

const defaultChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function TextScramble({
  children,
  duration = 3,
  speed = 0.045,
  characterSet = defaultChars,
  className,
  as: Component = 'span',
  triggerKey = 0,
  isActive = true,
  onScrambleComplete,
  ...props
}: TextScrambleProps) {
  const [displayText, setDisplayText] = useState(children);
  const timeoutRef = useRef<number | null>(null);
  const animationTokenRef = useRef(0);
  const latestTextRef = useRef(children);
  const onScrambleCompleteRef = useRef(onScrambleComplete);

  useEffect(() => {
    latestTextRef.current = children;
  }, [children]);

  useEffect(() => {
    onScrambleCompleteRef.current = onScrambleComplete;
  }, [onScrambleComplete]);

  const finishAnimation = (token?: number, shouldNotify = false) => {
    if (typeof token === 'number' && token !== animationTokenRef.current) {
      return;
    }

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setDisplayText(latestTextRef.current);
    if (shouldNotify) {
      onScrambleCompleteRef.current?.();
    }
  };

  useEffect(() => {
    animationTokenRef.current += 1;
    const token = animationTokenRef.current;

    finishAnimation();

    if (!isActive) {
      return;
    }

    if (triggerKey === 0) {
      setDisplayText(children);
      return;
    }

    const totalMs = Math.max(1, duration * 1000);
    const tickMs = Math.max(16, speed * 1000);
    const totalSteps = Math.max(1, Math.ceil(totalMs / tickMs));
    let step = 0;

    const runStep = () => {
      if (token !== animationTokenRef.current) return;

      step += 1;
      const progress = Math.min(1, step / totalSteps);
      const revealCount = Math.floor(progress * children.length);
      let scrambled = '';

      for (let i = 0; i < children.length; i += 1) {
        const char = children[i];

        if (!/[A-Za-z0-9]/.test(char)) {
          scrambled += char;
        } else if (i < revealCount) {
          scrambled += char;
        } else {
          scrambled += characterSet[Math.floor(Math.random() * characterSet.length)] ?? char;
        }
      }

      if (progress >= 1) {
        finishAnimation(token, true);
        return;
      }

      setDisplayText(scrambled);
      timeoutRef.current = window.setTimeout(runStep, tickMs);
    };

    timeoutRef.current = window.setTimeout(runStep, tickMs);

    return () => {
      finishAnimation(token);
    };
  }, [isActive, triggerKey, children, duration, speed, characterSet]);

  useEffect(() => {
    if (isActive) {
      setDisplayText(latestTextRef.current + 'FJR.');
    }
  }, [isActive]);

  return (
    <Component className={className} {...props}>
      {displayText}
    </Component>
  );
}