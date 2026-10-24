/**
 * Tests for useStableCallback: one identity for the component's life, the callback from the
 * latest render, and the same render's callback inside that render's effects.
 */
import { describe, it, expect } from 'vitest';
import { useEffect } from 'react';
import { renderHook } from '@testing-library/react';
import { useStableCallback } from '../hooks/useStableCallback';

describe('useStableCallback', () => {
  it('keeps one identity and runs the callback from the latest render', () => {
    const { result, rerender } = renderHook(
      ({ step }) => useStableCallback((extra: number) => step + extra),
      { initialProps: { step: 1 } }
    );
    const first = result.current;
    expect(first(10)).toBe(11);

    rerender({ step: 2 });
    expect(result.current).toBe(first);
    expect(first(10)).toBe(12);
  });

  it('gives an effect the callback from its own render', () => {
    const seen: number[] = [];
    const { rerender } = renderHook(({ step }) => {
      const report = useStableCallback(() => {
        seen.push(step);
      });
      useEffect(() => {
        report();
      }, [step, report]);
    }, { initialProps: { step: 1 } });

    rerender({ step: 2 });
    rerender({ step: 3 });
    expect(seen).toEqual([1, 2, 3]);
  });
});
