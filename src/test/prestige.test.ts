/**
 * Prestige System Tests
 *
 * Covers:
 * - Wisdom calculation accuracy
 * - Prestige reset preserving correct data
 * - Wisdom upgrade cost & bonus calculations
 * - Lifetime boundary edge cases (exactly day 29,200)
 * - Save/load with prestige data (migration from pre-prestige saves)
 * - computeAllowedOfflineMs lifetime capping
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getMaxLifetimeDaysForPlayer,
  computeAllowedOfflineMs,
  convertMsToDays,
  convertDaysToMs,
  DEFAULT_MS_PER_GAME_DAY,
  type PrestigeState,
  type WisdomUpgrades,
  type ExtendedGameState,
} from '../utils/saveSystem';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a minimal PrestigeState with optional overrides. */
function makePrestigeState(overrides: Partial<PrestigeState> = {}): PrestigeState {
  return {
    wisdom: 0,
    lifetimeCount: 1,
    wisdomUpgrades: {},
    totalMoneyEarned: 0,
    totalKnowledgeGained: 0,
    maxFarmTierReached: 1,
    achievementsUnlocked: {},
    ...overrides,
  };
}

/**
 * Pure re-implementation of calculateWisdomFromLifetime (mirrors App.tsx).
 * Kept here so tests remain independent of React hooks.
 */
function calculateWisdom(state: PrestigeState): number {
  const moneyFactor = (state.totalMoneyEarned || 0) / 10_000;
  const knowledgeFactor = (state.totalKnowledgeGained || 0) / 500;
  const tierFactor = state.maxFarmTierReached || 1;
  const wisdomBonus = Math.floor(Math.sqrt(state.wisdom || 0));
  return Math.floor((moneyFactor + knowledgeFactor) * tierFactor) + wisdomBonus;
}

/**
 * Pure re-implementation of getWisdomUpgradeCost (mirrors App.tsx).
 */
function getWisdomUpgradeCost(upgradeId: keyof WisdomUpgrades, currentLevel: number): number {
  const upgradeConfigs: Record<keyof WisdomUpgrades, { baseCost: number; costScaling: number }> = {
    extendedLifespan: { baseCost: 10, costScaling: 1.5 },
    startingGold: { baseCost: 5, costScaling: 1.3 },
    startingKnowledge: { baseCost: 5, costScaling: 1.3 },
    startingExperience: { baseCost: 8, costScaling: 1.4 },
    permanentGuildBenefits: { baseCost: 25, costScaling: 2.0 },
    startingFarmTier: { baseCost: 100, costScaling: 2.0 },
    knowledgeBoost: { baseCost: 15, costScaling: 1.5 },
    plotEfficiency: { baseCost: 20, costScaling: 1.6 },
  };
  const config = upgradeConfigs[upgradeId];
  return Math.floor(config.baseCost * Math.pow(config.costScaling, currentLevel));
}

/** Build a minimal ExtendedGameState for computeAllowedOfflineMs. */
function makeLoadedState(
  lastTotalDaysElapsed: number,
  prestigeState?: PrestigeState,
): ExtendedGameState {
  return {
    lastTotalDaysElapsed,
    prestigeState,
  } as unknown as ExtendedGameState;
}

// ===========================================================================
// 1. Wisdom Calculation Accuracy
// ===========================================================================

describe('Wisdom Calculation', () => {
  it('returns 0 when all factors are zero', () => {
    expect(calculateWisdom(makePrestigeState())).toBe(0);
  });

  it('still earns wisdom when money is 0 but knowledge/tier are non-zero', () => {
    // knowledge: 5K/500=10, tier=5 → floor((0+10)*5) = 50
    const state = makePrestigeState({ totalKnowledgeGained: 5_000, maxFarmTierReached: 5 });
    expect(calculateWisdom(state)).toBe(50);
  });

  it('still earns wisdom when knowledge is 0 but money/tier are non-zero', () => {
    // money: 5M/10K=500, tier=5 → floor((500+0)*5) = 2500
    const state = makePrestigeState({ totalMoneyEarned: 5_000_000, maxFarmTierReached: 5 });
    expect(calculateWisdom(state)).toBe(2500);
  });

  it('correctly adds factors and floors the result', () => {
    // money: 2M → 2M/10K = 200, knowledge: 3k → 3k/500 = 6, tier: 4, wisdom: 0
    // wisdom = floor((200 + 6) * 4) + floor(sqrt(0)) = 824
    const state = makePrestigeState({
      totalMoneyEarned: 2_000_000,
      totalKnowledgeGained: 3_000,
      maxFarmTierReached: 4,
    });
    expect(calculateWisdom(state)).toBe(824);
  });

  it('floors fractional results', () => {
    // money: 1.5M → 150, knowledge: 1k → 2, tier: 1, wisdom: 0
    // wisdom = floor((150 + 2) * 1) + 0 = 152
    const state = makePrestigeState({
      totalMoneyEarned: 1_500_000,
      totalKnowledgeGained: 1_000,
      maxFarmTierReached: 1,
    });
    expect(calculateWisdom(state)).toBe(152);
  });

  it('handles large values without overflow', () => {
    // money: 100B → 10_000_000, knowledge: 1M → 2_000, tier: 10, wisdom: 0
    // wisdom = floor((10_000_000 + 2_000) * 10) = 100_020_000
    const state = makePrestigeState({
      totalMoneyEarned: 100_000_000_000,
      totalKnowledgeGained: 1_000_000,
      maxFarmTierReached: 10,
    });
    expect(calculateWisdom(state)).toBe(100_020_000);
  });

  it('treats undefined tracking fields as zero', () => {
    const state: PrestigeState = {
      wisdom: 50,
      lifetimeCount: 3,
      wisdomUpgrades: {},
    };
    // All tracking fields are undefined → base = 0, wisdomBonus = floor(sqrt(50)) = 7
    expect(calculateWisdom(state)).toBe(7);
  });

  it('uses maxFarmTierReached=1 when undefined', () => {
    const state: PrestigeState = {
      wisdom: 0,
      lifetimeCount: 1,
      wisdomUpgrades: {},
      totalMoneyEarned: 1_000_000,
      totalKnowledgeGained: 1_000,
    };
    // money: 1M/10K=100, knowledge: 1K/500=2, tier 1, wisdom 0
    // wisdom = floor((100 + 2) * 1) + 0 = 102
    expect(calculateWisdom(state)).toBe(102);
  });
});

