import type { CanningAutoPurchase } from '../types/canning';

/**
 * Pre-configured auto-purchaser definitions for the canning system.
 * Each auto-purchaser automatically purchases a specific canning upgrade on a timer cycle.
 */
export const CANNING_AUTO_PURCHASERS: CanningAutoPurchase[] = [
  {
    id: 'canning_engineer',
    name: 'Canning Engineer',
    upgradeId: 'canning_speed',
    cycleDays: 10, // Longer cycle for more expensive upgrades
    owned: false,
    active: false,
    cost: 2500,
    timer: 0,
    costCurrency: 'money'
  },
  {
    id: 'preservation_specialist',
    name: 'Preservation Specialist',
    upgradeId: 'canning_efficiency',
    cycleDays: 10,
    owned: false,
    active: false,
    cost: 3000,
    timer: 0,
    costCurrency: 'knowledge'
  },
  {
    id: 'quality_inspector',
    name: 'Quality Inspector',
    upgradeId: 'preservation_mastery',
    cycleDays: 12,
    owned: false,
    active: false,
    cost: 4000,
    timer: 0,
    costCurrency: 'knowledge'
  },
  {
    id: 'factory_manager',
    name: 'Factory Manager',
    upgradeId: 'simultaneous_processing',
    cycleDays: 15, // Longest cycle for most expensive upgrade
    owned: false,
    active: false,
    cost: 7500,
    timer: 0,
    costCurrency: 'money'
  }
];

/**
 * Configuration for the auto-canning system that automatically starts canning processes.
 * Controls which recipes to make, priority order, and resource management.
 */
export interface AutoCanningConfig {
  /** Whether auto-canning is enabled */
  enabled: boolean;
  /** Recipe IDs that should be auto-made */
  selectedRecipes: string[];
  /** Order to attempt recipes (higher priority first) */
  priorityOrder: string[];
  /** Only use vegetables above the excess threshold */
  onlyUseExcess: boolean;
  /** How many vegetables to keep in reserve when using excess mode */
  excessThreshold: number;
  /** Pause auto-canning when max simultaneous processes are reached */
  pauseWhenFull: boolean;
}

/**
 * Default configuration for auto-canning system.
 * Safe defaults that won't consume player resources unexpectedly.
 */
export const DEFAULT_AUTO_CANNING_CONFIG: AutoCanningConfig = {
  enabled: false,
  selectedRecipes: [],
  priorityOrder: [],
  onlyUseExcess: true,
  excessThreshold: 10, // Keep 10 of each vegetable
  pauseWhenFull: true
};

/**
 * Checks if player can afford to purchase an auto-purchaser
 * @param autoPurchaser - The auto-purchaser to check affordability for
 * @param money - Current money amount
 * @param knowledge - Current knowledge amount
 * @returns True if the player has enough of the required currency
 */
export function canAffordAutoPurchaser(
  autoPurchaser: CanningAutoPurchase,
  money: number,
  knowledge: number
): boolean {
  const currency = autoPurchaser.costCurrency === 'money' ? money : knowledge;
  return currency >= autoPurchaser.cost;
}

/**
 * Determines if an auto-purchaser should attempt to purchase its associated upgrade
 * @param autoPurchaser - The auto-purchaser to check
 * @param upgrade - The canning upgrade to potentially purchase
 * @param money - Current money amount
 * @param knowledge - Current knowledge amount
 * @returns True if the auto-purchaser should make the purchase
 */
export function shouldPurchaseUpgrade(
  autoPurchaser: CanningAutoPurchase,
  upgrade: any, // CanningUpgrade type
  money: number,
  knowledge: number
): boolean {
  if (!autoPurchaser.owned || !autoPurchaser.active) {
    return false;
  }
  
  // Check if upgrade is at max level
  if (upgrade.maxLevel && upgrade.level >= upgrade.maxLevel) {
    return false;
  }
  
  // Check if can afford the upgrade
  const currency = upgrade.costCurrency === 'money' ? money : knowledge;
  return currency >= upgrade.cost;
}

/**
 * Selects the best recipe to auto-make based on configuration and available resources.
 * Considers priority order, ingredient availability, and profit margins.
 * @param availableRecipes - Array of recipes that can potentially be made
 * @param veggies - Current vegetable stash data
 * @param config - Auto-canning configuration
 * @returns Recipe ID to make, or null if no eligible recipes
 */
