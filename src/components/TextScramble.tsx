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
  const intervalRef = useRef<number | null>(null);
  const animationTokenRef = useRef(0);

  useEffect(() => {
    animationTokenRef.current += 1;
    const token = animationTokenRef.current;

    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!isActive) {
      setDisplayText(children);
      return;
    }

    if (triggerKey === 0) {
      setDisplayText(children);
      return;
    }

    const totalMs = Math.max(1, duration * 1000);
    const tickMs = Math.max(16, speed * 1000);
    const startAt = performance.now();

    intervalRef.current = window.setInterval(() => {
      if (token !== animationTokenRef.current) return;

      const elapsed = performance.now() - startAt;
      const progress = Math.min(1, elapsed / totalMs);
      let scrambled = '';

      for (let i = 0; i < children.length; i += 1) {
        const char = children[i];

        if (!/[A-Za-z0-9]/.test(char)) {
          scrambled += char;
        } else if (progress * children.length > i) {
          scrambled += char;
        } else {
          scrambled += characterSet[Math.floor(Math.random() * characterSet.length)] ?? char;
        }
      }

      if (progress >= 1) {
        if (intervalRef.current) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setDisplayText(children);
        onScrambleComplete?.();
        return;
      }

      setDisplayText(scrambled);
    }, tickMs);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, triggerKey, children, duration, speed, characterSet, onScrambleComplete]);

  return (
    <Component className={className} {...props}>
      {displayText}
    </Component>
  );
}