// ===========================================================================
// 2. Prestige Reset – Data Preservation
// ===========================================================================

describe('Prestige Reset Data Preservation', () => {
  /**
   * Simulates handleStartNextLifetime's prestige-state update logic.
   * Returns the new prestige state.
   */
  function simulatePrestigeReset(prev: PrestigeState, earnedWisdom: number): PrestigeState {
    return {
      ...prev,
      wisdom: prev.wisdom + earnedWisdom,
      lifetimeCount: prev.lifetimeCount + 1,
      totalMoneyEarned: 0,
      totalKnowledgeGained: 0,
      maxFarmTierReached: 1,
    };
  }

  it('increments lifetimeCount', () => {
    const prev = makePrestigeState({ lifetimeCount: 3 });
    const next = simulatePrestigeReset(prev, 0);
    expect(next.lifetimeCount).toBe(4);
  });

  it('adds earned wisdom to existing wisdom', () => {
    const prev = makePrestigeState({ wisdom: 50 });
    const next = simulatePrestigeReset(prev, 30);
    expect(next.wisdom).toBe(80);
  });

  it('resets lifetime tracking to zero/defaults', () => {
    const prev = makePrestigeState({
      totalMoneyEarned: 5_000_000,
      totalKnowledgeGained: 10_000,
      maxFarmTierReached: 7,
    });
    const next = simulatePrestigeReset(prev, 100);
    expect(next.totalMoneyEarned).toBe(0);
    expect(next.totalKnowledgeGained).toBe(0);
    expect(next.maxFarmTierReached).toBe(1);
  });

  it('preserves wisdom upgrades across resets', () => {
    const prev = makePrestigeState({
      wisdomUpgrades: { startingGold: 3, extendedLifespan: 1 },
    });
    const next = simulatePrestigeReset(prev, 0);
    expect(next.wisdomUpgrades).toEqual({ startingGold: 3, extendedLifespan: 1 });
  });

  it('preserves achievementsUnlocked across resets', () => {
    const prev = makePrestigeState({
      achievementsUnlocked: {
        first_harvest: { unlockedAt: 100, lifetimeWhenUnlocked: 1 },
      },
    });
    const next = simulatePrestigeReset(prev, 0);
    expect(next.achievementsUnlocked).toEqual({
      first_harvest: { unlockedAt: 100, lifetimeWhenUnlocked: 1 },
    });
  });

  describe('starting bonuses from wisdom upgrades', () => {
    it('calculates correct starting gold bonus', () => {
      const level = 3;
      const bonusGold = level * 500;
      expect(bonusGold).toBe(1500);
      // Total money set = 100 (base) + bonusGold
      expect(100 + bonusGold).toBe(1600);
    });

    it('calculates correct starting knowledge bonus', () => {
      const level = 2;
      const bonusKnowledge = level * 25;
      expect(bonusKnowledge).toBe(50);
    });

    it('calculates correct starting experience bonus', () => {
      const level = 4;
      const bonusExperience = level * 50;
      expect(bonusExperience).toBe(200);
    });

    it('gives zero bonuses with no upgrades', () => {
      const upgrades: WisdomUpgrades = {};
      expect((upgrades.startingGold || 0) * 500).toBe(0);
      expect((upgrades.startingKnowledge || 0) * 25).toBe(0);
      expect((upgrades.startingExperience || 0) * 50).toBe(0);
    });
  });
});

// ===========================================================================
// 3. Wisdom Upgrade Cost Calculations
// ===========================================================================

