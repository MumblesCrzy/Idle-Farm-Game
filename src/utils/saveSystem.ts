import type { CanningState } from '../types/canning';
import { INITIAL_RECIPES } from '../data/recipes';
import type { AutoCanningConfig } from '../utils/canningAutoPurchase';
import { CANNING_AUTO_PURCHASERS, DEFAULT_AUTO_CANNING_CONFIG } from '../utils/canningAutoPurchase';

// CanningAutoPurchase type definition (since it's not exported from the utils file)
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

// Extended game state that includes canning
export interface ExtendedGameState {
  // Existing game state
  veggies: any[];
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
  globalAutoPurchaseTimer?: number;
  
  // New canning state
  canningState?: CanningState;
  canningAutoPurchasers?: CanningAutoPurchase[];
  autoCanningConfig?: AutoCanningConfig;
  canningVersion?: number; // For migration purposes
  
  // UI preferences
  uiPreferences?: {
    canningRecipeFilter?: 'all' | 'available' | 'simple' | 'complex' | 'gourmet';
    canningRecipeSort?: 'name' | 'profit' | 'time' | 'difficulty';
  };
}

const CANNING_VERSION = 1;
const GAME_STORAGE_KEY = 'farmIdleGameState';

// Load game state with canning migration
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

// Save game state including canning
export function saveGameStateWithCanning(state: ExtendedGameState): void {
  try {
    const stateToSave = {
      ...state,
      canningVersion: CANNING_VERSION
    };
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(stateToSave));
  } catch {
    // Silently fail like the original implementation
  }
}

// Migrate old save data to include canning
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
          costCurrency: 'money',
          maxLevel: 14,
          effect: 1,
          unlocked: true
        }
      ],
      totalItemsCanned: 0,
      canningExperience: 0,
      autoCanning: DEFAULT_AUTO_CANNING_CONFIG
    };

    // Migrate existing canning state if it exists
    if (loaded.canningState) {
      // Preserve user progress
      defaultCanningState.totalItemsCanned = loaded.canningState.totalItemsCanned || 0;
      defaultCanningState.canningExperience = loaded.canningState.canningExperience || 0;
      
      // Preserve unlocked recipes
      if (loaded.canningState.unlockedRecipes) {
        defaultCanningState.unlockedRecipes = loaded.canningState.unlockedRecipes;
        defaultCanningState.recipes.forEach(recipe => {
          recipe.unlocked = defaultCanningState.unlockedRecipes.includes(recipe.id);
        });
      }
      
      // Preserve upgrade levels
      if (loaded.canningState.upgrades) {
        loaded.canningState.upgrades.forEach(savedUpgrade => {
          const defaultUpgrade = defaultCanningState.upgrades.find(u => u.id === savedUpgrade.id);
          if (defaultUpgrade) {
            defaultUpgrade.level = savedUpgrade.level;
            defaultUpgrade.cost = savedUpgrade.cost;
            defaultUpgrade.effect = savedUpgrade.effect;
          }
        });
      }
      
      // Preserve auto-canning config
      if (loaded.canningState.autoCanning) {
        defaultCanningState.autoCanning = {
          ...DEFAULT_AUTO_CANNING_CONFIG,
          ...loaded.canningState.autoCanning
        };
      }

      // Migrate activeProcesses to include totalTime field
      if (loaded.canningState.activeProcesses && Array.isArray(loaded.canningState.activeProcesses)) {
        defaultCanningState.activeProcesses = loaded.canningState.activeProcesses.map(process => {
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

  return loaded;
}

// Extend veggie data to include canning upgrades
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

// Export functions for import/export
export function exportSaveWithCanning(state: ExtendedGameState): string {
  const saveData = {
    ...state,
    canningVersion: CANNING_VERSION,
    exportTimestamp: new Date().toISOString(),
    gameVersion: '1.5.0'
  };
  
  return JSON.stringify(saveData, null, 2);
}

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