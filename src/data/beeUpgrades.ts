/**
 * Bee System Upgrades Data
 * 
 * Defines all available bee upgrades for the bee system.
 * Upgrades are categorized by type and include both one-time and repeatable purchases.
 */

import type { BeeUpgrade } from '../types/bees';

/**
 * Initial bee upgrades available to players
 * Organized by category: Production, Quality, Yield, Automation
 */
export const INITIAL_BEE_UPGRADES: Omit<BeeUpgrade, 'purchased' | 'level' | 'effect'>[] = [
  // ===== PRODUCTION UPGRADES =====
  // These upgrades speed up honey production
  
  {
    id: 'busy_bees',
    name: 'Busy Bees',
    description: 'Your bees work faster! Reduces honey production time by 1% per level.',
    category: 'production',
    icon: '🐝',
    cost: 75, // 5 * 15
    baseCost: 75,
    costScaling: 1.15, // Moderate scaling for repeatable upgrade
    costCurrency: 'regularHoney',
    effectType: 'productionSpeed',
    effectValue: 0.01, // 1% per level
    repeatable: true,
    maxLevel: 50,
    unlocked: true, // Available from start
  },
  
  // ===== QUALITY UPGRADES =====
  // These upgrades enable Golden Honey production
  
  {
    id: 'royal_jelly',
    name: 'Royal Jelly',
    description: 'Feed your bees royal jelly to unlock a 5% chance to produce Golden Honey.',
    category: 'quality',
    icon: '✨',
    cost: 375, // 25 * 15
    baseCost: 375,
    costCurrency: 'regularHoney',
    effectType: 'goldenHoneyChance',
    effectValue: 0.05, // 5% chance
    repeatable: false,
    unlocked: true,
  },
  
  {
    id: 'queens_blessing',
    name: "Queen's Blessing",
    description: 'The queen bee blesses your hive! Doubles your Golden Honey chance.',
    category: 'quality',
    icon: '👑',
    cost: 150, // 10 * 15
    baseCost: 150,
    costCurrency: 'goldenHoney',
    effectType: 'goldenHoneyDouble',
    effectValue: 2.0, // 2x multiplier
    repeatable: false,
    unlocked: false,
    requiredUpgrades: ['royal_jelly'], // Must have Royal Jelly first
  },
  
  // ===== PRODUCTION AMOUNT UPGRADES =====
  // These upgrades increase honey yield per harvest
  
  {
    id: 'hexcomb_engineering',
    name: 'Hexcombs Trays',
    description: 'Optimize your hive structure! Increases honey production by 5% per level.',
    category: 'production',
    icon: '🏗️',
    cost: 120, // 8 * 15
    baseCost: 120,
    costScaling: 1.2, // Slightly higher scaling
    costCurrency: 'regularHoney',
    effectType: 'honeyProduction',
    effectValue: 0.05, // 5% per level
    repeatable: true,
    maxLevel: 20,
    unlocked: true,
  },
  
  // ===== CROP YIELD UPGRADES =====
  // These upgrades boost crop yields from farming
  
  {
    id: 'meadow_magic',
    name: 'Meadow Magic',
    description: 'Bee pollination boosts your crops! Increases crop yield bonus by +0.5% per box per level.',
    category: 'yield',
    icon: '🌻',
    cost: 225, // 15 * 15
    baseCost: 225,
    costScaling: 1.25, // Higher cost for powerful effect
    costCurrency: 'regularHoney',
    effectType: 'cropYieldBonus',
    effectValue: 0.005, // +0.5% per box per level
    repeatable: true,
    maxLevel: 9,
    unlocked: true,
  },
  
  // ===== ADVANCED UPGRADES =====
  // These unlock at higher progression levels
  
  {
    id: 'winter_hardiness',
    name: 'Winter Hardiness',
    description: 'Your bees produce honey even in winter! No production penalty during winter months.',
    category: 'production',
    icon: '❄️',
    cost: 45, // 3 * 15
    baseCost: 45,
    costCurrency: 'goldenHoney',
    effectType: 'productionSpeed',
    effectValue: 0, // Special effect handled separately
    repeatable: false,
    unlocked: false,
    requiredBoxes: 10, // Unlock after having 10 boxes
  },
  
  {
    id: 'golden_touch',
    name: 'Golden Touch',
    description: 'Master beekeeper technique! +2% Golden Honey chance (stacks with other bonuses).',
    category: 'quality',
    icon: '✨',
    cost: 75, // 5 * 15
    baseCost: 75,
    costCurrency: 'goldenHoney',
    effectType: 'goldenHoneyChance',
    effectValue: 0.02, // Additional 2% chance
    repeatable: false,
    unlocked: false,
    requiredUpgrades: ['royal_jelly', 'queens_blessing'],
    requiredBoxes: 15,
  },
  
  {
    id: 'hive_expansion',
    name: 'Hive Expansion',
    description: 'Expand your apiary! Increases maximum bee boxes to 75.',
    category: 'automation',
    icon: '📦',
    cost: 1500, // 100 * 15
    baseCost: 1500,
    costCurrency: 'regularHoney',
    effectType: 'productionSpeed',
    effectValue: 0, // Special effect - increases max boxes
    repeatable: false,
    unlocked: false,
    requiredBoxes: 50, // Only available when at max boxes
  },
  
  {
    id: 'nectar_efficiency',
    name: 'Nectar Efficiency',
    description: 'Your bees extract more honey from nectar! +10% honey production.',
    category: 'production',
    icon: '🌺',
    cost: 30, // 2 * 15
    baseCost: 30,
    costCurrency: 'goldenHoney',
    effectType: 'honeyProduction',
    effectValue: 0.1, // 10% bonus
    repeatable: false,
    unlocked: false,
    requiredBoxes: 20,
  },
  
  {
    id: 'flower_power',
    name: 'Flower Power',
    description: 'Plant wildflowers around your farm! +0.2% crop yield per box.',
    category: 'yield',
    icon: '🌼',
    cost: 120, // 8 * 15
    baseCost: 120,
    costCurrency: 'goldenHoney',
    effectType: 'cropYieldBonus',
    effectValue: 0.002, // +0.2% per box
    repeatable: false,
    unlocked: false,
    requiredUpgrades: ['meadow_magic'],
    requiredBoxes: 25,
  },
  
  {
    id: 'swift_gatherers',
    name: 'Swift Gatherers',
    description: 'Train your bees to gather nectar faster! -15% production time.',
    category: 'production',
    icon: '⚡',
    cost: 75, // 5 * 15
    baseCost: 75,
    costCurrency: 'goldenHoney',
    effectType: 'productionSpeed',
    effectValue: 0.15, // 15% speed boost
    repeatable: false,
    unlocked: false,
    requiredUpgrades: ['busy_bees'],
    requiredBoxes: 30,
  },
];

