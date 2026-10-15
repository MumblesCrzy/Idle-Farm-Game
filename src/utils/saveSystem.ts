import type { CanningState, LeanCanningProgress } from '../types/canning';
import type { Veggie, EventLogState } from '../types/game';
import type { BeeBox, BeeUpgrade, BeekeeperAssistant } from '../types/bees';
import type { ChristmasEventState } from '../types/christmasEvent';
import type { AchievementState } from '../types/achievements';
import { INITIAL_RECIPES } from '../data/recipes';
import type { AutoCanningConfig } from '../utils/canningAutoPurchase';
import { CANNING_AUTO_PURCHASERS, DEFAULT_AUTO_CANNING_CONFIG } from '../utils/canningAutoPurchase';
import {
  runMigrations,
  needsMigration,
  CURRENT_SAVE_VERSION,
  getMigrationLog,
  getMigrationSummary,
  clearMigrationLog
} from './migrations';
import { LAST_ACTIVE_KEY, ARCHIE_LAST_CLICK_KEY, ARCHIE_STREAK_KEY } from '../config/gameConstants';

/**
 * Saved bee state structure - doesn't include computed fields
 * maxBoxes and honeyPerSecond are calculated at runtime
 */
interface SavedBeeState {
  unlocked: boolean;
  firstTimeSetup: boolean;
  boxes: BeeBox[];
  regularHoney: number;
  goldenHoney: number;
  totalHoneyCollected: number;
  totalGoldenHoneyCollected: number;
  lastUpdateTime: number;
  upgrades: BeeUpgrade[];
  beekeeperAssistant: BeekeeperAssistant;
  totalBoxesPurchased: number;
  honeySpent: number;
}


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
  veggies: Veggie[];
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
  totalHarvests?: number;
  globalAutoPurchaseTimer?: number;
  permanentBonuses?: string[];
  
  // Canning state - supporting both old and new formats
  canningState?: CanningState; // Old format - for backward compatibility
  canningProgress?: LeanCanningProgress; // New lean format
  canningAutoPurchasers?: CanningAutoPurchase[];
  autoCanningConfig?: AutoCanningConfig;
  canningVersion?: number; // Legacy - now using _saveVersion
  
  // UI preferences
  uiPreferences?: {
    canningRecipeFilter?: 'all' | 'simple' | 'complex' | 'gourmet' | 'honey';
    canningCanMakeOnly?: boolean;
    canningRecipeSort?: 'name' | 'profit' | 'time' | 'difficulty';
  };
  
  // Achievement state
  achievementState?: AchievementState;
  
  // Event log state
  eventLogState?: EventLogState;
  
  // Christmas event state
  christmasEventState?: ChristmasEventState;
  
  // Bee system state
  beeState?: SavedBeeState;
  
  // Guild system state (v0.11.0)
  guildState?: import('../types/guilds').GuildState;
  
  // Tutorial state
  harvestTutorialShown?: boolean;
  guildIntroShown?: boolean;
  
  // Pause state — persisted so offline progress is skipped when paused
  isPaused?: boolean;
  
  // Save version for migration system
  _saveVersion?: number;
  
  // Timestamp of last save (UTC ms) used for offline catch-up
  lastSavedAt?: number;
}

/** LocalStorage key for game state persistence */
const GAME_STORAGE_KEY = 'farmIdleGameState';

/** Legacy canning version - kept for backward compatibility */
const CANNING_VERSION = 3;

/** Where the untouched save is kept before a migration, or when the save can't be read. */
export const SAVE_BACKUP_KEY = `${GAME_STORAGE_KEY}_backup`;

/** Set by importGameState and startNewGame. Stops the running game from writing over the new save before the reload. */
let savesBlocked = false;

function backupRawSave(raw: string): void {
  try {
    localStorage.setItem(SAVE_BACKUP_KEY, raw);
  } catch (error) {
    console.warn('Could not back up the save:', error);
  }
}

/**
 * Restores permanent bonuses that achievements grant.
 * Saves made before October 2026 left out permanentBonuses, so a player who had earned
 * Frost Fertilizer lost the bonus on the next reload and could never earn it again.
 */
function restoreAchievementBonuses(state: ExtendedGameState): void {
  const bonuses = state.permanentBonuses ?? [];
  const frostFertilizerEarned =
    state.achievementState?.achievements?.some(a => a.id === 'frost_fertilizer' && a.unlocked);
  state.permanentBonuses = frostFertilizerEarned && !bonuses.includes('frost_fertilizer')
    ? [...bonuses, 'frost_fertilizer']
    : bonuses;
}

/**
 * Loads game state from localStorage with automatic migration.
 * Uses the new migration framework for version-based migrations.
 * @returns The loaded and migrated game state, or null if no save exists
 */
