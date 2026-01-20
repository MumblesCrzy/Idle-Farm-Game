/**
 * Migration Registry
 * 
 * Central registry of all save data migrations. Each migration upgrades
 * data from one version to the next. Migrations are applied in order.
 * 
 * VERSION HISTORY:
 * - 0: Legacy format (no version metadata)
 * - 1: Added bee system state
 * - 2: Added canning auto-purchasers and auto-canning config
 * - 3: Added canner upgrade to canning system
 * - 4: Added achievement state
 * - 5: Added Christmas event state
 * - 6: Added event log state and UI preferences
 * - 7: Current version - added migration metadata
 */

import type { MigrationDefinition } from './types';
import type { ExtendedGameState } from '../saveSystem';
import { CANNING_AUTO_PURCHASERS, DEFAULT_AUTO_CANNING_CONFIG } from '../canningAutoPurchase';
import { INITIAL_RECIPES } from '../../data/recipes';

/** Current save data version */
export const CURRENT_SAVE_VERSION = 7;

/**
 * Default canning upgrades for migration
 */
const DEFAULT_CANNING_UPGRADES = [
  {
    id: 'canning_speed',
    name: 'Quick Hands',
    description: 'Reduces canning time by 5% per level',
    type: 'speed' as const,
    level: 0,
    cost: 100,
    baseCost: 100,
    costCurrency: 'money' as const,
    upgradeCostScaling: 2.1,
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
    upgradeCostScaling: 1.5,
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
    upgradeCostScaling: 2.5,
    costCurrency: 'knowledge' as const,
    maxLevel: 1,
    effect: 0,
    unlocked: true
  }
];

/**
 * Default bee state for migration
 */
const DEFAULT_BEE_STATE = {
  unlocked: false,
  firstTimeSetup: false,
  boxes: [],
  regularHoney: 0,
  goldenHoney: 0,
  totalHoneyCollected: 0,
  totalGoldenHoneyCollected: 0,
  lastUpdateTime: Date.now(),
  upgrades: [],
  beekeeperAssistant: {
    unlocked: false,
    active: false,
    autoCollectEnabled: false,
    productionSpeedBonus: 0,
    downtimeReduction: 0,
    level: 0,
    upgradeCost: 100,
    baseUpgradeCost: 100,
    costScaling: 1.5,
    maxLevel: 10
  },
  totalBoxesPurchased: 0,
  honeySpent: 0
};

/**
 * Migration from legacy (no version) to version 1
 * Adds bee system state
 */
const migrationV1: MigrationDefinition = {
  version: 1,
  description: 'Add bee system state',
  migrate: (data: unknown): ExtendedGameState => {
    const state = data as ExtendedGameState;
    
    if (!state.beeState) {
      state.beeState = { ...DEFAULT_BEE_STATE, lastUpdateTime: Date.now() };
    }
    
    return state;
  },
  rollback: (data: unknown): ExtendedGameState => {
    const state = data as ExtendedGameState;
    delete state.beeState;
    return state;
  }
};

/**
 * Migration to version 2
 * Adds canning auto-purchasers and auto-canning config
 */
const migrationV2: MigrationDefinition = {
  version: 2,
  description: 'Add canning auto-purchasers and auto-canning configuration',
  migrate: (data: unknown): ExtendedGameState => {
    const state = data as ExtendedGameState;
    
    if (!state.canningAutoPurchasers) {
      state.canningAutoPurchasers = CANNING_AUTO_PURCHASERS.map(ap => ({ ...ap }));
    }
    
    if (!state.autoCanningConfig) {
      state.autoCanningConfig = { ...DEFAULT_AUTO_CANNING_CONFIG };
    }
    
    return state;
  },
  rollback: (data: unknown): ExtendedGameState => {
    const state = data as ExtendedGameState;
    delete state.canningAutoPurchasers;
    delete state.autoCanningConfig;
    return state;
  }
};

/**
 * Migration to version 3
 * Adds canner upgrade to canning system
 */
