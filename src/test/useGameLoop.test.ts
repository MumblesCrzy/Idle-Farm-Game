import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRobustInterval } from '../hooks/useGameLoop';

const setHidden = (hidden: boolean) =>
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });

describe('useRobustInterval', () => {
  afterEach(() => {
    vi.useRealTimers();
    setHidden(false);
  });

  it('skips ticks while the tab is hidden', () => {
    vi.useFakeTimers();
    const tick = vi.fn();
    renderHook(() => useRobustInterval(tick, 1000));
    expect(tick).toHaveBeenCalledTimes(1); // immediate tick on start

    setHidden(true);
    vi.advanceTimersByTime(5000);
    expect(tick).toHaveBeenCalledTimes(1);

    setHidden(false);
    vi.advanceTimersByTime(3000);
    expect(tick).toHaveBeenCalledTimes(4);
  });
});
