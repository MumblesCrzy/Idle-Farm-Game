/**
 * Tests for useHarvestAndSell hook
 * 
 * Tests the unified harvest and sell functionality including:
 * - harvestVeggie function for manual and auto harvests
 * - handleHarvest for manual harvesting
 * - handleToggleSell for toggling sell state
 * - handleSell for merchant sales
 * - logHarvest for event logging
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHarvestAndSell, type UseHarvestAndSellDeps } from './useHarvestAndSell';
import type { Veggie } from '../types/game';
import type { EventLogCallbacks } from '../context/EventLogContext';

// Mock calculateHarvestRewards
vi.mock('../utils/harvestCalculations', () => ({
  calculateHarvestRewards: vi.fn(() => ({
    harvestAmount: 5,
    experienceGain: 10,
    knowledgeGain: 2
  }))
}));

import { calculateHarvestRewards } from '../utils/harvestCalculations';

/**
 * Creates mock veggies array with specified overrides
 */
function createMockVeggies(overrides: Partial<Veggie>[] = []): Veggie[] {
  const baseVeggies: Veggie[] = [
    {
      name: 'Carrot',
      growth: 100,
      salePrice: 10,
      stash: 5,
      unlocked: true,
      sellEnabled: true,
      harvestLevel: 1,
      harvesterLevel: 0,
      harvesterTimer: 0,
      fertilizerLevel: 0,
      additionalPlotLevel: 0,
      experienceToUnlock: 0
    },
    {
      name: 'Potato',
      growth: 50,
      salePrice: 15,
      stash: 3,
      unlocked: true,
      sellEnabled: true,
      harvestLevel: 1,
      harvesterLevel: 0,
      harvesterTimer: 0,
      fertilizerLevel: 0,
      additionalPlotLevel: 0,
      experienceToUnlock: 50
    },
    {
      name: 'Tomato',
      growth: 0,
      salePrice: 20,
      stash: 0,
      unlocked: false,
      sellEnabled: true,
      harvestLevel: 1,
      harvesterLevel: 0,
      harvesterTimer: 0,
      fertilizerLevel: 0,
      additionalPlotLevel: 0,
      experienceToUnlock: 100
    }
  ];
  
  return baseVeggies.map((veggie, index) => ({
    ...veggie,
    ...(overrides[index] || {})
  }));
}

/**
 * Creates mock event log callbacks
 */
function createMockEventLogCallbacks(): EventLogCallbacks {
  return {
    onHarvest: vi.fn(),
    onAutoPurchase: vi.fn(),
    onMerchantSale: vi.fn(),
    onAchievementUnlock: vi.fn(),
    resetAchievements: vi.fn(),
    clearEventLog: vi.fn(),
    onTreeSold: vi.fn(),
    onTreeHarvested: vi.fn(),
    onItemCrafted: vi.fn(),
    onUpgradePurchased: vi.fn(),
    onMilestoneClaimed: vi.fn(),
    registerCallbacks: vi.fn()
  };
}

/**
 * Creates default dependencies for the hook
 */
function createDefaultDeps(overrides: Partial<UseHarvestAndSellDeps> = {}): UseHarvestAndSellDeps {
  const veggies = createMockVeggies();
  return {
    veggies,
    setVeggies: vi.fn(),
    experience: 0,
    setExperience: vi.fn(),
    knowledge: 100,
    setKnowledge: vi.fn(),
    money: 500,
    setMoney: vi.fn(),
    season: 'Spring',
    day: 10,
    almanacLevel: 0,
    farmTier: 1,
    maxPlots: 10,
    highestUnlockedVeggie: 1,
    setHighestUnlockedVeggie: vi.fn(),
    setTotalHarvests: vi.fn(),
    permanentBonuses: [],
    beeYieldBonus: 0,
    activeVeggie: 0,
    eventLogCallbacks: createMockEventLogCallbacks(),
    ...overrides
  };
}

