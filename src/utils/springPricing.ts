/**
 * Spring Farmer's Market prices and garden rates.
 *
 * The stall cards, the sell buttons, Sell All and Market Day all price bunches
 * here, so what a card shows is what a sale pays. Random rolls are passed in,
 * so the same rolls always give the same result.
 */
import {
  FLOWER_VARIETIES,
  FLOWER_FINISH_NAMES,
  HERBS,
  SPRING_GOOD_NAMES,
  SPRING_GOOD_SINGULAR,
  SPRING_RECIPES,
  FLOWER_QUALITY_MULTIPLIERS,
  FLOWER_FINISH_MULTIPLIERS,
  FLOWER_FINISH_BONUSES,
  SPRING_EVENT_CONSTANTS
} from '../data/springEventData';
import { floorCheer } from './christmasTreePricing';
import { archieCandyCornReward, ownsUpgrade, upgradeLevel } from './pumpkinPricing';
import type { EventUpgrade } from '../types/eventUpgrades';
import type {
  FlowerDecoration,
  FlowerFinish,
  FlowerQuality,
  FlowerVariety,
  GnomeCrewAction,
  SpringCart,
  SpringGood
} from '../types/springEvent';

export { ownsUpgrade, upgradeLevel };

/** Rounds Petals down, allowing for floating-point error */
export const floorPetals = floorCheer;

const C = SPRING_EVENT_CONSTANTS;

// ============================================================================
// INVENTORY KEYS
// ============================================================================

/** The parts of a bunch's inventory key, written as variety_quality_finish */
export interface FlowerKeyParts {
  variety: FlowerVariety;
  quality: FlowerQuality;
  finish: FlowerFinish;
}

export function flowerKey(variety: FlowerVariety, quality: FlowerQuality, finish: FlowerFinish): string {
  return `${variety}_${quality}_${finish}`;
}

export function parseFlowerKey(key: string): FlowerKeyParts {
  const [variety = 'tulip', quality = 'normal', finish = 'plain'] = key.split('_');
  return {
    variety: variety as FlowerVariety,
    quality: quality as FlowerQuality,
    finish: finish as FlowerFinish
  };
}

/** The finish a set of decorations gives: both make a Gift Bouquet */
export function flowerFinishFor(decorations: readonly FlowerDecoration[]): FlowerFinish {
  const arranged = decorations.includes('arrange');
  const scented = decorations.includes('scent');
  if (arranged && scented) return 'bouquet';
  if (scented) return 'scented';
  if (arranged) return 'arranged';
  return 'plain';
}

/** Bunches in an inventory or on the Cart */
export function countBunches(bunches: Record<string, number>): number {
  return Object.values(bunches).reduce((sum, quantity) => sum + quantity, 0);
}

// ============================================================================
// RATES
// ============================================================================

/** Value bonus of an owned upgrade, or 0 */
function ownedBonus(upgrades: readonly EventUpgrade[], id: string): number {
  const upgrade = upgrades.find(u => u.id === id);
  return upgrade?.owned ? upgrade.valueBonus ?? 0 : 0;
}

/** Bed growth per game day: 1, plus the Rain Barrel bonus for each level */
export function flowerGrowthSpeed(upgrades: readonly EventUpgrade[]): number {
  const barrel = upgrades.find(u => u.id === 'rain_barrel');
  return 1 + (barrel?.level ?? 0) * (barrel?.speedBonus ?? 0);
}

/** Herb growth per game day: 1, plus the Watering Can bonus for each level */
export function herbGrowthSpeed(upgrades: readonly EventUpgrade[]): number {
  const can = upgrades.find(u => u.id === 'watering_can');
  return 1 + (can?.level ?? 0) * (can?.speedBonus ?? 0);
}

/** Sprigs an herb slot holds before it waits to be gathered: 10, or 25 with the Trellis */
export function herbCap(upgrades: readonly EventUpgrade[]): number {
  return ownsUpgrade(upgrades, 'trellis') ? C.TRELLIS_CAP : C.HERB_CAP;
}

/** Sprigs each time an herb grows: 1, or 2 with the Second Row */
export function sprigsPerCycle(upgrades: readonly EventUpgrade[]): number {
  return ownsUpgrade(upgrades, 'second_row') ? C.SECOND_ROW_SPRIGS : C.SPRIGS_PER_CYCLE;
}

/** Gnome Crew jobs per second: 1, plus one per Busy Gnomes level */
export function gnomeJobsPerSecond(upgrades: readonly EventUpgrade[]): number {
  return 1 + upgradeLevel(upgrades, 'busy_gnomes');
}

/** Game days between Market Days: 60, or 40 with the Pony Cart */
export function marketDayInterval(upgrades: readonly EventUpgrade[]): number {
  return ownsUpgrade(upgrades, 'pony_cart') ? C.PONY_CART_INTERVAL : C.MARKET_DAY_INTERVAL;
}

