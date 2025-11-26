/**
 * Core Game Type Definitions
 * 
 * Centralized type definitions for the Farm Idle Game.
 * Import these types throughout the application for consistency.
 */

import type { WeatherType } from '../config/gameConstants';

// ============================================================================
// AUTO-PURCHASE SYSTEM TYPES
// ============================================================================

export type CurrencyType = 'money' | 'knowledge';

export type AutoPurchaseType = 
  | 'fertilizer' 
  | 'betterSeeds' 
  | 'harvesterSpeed' 
  | 'additionalPlot';

export interface AutoPurchaseConfig {
  id: string;
  name: string;
  purchaseType: AutoPurchaseType;
  currencyType: CurrencyType;
  cycleDays: number; // How many days between purchases
  owned: boolean;
  active: boolean;
  cost: number;
  timer: number; // Current progress (0 to cycleDays-1)
}

// ============================================================================
// VEGETABLE TYPES
// ============================================================================

export interface Veggie {
  name: string;
  growth: number;
  growthRate: number;
  stash: number;
  unlocked: boolean;
  experience: number;
  experienceToUnlock: number;
  
  // Fertilizer upgrade
  fertilizerLevel: number;
  fertilizerCost: number;
  fertilizerMaxLevel: number;
  
  // Harvester system
  harvesterOwned: boolean;
  harvesterCost: number;
  harvesterTimer: number;
  harvesterSpeedLevel?: number;
  harvesterSpeedCost?: number;
  
  // Pricing and seeds
  salePrice: number;
  betterSeedsLevel: number;
  betterSeedsCost: number;
  
  // Plot management
  additionalPlotLevel: number;
  additionalPlotCost: number;
  
  // Auto-purchase system
  autoPurchasers: AutoPurchaseConfig[];
  
  // Sell control
  sellEnabled: boolean;
}

// ============================================================================
// SEASON & WEATHER TYPES
// ============================================================================

export type SeasonType = 'Spring' | 'Summer' | 'Fall' | 'Winter';

// Re-export WeatherType from constants for convenience
export type { WeatherType };

// ============================================================================
// GAME STATE TYPE
// ============================================================================

export interface GameState {
  // Weather & Season
  currentWeather: WeatherType;
  setCurrentWeather: React.Dispatch<React.SetStateAction<WeatherType>>;
  
  // Core Resources
  veggies: Veggie[];
  setVeggies: React.Dispatch<React.SetStateAction<Veggie[]>>;
  money: number;
  setMoney: React.Dispatch<React.SetStateAction<number>>;
  experience: number;
  setExperience: React.Dispatch<React.SetStateAction<number>>;
  knowledge: number;
  setKnowledge: React.Dispatch<React.SetStateAction<number>>;
  
  // Time & Progression
  day: number;
  setDay: React.Dispatch<React.SetStateAction<number>>;
  totalDaysElapsed: number;
  setTotalDaysElapsed: React.Dispatch<React.SetStateAction<number>>;
  
  // Statistics
  totalHarvests: number;
  setTotalHarvests: React.Dispatch<React.SetStateAction<number>>;
  
  // Auto-Purchase System
  globalAutoPurchaseTimer: number;
  setGlobalAutoPurchaseTimer: React.Dispatch<React.SetStateAction<number>>;
  
  // Active Selection
  activeVeggie: number;
  setActiveVeggie: (i: number) => void;
  
  // Core Actions
  handleHarvest: () => void;
  handleToggleSell: (index: number) => void;
  handleSell: () => void;
  
  // Veggie Upgrades
  handleBuyFertilizer: (index: number) => void;
  handleBuyHarvester: (index: number) => void;
  handleBuyHarvesterSpeed: (index: number) => void;
  handleBuyBetterSeeds: (index: number) => void;
  handleBuyAdditionalPlot: (index: number) => void;
  handleBuyAutoPurchaser: (autoPurchaseId: string) => (index: number) => void;
  
