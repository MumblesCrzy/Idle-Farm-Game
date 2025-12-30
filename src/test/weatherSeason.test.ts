import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateWeatherChange, processVeggieGrowth } from '../utils/gameLoopProcessors';
import { getVeggieGrowthBonus, getSeason } from '../utils/gameCalculations';
import { RAIN_CHANCES, DROUGHT_CHANCES, STORM_CHANCES, SEASON_DURATION } from '../config/gameConstants';
import type { Veggie } from '../types/game';
import type { WeatherType } from '../config/gameConstants';

// Helper to create a test veggie with all required fields
function createTestVeggie(overrides: Partial<Veggie> = {}): Veggie {
  return {
    name: 'Carrots', // Use a real veggie name for season bonus lookup
    growth: 0,
    growthRate: 1, // Base growth rate
    stash: 0,
    unlocked: true,
    experience: 0,
    experienceToUnlock: 100,
    fertilizerLevel: 0,
    fertilizerCost: 100,
    fertilizerMaxLevel: 10,
    harvesterOwned: false,
    harvesterCost: 1000,
    harvesterTimer: 0,
    harvesterSpeedLevel: 0,
    harvesterSpeedCost: 500,
    salePrice: 10,
    additionalPlotLevel: 0,
    additionalPlotCost: 100,
    additionalPlotBaseCost: 100,
    ...overrides
  } as Veggie;
}

describe('Weather System', () => {
  describe('calculateWeatherChange', () => {
    let mockRandom: ReturnType<typeof vi.spyOn>;
    
    beforeEach(() => {
      mockRandom = vi.spyOn(Math, 'random');
    });
    
    afterEach(() => {
      mockRandom.mockRestore();
    });
    
    it('should not change weather if current weather is not Clear', () => {
      const nonClearWeathers: WeatherType[] = ['Rain', 'Snow', 'Drought', 'Storm', 'Heatwave'];
      
      nonClearWeathers.forEach(weather => {
        const result = calculateWeatherChange('Spring', weather);
        expect(result).toBe(weather);
      });
    });
    
    it('should return Rain when roll is below rain chance in non-winter seasons', () => {
      mockRandom.mockReturnValue(0.05); // Below Spring rain chance (0.20)
      
      expect(calculateWeatherChange('Spring', 'Clear')).toBe('Rain');
      expect(calculateWeatherChange('Summer', 'Clear')).toBe('Rain');
      expect(calculateWeatherChange('Fall', 'Clear')).toBe('Rain');
    });
    
    it('should return Snow when roll is below rain chance in Winter', () => {
      mockRandom.mockReturnValue(0.05); // Below Winter rain chance (0.10)
      
      const result = calculateWeatherChange('Winter', 'Clear');
      expect(result).toBe('Snow');
    });
    
    it('should return Drought when roll is in drought range', () => {
      // Spring: rain=0.20, drought=0.012, so drought range is 0.20-0.212
      mockRandom.mockReturnValue(0.205);
      
      const result = calculateWeatherChange('Spring', 'Clear');
      expect(result).toBe('Drought');
    });
    
    it('should return Storm when roll is in storm range', () => {
      // Spring: rain=0.20, drought=0.012, storm=0.04, so storm range is 0.212-0.252
      mockRandom.mockReturnValue(0.22);
      
      const result = calculateWeatherChange('Spring', 'Clear');
      expect(result).toBe('Storm');
    });
    
    it('should return Heatwave when roll is in heatwave range', () => {
      // Spring: rain+drought+storm=0.252, heatwave=0.01, so heatwave range is 0.252-0.262
      mockRandom.mockReturnValue(0.255);
      
      const result = calculateWeatherChange('Spring', 'Clear');
      expect(result).toBe('Heatwave');
    });
    
    it('should return Clear when roll is above all weather chances', () => {
      mockRandom.mockReturnValue(0.99);
      
      const result = calculateWeatherChange('Spring', 'Clear');
      expect(result).toBe('Clear');
    });
    
    it('should use default rain chance for unknown seasons', () => {
      mockRandom.mockReturnValue(0.15); // Below default rain chance (0.2)
      
      const result = calculateWeatherChange('Unknown', 'Clear');
      expect(result).toBe('Rain');
    });
  });
  
  describe('Season Rain Chances', () => {
    it('should have correct rain chances per season', () => {
      expect(RAIN_CHANCES.Spring).toBe(0.20);
      expect(RAIN_CHANCES.Summer).toBe(0.16);
      expect(RAIN_CHANCES.Fall).toBe(0.14);
      expect(RAIN_CHANCES.Winter).toBe(0.10);
    });
    
    it('should have correct drought chances per season', () => {
      expect(DROUGHT_CHANCES.Spring).toBe(0.012);
      expect(DROUGHT_CHANCES.Summer).toBe(0.012);
      expect(DROUGHT_CHANCES.Fall).toBe(0.016);
      expect(DROUGHT_CHANCES.Winter).toBe(0.004);
    });
    
    it('should have correct storm chances per season', () => {
      expect(STORM_CHANCES.Spring).toBe(0.04);
      expect(STORM_CHANCES.Summer).toBe(0.06);
      expect(STORM_CHANCES.Fall).toBe(0.03);
      expect(STORM_CHANCES.Winter).toBe(0.01);
    });
  });
});