const migrationV3: MigrationDefinition = {
  version: 3,
  description: 'Add canner upgrade to canning system',
  migrate: (data: unknown): ExtendedGameState => {
    const state = data as ExtendedGameState;
    
    // Initialize canning state if missing
    if (!state.canningState) {
      state.canningState = {
        recipes: INITIAL_RECIPES.map(config => ({
          id: config.id,
          name: config.name,
          description: config.description,
          ingredients: config.ingredients.map(ing => ({
            veggieIndex: -1,
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
        upgrades: DEFAULT_CANNING_UPGRADES.map(u => ({ ...u })),
        totalItemsCanned: 0,
        canningExperience: 0,
        autoCanning: { ...DEFAULT_AUTO_CANNING_CONFIG }
      };
    } else {
      // Ensure canner upgrade exists
      const hasCannerUpgrade = state.canningState.upgrades.some(u => u.id === 'canner');
      if (!hasCannerUpgrade) {
        const cannerUpgrade = DEFAULT_CANNING_UPGRADES.find(u => u.id === 'canner');
        if (cannerUpgrade) {
          state.canningState.upgrades.push({ ...cannerUpgrade });
        }
      }
      
      // Migrate activeProcesses to include totalTime field
      if (state.canningState.activeProcesses) {
        state.canningState.activeProcesses = state.canningState.activeProcesses.map(process => {
          if (typeof (process as any).totalTime !== 'number') {
            const recipe = state.canningState?.recipes.find(r => r.id === process.recipeId);
            const estimatedTotalTime = recipe ? recipe.baseProcessingTime : process.remainingTime;
            return { ...process, totalTime: estimatedTotalTime };
          }
          return process;
        });
      }
    }
    
    return state;
  },
  rollback: (data: unknown): ExtendedGameState => {
    const state = data as ExtendedGameState;
    if (state.canningState?.upgrades) {
      state.canningState.upgrades = state.canningState.upgrades.filter(u => u.id !== 'canner');
    }
    return state;
  }
};

/**
 * Migration to version 4
 * Adds achievement state
 */
const migrationV4: MigrationDefinition = {
  version: 4,
  description: 'Add achievement system state',
  migrate: (data: unknown): ExtendedGameState => {
    const state = data as ExtendedGameState;
    
    if (!state.achievementState) {
      state.achievementState = {
        achievements: [],
        totalUnlocked: 0,
        lastUnlockedId: null
      };
    }
    
    return state;
  },
  rollback: (data: unknown): ExtendedGameState => {
    const state = data as ExtendedGameState;
    delete state.achievementState;
    return state;
  }
};

/**
 * Migration to version 5
 * Adds Christmas event state
 */
const migrationV5: MigrationDefinition = {
  version: 5,
  description: 'Add Christmas event state',
  migrate: (data: unknown): ExtendedGameState => {
    const state = data as ExtendedGameState;
    
    // Christmas event state is optional and will be initialized by the event system
    // if the event is active. No default state needed here.
    
    return state;
  },
  rollback: (data: unknown): ExtendedGameState => {
    const state = data as ExtendedGameState;
    delete state.christmasEventState;
    return state;
  }
};

/**
 * Migration to version 6
 * Adds event log state and UI preferences
 */
const migrationV6: MigrationDefinition = {
  version: 6,
  description: 'Add event log state and UI preferences',
  migrate: (data: unknown): ExtendedGameState => {
    const state = data as ExtendedGameState;
    
    if (!state.eventLogState) {
      state.eventLogState = {
        entries: [],
        maxEntries: 100,
        unreadCount: 0,
        lastReadId: undefined
      };
    }
    
    if (!state.uiPreferences) {
      state.uiPreferences = {
        canningRecipeFilter: 'all',
        canningRecipeSort: 'profit',
        canningCanMakeOnly: false
      };
    }
    
    return state;
  },
  rollback: (data: unknown): ExtendedGameState => {
    const state = data as ExtendedGameState;
    delete state.eventLogState;
    delete state.uiPreferences;
    return state;
  }
};

/**
 * Migration to version 7
 * Adds migration metadata - this is a structural migration
 */
const migrationV7: MigrationDefinition = {
  version: 7,
  description: 'Add migration metadata and versioning',
  migrate: (data: unknown): ExtendedGameState => {
    const state = data as ExtendedGameState;
    
    // Add totalDaysElapsed if missing (calculate from day assuming no resets)
    if (state.totalDaysElapsed === undefined) {
      state.totalDaysElapsed = state.day || 1;
    }
    
    // Add globalAutoPurchaseTimer if missing
    if (state.globalAutoPurchaseTimer === undefined) {
      state.globalAutoPurchaseTimer = 0;
    }
    
    // Add permanentBonuses if missing
    if (!state.permanentBonuses) {
      state.permanentBonuses = [];
    }
    
    // Add harvestTutorialShown if missing
    if (state.harvestTutorialShown === undefined) {
      // If player has experience, assume they've seen the tutorial
      state.harvestTutorialShown = (state.experience || 0) > 0;
    }
    
    return state;
  },
  rollback: (data: unknown): ExtendedGameState => {
    const state = data as ExtendedGameState;
    // These fields are additive, rollback just leaves them
    return state;
  }
};

/**
 * All migrations in order
 * IMPORTANT: Keep this array sorted by version number
 */
export const MIGRATIONS: MigrationDefinition[] = [
  migrationV1,
  migrationV2,
  migrationV3,
  migrationV4,
  migrationV5,
  migrationV6,
  migrationV7
];

/**
 * Get all migrations needed to upgrade from one version to another
 */
export function getMigrationsToRun(fromVersion: number, toVersion: number = CURRENT_SAVE_VERSION): MigrationDefinition[] {
  return MIGRATIONS.filter(m => m.version > fromVersion && m.version <= toVersion);
}

/**
 * Get migrations needed to rollback from one version to another
 */
export function getMigrationsToRollback(fromVersion: number, toVersion: number): MigrationDefinition[] {
  return MIGRATIONS
    .filter(m => m.version <= fromVersion && m.version > toVersion)
    .reverse();
}

/**
 * Check if a migration exists for a specific version
 */
export function hasMigration(version: number): boolean {
  return MIGRATIONS.some(m => m.version === version);
}

/**
 * Get a specific migration by version
 */
export function getMigration(version: number): MigrationDefinition | undefined {
  return MIGRATIONS.find(m => m.version === version);
}
