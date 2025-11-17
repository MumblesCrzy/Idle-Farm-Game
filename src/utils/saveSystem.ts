import type { CanningState, LeanCanningProgress } from '../types/canning';
import { INITIAL_RECIPES } from '../data/recipes';
import type { AutoCanningConfig } from '../utils/canningAutoPurchase';
import { CANNING_AUTO_PURCHASERS, DEFAULT_AUTO_CANNING_CONFIG } from '../utils/canningAutoPurchase';

/**
 * Commented out for future use - will be needed for lean save system
 * These functions convert between full CanningState and lean progress format
 * to reduce save file size while maintaining all necessary data.
 */
/* Commented out for future use - will be needed for lean save system
// Convert full CanningState to lean progress format
function _canningStateToLeanProgress(canningState: CanningState): LeanCanningProgress {
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

// Convert lean progress back to full CanningState using current game constants (for future use)
function _leanProgressToCanningState(progress: LeanCanningProgress, veggies: any[], experience: number): CanningState {
  // Import the upgrades - we'll need to import them properly
  // For now, define them locally to avoid circular dependency
  const INITIAL_CANNING_UPGRADES = [
    {
      id: 'canning_speed',
      name: 'Quick Hands',
      description: 'Reduces canning time by 5% per level',
      type: 'speed' as const,
      level: 0,
      cost: 100,
      baseCost: 100,
      upgradeCostScaling: 2.1,
      maxLevel: 18,
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
      upgradeCostScaling: 1.5,
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
      upgradeCostScaling: 1.5,
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
      upgradeCostScaling: 1.7,
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
      upgradeCostScaling: 1.0,
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
    updatedUpgrade.cost = Math.ceil(updatedUpgrade.baseCost * Math.pow(updatedUpgrade.upgradeCostScaling, savedLevel));
    
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
*/

/**
 * CanningAutoPurchase type definition for save system compatibility
 */
type CanningAutoPurchase = {
  id: string;
  name: string;
  upgradeId: string;
  cycleDays: number;
  owned: boolean;
  active: boolean;
  cost: number;
  timer: number;
  costCurrency: 'money' | 'knowledge';
};

/**
 * Extended game state interface that includes all game systems.
 * Supports both old and new save formats for backward compatibility.
 */
export interface ExtendedGameState {
  // Existing game state
  veggies: any[];
  money: number;
  experience: number;
  knowledge: number;
  activeVeggie: number;
  day: number;
  totalDaysElapsed?: number;
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
  globalAutoPurchaseTimer?: number;
  permanentBonuses?: string[];
  
  // Canning state - supporting both old and new formats
  canningState?: CanningState; // Old format - for backward compatibility
  canningProgress?: LeanCanningProgress; // New lean format
  canningAutoPurchasers?: CanningAutoPurchase[];
  autoCanningConfig?: AutoCanningConfig;
  canningVersion?: number; // For migration purposes
  
  // UI preferences
  uiPreferences?: {
    canningRecipeFilter?: 'all' | 'available' | 'simple' | 'complex' | 'gourmet';
    canningRecipeSort?: 'name' | 'profit' | 'time' | 'difficulty';
  };
  
  // Achievement state
  achievementState?: any; // AchievementState type from achievements.ts
  
  // Event log state
  eventLogState?: {
    entries: any[];
    maxEntries?: number;
    unreadCount?: number;
    lastReadId?: string;
  };
  
  // Christmas event state
  christmasEventState?: any; // ChristmasEventState type from christmasEvent.ts
}

/** Current version number for canning save data format */
const CANNING_VERSION = 3; // Incremented to force migration for canner upgrade

/** LocalStorage key for game state persistence */
const GAME_STORAGE_KEY = 'farmIdleGameState';

/**
 * Loads game state from localStorage with automatic canning system migration.
 * Handles backward compatibility for older save formats.
 * @returns The loaded and migrated game state, or null if no save exists
 */
export function loadGameStateWithCanning(): ExtendedGameState | null {
  try {
    const raw = localStorage.getItem(GAME_STORAGE_KEY);
    if (!raw) return null;
    
    const loaded = JSON.parse(raw) as ExtendedGameState;
    
    // Migrate canning data if needed
    return migrateCanningSaveData(loaded);
  } catch {
    return null;
  }
}

/**
 * Saves game state to localStorage including all canning data.
 * Automatically sets the current canning version for future migration checks.
 * @param state - The complete game state to save
 */
export function saveGameStateWithCanning(state: ExtendedGameState): void {
  try {
    const stateToSave = {
      ...state,
      canningVersion: CANNING_VERSION
    };
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(stateToSave));
  } catch (error) {
    console.error('saveGameStateWithCanning: Error saving to localStorage:', error);
  }
}

