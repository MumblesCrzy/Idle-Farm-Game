/**
 * Recipe completion counts survive the canning system rebuilding its recipe list, which it
 * does on load and whenever the crops change, as they do every game step.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { GameClockProvider } from '../hooks/useGameClock';
import { useCanningSystem } from '../hooks/useCanningSystem';
import type { CanningState, Recipe } from '../types/canning';

const saved: CanningState = {
  recipes: [{ id: 'canned_radish', timesCompleted: 7 } as Recipe],
  unlockedRecipes: ['canned_radish'],
  activeProcesses: [],
  maxSimultaneousProcesses: 1,
  upgrades: [],
  totalItemsCanned: 7,
  canningExperience: 70,
  autoCanning: { enabled: false, selectedRecipes: [], priorityOrder: [] }
};

const crops = (growth: number) => [{ name: 'Radish', stash: 10, salePrice: 1, growth }];
const wrapper = ({ children }: { children: ReactNode }) => <GameClockProvider>{children}</GameClockProvider>;

describe('canning recipe completion counts', () => {
  it('keep their saved values through loading and a crop change', () => {
    const { result, rerender } = renderHook(({ veggies }) => useCanningSystem(
      veggies, vi.fn(), false, 0, vi.fn(), 0, vi.fn(), saved, 'profit', 3
    ), { initialProps: { veggies: crops(10) }, wrapper });
    const madeRadish = () => result.current.canningState.recipes.find(r => r.id === 'canned_radish')?.timesCompleted;

    expect(madeRadish()).toBe(7);
    rerender({ veggies: crops(20) });
    expect(madeRadish()).toBe(7);
  });
});
