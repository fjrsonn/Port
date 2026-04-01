import { useEffect, useState } from 'react';
import type { ElementType, HTMLAttributes } from 'react';

type TextScrambleProps = {
  children: string;
  duration?: number;
  speed?: number;
  characterSet?: string;
  as?: ElementType;
  className?: string;
  trigger?: boolean;
  onScrambleComplete?: () => void;
} & HTMLAttributes<HTMLElement>;

const defaultChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function TextScramble({
  children,
  duration = 0.8,
  speed = 0.04,
  characterSet = defaultChars,
  className,
  as: Component = 'span',
  trigger = true,
  onScrambleComplete,
  ...props
}: TextScrambleProps) {
  const [displayText, setDisplayText] = useState(children);

  useEffect(() => {
    setDisplayText(children);
  }, [children]);

  useEffect(() => {
    if (!trigger) {
      setDisplayText(children);
      return;
    }

    const steps = Math.max(1, Math.floor(duration / speed));
    let step = 0;

    const interval = window.setInterval(() => {
      const progress = step / steps;
      let scrambled = '';

      for (let i = 0; i < children.length; i += 1) {
        if (children[i] === ' ') {
          scrambled += ' ';
        } else if (progress * children.length > i) {
          scrambled += children[i];
        } else {
          scrambled += characterSet[Math.floor(Math.random() * characterSet.length)];
        }
      }

      setDisplayText(scrambled);
      step += 1;

      if (step > steps) {
        window.clearInterval(interval);
        setDisplayText(children);
        onScrambleComplete?.();
      }
    }, speed * 1000);

    return () => window.clearInterval(interval);
  }, [trigger, children, duration, speed, characterSet, onScrambleComplete]);

  return (
    <Component className={className} {...props}>
      {displayText}
    </Component>
  );
}