  // Global Upgrades - Irrigation
  irrigationOwned: boolean;
  setIrrigationOwned: React.Dispatch<React.SetStateAction<boolean>>;
  irrigationCost: number;
  irrigationKnCost: number;
  handleBuyIrrigation: () => void;
  
  // Global Upgrades - Greenhouse
  greenhouseOwned: boolean;
  setGreenhouseOwned: React.Dispatch<React.SetStateAction<boolean>>;
  handleBuyGreenhouse: () => void;
  
  // Global Upgrades - Heirloom Seeds
  heirloomOwned: boolean;
  setHeirloomOwned: React.Dispatch<React.SetStateAction<boolean>>;
  heirloomMoneyCost: number;
  heirloomKnowledgeCost: number;
  handleBuyHeirloom: () => void;
  
  // Global Upgrades - Auto-Sell (Merchant)
  autoSellOwned: boolean;
  setAutoSellOwned: React.Dispatch<React.SetStateAction<boolean>>;
  handleBuyAutoSell: () => void;
  
  // Global Upgrades - Almanac
  almanacLevel: number;
  setAlmanacLevel: React.Dispatch<React.SetStateAction<number>>;
  almanacCost: number;
  setAlmanacCost: React.Dispatch<React.SetStateAction<number>>;
  handleBuyAlmanac: () => void;
  
  // Farm Expansion (Prestige)
  maxPlots: number;
  setMaxPlots: React.Dispatch<React.SetStateAction<number>>;
  farmCost: number;
  setFarmCost: React.Dispatch<React.SetStateAction<number>>;
  farmTier: number;
  setFarmTier: React.Dispatch<React.SetStateAction<number>>;
  handleBuyLargerFarm: () => void;
  
  // Progression Tracking
  highestUnlockedVeggie: number;
  setHighestUnlockedVeggie: React.Dispatch<React.SetStateAction<number>>;
  
  // Permanent Bonuses (from achievements)
  permanentBonuses: string[];
  setPermanentBonuses: React.Dispatch<React.SetStateAction<string[]>>;
  
  // Bee System Integration
  beeYieldBonus: number;
  setBeeYieldBonus: React.Dispatch<React.SetStateAction<number>>;
  
  // Game Management
  resetGame: () => void;
  
  // Christmas Event (seasonal)
  christmasEvent?: {
    eventState: any;
    isEventActive: boolean;
    holidayCheer: number;
    earnCheer: (amount: number) => void;
    spendCheer: (amount: number) => boolean;
    treePlots: any[];
    materials: any;
    plantTree: (plotIndex: number, treeType: 'pine' | 'spruce' | 'fir') => void;
    harvestTree: (plotIndex: number) => void;
    harvestAllTrees: () => void;
    craftItem: (recipeId: string, quantity: number) => boolean;
    decorateTree: (treeType: 'pine' | 'spruce' | 'fir', decorations: any[]) => boolean;
    addToDecorationQueue: (treeType: 'pine' | 'spruce' | 'fir', decorations: any[]) => void;
    removeFromQueue: (queueItemId: string) => void;
    sellTrees: (variant: any, quantity: number) => void;
    sellAllTrees: () => void;
    sellGarland: (quantity: number) => void;
    sellCandle: (quantity: number) => void;
    sellOrnament: (quantity: number) => void;
    claimDailyBonus: () => boolean;
    totalTreesSold: number;
    purchaseUpgrade: (upgradeId: string) => boolean;
    claimMilestone: (milestoneId: string) => boolean;
    toggleCosmetic: (cosmeticId: string) => void;
    updatePassiveIncome: (deltaTime: number) => void;
    processTreeGrowth: () => void;
    checkEventActive: () => boolean;
  };
  
