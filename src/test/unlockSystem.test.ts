import { describe, it, expect } from 'vitest';
import {
  canUnlockVeggie,
  calculatePlotsUsed,
  getHighestUnlockedIndex,
  getNextUnlockInfo,
  getEligibleUnlocks,
  processUnlocks,
  hasPlotSpaceForAdditionalPlots,
  getUnlockProgress,
  validateUnlockState,
  forceUnlock,
  unlockAllUpTo,
  unlockAll
} from '../utils/unlockSystem';
import type { Veggie } from '../types/game';

// Helper to create test veggie
const createTestVeggie = (overrides: Partial<Veggie> = {}): Veggie => ({
  name: 'TestVeggie',
  growth: 0,
  growthRate: 1.0,
  stash: 0,
  unlocked: false,
  experience: 0,
  experienceToUnlock: 100,
  fertilizerLevel: 0,
  fertilizerMaxLevel: 10,
  fertilizerCost: 100,
  betterSeedsLevel: 0,
  betterSeedsCost: 200,
  harvesterOwned: false,
  harvesterCost: 300,
  harvesterTimer: 0,
  harvesterSpeedLevel: 0,
  harvesterSpeedCost: 500,
  additionalPlotLevel: 0,
  additionalPlotCost: 1000,
  salePrice: 10,
  sellEnabled: false,
  autoPurchasers: [],
  ...overrides
});

describe('canUnlockVeggie', () => {
  it('should return true when all requirements are met', () => {
    const veggie = createTestVeggie({ unlocked: false, experienceToUnlock: 100 });
    expect(canUnlockVeggie(veggie, 150, true)).toBe(true);
  });

  it('should return false if already unlocked', () => {
    const veggie = createTestVeggie({ unlocked: true, experienceToUnlock: 100 });
    expect(canUnlockVeggie(veggie, 150, true)).toBe(false);
  });

  it('should return false if not enough experience', () => {
    const veggie = createTestVeggie({ unlocked: false, experienceToUnlock: 100 });
    expect(canUnlockVeggie(veggie, 50, true)).toBe(false);
  });

  it('should return false if no plot space', () => {
    const veggie = createTestVeggie({ unlocked: false, experienceToUnlock: 100 });
    expect(canUnlockVeggie(veggie, 150, false)).toBe(false);
  });

  it('should work with exact experience requirement', () => {
    const veggie = createTestVeggie({ unlocked: false, experienceToUnlock: 100 });
    expect(canUnlockVeggie(veggie, 100, true)).toBe(true);
  });
});

describe('calculatePlotsUsed', () => {
  it('should count unlocked veggies', () => {
    const veggies = [
      createTestVeggie({ unlocked: true }),
      createTestVeggie({ unlocked: true }),
      createTestVeggie({ unlocked: false })
    ];
    expect(calculatePlotsUsed(veggies)).toBe(2);
  });

  it('should include additional plots', () => {
    const veggies = [
      createTestVeggie({ unlocked: true, additionalPlotLevel: 2 }),
      createTestVeggie({ unlocked: true, additionalPlotLevel: 1 })
    ];
    // 2 base + 2 additional + 1 additional = 5
    expect(calculatePlotsUsed(veggies)).toBe(5);
  });

  it('should return 0 for no unlocked veggies', () => {
    const veggies = [
      createTestVeggie({ unlocked: false }),
      createTestVeggie({ unlocked: false })
    ];
    expect(calculatePlotsUsed(veggies)).toBe(0);
  });

  it('should handle empty array', () => {
    expect(calculatePlotsUsed([])).toBe(0);
  });
});

describe('getHighestUnlockedIndex', () => {
  it('should return highest unlocked index', () => {
    const veggies = [
      createTestVeggie({ unlocked: true }),
      createTestVeggie({ unlocked: true }),
      createTestVeggie({ unlocked: false })
    ];
    expect(getHighestUnlockedIndex(veggies)).toBe(1);
  });

  it('should return -1 if none unlocked', () => {
    const veggies = [
      createTestVeggie({ unlocked: false }),
      createTestVeggie({ unlocked: false })
    ];
    expect(getHighestUnlockedIndex(veggies)).toBe(-1);
  });

  it('should handle non-sequential unlocks', () => {
    const veggies = [
      createTestVeggie({ unlocked: true }),
      createTestVeggie({ unlocked: false }),
      createTestVeggie({ unlocked: true })
    ];
    expect(getHighestUnlockedIndex(veggies)).toBe(2);
  });
});

