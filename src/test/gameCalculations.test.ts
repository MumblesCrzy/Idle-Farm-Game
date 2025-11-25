import { describe, it, expect } from 'vitest';
import {
  formatNumber,
  getVeggieGrowthBonus,
  calculateExpRequirement,
  calculateInitialCost,
  calculateUpgradeCost,
  getAutoPurchaseCost,
  canMakePurchase,
  getSeason,
  createAutoPurchaserConfigs
} from '../utils/gameCalculations';
import type { Veggie, AutoPurchaseType } from '../types/game';

describe('formatNumber', () => {
  it('should format small numbers without suffix', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(5)).toBe('5');
    expect(formatNumber(42)).toBe('42');
    expect(formatNumber(999)).toBe('999');
  });

  it('should format thousands with K suffix', () => {
    expect(formatNumber(1000)).toBe('1K');
    expect(formatNumber(1500)).toBe('1.5K');
    expect(formatNumber(10000)).toBe('10K');
    expect(formatNumber(999999)).toBe('1000K');
  });

  it('should format millions with M suffix', () => {
    expect(formatNumber(1000000)).toBe('1M');
    expect(formatNumber(1500000)).toBe('1.5M');
    expect(formatNumber(42000000)).toBe('42M');
  });

  it('should format billions with B suffix', () => {
    expect(formatNumber(1000000000)).toBe('1B');
    expect(formatNumber(5500000000)).toBe('5.5B');
  });

  it('should format trillions with T suffix', () => {
    expect(formatNumber(1000000000000)).toBe('1T');
    expect(formatNumber(3750000000000)).toBe('3.8T');
  });

  it('should format quadrillions with Q suffix', () => {
    expect(formatNumber(1000000000000000)).toBe('1Q');
    expect(formatNumber(9999000000000000)).toBe('10Q'); // Rounds up to 10Q
  });

  it('should respect decimal places parameter', () => {
    expect(formatNumber(1234, 1)).toBe('1K'); // 0 decimal places rounds off
    expect(formatNumber(1234, 2)).toBe('1.23K');
    expect(formatNumber(1234567, 3)).toBe('1.235M');
  });

  it('should remove trailing zeros', () => {
    expect(formatNumber(1000)).toBe('1K');
    expect(formatNumber(5000000)).toBe('5M');
    expect(formatNumber(2500)).toBe('2.5K');
  });

  it('should handle decimal values', () => {
    expect(formatNumber(42.7)).toBe('42.7');
    expect(formatNumber(999.99)).toBe('1000');
    expect(formatNumber(1234.56)).toBe('1.2K'); // 1 decimal place by default
  });
});

