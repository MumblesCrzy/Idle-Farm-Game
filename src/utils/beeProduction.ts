/**
 * Honey production for one hive. A hive doesn't wait to be emptied: each finished batch is
 * stored and the bees start on the next, so honey stockpiles until it's collected. Winter
 * stops the bees unless they have Winter Hardiness.
 */
import type { BeeBox, BeeUpgrade } from '../types/bees';
import { BEE_CONSTANTS, MAX_OFFLINE_MS } from '../config/gameConstants';

/** Winter runs from day 265 to day 365, so this share of the year is warm enough for bees */
export const NON_WINTER_SHARE = 264 / 365;

/** Time gaps longer than this many seconds are credited as an average over the seasons */
export const LONG_GAP_SECONDS = 5;

/** The most time a single gap credits, the same 8 hours as every other system */
export const MAX_GAP_SECONDS = MAX_OFFLINE_MS / 1000;

/** Batches waiting in a hive. Saves from before stockpiling only knew whether one was ready. */
export function storedBatches(box: BeeBox): number {
  return box.storedBatches ?? (box.harvestReady ? 1 : 0);
}

/**
 * A hive from a save made before stockpiling: a ready hive held one batch with its timer
 * full, so that becomes one stored batch and a fresh timer.
 */
export function normalizeBox(box: BeeBox): BeeBox {
  if (box.storedBatches !== undefined) return box;
  return box.harvestReady
    ? { ...box, storedBatches: 1, productionTimer: 0 }
    : { ...box, storedBatches: 0 };
}

/**
 * How many seconds of a gap the bees work. Short gaps, like one game step, follow the
 * current season. Long ones, like time away or a hidden tab, can span seasons, so they count
 * the warm share of the year. Winter Hardiness keeps the bees working all year. Gaps are
 * capped at 8 hours.
 */
export function productiveSeconds(
  seconds: number,
  { winter, winterHardiness }: { winter: boolean; winterHardiness: boolean }
): number {
  const capped = Math.min(Math.max(0, seconds), MAX_GAP_SECONDS);
  if (winterHardiness) return capped;
  if (capped > LONG_GAP_SECONDS) return capped * NON_WINTER_SHARE;
  return winter ? 0 : capped;
}

/** Advances one hive: finished batches are stored, and the timer keeps the time toward the next */
export function advanceBox(box: BeeBox, seconds: number, productionTime: number): BeeBox {
  if (seconds <= 0 || productionTime <= 0) return box;
  const total = box.productionTimer + seconds;
  const made = Math.floor(total / productionTime);
  if (made === 0) return { ...box, productionTimer: total };
  return {
    ...box,
    productionTimer: total - made * productionTime,
    storedBatches: storedBatches(box) + made,
    harvestReady: true
  };
}

/** What collecting a hive's stored batches gives: each batch is golden by its own roll */
export function collectBatches(
  batches: number,
  { honeyPerBatch, goldenChance, random = Math.random }: { honeyPerBatch: number; goldenChance: number; random?: () => number }
): { regular: number; golden: number } {
  let goldenBatches = 0;
  for (let i = 0; i < batches; i++) {
    if (random() < goldenChance) goldenBatches++;
  }
  return { regular: (batches - goldenBatches) * honeyPerBatch, golden: goldenBatches * honeyPerBatch };
}

/**
 * What the next hive costs in honey, by the hives owned. The price rises 75 a hive, and the
 * step doubles with each set of five: hives 1 to 5 cost 150 to 450, hives 26 to 30 cost
 * 11,775 to 21,375.
 */
export function hivePrice(hivesOwned: number): number {
  const set = Math.floor(hivesOwned / 5);
  let price = 150;
  for (let earlier = 0; earlier < set; earlier++) price += 75 * Math.pow(2, earlier) * 5;
  price += 75 * Math.pow(2, set) * (hivesOwned % 5);
  return Math.floor(price);
}

