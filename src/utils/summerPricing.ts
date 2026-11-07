/**
 * Summer Watermelon Festival prices, rolls and rates.
 *
 * The stall cards, the sell buttons and Sell All all price melons here, so what
 * a card shows is what a sale pays. Random rolls are passed in, so the same rolls
 * always give the same result.
 */
import {
  COLD_FINISHES,
  COLD_GOODS,
  MELON_FINISH_BONUSES,
  MELON_FINISH_MULTIPLIERS,
  MELON_FINISH_NAMES,
  MELON_QUALITY_MULTIPLIERS,
  MELON_VARIETIES,
  SUMMER_EVENT_CONSTANTS,
  SUMMER_GOOD_NAMES,
  SUMMER_GOOD_SINGULAR,
  SUMMER_RECIPES
} from '../data/summerEventData';
import { floorCheer } from './christmasTreePricing';
import { archieCandyCornReward, ownsUpgrade, upgradeLevel } from './pumpkinPricing';
import type { EventUpgrade } from '../types/eventUpgrades';
import type {
  MelonDecoration,
  MelonFinish,
  MelonQuality,
  MelonVariety,
  PicnicCrewAction,
  StockMelon,
  SummerGood
} from '../types/summerEvent';

export { ownsUpgrade, upgradeLevel };

/** Rounds Tickets down, allowing for floating-point error */
export const floorTickets = floorCheer;

const C = SUMMER_EVENT_CONSTANTS;

/** Rounds to one decimal, the way Brix is shown */
export function roundBrix(value: number): number {
  return Math.round(value * 10) / 10;
}

// ============================================================================
// INVENTORY KEYS
// ============================================================================

/** The parts of a melon's inventory key, written as variety_quality_finish */
export interface MelonKeyParts {
  variety: StockMelon;
  quality: MelonQuality;
  finish: MelonFinish;
}

export function melonKey(variety: StockMelon, quality: MelonQuality, finish: MelonFinish): string {
  return `${variety}_${quality}_${finish}`;
}

export function parseMelonKey(key: string): MelonKeyParts {
  const [variety = 'sugarBaby', quality = 'normal', finish = 'plain'] = key.split('_');
  return {
    variety: variety as StockMelon,
    quality: quality as MelonQuality,
    finish: finish as MelonFinish
  };
}

/** The finish a set of decorations gives: both make a Picnic Basket */
export function melonFinishFor(decorations: readonly MelonDecoration[]): MelonFinish {
  const chilled = decorations.includes('chill');
  const carved = decorations.includes('carve');
  if (chilled && carved) return 'basket';
  if (carved) return 'carved';
  if (chilled) return 'chilled';
  return 'plain';
}

/** Melons in an inventory */
export function countMelons(melons: Record<string, number>): number {
  return Object.values(melons).reduce((sum, quantity) => sum + quantity, 0);
}

// ============================================================================
// RATES
// ============================================================================

/** Value bonus of an owned upgrade, or 0 */
function ownedBonus(upgrades: readonly EventUpgrade[], id: string): number {
  const upgrade = upgrades.find(u => u.id === id);
  return upgrade?.owned ? upgrade.valueBonus ?? 0 : 0;
}

/** Patch growth per game day: 1, plus the Straw Mulch bonus for each level */
export function melonGrowthSpeed(upgrades: readonly EventUpgrade[]): number {
  const mulch = upgrades.find(u => u.id === 'straw_mulch');
  return 1 + (mulch?.level ?? 0) * (mulch?.speedBonus ?? 0);
}

/** Blocks of ice the Ice House holds: 10, or 25 with Sawdust Packing */
export function iceCap(upgrades: readonly EventUpgrade[]): number {
  return ownsUpgrade(upgrades, 'sawdust_packing') ? C.SAWDUST_ICE_CAP : C.ICE_CAP;
}

/** Picnic Crew jobs per second: 1, plus one per Extra Hands level */
export function picnicJobsPerSecond(upgrades: readonly EventUpgrade[]): number {
  return 1 + upgradeLevel(upgrades, 'extra_hands');
}

// ============================================================================
// SWEETNESS, WEIGHT AND SPITS
// ============================================================================

