/**
 * Tests for the bee numbers the game and the Bees tab share: how long a batch takes, how much
 * honey it holds, the Golden chance and the crop bonus; and for what the tab shows from them:
 * percents, day pairs, the winter countdown, the Beekeeper's levels, the hive milestones and
 * each upgrade row.
 */
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { BeeProvider, useBees } from '../context/BeeContext';
import { createInitialBeeUpgrades } from '../data/beeUpgrades';
import { batchDays, beeLevels, cropBonus, goldenChance, hivePrice, lbsPerBatch, type BeeLevels } from '../utils/beeProduction';
import {
  HIVE_MILESTONES,
  beeUpgradeRow,
  beekeeperBonusAt,
  dayPair,
  percent,
  winterCountdown,
  type BeeRowContext
} from '../utils/beeView';
import type { BeeBox, BeeUpgrade } from '../types/bees';

const NONE: BeeLevels = {
  busyBees: 0, superFrames: 0, meadowMagic: 0, flowerPower: false, royalJelly: false, queensBlessing: false,
  goldenTouch: false, nectarEfficiency: false, swiftGatherers: false
};

const withLevels = (levels: Record<string, number | boolean>): BeeUpgrade[] => createInitialBeeUpgrades().map(upgrade => {
  const value = levels[upgrade.id];
  if (value === undefined) return upgrade;
  return typeof value === 'number' ? { ...upgrade, level: value, purchased: value > 0 } : { ...upgrade, purchased: value };
});

const hive = (i: number): BeeBox => ({
  id: `box_${i}`, active: true, productionTimer: 0, productionTime: 132, honeyProduced: 0, lastHarvestTime: 0, harvestReady: false, storedBatches: 0
});

describe('the bee numbers', () => {
  it('a batch takes 132 days, less with Busy Bees, Swift Gatherers and the Beekeeper', () => {
    expect(batchDays(NONE, 0)).toBe(132);
    expect(batchDays({ ...NONE, busyBees: 3 }, 0)).toBeCloseTo(128.16, 2);
    expect(batchDays({ ...NONE, busyBees: 32 }, 0.4)).toBeCloseTo(71.43, 2);
    expect(batchDays({ ...NONE, busyBees: 32, swiftGatherers: true }, 0.4)).toBeCloseTo(60.71, 2);
  });

  it('a batch holds 15 lbs, 5% more a level of Super Frames and 10% with Nectar Efficiency, rounded', () => {
    expect(lbsPerBatch(NONE)).toBe(15);
    expect(lbsPerBatch({ ...NONE, superFrames: 2 })).toBe(17);
    expect(lbsPerBatch({ ...NONE, superFrames: 14 })).toBe(26);
    expect(lbsPerBatch({ ...NONE, superFrames: 14, nectarEfficiency: true })).toBe(27);
  });

  it('a batch is Golden 1% of the time, 2% with Royal Jelly, doubled by Queen\'s Blessing, 2% more with Golden Touch', () => {
    expect(goldenChance(NONE)).toBe(0.01);
    expect(goldenChance({ ...NONE, royalJelly: true })).toBe(0.02);
    expect(goldenChance({ ...NONE, royalJelly: true, queensBlessing: true })).toBe(0.04);
    expect(goldenChance({ ...NONE, royalJelly: true, queensBlessing: true, goldenTouch: true })).toBeCloseTo(0.06, 10);
  });

  it('each hive adds 0.5% to every crop, more with Meadow Magic and Flower Power', () => {
    expect(cropBonus(7, { meadowMagic: 1, flowerPower: false })).toBeCloseTo(0.07, 10);
    expect(cropBonus(30, { meadowMagic: 11, flowerPower: true })).toBeCloseTo(1.86, 10);
  });

  it('hives cost 75 more each, and the step doubles with each set of five', () => {
    expect([0, 2, 4, 5, 7, 9, 10, 25, 29].map(hivePrice)).toEqual([150, 300, 450, 525, 825, 1125, 1275, 11775, 21375]);
  });

  it('are the numbers the bee context uses', () => {
    const upgrades = withLevels({ busy_bees: 3, hexcomb_engineering: 2, meadow_magic: 1, royal_jelly: true, flower_power: true });
    const boxes = Array.from({ length: 7 }, (_, i) => hive(i));
    const wrapper = ({ children }: { children: ReactNode }) => (
      <BeeProvider farmTier={5} season="Summer" initialState={{ unlocked: true, firstTimeSetup: true, boxes, upgrades }}>{children}</BeeProvider>
    );
    const { result } = renderHook(() => useBees(), { wrapper });
    const levels = beeLevels(result.current.upgrades);

    expect(levels).toEqual({
      busyBees: 3, superFrames: 2, meadowMagic: 1, flowerPower: true, royalJelly: true, queensBlessing: false,
      goldenTouch: false, nectarEfficiency: false, swiftGatherers: false
    });
    expect(result.current.calculateYieldBonus()).toBe(cropBonus(7, levels));
    expect(result.current.calculateHoneyProductionMultiplier()).toBe(1.1);
    expect(result.current.getBeeStats().averageProductionTime).toBe(batchDays(levels, 0));
  });
});

