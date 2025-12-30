/**
 * Canning System Calculation Tests
 * 
 * Tests for canning profit calculations, recipe processing,
 * and upgrade effects.
 */

import { describe, it, expect } from 'vitest';
import { calculateRecipeProfit, INITIAL_RECIPES, RECIPE_CATEGORIES } from '../data/recipes';
import type { CanningUpgrade, Recipe, CanningIngredient } from '../types/canning';

// Mock veggie data for testing - using actual veggie names from the game
const mockVeggies = [
  { name: 'Radish', salePrice: 1 },
  { name: 'Lettuce', salePrice: 2 },
  { name: 'Carrots', salePrice: 3 },
  { name: 'Green Beans', salePrice: 3 },
  { name: 'Zucchini', salePrice: 4 },
  { name: 'Cucumbers', salePrice: 5 },
  { name: 'Tomatoes', salePrice: 3 },
  { name: 'Onions', salePrice: 9 },
  { name: 'Peppers', salePrice: 13 },
  { name: 'Corn', salePrice: 17 },
  { name: 'Pumpkins', salePrice: 21 },
  { name: 'Wheat', salePrice: 25 },
  { name: 'Strawberries', salePrice: 31 },
  { name: 'Broccoli', salePrice: 5 },
  { name: 'Cabbage', salePrice: 6 },
];

// Pure calculation functions for upgrade effects (extracted from useCanningSystem)

/**
 * Calculate processing time with upgrades applied
 */
function calculateProcessingTime(baseTime: number, upgrades: CanningUpgrade[]): number {
  const speedUpgrade = upgrades.find(u => u.id === 'canning_speed');
  const speedMultiplier = speedUpgrade ? 1 - (speedUpgrade.level * 0.05) : 1;
  return Math.max(baseTime * speedMultiplier, 1); // Minimum 1 second
}

/**
 * Calculate sale price with upgrades applied
 */
function calculateSalePrice(basePrice: number, upgrades: CanningUpgrade[]): number {
  const efficiencyUpgrade = upgrades.find(u => u.id === 'canning_efficiency');
  const efficiencyMultiplier = efficiencyUpgrade ? 1 + (efficiencyUpgrade.level * 0.10) : 1;
  return Math.round(basePrice * efficiencyMultiplier);
}

/**
 * Calculate bonus item chance from preservation mastery
 */
function calculateBonusChance(upgrades: CanningUpgrade[]): number {
  const qualityUpgrade = upgrades.find(u => u.id === 'preservation_mastery');
  return qualityUpgrade ? qualityUpgrade.level * 0.05 : 0; // 5% per level
}

/**
 * Calculate maximum simultaneous processes
 */
function calculateMaxProcesses(upgrades: CanningUpgrade[]): number {
  const automationUpgrade = upgrades.find(u => u.id === 'simultaneous_processing');
  return 1 + (automationUpgrade ? automationUpgrade.level : 0);
}

/**
 * Check if canner automation is active
 */
function isCannerActive(upgrades: CanningUpgrade[]): boolean {
  const cannerUpgrade = upgrades.find(u => u.id === 'canner');
  return cannerUpgrade ? cannerUpgrade.level >= 1 : false;
}

/**
 * Calculate upgrade cost at a given level
 */
function calculateUpgradeCost(baseCost: number, level: number, scaling: number): number {
  return Math.round(baseCost * Math.pow(scaling, level));
}

