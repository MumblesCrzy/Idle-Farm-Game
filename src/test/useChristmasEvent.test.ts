import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChristmasEvent } from '../hooks/useChristmasEvent';

describe('useChristmasEvent', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports a successful purchase even when another update is already queued', () => {
    const { result } = renderHook(() => useChristmasEvent({ farmTier: 1 }));
    act(() => {
      result.current.earnCheer(500);
    });
    const cheerBefore = result.current.holidayCheer;

    let purchased = false;
    act(() => {
      // Queue an unrelated update first, as the game loop often has
      result.current.processTreeGrowth();
      purchased = result.current.purchaseUpgrade('unlock_spruce');
    });

    expect(purchased).toBe(true);
    expect(result.current.eventState.upgrades.find(u => u.id === 'unlock_spruce')?.owned).toBe(true);
    expect(result.current.holidayCheer).toBe(cheerBefore - 100);
  });

  it('turns the event on when November 1 arrives in an open tab', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 31, 23, 30)); // October 31, 11:30 pm
    const { result } = renderHook(() => useChristmasEvent({ farmTier: 1 }));
    expect(result.current.isEventActive).toBe(false);

    vi.setSystemTime(new Date(2026, 10, 1, 0, 30)); // November 1, 12:30 am
    act(() => {
      vi.advanceTimersByTime(60 * 60 * 1000); // the hourly check
    });

    expect(result.current.isEventActive).toBe(true);
  });

  it('grows a tree by many ticks at once the same as one tick at a time', () => {
    const batched = renderHook(() => useChristmasEvent({ farmTier: 1 }));
    const stepped = renderHook(() => useChristmasEvent({ farmTier: 1 }));
    act(() => {
      batched.result.current.plantTree(0, 'pine');
      stepped.result.current.plantTree(0, 'pine');
    });

    act(() => {
      batched.result.current.processTreeGrowth(10);
      for (let i = 0; i < 10; i++) stepped.result.current.processTreeGrowth();
    });

    const growth = (r: typeof batched) => r.result.current.treePlots[0].growth;
    expect(growth(batched)).toBeGreaterThan(0);
    expect(growth(batched)).toBeCloseTo(growth(stepped));
  });
});
