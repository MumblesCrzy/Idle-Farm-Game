/**
 * Tests for gliding progress: bars and rings glide while their value rises and snap back
 * when it drops, and their fills scale from where they start.
 */
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { glideFill, glideRing, useGlide } from '../hooks/useGlide';

describe('useGlide', () => {
  it('glides while the value rises, and snaps for the render where it drops', () => {
    const { result, rerender } = renderHook(({ value }) => useGlide(value), { initialProps: { value: 40 } });
    expect(result.current).toBe(true);

    rerender({ value: 45 });
    expect(result.current).toBe(true);

    // A harvest: the ring goes straight back to empty
    rerender({ value: 0 });
    expect(result.current).toBe(false);

    rerender({ value: 0 });
    expect(result.current).toBe(false);

    rerender({ value: 5 });
    expect(result.current).toBe(true);
  });
});

describe('glide styles', () => {
  it('scale a bar from the left and a column from the bottom, within 0 and 100%', () => {
    expect(glideFill(25, true)).toEqual({ transform: 'scaleX(0.25)', transformOrigin: 'left', transition: undefined });
    expect(glideFill(140, false, 'y')).toEqual({ transform: 'scaleY(1)', transformOrigin: 'bottom', transition: 'none' });
    expect(glideFill(-3, true).transform).toBe('scaleX(0)');
  });

  it('hand a ring its progress', () => {
    expect(glideRing(39, true)).toEqual({ '--glide-progress': '39%', transition: undefined });
    expect(glideRing(100, false)).toEqual({ '--glide-progress': '100%', transition: 'none' });
  });
});