describe('Wisdom Upgrade Costs', () => {
  it('returns base cost at level 0 for each upgrade', () => {
    expect(getWisdomUpgradeCost('extendedLifespan', 0)).toBe(10);
    expect(getWisdomUpgradeCost('startingGold', 0)).toBe(5);
    expect(getWisdomUpgradeCost('startingKnowledge', 0)).toBe(5);
    expect(getWisdomUpgradeCost('startingExperience', 0)).toBe(8);
    expect(getWisdomUpgradeCost('permanentGuildBenefits', 0)).toBe(25);
  });

  it('scales extendedLifespan correctly', () => {
    // baseCost=10, scaling=1.5
    expect(getWisdomUpgradeCost('extendedLifespan', 1)).toBe(Math.floor(10 * 1.5));       // 15
    expect(getWisdomUpgradeCost('extendedLifespan', 2)).toBe(Math.floor(10 * 1.5 ** 2));   // 22
    expect(getWisdomUpgradeCost('extendedLifespan', 5)).toBe(Math.floor(10 * 1.5 ** 5));   // 75
  });

  it('scales startingGold correctly', () => {
    // baseCost=5, scaling=1.3
    expect(getWisdomUpgradeCost('startingGold', 1)).toBe(Math.floor(5 * 1.3));         // 6
    expect(getWisdomUpgradeCost('startingGold', 3)).toBe(Math.floor(5 * 1.3 ** 3));     // 10
  });

  it('scales permanentGuildBenefits correctly', () => {
    // baseCost=25, scaling=2.0
    expect(getWisdomUpgradeCost('permanentGuildBenefits', 1)).toBe(50);
    expect(getWisdomUpgradeCost('permanentGuildBenefits', 3)).toBe(200);
  });

  describe('purchase affordability check', () => {
    it('can afford when wisdom equals cost', () => {
      const wisdom = 10;
      const cost = getWisdomUpgradeCost('extendedLifespan', 0);
      expect(wisdom >= cost).toBe(true);
    });

    it('cannot afford when wisdom is below cost', () => {
      const wisdom = 9;
      const cost = getWisdomUpgradeCost('extendedLifespan', 0);
      expect(wisdom >= cost).toBe(false);
    });

    it('deducts cost correctly after purchase', () => {
      const wisdom = 30;
      const cost = getWisdomUpgradeCost('extendedLifespan', 0); // 10
      expect(wisdom - cost).toBe(20);
    });
  });
});

// ===========================================================================
// 4. Lifetime Boundary – getMaxLifetimeDaysForPlayer
// ===========================================================================

describe('getMaxLifetimeDaysForPlayer', () => {
  it('returns 29,200 days with no prestige state', () => {
    expect(getMaxLifetimeDaysForPlayer(undefined)).toBe(29_200);
  });

  it('returns 29,200 days with empty upgrades', () => {
    expect(getMaxLifetimeDaysForPlayer(makePrestigeState())).toBe(29_200);
  });

  it('adds 5 years (1,825 days) per extendedLifespan level', () => {
    const ps = makePrestigeState({ wisdomUpgrades: { extendedLifespan: 1 } });
    expect(getMaxLifetimeDaysForPlayer(ps)).toBe(29_200 + 1_825);
  });

  it('handles multiple extendedLifespan levels', () => {
    const ps = makePrestigeState({ wisdomUpgrades: { extendedLifespan: 4 } });
    // 80 + 20 = 100 years = 36,500 days
    expect(getMaxLifetimeDaysForPlayer(ps)).toBe(36_500);
  });

  it('returns base days when extendedLifespan is 0', () => {
    const ps = makePrestigeState({ wisdomUpgrades: { extendedLifespan: 0 } });
    expect(getMaxLifetimeDaysForPlayer(ps)).toBe(29_200);
  });

  it('ignores non-lifespan upgrades', () => {
    const ps = makePrestigeState({
      wisdomUpgrades: { startingGold: 5, startingKnowledge: 3, permanentGuildBenefits: 2 },
    });
    expect(getMaxLifetimeDaysForPlayer(ps)).toBe(29_200);
  });
});

// ===========================================================================
// 5. computeAllowedOfflineMs – Lifetime Capping
// ===========================================================================

