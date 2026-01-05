import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePurchaseHandlers, createAutoPurchaseHandler } from './usePurchaseHandlers';
import type { Veggie } from '../types/game';
import { createInitialVeggies } from '../utils/gameCalculations';
import {
  IRRIGATION_COST,
  IRRIGATION_KN_COST,
  MERCHANT_COST,
  MERCHANT_KN_COST,
  GREENHOUSE_COST_PER_PLOT,
  GREENHOUSE_KN_COST_PER_PLOT
} from '../config/gameConstants';

describe('usePurchaseHandlers', () => {
  // Create mock state and setters
  const createMockDependencies = (overrides = {}) => {
    const veggies = createInitialVeggies();
    return {
      veggies,
      setVeggies: vi.fn(),
      money: 10000,
      setMoney: vi.fn(),
      knowledge: 1000,
      setKnowledge: vi.fn(),
      heirloomOwned: false,
      setHeirloomOwned: vi.fn(),
      irrigationOwned: false,
      setIrrigationOwned: vi.fn(),
      greenhouseOwned: false,
      setGreenhouseOwned: vi.fn(),
      autoSellOwned: false,
      setAutoSellOwned: vi.fn(),
      setAlmanacLevel: vi.fn(),
      almanacCost: 10,
      setAlmanacCost: vi.fn(),
      totalPlotsUsed: 1,
      maxPlots: 4,
      heirloomMoneyCost: 5000,
      heirloomKnowledgeCost: 500,
      onMilestone: vi.fn(),
      ...overrides
    };
  };

  describe('irrigationCost and irrigationKnCost', () => {
    it('should expose irrigation cost constants', () => {
      const deps = createMockDependencies();
      const { result } = renderHook(() => usePurchaseHandlers(deps));
      
      expect(result.current.irrigationCost).toBe(IRRIGATION_COST);
      expect(result.current.irrigationKnCost).toBe(IRRIGATION_KN_COST);
    });
  });

  describe('handleBuyIrrigation', () => {
    it('should purchase irrigation when player can afford it', () => {
      const deps = createMockDependencies({
        money: IRRIGATION_COST + 100,
        knowledge: IRRIGATION_KN_COST + 100
      });
      const { result } = renderHook(() => usePurchaseHandlers(deps));
      
      act(() => {
        result.current.handleBuyIrrigation();
      });
      
      expect(deps.setMoney).toHaveBeenCalled();
      expect(deps.setKnowledge).toHaveBeenCalled();
      expect(deps.setIrrigationOwned).toHaveBeenCalledWith(true);
      expect(deps.onMilestone).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Irrigation System',
        category: 'milestone'
      }));
    });

    it('should not purchase irrigation when already owned', () => {
      const deps = createMockDependencies({
        irrigationOwned: true,
        money: IRRIGATION_COST + 100,
        knowledge: IRRIGATION_KN_COST + 100
      });
      const { result } = renderHook(() => usePurchaseHandlers(deps));
      
      act(() => {
        result.current.handleBuyIrrigation();
      });
      
      expect(deps.setIrrigationOwned).not.toHaveBeenCalled();
    });

    it('should not purchase irrigation when cannot afford money', () => {
      const deps = createMockDependencies({
        money: IRRIGATION_COST - 1,
        knowledge: IRRIGATION_KN_COST + 100
      });
      const { result } = renderHook(() => usePurchaseHandlers(deps));
      
      act(() => {
        result.current.handleBuyIrrigation();
      });
      
      expect(deps.setIrrigationOwned).not.toHaveBeenCalled();
    });
  });

  describe('handleBuyGreenhouse', () => {
    it('should purchase greenhouse when player can afford it', () => {
      const maxPlots = 4;
      const greenhouseCost = GREENHOUSE_COST_PER_PLOT * maxPlots;
      const greenhouseKnCost = GREENHOUSE_KN_COST_PER_PLOT * maxPlots;
      
      const deps = createMockDependencies({
        money: greenhouseCost + 100,
        knowledge: greenhouseKnCost + 100,
        maxPlots
      });
      const { result } = renderHook(() => usePurchaseHandlers(deps));
      
      act(() => {
        result.current.handleBuyGreenhouse();
      });
      
      expect(deps.setGreenhouseOwned).toHaveBeenCalledWith(true);
      expect(deps.onMilestone).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Greenhouse Purchased',
        category: 'milestone'
      }));
    });

    it('should not purchase greenhouse when already owned', () => {
      const deps = createMockDependencies({
        greenhouseOwned: true,
        money: 100000,
        knowledge: 10000
      });
      const { result } = renderHook(() => usePurchaseHandlers(deps));
      
      act(() => {
        result.current.handleBuyGreenhouse();
      });
      
      expect(deps.setGreenhouseOwned).not.toHaveBeenCalled();
    });
  });

  describe('handleBuyHeirloom', () => {
    it('should purchase heirloom seeds and update existing veggies', () => {
      const veggies = createInitialVeggies();
      veggies[0].betterSeedsLevel = 2; // Has Better Seeds upgrades
      
      const deps = createMockDependencies({
        veggies,
        money: 10000,
        knowledge: 1000,
        heirloomMoneyCost: 5000,
        heirloomKnowledgeCost: 500
      });
      const { result } = renderHook(() => usePurchaseHandlers(deps));
      
      act(() => {
        result.current.handleBuyHeirloom();
      });
      
      expect(deps.setHeirloomOwned).toHaveBeenCalledWith(true);
      expect(deps.setVeggies).toHaveBeenCalled();
      expect(deps.onMilestone).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Heirloom Seeds Unlocked'
      }));
    });

    it('should not purchase heirloom when already owned', () => {
      const deps = createMockDependencies({
        heirloomOwned: true
      });
      const { result } = renderHook(() => usePurchaseHandlers(deps));
      
      act(() => {
        result.current.handleBuyHeirloom();
      });
      
      expect(deps.setHeirloomOwned).not.toHaveBeenCalled();
    });
  });

  describe('handleBuyAutoSell', () => {
    it('should purchase auto-sell when player can afford it', () => {
      const deps = createMockDependencies({
        money: MERCHANT_COST + 100,
        knowledge: MERCHANT_KN_COST + 100
      });
      const { result } = renderHook(() => usePurchaseHandlers(deps));
      
      act(() => {
        result.current.handleBuyAutoSell();
      });
      
      expect(deps.setAutoSellOwned).toHaveBeenCalledWith(true);
      expect(deps.onMilestone).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Merchant Partnership'
      }));
    });
  });

  describe('handleBuyAlmanac', () => {
    it('should purchase almanac upgrade and increase cost', () => {
      const deps = createMockDependencies({
        money: 100,
        almanacCost: 10
      });
      const { result } = renderHook(() => usePurchaseHandlers(deps));
      
      act(() => {
        result.current.handleBuyAlmanac();
      });
      
      expect(deps.setMoney).toHaveBeenCalled();
      expect(deps.setAlmanacLevel).toHaveBeenCalled();
      expect(deps.setAlmanacCost).toHaveBeenCalled();
    });

    it('should not purchase almanac when cannot afford', () => {
      const deps = createMockDependencies({
        money: 5,
        almanacCost: 10
      });
      const { result } = renderHook(() => usePurchaseHandlers(deps));
      
      act(() => {
        result.current.handleBuyAlmanac();
      });
      
      expect(deps.setAlmanacLevel).not.toHaveBeenCalled();
    });
  });

  describe('handleBuyFertilizer', () => {
    it('should purchase fertilizer upgrade for veggie', () => {
      const veggies = createInitialVeggies();
      veggies[0].fertilizerCost = 50;
      
      const deps = createMockDependencies({
        veggies,
        money: 100
      });
      const { result } = renderHook(() => usePurchaseHandlers(deps));
      
      act(() => {
        result.current.handleBuyFertilizer(0);
      });
      
      expect(deps.setMoney).toHaveBeenCalled();
      expect(deps.setVeggies).toHaveBeenCalled();
    });
  });

  describe('handleBuyHarvester', () => {
    it('should purchase harvester when not owned and can afford', () => {
      const veggies = createInitialVeggies();
      veggies[0].harvesterOwned = false;
      veggies[0].harvesterCost = 100;
      
      const deps = createMockDependencies({
        veggies,
        money: 200
      });
      const { result } = renderHook(() => usePurchaseHandlers(deps));
      
      act(() => {
        result.current.handleBuyHarvester(0);
      });
      
      expect(deps.setMoney).toHaveBeenCalled();
      expect(deps.setVeggies).toHaveBeenCalled();
    });

    it('should not purchase harvester when already owned', () => {
      const veggies = createInitialVeggies();
      veggies[0].harvesterOwned = true;
      
      const deps = createMockDependencies({
        veggies,
        money: 1000
      });
      const { result } = renderHook(() => usePurchaseHandlers(deps));
      
      act(() => {
        result.current.handleBuyHarvester(0);
      });
      
      expect(deps.setVeggies).not.toHaveBeenCalled();
    });
  });

  describe('handleBuyHarvesterSpeed', () => {
    it('should purchase harvester speed when harvester owned', () => {
      const veggies = createInitialVeggies();
      veggies[0].harvesterOwned = true;
      veggies[0].harvesterSpeedCost = 50;
      
      const deps = createMockDependencies({
        veggies,
        money: 100
      });
      const { result } = renderHook(() => usePurchaseHandlers(deps));
      
      act(() => {
        result.current.handleBuyHarvesterSpeed(0);
      });
      
      expect(deps.setMoney).toHaveBeenCalled();
      expect(deps.setVeggies).toHaveBeenCalled();
    });

    it('should not purchase harvester speed when harvester not owned', () => {
      const veggies = createInitialVeggies();
      veggies[0].harvesterOwned = false;
      
      const deps = createMockDependencies({
        veggies,
        money: 1000
      });
      const { result } = renderHook(() => usePurchaseHandlers(deps));
      
      act(() => {
        result.current.handleBuyHarvesterSpeed(0);
      });
      
      expect(deps.setVeggies).not.toHaveBeenCalled();
    });
  });

  describe('handleBuyBetterSeeds', () => {
    it('should purchase better seeds with knowledge', () => {
      const veggies = createInitialVeggies();
      veggies[0].betterSeedsCost = 50;
      
      const deps = createMockDependencies({
        veggies,
        knowledge: 100
      });
      const { result } = renderHook(() => usePurchaseHandlers(deps));
      
      act(() => {
        result.current.handleBuyBetterSeeds(0);
      });
      
      expect(deps.setKnowledge).toHaveBeenCalled();
      expect(deps.setVeggies).toHaveBeenCalled();
    });
  });

  describe('handleBuyAdditionalPlot', () => {
    it('should purchase additional plot when under max plots', () => {
      const veggies = createInitialVeggies();
      veggies[0].additionalPlotCost = 100;
      
      const deps = createMockDependencies({
        veggies,
        money: 200,
        totalPlotsUsed: 2,
        maxPlots: 4
      });
      const { result } = renderHook(() => usePurchaseHandlers(deps));
      
      act(() => {
        result.current.handleBuyAdditionalPlot(0);
      });
      
      expect(deps.setMoney).toHaveBeenCalled();
      expect(deps.setVeggies).toHaveBeenCalled();
    });

    it('should not purchase additional plot when at max plots', () => {
      const veggies = createInitialVeggies();
      
      const deps = createMockDependencies({
        veggies,
        money: 10000,
        totalPlotsUsed: 4,
        maxPlots: 4
      });
      const { result } = renderHook(() => usePurchaseHandlers(deps));
      
      act(() => {
        result.current.handleBuyAdditionalPlot(0);
      });
      
      expect(deps.setVeggies).not.toHaveBeenCalled();
    });
  });

  describe('handleBuyAutoPurchaser', () => {
    it('should return a handler function for auto-purchaser', () => {
      const deps = createMockDependencies();
      const { result } = renderHook(() => usePurchaseHandlers(deps));
      
      const handler = result.current.handleBuyAutoPurchaser('fertilizer_auto');
      
      expect(typeof handler).toBe('function');
    });
  });
});

