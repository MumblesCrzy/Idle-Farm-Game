import type { CanningState, LeanCanningProgress } from '../types/canning';
import { INITIAL_RECIPES } from '../data/recipes';
import { DEFAULT_AUTO_CANNING_CONFIG } from '../utils/canningAutoPurchase';

// Convert full CanningState to lean progress format
export function canningStateToLeanProgress(canningState: CanningState): LeanCanningProgress {
  const upgradeProgress: Record<string, number> = {};
  canningState.upgrades.forEach(upgrade => {
    upgradeProgress[upgrade.id] = upgrade.level;
  });

  const recipeCompletions: Record<string, number> = {};
  canningState.recipes.forEach(recipe => {
    if (recipe.timesCompleted > 0) {
      recipeCompletions[recipe.id] = recipe.timesCompleted;
    }
  });

  return {
    upgradeProgress,
    unlockedRecipes: canningState.unlockedRecipes,
    recipeCompletions,
    activeProcesses: canningState.activeProcesses.map(process => ({
      recipeId: process.recipeId,
      startTime: process.startTime,
      remainingTime: process.remainingTime,
      totalTime: process.totalTime,
      automated: process.automated
    })),
    totalItemsCanned: canningState.totalItemsCanned,
    canningExperience: canningState.canningExperience,
    maxSimultaneousProcesses: canningState.maxSimultaneousProcesses,
    autoCanning: canningState.autoCanning
  };
}

// Convert lean progress back to full CanningState using current game constants
export function leanProgressToCanningState(progress: LeanCanningProgress, veggies: any[], experience: number): CanningState {
  // Define upgrades locally to avoid circular dependency
  const INITIAL_CANNING_UPGRADES = [
    {
      id: 'canning_speed',
      name: 'Quick Hands',
      description: 'Reduces canning time by 5% per level',
      type: 'speed' as const,
      level: 0,
      cost: 100,
      baseCost: 100,
      costCurrency: 'money' as const,
      effect: 1.0,
      unlocked: true
    },
    {
      id: 'canning_efficiency',
      name: 'Family Recipe',
      description: 'Increases canned product sale price by 10% per level',
      type: 'efficiency' as const,
      level: 0,
      cost: 150,
      baseCost: 150,
      costCurrency: 'knowledge' as const,
      effect: 1.0,
      unlocked: true
    },
    {
      id: 'preservation_mastery',
      name: 'Heirloom Touch',
      description: 'Chance to get bonus canned products',
      type: 'quality' as const,
      level: 0,
      cost: 200,
      baseCost: 200,
      costCurrency: 'knowledge' as const,
      effect: 0,
      unlocked: true
    },
    {
      id: 'simultaneous_processing',
      name: 'Batch Canning',
      description: 'Allows more canning processes to run at once',
      type: 'automation' as const,
      level: 0,
      cost: 500,
      baseCost: 500,
      costCurrency: 'money' as const,
      maxLevel: 14,
      effect: 1,
      unlocked: true
    },
    {
      id: 'canner',
      name: 'Canner',
      description: 'Automatically starts canning processes every 10 seconds (gives reduced knowledge)',
      type: 'automation' as const,
      level: 0,
      cost: 5000,
      baseCost: 5000,
      costCurrency: 'knowledge' as const,
      maxLevel: 1,
      effect: 0,
      unlocked: true
    }
  ];
  
  // Apply saved upgrade levels to fresh upgrade definitions
  const upgrades = INITIAL_CANNING_UPGRADES.map(upgrade => {
    const savedLevel = progress.upgradeProgress[upgrade.id] || 0;
    let updatedUpgrade = { ...upgrade, level: savedLevel };
    
    // Recalculate cost and effect based on level
    updatedUpgrade.cost = Math.ceil(updatedUpgrade.baseCost * Math.pow(1.5, savedLevel));
    
    // Recalculate effect based on type and level
    switch (updatedUpgrade.type) {
      case 'speed':
        updatedUpgrade.effect = Math.max(0.1, 1 - (savedLevel * 0.05));
        break;
      case 'efficiency':
        updatedUpgrade.effect = 1 + (savedLevel * 0.10);
        break;
      case 'quality':
        updatedUpgrade.effect = savedLevel * 5;
        break;
      case 'automation':
        updatedUpgrade.effect = savedLevel;
        break;
    }
    
    return updatedUpgrade;
  });

  // Build recipes from current game constants
  const recipes = INITIAL_RECIPES.map(config => {
    const ingredients = config.ingredients.map(ing => {
      const veggieIndex = veggies.findIndex(v => v.name === ing.veggieName);
      return {
        veggieIndex,
        veggieName: ing.veggieName,
        quantity: ing.quantity
      };
    });
    
    const isFirstRecipe = config.id === 'canned_radish';
    const unlocked = isFirstRecipe 
      ? experience >= config.experienceRequired
      : progress.canningExperience >= config.experienceRequired;
    
    return {
      id: config.id,
      name: config.name,
      description: config.description,
      ingredients,
      processingTime: config.baseProcessingTime,
      baseProcessingTime: config.baseProcessingTime,
      salePrice: config.baseSalePrice,
      baseSalePrice: config.baseSalePrice,
      experienceRequired: config.experienceRequired,
      unlocked,
      timesCompleted: progress.recipeCompletions[config.id] || 0
    };
  });

  return {
    recipes,
    unlockedRecipes: progress.unlockedRecipes,
    activeProcesses: progress.activeProcesses.map(process => ({
      ...process,
      completed: process.remainingTime <= 0
    })),
    maxSimultaneousProcesses: progress.maxSimultaneousProcesses,
    upgrades,
    totalItemsCanned: progress.totalItemsCanned,
    canningExperience: progress.canningExperience,
    autoCanning: progress.autoCanning
  };
}