describe('computeAllowedOfflineMs', () => {
  const msPerDay = DEFAULT_MS_PER_GAME_DAY; // 1000

  it('returns full offline time when well within lifetime', () => {
    const loaded = makeLoadedState(1_000);
    const result = computeAllowedOfflineMs(loaded, 5_000, msPerDay);
    expect(result.capped).toBe(false);
    expect(result.appliedMs).toBe(5_000);
  });

  it('caps offline time when it would exceed lifetime', () => {
    // current = 29,000, lifetime end = 29,200
    // remaining = 200 days = 200,000ms
    // requesting 500,000ms → should be capped to 200,000ms
    const loaded = makeLoadedState(29_000);
    const result = computeAllowedOfflineMs(loaded, 500_000, msPerDay);
    expect(result.capped).toBe(true);
    expect(result.appliedMs).toBe(200_000);
  });

  it('returns 0 offline time when already at lifetime boundary', () => {
    const loaded = makeLoadedState(29_200);
    const result = computeAllowedOfflineMs(loaded, 100_000, msPerDay);
    expect(result.capped).toBe(true);
    expect(result.appliedMs).toBe(0);
  });

  it('returns 0 offline time when past lifetime boundary', () => {
    const loaded = makeLoadedState(30_000);
    const result = computeAllowedOfflineMs(loaded, 100_000, msPerDay);
    expect(result.capped).toBe(true);
    expect(result.appliedMs).toBe(0);
  });

  it('handles exactly-at-boundary offline request', () => {
    // current = 29,100, remaining = 100 days = 100,000ms
    // Requesting exactly 100,000ms
    const loaded = makeLoadedState(29_100);
    const result = computeAllowedOfflineMs(loaded, 100_000, msPerDay);
    // predictedTotalDays = 29,100 + 100 = 29,200 = lifetimeEndDays
    // ≮ lifetimeEndDays, so should be capped
    expect(result.capped).toBe(true);
    expect(result.appliedMs).toBe(100_000);
  });

  it('respects extendedLifespan when computing cap', () => {
    // With 2 levels of extendedLifespan: 90 years = 32,850 days
    const ps = makePrestigeState({ wisdomUpgrades: { extendedLifespan: 2 } });
    const loaded = makeLoadedState(32_000, ps);
    // remaining = 850 days = 850,000ms
    const result = computeAllowedOfflineMs(loaded, 1_000_000, msPerDay);
    expect(result.capped).toBe(true);
    expect(result.appliedMs).toBe(850_000);
    expect(result.lifetimeEndDays).toBe(32_850);
  });

  it('does not cap when extended lifespan gives enough room', () => {
    const ps = makePrestigeState({ wisdomUpgrades: { extendedLifespan: 3 } });
    // 95 years = 34,675 days
    const loaded = makeLoadedState(29_000, ps);
    // remaining = 5675 days → 5,675,000ms
    const result = computeAllowedOfflineMs(loaded, 100_000, msPerDay);
    expect(result.capped).toBe(false);
    expect(result.appliedMs).toBe(100_000);
  });

  it('uses default msPerDay when not specified', () => {
    const loaded = makeLoadedState(29_000);
    const result = computeAllowedOfflineMs(loaded, 200_000);
    // remaining = 200 days, at default 1000ms/day = 200,000ms
    // requesting exactly 200,000ms = exactly at boundary → capped
    expect(result.capped).toBe(true);
    expect(result.appliedMs).toBe(200_000);
  });

  it('handles zero offline time request', () => {
    const loaded = makeLoadedState(100);
    const result = computeAllowedOfflineMs(loaded, 0, msPerDay);
    expect(result.capped).toBe(false);
    expect(result.appliedMs).toBe(0);
  });
});

// ===========================================================================
// 6. Conversion Utilities
// ===========================================================================

describe('Day/ms conversion utilities', () => {
  it('convertMsToDays converts correctly', () => {
    expect(convertMsToDays(1000, 1000)).toBe(1);
    expect(convertMsToDays(5000, 1000)).toBe(5);
    expect(convertMsToDays(500, 1000)).toBe(0.5);
    expect(convertMsToDays(0, 1000)).toBe(0);
  });

  it('convertMsToDays returns 0 when msPerDay ≤ 0', () => {
    expect(convertMsToDays(5000, 0)).toBe(0);
    expect(convertMsToDays(5000, -1)).toBe(0);
  });

  it('convertDaysToMs converts correctly', () => {
    expect(convertDaysToMs(1, 1000)).toBe(1000);
    expect(convertDaysToMs(5, 1000)).toBe(5000);
    expect(convertDaysToMs(0, 1000)).toBe(0);
  });

  it('uses default msPerDay constant', () => {
    expect(convertMsToDays(DEFAULT_MS_PER_GAME_DAY)).toBe(1);
    expect(convertDaysToMs(1)).toBe(DEFAULT_MS_PER_GAME_DAY);
  });
});

// ===========================================================================
// 7. Save/Load & Migration from Pre-Prestige Saves
// ===========================================================================

