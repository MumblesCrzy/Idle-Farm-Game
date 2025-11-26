/**
 * Bee System Type Definitions
 * 
 * Type definitions for the Bee System feature (v0.9.0).
 * Players manage Bee Boxes that produce Honey every 6 months (182 seconds).
 * Honey unlocks unique canning recipes and Bee Boxes boost crop yields.
 * Requires Tier 3+ farm to unlock.
 */

// ============================================================================
// BEE PRODUCTION CONSTANTS
// ============================================================================

/**
 * Production timing constants
 */
export const BEE_CONSTANTS = {
  BASE_PRODUCTION_TIME: 182, // 6 months in seconds (6 * 30.33 days ≈ 182 seconds)
  STARTING_BEE_BOXES: 2,
  MAX_BEE_BOXES: 50,
  BASE_YIELD_BONUS_PER_BOX: 0.005, // 0.5% crop yield bonus per box
  UNLOCK_FARM_TIER: 3, // Tier 3+ required to unlock bees
  BEEKEEPER_ASSISTANT_UNLOCK_BOXES: 4, // Unlock assistant after owning 4-6 boxes
} as const;

// ============================================================================
// BEE BOX TYPES
// ============================================================================

/**
 * Individual bee box state
 */
export interface BeeBox {
  id: string; // Unique identifier for this box
  active: boolean; // Whether this box is actively producing
  productionTimer: number; // Current progress toward next honey (0 to productionTime)
  productionTime: number; // Time required for one honey (base: 182 seconds, affected by upgrades)
  honeyProduced: number; // Total honey produced by this box (lifetime stat)
  lastHarvestTime: number; // Timestamp of last harvest (for offline calculation)
  harvestReady: boolean; // Whether honey is ready to collect
}

/**
 * Types of honey that can be produced
 */
export type HoneyType = 'regular' | 'golden';

/**
 * Honey production result
 */
export interface HoneyProduction {
  type: HoneyType;
  amount: number;
  boxId: string;
}

// ============================================================================
// BEE STATE
// ============================================================================

/**
 * Complete state for the Bee System
 */
export interface BeeState {
  // System meta
  unlocked: boolean; // Whether bees are unlocked (Tier 3+)
  firstTimeSetup: boolean; // Whether initial boxes have been given
  
  // Bee boxes
  boxes: BeeBox[];
  maxBoxes: number; // Current max (starts at 50, can be expanded)
  
  // Honey inventory
  regularHoney: number; // Regular honey count
  goldenHoney: number; // Golden honey count (rarer, produced with upgrades)
  totalHoneyCollected: number; // Lifetime stat
  totalGoldenHoneyCollected: number; // Lifetime stat
  
  // Production stats
  lastUpdateTime: number; // Timestamp for offline progress calculation
  honeyPerSecond: number; // Current production rate (for display)
  
  // Upgrades
  upgrades: BeeUpgrade[];
  
  // Beekeeper Assistant
  beekeeperAssistant: BeekeeperAssistant;
  
  // Progression tracking
  totalBoxesPurchased: number; // Lifetime stat
  honeySpent: number; // Lifetime honey spent on upgrades
}

// ============================================================================
// UPGRADE TYPES
// ============================================================================

/**
 * Categories for bee upgrades
 */
export type BeeUpgradeCategory = 'production' | 'quality' | 'yield' | 'automation';

/**
 * Individual bee upgrade
 */
export interface BeeUpgrade {
  id: string;
  name: string;
  description: string;
  category: BeeUpgradeCategory;
  icon: string; // Emoji or icon identifier
  
  // Cost and purchase state
  cost: number; // Honey cost
  baseCost: number; // Original cost (for scaling calculations)
  costScaling?: number; // Cost multiplier per level (for repeatable upgrades)
  costCurrency: 'regularHoney' | 'goldenHoney'; // Which honey type required
  purchased: boolean;
  
  // Effect properties
  effect: number; // Current effect value (calculated from level)
  effectType: BeeUpgradeEffectType;
  effectValue: number; // Base effect value per level
  