describe('getNextUnlockInfo', () => {
  it('should return info for next locked veggie', () => {
    const veggies = [
      createTestVeggie({ name: 'Veggie1', unlocked: true, experienceToUnlock: 0 }),
      createTestVeggie({ name: 'Veggie2', unlocked: false, experienceToUnlock: 100 })
    ];
    
    const info = getNextUnlockInfo(veggies, 50, 10);
    
    expect(info).not.toBeNull();
    expect(info?.nextIndex).toBe(1);
    expect(info?.veggieName).toBe('Veggie2');
    expect(info?.experienceRequired).toBe(100);
    expect(info?.experienceRemaining).toBe(50);
    expect(info?.hasPlotSpace).toBe(true);
  });

  it('should return null if all veggies unlocked', () => {
    const veggies = [
      createTestVeggie({ unlocked: true }),
      createTestVeggie({ unlocked: true })
    ];
    
    expect(getNextUnlockInfo(veggies, 100, 10)).toBeNull();
  });

  it('should calculate remaining experience correctly', () => {
    const veggies = [
      createTestVeggie({ name: 'Veggie1', unlocked: true }),
      createTestVeggie({ name: 'Veggie2', unlocked: false, experienceToUnlock: 100 })
    ];
    
    const info = getNextUnlockInfo(veggies, 120, 10);
    expect(info?.experienceRemaining).toBe(0); // Already have enough
  });

  it('should check plot space correctly', () => {
    const veggies = [
      createTestVeggie({ unlocked: true, additionalPlotLevel: 0 }),
      createTestVeggie({ unlocked: false, experienceToUnlock: 100 })
    ];
    
    const withSpace = getNextUnlockInfo(veggies, 150, 10);
    const withoutSpace = getNextUnlockInfo(veggies, 150, 1);
    
    expect(withSpace?.hasPlotSpace).toBe(true);
    expect(withoutSpace?.hasPlotSpace).toBe(false);
  });
});

describe('getEligibleUnlocks', () => {
  it('should return all eligible unlock indices', () => {
    const veggies = [
      createTestVeggie({ unlocked: true, experienceToUnlock: 0 }),
      createTestVeggie({ unlocked: false, experienceToUnlock: 50 }),
      createTestVeggie({ unlocked: false, experienceToUnlock: 100 }),
      createTestVeggie({ unlocked: false, experienceToUnlock: 200 })
    ];
    
    const eligible = getEligibleUnlocks(veggies, 150, 10);
    
    expect(eligible).toEqual([1, 2]); // Indices 1 and 2 are eligible
  });

  it('should return empty array if none eligible', () => {
    const veggies = [
      createTestVeggie({ unlocked: true }),
      createTestVeggie({ unlocked: false, experienceToUnlock: 100 })
    ];
    
    expect(getEligibleUnlocks(veggies, 50, 10)).toEqual([]);
  });

  it('should respect plot limits', () => {
    const veggies = [
      createTestVeggie({ unlocked: true, experienceToUnlock: 0 }),
      createTestVeggie({ unlocked: false, experienceToUnlock: 50 }),
      createTestVeggie({ unlocked: false, experienceToUnlock: 100 })
    ];
    
    // Only 2 plots available, 1 used, can only unlock 1 more
    const eligible = getEligibleUnlocks(veggies, 150, 2);
    
    expect(eligible).toHaveLength(1);
    expect(eligible).toEqual([1]);
  });
});

