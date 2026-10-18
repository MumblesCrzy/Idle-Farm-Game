/**
 * Tests that canning keeps running while the tab is hidden: the game clock stops, and the
 * canning system credits the hidden time on the first step after the tab comes back.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { GameClockProvider } from '../hooks/useGameClock';
import { useCanningSystem } from '../hooks/useCanningSystem';
import { GAME_STEP_MS } from '../utils/gameClock';
import type { CanningState, CanningUpgrade } from '../types/canning';

const setHidden = (hidden: boolean) => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event('visibilitychange'));
};

const veggies = [{ name: 'Radish', stash: 30, salePrice: 1 }];

const canner: CanningUpgrade = {
  id: 'canner',
  name: 'Canner',
  description: '',
  type: 'automation',
  level: 1,
  cost: 0,
  baseCost: 0,
  upgradeCostScaling: 1,
  costCurrency: 'knowledge',
  maxLevel: 1,
  effect: 0,
  unlocked: true
};

const state = (overrides: Partial<CanningState> = {}): CanningState => ({
  recipes: [],
  unlockedRecipes: [],
  activeProcesses: [{ recipeId: 'canned_radish', startTime: 0, remainingTime: 30, totalTime: 30, completed: false }],
  maxSimultaneousProcesses: 1,
  upgrades: [],
  totalItemsCanned: 0,
  canningExperience: 0,
  autoCanning: { enabled: false, selectedRecipes: [], priorityOrder: [] },
  ...overrides
});

const renderCanning = (initial: CanningState, isPaused = false) => {
  const setMoney = vi.fn();
  const setKnowledge = vi.fn();
  const setVeggies = vi.fn();
  const onGoodsCanned = vi.fn();
  const wrapper = ({ children }: { children: ReactNode }) => <GameClockProvider>{children}</GameClockProvider>;
  const hook = renderHook(() => useCanningSystem(
    veggies, setVeggies, false, 0, setMoney, 0, setKnowledge, initial, 'profit', 3,
    undefined, undefined, undefined, undefined, undefined, undefined, undefined, isPaused, onGoodsCanned
  ), { wrapper });
  return { ...hook, setMoney, setVeggies, onGoodsCanned };
};

const step = (count = 1) => act(() => {
  vi.advanceTimersByTime(GAME_STEP_MS * count);
});

describe('canning while the tab is hidden', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    vi.useRealTimers();
  });

  it('finishes and pays a running batch for the time the tab was hidden', () => {
    const { result, setMoney, onGoodsCanned } = renderCanning(state());

    step();
    expect(result.current.canningState.activeProcesses[0].remainingTime).toBe(29);

    act(() => setHidden(true));
    step(60);
    act(() => setHidden(false));
    step();

    expect(result.current.canningState.activeProcesses).toEqual([]);
    expect(result.current.canningState.totalItemsCanned).toBe(1);
    expect(onGoodsCanned).toHaveBeenCalledWith(1);
    const pay = setMoney.mock.calls.at(-1)?.[0] as (prev: number) => number;
    expect(pay(0)).toBe(5);
  });

  it('keeps the Canner starting batches and spends the stash', () => {
    const { result, setVeggies, onGoodsCanned } = renderCanning(state({
      activeProcesses: [],
      upgrades: [canner],
      autoCanning: { enabled: true, selectedRecipes: [], priorityOrder: [] }
    }));

    act(() => setHidden(true));
    step(100);
    act(() => setHidden(false));
    step();

    // Starts at 10, 40, 70 and 100 of the 101 steps; the first three finish
    expect(onGoodsCanned).toHaveBeenCalledWith(3);
    expect(result.current.canningState.activeProcesses).toEqual([expect.objectContaining({ remainingTime: 29, automated: true })]);
    const spend = setVeggies.mock.calls.at(-1)?.[0] as (prev: typeof veggies) => typeof veggies;
    expect(spend(veggies)[0].stash).toBe(18);
  });

  it('credits nothing while the game is paused', () => {
    const { result, setMoney, onGoodsCanned } = renderCanning(state(), true);

    act(() => setHidden(true));
    step(60);
    act(() => setHidden(false));
    step();

    expect(result.current.canningState.activeProcesses[0].remainingTime).toBe(30);
    expect(onGoodsCanned).not.toHaveBeenCalled();
    expect(setMoney).not.toHaveBeenCalled();
  });
});