describe('createAutoPurchaseHandler', () => {
  it('should purchase auto-purchaser when not owned and can afford', () => {
    const veggies = createInitialVeggies();
    // Ensure the auto-purchaser exists and is affordable
    veggies[0].autoPurchasers[0].owned = false;
    veggies[0].autoPurchasers[0].cost = 100;
    veggies[0].autoPurchasers[0].currencyType = 'money';
    
    const setVeggies = vi.fn();
    const setMoney = vi.fn();
    const setKnowledge = vi.fn();
    
    const handler = createAutoPurchaseHandler(
      veggies[0].autoPurchasers[0].id,
      veggies,
      setVeggies,
      200, // money
      setMoney,
      100, // knowledge
      setKnowledge
    );
    
    handler(0);
    
    expect(setMoney).toHaveBeenCalled();
    expect(setVeggies).toHaveBeenCalled();
  });

  it('should toggle auto-purchaser when already owned', () => {
    const veggies = createInitialVeggies();
    veggies[0].autoPurchasers[0].owned = true;
    veggies[0].autoPurchasers[0].active = false;
    
    const setVeggies = vi.fn();
    const setMoney = vi.fn();
    const setKnowledge = vi.fn();
    
    const handler = createAutoPurchaseHandler(
      veggies[0].autoPurchasers[0].id,
      veggies,
      setVeggies,
      200,
      setMoney,
      100,
      setKnowledge
    );
    
    handler(0);
    
    // Should only toggle, not deduct currency
    expect(setMoney).not.toHaveBeenCalled();
    expect(setVeggies).toHaveBeenCalled();
  });

  it('should not toggle surveyor when at max plots', () => {
    const veggies = createInitialVeggies();
    // Find or create surveyor auto-purchaser
    const surveyorIndex = veggies[0].autoPurchasers.findIndex(ap => ap.id === 'surveyor');
    if (surveyorIndex >= 0) {
      veggies[0].autoPurchasers[surveyorIndex].owned = true;
      veggies[0].autoPurchasers[surveyorIndex].active = false;
    }
    
    // Simulate all plots used
    veggies.forEach(v => v.unlocked = true);
    
    const setVeggies = vi.fn();
    const setMoney = vi.fn();
    const setKnowledge = vi.fn();
    
    const handler = createAutoPurchaseHandler(
      'surveyor',
      veggies,
      setVeggies,
      200,
      setMoney,
      100,
      setKnowledge,
      veggies.length // maxPlots = exactly the number of unlocked veggies
    );
    
    handler(0);
    
    // Should not toggle because at max plots
    expect(setVeggies).not.toHaveBeenCalled();
  });

  it('should do nothing if auto-purchaser does not exist', () => {
    const veggies = createInitialVeggies();
    
    const setVeggies = vi.fn();
    const setMoney = vi.fn();
    const setKnowledge = vi.fn();
    
    const handler = createAutoPurchaseHandler(
      'nonexistent_auto_purchaser',
      veggies,
      setVeggies,
      200,
      setMoney,
      100,
      setKnowledge
    );
    
    handler(0);
    
    expect(setVeggies).not.toHaveBeenCalled();
    expect(setMoney).not.toHaveBeenCalled();
  });
});