export function loadGameStateWithCanning(): ExtendedGameState | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(GAME_STORAGE_KEY);
    if (!raw) return null;
    
    let loaded = JSON.parse(raw) as ExtendedGameState;
    
    // Check if migration is needed
    if (needsMigration(loaded)) {
      // Keep the untouched save so a failed or faulty migration cannot destroy it
      backupRawSave(raw);
      const result = runMigrations(loaded, { 
        verbose: typeof window !== 'undefined' && window.location.hostname === 'localhost',
        enableSnapshots: true 
      });
      
      if (result.success) {
        // Return migrated data with version stamp
        loaded = result.data as ExtendedGameState;
        loaded._saveVersion = CURRENT_SAVE_VERSION;
        // Keep canningVersion for backward compatibility
        loaded.canningVersion = CANNING_VERSION;
      } else {
        // Migration failed. The runner returns the data as of the last migration that
        // succeeded, and the original save stays under SAVE_BACKUP_KEY.
        console.error(`Migration failed. The original save is kept under "${SAVE_BACKUP_KEY}":`, result.migrations.map(m => m.error).filter(Boolean));
        loaded = result.data as ExtendedGameState;
        // Still try legacy migration as fallback
        loaded = migrateCanningSaveData(loaded);
        loaded = migrateBeeStateSaveData(loaded);
      }
    }
    
    // Ensure critical fields exist even if at current version
    // This handles edge cases where data was saved without all required fields
    if (!loaded.canningState) {
      loaded = migrateCanningSaveData(loaded);
    }
    if (!loaded.beeState) {
      loaded = migrateBeeStateSaveData(loaded);
    }
    if (!loaded.canningAutoPurchasers) {
      loaded.canningAutoPurchasers = CANNING_AUTO_PURCHASERS.map(ap => ({ ...ap }));
    }
    if (!loaded.autoCanningConfig) {
      loaded.autoCanningConfig = { ...DEFAULT_AUTO_CANNING_CONFIG };
    }
    
    // Always migrate veggie data to fix any broken upgrade costs
    if (loaded.veggies && Array.isArray(loaded.veggies)) {
      loaded.veggies = migrateVeggieDataWithCanning(loaded.veggies);
    }
    
    // Ensure version fields are set
    loaded._saveVersion = CURRENT_SAVE_VERSION;
    loaded.canningVersion = CANNING_VERSION;

    if (!loaded.lastSavedAt) {
      loaded.lastSavedAt = Date.now();
    }

    restoreAchievementBonuses(loaded);
    
    return loaded;
  } catch (error) {
    console.error('loadGameStateWithCanning: Error loading from localStorage:', error);
    // Keep the unreadable save; otherwise the next autosave would replace it with a new game
    if (raw) backupRawSave(raw);
    return null;
  }
}

/**
 * Adds the version and timestamp fields that every stored or exported save carries.
 * @param state - The complete game state
 * @returns The state ready to store or export
 */
export function createSaveSnapshot(state: ExtendedGameState): ExtendedGameState {
  return {
    ...state,
    _saveVersion: CURRENT_SAVE_VERSION,
    // Keep canningVersion for backward compatibility during transition
    canningVersion: 3,
    lastSavedAt: Date.now()
  };
}

/**
 * Saves game state to localStorage including all data.
 * Automatically sets the current save version for future migration checks.
 * Does nothing after an import, until the page reloads.
 * @param state - The complete game state to save
 */
export function saveGameStateWithCanning(state: ExtendedGameState): void {
  if (savesBlocked) return;
  try {
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(createSaveSnapshot(state)));
  } catch (error) {
    console.error('saveGameStateWithCanning: Error saving to localStorage:', error);
  }
}

/**
 * Stores an imported save for the next page load.
 * The file keeps its own version stamp, so the loader runs whatever migrations it needs.
 * Saves are then blocked until the page reloads, so the running game cannot overwrite the import.
 * @param data - The validated save file contents
 */
export function importGameState(data: ExtendedGameState): void {
  localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify({
    ...data,
    // Count offline time from the import, not from when the file was exported
    lastSavedAt: Date.now()
  }));
  savesBlocked = true;
}

/**
 * Progress the browser keeps, the save file included. Settings are left alone:
 * feature flags, and Archie's sound and appearance.
 */
const PROGRESS_KEYS = [GAME_STORAGE_KEY, LAST_ACTIVE_KEY, ARCHIE_STREAK_KEY, ARCHIE_LAST_CLICK_KEY];

/**
 * Starts a brand-new game. Erases the save and all other stored progress,
 * achievements included, then reloads. The page loads with
 * no save, exactly like a first visit, so nothing from the old game can carry over.
 *
 * Saves are blocked first, so the running game can't write itself back while the
 * page unloads.
 * @param reload - Reloads the page; tests pass their own
 */