/**
 * Migrates old save data to include canning system or update to latest canning version.
 * Creates default canning state if none exists, preserves existing progress during updates.
 * @param loaded - The loaded game state to migrate
 * @returns Updated game state with current canning version
 */
function migrateCanningSaveData(loaded: ExtendedGameState): ExtendedGameState {
  // If no canning data exists or version is outdated, create default
  if (!loaded.canningState || !loaded.canningVersion || loaded.canningVersion < CANNING_VERSION) {
    const defaultCanningState: CanningState = {
      recipes: INITIAL_RECIPES.map(config => ({
        id: config.id,
        name: config.name,
        description: config.description,
        ingredients: config.ingredients.map(ing => ({
          veggieIndex: -1, // Will be resolved when veggies are available
          veggieName: ing.veggieName,
          quantity: ing.quantity
        })),
        processingTime: config.baseProcessingTime,
        baseProcessingTime: config.baseProcessingTime,
        salePrice: config.baseSalePrice,
        baseSalePrice: config.baseSalePrice,
        experienceRequired: config.experienceRequired,
        unlocked: false,
        timesCompleted: 0
      })),
      unlockedRecipes: [],
      activeProcesses: [],
      maxSimultaneousProcesses: 1,
      upgrades: [
        {
          id: 'canning_speed',
          name: 'Quick Hands',
          description: 'Reduces canning time by 5% per level',
          type: 'speed',
          level: 0,
          cost: 100,
          baseCost: 100,
          costCurrency: 'money',
          upgradeCostScaling: 2.1,
          effect: 1.0,
          unlocked: true
        },
        {
          id: 'canning_efficiency',
          name: 'Family Recipe',
          description: 'Increases canned product sale price by 10% per level',
          type: 'efficiency',
          level: 0,
          cost: 150,
          baseCost: 150,
          upgradeCostScaling: 1.5,
          costCurrency: 'knowledge',
          effect: 1.0,
          unlocked: true
        },
        {
          id: 'preservation_mastery',
          name: 'Heirloom Touch',
          description: 'Chance to get bonus canned products',
          type: 'quality',
          level: 0,
          cost: 200,
          baseCost: 200,
          upgradeCostScaling: 1.5,
          costCurrency: 'knowledge',
          effect: 0,
          unlocked: true
        },
        {
          id: 'simultaneous_processing',
          name: 'Batch Canning',
          description: 'Allows more canning processes to run at once',
          type: 'automation',
          level: 0,
          cost: 500,
          baseCost: 500,
          upgradeCostScaling: 1.5,
          costCurrency: 'money',
          maxLevel: 14,
          effect: 1,
          unlocked: true
        },
        {
          id: 'canner',
          name: 'Canner',
          description: 'Automatically starts canning processes every 10 seconds (gives reduced knowledge)',
          type: 'automation',
          level: 0,
          cost: 5000,
          baseCost: 5000,
          upgradeCostScaling: 2.5,
          costCurrency: 'knowledge',
          maxLevel: 1,
          effect: 0,
          unlocked: true
        }
      ],
      totalItemsCanned: 0,
      canningExperience: 0,
      autoCanning: DEFAULT_AUTO_CANNING_CONFIG
    };

    // Migrate existing canning state if it exists
    if (loaded.canningState) {
      // Store reference to original canning state before overriding
      const originalCanningState = loaded.canningState;
      
      // Preserve user progress
      defaultCanningState.totalItemsCanned = originalCanningState.totalItemsCanned || 0;
      defaultCanningState.canningExperience = originalCanningState.canningExperience || 0;
      
      // Preserve unlocked recipes
      if (originalCanningState.unlockedRecipes) {
        defaultCanningState.unlockedRecipes = originalCanningState.unlockedRecipes;
        defaultCanningState.recipes.forEach(recipe => {
          recipe.unlocked = defaultCanningState.unlockedRecipes.includes(recipe.id);
        });
      }
      
      // Preserve upgrade levels and merge all properties from defaults
      if (originalCanningState.upgrades) {
        defaultCanningState.upgrades = defaultCanningState.upgrades.map(defaultUpgrade => {
          const savedUpgrade = originalCanningState.upgrades.find(u => u.id === defaultUpgrade.id);
          if (savedUpgrade) {
            // Merge all properties, but keep default values for any missing fields
            return {
              ...defaultUpgrade,
              ...savedUpgrade,
              // Always enforce maxLevel and other critical properties from default
              maxLevel: defaultUpgrade.maxLevel,
              upgradeCostScaling: defaultUpgrade.upgradeCostScaling,
              baseCost: defaultUpgrade.baseCost,
              costCurrency: defaultUpgrade.costCurrency,
              name: defaultUpgrade.name,
              description: defaultUpgrade.description,
              type: defaultUpgrade.type,
            };
          }
          return defaultUpgrade;
        });
      }
      
      // Preserve auto-canning config
      if (originalCanningState.autoCanning) {
        defaultCanningState.autoCanning = {
          ...DEFAULT_AUTO_CANNING_CONFIG,
          ...originalCanningState.autoCanning
        };
      }

      // Migrate activeProcesses to include totalTime field
      if (originalCanningState.activeProcesses && Array.isArray(originalCanningState.activeProcesses)) {
        defaultCanningState.activeProcesses = originalCanningState.activeProcesses.map(process => {
          // If process doesn't have totalTime, calculate it from remainingTime (best guess)
          if (typeof process.totalTime !== 'number') {
            const recipe = defaultCanningState.recipes.find(r => r.id === process.recipeId);
            const estimatedTotalTime = recipe ? recipe.baseProcessingTime : process.remainingTime;
            return {
              ...process,
              totalTime: estimatedTotalTime
            };
          }
          return process;
        });
      }
      
      // Override the loaded state with the updated default state to ensure all upgrades are present
      loaded.canningState = defaultCanningState;
    }

    loaded.canningState = defaultCanningState;
  }

  // Migrate auto-purchasers
  if (!loaded.canningAutoPurchasers) {
    loaded.canningAutoPurchasers = CANNING_AUTO_PURCHASERS.map(ap => ({ ...ap }));
  }

  // Migrate auto-canning config
  if (!loaded.autoCanningConfig) {
    loaded.autoCanningConfig = { ...DEFAULT_AUTO_CANNING_CONFIG };
  }

  // Update version
  loaded.canningVersion = CANNING_VERSION;
  
  // Final validation - ensure canner upgrade is always present
  if (loaded.canningState && loaded.canningState.upgrades) {
    const hasCannerUpgrade = loaded.canningState.upgrades.some(u => u.id === 'canner');
    if (!hasCannerUpgrade) {
      console.log('Adding missing canner upgrade...');
      loaded.canningState.upgrades.push({
        id: 'canner',
        name: 'Canner',
        description: 'Automatically starts canning processes every 10 seconds (gives reduced knowledge)',
        type: 'automation',
        level: 0,
        cost: 5000,
        baseCost: 5000,
        upgradeCostScaling: 2.5,
        costCurrency: 'knowledge',
        maxLevel: 1,
        effect: 0,
        unlocked: true
      });
    }
  }

  return loaded;
}

