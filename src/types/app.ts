/**
 * App-specific Type Definitions
 * 
 * Type definitions for App.tsx including gameStateRef,
 * globalBeeContext, and other App-level types.
 */

import type { Veggie, WeatherType, SeasonType, EventPriority } from './game';
import type { BeeState, BeeContextValue } from './bees';
import type { ChristmasEventState } from './christmasEvent';
import type { Achievement, AchievementState } from './achievements';
import type { CanningState } from './canning';

// ============================================================================
// GAME STATE REF TYPES
// ============================================================================

/**
 * Christmas event context interface (subset of full context for gameStateRef)
 */
export interface ChristmasEventRef {
  isEventActive: boolean;
  passiveCheerPerSecond: number;
  eventState: ChristmasEventState;
  processTreeGrowth: () => void;
  updatePassiveIncome: (deltaTime: number) => void;
  processDailyElvesCrafting: () => void;
}

/**
 * Game state ref structure for offline progress tracking
 */
export interface GameStateRefValue {
  veggies: Veggie[];
  day: number;
  totalDaysElapsed: number;
  season: SeasonType;
  currentWeather: WeatherType;
  greenhouseOwned: boolean;
  irrigationOwned: boolean;
  almanacLevel: number;
  farmTier: number;
  knowledge: number;
  christmasEvent: ChristmasEventRef;
}

// ============================================================================
// BEE CONTEXT TYPES
// ============================================================================

/**
 * Global bee context type - subset of BeeContextValue used in App
 * Includes optional methods that may not be available on all contexts
 */
export type GlobalBeeContext = BeeContextValue | null;

// ============================================================================
// EVENT LOG CALLBACK TYPES
// ============================================================================

/**
 * Event log entry metadata
 */
export interface EventLogMetadata {
  upgradeType?: string;
  veggieIndex?: number;
  veggieName?: string;
  amount?: number;
  totalMoney?: number;
  isAutoSell?: boolean;
  veggiesSold?: Array<{ name: string; quantity: number; earnings: number }>;
  recipeName?: string;
  ingredients?: string;
  processingTime?: number;
  isAuto?: boolean;
  moneyEarned?: number;
  knowledgeEarned?: number;
  itemsProduced?: number;
  treeType?: string;
  quantity?: number;
  cheerEarned?: number;
  quality?: string;
  itemName?: string;
  upgradeName?: string;
  cost?: number;
  milestoneName?: string;
  achievementName?: string;
  achievementCategory?: string;
  achievementReward?: string;
  upgradeLevel?: number;
  currencyType?: 'money' | 'knowledge';
}

/**
 * Event log entry options passed to addEvent
 */
export interface EventLogOptions {
  priority?: EventPriority;
  details?: string;
  icon?: string;
  metadata?: EventLogMetadata;
}

/**
 * Event log callbacks interface
 */
export interface EventLogCallbacks {
  onWeatherChange: (oldWeather: string, newWeather: string, season: string) => void;
  onGrowth: (veggieName: string, growthPercent: number) => void;
  onHarvest: (veggieName: string, amount: number, veggieIndex: number) => void;
  onAutoPurchase: (veggieName: string, autoPurchaserName: string, upgradeType: string, upgradeLevel: number, cost: number, currencyType: 'money' | 'knowledge') => void;
  onMerchantSale: (totalMoney: number, veggiesSold: Array<{ name: string; quantity: number; earnings: number }>, isAutoSell: boolean) => void;
  onAchievementUnlock: (achievement: Achievement) => void;
  onTreeSold: (treeType: string, quantity: number, cheerEarned: number) => void;
  onTreeHarvested: (treeType: string, quality: string) => void;
  onItemCrafted: (itemName: string, quantity: number) => void;
  onUpgradePurchased: (upgradeName: string, cost: number) => void;
  onMilestoneClaimed: (milestoneName: string) => void;
}

// ============================================================================
// UI PREFERENCES TYPES
// ============================================================================

/**
 * UI preferences for recipe filtering/sorting
 */
export interface UIPreferences {
  canningRecipeFilter: 'all' | 'simple' | 'complex' | 'gourmet' | 'honey';
  canningRecipeSort: 'name' | 'profit' | 'time' | 'difficulty';
  canningCanMakeOnly: boolean;
}

// ============================================================================
// SAVE/LOAD TYPES
// ============================================================================

/**
 * Loaded save data structure
 */
export interface LoadedSaveData {
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
  highestUnlockedVeggie?: number;
  globalAutoPurchaseTimer?: number;
  permanentBonuses?: string[];
  canningState?: CanningState;
  achievementState?: AchievementState;
  beeState?: BeeState;
}

// Re-export types that are commonly needed together
export type { EventUpgrade } from './christmasEvent';
export type { Achievement, AchievementState } from './achievements';
export type { BeeState, BeeContextValue, BeeUpgrade, BeeBox, BeekeeperAssistant } from './bees';
export type { Veggie } from './game';