describe('processUnlocks', () => {
  it('should unlock eligible veggies', () => {
    const veggies = [
      createTestVeggie({ unlocked: true, experienceToUnlock: 0 }),
      createTestVeggie({ unlocked: false, experienceToUnlock: 100 })
    ];
    
    const result = processUnlocks(veggies, 150, 10);
    
    expect(result.veggies[1].unlocked).toBe(true);
    expect(result.newlyUnlocked).toEqual([1]);
    expect(result.highestUnlockedIndex).toBe(1);
    expect(result.hasNewUnlocks).toBe(true);
  });

  it('should not unlock if insufficient experience', () => {
    const veggies = [
      createTestVeggie({ unlocked: true, experienceToUnlock: 0 }),
      createTestVeggie({ unlocked: false, experienceToUnlock: 100 })
    ];
    
    const result = processUnlocks(veggies, 50, 10);
    
    expect(result.veggies[1].unlocked).toBe(false);
    expect(result.newlyUnlocked).toEqual([]);
    expect(result.hasNewUnlocks).toBe(false);
  });

  it('should not unlock if at max plots', () => {
    const veggies = [
      createTestVeggie({ unlocked: true, experienceToUnlock: 0 }),
      createTestVeggie({ unlocked: false, experienceToUnlock: 100 })
    ];
    
    const result = processUnlocks(veggies, 150, 1); // Only 1 plot, already used
    
    expect(result.veggies[1].unlocked).toBe(false);
    expect(result.hasNewUnlocks).toBe(false);
  });

  it('should unlock multiple veggies', () => {
    const veggies = [
      createTestVeggie({ unlocked: true, experienceToUnlock: 0 }),
      createTestVeggie({ unlocked: false, experienceToUnlock: 50 }),
      createTestVeggie({ unlocked: false, experienceToUnlock: 100 })
    ];
    
    const result = processUnlocks(veggies, 150, 10);
    
    expect(result.veggies[1].unlocked).toBe(true);
    expect(result.veggies[2].unlocked).toBe(true);
    expect(result.newlyUnlocked).toEqual([1, 2]);
    expect(result.highestUnlockedIndex).toBe(2);
  });

  it('should not modify original array', () => {
    const veggies = [
      createTestVeggie({ unlocked: false, experienceToUnlock: 100 })
    ];
    
    processUnlocks(veggies, 150, 10);
    
    expect(veggies[0].unlocked).toBe(false); // Original unchanged
  });

  it('should account for additional plots in limit check', () => {
    const veggies = [
      createTestVeggie({ unlocked: true, experienceToUnlock: 0, additionalPlotLevel: 2 }),
      createTestVeggie({ unlocked: false, experienceToUnlock: 100 })
    ];
    
    // 1 base + 2 additional = 3 plots used, max 3 plots, can't unlock more
    const result = processUnlocks(veggies, 150, 3);
    
    expect(result.veggies[1].unlocked).toBe(false);
  });
});

describe('hasPlotSpaceForAdditionalPlots', () => {
  it('should return true if space available', () => {
    const veggies = [
      createTestVeggie({ unlocked: true, additionalPlotLevel: 0 })
    ];
    
    expect(hasPlotSpaceForAdditionalPlots(veggies, 10, 1)).toBe(true);
  });

  it('should return false if at max plots', () => {
    const veggies = [
      createTestVeggie({ unlocked: true, additionalPlotLevel: 0 })
    ];
    
    expect(hasPlotSpaceForAdditionalPlots(veggies, 1, 1)).toBe(false);
  });

  it('should default to checking for 1 additional plot', () => {
    const veggies = [
      createTestVeggie({ unlocked: true })
    ];
    
    expect(hasPlotSpaceForAdditionalPlots(veggies, 2)).toBe(true);
    expect(hasPlotSpaceForAdditionalPlots(veggies, 1)).toBe(false);
  });

  it('should check for multiple additional plots', () => {
    const veggies = [
      createTestVeggie({ unlocked: true })
    ];
    
    expect(hasPlotSpaceForAdditionalPlots(veggies, 5, 3)).toBe(true);
    expect(hasPlotSpaceForAdditionalPlots(veggies, 3, 3)).toBe(false);
  });
});