export function selectBestRecipe(
  availableRecipes: any[], // Recipe[] type
  veggies: Array<{name: string, stash: number, salePrice: number}>,
  config: AutoCanningConfig
): string | null {
  if (!config.enabled || availableRecipes.length === 0) {
    return null;
  }
  
  // Filter recipes based on configuration
  let eligibleRecipes = availableRecipes.filter(recipe => {
    // Must be in selected recipes list
    if (config.selectedRecipes.length > 0 && !config.selectedRecipes.includes(recipe.id)) {
      return false;
    }
    
    // Check if we have enough ingredients (accounting for excess threshold)
    if (config.onlyUseExcess) {
      return recipe.ingredients.every((ingredient: any) => {
        const veggie = veggies.find(v => v.name === ingredient.veggieName);
        if (!veggie) return false;
        return veggie.stash >= ingredient.quantity + config.excessThreshold;
      });
    } else {
      return recipe.ingredients.every((ingredient: any) => {
        const veggie = veggies.find(v => v.name === ingredient.veggieName);
        if (!veggie) return false;
        return veggie.stash >= ingredient.quantity;
      });
    }
  });
  
  if (eligibleRecipes.length === 0) {
    return null;
  }
  
  // Sort by priority order if specified
  if (config.priorityOrder.length > 0) {
    eligibleRecipes.sort((a, b) => {
      const priorityA = config.priorityOrder.indexOf(a.id);
      const priorityB = config.priorityOrder.indexOf(b.id);
      
      // If both have priority, sort by priority order
      if (priorityA !== -1 && priorityB !== -1) {
        return priorityA - priorityB;
      }
      
      // If only one has priority, it goes first
      if (priorityA !== -1) return -1;
      if (priorityB !== -1) return 1;
      
      // If neither has priority, sort by profit
      const profitA = calculateRecipeProfit(a, veggies);
      const profitB = calculateRecipeProfit(b, veggies);
      return profitB - profitA;
    });
  } else {
    // Sort by profit (highest first)
    eligibleRecipes.sort((a, b) => {
      const profitA = calculateRecipeProfit(a, veggies);
      const profitB = calculateRecipeProfit(b, veggies);
      return profitB - profitA;
    });
  }
  
  return eligibleRecipes[0].id;
}

/**
 * Calculates profit for a recipe (sale price minus raw ingredient value)
 * @param recipe - The recipe to calculate profit for
 * @param veggies - Current vegetable data with sale prices
 * @returns The profit amount (can be negative if recipe loses money)
 */
function calculateRecipeProfit(recipe: any, veggies: Array<{name: string, stash: number, salePrice: number}>): number {
  const rawValue = recipe.ingredients.reduce((total: number, ingredient: any) => {
    const veggie = veggies.find(v => v.name === ingredient.veggieName);
    return total + (veggie?.salePrice || 0) * ingredient.quantity;
  }, 0);
  
  return recipe.salePrice - rawValue;
}

/**
 * Updates timers for all owned and active auto-purchasers
 * @param autoPurchasers - Array of auto-purchaser configurations
 * @param daysPassed - Number of days that have passed
 * @returns Updated array with incremented timers
 */
export function updateAutoPurchaserTimers(
  autoPurchasers: CanningAutoPurchase[],
  daysPassed: number
): CanningAutoPurchase[] {
  return autoPurchasers.map(ap => ({
    ...ap,
    timer: ap.owned && ap.active ? ap.timer + daysPassed : ap.timer
  }));
}

/**
 * Processes auto-purchase attempts for all eligible auto-purchasers.
 * Attempts to purchase upgrades when timers are ready and resources are available.
 * @param autoPurchasers - Array of auto-purchaser configurations
 * @param upgrades - Array of available canning upgrades
 * @param money - Current money amount
 * @param knowledge - Current knowledge amount
 * @param onPurchaseUpgrade - Callback function to execute the upgrade purchase
 * @returns Updated array with reset timers for successful purchases
 */
export function processAutoPurchases(
  autoPurchasers: CanningAutoPurchase[],
  upgrades: any[], // CanningUpgrade[] type
  money: number,
  knowledge: number,
  onPurchaseUpgrade: (upgradeId: string) => boolean
): CanningAutoPurchase[] {
  return autoPurchasers.map(ap => {
    if (!ap.owned || !ap.active || ap.timer < ap.cycleDays) {
      return ap;
    }
    
    // Find the corresponding upgrade
    const upgrade = upgrades.find(u => u.id === ap.upgradeId);
    if (!upgrade) {
      return ap;
    }
    
    // Try to purchase the upgrade
    if (shouldPurchaseUpgrade(ap, upgrade, money, knowledge)) {
      const success = onPurchaseUpgrade(ap.upgradeId);
      if (success) {
        // Reset timer
        return { ...ap, timer: 0 };
      }
    }
    
    return ap;
  });
}