  // Bee System (v0.9.0)
  beeSystem?: {
    unlocked: boolean;
    regularHoney: number;
    goldenHoney: number;
    totalHoneyCollected: number;
    boxes: any[];
    upgrades: any[];
    beekeeperAssistant: any;
    addBeeBox: () => boolean;
    harvestHoney: (boxId: string) => any;
    harvestAllHoney: () => any[];
    purchaseUpgrade: (upgradeId: string) => boolean;
    unlockBeekeeperAssistant: () => boolean;
    upgradeBeekeeperAssistant: () => boolean;
    toggleBeekeeperAssistant: (active: boolean) => void;
    calculateYieldBonus: () => number;
    getBeeStats: () => any;
  };
}

// ============================================================================
// UI & COMPONENT PROP TYPES
// ============================================================================

export interface BaseTabProps {
  label: string;
  active: boolean;
}

export type InfoCategory = 'seasons' | 'farm' | 'veggies' | 'upgrades' | 'autopurchase' | 'canning' | 'christmas' | 'bees';

export type RecipeFilter = 'all' | 'available' | 'simple' | 'complex' | 'gourmet' | 'honey';
export type RecipeSort = 'name' | 'profit' | 'time' | 'difficulty';

// ============================================================================
// EVENT LOG TYPES
// ============================================================================

/**
 * Categories for event log entries
 */
export type EventCategory = 
  | 'weather'       // Weather changes (rain, drought, storms, etc.)
  | 'growth'        // Growth milestones (veggie ready, unlocks)
  | 'harvest'       // Manual and auto-harvest events
  | 'auto-purchase' // Auto-purchaser activities
  | 'merchant'      // Merchant sales and manual sells
  | 'canning'       // Canning activities (start, complete, upgrades)
  | 'milestone'     // Major achievements (farm tier, experience milestones)
  | 'bees'          // Bee system activities (honey harvest, upgrades, box purchases)
  | 'christmas';    // Christmas Tree Shop event activities (harvest, sell, craft, upgrades)

/**
 * Priority levels for event log entries
 * Affects visual styling and importance
 */
export type EventPriority = 'critical' | 'important' | 'normal' | 'minor';

/**
 * Timestamp for event log entries using in-game time
 */
export interface EventTimestamp {
  year: number;      // Farm tier (1-based)
  day: number;       // Day of year (1-365)
  totalDays: number; // Total days elapsed since game start
}

/**
 * Metadata attached to events for filtering and display
 */
export interface EventMetadata {
  // Common fields
  veggieName?: string;
  veggieIndex?: number;
  amount?: number;
  cost?: number;
  moneyGained?: number;
  knowledgeGained?: number;
  experienceGained?: number;
  
  // Weather specific
  weatherType?: WeatherType;
  previousWeather?: WeatherType;
  
  // Upgrade specific
  upgradeType?: string;
  upgradeLevel?: number;
  
  // Canning specific
  recipeName?: string;
  processingTime?: number;
  
  // Auto-purchase specific
  autoPurchaserName?: string;
  autoPurchaserActive?: boolean;
  
  // Merchant specific
  veggiesSold?: Array<{ name: string; quantity: number; earnings: number }>;
  
  // Christmas event specific
  treeType?: string;
  quality?: string;
  quantity?: number;
  cheerEarned?: number;
  itemName?: string;
  upgradeName?: string;
  milestoneName?: string;
}

/**
 * Individual event log entry
 */
export interface EventLogEntry {
  id: string;              // Unique identifier (timestamp + random)
  timestamp: EventTimestamp;
  category: EventCategory;
  priority: EventPriority;
  message: string;         // Human-readable message
  details?: string;        // Optional additional details
  metadata?: EventMetadata; // Structured data for filtering/display
  icon?: string;           // Optional emoji or icon identifier
}

/**
 * Event log state and configuration
 */
export interface EventLogState {
  entries: EventLogEntry[];
  maxEntries: number;      // Maximum number of entries to keep (default: 100)
  unreadCount: number;     // Number of unread events
  lastReadId?: string;     // ID of last read event
}

/**
 * Filter state for event log display
 */
export interface EventLogFilter {
  categories: EventCategory[]; // Empty array = show all
  priority?: EventPriority;    // Minimum priority to show
  searchTerm?: string;         // Text search filter
}
