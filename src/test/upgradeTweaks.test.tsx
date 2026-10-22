/**
 * Batch Canning fills the stove's four columns, and honey recipes cost whole Golden Honey.
 */
import { describe, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { GameClockProvider } from '../hooks/useGameClock';
import { useCanningSystem } from '../hooks/useCanningSystem';
import { INITIAL_RECIPES } from '../data/recipes';
import type { CanningState, CanningUpgrade } from '../types/canning';

// Made once: a new list each render would rebuild the recipes forever
const crops = [{ name: 'Radish', stash: 0, salePrice: 1 }];

describe('Batch Canning', () => {
  it('goes to 15 levels, for 16 stove slots: four full rows of four', () => {
    const wrapper = ({ children }: { children: ReactNode }) => <GameClockProvider>{children}</GameClockProvider>;
    const { result } = renderHook(() => useCanningSystem(
      crops, vi.fn(), false, 1e12, vi.fn(), 1e12, vi.fn(), undefined, 'profit', 3
    ), { wrapper });

    for (let i = 0; i < 15; i++) {
      act(() => {
        expect(result.current.purchaseUpgrade('simultaneous_processing')).toBe(true);
      });
    }
    expect(result.current.canningState.maxSimultaneousProcesses).toBe(16);
    act(() => {
      expect(result.current.purchaseUpgrade('simultaneous_processing')).toBe(false);
    });
  });
});

describe('saved canning upgrades', () => {
  it('take the new max level, so a save capped at 14 can buy the 15th', () => {
    const wrapper = ({ children }: { children: ReactNode }) => <GameClockProvider>{children}</GameClockProvider>;
    const saved = { id: 'simultaneous_processing', name: 'Batch Canning', description: '', type: 'automation', level: 14, cost: 8192000,
      baseCost: 500, upgradeCostScaling: 2, costCurrency: 'money', maxLevel: 14, effect: 14, unlocked: true } as CanningUpgrade;
    const state: CanningState = {
      recipes: [], unlockedRecipes: [], activeProcesses: [], maxSimultaneousProcesses: 15, upgrades: [saved],
      totalItemsCanned: 0, canningExperience: 0, autoCanning: { enabled: false, selectedRecipes: [], priorityOrder: [] }
    };
    const { result } = renderHook(() => useCanningSystem(
      crops, vi.fn(), false, 1e12, vi.fn(), 1e12, vi.fn(), state, 'profit', 3
    ), { wrapper });

    expect(result.current.canningState.upgrades.find(u => u.id === 'simultaneous_processing')).toMatchObject({ level: 14, maxLevel: 15 });
    act(() => {
      expect(result.current.purchaseUpgrade('simultaneous_processing')).toBe(true);
    });
    expect(result.current.canningState.maxSimultaneousProcesses).toBe(16);
    // Every other upgrade comes back at level 0 with its rules
    expect(result.current.canningState.upgrades.map(u => u.id)).toEqual(['canning_speed', 'canning_efficiency', 'preservation_mastery', 'simultaneous_processing', 'canner']);
  });
});

describe('honey recipes', () => {
  it('each need at least 1 whole Golden Honey, apart from the honey jars', () => {
    const honey = INITIAL_RECIPES.filter(recipe => recipe.honeyRequirement && !recipe.requiredBeeUpgrade);
    expect(honey).toHaveLength(16);
    for (const recipe of honey) {
      expect(recipe.honeyRequirement!.golden).toBeGreaterThanOrEqual(1);
      expect(Number.isInteger(recipe.honeyRequirement!.golden)).toBe(true);
    }
  });
});
