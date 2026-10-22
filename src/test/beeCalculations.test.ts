/**
 * Bee System Calculation Tests
 *
 * The bee rules the game runs on, from utils/beeProduction.ts: the crop bonus, how long a
 * batch takes, how much honey it holds, the Golden Honey chance, and hive prices; plus the
 * upgrade list and the bee constants.
 */

import { describe, it, expect } from 'vitest';
import { createInitialBeeUpgrades } from '../data/beeUpgrades';
import { BEE_CONSTANTS } from '../config/gameConstants';
import { batchDays, beeLevels, cropBonus, goldenChance, hivePrice, lbsPerBatch } from '../utils/beeProduction';
import type { BeeUpgrade } from '../types/bees';

/** The upgrade list with levels: a number for a repeatable upgrade, true for a bought one */
const withLevels = (levels: Record<string, number | boolean>): BeeUpgrade[] => createInitialBeeUpgrades().map(upgrade => {
  const value = levels[upgrade.id];
  if (value === undefined) return upgrade;
  return typeof value === 'number' ? { ...upgrade, level: value, purchased: value > 0 } : { ...upgrade, purchased: value };
});

const levelsOf = (levels: Record<string, number | boolean> = {}) => beeLevels(withLevels(levels));

describe('Bee System Calculations', () => {
  describe('createInitialBeeUpgrades', () => {
    it('creates every bee upgrade unbought', () => {
      const upgrades = createInitialBeeUpgrades();
      expect(upgrades).toHaveLength(11);
      expect(upgrades.every(u => !u.purchased && u.level === 0)).toBe(true);
    });

    it('includes the production, yield and Golden Honey upgrades', () => {
      const ids = createInitialBeeUpgrades().map(u => u.id);
      expect(ids).toEqual(expect.arrayContaining(['busy_bees', 'meadow_magic', 'royal_jelly', 'golden_touch', 'nectar_efficiency', 'swift_gatherers']));
    });
  });

  describe('cropBonus', () => {
    it('is 0 with no hives', () => {
      expect(cropBonus(0, levelsOf())).toBe(0);
    });

    it('gives 0.5% a hive', () => {
      expect(cropBonus(1, levelsOf())).toBeCloseTo(0.005);
      expect(cropBonus(20, levelsOf())).toBeCloseTo(0.1);
    });

    it('adds 0.5% a hive for each level of Meadow Magic, and 0.2% a hive for Flower Power', () => {
      expect(cropBonus(10, levelsOf({ meadow_magic: 2 }))).toBeCloseTo(0.15);
      expect(cropBonus(10, levelsOf({ flower_power: true }))).toBeCloseTo(0.07);
      expect(cropBonus(10, levelsOf({ meadow_magic: 2, flower_power: true }))).toBeCloseTo(0.17);
    });

    it('has no ceiling: 30 hives reach +321% with Meadow Magic 20 and Flower Power', () => {
      expect(cropBonus(30, levelsOf({ meadow_magic: 11, flower_power: true }))).toBeCloseTo(1.86);
      expect(cropBonus(30, levelsOf({ meadow_magic: 20, flower_power: true }))).toBeCloseTo(3.21);
    });
  });

  describe('batchDays', () => {
    it('is 132 days with no upgrades', () => {
      expect(batchDays(levelsOf(), 0)).toBe(BEE_CONSTANTS.BASE_PRODUCTION_TIME);
    });

    it('is 1% faster a level of Busy Bees', () => {
      expect(batchDays(levelsOf({ busy_bees: 10 }), 0)).toBeCloseTo(120);
    });

    it('takes 15% less time with Swift Gatherers', () => {
      expect(batchDays(levelsOf({ swift_gatherers: true }), 0)).toBeCloseTo(112.2);
    });

    it('is faster again while the Beekeeper works', () => {
      expect(batchDays(levelsOf(), 0.2)).toBeCloseTo(110);
    });

    it('stacks all three', () => {
      // 132 ÷ 1.32 × 0.85 ÷ 1.40
      expect(batchDays(levelsOf({ busy_bees: 32, swift_gatherers: true }), 0.4)).toBeCloseTo(60.71, 2);
    });
  });

  describe('lbsPerBatch', () => {
    it('is 15 lbs, 5% more a level of Super Frames, rounded', () => {
      expect(lbsPerBatch(levelsOf())).toBe(15);
      expect(lbsPerBatch(levelsOf({ hexcomb_engineering: 2 }))).toBe(17);
    });

    it('holds 10% more with Nectar Efficiency', () => {
      expect(lbsPerBatch(levelsOf({ nectar_efficiency: true }))).toBe(17);
      expect(lbsPerBatch(levelsOf({ hexcomb_engineering: 14, nectar_efficiency: true }))).toBe(27);
    });
  });

  describe('goldenChance', () => {
    it('is 1% with no upgrades', () => {
      expect(goldenChance(levelsOf())).toBe(0.01);
    });

    it('is 2% with Royal Jelly', () => {
      expect(goldenChance(levelsOf({ royal_jelly: true }))).toBe(0.02);
    });

    it('doubles with Queen\'s Blessing', () => {
      expect(goldenChance(levelsOf({ royal_jelly: true, queens_blessing: true }))).toBe(0.04);
    });

    it('adds 2% with Golden Touch, after the doubling', () => {
      expect(goldenChance(levelsOf({ royal_jelly: true, queens_blessing: true, golden_touch: true }))).toBeCloseTo(0.06);
    });
  });

  describe('hivePrice', () => {
    it('starts at 150 honey and rises 75 a hive through the first five', () => {
      expect([0, 1, 2, 3, 4].map(hivePrice)).toEqual([150, 225, 300, 375, 450]);
    });

    it('rises 150 a hive through the next five', () => {
      expect([5, 6, 7, 8, 9].map(hivePrice)).toEqual([525, 675, 825, 975, 1125]);
    });

    it('doubles its step with each set of five', () => {
      expect(hivePrice(10)).toBe(1275);
      expect(hivePrice(15)).toBe(2775);
      expect(hivePrice(20)).toBe(5775);
      expect(hivePrice(25)).toBe(11775);
      expect(hivePrice(29)).toBe(21375);
    });
  });

  describe('Bee Constants', () => {
    it('makes a batch every 132 days', () => {
      expect(BEE_CONSTANTS.BASE_PRODUCTION_TIME).toBe(132);
    });

    it('starts with 2 hives and allows 30', () => {
      expect(BEE_CONSTANTS.STARTING_BEE_BOXES).toBe(2);
      expect(BEE_CONSTANTS.MAX_BEE_BOXES).toBe(30);
    });

    it('opens bees at Farm Tier 4, and the Beekeeper at 4 hives', () => {
      expect(BEE_CONSTANTS.UNLOCK_FARM_TIER).toBe(4);
      expect(BEE_CONSTANTS.BEEKEEPER_ASSISTANT_UNLOCK_BOXES).toBe(4);
    });

    it('has no cap on the crop bonus', () => {
      expect('MAX_YIELD_BONUS' in BEE_CONSTANTS).toBe(false);
    });
  });
});
