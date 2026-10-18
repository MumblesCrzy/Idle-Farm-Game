/**
 * Fall Pumpkin Rush prices and County Fair judging.
 *
 * The Farm Stand cards, the sell buttons and Sell All all price pumpkins here,
 * so what a card shows is what a sale pays. Random rolls are passed in, so the
 * same rolls always give the same result.
 */
import {
  PUMPKIN_VARIETIES,
  PUMPKIN_QUALITY_MULTIPLIERS,
  PUMPKIN_FINISH_MULTIPLIERS,
  PUMPKIN_FINISH_BONUSES,
  PUMPKIN_EVENT_CONSTANTS
} from '../data/pumpkinEventData';
import { floorCheer } from './christmasTreePricing';
import type { EventUpgrade } from '../types/eventUpgrades';
import type {
  FairPlacing,
  PumpkinDecoration,
  PumpkinFinish,
  PumpkinQuality,
  PumpkinVariety,
  WeighOffResult
} from '../types/pumpkinEvent';

/** Rounds Candy Corn down, allowing for floating-point error */
export const floorCandyCorn = floorCheer;

// ============================================================================
// INVENTORY KEYS
// ============================================================================

/** The parts of a pumpkin inventory key, written as variety_quality_finish */
export interface PumpkinKeyParts {
  variety: PumpkinVariety;
  quality: PumpkinQuality;
  finish: PumpkinFinish;
}

export function pumpkinKey(variety: PumpkinVariety, quality: PumpkinQuality, finish: PumpkinFinish): string {
  return `${variety}_${quality}_${finish}`;
}

export function parsePumpkinKey(key: string): PumpkinKeyParts {
  const [variety = 'sugarPie', quality = 'normal', finish = 'plain'] = key.split('_');
  return {
    variety: variety as PumpkinVariety,
    quality: quality as PumpkinQuality,
    finish: finish as PumpkinFinish
  };
}

/** The finish a set of decorations gives: both make a Jack-o'-Lantern */
export function finishFor(decorations: readonly PumpkinDecoration[]): PumpkinFinish {
  const carved = decorations.includes('carving');
  const lit = decorations.includes('candle');
  if (carved && lit) return 'lantern';
  if (lit) return 'candlelit';
  if (carved) return 'carved';
  return 'plain';
}

// ============================================================================
// PRICES
// ============================================================================

/** Value bonus of an owned upgrade, or 0 */
function ownedBonus(upgrades: readonly EventUpgrade[], id: string): number {
  const upgrade = upgrades.find(u => u.id === id);
  return upgrade?.owned ? upgrade.valueBonus ?? 0 : 0;
}

/** Whether an upgrade is owned */
export function ownsUpgrade(upgrades: readonly EventUpgrade[], id: string): boolean {
  return upgrades.some(u => u.id === id && u.owned);
}

/** Level of a repeatable upgrade, or 0 */
export function upgradeLevel(upgrades: readonly EventUpgrade[], id: string): number {
  return upgrades.find(u => u.id === id)?.level ?? 0;
}

/** Growth per game day: 1, plus the Compost Heap bonus for each level */
export function pumpkinGrowthSpeed(upgrades: readonly EventUpgrade[]): number {
  const compost = upgrades.find(u => u.id === 'compost_heap');
  return 1 + (compost?.level ?? 0) * (compost?.speedBonus ?? 0);
}

/** Scarecrow Crew jobs per second: 1, plus one per Busy Scarecrows level */
export function crewJobsPerSecond(upgrades: readonly EventUpgrade[]): number {
  return 1 + upgradeLevel(upgrades, 'busy_scarecrows');
}

/**
 * Candy Corn for one pumpkin of this inventory key, before the bonuses that
 * apply to the whole sale.
 */
export function getPumpkinPrice(
  key: string,
  upgrades: readonly EventUpgrade[],
  demandMultiplier: number
): number {
  const { variety, quality, finish } = parsePumpkinKey(key);
  const baseValue = (PUMPKIN_VARIETIES[variety] ?? PUMPKIN_VARIETIES.sugarPie).baseValue;
  const qualityMultiplier = PUMPKIN_QUALITY_MULTIPLIERS[quality] ?? 1;
  const finishMultiplier = PUMPKIN_FINISH_MULTIPLIERS[finish] ?? 1;
  const finishBonus = PUMPKIN_FINISH_BONUSES[finish] ?? 0;
  // Spooky Patterns raises every carved finish, Glowing Lanterns raises Jack-o'-Lanterns,
  // and Harvest Display raises Blue Ribbons; the bonuses add together
  const upgradeMultiplier = 1
    + (finish === 'carved' || finish === 'lantern' ? ownedBonus(upgrades, 'spooky_patterns') : 0)
    + (finish === 'lantern' ? ownedBonus(upgrades, 'glowing_lanterns') : 0)
    + (quality === 'blueRibbon' ? ownedBonus(upgrades, 'harvest_display') : 0);

  // A carving or a candle then adds its flat Candy Corn
  return floorCandyCorn(baseValue * qualityMultiplier * finishMultiplier * demandMultiplier * upgradeMultiplier) + finishBonus;
}