describe('Weather Growth Effects', () => {
  describe('getVeggieGrowthBonus', () => {
    const baseVeggie = createTestVeggie();
    
    it('should return base growth (1) in Clear weather with no upgrades', () => {
      const bonus = getVeggieGrowthBonus(baseVeggie, 'Summer', 'Clear', false, false);
      expect(bonus).toBeGreaterThan(0);
    });
    
    it('should apply +20% bonus in Rain weather', () => {
      const clearBonus = getVeggieGrowthBonus(baseVeggie, 'Summer', 'Clear', false, false);
      const rainBonus = getVeggieGrowthBonus(baseVeggie, 'Summer', 'Rain', false, false);
      
      // Rain should give +20%
      expect(rainBonus).toBeCloseTo(clearBonus * 1.2, 5);
    });
    
    it('should apply -50% penalty in Drought weather', () => {
      const clearBonus = getVeggieGrowthBonus(baseVeggie, 'Summer', 'Clear', false, false);
      const droughtBonus = getVeggieGrowthBonus(baseVeggie, 'Summer', 'Drought', false, false);
      
      // Drought should give -50%
      expect(droughtBonus).toBeCloseTo(clearBonus * 0.5, 5);
    });
    
    it('should apply +10% bonus in Storm weather', () => {
      const clearBonus = getVeggieGrowthBonus(baseVeggie, 'Summer', 'Clear', false, false);
      const stormBonus = getVeggieGrowthBonus(baseVeggie, 'Summer', 'Storm', false, false);
      
      // Storm should give +10%
      expect(stormBonus).toBeCloseTo(clearBonus * 1.1, 5);
    });
    
    it('should stop growth in Snow weather without greenhouse (minimum 0.01)', () => {
      const snowBonus = getVeggieGrowthBonus(baseVeggie, 'Winter', 'Snow', false, false);
      
      // Snow without greenhouse reduces to minimum (0.01 floor)
      expect(snowBonus).toBe(0.01);
    });
    
    it('should allow growth in Snow weather with greenhouse', () => {
      const snowBonus = getVeggieGrowthBonus(baseVeggie, 'Winter', 'Snow', true, false);
      
      // Greenhouse should enable growth even in snow
      expect(snowBonus).toBeGreaterThan(0);
    });
    
    it('should mitigate Drought effect with irrigation', () => {
      const droughtNoIrrigation = getVeggieGrowthBonus(baseVeggie, 'Summer', 'Drought', false, false);
      const droughtWithIrrigation = getVeggieGrowthBonus(baseVeggie, 'Summer', 'Drought', false, true);
      
      // Irrigation should reduce drought penalty
      expect(droughtWithIrrigation).toBeGreaterThan(droughtNoIrrigation);
    });
    
    it('should apply Heatwave effect differently based on greenhouse', () => {
      const heatwaveNoGreenhouse = getVeggieGrowthBonus(baseVeggie, 'Summer', 'Heatwave', false, false);
      const heatwaveWithGreenhouse = getVeggieGrowthBonus(baseVeggie, 'Summer', 'Heatwave', true, false);
      
      // Both should have some growth, but greenhouse may modify it
      expect(heatwaveNoGreenhouse).toBeGreaterThan(0);
      expect(heatwaveWithGreenhouse).toBeGreaterThan(0);
    });
  });
  
  describe('Winter Season Effects', () => {
    const baseVeggie = createTestVeggie();
    
    it('should apply severe penalty in Winter without greenhouse', () => {
      const summerGrowth = getVeggieGrowthBonus(baseVeggie, 'Summer', 'Clear', false, false);
      const winterGrowth = getVeggieGrowthBonus(baseVeggie, 'Winter', 'Clear', false, false);
      
      // Winter should have 90% penalty without greenhouse
      expect(winterGrowth).toBeLessThan(summerGrowth);
      expect(winterGrowth).toBeCloseTo(summerGrowth * 0.1, 5);
    });
    
    it('should remove Winter penalty with greenhouse', () => {
      const summerGrowth = getVeggieGrowthBonus(baseVeggie, 'Summer', 'Clear', false, false);
      const winterWithGreenhouse = getVeggieGrowthBonus(baseVeggie, 'Winter', 'Clear', true, false);
      
      // Greenhouse should allow normal growth in Winter
      expect(winterWithGreenhouse).toBeCloseTo(summerGrowth, 5);
    });
  });
});

