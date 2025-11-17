/**
 * Christmas Tree Shop Event Type Definitions
 * 
 * Type definitions for the seasonal Christmas Tree Shop event (Nov 1 - Dec 25).
 * This event features tree cultivation, decoration crafting, and holiday sales.
 */

// ============================================================================
// TREE TYPES
// ============================================================================

/**
 * Types of evergreen trees that can be grown
 */
export type TreeType = 'pine' | 'spruce' | 'fir';

/**
 * Quality variants for trees
 */
export type TreeQuality = 'normal' | 'perfect' | 'luxury';

/**
 * Decoration types that can be applied to trees
 * Note: Garland is now a standalone item for sale, not a tree decoration
 */
export type DecorationType = 'ornament' | 'candle';

/**
 * Tree decoration state - tracks which decorations have been applied
 */
export interface TreeDecorations {
  ornaments: boolean;
  garland: boolean; // Keep for backwards compatibility with saved games
  candles: boolean;
}

/**
 * Individual tree plot state
 */
export interface TreePlot {
  id: string;
  treeType: TreeType | null;    // null = empty plot
  growth: number;                // 0 to growthTime
  growthTime: number;            // Base: 7 in-game years (7 * 365 days)
  quality: TreeQuality;
  decorations: TreeDecorations;
  harvestReady: boolean;
}

/**
 * Materials yielded from tree harvest
 */
export interface TreeYield {
  wood: number;
  pinecones: number;
  branches: number;
}

// ============================================================================
// DECORATION & CRAFTING TYPES
// ============================================================================

/**
 * Crafting material inventory
 */
export interface CraftingMaterials {
  wood: number;
  pinecones: number;
  branches: number;
  ornaments: number;
  garlands: number;
  naturalOrnaments: number;
  candles: number;
}

/**
 * Crafting recipe definition
 */
export interface CraftingRecipe {
  id: string;
  name: string;
  description: string;
  inputs: Partial<CraftingMaterials>;
  output: Partial<CraftingMaterials>;
  craftTime: number; // In days (for automation)
  requiredUpgrade?: string; // Optional upgrade ID required to unlock this recipe
}

/**
 * Elves' Bench automation queue item
 */
export interface DecorationQueueItem {
  id: string;
  treeType: TreeType;
  decorations: DecorationType[];
  progress: number;
  duration: number;
}

// ============================================================================
// SALES TYPES
// ============================================================================

/**
 * Tree variant for sale (combines type, quality, and decorations)
 */
export interface TreeVariant {
  treeType: TreeType;
  quality: TreeQuality;
  decorations: TreeDecorations;
}

/**
 * Inventory of finished trees ready for sale
 */
export interface TreeInventory {
  [key: string]: number; // Serialized TreeVariant -> quantity
}

/**
 * Customer demand and pricing information
 */
export interface MarketDemand {
  basePrice: number;
  demandMultiplier: number; // Increases toward Christmas
  lastUpdate: Date;
}

/**
 * Daily customer bonus
 */
export interface DailyBonus {
  claimed: boolean;
  lastClaimDate: string; // ISO date string
  bonusAmount: number;
}

// ============================================================================
// UPGRADE TYPES
// ============================================================================

/**
 * Event-specific upgrade categories
 */
export type EventUpgradeCategory = 'farming' | 'workshop' | 'shopfront';

/**
 * Individual event upgrade
 */
export interface EventUpgrade {
  id: string;
  name: string;
  description: string;
  category: EventUpgradeCategory;
  icon: string;
  cost: number; // Holiday Cheer cost
  owned: boolean;
  effect?: string; // Human-readable effect description
  
  // Upgrade-specific properties
  speedBonus?: number;      // e.g., +25% for Fertilized Soil
  valueBonus?: number;      // e.g., +10% for Garland Station
  procChance?: number;      // e.g., 10% for Evergreen Essence
  passiveIncome?: number;   // Cheer/second for Golden Bell Counter
  multiplier?: number;      // e.g., 3x for Star Forge
  
  // Repeatable upgrade properties
  repeatable?: boolean;     // Can be purchased multiple times
  level?: number;           // Current level (for repeatable upgrades)
  maxLevel?: number;        // Maximum level (for repeatable upgrades)
  costScaling?: number;     // Cost multiplier per level (e.g., 1.5x)
}

// ============================================================================
// MILESTONE TYPES
// ============================================================================

/**
 * Event milestone definition
 */