describe('getVeggieGrowthBonus', () => {
  const createTestVeggie = (overrides: Partial<Veggie> = {}): Veggie => ({
    name: 'Radish',
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

  it('should return base growth rate with no bonuses', () => {
    const veggie = createTestVeggie({ name: 'TestVeggie', growthRate: 2.0 });
    const result = getVeggieGrowthBonus(veggie, 'Summer', 'Clear', false, false);
    // TestVeggie has no season bonuses defined, so base rate only
    expect(result).toBe(2.0);
  });

  it('should apply fertilizer bonus correctly', () => {
    const veggie = createTestVeggie({ name: 'TestVeggie', growthRate: 1.0, fertilizerLevel: 2 });
    const result = getVeggieGrowthBonus(veggie, 'Summer', 'Clear', false, false);
    // 1.0 * (1 + 2 * 0.05) = 1.0 * 1.1 = 1.1
    expect(result).toBeCloseTo(1.1, 1);
  });

  it('should apply season bonus when in bonus season', () => {
    const veggie = createTestVeggie({ name: 'Radish', growthRate: 1.0 });
    // Radish bonus seasons are Spring and Fall
    const springResult = getVeggieGrowthBonus(veggie, 'Spring', 'Clear', false, false);
    expect(springResult).toBeGreaterThan(1.0);
    
    const fallResult = getVeggieGrowthBonus(veggie, 'Fall', 'Clear', false, false);
    expect(fallResult).toBeGreaterThan(1.0);
  });

  it('should apply winter penalty without greenhouse', () => {
    const veggie = createTestVeggie({ growthRate: 1.0 });
    const result = getVeggieGrowthBonus(veggie, 'Winter', 'Clear', false, false);
    // 1.0 * 0.1 = 0.1
    expect(result).toBe(0.1);
  });

  it('should not apply winter penalty with greenhouse', () => {
    const veggie = createTestVeggie({ growthRate: 1.0 });
    const result = getVeggieGrowthBonus(veggie, 'Winter', 'Clear', true, false);
    expect(result).toBe(1.0);
  });

  it('should apply drought penalty without irrigation', () => {
    const veggie = createTestVeggie({ growthRate: 1.0 });
    const result = getVeggieGrowthBonus(veggie, 'Summer', 'Drought', false, false);
    // 1.0 * 0.5 = 0.5
    expect(result).toBe(0.5);
  });

  it('should not apply drought penalty with irrigation', () => {
    const veggie = createTestVeggie({ growthRate: 1.0 });
    const result = getVeggieGrowthBonus(veggie, 'Summer', 'Drought', false, true);
    // 1.0 * 1.15 (irrigation bonus) = 1.15
    expect(result).toBe(1.15);
  });

  it('should apply irrigation bonus when owned', () => {
    const veggie = createTestVeggie({ name: 'TestVeggie', growthRate: 1.0 });
    const result = getVeggieGrowthBonus(veggie, 'Summer', 'Clear', false, true);
    // 1.0 * 1.15 = 1.15
    expect(result).toBeCloseTo(1.15, 1);
  });

  it('should apply rain bonus', () => {
    const veggie = createTestVeggie({ name: 'TestVeggie', growthRate: 1.0 });
    const result = getVeggieGrowthBonus(veggie, 'Summer', 'Rain', false, false);
    // 1.0 * 1.2 = 1.2
    expect(result).toBeCloseTo(1.2, 1);
  });

  it('should apply storm bonus', () => {
    const veggie = createTestVeggie({ name: 'TestVeggie', growthRate: 1.0 });
    const result = getVeggieGrowthBonus(veggie, 'Summer', 'Storm', false, false);
    // 1.0 * 1.1 = 1.1
    expect(result).toBeCloseTo(1.1, 1);
  });

  it('should apply snow penalty without greenhouse', () => {
    const veggie = createTestVeggie({ growthRate: 1.0 });
    const result = getVeggieGrowthBonus(veggie, 'Winter', 'Snow', false, false);
    // 1.0 * 0.1 (winter) * 0.0 (snow) = 0, but clamped to 0.01
    expect(result).toBe(0.01);
  });

  it('should stack multiple bonuses correctly', () => {
    const veggie = createTestVeggie({ 
      name: 'TestVeggie',
      growthRate: 1.0, 
      fertilizerLevel: 4 // +20% = 1.2x
    });
    const result = getVeggieGrowthBonus(veggie, 'Summer', 'Rain', false, true);
    // 1.0 * 1.2 (fertilizer) * 1.15 (irrigation) * 1.2 (rain) = 1.656
    expect(result).toBeCloseTo(1.656, 1);
  });

  it('should always return at least 0.01', () => {
    const veggie = createTestVeggie({ growthRate: 1.0 });
    const result = getVeggieGrowthBonus(veggie, 'Winter', 'Snow', false, false);
    expect(result).toBeGreaterThanOrEqual(0.01);
  });
});

describe('calculateExpRequirement', () => {
  it('should return 0 for first veggie (index 0)', () => {
    expect(calculateExpRequirement(0)).toBe(0);
  });

  it('should calculate correct values for early veggies', () => {
    expect(calculateExpRequirement(1)).toBe(95); // 50 * 1.9^1
    expect(calculateExpRequirement(2)).toBe(180); // 50 * 1.9^2
    expect(calculateExpRequirement(3)).toBe(342); // 50 * 1.9^3
  });

  it('should scale exponentially', () => {
    const exp4 = calculateExpRequirement(4);
    const exp5 = calculateExpRequirement(5);
    expect(exp5).toBeGreaterThan(exp4 * 1.5);
  });

  it('should return integer values', () => {
    for (let i = 0; i < 10; i++) {
      const result = calculateExpRequirement(i);
      expect(result).toBe(Math.floor(result));
    }
  });
});

describe('calculateInitialCost', () => {
  it('should calculate fertilizer costs with first veggie discount', () => {
    const cost = calculateInitialCost('fertilizer', 0);
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeLessThan(calculateInitialCost('fertilizer', 1));
  });

  it('should scale costs exponentially by index', () => {
    const cost1 = calculateInitialCost('betterSeeds', 1);
    const cost2 = calculateInitialCost('betterSeeds', 2);
    expect(cost2).toBeGreaterThan(cost1);
  });

  it('should return different costs for different types', () => {
    // harvester and fertilizer have different base values and scaling
    const harvesterCost = calculateInitialCost('harvester', 1);
    const fertilizerCost = calculateInitialCost('fertilizer', 1);
    expect(harvesterCost).not.toBe(fertilizerCost);
  });

  it('should return integer values', () => {
    const cost = calculateInitialCost('fertilizer', 3);
    expect(cost).toBe(Math.floor(cost));
  });
});

describe('calculateUpgradeCost', () => {
  it('should return base cost at level 0', () => {
    const baseCost = 100;
    const cost = calculateUpgradeCost('fertilizer', 0, baseCost);
    expect(cost).toBeGreaterThanOrEqual(baseCost);
  });

  it('should increase cost with level', () => {
    const baseCost = 100;
    const cost0 = calculateUpgradeCost('fertilizer', 0, baseCost);
    const cost1 = calculateUpgradeCost('fertilizer', 1, baseCost);
    const cost5 = calculateUpgradeCost('fertilizer', 5, baseCost);
    
    expect(cost1).toBeGreaterThan(cost0);
    expect(cost5).toBeGreaterThan(cost1);
  });

  it('should scale exponentially with level', () => {
    const baseCost = 100;
    const cost5 = calculateUpgradeCost('betterSeeds', 5, baseCost);
    const cost10 = calculateUpgradeCost('betterSeeds', 10, baseCost);
    
    expect(cost10).toBeGreaterThan(cost5 * 2);
  });

  it('should return integer values', () => {
    const cost = calculateUpgradeCost('fertilizer', 7, 150);
    expect(cost).toBe(Math.ceil(cost));
  });
});

describe('getAutoPurchaseCost', () => {
  const createVeggieWithCosts = (): Veggie => ({
    name: 'Test',
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
    harvesterSpeedCost: 300,
    additionalPlotLevel: 0,
    additionalPlotCost: 400,
    salePrice: 10,
    sellEnabled: false,
    autoPurchasers: []
  });

  it('should return correct cost for fertilizer', () => {
    const veggie = createVeggieWithCosts();
    expect(getAutoPurchaseCost(veggie, 'fertilizer')).toBe(100);
  });

  it('should return correct cost for betterSeeds', () => {
    const veggie = createVeggieWithCosts();
    expect(getAutoPurchaseCost(veggie, 'betterSeeds')).toBe(200);
  });

  it('should return correct cost for harvesterSpeed', () => {
    const veggie = createVeggieWithCosts();
    expect(getAutoPurchaseCost(veggie, 'harvesterSpeed')).toBe(300);
  });

  it('should return correct cost for additionalPlot', () => {
    const veggie = createVeggieWithCosts();
    expect(getAutoPurchaseCost(veggie, 'additionalPlot')).toBe(400);
  });

  it('should return 0 for invalid purchase type', () => {
    const veggie = createVeggieWithCosts();
    expect(getAutoPurchaseCost(veggie, 'invalid' as AutoPurchaseType)).toBe(0);
  });
});

describe('canMakePurchase', () => {
  const createVeggieForPurchase = (): Veggie => ({
    name: 'Test',
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
    harvesterSpeedCost: 300,
    additionalPlotLevel: 0,
    additionalPlotCost: 400,
    salePrice: 10,
    sellEnabled: false,
    autoPurchasers: []
  });

  describe('fertilizer purchase', () => {
    it('should allow purchase with enough money and not at max level', () => {
      const veggie = createVeggieForPurchase();
      expect(canMakePurchase(veggie, 'fertilizer', 200, 0)).toBe(true);
    });

    it('should not allow purchase with insufficient money', () => {
      const veggie = createVeggieForPurchase();
      expect(canMakePurchase(veggie, 'fertilizer', 50, 0)).toBe(false);
    });

    it('should not allow purchase at max level', () => {
      const veggie = createVeggieForPurchase();
      veggie.fertilizerLevel = 10; // Max level
      expect(canMakePurchase(veggie, 'fertilizer', 200, 0)).toBe(false);
    });
  });

  describe('betterSeeds purchase', () => {
    it('should allow purchase with enough money', () => {
      const veggie = createVeggieForPurchase();
      expect(canMakePurchase(veggie, 'betterSeeds', 250, 0)).toBe(true);
    });

    it('should not allow purchase with insufficient money', () => {
      const veggie = createVeggieForPurchase();
      expect(canMakePurchase(veggie, 'betterSeeds', 150, 0)).toBe(false);
    });
  });

  describe('harvesterSpeed purchase', () => {
    it('should allow purchase with enough money', () => {
      const veggie = createVeggieForPurchase();
      expect(canMakePurchase(veggie, 'harvesterSpeed', 350, 0)).toBe(true);
    });

    it('should not allow purchase with insufficient money', () => {
      const veggie = createVeggieForPurchase();
      expect(canMakePurchase(veggie, 'harvesterSpeed', 250, 0)).toBe(false);
    });
  });

  describe('additionalPlot purchase', () => {
    it('should allow purchase with enough currency and available plot space', () => {
      const veggie = createVeggieForPurchase();
      const veggies = [veggie];
      expect(canMakePurchase(veggie, 'additionalPlot', 500, 0, 'money', veggies, 10)).toBe(true);
    });

    it('should not allow purchase when at max plots', () => {
      const veggie = createVeggieForPurchase();
      const veggies = Array(10).fill(null).map(() => ({ ...veggie, unlocked: true }));
      expect(canMakePurchase(veggie, 'additionalPlot', 500, 0, 'money', veggies, 10)).toBe(false);
    });

    it('should work without veggies/maxPlots parameters', () => {
      const veggie = createVeggieForPurchase();
      expect(canMakePurchase(veggie, 'additionalPlot', 500, 0)).toBe(true);
    });
  });

  describe('currency types', () => {
    it('should check money when currencyType is money', () => {
      const veggie = createVeggieForPurchase();
      expect(canMakePurchase(veggie, 'fertilizer', 200, 0, 'money')).toBe(true);
      expect(canMakePurchase(veggie, 'fertilizer', 50, 1000, 'money')).toBe(false);
    });

    it('should check knowledge when currencyType is knowledge', () => {
      const veggie = createVeggieForPurchase();
      veggie.fertilizerCost = 100;
      expect(canMakePurchase(veggie, 'fertilizer', 0, 200, 'knowledge')).toBe(true);
      expect(canMakePurchase(veggie, 'fertilizer', 1000, 50, 'knowledge')).toBe(false);
    });
  });

  it('should return false for invalid purchase type', () => {
    const veggie = createVeggieForPurchase();
    expect(canMakePurchase(veggie, 'invalid' as AutoPurchaseType, 1000, 1000)).toBe(false);
  });
});

describe('getSeason', () => {
  it('should return Spring for days 1-79', () => {
    expect(getSeason(1)).toBe('Spring');
    expect(getSeason(40)).toBe('Spring');
    expect(getSeason(79)).toBe('Spring');
  });

  it('should return Summer for days 80-171', () => {
    expect(getSeason(80)).toBe('Summer');
    expect(getSeason(125)).toBe('Summer');
    expect(getSeason(171)).toBe('Summer');
  });

  it('should return Fall for days 172-264', () => {
    expect(getSeason(172)).toBe('Fall');
    expect(getSeason(200)).toBe('Fall');
    expect(getSeason(264)).toBe('Fall');
  });

  it('should return Winter for days 265+', () => {
    expect(getSeason(265)).toBe('Winter');
    expect(getSeason(300)).toBe('Winter');
    expect(getSeason(365)).toBe('Winter');
  });

  it('should handle boundary conditions', () => {
    expect(getSeason(79)).toBe('Spring');
    expect(getSeason(80)).toBe('Summer');
    expect(getSeason(171)).toBe('Summer');
    expect(getSeason(172)).toBe('Fall');
    expect(getSeason(264)).toBe('Fall');
    expect(getSeason(265)).toBe('Winter');
  });
});

describe('createAutoPurchaserConfigs', () => {
  it('should create 4 auto-purchaser configs', () => {
    const configs = createAutoPurchaserConfigs(100, 200, 300, 400);
    expect(configs).toHaveLength(4);
  });

  it('should create Assistant config correctly', () => {
    const configs = createAutoPurchaserConfigs(100, 200, 300, 400);
    const assistant = configs.find(c => c.id === 'assistant');
    
    expect(assistant).toBeDefined();
    expect(assistant?.name).toBe('Assistant');
    expect(assistant?.purchaseType).toBe('fertilizer');
    expect(assistant?.currencyType).toBe('money');
    expect(assistant?.cycleDays).toBe(7);
    expect(assistant?.cost).toBe(100);
    expect(assistant?.owned).toBe(false);
    expect(assistant?.active).toBe(false);
    expect(assistant?.timer).toBe(0);
  });

  it('should create Cultivator config correctly', () => {
    const configs = createAutoPurchaserConfigs(100, 200, 300, 400);
    const cultivator = configs.find(c => c.id === 'cultivator');
    
    expect(cultivator).toBeDefined();
    expect(cultivator?.name).toBe('Cultivator');
    expect(cultivator?.purchaseType).toBe('betterSeeds');
    expect(cultivator?.currencyType).toBe('knowledge');
    expect(cultivator?.cycleDays).toBe(7);
    expect(cultivator?.cost).toBe(200);
  });

  it('should create Surveyor config correctly', () => {
    const configs = createAutoPurchaserConfigs(100, 200, 300, 400);
    const surveyor = configs.find(c => c.id === 'surveyor');
    
    expect(surveyor).toBeDefined();
    expect(surveyor?.name).toBe('Surveyor');
    expect(surveyor?.purchaseType).toBe('additionalPlot');
    expect(surveyor?.currencyType).toBe('money');
    expect(surveyor?.cycleDays).toBe(30);
    expect(surveyor?.cost).toBe(300);
  });

  it('should create Mechanic config correctly', () => {
    const configs = createAutoPurchaserConfigs(100, 200, 300, 400);
    const mechanic = configs.find(c => c.id === 'mechanic');
    
    expect(mechanic).toBeDefined();
    expect(mechanic?.name).toBe('Mechanic');
    expect(mechanic?.purchaseType).toBe('harvesterSpeed');
    expect(mechanic?.currencyType).toBe('money');
    expect(mechanic?.cycleDays).toBe(15);
    expect(mechanic?.cost).toBe(400);
  });

  it('should use provided costs correctly', () => {
    const configs = createAutoPurchaserConfigs(50, 75, 150, 225);
    
    expect(configs.find(c => c.id === 'assistant')?.cost).toBe(50);
    expect(configs.find(c => c.id === 'cultivator')?.cost).toBe(75);
    expect(configs.find(c => c.id === 'surveyor')?.cost).toBe(150);
    expect(configs.find(c => c.id === 'mechanic')?.cost).toBe(225);
  });

  it('should initialize all as not owned and inactive', () => {
    const configs = createAutoPurchaserConfigs(100, 200, 300, 400);
    
    configs.forEach(config => {
      expect(config.owned).toBe(false);
      expect(config.active).toBe(false);
      expect(config.timer).toBe(0);
    });
  });
});
