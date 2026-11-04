import React, { useState, useEffect, useRef } from 'react';

interface ScrambleNumberProps {
  value: number;
  formatter?: (val: number) => string;
  triggerKey?: any;
  duration?: number;
  className?: string;
}

const RANDOM_DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

export const ScrambleNumber: React.FC<ScrambleNumberProps> = ({
  value,
  formatter,
  triggerKey,
  duration = 460,
  className
}) => {
  const safeVal = Number.isFinite(Number(value)) ? Number(value) : 0;
  const targetStr = formatter 
    ? formatter(safeVal) 
    : Math.round(safeVal).toLocaleString('en-IN');

  const [displayText, setDisplayText] = useState<string>(targetStr);
  const animRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  useEffect(() => {
    // Collect indices of all numeric digits
    const chars = targetStr.split('');
    const digitIndices: number[] = [];
    chars.forEach((c, i) => {
      if (/\d/.test(c)) {
        digitIndices.push(i);
      }
    });

    if (digitIndices.length === 0) {
      setDisplayText(targetStr);
      return;
    }

    const startTime = performance.now();
    lastTickRef.current = startTime;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Throttle random scramble ticks to ~32ms (approx 30fps shuffle for crisp visibility)
      const shouldShuffle = now - lastTickRef.current >= 32 || progress >= 1;
      if (shouldShuffle) {
        lastTickRef.current = now;

        const currentChars = [...chars];
        const totalDigits = digitIndices.length;

        digitIndices.forEach((charIdx, dOrder) => {
          // Stagger lock-in: earlier digits lock starting around 45% progress,
          // remaining digits cascade and lock until 100%
          const lockThreshold = 0.45 + 0.55 * ((dOrder + 1) / totalDigits);

          if (progress >= lockThreshold || progress >= 1) {
            currentChars[charIdx] = chars[charIdx];
          } else {
            // Random rolling digit
            const randIdx = Math.floor(Math.random() * RANDOM_DIGITS.length);
            currentChars[charIdx] = RANDOM_DIGITS[randIdx];
          }
        });

        setDisplayText(currentChars.join(''));
      }

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayText(targetStr);
        animRef.current = null;
      }
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, [targetStr, triggerKey, duration]);

  return <span className={className}>{displayText}</span>;
};

export default ScrambleNumber;