describe('what the Bees tab shows', () => {
  it('writes percents with a decimal only when needed', () => {
    expect(percent(0.07)).toBe('7%');
    expect(percent(0.105)).toBe('10.5%');
    expect(percent(1.86)).toBe('186%');
  });

  it('writes whole days unless the next level rounds to the same day', () => {
    expect(dayPair(128.16, 126.92)).toEqual(['128', '127']);
    expect(dayPair(71.43, 70.89)).toEqual(['71.4', '70.9']);
  });

  it('counts down to winter, and in winter to spring', () => {
    expect(winterCountdown(200)).toEqual({ winter: false, days: 65 });
    expect(winterCountdown(264)).toEqual({ winter: false, days: 1 });
    expect(winterCountdown(265)).toEqual({ winter: true, days: 101 });
    expect(winterCountdown(365)).toEqual({ winter: true, days: 1 });
  });

  it('gives the Beekeeper 10% when hired at level 0, then 5% more a level', () => {
    expect(beekeeperBonusAt(0)).toBe(0.1);
    expect(beekeeperBonusAt(2)).toBeCloseTo(0.2, 10);
    expect(beekeeperBonusAt(10)).toBeCloseTo(0.6, 10);
  });

  it('knows which hive counts open something', () => {
    expect(HIVE_MILESTONES.map(m => `${m.hives} ${m.name}`)).toEqual([
      '4 Beekeeper', '10 Winter Hardiness', '15 Golden Touch', '20 Nectar Efficiency', '25 Flower Power', '30 Swift Gatherers'
    ]);
  });

  it('works out each upgrade row: its effect, and whether it can be bought', () => {
    const upgrades = withLevels({ busy_bees: 50, royal_jelly: true });
    const context: BeeRowContext = { upgrades, levels: beeLevels(upgrades), hives: 12, honey: 100, goldenHoney: 200, beekeeperBonus: 0 };
    const row = (id: string) => beeUpgradeRow(upgrades.find(u => u.id === id)!, context);

    expect(row('busy_bees')).toMatchObject({ state: 'max', effect: '88 days a batch' });
    expect(row('royal_jelly')).toMatchObject({ state: 'owned' });
    expect(row('queens_blessing')).toMatchObject({ state: 'afford', effect: 'Golden chance 2%, then 4%' });
    expect(row('winter_hardiness')).toMatchObject({ state: 'afford' });
    expect(row('golden_touch')).toMatchObject({ state: 'locked', lockReason: '15 hives', effect: 'Golden chance 2%, then 4%' });
    expect(row('meadow_magic')).toMatchObject({ state: 'short', effect: 'Crops +6%, next +12%' });
    expect(row('nectar_efficiency')).toMatchObject({ state: 'locked', effect: '15 lbs a batch, then 17' });
    expect(row('swift_gatherers')).toMatchObject({ state: 'locked', effect: '88 days a batch, then 75' });
  });

  it('says what the three late Golden Honey upgrades do once bought', () => {
    const upgrades = withLevels({ golden_touch: true, nectar_efficiency: true, swift_gatherers: true });
    const context: BeeRowContext = { upgrades, levels: beeLevels(upgrades), hives: 30, honey: 0, goldenHoney: 0, beekeeperBonus: 0 };
    const effect = (id: string) => beeUpgradeRow(upgrades.find(u => u.id === id)!, context).effect;

    expect(effect('golden_touch')).toBe('+2% chance a batch is Golden');
    expect(effect('nectar_efficiency')).toBe('+10% honey a batch');
    expect(effect('swift_gatherers')).toBe('Batches take 15% less time');
  });
});
