import { useState, type CSSProperties } from 'react';

/**
 * Progress that glides. Bars and rings move once a game step; the glide classes in index.css
 * spread each move over the step, so they fill smoothly instead of jumping every second.
 */

/**
 * Whether a bar or ring should glide to its value this render: while the value rises. When it
 * drops back, like a crop just harvested or a hive's batch just made, it snaps there instead of
 * sliding backwards, so this is false for the render where the value drops.
 */
export function useGlide(value: number): boolean {
  const [last, setLast] = useState({ value, glides: true });
  if (value !== last.value) {
    const next = { value, glides: value > last.value };
    setLast(next);
    return next.glides;
  }
  return last.glides;
}

/**
 * A bar's fill, with the glide class: scaled to its share rather than sized, so the browser
 * glides it without laying the page out again. A bar fills from the left, a column from the bottom.
 */
export function glideFill(percent: number, glides: boolean, axis: 'x' | 'y' = 'x'): CSSProperties {
  const share = Math.min(100, Math.max(0, percent)) / 100;
  return {
    transform: axis === 'x' ? `scaleX(${share})` : `scaleY(${share})`,
    transformOrigin: axis === 'x' ? 'left' : 'bottom',
    transition: glides ? undefined : 'none'
  };
}

/** A ring drawn from --glide-progress, with the glide-ring class */
export function glideRing(percent: number, glides: boolean): CSSProperties {
  return {
    '--glide-progress': `${Math.min(100, Math.max(0, percent))}%`,
    transition: glides ? undefined : 'none'
  } as CSSProperties;
}