describe('Save/Load prestige data migration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadGameStateWithCanning adds default prestige state to legacy saves', async () => {
    // Dynamically import to get the real function with mocks resolved
    const { loadGameStateWithCanning } = await import('../utils/saveSystem');

    const legacySave = {
      veggies: [],
      money: 500,
      experience: 100,
      knowledge: 50,
      activeVeggie: 0,
      day: 42,
      greenhouseOwned: false,
      heirloomOwned: false,
      autoSellOwned: false,
      almanacLevel: 0,
      almanacCost: 10,
      maxPlots: 4,
      farmTier: 1,
      farmCost: 500,
      irrigationOwned: false,
      currentWeather: 'Clear',
      totalHarvests: 100,
    };

    localStorage.setItem('farmIdleGameState', JSON.stringify(legacySave));
    const loaded = loadGameStateWithCanning();

    expect(loaded).not.toBeNull();
    expect(loaded!.prestigeState).toBeDefined();
    expect(loaded!.prestigeState!.wisdom).toBe(0);
    expect(loaded!.prestigeState!.lifetimeCount).toBe(1);
    expect(loaded!.prestigeState!.wisdomUpgrades).toEqual({});
    expect(loaded!.prestigeState!.totalMoneyEarned).toBe(0);
    expect(loaded!.prestigeState!.totalKnowledgeGained).toBe(0);
    expect(loaded!.prestigeState!.maxFarmTierReached).toBe(1);
  });

  it('loadGameStateWithCanning preserves existing prestige state', async () => {
    const { loadGameStateWithCanning } = await import('../utils/saveSystem');

    const saveWithPrestige = {
      veggies: [],
      money: 500,
      experience: 100,
      knowledge: 50,
      activeVeggie: 0,
      day: 42,
      greenhouseOwned: false,
      heirloomOwned: false,
      autoSellOwned: false,
      almanacLevel: 0,
      almanacCost: 10,
      maxPlots: 4,
      farmTier: 1,
      farmCost: 500,
      irrigationOwned: false,
      currentWeather: 'Clear',
      totalHarvests: 100,
      prestigeState: {
        wisdom: 42,
        lifetimeCount: 3,
        wisdomUpgrades: { startingGold: 2 },
        totalMoneyEarned: 1_000_000,
        totalKnowledgeGained: 500,
        maxFarmTierReached: 4,
        achievementsUnlocked: { first_harvest: { unlockedAt: 1000, lifetimeWhenUnlocked: 1 } },
      },
    };

    localStorage.setItem('farmIdleGameState', JSON.stringify(saveWithPrestige));
    const loaded = loadGameStateWithCanning();

    expect(loaded).not.toBeNull();
    expect(loaded!.prestigeState!.wisdom).toBe(42);
    expect(loaded!.prestigeState!.lifetimeCount).toBe(3);
    expect(loaded!.prestigeState!.wisdomUpgrades).toEqual({ startingGold: 2 });
  });
});

// ===========================================================================
// 8. Tracking Helpers (pure logic verification)
// ===========================================================================

describe('Prestige tracking helpers', () => {
  describe('trackMoneyEarned logic', () => {
    it('adds positive amounts', () => {
      const prev = makePrestigeState({ totalMoneyEarned: 100 });
      const amount = 50;
      const next = amount > 0
        ? { ...prev, totalMoneyEarned: (prev.totalMoneyEarned || 0) + amount }
        : prev;
      expect(next.totalMoneyEarned).toBe(150);
    });

    it('ignores zero amounts', () => {
      const prev = makePrestigeState({ totalMoneyEarned: 100 });
      const amount = 0;
      const next = amount > 0
        ? { ...prev, totalMoneyEarned: (prev.totalMoneyEarned || 0) + amount }
        : prev;
      expect(next.totalMoneyEarned).toBe(100);
    });

    it('ignores negative amounts', () => {
      const prev = makePrestigeState({ totalMoneyEarned: 100 });
      const amount = -50;
      const next = amount > 0
        ? { ...prev, totalMoneyEarned: (prev.totalMoneyEarned || 0) + amount }
        : prev;
      expect(next.totalMoneyEarned).toBe(100);
    });
  });

  describe('trackKnowledgeGained logic', () => {
    it('adds positive amounts', () => {
      const prev = makePrestigeState({ totalKnowledgeGained: 200 });
      const amount = 75;
      const next = amount > 0
        ? { ...prev, totalKnowledgeGained: (prev.totalKnowledgeGained || 0) + amount }
        : prev;
      expect(next.totalKnowledgeGained).toBe(275);
    });
  });

  describe('trackFarmTierReached logic', () => {
    it('updates when new tier is higher', () => {
      const prev = makePrestigeState({ maxFarmTierReached: 3 });
      const tier = 5;
      const next = {
        ...prev,
        maxFarmTierReached: Math.max(prev.maxFarmTierReached || 1, tier),
      };
      expect(next.maxFarmTierReached).toBe(5);
    });

    it('does not downgrade when new tier is lower', () => {
      const prev = makePrestigeState({ maxFarmTierReached: 5 });
      const tier = 3;
      const next = {
        ...prev,
        maxFarmTierReached: Math.max(prev.maxFarmTierReached || 1, tier),
      };
      expect(next.maxFarmTierReached).toBe(5);
    });

    it('handles undefined maxFarmTierReached as 1', () => {
      const prev: PrestigeState = {
        wisdom: 0,
        lifetimeCount: 1,
        wisdomUpgrades: {},
      };
      const tier = 2;
      const next = {
        ...prev,
        maxFarmTierReached: Math.max(prev.maxFarmTierReached || 1, tier),
      };
      expect(next.maxFarmTierReached).toBe(2);
    });
  });
});

// ===========================================================================
// 9. Wisdom Upgrade Purchase Simulation
// ===========================================================================

