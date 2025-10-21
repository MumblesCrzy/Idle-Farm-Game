import type { CanningAutoPurchase } from '../types/canning';

// Auto-purchaser configurations for canning system
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

// Auto-canning system that automatically starts canning processes
export interface AutoCanningConfig {
  enabled: boolean;
  selectedRecipes: string[]; // Recipe IDs to auto-make
  priorityOrder: string[]; // Order to attempt recipes
  onlyUseExcess: boolean; // Only use vegetables above a certain threshold
  excessThreshold: number; // How many vegetables to keep in reserve
  pauseWhenFull: boolean; // Pause when max processes reached
}

export const DEFAULT_AUTO_CANNING_CONFIG: AutoCanningConfig = {
  enabled: false,
  selectedRecipes: [],
  priorityOrder: [],
  onlyUseExcess: true,
  excessThreshold: 10, // Keep 10 of each vegetable
  pauseWhenFull: true
};

// Helper functions for auto-purchaser logic
export function canAffordAutoPurchaser(
  autoPurchaser: CanningAutoPurchase,
  money: number,
  knowledge: number
): boolean {
  const currency = autoPurchaser.costCurrency === 'money' ? money : knowledge;
  return currency >= autoPurchaser.cost;
}

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

// Auto-canning recipe selection logic
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

function calculateRecipeProfit(recipe: any, veggies: Array<{name: string, stash: number, salePrice: number}>): number {
  const rawValue = recipe.ingredients.reduce((total: number, ingredient: any) => {
    const veggie = veggies.find(v => v.name === ingredient.veggieName);
    return total + (veggie?.salePrice || 0) * ingredient.quantity;
  }, 0);
  
  return recipe.salePrice - rawValue;
}

// Timer management for auto-purchasers
export function updateAutoPurchaserTimers(
  autoPurchasers: CanningAutoPurchase[],
  daysPassed: number
): CanningAutoPurchase[] {
  return autoPurchasers.map(ap => ({
    ...ap,
    timer: ap.owned && ap.active ? ap.timer + daysPassed : ap.timer
  }));
}

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