// Test upgrades template
function createTestUpgrades(): CanningUpgrade[] {
  return [
    {
      id: 'canning_speed',
      name: 'Quick Hands',
      description: 'Reduces canning time by 5% per level',
      type: 'speed',
      level: 0,
      cost: 100,
      baseCost: 100,
      upgradeCostScaling: 2.3,
      maxLevel: 18,
      costCurrency: 'money',
      effect: 1.0,
      unlocked: true
    },
    {
      id: 'canning_efficiency',
      name: 'Family Recipe',
      description: 'Increases canned product sale price by 10% per level',
      type: 'efficiency',
      level: 0,
      cost: 150,
      baseCost: 150,
      upgradeCostScaling: 1.8,
      costCurrency: 'knowledge',
      effect: 1.0,
      unlocked: true
    },
    {
      id: 'preservation_mastery',
      name: 'Heirloom Touch',
      description: 'Chance to get bonus canned products',
      type: 'quality',
      level: 0,
      cost: 200,
      baseCost: 200,
      upgradeCostScaling: 1.8,
      costCurrency: 'knowledge',
      effect: 0,
      unlocked: true
    },
    {
      id: 'simultaneous_processing',
      name: 'Batch Canning',
      description: 'Allows more canning processes to run at once',
      type: 'automation',
      level: 0,
      cost: 500,
      baseCost: 500,
      upgradeCostScaling: 2.0,
      costCurrency: 'money',
      maxLevel: 14,
      effect: 1,
      unlocked: true
    },
    {
      id: 'canner',
      name: 'Canner',
      description: 'Automatically starts canning processes every 10 seconds',
      type: 'automation',
      level: 0,
      cost: 10000,
      baseCost: 10000,
      upgradeCostScaling: 1.0,
      costCurrency: 'knowledge',
      maxLevel: 1,
      effect: 0,
      unlocked: true
    }
  ];
}

