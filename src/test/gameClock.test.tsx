import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { GameClock, GAME_STEP_MS, MAX_CATCH_UP_STEPS } from '../utils/gameClock';
import { GameClockProvider, useGameTick } from '../hooks/useGameClock';

const setHidden = (hidden: boolean) =>
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });

const subscribe = (clock: GameClock, callback: () => void, every = 1, order = 100) =>
  clock.subscribe({ callbackRef: { current: callback }, every, order });

describe('GameClock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    setHidden(false);
    vi.useRealTimers();
  });

  it('steps once per game second', () => {
    const clock = new GameClock();
    const tick = vi.fn();
    subscribe(clock, tick);
    clock.start();

    vi.advanceTimersByTime(GAME_STEP_MS * 3);

    expect(tick).toHaveBeenCalledTimes(3);
    clock.stop();
  });

  it('runs subscribers in order within a step', () => {
    const clock = new GameClock();
    const calls: string[] = [];
    subscribe(clock, () => calls.push('canning'), 1, 60);
    subscribe(clock, () => calls.push('growth'), 1, 10);
    subscribe(clock, () => calls.push('harvest'), 1, 20);

    clock.step();

    expect(calls).toEqual(['growth', 'harvest', 'canning']);
  });

  it('runs every-N subscribers on every Nth step', () => {
    const clock = new GameClock();
    const everyStep = vi.fn();
    const everyTenth = vi.fn();
    subscribe(clock, everyStep);
    subscribe(clock, everyTenth, 10);

    for (let i = 0; i < 25; i++) clock.step();

    expect(everyStep).toHaveBeenCalledTimes(25);
    expect(everyTenth).toHaveBeenCalledTimes(2);
  });

  it('skips steps while the tab is hidden and does not burst when it returns', () => {
    const clock = new GameClock();
    const tick = vi.fn();
    subscribe(clock, tick);
    clock.start();

    setHidden(true);
    vi.advanceTimersByTime(GAME_STEP_MS * 10);
    expect(tick).not.toHaveBeenCalled();

    setHidden(false);
    vi.advanceTimersByTime(GAME_STEP_MS);
    expect(tick).toHaveBeenCalledTimes(1);
    clock.stop();
  });

  it('caps catch-up after a stall', () => {
    const clock = new GameClock();
    const tick = vi.fn();
    subscribe(clock, tick);
    clock.start();

    // Simulate the main thread being blocked for a minute
    vi.setSystemTime(Date.now() + 60 * GAME_STEP_MS);
    vi.advanceTimersByTime(250);

    expect(tick).toHaveBeenCalledTimes(MAX_CATCH_UP_STEPS);
    clock.stop();
  });

  it('keeps stepping other systems when one fails', () => {
    const clock = new GameClock();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const after = vi.fn();
    subscribe(clock, () => { throw new Error('boom'); }, 1, 10);
    subscribe(clock, after, 1, 20);

    clock.step();

    expect(after).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });

  it('stops calling a subscriber after it unsubscribes', () => {
    const clock = new GameClock();
    const tick = vi.fn();
    const unsubscribe = subscribe(clock, tick);

    clock.step();
    unsubscribe();
    clock.step();

    expect(tick).toHaveBeenCalledTimes(1);
  });
});

describe('useGameTick', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const wrapper = ({ children }: { children: ReactNode }) => <GameClockProvider>{children}</GameClockProvider>;

  it('always runs the latest callback without resubscribing', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ cb }: { cb: () => void }) => useGameTick(cb), {
      wrapper,
      initialProps: { cb: first }
    });

    vi.advanceTimersByTime(GAME_STEP_MS);
    rerender({ cb: second });
    vi.advanceTimersByTime(GAME_STEP_MS);

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('never runs outside a clock provider', () => {
    const tick = vi.fn();
    renderHook(() => useGameTick(tick));

    vi.advanceTimersByTime(GAME_STEP_MS * 3);

    expect(tick).not.toHaveBeenCalled();
  });
});