/**
 * Create a fresh set of bee upgrades with initial state
 * Used when initializing the bee system or resetting
 */
export function createInitialBeeUpgrades(): BeeUpgrade[] {
  return INITIAL_BEE_UPGRADES.map(upgrade => ({
    ...upgrade,
    purchased: false,
    level: 0,
    effect: 0,
  }));
}

/**
 * Get upgrade by ID
 */
export function getBeeUpgradeById(id: string): BeeUpgrade | undefined {
  const upgrade = INITIAL_BEE_UPGRADES.find(u => u.id === id);
  if (!upgrade) return undefined;
  
  return {
    ...upgrade,
    purchased: false,
    level: 0,
    effect: 0,
  };
}

/**
 * Get upgrades by category
 */
export function getBeeUpgradesByCategory(category: BeeUpgrade['category']): BeeUpgrade[] {
  return INITIAL_BEE_UPGRADES
    .filter(u => u.category === category)
    .map(upgrade => ({
      ...upgrade,
      purchased: false,
      level: 0,
      effect: 0,
    }));
}

/**
 * Calculate total cost for a repeatable upgrade to reach a target level
 */
export function calculateTotalUpgradeCost(
  baseCost: number,
  costScaling: number,
  fromLevel: number,
  toLevel: number
): number {
  let totalCost = 0;
  for (let level = fromLevel; level < toLevel; level++) {
    totalCost += Math.floor(baseCost * Math.pow(costScaling, level));
  }
  return totalCost;
}