/**
 * Extends veggie data to include canning-specific upgrade fields.
 * Adds canningYieldLevel, canningYieldCost, canningQualityLevel, and canningQualityCost.
 * @param veggies - Array of vegetable data to extend
 * @returns Updated veggie array with canning upgrade fields
 */
export function migrateVeggieDataWithCanning(veggies: any[]): any[] {
  return veggies.map(veggie => {
    // Add canning upgrade fields if they don't exist
    if (veggie.canningYieldLevel === undefined) {
      veggie.canningYieldLevel = 0;
    }
    if (veggie.canningYieldCost === undefined) {
      // Calculate initial cost based on veggie tier
      const veggieIndex = veggies.indexOf(veggie);
      veggie.canningYieldCost = Math.ceil(200 * Math.pow(1.5, veggieIndex));
    }
    if (veggie.canningQualityLevel === undefined) {
      veggie.canningQualityLevel = 0;
    }
    if (veggie.canningQualityCost === undefined) {
      // Calculate initial cost based on veggie tier
      const veggieIndex = veggies.indexOf(veggie);
      veggie.canningQualityCost = Math.ceil(150 * Math.pow(1.5, veggieIndex));
    }
    
    return veggie;
  });
}

/**
 * Validates imported game save data structure.
 * Checks for required fields and correct data types to prevent corrupted imports.
 * @param data - The data to validate
 * @returns True if data is a valid ExtendedGameState
 */
export function validateCanningImport(data: any): data is ExtendedGameState {
  try {
    // Basic validation
    if (!data || typeof data !== 'object') return false;
    
    // Required fields
    const requiredFields = [
      'veggies', 'money', 'experience', 'knowledge', 
      'activeVeggie', 'day', 'maxPlots', 'farmTier'
    ];
    
    for (const field of requiredFields) {
      if (!(field in data)) return false;
    }
    
    // Validate array fields
    if (!Array.isArray(data.veggies)) return false;
    
    // Validate canning state if present
    if (data.canningState) {
      if (!Array.isArray(data.canningState.recipes)) return false;
      if (!Array.isArray(data.canningState.upgrades)) return false;
      if (!Array.isArray(data.canningState.activeProcesses)) return false;
    }
    
    return true;
  } catch {
    return false;
  }
}