// ============================================================================
// PRICES
// ============================================================================

/**
 * Petals for one bunch of this inventory key, before the bonuses that apply to
 * the whole sale.
 */
export function getFlowerPrice(
  key: string,
  upgrades: readonly EventUpgrade[],
  demandMultiplier: number
): number {
  const { variety, quality, finish } = parseFlowerKey(key);
  const baseValue = (FLOWER_VARIETIES[variety] ?? FLOWER_VARIETIES.tulip).baseValue;
  const qualityMultiplier = FLOWER_QUALITY_MULTIPLIERS[quality] ?? 1;
  const finishMultiplier = FLOWER_FINISH_MULTIPLIERS[finish] ?? 1;
  const finishBonus = FLOWER_FINISH_BONUSES[finish] ?? 0;
  // Florist's Touch raises Arranged bunches and Gift Bouquets, Silk Ribbons raises Gift Bouquets;
  // the bonuses add together
  const upgradeMultiplier = 1
    + (finish === 'arranged' || finish === 'bouquet' ? ownedBonus(upgrades, 'florists_touch') : 0)
    + (finish === 'bouquet' ? ownedBonus(upgrades, 'silk_ribbons') : 0);

  // An arrangement or a scent then adds its flat Petals
  return floorPetals(baseValue * qualityMultiplier * finishMultiplier * demandMultiplier * upgradeMultiplier) + finishBonus;
}

/** Multiplier on all Petals from flower sales, from Spring Bunting */
export function getSaleMultiplier(upgrades: readonly EventUpgrade[]): number {
  return 1 + ownedBonus(upgrades, 'spring_bunting');
}

/** Petals from selling this many bunches of one key at the stall, Regulars' tips excluded */
export function getFlowerSalePetals(
  key: string,
  quantity: number,
  upgrades: readonly EventUpgrade[],
  demandMultiplier: number
): number {
  return floorPetals(getFlowerPrice(key, upgrades, demandMultiplier) * quantity * getSaleMultiplier(upgrades));
}

/** Petals for this many of a good, at its fixed price */
export function getGoodSalePetals(good: SpringGood, quantity: number): number {
  return C.GOOD_PRICES[good] * quantity;
}

/**
 * Petals the Cart sells for on Market Day: the stall price of everything on it,
 * Spring Bunting on the bunches, then half again for the whole load.
 */
export function getCartPetals(
  cart: SpringCart,
  upgrades: readonly EventUpgrade[],
  demandMultiplier: number
): number {
  const bunches = Object.entries(cart.bunches)
    .reduce((sum, [key, quantity]) => sum + getFlowerPrice(key, upgrades, demandMultiplier) * quantity, 0);
  const goods = (Object.entries(cart.goods) as [SpringGood, number | undefined][])
    .reduce((sum, [good, quantity]) => sum + getGoodSalePetals(good, quantity ?? 0), 0);
  return floorPetals((bunches * getSaleMultiplier(upgrades) + goods) * (1 + C.MARKET_DAY_BONUS));
}

// ============================================================================
// LABELS
// ============================================================================

/** A count of bunches in words: "5 Tulips", "1 Arranged Daffodil", "3 Rose Gift Bouquets" */
export function bunchLabel(variety: FlowerVariety, finish: FlowerFinish, count: number): string {
  const flower = FLOWER_VARIETIES[variety];
  const one = count === 1;
  if (finish === 'plain') return `${count} ${one ? flower.name : flower.plural}`;
  if (finish === 'bouquet') return `${count} ${flower.name} ${FLOWER_FINISH_NAMES.bouquet}${one ? '' : 's'}`;
  return `${count} ${FLOWER_FINISH_NAMES[finish]} ${one ? flower.name : flower.plural}`;
}

/** A count of a good in words: "4 Mint Tea", "1 Seed Packet" */
export function goodLabel(good: SpringGood, count: number): string {
  return `${count} ${count === 1 ? SPRING_GOOD_SINGULAR[good] : SPRING_GOOD_NAMES[good]}`;
}

/** What the Gnome Crew is doing, for the crew bars: Gather Mint, Steep Mint Tea, Tie a Gift Bouquet */
export function describeCrewAction(action: GnomeCrewAction): string {
  switch (action.type) {
    case 'gather': return `Gather ${HERBS[action.herb].name}`;
    case 'craft': return SPRING_RECIPES.find(recipe => recipe.id === action.recipeId)?.action ?? 'Craft';
    case 'finish': return action.finish === 'bouquet' ? 'Tie a Gift Bouquet' : 'Finish a bunch';
    case 'load': return 'Load the Cart';
  }
}

// ============================================================================
// ARCHIE
// ============================================================================

/**
 * Petals Archie finds during the Spring Market: 10 to 500, growing with
 * bunches sold, with the same streak bonus as his money reward. The Candy Corn rule.
 */
export const archiePetalsReward: (flowersSold: number, streak: number) => number = archieCandyCornReward;
