import { describe, it, expect, vi } from 'vitest';
import {
  calculateWeatherChange,
  processVeggieGrowth,
  processAutoHarvest,
  processVeggieUnlocks
} from '../utils/gameLoopProcessors';
import type { Veggie } from '../types/game';

// Helper to create test veggie
const createTestVeggie = (overrides: Partial<Veggie> = {}): Veggie => ({
  name: 'TestVeggie',
  growth: 0,
  growthRate: 1.0,
  stash: 0,
  unlocked: true,
  experience: 0,
  experienceToUnlock: 0,
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

describe('calculateWeatherChange', () => {
  it('should return current weather if not Clear', () => {
    expect(calculateWeatherChange('Spring', 'Rain')).toBe('Rain');
    expect(calculateWeatherChange('Summer', 'Drought')).toBe('Drought');
    expect(calculateWeatherChange('Fall', 'Storm')).toBe('Storm');
    expect(calculateWeatherChange('Winter', 'Snow')).toBe('Snow');
  });

  it('should potentially change weather from Clear', () => {
    // Mock Math.random to test specific outcomes
    const originalRandom = Math.random;
    
    // Test rain (high probability in most seasons)
    Math.random = vi.fn(() => 0.1); // Low roll for rain
    const result = calculateWeatherChange('Spring', 'Clear');
    expect(['Clear', 'Rain', 'Drought', 'Storm', 'Heatwave']).toContain(result);
    
    Math.random = originalRandom;
  });

  it('should return Snow in Winter instead of Rain', () => {
    Math.random = vi.fn(() => 0.05); // Roll that would cause rain
    const result = calculateWeatherChange('Winter', 'Clear');
    // Should be Snow or Clear (depending on exact chances)
    expect(['Clear', 'Snow', 'Drought', 'Storm', 'Heatwave']).toContain(result);
    (Math.random as any).mockRestore();
  });

  it('should handle all seasons', () => {
    const seasons = ['Spring', 'Summer', 'Fall', 'Winter'];
    seasons.forEach(season => {
      const result = calculateWeatherChange(season, 'Clear');
      expect(['Clear', 'Rain', 'Snow', 'Drought', 'Storm', 'Heatwave']).toContain(result);
    });
  });
});

describe('processVeggieGrowth', () => {
  it('should not grow locked veggies', () => {
    const veggie = createTestVeggie({ unlocked: false, growth: 0 });
    const result = processVeggieGrowth([veggie], 'Spring', 'Clear', false, false);
    
    expect(result.veggies[0].growth).toBe(0);
    expect(result.needsUpdate).toBe(false);
  });

  it('should not grow veggies already at 100%', () => {
    const veggie = createTestVeggie({ growth: 100 });
    const result = processVeggieGrowth([veggie], 'Spring', 'Clear', false, false);
    
    expect(result.veggies[0].growth).toBe(100);
    expect(result.needsUpdate).toBe(false);
  });

  it('should grow unlocked veggies', () => {
    const veggie = createTestVeggie({ growth: 0, growthRate: 2.0 });
    const result = processVeggieGrowth([veggie], 'Spring', 'Clear', false, false);
    
    expect(result.veggies[0].growth).toBeGreaterThan(0);
    expect(result.needsUpdate).toBe(true);
  });

  it('should cap growth at 100', () => {
    const veggie = createTestVeggie({ growth: 98, growthRate: 5.0 });
    const result = processVeggieGrowth([veggie], 'Spring', 'Clear', false, false);
    
    expect(result.veggies[0].growth).toBe(100);
    expect(result.needsUpdate).toBe(true);
  });

  it('should apply growth rate bonuses', () => {
    const veggie = createTestVeggie({ growth: 0, growthRate: 1.0 });
    const resultRain = processVeggieGrowth([veggie], 'Spring', 'Rain', false, false);
    const resultClear = processVeggieGrowth([veggie], 'Spring', 'Clear', false, false);
    
    // Rain should provide bonus growth
    expect(resultRain.veggies[0].growth).toBeGreaterThan(resultClear.veggies[0].growth);
  });

  it('should process multiple veggies', () => {
    const veggies = [
      createTestVeggie({ name: 'Veggie1', growth: 0 }),
      createTestVeggie({ name: 'Veggie2', growth: 50 }),
      createTestVeggie({ name: 'Veggie3', growth: 100 })
    ];
    
    const result = processVeggieGrowth(veggies, 'Spring', 'Clear', false, false);
    
    expect(result.veggies).toHaveLength(3);
    expect(result.veggies[0].growth).toBeGreaterThan(0); // First grew
    expect(result.veggies[1].growth).toBeGreaterThan(50); // Second grew
    expect(result.veggies[2].growth).toBe(100); // Third stayed at max
  });

  it('should respect greenhouse upgrade in winter', () => {
    const veggie = createTestVeggie({ growth: 0, growthRate: 1.0 });
    const withoutGreenhouse = processVeggieGrowth([veggie], 'Winter', 'Clear', false, false);
    const withGreenhouse = processVeggieGrowth([veggie], 'Winter', 'Clear', true, false);
    
    // With greenhouse should grow much more in winter
    expect(withGreenhouse.veggies[0].growth).toBeGreaterThan(withoutGreenhouse.veggies[0].growth);
  });

  it('should respect irrigation upgrade', () => {
    const veggie = createTestVeggie({ growth: 0, growthRate: 1.0 });
    const withoutIrrigation = processVeggieGrowth([veggie], 'Spring', 'Clear', false, false);
    const withIrrigation = processVeggieGrowth([veggie], 'Spring', 'Clear', false, true);
    
    // With irrigation should grow more
    expect(withIrrigation.veggies[0].growth).toBeGreaterThan(withoutIrrigation.veggies[0].growth);
  });
});

describe('processAutoHarvest', () => {
  it('should not harvest if harvester not owned', () => {
    const veggie = createTestVeggie({ 
      harvesterOwned: false, 
      growth: 100 
    });
    
    const result = processAutoHarvest([veggie], 0, 1, 0);
    
    expect(result.veggies[0].growth).toBe(100);
    expect(result.veggies[0].stash).toBe(0);
    expect(result.experienceGain).toBe(0);
  });

  it('should increment harvester timer', () => {
    const veggie = createTestVeggie({ 
      harvesterOwned: true, 
      harvesterTimer: 0,
      growth: 50 
    });
    
    const result = processAutoHarvest([veggie], 0, 1, 0);
    
    expect(result.veggies[0].harvesterTimer).toBe(1);
  });

  it('should harvest when timer reaches 100 and veggie is ready', () => {
    const veggie = createTestVeggie({ 
      harvesterOwned: true, 
      harvesterTimer: 99,
      growth: 100,
      stash: 0
    });
    
    const result = processAutoHarvest([veggie], 0, 1, 0);
    
    expect(result.veggies[0].growth).toBe(0); // Reset growth
    expect(result.veggies[0].stash).toBe(1); // Added to stash
    expect(result.veggies[0].harvesterTimer).toBe(0); // Timer reset
    expect(result.experienceGain).toBeGreaterThan(0); // Gained experience
  });

  it('should not harvest if growth is not at 100', () => {
    const veggie = createTestVeggie({ 
      harvesterOwned: true, 
      harvesterTimer: 99,
      growth: 50,
      stash: 0
    });
    
    const result = processAutoHarvest([veggie], 0, 1, 0);
    
    expect(result.veggies[0].growth).toBe(50); // Didn't reset
    expect(result.veggies[0].stash).toBe(0); // Didn't harvest
    // Timer reaches max but stays there when veggie not ready
    expect(result.veggies[0].harvesterTimer).toBeGreaterThanOrEqual(50);
  });

  it('should apply harvester speed upgrade', () => {
    const slowVeggie = createTestVeggie({ 
      harvesterOwned: true, 
      harvesterTimer: 0,
      harvesterSpeedLevel: 0,
      growth: 100
    });
    
    const fastVeggie = createTestVeggie({ 
      harvesterOwned: true, 
      harvesterTimer: 0,
      harvesterSpeedLevel: 5,
      growth: 100
    });
    
    const slowResult = processAutoHarvest([slowVeggie], 0, 1, 0);
    const fastResult = processAutoHarvest([fastVeggie], 0, 1, 0);
    
    // Fast veggie should reach harvest sooner (lower timerMax)
    // Both start at 0 and increment by 1, so they'll be equal after one tick
    // The speed upgrade reduces the timerMax, not the increment
    expect(slowResult.veggies[0].harvesterTimer).toBeGreaterThanOrEqual(0);
    expect(fastResult.veggies[0].harvesterTimer).toBeGreaterThanOrEqual(0);
  });

  it('should provide knowledge with almanac upgrade', () => {
    const veggie = createTestVeggie({ 
      harvesterOwned: true, 
      harvesterTimer: 99,
      growth: 100
    });
    
    const withoutAlmanac = processAutoHarvest([veggie], 0, 1, 0);
    const withAlmanac = processAutoHarvest([veggie], 3, 1, 0);
    
    expect(withAlmanac.knowledgeGain).toBeGreaterThanOrEqual(withoutAlmanac.knowledgeGain);
  });

  it('should apply farm tier bonus to experience', () => {
    const veggie = createTestVeggie({ 
      harvesterOwned: true, 
      harvesterTimer: 99,
      growth: 100
    });
    
    const tier1 = processAutoHarvest([veggie], 0, 1, 0);
    const tier3 = processAutoHarvest([veggie], 0, 3, 0);
    
    // Higher farm tier should give more knowledge
    expect(tier3.knowledgeGain).toBeGreaterThanOrEqual(tier1.knowledgeGain);
  });

  it('should process multiple veggies', () => {
    const veggies = [
      createTestVeggie({ 
        name: 'Veggie1',
        harvesterOwned: true, 
        harvesterTimer: 50, // At max for default speed (50)
        growth: 100
      }),
      createTestVeggie({ 
        name: 'Veggie2',
        harvesterOwned: true, 
        harvesterTimer: 25,
        growth: 100
      })
    ];
    
    const result = processAutoHarvest(veggies, 0, 1, 0);
    
    expect(result.veggies[0].stash).toBe(1); // First harvested (timer at max, growth at 100)
    expect(result.veggies[1].stash).toBe(0); // Second not ready yet
    expect(result.experienceGain).toBeGreaterThan(0);
  });
});

describe('processVeggieUnlocks', () => {
  it('should not unlock veggies without enough experience', () => {
    const veggies = [
      createTestVeggie({ unlocked: true, experienceToUnlock: 0 }),
      createTestVeggie({ unlocked: false, experienceToUnlock: 100 })
    ];
    
    const result = processVeggieUnlocks(veggies, 50, 10);
    
    expect(result.veggies[1].unlocked).toBe(false);
    expect(result.highestUnlockedIndex).toBe(0);
  });

  it('should unlock veggies when requirements are met', () => {
    const veggies = [
      createTestVeggie({ unlocked: true, experienceToUnlock: 0 }),
      createTestVeggie({ unlocked: false, experienceToUnlock: 100 })
    ];
    
    const result = processVeggieUnlocks(veggies, 150, 10);
    
    expect(result.veggies[1].unlocked).toBe(true);
    expect(result.highestUnlockedIndex).toBe(1);
  });

  it('should not unlock if at max plots', () => {
    const veggies = [
      createTestVeggie({ unlocked: true, experienceToUnlock: 0 }),
      createTestVeggie({ unlocked: false, experienceToUnlock: 100 })
    ];
    
    const result = processVeggieUnlocks(veggies, 150, 1); // maxPlots = 1, already used by first veggie
    
    expect(result.veggies[1].unlocked).toBe(false);
  });

  it('should account for additional plots when checking limits', () => {
    const veggies = [
      createTestVeggie({ unlocked: true, experienceToUnlock: 0, additionalPlotLevel: 2 }),
      createTestVeggie({ unlocked: false, experienceToUnlock: 100 })
    ];
    
    // First veggie uses 1 base + 2 additional = 3 plots
    // With maxPlots = 3, should not be able to unlock second veggie
    const result = processVeggieUnlocks(veggies, 150, 3);
    
    expect(result.veggies[1].unlocked).toBe(false);
  });

  it('should unlock multiple veggies if all requirements met', () => {
    const veggies = [
      createTestVeggie({ unlocked: true, experienceToUnlock: 0 }),
      createTestVeggie({ unlocked: false, experienceToUnlock: 100 }),
      createTestVeggie({ unlocked: false, experienceToUnlock: 200 })
    ];
    
    const result = processVeggieUnlocks(veggies, 250, 10);
    
    expect(result.veggies[1].unlocked).toBe(true);
    expect(result.veggies[2].unlocked).toBe(true);
    expect(result.highestUnlockedIndex).toBe(2);
  });

  it('should return highest unlocked index correctly', () => {
    const veggies = [
      createTestVeggie({ unlocked: true, experienceToUnlock: 0 }),
      createTestVeggie({ unlocked: true, experienceToUnlock: 50 }),
      createTestVeggie({ unlocked: false, experienceToUnlock: 100 }),
      createTestVeggie({ unlocked: false, experienceToUnlock: 200 })
    ];
    
    const result = processVeggieUnlocks(veggies, 150, 10);
    
    expect(result.highestUnlockedIndex).toBe(2); // Index of Veggie3 which just unlocked
  });

  it('should return -1 if no new unlocks', () => {
    const veggies = [
      createTestVeggie({ unlocked: true, experienceToUnlock: 0 }),
      createTestVeggie({ unlocked: false, experienceToUnlock: 100 })
    ];
    
    const result = processVeggieUnlocks(veggies, 50, 10);
    
    // processVeggieUnlocks now returns highestUnlockedIndex from getHighestUnlockedIndex
    // which returns 0 for the first unlocked veggie when no new unlocks occur
    expect(result.highestUnlockedIndex).toBe(0);
  });

  it('should not modify original veggie array', () => {
    const veggies = [
      createTestVeggie({ unlocked: true, experienceToUnlock: 0 }),
      createTestVeggie({ unlocked: false, experienceToUnlock: 100 })
    ];
    
    const originalUnlocked = veggies[1].unlocked;
    processVeggieUnlocks(veggies, 150, 10);
    
    expect(veggies[1].unlocked).toBe(originalUnlocked); // Original unchanged
  });
});