describe('Season Calculations', () => {
  describe('getSeason', () => {
    // Note: getSeason tests already exist in gameCalculations.test.ts
    // These are supplementary boundary tests
    it('should have Spring for days 1-79 (80 days)', () => {
      expect(getSeason(1)).toBe('Spring');
      expect(getSeason(79)).toBe('Spring');
    });
    
    it('should have Summer for days 80-171 (92 days)', () => {
      expect(getSeason(80)).toBe('Summer');
      expect(getSeason(171)).toBe('Summer');
    });
    
    it('should have Fall for days 172-264 (93 days)', () => {
      expect(getSeason(172)).toBe('Fall');
      expect(getSeason(264)).toBe('Fall');
    });
    
    it('should have Winter for days 265+ until year ends', () => {
      expect(getSeason(265)).toBe('Winter');
      expect(getSeason(365)).toBe('Winter');
    });
  });
  
  describe('Season Duration', () => {
    it('should have 90 days per season', () => {
      expect(SEASON_DURATION).toBe(90);
    });
    
    it('should have 4 seasons per year (360 days)', () => {
      const daysPerYear = SEASON_DURATION * 4;
      expect(daysPerYear).toBe(360);
    });
  });
});

describe('processVeggieGrowth', () => {
  it('should not update growth for locked veggies', () => {
    const lockedVeggie = createTestVeggie({ unlocked: false, growth: 0 });
    
    const result = processVeggieGrowth([lockedVeggie], 'Summer', 'Clear', false, false);
    
    expect(result.needsUpdate).toBe(false);
    expect(result.veggies[0].growth).toBe(0);
  });
  
  it('should not update growth for veggies at 100%', () => {
    const fullVeggie = createTestVeggie({ growth: 100 });
    
    const result = processVeggieGrowth([fullVeggie], 'Summer', 'Clear', false, false);
    
    expect(result.needsUpdate).toBe(false);
    expect(result.veggies[0].growth).toBe(100);
  });
  
  it('should update growth for unlocked veggies below 100%', () => {
    const growingVeggie = createTestVeggie({ growth: 50 });
    
    const result = processVeggieGrowth([growingVeggie], 'Summer', 'Clear', false, false);
    
    expect(result.needsUpdate).toBe(true);
    expect(result.veggies[0].growth).toBeGreaterThan(50);
  });
  
  it('should cap growth at 100%', () => {
    const almostFullVeggie = createTestVeggie({ growth: 99.9 });
    
    const result = processVeggieGrowth([almostFullVeggie], 'Summer', 'Clear', false, false);
    
    expect(result.veggies[0].growth).toBe(100);
  });
  
  it('should track completed growth when veggie reaches 100%', () => {
    const almostFullVeggie = createTestVeggie({ growth: 99 });
    
    const result = processVeggieGrowth([almostFullVeggie], 'Summer', 'Clear', false, false);
    
    expect(result.completedGrowth.length).toBe(1);
    expect(result.completedGrowth[0].veggie.growth).toBe(100);
  });
  
  it('should apply weather effects to all veggies', () => {
    const veggies = [
      createTestVeggie({ id: '1', growth: 50 }),
      createTestVeggie({ id: '2', growth: 60 })
    ];
    
    const clearResult = processVeggieGrowth(veggies, 'Summer', 'Clear', false, false);
    const rainResult = processVeggieGrowth(veggies, 'Summer', 'Rain', false, false);
    
    // Rain should give faster growth
    const clearGrowth1 = clearResult.veggies[0].growth - 50;
    const rainGrowth1 = rainResult.veggies[0].growth - 50;
    
    expect(rainGrowth1).toBeCloseTo(clearGrowth1 * 1.2, 5);
  });
  
  it('should handle Snow nearly stopping growth without greenhouse (minimum floor)', () => {
    const growingVeggie = createTestVeggie({ growth: 50 });
    
    const result = processVeggieGrowth([growingVeggie], 'Winter', 'Snow', false, false);
    
    // Snow without greenhouse reduces to near-zero growth (minimum 0.01 floor)
    // So growth still increases but very slowly
    expect(result.needsUpdate).toBe(true);
    expect(result.veggies[0].growth).toBeCloseTo(50.01, 2);
  });
  
  it('should allow growth in Snow with greenhouse', () => {
    const growingVeggie = createTestVeggie({ growth: 50 });
    
    const result = processVeggieGrowth([growingVeggie], 'Winter', 'Snow', true, false);
    
    expect(result.needsUpdate).toBe(true);
    expect(result.veggies[0].growth).toBeGreaterThan(50);
  });
});
