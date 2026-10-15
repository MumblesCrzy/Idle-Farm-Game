/**
 * Tests for useFarmManagement hook
 * 
 * Tests handleBuyLargerFarm for tier upgrades. Starting a new game is
 * covered in src/test/startNewGame.test.tsx.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFarmManagement, type UseFarmManagementDeps } from './useFarmManagement';
import type { EventLogCallbacks } from '../context/EventLogContext';

// Mock gameCalculations
vi.mock('../utils/gameCalculations', () => ({
  createInitialVeggies: vi.fn(() => [
    { name: 'Carrot', unlocked: true, stash: 0, growth: 0, autoPurchasers: [{cost: 10}, {cost: 20}, {cost: 30}, {cost: 40}] },
    { name: 'Potato', unlocked: false, stash: 0, growth: 0, autoPurchasers: [{cost: 15}, {cost: 25}, {cost: 35}, {cost: 45}] }
  ]),
  createAllCrops: vi.fn(() => [
    { name: 'Carrot', unlocked: true, stash: 0, growth: 0, cropType: 'vegetable' },
    { name: 'Potato', unlocked: false, stash: 0, growth: 0, cropType: 'vegetable' },
    { name: 'Apple', unlocked: false, stash: 0, growth: 0, cropType: 'fruit' }
  ]),
  createAutoPurchaserConfigs: vi.fn((c1, c2, c3, c4) => [
    { cost: c1, level: 0, enabled: false },
    { cost: c2, level: 0, enabled: false },
    { cost: c3, level: 0, enabled: false },
    { cost: c4, level: 0, enabled: false }
  ]),
  calculateExpRequirement: vi.fn((tier) => tier * 95)
}));

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
function createDefaultDeps(overrides: Partial<UseFarmManagementDeps> = {}): UseFarmManagementDeps {
  return {
    experience: 500,
    money: 1000,
    farmTier: 1,
    knowledge: 200,
    maxPlots: 4,
    farmCost: 500,
    FARM_BASE_COST: 500,
    setActiveVeggie: vi.fn(),
    setVeggies: vi.fn(),
    setMoney: vi.fn(),
    setExperience: vi.fn(),
    setKnowledge: vi.fn(),
    setDay: vi.fn(),
    setGreenhouseOwned: vi.fn(),
    setAlmanacLevel: vi.fn(),
    setAlmanacCost: vi.fn(),
    setAutoSellOwned: vi.fn(),
    setHeirloomOwned: vi.fn(),
    setMaxPlots: vi.fn(),
    setFarmTier: vi.fn(),
    setIrrigationOwned: vi.fn(),
    setGlobalAutoPurchaseTimer: vi.fn(),
    setFarmCost: vi.fn(),
    eventLogCallbacks: createMockEventLogCallbacks(),
    prestigeStartingExpBonus: 0,
    plotEfficiencyLevel: 0,
    ...overrides
  };
}

describe('useFarmManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock localStorage
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {});
  });

  describe('handleBuyLargerFarm', () => {
    it('should increase farm tier', () => {
      const deps = createDefaultDeps();
      
      const { result } = renderHook(() => useFarmManagement(deps));
      
      act(() => {
        result.current.handleBuyLargerFarm();
      });
      
      expect(deps.setFarmTier).toHaveBeenCalledWith(2);
    });

    it('should calculate new max plots based on experience', () => {
      const deps = createDefaultDeps({
        experience: 500, // 500 / 100 = 5 bonus
        maxPlots: 4
      });
      
      const { result } = renderHook(() => useFarmManagement(deps));
      
      act(() => {
        result.current.handleBuyLargerFarm();
      });
      
      // 4 + 5 = 9, capped at 4 * 2 = 8
      expect(deps.setMaxPlots).toHaveBeenCalledWith(8);
    });

    it('lowers the experience needed per plot with Plot Efficiency', () => {
      const deps = createDefaultDeps({
        experience: 300,
        maxPlots: 8,
        plotEfficiencyLevel: 5 // divisor 100 - 50 = 50, so 300 experience adds 6 plots
      });

      const { result } = renderHook(() => useFarmManagement(deps));
      act(() => {
        result.current.handleBuyLargerFarm();
      });

      expect(deps.setMaxPlots).toHaveBeenCalledWith(14);
    });

    it('reports the new tier for lifetime stats', () => {
      const onFarmTierReached = vi.fn();
      const deps = createDefaultDeps({ farmTier: 2, onFarmTierReached });

      const { result } = renderHook(() => useFarmManagement(deps));
      act(() => {
        result.current.handleBuyLargerFarm();
      });

      expect(onFarmTierReached).toHaveBeenCalledWith(3);
    });

    it('keeps fruits in the crop list after a farm upgrade', () => {
      const deps = createDefaultDeps();

      const { result } = renderHook(() => useFarmManagement(deps));
      act(() => {
        result.current.handleBuyLargerFarm();
      });

      expect(deps.setVeggies).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ cropType: 'fruit' })])
      );
    });

    it('should keep money above farm cost', () => {
      const deps = createDefaultDeps({
        money: 1500,
        farmCost: 500
      });
      
      const { result } = renderHook(() => useFarmManagement(deps));
      
      act(() => {
        result.current.handleBuyLargerFarm();
      });
      
      // 1500 - 500 = 1000
      expect(deps.setMoney).toHaveBeenCalledWith(1000);
    });

    it('should not allow negative money after purchase', () => {
      const deps = createDefaultDeps({
        money: 300,
        farmCost: 500
      });
      
      const { result } = renderHook(() => useFarmManagement(deps));
      
      act(() => {
        result.current.handleBuyLargerFarm();
      });
      
      // 300 - 500 = -200, clamped to 0
      expect(deps.setMoney).toHaveBeenCalledWith(0);
    });

    it('should preserve all knowledge', () => {
      const deps = createDefaultDeps({ knowledge: 500 });
      
      const { result } = renderHook(() => useFarmManagement(deps));
      
      act(() => {
        result.current.handleBuyLargerFarm();
      });
      
      expect(deps.setKnowledge).toHaveBeenCalledWith(500);
    });

    it('should reset day to 1', () => {
      const deps = createDefaultDeps();
      
      const { result } = renderHook(() => useFarmManagement(deps));
      
      act(() => {
        result.current.handleBuyLargerFarm();
      });
      
      expect(deps.setDay).toHaveBeenCalledWith(1);
    });

    it('should reset upgrades', () => {
      const deps = createDefaultDeps();
      
      const { result } = renderHook(() => useFarmManagement(deps));
      
      act(() => {
        result.current.handleBuyLargerFarm();
      });
      
      expect(deps.setGreenhouseOwned).toHaveBeenCalledWith(false);
      expect(deps.setAlmanacLevel).toHaveBeenCalledWith(0);
      expect(deps.setAutoSellOwned).toHaveBeenCalledWith(false);
      expect(deps.setHeirloomOwned).toHaveBeenCalledWith(false);
      expect(deps.setIrrigationOwned).toHaveBeenCalledWith(false);
    });

    it('should include prestige startingExperience bonus in starting experience', () => {
      // Level 2 prestige bonus = 2 * 50 = 100 extra exp
      const deps = createDefaultDeps({
        farmTier: 1,
        prestigeStartingExpBonus: 100
      });
      
      const { result } = renderHook(() => useFarmManagement(deps));
      
      act(() => {
        result.current.handleBuyLargerFarm();
      });
      
      // Tier 2: calculateExpRequirement(1) = floor(50 * 1.9^1) = 95
      // Plus prestige bonus of 100 = 195
      expect(deps.setExperience).toHaveBeenCalledWith(195);
    });

    it('should set base starting experience without prestige bonus', () => {
      const deps = createDefaultDeps({
        farmTier: 1,
        prestigeStartingExpBonus: 0
      });
      
      const { result } = renderHook(() => useFarmManagement(deps));
      
      act(() => {
        result.current.handleBuyLargerFarm();
      });
      
      // Tier 2: calculateExpRequirement(1) = floor(50 * 1.9^1) = 95
      expect(deps.setExperience).toHaveBeenCalledWith(95);
    });

    it('should update farm cost exponentially', () => {
      const deps = createDefaultDeps({
        FARM_BASE_COST: 500,
        farmTier: 1
      });
      
      const { result } = renderHook(() => useFarmManagement(deps));
      
      act(() => {
        result.current.handleBuyLargerFarm();
      });
      
      // New tier is 2, cost = ceil(500 * 1.85^1) = ceil(925) = 925
      expect(deps.setFarmCost).toHaveBeenCalledWith(925);
    });

    it('should log farm tier milestone', () => {
      const deps = createDefaultDeps();
      
      const { result } = renderHook(() => useFarmManagement(deps));
      
      act(() => {
        result.current.handleBuyLargerFarm();
      });
      
      expect(deps.eventLogCallbacks.onAchievementUnlock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Farm Tier 2',
          category: 'milestone'
        })
      );
    });

    it('should reset active veggie to 0', () => {
      const deps = createDefaultDeps();
      
      const { result } = renderHook(() => useFarmManagement(deps));
      
      act(() => {
        result.current.handleBuyLargerFarm();
      });
      
      expect(deps.setActiveVeggie).toHaveBeenCalledWith(0);
    });
  });

  describe('memoization', () => {
    it('should return stable function references when deps unchanged', () => {
      const deps = createDefaultDeps();
      
      const { result, rerender } = renderHook(() => useFarmManagement(deps));
      
      const firstRender = {
        handleBuyLargerFarm: result.current.handleBuyLargerFarm
      };
      
      rerender();
      
      // handleBuyLargerFarm should be stable if state hasn't changed
      expect(result.current.handleBuyLargerFarm).toBe(firstRender.handleBuyLargerFarm);
    });
  });
});
