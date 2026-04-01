import { useEffect, useState } from 'react';
import type { ElementType, HTMLAttributes } from 'react';

type TextScrambleProps = {
  children: string;
  duration?: number;
  speed?: number;
  characterSet?: string;
  as?: ElementType;
  className?: string;
  triggerKey?: number;
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
  onScrambleComplete,
  ...props
}: TextScrambleProps) {
  const [displayText, setDisplayText] = useState(children);

  useEffect(() => {
    setDisplayText(children);
  }, [children]);

  useEffect(() => {
    if (triggerKey === 0) {
      setDisplayText(children);
      return;
    }

    const steps = Math.max(1, Math.floor(duration / speed));
    let step = 0;

    const interval = window.setInterval(() => {
      const progress = step / steps;
      let scrambled = '';

      for (let i = 0; i < children.length; i += 1) {
        const char = children[i];

        if (!/[A-Za-z0-9]/.test(char)) {
          scrambled += char;
        } else if (progress * children.length > i) {
          scrambled += char;
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

    return () => {
      window.clearInterval(interval);
      setDisplayText(children);
    };
  }, [triggerKey, children, duration, speed, characterSet, onScrambleComplete]);

  return (
    <Component className={className} {...props}>
      {displayText}
    </Component>
  );
}