  // Repeatable upgrade properties
  repeatable: boolean;
  level: number; // Current level (0 if not purchased)
  maxLevel?: number; // Maximum level (undefined = no cap)
  
  // Unlock conditions
  unlocked: boolean;
  requiredBoxes?: number; // Number of boxes required to unlock this upgrade
  requiredUpgrades?: string[]; // Other upgrade IDs that must be purchased first
}

/**
 * Types of effects that upgrades can provide
 */
export type BeeUpgradeEffectType =
  | 'productionSpeed'    // Reduces production time (e.g., Busy Bees +1% speed)
  | 'goldenHoneyChance'  // Chance to produce Golden Honey (e.g., Royal Jelly 5%)
  | 'honeyProduction'    // Increases honey output (e.g., Hexcomb Engineering +5%)
  | 'cropYieldBonus'     // Increases yield bonus per box (e.g., Meadow Magic +0.5%)
  | 'automationSpeed'    // Reduces automation delay (Beekeeper Assistant)
  | 'goldenHoneyDouble'; // Doubles Golden Honey chance (Queen's Blessing)

// ============================================================================
// BEEKEEPER ASSISTANT
// ============================================================================

/**
 * Beekeeper Assistant state (automation helper)
 */
export interface BeekeeperAssistant {
  unlocked: boolean;
  active: boolean;
  
  // Effects
  autoCollectEnabled: boolean; // Automatically collects honey when ready
  productionSpeedBonus: number; // Percentage bonus to production speed
  downtimeReduction: number; // Reduces time between harvests
  
  // Upgrade tracking
  level: number;
  upgradeCost: number;
  baseUpgradeCost: number;
  costScaling: number;
  maxLevel: number;
}

// ============================================================================
// BEE ACTIONS
// ============================================================================

/**
 * Action types for bee state management
 */
export interface BeeActions {
  // Bee box management
  addBeeBox: () => boolean; // Returns success
  removeBeeBox: (boxId: string) => boolean; // For potential future use
  harvestHoney: (boxId: string) => HoneyProduction | null;
  harvestAllHoney: () => HoneyProduction[];
  
  // Production
  updateProduction: (deltaTime: number) => void; // Update timers based on elapsed time
  checkReadyBoxes: () => string[]; // Returns IDs of boxes ready to harvest
  
  // Upgrades
  purchaseUpgrade: (upgradeId: string) => boolean;
  canAffordUpgrade: (upgradeId: string) => boolean;
  
  // Beekeeper Assistant
  unlockBeekeeperAssistant: () => boolean;
  upgradeBeekeeperAssistant: () => boolean;
  toggleBeekeeperAssistant: (active: boolean) => void;
  
  // System management
  initializeBeeSystem: () => void; // Called when player reaches Tier 3
  calculateYieldBonus: () => number; // Calculate total crop yield bonus from all boxes
  calculateProductionRate: () => number; // Calculate honey per second
  calculateHoneyProductionMultiplier: () => number; // Calculate honey production multiplier from upgrades
  resetBeeSystem: () => void; // Reset bee system to initial state
  
  // Dev tools helpers
  devAddHoney?: (amount: number) => void; // Dev tool: add regular honey
  devAddGoldenHoney?: (amount: number) => void; // Dev tool: add golden honey
  devCompleteAllBoxes?: () => void; // Dev tool: instantly complete all box production
}

// ============================================================================
// HONEY RECIPE TYPES
// ============================================================================

/**
 * Honey-based canning recipe tier
 */
export type HoneyRecipeTier = 'tier1' | 'tier2' | 'tier3' | 'tier4' | 'tier5';

/**
 * Honey requirement for recipes
 */
export interface HoneyRequirement {
  regularHoney?: number;
  goldenHoney?: number;
}

/**
 * Extended recipe ingredient that includes honey
 */
export interface HoneyRecipeIngredient {
  veggieIndex?: number; // Index in veggies array (undefined for honey)
  veggieName?: string; // Veggie name
  honeyType?: HoneyType; // 'regular' or 'golden' (for honey ingredients)
  quantity: number;
}