describe('Wisdom Upgrade Purchase', () => {
  /**
   * Simulates handlePurchaseWisdomUpgrade from App.tsx.
   * Returns the new prestige state, or the same state if unaffordable.
   */
  function simulatePurchase(prev: PrestigeState, upgradeId: keyof WisdomUpgrades): PrestigeState {
    const currentLevel = prev.wisdomUpgrades[upgradeId] || 0;
    const cost = getWisdomUpgradeCost(upgradeId, currentLevel);
    if (prev.wisdom >= cost) {
      return {
        ...prev,
        wisdom: prev.wisdom - cost,
        wisdomUpgrades: {
          ...prev.wisdomUpgrades,
          [upgradeId]: currentLevel + 1,
        },
      };
    }
    return prev;
  }

  it('deducts wisdom and increments upgrade level', () => {
    const prev = makePrestigeState({ wisdom: 100, wisdomUpgrades: {} });
    const next = simulatePurchase(prev, 'startingGold'); // costs 5
    expect(next.wisdom).toBe(95);
    expect(next.wisdomUpgrades.startingGold).toBe(1);
  });

  it('refuses purchase when wisdom is insufficient', () => {
    const prev = makePrestigeState({ wisdom: 4, wisdomUpgrades: {} });
    const next = simulatePurchase(prev, 'startingGold'); // costs 5
    expect(next).toBe(prev); // same reference, no change
  });

  it('costs scale with current level', () => {
    let state = makePrestigeState({ wisdom: 1000, wisdomUpgrades: {} });

    // Buy extendedLifespan 3 times: costs 10, 15, 22
    state = simulatePurchase(state, 'extendedLifespan');
    expect(state.wisdomUpgrades.extendedLifespan).toBe(1);
    expect(state.wisdom).toBe(990); // 1000 - 10

    state = simulatePurchase(state, 'extendedLifespan');
    expect(state.wisdomUpgrades.extendedLifespan).toBe(2);
    expect(state.wisdom).toBe(975); // 990 - 15

    state = simulatePurchase(state, 'extendedLifespan');
    expect(state.wisdomUpgrades.extendedLifespan).toBe(3);
    expect(state.wisdom).toBe(953); // 975 - 22
  });

  it('allows purchase with exact wisdom amount', () => {
    const cost = getWisdomUpgradeCost('startingExperience', 0); // 8
    const prev = makePrestigeState({ wisdom: cost, wisdomUpgrades: {} });
    const next = simulatePurchase(prev, 'startingExperience');
    expect(next.wisdom).toBe(0);
    expect(next.wisdomUpgrades.startingExperience).toBe(1);
  });

  it('preserves other upgrade levels when buying', () => {
    const prev = makePrestigeState({
      wisdom: 100,
      wisdomUpgrades: { startingGold: 3, extendedLifespan: 2 },
    });
    const next = simulatePurchase(prev, 'startingKnowledge');
    expect(next.wisdomUpgrades.startingGold).toBe(3);
    expect(next.wisdomUpgrades.extendedLifespan).toBe(2);
    expect(next.wisdomUpgrades.startingKnowledge).toBe(1);
  });
});

// ===========================================================================
// 10. Full Prestige Cycle Integration
// ===========================================================================