/** Candy Corn for one Atlantic Giant, priced by weight */
export function getGiantPrice(
  weight: number,
  quality: PumpkinQuality,
  upgrades: readonly EventUpgrade[],
  demandMultiplier: number
): number {
  const displayBonus = quality === 'blueRibbon' ? ownedBonus(upgrades, 'harvest_display') : 0;
  return floorCandyCorn(weight / PUMPKIN_EVENT_CONSTANTS.POUNDS_PER_CANDY_CORN * demandMultiplier * (1 + displayBonus));
}

/** Multiplier on all Candy Corn from sales, from Autumn Bunting */
export function getSaleMultiplier(upgrades: readonly EventUpgrade[]): number {
  return 1 + ownedBonus(upgrades, 'bunting');
}

/** Candy Corn from selling this many pumpkins of one key, Fortune Teller tips excluded */
export function getPumpkinSaleCandyCorn(
  key: string,
  quantity: number,
  upgrades: readonly EventUpgrade[],
  demandMultiplier: number
): number {
  return floorCandyCorn(getPumpkinPrice(key, upgrades, demandMultiplier) * quantity * getSaleMultiplier(upgrades));
}

// ============================================================================
// ARCHIE
// ============================================================================

/**
 * Candy Corn Archie finds during the Pumpkin Rush: 10 to 500, growing with
 * pumpkins sold, with the same streak bonus as his money reward.
 */
export function archieCandyCornReward(pumpkinsSold: number, streak: number): number {
  const salesFactor = Math.max(1, Math.log10(Math.max(1, pumpkinsSold + 1)));
  const base = Math.max(10, Math.min(500, Math.floor(10 * salesFactor * 5)));
  const streakMultiplier = Math.min(3, 1 + (Math.max(1, streak) - 1) * 0.5);
  return Math.floor(base * streakMultiplier);
}

// ============================================================================
// ATLANTIC GIANTS AND THE WEIGH-OFF
// ============================================================================

/**
 * Weight of a newly harvested Atlantic Giant, in pounds.
 * @param roll - A random number from 0 to 1
 */
export function rollGiantWeight(quality: PumpkinQuality, tonicLevel: number, roll: number): number {
  const c = PUMPKIN_EVENT_CONSTANTS;
  const base = c.GIANT_MIN_WEIGHT + roll * c.GIANT_WEIGHT_RANGE;
  const qualityMultiplier = quality === 'blueRibbon' ? c.GIANT_BLUE_RIBBON_WEIGHT : 1;
  return Math.round(base * qualityMultiplier * (1 + tonicLevel * c.GIANT_TONIC_PER_LEVEL));
}

/** Typical rival weight at the next fair; rivals grow with each fair entered */
export function rivalBaseWeight(fairsEntered: number): number {
  const c = PUMPKIN_EVENT_CONSTANTS;
  return c.RIVAL_BASE_WEIGHT * (1 + fairsEntered * c.RIVAL_GROWTH_PER_FAIR);
}

/** Candy Corn prize for a placing */
export function weighOffPrize(placing: FairPlacing, weight: number): number {
  switch (placing) {
    case 1: return 100 + Math.floor(weight / 5);
    case 2: return 50 + Math.floor(weight / 10);
    case 3: return 25;
    default: return 5; // thanks for entering
  }
}

/**
 * Judges a giant against the other entries at the fair.
 * @param rolls - One random number from 0 to 1 per rival
 */
export function judgeWeighOff(weight: number, fairsEntered: number, rolls: readonly number[]): WeighOffResult {
  const c = PUMPKIN_EVENT_CONSTANTS;
  const base = rivalBaseWeight(fairsEntered);
  const rivalWeights = Array.from({ length: c.RIVAL_COUNT }, (_, i) =>
    Math.round(base * (1 - c.RIVAL_SPREAD / 2 + (rolls[i] ?? 0.5) * c.RIVAL_SPREAD))
  ).sort((a, b) => b - a);
  // A tie goes to the player
  const placing = Math.min(4, 1 + rivalWeights.filter(rival => rival > weight).length) as FairPlacing;
  return { placing, weight, rivalWeights, prize: weighOffPrize(placing, weight) };
}