/**
 * Honey-based canning recipe
 */
export interface HoneyRecipe {
  id: string;
  name: string;
  description: string;
  tier: HoneyRecipeTier;
  
  // Ingredients (mix of veggies and honey)
  ingredients: HoneyRecipeIngredient[];
  honeyRequirement: HoneyRequirement;
  
  // Recipe properties
  processingTime: number;
  baseProcessingTime: number;
  salePrice: number;
  baseSalePrice: number;
  
  // Unlock conditions
  unlocked: boolean;
  honeyCollectedRequired: number; // Total honey collected to unlock
  experienceRequired: number;
  
  // Stats
  timesCompleted: number;
}

// ============================================================================
// ACHIEVEMENT TYPES
// ============================================================================

/**
 * Bee-related achievement
 */
export interface BeeAchievement {
  id: string;
  name: string;
  description: string;
  condition: BeeAchievementCondition;
  reward?: string; // Optional reward description
  completed: boolean;
}

/**
 * Condition for bee achievement
 */
export interface BeeAchievementCondition {
  type: 'honeyCollected' | 'goldenHoneyCollected' | 'boxesOwned' | 'upgradesPurchased' | 'recipeCompleted';
  target: number;
  specificRecipeId?: string; // For recipe completion achievements
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Bee system statistics for display
 */
export interface BeeStats {
  totalBoxes: number;
  activeBoxes: number;
  readyBoxes: number;
  totalHoneyProduced: number;
  totalGoldenHoneyProduced: number;
  currentYieldBonus: number; // As percentage
  honeyPerHour: number;
  averageProductionTime: number; // In seconds
}

/**
 * Bee box purchase information
 */
export interface BeeBoxPurchaseInfo {
  cost: number; // Cost in regular honey
  canAfford: boolean;
  atMaxCapacity: boolean;
  currentCount: number;
  maxCount: number;
  yieldBonusGain: number; // How much yield bonus will increase
}

/**
 * Upgrade effect calculation
 */
export interface UpgradeEffect {
  upgradeId: string;
  effectType: BeeUpgradeEffectType;
  currentValue: number;
  nextLevelValue: number;
  isMaxLevel: boolean;
}

// ============================================================================
// SAVE DATA TYPES
// ============================================================================

/**
 * Lean save format for bee system - only stores player progress
 */
export interface LeanBeeProgress {
  // System state
  unlocked: boolean;
  firstTimeSetup: boolean;
  
  // Boxes (minimal data)
  boxes: Array<{
    id: string;
    active: boolean;
    productionTimer: number;
    honeyProduced: number;
    lastHarvestTime: number;
    harvestReady: boolean;
  }>;
  
  // Inventory
  regularHoney: number;
  goldenHoney: number;
  totalHoneyCollected: number;
  totalGoldenHoneyCollected: number;
  
  // Upgrades (just purchased state and levels)
  upgradeProgress: Record<string, { purchased: boolean; level: number }>;
  
  // Assistant
  beekeeperAssistant: {
    unlocked: boolean;
    active: boolean;
    level: number;
  };
  
  // Stats
  lastUpdateTime: number;
  totalBoxesPurchased: number;
  honeySpent: number;
  
  // Honey recipes (unlocked and completion counts)
  unlockedHoneyRecipes: string[];
  honeyRecipeCompletions: Record<string, number>;
}

// ============================================================================
// CONTEXT PROPS
// ============================================================================

/**
 * Props for BeeContext provider
 */
export interface BeeContextProps {
  children: React.ReactNode;
}

/**
 * Complete Bee Context value
 */
export interface BeeContextValue extends BeeState, BeeActions {
  // Additional helper methods
  getBeeStats: () => BeeStats;
  getBeeBoxPurchaseInfo: () => BeeBoxPurchaseInfo;
  getUpgradeEffect: (upgradeId: string) => UpgradeEffect | null;
  canAffordBeeBox: () => boolean;
}