describe('useHarvestAndSell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    (calculateHarvestRewards as ReturnType<typeof vi.fn>).mockReturnValue({
      harvestAmount: 5,
      experienceGain: 10,
      knowledgeGain: 2
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('harvestVeggie', () => {
    it('should not harvest if growth is below 100', () => {
      const deps = createDefaultDeps();
      deps.veggies[0].growth = 50; // Not ready
      
      const { result } = renderHook(() => useHarvestAndSell(deps));
      
      act(() => {
        result.current.harvestVeggie(0, false);
      });
      
      expect(deps.setVeggies).not.toHaveBeenCalled();
      expect(deps.setExperience).not.toHaveBeenCalled();
      expect(deps.setKnowledge).not.toHaveBeenCalled();
    });

    it('should harvest veggie when growth is 100', () => {
      const deps = createDefaultDeps();
      
      const { result } = renderHook(() => useHarvestAndSell(deps));
      
      act(() => {
        result.current.harvestVeggie(0, false);
      });
      
      expect(deps.setVeggies).toHaveBeenCalled();
      expect(deps.setExperience).toHaveBeenCalled();
      expect(deps.setKnowledge).toHaveBeenCalled();
      expect(deps.setTotalHarvests).toHaveBeenCalled();
    });

    it('should call calculateHarvestRewards with correct parameters', () => {
      const deps = createDefaultDeps();
      deps.veggies[0].additionalPlotLevel = 2;
      
      const { result } = renderHook(() => useHarvestAndSell(deps));
      
      act(() => {
        result.current.harvestVeggie(0, false);
      });
      
      expect(calculateHarvestRewards).toHaveBeenCalledWith(
        2, // additionalPlotLevel
        'Spring', // season
        [], // permanentBonuses
        0, // beeYieldBonus
        0, // almanacLevel
        1, // farmTier
        100, // knowledge
        false // isAutoHarvest
      );
    });

    it('should call harvest callback if provided', () => {
      const deps = createDefaultDeps();
      const callback = vi.fn();
      
      const { result } = renderHook(() => useHarvestAndSell(deps));
      
      act(() => {
        result.current.harvestVeggie(0, false, callback);
      });
      
      expect(callback).toHaveBeenCalledWith('Carrot', 5, 10, 2, false);
    });

    it('should not update knowledge/experience outside day 1-365', () => {
      const deps = createDefaultDeps({ day: 0 });
      
      const { result } = renderHook(() => useHarvestAndSell(deps));
      
      act(() => {
        result.current.harvestVeggie(0, false);
      });
      
      expect(deps.setExperience).not.toHaveBeenCalled();
      expect(deps.setKnowledge).not.toHaveBeenCalled();
    });

    it('should update knowledge/experience within day 1-365', () => {
      const deps = createDefaultDeps({ day: 100 });
      
      const { result } = renderHook(() => useHarvestAndSell(deps));
      
      act(() => {
        result.current.harvestVeggie(0, false);
      });
      
      expect(deps.setExperience).toHaveBeenCalled();
      expect(deps.setKnowledge).toHaveBeenCalled();
    });
  });

  describe('logHarvest', () => {
    it('should defer event log callback with setTimeout', () => {
      const deps = createDefaultDeps();
      
      const { result } = renderHook(() => useHarvestAndSell(deps));
      
      act(() => {
        result.current.logHarvest('Carrot', 5, 10, 2, false);
      });
      
      // Before timer fires, callback not called
      expect(deps.eventLogCallbacks.onHarvest).not.toHaveBeenCalled();
      
      // After timer fires
      act(() => {
        vi.runAllTimers();
      });
      
      expect(deps.eventLogCallbacks.onHarvest).toHaveBeenCalledWith(
        'Carrot', 5, 10, 2, false
      );
    });

    it('should handle auto harvest logging', () => {
      const deps = createDefaultDeps();
      
      const { result } = renderHook(() => useHarvestAndSell(deps));
      
      act(() => {
        result.current.logHarvest('Potato', 3, 5, 1, true);
        vi.runAllTimers();
      });
      
      expect(deps.eventLogCallbacks.onHarvest).toHaveBeenCalledWith(
        'Potato', 3, 5, 1, true
      );
    });
  });

  describe('handleHarvest', () => {
    it('should harvest the active veggie', () => {
      const deps = createDefaultDeps({ activeVeggie: 0 });
      
      const { result } = renderHook(() => useHarvestAndSell(deps));
      
      act(() => {
        result.current.handleHarvest();
      });
      
      expect(deps.setVeggies).toHaveBeenCalled();
      expect(deps.setTotalHarvests).toHaveBeenCalled();
    });

    it('should not harvest if active veggie is not ready', () => {
      const deps = createDefaultDeps({ activeVeggie: 1 }); // Potato at 50% growth
      
      const { result } = renderHook(() => useHarvestAndSell(deps));
      
      act(() => {
        result.current.handleHarvest();
      });
      
      expect(deps.setVeggies).not.toHaveBeenCalled();
    });
  });

  describe('handleToggleSell', () => {
    it('should toggle sellEnabled state for a veggie', () => {
      const mockSetVeggies = vi.fn();
      const deps = createDefaultDeps({ setVeggies: mockSetVeggies });
      
      const { result } = renderHook(() => useHarvestAndSell(deps));
      
      act(() => {
        result.current.handleToggleSell(0);
      });
      
      expect(mockSetVeggies).toHaveBeenCalled();
      
      // Get the updater function and call it
      const updater = mockSetVeggies.mock.calls[0][0];
      const newState = updater(deps.veggies);
      
      expect(newState[0].sellEnabled).toBe(false); // Toggled from true to false
      expect(newState[1].sellEnabled).toBe(true); // Unchanged
    });

    it('should toggle from disabled to enabled', () => {
      const mockSetVeggies = vi.fn();
      const deps = createDefaultDeps({ setVeggies: mockSetVeggies });
      deps.veggies[0].sellEnabled = false;
      
      const { result } = renderHook(() => useHarvestAndSell(deps));
      
      act(() => {
        result.current.handleToggleSell(0);
      });
      
      const updater = mockSetVeggies.mock.calls[0][0];
      const newState = updater(deps.veggies);
      
      expect(newState[0].sellEnabled).toBe(true);
    });
  });

  describe('handleSell', () => {
    it('should sell all enabled veggies with stash', () => {
      const mockSetVeggies = vi.fn();
      const mockSetMoney = vi.fn();
      const deps = createDefaultDeps({
        setVeggies: mockSetVeggies,
        setMoney: mockSetMoney
      });
      
      const { result } = renderHook(() => useHarvestAndSell(deps));
      
      act(() => {
        result.current.handleSell(false);
      });
      
      // Verify setVeggies was called
      expect(mockSetVeggies).toHaveBeenCalled();
      
      // Get the updater and verify stash is cleared
      const updater = mockSetVeggies.mock.calls[0][0];
      const newState = updater(deps.veggies);
      
      expect(newState[0].stash).toBe(0); // Carrot cleared
      expect(newState[1].stash).toBe(0); // Potato cleared
      expect(newState[2].stash).toBe(0); // Tomato was already 0
    });

    it('should not clear stash for disabled veggies', () => {
      const mockSetVeggies = vi.fn();
      const deps = createDefaultDeps({ setVeggies: mockSetVeggies });
      deps.veggies[0].sellEnabled = false; // Disable Carrot
      
      const { result } = renderHook(() => useHarvestAndSell(deps));
      
      act(() => {
        result.current.handleSell(false);
      });
      
      const updater = mockSetVeggies.mock.calls[0][0];
      const newState = updater(deps.veggies);
      
      expect(newState[0].stash).toBe(5); // Carrot NOT cleared
      expect(newState[1].stash).toBe(0); // Potato cleared
    });

    it('should log merchant sale when something is sold', () => {
      const mockSetVeggies = vi.fn((updater) => {
        // Execute the updater to calculate total
        if (typeof updater === 'function') {
          updater(createMockVeggies());
        }
      });
      const deps = createDefaultDeps({ setVeggies: mockSetVeggies });
      
      const { result } = renderHook(() => useHarvestAndSell(deps));
      
      act(() => {
        result.current.handleSell(false);
      });
      
      // Total should be: 5*10 + 3*15 = 50 + 45 = 95
      expect(deps.eventLogCallbacks.onMerchantSale).toHaveBeenCalledWith(
        95,
        expect.arrayContaining([
          expect.objectContaining({ name: 'Carrot', quantity: 5, earnings: 50 }),
          expect.objectContaining({ name: 'Potato', quantity: 3, earnings: 45 })
        ]),
        false
      );
    });

    it('should indicate auto-sell in the event log', () => {
      const mockSetVeggies = vi.fn((updater) => {
        if (typeof updater === 'function') {
          updater(createMockVeggies());
        }
      });
      const deps = createDefaultDeps({ setVeggies: mockSetVeggies });
      
      const { result } = renderHook(() => useHarvestAndSell(deps));
      
      act(() => {
        result.current.handleSell(true); // Auto-sell
      });
      
      expect(deps.eventLogCallbacks.onMerchantSale).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Array),
        true // isAutoSell
      );
    });

    it('should not log if nothing is sold', () => {
      const deps = createDefaultDeps();
      // Clear all stashes
      deps.veggies[0].stash = 0;
      deps.veggies[1].stash = 0;
      deps.veggies[2].stash = 0;
      
      const { result } = renderHook(() => useHarvestAndSell(deps));
      
      act(() => {
        result.current.handleSell(false);
      });
      
      expect(deps.eventLogCallbacks.onMerchantSale).not.toHaveBeenCalled();
    });

    it('should update money with total earnings', () => {
      const mockSetMoney = vi.fn();
      const mockSetVeggies = vi.fn((updater) => {
        if (typeof updater === 'function') {
          updater(createMockVeggies());
        }
      });
      const deps = createDefaultDeps({
        setMoney: mockSetMoney,
        setVeggies: mockSetVeggies
      });
      
      const { result } = renderHook(() => useHarvestAndSell(deps));
      
      act(() => {
        result.current.handleSell(false);
      });
      
      expect(mockSetMoney).toHaveBeenCalled();
      
      // Verify the updater adds correct amount
      const moneyUpdater = mockSetMoney.mock.calls[0][0];
      const newMoney = moneyUpdater(500);
      expect(newMoney).toBe(595); // 500 + 95
    });
  });

  describe('memoization', () => {
    it('should return stable function references', () => {
      const deps = createDefaultDeps();
      
      const { result, rerender } = renderHook(() => useHarvestAndSell(deps));
      
      const firstRender = {
        harvestVeggie: result.current.harvestVeggie,
        handleHarvest: result.current.handleHarvest,
        handleToggleSell: result.current.handleToggleSell,
        handleSell: result.current.handleSell,
        logHarvest: result.current.logHarvest
      };
      
      rerender();
      
      // Functions should be stable if deps haven't changed
      expect(result.current.handleToggleSell).toBe(firstRender.handleToggleSell);
    });
  });
});