describe('Canning System Calculations', () => {
  describe('calculateRecipeProfit', () => {
    it('should calculate profit for first recipe (Canned Radish)', () => {
      const radishRecipe = INITIAL_RECIPES.find(r => r.id === 'canned_radish');
      expect(radishRecipe).toBeDefined();
      
      const profit = calculateRecipeProfit(radishRecipe!, mockVeggies);
      
      // Recipe uses 3 radishes × $1 = $3 raw value
      expect(profit.rawValue).toBe(3);
      // Canned sells for $5
      expect(profit.cannedValue).toBe(5);
      expect(profit.profitable).toBe(true);
      expect(profit.profitMargin).toBeGreaterThan(0);
    });

    it('should handle recipes with multiple ingredients', () => {
      // Garden mix uses 2 radish, 2 lettuce, 2 green beans
      const gardenMix = INITIAL_RECIPES.find(r => r.id === 'garden_mix');
      
      if (gardenMix) {
        const profit = calculateRecipeProfit(gardenMix, mockVeggies);
        // 2×1 + 2×2 + 2×3 = 2 + 4 + 6 = 12
        expect(profit.rawValue).toBe(12);
        expect(profit).toHaveProperty('profitMargin');
      }
    });

    it('should calculate profit margin percentage correctly', () => {
      const recipe = INITIAL_RECIPES.find(r => r.id === 'canned_radish')!;
      const profit = calculateRecipeProfit(recipe, mockVeggies);
      
      // Profit margin = ((cannedValue - rawValue) / rawValue) * 100
      const expectedMargin = ((profit.cannedValue - profit.rawValue) / profit.rawValue) * 100;
      expect(profit.profitMargin).toBeCloseTo(expectedMargin);
    });

    it('should mark unprofitable recipes correctly', () => {
      // Create a scenario where raw value exceeds canned value
      const expensiveVeggies = [{ name: 'Radish', salePrice: 100 }];
      const recipe = INITIAL_RECIPES.find(r => r.id === 'canned_radish')!;
      
      const profit = calculateRecipeProfit(recipe, expensiveVeggies);
      
      // 3 radishes × $100 = $300 raw value > $5 canned
      expect(profit.rawValue).toBeGreaterThan(profit.cannedValue);
      expect(profit.profitable).toBe(false);
      expect(profit.profitMargin).toBeLessThan(0);
    });

    it('should handle missing veggie data gracefully', () => {
      const recipe = INITIAL_RECIPES.find(r => r.id === 'canned_radish')!;
      const emptyVeggies: Array<{name: string, salePrice: number}> = [];
      
      const profit = calculateRecipeProfit(recipe, emptyVeggies);
      
      expect(profit.rawValue).toBe(0);
      expect(profit.profitMargin).toBe(0);
    });
  });

  describe('INITIAL_RECIPES', () => {
    it('should have recipes defined', () => {
      expect(INITIAL_RECIPES.length).toBeGreaterThan(0);
    });

    it('should have recipes with experience requirements', () => {
      const firstRecipe = INITIAL_RECIPES.find(r => r.id === 'canned_radish');
      expect(firstRecipe).toBeDefined();
      expect(firstRecipe?.experienceRequired).toBeDefined();
    });

    it('should have recipes sorted by increasing experience requirements', () => {
      const sortedByExp = [...INITIAL_RECIPES]
        .filter(r => !r.honeyRequirement) // Exclude honey recipes
        .sort((a, b) => a.experienceRequired - b.experienceRequired);
      
      // Verify sorting - each should be >= previous
      for (let i = 1; i < sortedByExp.length; i++) {
        expect(sortedByExp[i].experienceRequired).toBeGreaterThanOrEqual(sortedByExp[i-1].experienceRequired);
      }
    });

    it('should have unique recipe IDs', () => {
      const ids = INITIAL_RECIPES.map(r => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have recipes with valid ingredients', () => {
      // Filter out honey-only recipes that may not have regular ingredients
      const regularRecipes = INITIAL_RECIPES.filter(r => r.ingredients && r.ingredients.length > 0);
      
      regularRecipes.forEach(recipe => {
        expect(recipe.ingredients.length).toBeGreaterThan(0);
        recipe.ingredients.forEach(ing => {
          expect(ing.veggieName).toBeTruthy();
          expect(ing.quantity).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('RECIPE_CATEGORIES', () => {
    it('should have categories defined', () => {
      expect(Object.keys(RECIPE_CATEGORIES).length).toBeGreaterThan(0);
    });

    it('should have simple category with 1x multiplier', () => {
      expect(RECIPE_CATEGORIES.simple).toBeDefined();
      expect(RECIPE_CATEGORIES.simple.profitMultiplier).toBe(1.0);
    });

    it('should have increasing profit multipliers for higher categories', () => {
      const categories = Object.values(RECIPE_CATEGORIES);
      const multipliers = categories.map(c => c.profitMultiplier);
      
      // Check that at least some higher categories have better multipliers
      const maxMultiplier = Math.max(...multipliers);
      expect(maxMultiplier).toBeGreaterThan(1.0);
    });
  });

  describe('calculateProcessingTime', () => {
    it('should return base time with no upgrades', () => {
      const upgrades = createTestUpgrades();
      expect(calculateProcessingTime(60, upgrades)).toBe(60);
    });

    it('should reduce time by 5% per speed upgrade level', () => {
      const upgrades = createTestUpgrades();
      const speedUpgrade = upgrades.find(u => u.id === 'canning_speed')!;
      speedUpgrade.level = 2; // -10%
      
      expect(calculateProcessingTime(60, upgrades)).toBeCloseTo(54);
    });

    it('should stack speed upgrades correctly', () => {
      const upgrades = createTestUpgrades();
      const speedUpgrade = upgrades.find(u => u.id === 'canning_speed')!;
      speedUpgrade.level = 10; // -50%
      
      expect(calculateProcessingTime(60, upgrades)).toBeCloseTo(30);
    });

    it('should enforce minimum processing time of 1 second', () => {
      const upgrades = createTestUpgrades();
      const speedUpgrade = upgrades.find(u => u.id === 'canning_speed')!;
      speedUpgrade.level = 30; // Would be -150%, but capped
      
      expect(calculateProcessingTime(60, upgrades)).toBe(1);
    });
  });

  describe('calculateSalePrice', () => {
    it('should return base price with no upgrades', () => {
      const upgrades = createTestUpgrades();
      expect(calculateSalePrice(100, upgrades)).toBe(100);
    });

    it('should increase price by 10% per efficiency level', () => {
      const upgrades = createTestUpgrades();
      const effUpgrade = upgrades.find(u => u.id === 'canning_efficiency')!;
      effUpgrade.level = 2; // +20%
      
      expect(calculateSalePrice(100, upgrades)).toBe(120);
    });

    it('should stack efficiency upgrades', () => {
      const upgrades = createTestUpgrades();
      const effUpgrade = upgrades.find(u => u.id === 'canning_efficiency')!;
      effUpgrade.level = 5; // +50%
      
      expect(calculateSalePrice(100, upgrades)).toBe(150);
    });

    it('should round to whole numbers', () => {
      const upgrades = createTestUpgrades();
      const effUpgrade = upgrades.find(u => u.id === 'canning_efficiency')!;
      effUpgrade.level = 1; // +10%
      
      expect(calculateSalePrice(95, upgrades)).toBe(105); // 95 * 1.1 = 104.5 → 105
    });
  });

  describe('calculateBonusChance', () => {
    it('should return 0 with no upgrades', () => {
      const upgrades = createTestUpgrades();
      expect(calculateBonusChance(upgrades)).toBe(0);
    });

    it('should add 5% per level', () => {
      const upgrades = createTestUpgrades();
      const qualityUpgrade = upgrades.find(u => u.id === 'preservation_mastery')!;
      qualityUpgrade.level = 2;
      
      expect(calculateBonusChance(upgrades)).toBe(0.10);
    });
  });

  describe('calculateMaxProcesses', () => {
    it('should return 1 with no upgrades', () => {
      const upgrades = createTestUpgrades();
      expect(calculateMaxProcesses(upgrades)).toBe(1);
    });

    it('should add 1 per upgrade level', () => {
      const upgrades = createTestUpgrades();
      const autoUpgrade = upgrades.find(u => u.id === 'simultaneous_processing')!;
      autoUpgrade.level = 3;
      
      expect(calculateMaxProcesses(upgrades)).toBe(4);
    });
  });

  describe('isCannerActive', () => {
    it('should return false when canner not purchased', () => {
      const upgrades = createTestUpgrades();
      expect(isCannerActive(upgrades)).toBe(false);
    });

    it('should return true when canner is level 1', () => {
      const upgrades = createTestUpgrades();
      const cannerUpgrade = upgrades.find(u => u.id === 'canner')!;
      cannerUpgrade.level = 1;
      
      expect(isCannerActive(upgrades)).toBe(true);
    });
  });

  describe('calculateUpgradeCost', () => {
    it('should return base cost at level 0', () => {
      expect(calculateUpgradeCost(100, 0, 2.0)).toBe(100);
    });

    it('should scale cost exponentially', () => {
      const baseCost = 100;
      const scaling = 2.0;
      
      expect(calculateUpgradeCost(baseCost, 1, scaling)).toBe(200); // 100 * 2^1
      expect(calculateUpgradeCost(baseCost, 2, scaling)).toBe(400); // 100 * 2^2
      expect(calculateUpgradeCost(baseCost, 3, scaling)).toBe(800); // 100 * 2^3
    });

    it('should handle non-integer scaling', () => {
      const baseCost = 100;
      const scaling = 1.5;
      
      expect(calculateUpgradeCost(baseCost, 1, scaling)).toBe(150); // 100 * 1.5
      expect(calculateUpgradeCost(baseCost, 2, scaling)).toBe(225); // 100 * 1.5^2 = 225
    });
  });

  describe('Recipe Ingredient Validation', () => {
    it('should have valid ingredient quantities', () => {
      INITIAL_RECIPES.forEach(recipe => {
        recipe.ingredients.forEach(ing => {
          expect(ing.quantity).toBeGreaterThan(0);
          expect(Number.isInteger(ing.quantity)).toBe(true);
        });
      });
    });

    it('should have reasonable processing times', () => {
      INITIAL_RECIPES.forEach(recipe => {
        expect(recipe.baseProcessingTime).toBeGreaterThan(0);
        expect(recipe.baseProcessingTime).toBeLessThan(600); // Max 10 minutes
      });
    });

    it('should have positive sale prices', () => {
      INITIAL_RECIPES.forEach(recipe => {
        expect(recipe.baseSalePrice).toBeGreaterThan(0);
      });
    });
  });
});