/** Extra Brix from each first place in Sweetest Melon: 0.1 a win, up to 0.8 */
export function championBrixBonus(firstPlaces: number): number {
  return Math.min(C.CHAMPION_BRIX_MAX, Math.max(0, firstPlaces) * C.CHAMPION_BRIX_PER_WIN);
}

/** Extra Carolina Cross weight from each first place in Heaviest Melon: 5% a win, up to 40% */
export function championWeightBonus(firstPlaces: number): number {
  return Math.min(C.CHAMPION_WEIGHT_MAX, Math.max(0, firstPlaces) * C.CHAMPION_WEIGHT_PER_WIN);
}

/**
 * Sweetness and grade of a newly harvested melon. Sugar Seeds roll the sugar band
 * some of the time; Sun-Ripening and Sweetest Melon wins raise every roll. 12.0 Brix
 * and up is a Sugar Melon, however it got there.
 * @param gradeRoll - A random number from 0 to 1, against the Sugar Seeds chance
 * @param brixRoll - A random number from 0 to 1, for where in the band it lands
 */
export function rollSweetness(
  upgrades: readonly EventUpgrade[],
  sweetestWins: number,
  gradeRoll: number,
  brixRoll: number
): { brix: number; quality: MelonQuality } {
  const seeds = upgrades.find(u => u.id === 'sugar_seeds');
  const sugarChance = seeds?.owned ? seeds.procChance ?? 0 : 0;
  const band = gradeRoll < sugarChance
    ? C.SUGAR_BRIX_MIN + brixRoll * C.SUGAR_BRIX_RANGE
    : C.BRIX_MIN + brixRoll * C.BRIX_RANGE;
  const bonus = upgradeLevel(upgrades, 'sun_ripening') * C.SUN_RIPENING_BRIX + championBrixBonus(sweetestWins);
  const brix = roundBrix(band + bonus);
  return { brix, quality: brix >= C.SUGAR_BRIX_MIN ? 'sugar' : 'normal' };
}

/**
 * Weight of a newly harvested Carolina Cross, in pounds.
 * @param roll - A random number from 0 to 1
 */
export function rollGiantWeight(upgrades: readonly EventUpgrade[], heaviestWins: number, roll: number): number {
  const base = C.GIANT_MIN_WEIGHT + roll * C.GIANT_WEIGHT_RANGE;
  const pruning = 1 + upgradeLevel(upgrades, 'vine_pruning') * C.VINE_PRUNING_PER_LEVEL;
  return Math.round(base * pruning * (1 + championWeightBonus(heaviestWins)));
}

/**
 * Distance of one spit, in whole feet: 10 to 30, plus 2 a level of Spitting Practice.
 * @param roll - A random number from 0 to 1
 */
export function rollSpit(upgrades: readonly EventUpgrade[], roll: number): number {
  return Math.round(C.SPIT_MIN + roll * C.SPIT_RANGE + upgradeLevel(upgrades, 'spitting_practice') * C.PRACTICE_FEET);
}

// ============================================================================
// PRICES
// ============================================================================

/** The Heatwave multiplier for a finish: cold ones sell for more in the heat */
function heatMultiplier(cold: boolean, heatwave: boolean): number {
  return cold && heatwave ? 1 + C.HEATWAVE_COLD_BONUS : 1;
}

/**
 * Tickets for one melon of this inventory key, before the bonuses that apply to
 * the whole sale.
 */
export function getMelonPrice(
  key: string,
  upgrades: readonly EventUpgrade[],
  demandMultiplier: number,
  heatwave = false
): number {
  const { variety, quality, finish } = parseMelonKey(key);
  const baseValue = (MELON_VARIETIES[variety] ?? MELON_VARIETIES.sugarBaby).baseValue;
  const qualityMultiplier = (MELON_QUALITY_MULTIPLIERS[quality] ?? 1) * (1 + (quality === 'sugar' ? ownedBonus(upgrades, 'tasting_table') : 0));
  const finishMultiplier = MELON_FINISH_MULTIPLIERS[finish] ?? 1;
  const finishBonus = MELON_FINISH_BONUSES[finish] ?? 0;
  // Fancy Carving raises Carved melons and Picnic Baskets, Gingham Cloth raises Picnic Baskets;
  // the bonuses add together
  const upgradeMultiplier = 1
    + (finish === 'carved' || finish === 'basket' ? ownedBonus(upgrades, 'fancy_carving') : 0)
    + (finish === 'basket' ? ownedBonus(upgrades, 'gingham_cloth') : 0);

  // A chill or a carving then adds its flat Tickets, and the heat raises cold ones whole
  const price = floorTickets(baseValue * qualityMultiplier * finishMultiplier * demandMultiplier * upgradeMultiplier) + finishBonus;
  return floorTickets(price * heatMultiplier(COLD_FINISHES.includes(finish), heatwave));
}