export interface EventMilestone {
  id: string;
  name: string;
  description: string;
  requirement: number; // Trees sold
  claimed: boolean;
  reward: MilestoneReward;
}

/**
 * Reward types from milestones
 */
export type MilestoneRewardType = 
  | 'cosmetic'      // Visual customization
  | 'permanent'     // Permanent gameplay bonus
  | 'recipe'        // New canning recipe
  | 'currency';     // Holiday Cheer bonus

/**
 * Milestone reward definition
 */
export interface MilestoneReward {
  type: MilestoneRewardType;
  name: string;
  description: string;
  
  // Type-specific properties
  cosmeticId?: string;        // e.g., 'archie_reindeer_hat'
  permanentBonusId?: string;  // e.g., 'frost_fertilizer'
  recipeId?: string;          // e.g., 'canners_cocoa'
  cheerAmount?: number;
}

// ============================================================================
// EVENT STATE
// ============================================================================

/**
 * Complete state for the Christmas Tree Shop event
 */
export interface ChristmasEventState {
  // Event meta
  isActive: boolean;
  eventYear: number; // Year of current event (for progress tracking)
  
  // Currency
  holidayCheer: number;
  totalCheerEarned: number;
  
  // Tree farming
  treePlots: TreePlot[];
  maxPlots: number; // Default 6, expandable to 12
  
  // Materials & Inventory
  materials: CraftingMaterials;
  treeInventory: TreeInventory;
  
  // Workshop
  decorationQueue: DecorationQueueItem[];
  maxQueueSize: number;
  
  // Sales
  totalTreesSold: number;
  marketDemand: MarketDemand;
  dailyBonus: DailyBonus;
  passiveCheerPerSecond: number;
  
  // Progression
  upgrades: EventUpgrade[];
  milestones: EventMilestone[];
  
  // Cosmetics & Permanent Rewards (permanent unlocks)
  unlockedCosmetics: string[];
  activeCosmetics: string[];
  permanentBonuses: string[]; // e.g., ['frost_fertilizer', 'elves_bench_unlock']
  unlockedRecipes: string[];  // e.g., ['canners_cocoa']
  
  // Elves' Bench tracking
  currentElvesAction?: {
    type: 'craft' | 'decorate';
    recipeId?: string; // For crafting (e.g., 'garland', 'candles', 'ornaments_wood', 'ornaments_pinecone')
    decorationType?: string; // For decorating (e.g., 'luxury', 'candled', 'ornamented')
  };
}

// ============================================================================
// EVENT ACTIONS
// ============================================================================

/**
 * Action types for event state management
 */
export interface ChristmasEventActions {
  // Tree Management
  plantTree: (plotIndex: number, treeType: TreeType) => void;
  harvestTree: (plotIndex: number) => void;
  harvestAllTrees: () => void;
  
  // Crafting
  craftItem: (recipeId: string, quantity: number) => void;
  decorateTree: (treeType: TreeType, decorations: DecorationType[]) => void;
  
  // Automation
  addToDecorationQueue: (treeType: TreeType, decorations: DecorationType[]) => void;
  removeFromQueue: (queueItemId: string) => void;
  
  // Sales
  sellTrees: (variant: TreeVariant, quantity: number) => void;
  sellAllTrees: () => void;
  claimDailyBonus: () => void;
  
  // Upgrades
  purchaseUpgrade: (upgradeId: string) => void;
  claimMilestone: (milestoneId: string) => void;
  
  // Cosmetics
  toggleCosmetic: (cosmeticId: string) => void;
  
  // Event lifecycle
  initializeEvent: () => void;
  checkEventActive: () => boolean;
  updatePassiveIncome: (deltaTime: number) => void;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Helper type for tree variant serialization
 */
export interface TreeVariantKey {
  type: TreeType;
  quality: TreeQuality;
  hasOrnaments: boolean;
  hasGarland: boolean;
  hasCandles: boolean;
}

/**
 * Tree statistics for display
 */
export interface TreeStats {
  baseValue: number;
  decorationBonus: number;
  qualityMultiplier: number;
  demandMultiplier: number;
  finalValue: number;
}

/**
 * Workshop statistics
 */
export interface WorkshopStats {
  queuedItems: number;
  processingSpeed: number; // Items per day
  automationActive: boolean;
}

/**
 * Shopfront statistics
 */
export interface ShopfrontStats {
  totalInventoryValue: number;
  dailySales: number;
  weekToChristmas: number;
  demandTrend: 'increasing' | 'stable' | 'decreasing';
}
