import { useEffect, useRef, useState } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

// Animates toward `target` with a plain requestAnimationFrame loop — the
// same "count toward a value" technique motion libraries use internally
// (animate-ui's CountingNumber drives a spring via useMotionValue/useSpring;
// this is the framework-free equivalent, since Ember doesn't depend on
// framer-motion). Deliberately uses a calm ease-out-cubic curve, not an
// overshoot/"back" easing (framer-motion ships backOut/anticipate presets
// for exactly this) — EmberFlow's own Motion Rules explicitly rule out
// bounce/exaggerated motion, and a bouncing price counter reads as gimmicky
// on a billing page, not premium. Tracks the live displayed value in a ref
// (not just the committed target) so an interrupted animation — the target
// changing again mid-count — resumes from wherever it visually was instead
// of jumping.
export function useAnimatedNumber(target, duration = 500) {
  const [value, setValue] = useState(target);
  const displayRef = useRef(target);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia(REDUCED_MOTION_QUERY).matches) {
      displayRef.current = target;
      setValue(target);
      return undefined;
    }
    if (displayRef.current === target) return undefined;

    const from = displayRef.current;
    const start = performance.now();
    let frame;

    function tick(now) {
      const elapsed = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - elapsed) ** 3;
      const next = from + (target - from) * eased;
      displayRef.current = next;
      setValue(next);
      if (elapsed < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        displayRef.current = target;
        setValue(target);
      }
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}