// Create default lean progress
export function createDefaultLeanProgress(): LeanCanningProgress {
  return {
    upgradeProgress: {
      'canning_speed': 0,
      'canning_efficiency': 0,
      'preservation_mastery': 0,
      'simultaneous_processing': 0,
      'canner': 0
    },
    unlockedRecipes: [],
    recipeCompletions: {},
    activeProcesses: [],
    totalItemsCanned: 0,
    canningExperience: 0,
    maxSimultaneousProcesses: 1,
    autoCanning: {
      enabled: false,
      selectedRecipes: [],
      priorityOrder: []
    }
  };
}

// Game state interface for lean saves (without canningVersion)
export interface LeanGameState {
  veggies: Array<{
    name: string;
    growth: number;
    stash: number;
    sellEnabled?: boolean;
    harvestTime?: number;
    betterSeedsLevel?: number;
    salePrice?: number;
  }>;
  money: number;
  experience: number;
  knowledge: number;
  activeVeggie: number;
  day: number;
  greenhouseOwned: boolean;
  heirloomOwned: boolean;
  autoSellOwned: boolean;
  almanacLevel: number;
  almanacCost: number;
  maxPlots: number;
  farmTier: number;
  farmCost: number;
  irrigationOwned: boolean;
  currentWeather: string;
  highestUnlockedVeggie: number;
  globalAutoPurchaseTimer?: number; // Timer for auto purchases
  uiPreferences?: {
    canningRecipeFilter?: string;
    canningRecipeSort?: string;
  };
  canningProgress?: LeanCanningProgress; // Lean canning progress without version
}

// Save game state using lean format
export function saveLeanGameState(state: LeanGameState): void {
  try {
    localStorage.setItem('farmGame', JSON.stringify(state));
  } catch (error) {
    console.error('Error saving lean game state to localStorage:', error);
  }
}

// Load game state using lean format, with migration from old saves
export function loadLeanGameState(): LeanGameState | null {
  try {
    const saved = localStorage.getItem('farmGame');
    if (!saved) return null;
    
    const loaded = JSON.parse(saved);
    
    // Check if this is an old save with canningVersion
    if (loaded.canningVersion !== undefined) {
      console.log('Migrating old save to lean format...');
      
      // Convert old save to lean format
      const leanState: LeanGameState = {
        veggies: loaded.veggies || [],
        money: loaded.money || 0,
        experience: loaded.experience || 0,
        knowledge: loaded.knowledge || 0,
        activeVeggie: loaded.activeVeggie || 0,
        day: loaded.day || 1,
        greenhouseOwned: loaded.greenhouseOwned || false,
        heirloomOwned: loaded.heirloomOwned || false,
        autoSellOwned: loaded.autoSellOwned || false,
        almanacLevel: loaded.almanacLevel || 1,
        almanacCost: loaded.almanacCost || 100,
        maxPlots: loaded.maxPlots || 4,
        farmTier: loaded.farmTier || 1,
        farmCost: loaded.farmCost || 500,
        irrigationOwned: loaded.irrigationOwned || false,
        currentWeather: loaded.currentWeather || 'sunny',
        highestUnlockedVeggie: loaded.highestUnlockedVeggie || 0
      };
      
      // Convert old canning state to lean progress if present
      if (loaded.canningState) {
        leanState.canningProgress = canningStateToLeanProgress(loaded.canningState);
      }
      
      // Save in new lean format and return
      saveLeanGameState(leanState);
      return leanState;
    }
    
    // Already in lean format, return as-is
    return loaded as LeanGameState;
    
  } catch (error) {
    console.error('Error loading game state from localStorage:', error);
    return null;
  }
}