/** Multiplier on all Tickets from melon sales, from Summer Bunting */
export function getSaleMultiplier(upgrades: readonly EventUpgrade[]): number {
  return 1 + ownedBonus(upgrades, 'summer_bunting');
}

/** Tickets from selling this many melons of one key, Dunk Tank tips excluded */
export function getMelonSaleTickets(
  key: string,
  quantity: number,
  upgrades: readonly EventUpgrade[],
  demandMultiplier: number,
  heatwave = false
): number {
  return floorTickets(getMelonPrice(key, upgrades, demandMultiplier, heatwave) * quantity * getSaleMultiplier(upgrades));
}

/** Tickets for one Carolina Cross, by weight, before Summer Bunting */
export function getGiantPrice(weight: number, demandMultiplier: number): number {
  return floorTickets(weight / C.POUNDS_PER_TICKET * demandMultiplier);
}

/** Tickets for selling one Carolina Cross, Summer Bunting included */
export function getGiantSaleTickets(weight: number, upgrades: readonly EventUpgrade[], demandMultiplier: number): number {
  return floorTickets(getGiantPrice(weight, demandMultiplier) * getSaleMultiplier(upgrades));
}

/** Tickets for one of a good, at its fixed price; cold ones sell for more in the heat */
export function getGoodPrice(good: SummerGood, heatwave = false): number {
  return C.GOOD_PRICES[good] * heatMultiplier(COLD_GOODS.includes(good), heatwave);
}

/** Tickets for this many of a good */
export function getGoodSaleTickets(good: SummerGood, quantity: number, heatwave = false): number {
  return floorTickets(getGoodPrice(good, heatwave) * quantity);
}

// ============================================================================
// LABELS
// ============================================================================

/** A count of melons in words: "5 Sugar Babies", "1 Chilled Crimson Sweet", "3 Sugar Baby Picnic Baskets" */
export function melonLabel(variety: MelonVariety, finish: MelonFinish, count: number): string {
  const melon = MELON_VARIETIES[variety];
  const one = count === 1;
  if (finish === 'plain') return `${count} ${one ? melon.name : melon.plural}`;
  if (finish === 'basket') return `${count} ${melon.name} ${MELON_FINISH_NAMES.basket}${one ? '' : 's'}`;
  return `${count} ${MELON_FINISH_NAMES[finish]} ${one ? melon.name : melon.plural}`;
}

/** A count of a good in words: "4 Snow Cones", "1 jar of Pickled Rinds" */
export function goodLabel(good: SummerGood, count: number): string {
  return `${count} ${count === 1 ? SUMMER_GOOD_SINGULAR[good] : SUMMER_GOOD_NAMES[good]}`;
}

/** What the Picnic Crew is doing, for the crew bar: Mix Agua Fresca, Pack a Picnic Basket */
export function describeCrewAction(action: PicnicCrewAction): string {
  switch (action.type) {
    case 'craft': return SUMMER_RECIPES.find(recipe => recipe.id === action.recipeId)?.action ?? 'Craft';
    case 'finish': return action.finish === 'basket' ? 'Pack a Picnic Basket' : 'Finish a melon';
  }
}

// ============================================================================
// ARCHIE
// ============================================================================

/**
 * Tickets Archie finds during the Summer Festival: 10 to 500, growing with melons
 * sold, with the same streak bonus as his money reward. The Candy Corn rule.
 */
export const archieTicketsReward: (melonsSold: number, streak: number) => number = archieCandyCornReward;