/**
 * Get the next level cost for an upgrade
 */
export function getNextLevelCost(
  baseCost: number,
  costScaling: number | undefined,
  currentLevel: number
): number {
  if (!costScaling) return baseCost;
  return Math.floor(baseCost * Math.pow(costScaling, currentLevel + 1));
}

/**
 * Check if an upgrade is unlocked based on requirements
 */
export function isUpgradeUnlocked(
  upgrade: BeeUpgrade,
  currentBoxes: number,
  purchasedUpgrades: string[]
): boolean {
  // Check if explicitly locked
  if (!upgrade.unlocked) {
    // Check box requirements
    if (upgrade.requiredBoxes && currentBoxes < upgrade.requiredBoxes) {
      return false;
    }
    
    // Check required upgrades
    if (upgrade.requiredUpgrades && upgrade.requiredUpgrades.length > 0) {
      const hasAllRequired = upgrade.requiredUpgrades.every(reqId => 
        purchasedUpgrades.includes(reqId)
      );
      if (!hasAllRequired) {
        return false;
      }
    }
  }
  
  return upgrade.unlocked || (
    (!upgrade.requiredBoxes || currentBoxes >= upgrade.requiredBoxes) &&
    (!upgrade.requiredUpgrades || upgrade.requiredUpgrades.every(reqId => purchasedUpgrades.includes(reqId)))
  );
}

/**
 * Get display text for upgrade requirements
 */
export function getUpgradeRequirementText(upgrade: BeeUpgrade): string[] {
  const requirements: string[] = [];
  
  if (upgrade.requiredBoxes) {
    requirements.push(`Requires ${upgrade.requiredBoxes} bee boxes`);
  }
  
  if (upgrade.requiredUpgrades && upgrade.requiredUpgrades.length > 0) {
    const upgradeNames = upgrade.requiredUpgrades
      .map(id => INITIAL_BEE_UPGRADES.find(u => u.id === id)?.name)
      .filter(Boolean)
      .join(', ');
    requirements.push(`Requires: ${upgradeNames}`);
  }
  
  return requirements;
}

/**
 * Upgrade cost and effect summary for display
 */
export interface UpgradeSummary {
  id: string;
  name: string;
  description: string;
  currentCost: number;
  costCurrency: 'regularHoney' | 'goldenHoney';
  currentLevel: number;
  maxLevel?: number;
  isMaxLevel: boolean;
  canAfford: boolean;
  isUnlocked: boolean;
  requirements: string[];
}

/**
 * Get a complete summary of an upgrade for UI display
 */
export function getUpgradeSummary(
  upgrade: BeeUpgrade,
  regularHoney: number,
  goldenHoney: number,
  currentBoxes: number,
  purchasedUpgrades: string[]
): UpgradeSummary {
  const isUnlocked = isUpgradeUnlocked(upgrade, currentBoxes, purchasedUpgrades);
  const isMaxLevel = upgrade.repeatable && upgrade.maxLevel 
    ? upgrade.level >= upgrade.maxLevel 
    : upgrade.purchased;
  
  const currentHoney = upgrade.costCurrency === 'regularHoney' ? regularHoney : goldenHoney;
  const canAfford = currentHoney >= upgrade.cost && !isMaxLevel;
  
  return {
    id: upgrade.id,
    name: upgrade.name,
    description: upgrade.description,
    currentCost: upgrade.cost,
    costCurrency: upgrade.costCurrency,
    currentLevel: upgrade.level,
    maxLevel: upgrade.maxLevel,
    isMaxLevel,
    canAfford,
    isUnlocked,
    requirements: getUpgradeRequirementText(upgrade),
  };
}