export function startNewGame(reload: () => void = () => window.location.reload()): void {
  savesBlocked = true;
  for (const key of PROGRESS_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Storage unavailable: there is nothing stored to erase
    }
  }
  clearMigrationLog();
  reload();
}

/**
 * Gets the migration log for display to users.
 * @returns Human-readable migration summary
 */
export function getSaveMigrationSummary(): string {
  return getMigrationSummary();
}

/**
 * Gets the detailed migration log.
 * @returns Migration log entries
 */
export function getSaveMigrationLog() {
  return getMigrationLog();
}

/**
 * Migrates old save data to include canning system or update to latest canning version.
 * @deprecated Use the new migration framework instead. Kept for fallback compatibility.
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
 * Migrates old save data to include bee system state.
 * Creates default bee state if none exists for backward compatibility.
 * @param loaded - The loaded game state to migrate
 * @returns Updated game state with bee state
 */
function migrateBeeStateSaveData(loaded: ExtendedGameState): ExtendedGameState {
  // If bee state doesn't exist, create a default empty state
  if (!loaded.beeState) {
    console.log('🐝 Migrating save data: Adding bee system state');
    loaded.beeState = {
      unlocked: false,
      firstTimeSetup: false,
      boxes: [],
      regularHoney: 0,
      goldenHoney: 0,
      totalHoneyCollected: 0,
      totalGoldenHoneyCollected: 0,
      lastUpdateTime: Date.now(),
      upgrades: [], // Will be initialized by BeeContext
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
  }
  
  return loaded;
}

/** A veggie plus the per-veggie canning upgrade fields that migrateVeggieDataWithCanning adds. */
export type VeggieWithCanningFields = Veggie & {
  canningYieldLevel?: number;
  canningYieldCost?: number;
  canningQualityLevel?: number;
  canningQualityCost?: number;
};

/**
 * Extends veggie data to include canning-specific upgrade fields.
 * Adds canningYieldLevel, canningYieldCost, canningQualityLevel, and canningQualityCost.
 * Also fixes Radish upgrade costs that were incorrectly set to 'calculated' string.
 * @param veggies - Array of vegetable data to extend
 * @returns Updated veggie array with canning upgrade fields
 */
export function migrateVeggieDataWithCanning(veggies: VeggieWithCanningFields[]): VeggieWithCanningFields[] {
  return veggies.map((veggie, veggieIndex) => {
    // Fix Radish upgrade costs that were incorrectly set to 'calculated' string
    if (veggie.name === 'Radish') {
      if (typeof veggie.harvesterSpeedCost !== 'number' || isNaN(veggie.harvesterSpeedCost)) {
        veggie.harvesterSpeedCost = 50;
      }
      if (typeof veggie.additionalPlotCost !== 'number' || isNaN(veggie.additionalPlotCost)) {
        veggie.additionalPlotCost = 40;
      }
    }
    
    // Add canning upgrade fields if they don't exist
    if (veggie.canningYieldLevel === undefined) {
      veggie.canningYieldLevel = 0;
    }
    if (veggie.canningYieldCost === undefined) {
      // Calculate initial cost based on veggie tier
      veggie.canningYieldCost = Math.ceil(200 * Math.pow(1.5, veggieIndex));
    }
    if (veggie.canningQualityLevel === undefined) {
      veggie.canningQualityLevel = 0;
    }
    if (veggie.canningQualityCost === undefined) {
      // Calculate initial cost based on veggie tier
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
export function validateCanningImport(data: unknown): data is ExtendedGameState {
  try {
    // Basic validation
    if (!data || typeof data !== 'object') return false;
    const d = data as {
      veggies?: unknown;
      canningState?: { recipes?: unknown; upgrades?: unknown; activeProcesses?: unknown };
      beeState?: { unlocked?: unknown; boxes?: unknown; regularHoney?: unknown; goldenHoney?: unknown };
    };
    
    // Required fields
    const requiredFields = [
      'veggies', 'money', 'experience', 'knowledge', 
      'activeVeggie', 'day', 'maxPlots', 'farmTier'
    ];
    
    for (const field of requiredFields) {
      if (!(field in data)) return false;
    }
    
    // Validate array fields
    if (!Array.isArray(d.veggies)) return false;
    
    // Validate canning state if present
    if (d.canningState) {
      if (!Array.isArray(d.canningState.recipes)) return false;
      if (!Array.isArray(d.canningState.upgrades)) return false;
      if (!Array.isArray(d.canningState.activeProcesses)) return false;
    }
    
    // Validate bee state if present (optional, will be migrated if missing)
    if (d.beeState) {
      if (typeof d.beeState.unlocked !== 'boolean') return false;
      if (!Array.isArray(d.beeState.boxes)) return false;
      if (typeof d.beeState.regularHoney !== 'number') return false;
      if (typeof d.beeState.goldenHoney !== 'number') return false;
    }
    
    return true;
  } catch {
    return false;
  }
}