/** The upgrade levels the bee numbers depend on */
export interface BeeLevels {
  busyBees: number;
  /** Super Frames, saved under its old id hexcomb_engineering */
  superFrames: number;
  meadowMagic: number;
  flowerPower: boolean;
  royalJelly: boolean;
  queensBlessing: boolean;
  goldenTouch: boolean;
  nectarEfficiency: boolean;
  swiftGatherers: boolean;
}

/** Reads the levels from the bee upgrade list */
export function beeLevels(upgrades: ReadonlyArray<BeeUpgrade>): BeeLevels {
  const find = (id: string) => upgrades.find(upgrade => upgrade.id === id);
  return {
    busyBees: find('busy_bees')?.level ?? 0,
    superFrames: find('hexcomb_engineering')?.level ?? 0,
    meadowMagic: find('meadow_magic')?.level ?? 0,
    flowerPower: find('flower_power')?.purchased ?? false,
    royalJelly: find('royal_jelly')?.purchased ?? false,
    queensBlessing: find('queens_blessing')?.purchased ?? false,
    goldenTouch: find('golden_touch')?.purchased ?? false,
    nectarEfficiency: find('nectar_efficiency')?.purchased ?? false,
    swiftGatherers: find('swift_gatherers')?.purchased ?? false
  };
}

/**
 * Days one batch takes: 132, 1% faster a level of Busy Bees, 15% less with Swift Gatherers,
 * then faster again while the Beekeeper works
 */
export function batchDays(levels: Pick<BeeLevels, 'busyBees' | 'swiftGatherers'>, beekeeperBonus: number): number {
  let days = BEE_CONSTANTS.BASE_PRODUCTION_TIME;
  if (levels.busyBees > 0) days = days / (1 + levels.busyBees * 0.01);
  if (levels.swiftGatherers) days = days * 0.85;
  if (beekeeperBonus > 0) days = days / (1 + beekeeperBonus);
  return days;
}

/** A batch's honey as a multiple of 15 lbs: Super Frames add 5% a level, Nectar Efficiency 10% */
export function honeyMultiplier(levels: Pick<BeeLevels, 'superFrames' | 'nectarEfficiency'>): number {
  let multiplier = 1;
  if (levels.superFrames > 0) multiplier += levels.superFrames * 0.05;
  if (levels.nectarEfficiency) multiplier += 0.1;
  return multiplier;
}

/** Pounds of honey in one batch */
export function lbsPerBatch(levels: Pick<BeeLevels, 'superFrames' | 'nectarEfficiency'>): number {
  return Math.round(15 * honeyMultiplier(levels));
}

/**
 * The chance a batch comes out Golden: 1%, plus 1% from Royal Jelly, doubled by Queen's
 * Blessing, plus 2% from Golden Touch
 */
export function goldenChance(levels: Pick<BeeLevels, 'royalJelly' | 'queensBlessing' | 'goldenTouch'>): number {
  let chance = BEE_CONSTANTS.BASE_GOLDEN_HONEY_CHANCE;
  if (levels.royalJelly) chance += 0.01;
  if (levels.queensBlessing && chance > 0) chance *= 2;
  if (levels.goldenTouch) chance += 0.02;
  return chance;
}

/** What one hive adds to every crop's harvest: 0.5%, plus 0.5% a level of Meadow Magic and 0.2% from Flower Power */
export function cropBonusPerHive(levels: Pick<BeeLevels, 'meadowMagic' | 'flowerPower'>): number {
  return BEE_CONSTANTS.BASE_YIELD_BONUS_PER_BOX + levels.meadowMagic * 0.005 + (levels.flowerPower ? 0.002 : 0);
}

/** The hives' bonus to every crop's harvest, summed in the order the game always has */
export function cropBonus(hives: number, levels: Pick<BeeLevels, 'meadowMagic' | 'flowerPower'>): number {
  let bonus = hives * BEE_CONSTANTS.BASE_YIELD_BONUS_PER_BOX;
  if (levels.meadowMagic > 0) bonus += hives * (levels.meadowMagic * 0.005);
  if (levels.flowerPower) bonus += hives * 0.002;
  return bonus;
}
