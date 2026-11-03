/**
 * Christmas tree sale prices.
 *
 * The sell buttons, Sell All and the shopfront price cards all price trees here,
 * so what a card shows is what a sale pays.
 */
import { TREE_DEFINITIONS, QUALITY_MULTIPLIERS, DECORATION_MULTIPLIERS } from '../data/christmasEventData';
import type { EventUpgrade, TreeQuality, TreeType } from '../types/christmasEvent';

/** The parts of a tree inventory key, written as treeType_quality_decoration */
export interface TreeKeyParts {
  treeType: string;
  quality: string;
  decoration: string;
}

export function parseTreeKey(treeKey: string): TreeKeyParts {
  const [treeType = '', quality = 'normal', ...rest] = treeKey.split('_');
  return { treeType, quality, decoration: rest.join('_') || 'plain' };
}

/**
 * Rounds cheer down, allowing for floating-point error so that 20 × 1.15
 * gives 23 rather than 22.
 */
export function floorCheer(value: number): number {
  return Math.floor(value + 1e-9);
}

/** Value bonus of an owned upgrade, or 0 */
function ownedBonus(upgrades: readonly EventUpgrade[], id: string): number {
  const upgrade = upgrades.find(u => u.id === id);
  return upgrade?.owned ? upgrade.valueBonus ?? 0 : 0;
}

/**
 * Holiday Cheer for one tree of this inventory key, before the bonuses that apply
 * to the whole sale.
 */
export function getTreePrice(
  treeKey: string,
  upgrades: readonly EventUpgrade[],
  demandMultiplier: number
): number {
  const { treeType, quality, decoration } = parseTreeKey(treeKey);
  const basePrice = (TREE_DEFINITIONS[treeType as TreeType] ?? TREE_DEFINITIONS.pine).baseValue;
  const qualityMultiplier = QUALITY_MULTIPLIERS[quality as TreeQuality] ?? 1;
  // The Star Forge replaces the luxury multiplier with its own
  const starForge = upgrades.find(u => u.id === 'star_forge');
  const decorationMultiplier = decoration === 'luxury' && starForge?.owned
    ? starForge.multiplier ?? DECORATION_MULTIPLIERS.luxury
    : DECORATION_MULTIPLIERS[decoration] ?? 1;
  // Fireplace Display raises the value of luxury trees
  const upgradeMultiplier = decoration === 'luxury' ? 1 + ownedBonus(upgrades, 'fireplace_display') : 1;

  return floorCheer(basePrice * qualityMultiplier * decorationMultiplier * demandMultiplier * upgradeMultiplier);
}

/** Trees of a type with this decoration in the inventory, any quality */
export function countTrees(inventory: Readonly<Record<string, number>>, treeType: string, decoration: string): number {
  let count = 0;
  for (const [key, quantity] of Object.entries(inventory)) {
    const parts = parseTreeKey(key);
    if (parts.treeType === treeType && parts.decoration === decoration) count += quantity;
  }
  return count;
}

/** Whether an upgrade has been bought */
export function ownsUpgrade(upgrades: readonly EventUpgrade[], id: string): boolean {
  return upgrades.some(u => u.id === id && u.owned);
}

/** Level of a repeatable upgrade, or 0 */
function upgradeLevel(upgrades: readonly EventUpgrade[], id: string): number {
  return upgrades.find(u => u.id === id)?.level ?? 0;
}

/** Tree growth per game day: 1, plus 15% for each level of Fertilized Soil */
export function treeGrowthSpeed(upgrades: readonly EventUpgrade[]): number {
  return 1 + upgradeLevel(upgrades, 'fertilized_soil') * 0.15;
}

/** Jobs the Elves do each second: 1, plus one for each level of Cheerful Crafting */
export function elvesJobsPerSecond(upgrades: readonly EventUpgrade[]): number {
  return 1 + upgradeLevel(upgrades, 'cheerful_crafting');
}

/** Multiplier on all Holiday Cheer from tree sales, from Garland Borders */
export function getSaleCheerMultiplier(upgrades: readonly EventUpgrade[]): number {
  return 1 + ownedBonus(upgrades, 'garland_borders');
}

/** Holiday Cheer from selling this many trees of one key, Magical Register tips excluded */
export function getTreeSaleCheer(
  treeKey: string,
  quantity: number,
  upgrades: readonly EventUpgrade[],
  demandMultiplier: number
): number {
  return floorCheer(getTreePrice(treeKey, upgrades, demandMultiplier) * quantity * getSaleCheerMultiplier(upgrades));
}

/** Holiday Cheer from Sell All, priced the way sellAllTrees prices it (tips excluded) */
export function inventorySaleCheer(
  inventory: Readonly<Record<string, number>>,
  upgrades: readonly EventUpgrade[],
  demandMultiplier: number
): number {
  let value = 0;
  for (const [key, quantity] of Object.entries(inventory)) {
    if (quantity > 0) value += getTreePrice(key, upgrades, demandMultiplier) * quantity;
  }
  return floorCheer(value * getSaleCheerMultiplier(upgrades));
}

/** Chance per tree that the Magical Register adds a tip */
export const REGISTER_TIP_CHANCE = 0.10;

/**
 * Magical Register tips for selling `quantity` trees worth `treePrice` each.
 * Each tree has a 10% chance of a 20 to 50% tip. Uses two rolls per tree.
 */
export function rollRegisterTips(treePrice: number, quantity: number, random: () => number): number {
  let tips = 0;
  for (let i = 0; i < quantity; i++) {
    const chance = random();
    const size = random();
    if (chance < REGISTER_TIP_CHANCE) {
      tips += floorCheer(treePrice * (0.20 + size * 0.30));
    }
  }
  return tips;
}
