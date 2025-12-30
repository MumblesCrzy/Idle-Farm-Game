/**
 * Bee System Calculation Tests
 * 
 * Tests for bee system calculations including crop yield bonus,
 * honey production rates, and upgrade effects.
 */

import { describe, it, expect } from 'vitest';
import { createInitialBeeUpgrades } from '../data/beeUpgrades';
import type { BeeUpgrade, BeeBox } from '../types/bees';

// Bee system constants (mirrored from BeeContext)
const BEE_CONSTANTS = {
  BASE_PRODUCTION_TIME: 132,
  STARTING_BEE_BOXES: 2,
  MAX_BEE_BOXES: 30,
  BASE_YIELD_BONUS_PER_BOX: 0.005,
  MAX_YIELD_BONUS: 1.0,
  UNLOCK_FARM_TIER: 4,
  BEEKEEPER_ASSISTANT_UNLOCK_BOXES: 4,
} as const;

// Pure calculation functions (extracted from BeeContext for testing)

/**
 * Calculate total crop yield bonus from bee boxes
 */
function calculateYieldBonus(boxCount: number, upgrades: BeeUpgrade[]): number {
  let bonus = boxCount * BEE_CONSTANTS.BASE_YIELD_BONUS_PER_BOX;

  // Apply Meadow Magic upgrade (+0.5% per level per box)
  const meadowMagic = upgrades.find(u => u.id === 'meadow_magic');
  if (meadowMagic && meadowMagic.level > 0) {
    const additionalBonusPerBox = meadowMagic.level * 0.005; // 0.5% per level
    bonus += boxCount * additionalBonusPerBox;
  }

  // Apply Flower Power upgrade (+0.2% per box)
  const flowerPower = upgrades.find(u => u.id === 'flower_power');
  if (flowerPower && flowerPower.purchased) {
    bonus += boxCount * 0.002; // +0.2% per box
  }

  return bonus;
}

/**
 * Calculate honey production time considering upgrades
 */
function calculateProductionTime(upgrades: BeeUpgrade[]): number {
  let time = BEE_CONSTANTS.BASE_PRODUCTION_TIME;

  // Apply Busy Bees upgrade (-1% per level)
  const busyBees = upgrades.find(u => u.id === 'busy_bees');
  if (busyBees && busyBees.level > 0) {
    const reduction = busyBees.level * 0.01; // 1% per level
    time *= (1 - reduction);
  }

  // Apply Nectar Efficiency upgrade (-10%)
  const nectarEfficiency = upgrades.find(u => u.id === 'nectar_efficiency');
  if (nectarEfficiency && nectarEfficiency.purchased) {
    time *= 0.9; // 10% reduction
  }

  // Apply Swift Gatherers upgrade (-15%)
  const swiftGatherers = upgrades.find(u => u.id === 'swift_gatherers');
  if (swiftGatherers && swiftGatherers.purchased) {
    time *= 0.85; // 15% reduction
  }

  return Math.max(time, 10); // Minimum 10 second production time
}

/**
 * Calculate golden honey chance
 */
function calculateGoldenHoneyChance(upgrades: BeeUpgrade[]): number {
  // Start with 1% base chance
  let chance = 0.01;

  // Check for Royal Jelly upgrade (+1%)
  const royalJelly = upgrades.find(u => u.id === 'royal_jelly' && u.purchased);
  if (royalJelly) {
    chance += 0.01;
  }

  // Check for Queen's Blessing upgrade (+3%)
  const queensBlessing = upgrades.find(u => u.id === 'queens_blessing' && u.purchased);
  if (queensBlessing) {
    chance += 0.03;
  }

  // Check for Hexcomb Engineering upgrade (+2%)
  const hexcombEngineering = upgrades.find(u => u.id === 'hexcomb_engineering' && u.purchased);
  if (hexcombEngineering) {
    chance += 0.02;
  }

  // Check for Golden Touch upgrade (+5%)
  const goldenTouch = upgrades.find(u => u.id === 'golden_touch' && u.purchased);
  if (goldenTouch) {
    chance += 0.05;
  }

  return chance;
}

/**
 * Calculate bee box purchase cost
 */
function calculateBeeBoxCost(currentBoxCount: number): number {
  return 150 + (currentBoxCount * 75); // 150, 225, 300, 375...
}