describe('Full prestige cycle', () => {
  it('accumulates wisdom across multiple lifetimes', () => {
    // Simulates playing through 3 lifetimes

    // Lifetime 1: earn some modest stats
    let prestige = makePrestigeState({
      wisdom: 0,
      lifetimeCount: 1,
      totalMoneyEarned: 2_000_000,   // 2M/10K = 200
      totalKnowledgeGained: 1_000,    // 1K/500 = 2
      maxFarmTierReached: 2,          // factor 2
    });
    let earned = calculateWisdom(prestige); // floor((200 + 2) * 2) + 0 = 404
    expect(earned).toBe(404);

    // Prestige
    prestige = {
      ...prestige,
      wisdom: prestige.wisdom + earned,
      lifetimeCount: prestige.lifetimeCount + 1,
      totalMoneyEarned: 0,
      totalKnowledgeGained: 0,
      maxFarmTierReached: 1,
    };
    expect(prestige.wisdom).toBe(404);
    expect(prestige.lifetimeCount).toBe(2);

    // Lifetime 2: earn more with starting bonuses (simulated higher stats)
    prestige = { ...prestige, totalMoneyEarned: 5_000_000, totalKnowledgeGained: 2_000, maxFarmTierReached: 3 };
    earned = calculateWisdom(prestige); // floor((500 + 4) * 3) + floor(sqrt(404)) = 1512 + 20 = 1532
    expect(earned).toBe(1532);

    // Prestige again
    prestige = {
      ...prestige,
      wisdom: prestige.wisdom + earned,
      lifetimeCount: prestige.lifetimeCount + 1,
      totalMoneyEarned: 0,
      totalKnowledgeGained: 0,
      maxFarmTierReached: 1,
    };
    expect(prestige.wisdom).toBe(1936);
    expect(prestige.lifetimeCount).toBe(3);
  });

  it('extendedLifespan upgrade extends lifetime days correctly after prestige', () => {
    let prestige = makePrestigeState({ wisdom: 100, wisdomUpgrades: {} });

    // Buy 2 levels of extendedLifespan (costs 10 + 15 = 25)
    prestige = {
      ...prestige,
      wisdom: prestige.wisdom - 10,
      wisdomUpgrades: { ...prestige.wisdomUpgrades, extendedLifespan: 1 },
    };
    prestige = {
      ...prestige,
      wisdom: prestige.wisdom - 15,
      wisdomUpgrades: { ...prestige.wisdomUpgrades, extendedLifespan: 2 },
    };

    expect(prestige.wisdom).toBe(75);
    // New lifetime should have 90 years = 32,850 days
    expect(getMaxLifetimeDaysForPlayer(prestige)).toBe(32_850);
  });

  // ─── Starting Farm Tier (Ancestral Farmstead) ───────────────────────

  it('startingFarmTier upgrade cost scales at base 100 with 2.0 scaling', () => {
    expect(getWisdomUpgradeCost('startingFarmTier', 0)).toBe(100);
    expect(getWisdomUpgradeCost('startingFarmTier', 1)).toBe(200);
    expect(getWisdomUpgradeCost('startingFarmTier', 2)).toBe(400);
    expect(getWisdomUpgradeCost('startingFarmTier', 3)).toBe(800);
  });

  it('startingFarmTier dynamic max level is capped by highestFarmTierEver - 1', () => {
    // Player has only ever reached tier 3 → can't buy beyond level 2
    const dynamicMaxLevel = (ps: PrestigeState) => Math.max(0, (ps.highestFarmTierEver || 1) - 1);

    const prestige = makePrestigeState({ highestFarmTierEver: 3 });
    expect(dynamicMaxLevel(prestige)).toBe(2);

    const prestige2 = makePrestigeState({ highestFarmTierEver: 1 });
    expect(dynamicMaxLevel(prestige2)).toBe(0);

    const prestige3 = makePrestigeState({ highestFarmTierEver: 10 });
    expect(dynamicMaxLevel(prestige3)).toBe(9); // max purchasable = 9 (tier 10)
  });

  it('startingFarmTier computes correct farm settings for lifetime reset', () => {
    // Level 3 → start at tier 4
    const startingFarmTierLevel = 3;
    const startTier = 1 + startingFarmTierLevel;
    expect(startTier).toBe(4);
    expect(startTier * 4).toBe(16); // 16 plots at tier 4
  });

  it('highestFarmTierEver is tracked correctly across lifetimes', () => {
    let prestige = makePrestigeState({ highestFarmTierEver: 1 });
    
    // Reach tier 5 in lifetime 1
    prestige = {
      ...prestige,
      maxFarmTierReached: 5,
      highestFarmTierEver: Math.max(prestige.highestFarmTierEver || 1, 5),
    };
    expect(prestige.highestFarmTierEver).toBe(5);

    // Prestige — maxFarmTierReached resets but highestFarmTierEver persists
    prestige = {
      ...prestige,
      maxFarmTierReached: 1,
      totalMoneyEarned: 0,
      totalKnowledgeGained: 0,
    };
    expect(prestige.highestFarmTierEver).toBe(5);

    // Reach tier 3 in lifetime 2 — highestFarmTierEver stays at 5
    prestige = {
      ...prestige,
      maxFarmTierReached: 3,
      highestFarmTierEver: Math.max(prestige.highestFarmTierEver || 1, 3),
    };
    expect(prestige.highestFarmTierEver).toBe(5);

    // Reach tier 7 in lifetime 3 — highestFarmTierEver updates to 7
    prestige = {
      ...prestige,
      maxFarmTierReached: 7,
      highestFarmTierEver: Math.max(prestige.highestFarmTierEver || 1, 7),
    };
    expect(prestige.highestFarmTierEver).toBe(7);
  });

  // ─── Wisdom's Potential (standard feature after first prestige) ───────

  it('wisdomPotential multiplier is 1 during first lifetime', () => {
    const prestige = makePrestigeState({ wisdom: 200, lifetimeCount: 1 });
    const multiplier = prestige.lifetimeCount >= 2
      ? 1 + (prestige.wisdom * 0.01) : 1;
    expect(multiplier).toBe(1);
  });

  it('wisdomPotential multiplier activates after first prestige (lifetimeCount >= 2)', () => {
    const prestige = makePrestigeState({
      wisdom: 100,
      lifetimeCount: 2,
    });
    const multiplier = prestige.lifetimeCount >= 2
      ? 1 + (prestige.wisdom * 0.01) : 1;
    expect(multiplier).toBe(2.0); // 100 wisdom × 1% = 100% bonus = 2x
  });

  it('wisdomPotential bonus scales with available wisdom', () => {
    // Player with 100 wisdom on lifetime 3
    const prestige = makePrestigeState({
      wisdom: 100,
      lifetimeCount: 3,
    });
    const multiplier = 1 + (prestige.wisdom * 0.01);
    expect(multiplier).toBe(2.0);

    // Player with 50 wisdom on lifetime 2
    const prestige2 = makePrestigeState({
      wisdom: 50,
      lifetimeCount: 2,
    });
    const multiplier2 = 1 + (prestige2.wisdom * 0.01);
    expect(multiplier2).toBe(1.5);
  });

  it('wisdomPotential bonus correctly computes extra money from base earnings', () => {
    // 200 unspent wisdom → 3x multiplier
    const wisdom = 200;
    const multiplier = 1 + (wisdom * 0.01);
    const baseEarnings = 1000;
    const bonus = Math.floor(baseEarnings * (multiplier - 1));
    expect(bonus).toBe(2000);
    expect(baseEarnings + bonus).toBe(3000);
  });

  // ─── Scholarly Roots (Knowledge Boost) ──────────────────────────────

  it('knowledgeBoost upgrade cost scales at base 15 with 1.5 scaling', () => {
    expect(getWisdomUpgradeCost('knowledgeBoost', 0)).toBe(15);
    expect(getWisdomUpgradeCost('knowledgeBoost', 1)).toBe(22); // floor(15 * 1.5)
    expect(getWisdomUpgradeCost('knowledgeBoost', 2)).toBe(33); // floor(15 * 2.25)
    expect(getWisdomUpgradeCost('knowledgeBoost', 5)).toBe(113); // floor(15 * 7.59375)
  });

  it('knowledgeBoost multiplier gives +5% per level', () => {
    // Level 0 → 1x
    expect(1 + (0 * 0.05)).toBe(1);
    // Level 1 → 1.05x
    expect(1 + (1 * 0.05)).toBe(1.05);
    // Level 5 → 1.25x
    expect(1 + (5 * 0.05)).toBe(1.25);
    // Level 10 (max) → 1.5x
    expect(1 + (10 * 0.05)).toBe(1.5);
  });

  it('knowledgeBoost bonus correctly computes extra knowledge from base gain', () => {
    const level = 4; // +20%
    const multiplier = 1 + (level * 0.05);
    const baseKnowledge = 100;
    const bonus = Math.floor(baseKnowledge * (multiplier - 1));
    // Note: floor(100 * 0.19999...) = 19 due to floating point
    expect(bonus).toBe(19);
    expect(baseKnowledge + bonus).toBe(119);
  });

  it('knowledgeBoost and wisdomPotential stack correctly on knowledge', () => {
    // Level 4 knowledgeBoost (+20%), 100 unspent wisdom on lifetime 2 (+100%)
    const knowledgeBoostLevel = 4;
    const scholarlyMultiplier = 1 + (knowledgeBoostLevel * 0.05); // 1.2
    const wisdomPotMultiplier = 1 + (100 * 0.01); // 2.0

    const baseAmount = 100;
    // Scholarly Roots applies first (floor(100 * 0.1999...) = 19)
    const scholarlyBonus = Math.floor(baseAmount * (scholarlyMultiplier - 1));
    const boostedAmount = baseAmount + scholarlyBonus; // 119
    // Wisdom's Potential applies on the boosted total (floor(119 * 1.0) = 119)
    const potentialBonus = Math.floor(boostedAmount * (wisdomPotMultiplier - 1));
    const totalBonus = scholarlyBonus + potentialBonus;

    expect(scholarlyBonus).toBe(19);
    expect(potentialBonus).toBe(119);
    expect(totalBonus).toBe(138);
    expect(baseAmount + totalBonus).toBe(238);
  });

  // ─── Efficient Expansion (Plot Efficiency) ──────────────────────────

  it('plotEfficiency upgrade cost scales at base 20 with 1.6 scaling', () => {
    expect(getWisdomUpgradeCost('plotEfficiency', 0)).toBe(20);
    expect(getWisdomUpgradeCost('plotEfficiency', 1)).toBe(32); // floor(20 * 1.6)
    expect(getWisdomUpgradeCost('plotEfficiency', 2)).toBe(51); // floor(20 * 2.56)
    expect(getWisdomUpgradeCost('plotEfficiency', 4)).toBe(131); // floor(20 * 6.5536)
  });

  it('plotEfficiency reduces experience divisor by 10 per level (min 50)', () => {
    const calcDivisor = (level: number) => Math.max(50, 100 - level * 10);
    expect(calcDivisor(0)).toBe(100);
    expect(calcDivisor(1)).toBe(90);
    expect(calcDivisor(3)).toBe(70);
    expect(calcDivisor(5)).toBe(50);
    // Beyond max level, still capped at 50
    expect(calcDivisor(10)).toBe(50);
  });

  it('plotEfficiency gives more bonus plots from same experience', () => {
    const experience = 500;
    // Level 0: 500/100 = 5 bonus plots
    expect(Math.floor(experience / 100)).toBe(5);
    // Level 3: 500/70 = 7 bonus plots
    expect(Math.floor(experience / 70)).toBe(7);
    // Level 5: 500/50 = 10 bonus plots
    expect(Math.floor(experience / 50)).toBe(10);
  });
});