describe('getUnlockProgress', () => {
  it('should calculate progress correctly', () => {
    const veggies = [
      createTestVeggie({ unlocked: true }),
      createTestVeggie({ unlocked: true }),
      createTestVeggie({ unlocked: false }),
      createTestVeggie({ unlocked: false })
    ];
    
    const progress = getUnlockProgress(veggies);
    
    expect(progress.unlockedCount).toBe(2);
    expect(progress.totalCount).toBe(4);
    expect(progress.percentageUnlocked).toBe(50);
    expect(progress.allUnlocked).toBe(false);
  });

  it('should detect when all unlocked', () => {
    const veggies = [
      createTestVeggie({ unlocked: true }),
      createTestVeggie({ unlocked: true })
    ];
    
    const progress = getUnlockProgress(veggies);
    
    expect(progress.allUnlocked).toBe(true);
    expect(progress.percentageUnlocked).toBe(100);
  });

  it('should handle no unlocks', () => {
    const veggies = [
      createTestVeggie({ unlocked: false }),
      createTestVeggie({ unlocked: false })
    ];
    
    const progress = getUnlockProgress(veggies);
    
    expect(progress.unlockedCount).toBe(0);
    expect(progress.percentageUnlocked).toBe(0);
    expect(progress.allUnlocked).toBe(false);
  });
});

describe('validateUnlockState', () => {
  it('should pass validation for valid state', () => {
    const veggies = [
      createTestVeggie({ unlocked: true }),
      createTestVeggie({ unlocked: true }),
      createTestVeggie({ unlocked: false })
    ];
    
    const validation = validateUnlockState(veggies, 10);
    
    expect(validation.isValid).toBe(true);
    expect(validation.issues).toHaveLength(0);
  });

  it('should detect when plots exceed max', () => {
    const veggies = [
      createTestVeggie({ unlocked: true }),
      createTestVeggie({ unlocked: true })
    ];
    
    const validation = validateUnlockState(veggies, 1);
    
    expect(validation.isValid).toBe(false);
    expect(validation.issues).toHaveLength(1);
    expect(validation.issues[0]).toContain('exceeds max plots');
  });

  it('should detect out-of-order unlocks', () => {
    const veggies = [
      createTestVeggie({ name: 'First', unlocked: true }),
      createTestVeggie({ name: 'Second', unlocked: false }),
      createTestVeggie({ name: 'Third', unlocked: true })
    ];
    
    const validation = validateUnlockState(veggies, 10);
    
    expect(validation.isValid).toBe(false);
    expect(validation.issues.length).toBeGreaterThan(0);
    expect(validation.issues[0]).toContain('earlier veggies are locked');
  });
});

describe('forceUnlock', () => {
  it('should unlock specified veggie', () => {
    const veggies = [
      createTestVeggie({ unlocked: false }),
      createTestVeggie({ unlocked: false })
    ];
    
    const result = forceUnlock(veggies, 1);
    
    expect(result[1].unlocked).toBe(true);
  });

  it('should not modify original array', () => {
    const veggies = [
      createTestVeggie({ unlocked: false })
    ];
    
    forceUnlock(veggies, 0);
    
    expect(veggies[0].unlocked).toBe(false);
  });

  it('should handle invalid index gracefully', () => {
    const veggies = [
      createTestVeggie({ unlocked: false })
    ];
    
    const result = forceUnlock(veggies, 999);
    
    expect(result).toEqual(veggies);
  });
});

describe('unlockAllUpTo', () => {
  it('should unlock all veggies up to index', () => {
    const veggies = [
      createTestVeggie({ unlocked: false }),
      createTestVeggie({ unlocked: false }),
      createTestVeggie({ unlocked: false }),
      createTestVeggie({ unlocked: false })
    ];
    
    const result = unlockAllUpTo(veggies, 2);
    
    expect(result[0].unlocked).toBe(true);
    expect(result[1].unlocked).toBe(true);
    expect(result[2].unlocked).toBe(true);
    expect(result[3].unlocked).toBe(false);
  });

  it('should handle index beyond array length', () => {
    const veggies = [
      createTestVeggie({ unlocked: false }),
      createTestVeggie({ unlocked: false })
    ];
    
    const result = unlockAllUpTo(veggies, 999);
    
    expect(result.every(v => v.unlocked)).toBe(true);
  });
});

describe('unlockAll', () => {
  it('should unlock all veggies', () => {
    const veggies = [
      createTestVeggie({ unlocked: false }),
      createTestVeggie({ unlocked: false }),
      createTestVeggie({ unlocked: true })
    ];
    
    const result = unlockAll(veggies);
    
    expect(result.every(v => v.unlocked)).toBe(true);
  });

  it('should not modify original array', () => {
    const veggies = [
      createTestVeggie({ unlocked: false })
    ];
    
    unlockAll(veggies);
    
    expect(veggies[0].unlocked).toBe(false);
  });
});