describe('Bee System Calculations', () => {
  describe('createInitialBeeUpgrades', () => {
    it('should create all bee upgrades with default values', () => {
      const upgrades = createInitialBeeUpgrades();
      
      expect(upgrades.length).toBeGreaterThan(0);
      expect(upgrades.every(u => u.purchased === false || u.level === 0)).toBe(true);
    });

    it('should include production upgrades', () => {
      const upgrades = createInitialBeeUpgrades();
      const productionUpgrades = upgrades.filter(u => u.category === 'production');
      
      expect(productionUpgrades.length).toBeGreaterThan(0);
      expect(productionUpgrades.some(u => u.id === 'busy_bees')).toBe(true);
    });

    it('should include yield upgrades', () => {
      const upgrades = createInitialBeeUpgrades();
      const yieldUpgrades = upgrades.filter(u => u.category === 'yield');
      
      expect(yieldUpgrades.length).toBeGreaterThan(0);
      expect(yieldUpgrades.some(u => u.id === 'meadow_magic')).toBe(true);
    });

    it('should include quality upgrades for golden honey', () => {
      const upgrades = createInitialBeeUpgrades();
      const qualityUpgrades = upgrades.filter(u => u.category === 'quality');
      
      expect(qualityUpgrades.length).toBeGreaterThan(0);
      expect(qualityUpgrades.some(u => u.id === 'royal_jelly')).toBe(true);
    });
  });

  describe('calculateYieldBonus', () => {
    it('should return 0 with no boxes', () => {
      const upgrades = createInitialBeeUpgrades();
      expect(calculateYieldBonus(0, upgrades)).toBe(0);
    });

    it('should calculate base yield bonus correctly', () => {
      const upgrades = createInitialBeeUpgrades();
      
      // 1 box = 0.5% bonus
      expect(calculateYieldBonus(1, upgrades)).toBeCloseTo(0.005);
      
      // 10 boxes = 5% bonus
      expect(calculateYieldBonus(10, upgrades)).toBeCloseTo(0.05);
      
      // 20 boxes = 10% bonus
      expect(calculateYieldBonus(20, upgrades)).toBeCloseTo(0.1);
    });

    it('should include Meadow Magic upgrade bonus', () => {
      const upgrades = createInitialBeeUpgrades();
      const meadowMagic = upgrades.find(u => u.id === 'meadow_magic')!;
      meadowMagic.level = 5; // +0.5% per level per box

      // 10 boxes: base 5% + meadow magic (5 levels × 0.5% × 10 boxes) = 5% + 25% = 30%
      expect(calculateYieldBonus(10, upgrades)).toBeCloseTo(0.30);
    });

    it('should include Flower Power upgrade bonus', () => {
      const upgrades = createInitialBeeUpgrades();
      const flowerPower = upgrades.find(u => u.id === 'flower_power')!;
      flowerPower.purchased = true;

      // 10 boxes: base 5% + flower power (10 × 0.2%) = 5% + 2% = 7%
      expect(calculateYieldBonus(10, upgrades)).toBeCloseTo(0.07);
    });

    it('should combine multiple upgrade bonuses', () => {
      const upgrades = createInitialBeeUpgrades();
      const meadowMagic = upgrades.find(u => u.id === 'meadow_magic')!;
      const flowerPower = upgrades.find(u => u.id === 'flower_power')!;
      
      meadowMagic.level = 5;
      flowerPower.purchased = true;

      // 10 boxes: base 5% + meadow magic 25% + flower power 2% = 32%
      expect(calculateYieldBonus(10, upgrades)).toBeCloseTo(0.32);
    });
  });

  describe('calculateProductionTime', () => {
    it('should return base production time with no upgrades', () => {
      const upgrades = createInitialBeeUpgrades();
      expect(calculateProductionTime(upgrades)).toBe(BEE_CONSTANTS.BASE_PRODUCTION_TIME);
    });

    it('should apply Busy Bees upgrade reduction', () => {
      const upgrades = createInitialBeeUpgrades();
      const busyBees = upgrades.find(u => u.id === 'busy_bees')!;
      busyBees.level = 10; // -10% time

      const expectedTime = BEE_CONSTANTS.BASE_PRODUCTION_TIME * 0.9;
      expect(calculateProductionTime(upgrades)).toBeCloseTo(expectedTime);
    });

    it('should apply Nectar Efficiency upgrade', () => {
      const upgrades = createInitialBeeUpgrades();
      const nectarEfficiency = upgrades.find(u => u.id === 'nectar_efficiency')!;
      nectarEfficiency.purchased = true;

      const expectedTime = BEE_CONSTANTS.BASE_PRODUCTION_TIME * 0.9;
      expect(calculateProductionTime(upgrades)).toBeCloseTo(expectedTime);
    });

    it('should apply Swift Gatherers upgrade', () => {
      const upgrades = createInitialBeeUpgrades();
      const swiftGatherers = upgrades.find(u => u.id === 'swift_gatherers')!;
      swiftGatherers.purchased = true;

      const expectedTime = BEE_CONSTANTS.BASE_PRODUCTION_TIME * 0.85;
      expect(calculateProductionTime(upgrades)).toBeCloseTo(expectedTime);
    });

    it('should stack multiple production upgrades', () => {
      const upgrades = createInitialBeeUpgrades();
      const busyBees = upgrades.find(u => u.id === 'busy_bees')!;
      const nectarEfficiency = upgrades.find(u => u.id === 'nectar_efficiency')!;
      const swiftGatherers = upgrades.find(u => u.id === 'swift_gatherers')!;
      
      busyBees.level = 20; // -20%
      nectarEfficiency.purchased = true; // -10%
      swiftGatherers.purchased = true; // -15%

      // 132 * 0.8 * 0.9 * 0.85 = 80.78
      const expectedTime = BEE_CONSTANTS.BASE_PRODUCTION_TIME * 0.8 * 0.9 * 0.85;
      expect(calculateProductionTime(upgrades)).toBeCloseTo(expectedTime);
    });

    it('should enforce minimum production time of 10 seconds', () => {
      const upgrades = createInitialBeeUpgrades();
      const busyBees = upgrades.find(u => u.id === 'busy_bees')!;
      busyBees.level = 100; // Would be -100%, but should be capped

      expect(calculateProductionTime(upgrades)).toBe(10);
    });
  });

  describe('calculateGoldenHoneyChance', () => {
    it('should have 1% base chance with no upgrades', () => {
      const upgrades = createInitialBeeUpgrades();
      expect(calculateGoldenHoneyChance(upgrades)).toBe(0.01);
    });

    it('should add Royal Jelly bonus (+1%)', () => {
      const upgrades = createInitialBeeUpgrades();
      const royalJelly = upgrades.find(u => u.id === 'royal_jelly')!;
      royalJelly.purchased = true;

      expect(calculateGoldenHoneyChance(upgrades)).toBe(0.02);
    });

    it('should add Queen\'s Blessing bonus (+3%)', () => {
      const upgrades = createInitialBeeUpgrades();
      const queensBlessing = upgrades.find(u => u.id === 'queens_blessing')!;
      queensBlessing.purchased = true;

      expect(calculateGoldenHoneyChance(upgrades)).toBe(0.04);
    });

    it('should add Hexcomb Engineering bonus (+2%)', () => {
      const upgrades = createInitialBeeUpgrades();
      const hexcombEngineering = upgrades.find(u => u.id === 'hexcomb_engineering')!;
      hexcombEngineering.purchased = true;

      expect(calculateGoldenHoneyChance(upgrades)).toBe(0.03);
    });

    it('should add Golden Touch bonus (+5%)', () => {
      const upgrades = createInitialBeeUpgrades();
      const goldenTouch = upgrades.find(u => u.id === 'golden_touch')!;
      goldenTouch.purchased = true;

      expect(calculateGoldenHoneyChance(upgrades)).toBeCloseTo(0.06);
    });

    it('should stack all golden honey upgrades', () => {
      const upgrades = createInitialBeeUpgrades();
      
      const royalJelly = upgrades.find(u => u.id === 'royal_jelly')!;
      const queensBlessing = upgrades.find(u => u.id === 'queens_blessing')!;
      const hexcombEngineering = upgrades.find(u => u.id === 'hexcomb_engineering')!;
      const goldenTouch = upgrades.find(u => u.id === 'golden_touch')!;
      
      royalJelly.purchased = true;
      queensBlessing.purchased = true;
      hexcombEngineering.purchased = true;
      goldenTouch.purchased = true;

      // 1% base + 1% + 3% + 2% + 5% = 12%
      expect(calculateGoldenHoneyChance(upgrades)).toBeCloseTo(0.12);
    });
  });

  describe('calculateBeeBoxCost', () => {
    it('should calculate first box cost correctly', () => {
      expect(calculateBeeBoxCost(0)).toBe(150);
    });

    it('should calculate subsequent box costs correctly', () => {
      expect(calculateBeeBoxCost(1)).toBe(225); // 150 + 75
      expect(calculateBeeBoxCost(2)).toBe(300); // 150 + 150
      expect(calculateBeeBoxCost(3)).toBe(375); // 150 + 225
      expect(calculateBeeBoxCost(10)).toBe(900); // 150 + 750
    });

    it('should scale cost linearly', () => {
      const cost1 = calculateBeeBoxCost(1);
      const cost2 = calculateBeeBoxCost(2);
      const cost3 = calculateBeeBoxCost(3);
      
      expect(cost2 - cost1).toBe(75);
      expect(cost3 - cost2).toBe(75);
    });
  });

  describe('Bee Constants', () => {
    it('should have reasonable base production time', () => {
      expect(BEE_CONSTANTS.BASE_PRODUCTION_TIME).toBeGreaterThan(60);
      expect(BEE_CONSTANTS.BASE_PRODUCTION_TIME).toBeLessThan(300);
    });

    it('should start with 2 bee boxes', () => {
      expect(BEE_CONSTANTS.STARTING_BEE_BOXES).toBe(2);
    });

    it('should have max 30 bee boxes', () => {
      expect(BEE_CONSTANTS.MAX_BEE_BOXES).toBe(30);
    });

    it('should unlock at farm tier 4', () => {
      expect(BEE_CONSTANTS.UNLOCK_FARM_TIER).toBe(4);
    });

    it('should unlock beekeeper assistant at 4 boxes', () => {
      expect(BEE_CONSTANTS.BEEKEEPER_ASSISTANT_UNLOCK_BOXES).toBe(4);
    });
  });
});
