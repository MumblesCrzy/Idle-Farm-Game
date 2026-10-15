import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useState } from 'react';
import { useDeferredEffects } from '../hooks/useDeferredEffects';

/** A counter whose updater schedules work, the way the game's updaters do */
const useCounter = (onCommitted: (value: number) => void) => {
  const [count, setCount] = useState(0);
  const schedule = useDeferredEffects();
  const increment = (by: number) => {
    const key = {};
    setCount(prev => {
      const next = prev + by;
      schedule(key, by > 0 ? () => onCommitted(next) : undefined);
      return next;
    });
  };
  return { count, increment };
};

describe('useDeferredEffects', () => {
  it('runs scheduled work once after the commit, even in strict mode', () => {
    const onCommitted = vi.fn();
    const { result } = renderHook(() => useCounter(onCommitted), { reactStrictMode: true });

    act(() => {
      result.current.increment(2);
      // Not inside the updater, and not before the commit
      expect(onCommitted).not.toHaveBeenCalled();
    });

    expect(result.current.count).toBe(2);
    expect(onCommitted).toHaveBeenCalledTimes(1);
    expect(onCommitted).toHaveBeenCalledWith(2);
  });

  it('runs one entry per call when several updates batch together', () => {
    const onCommitted = vi.fn();
    const { result } = renderHook(() => useCounter(onCommitted));

    act(() => {
      result.current.increment(1);
      result.current.increment(10);
    });

    expect(result.current.count).toBe(11);
    expect(onCommitted.mock.calls).toEqual([[1], [11]]);
  });

  it('schedules nothing when the updater passes undefined', () => {
    const onCommitted = vi.fn();
    const { result } = renderHook(() => useCounter(onCommitted));

    act(() => {
      result.current.increment(0);
    });

    expect(onCommitted).not.toHaveBeenCalled();
  });

  it('does not run work again on later renders', () => {
    const onCommitted = vi.fn();
    const { result, rerender } = renderHook(() => useCounter(onCommitted));

    act(() => {
      result.current.increment(1);
    });
    rerender();
    rerender();

    expect(onCommitted).toHaveBeenCalledTimes(1);
  });
});
