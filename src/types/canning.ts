// Types for the Canning system in Farm Idle Game v1.5.0

export type CanningIngredient = {
  veggieIndex: number; // Index in the veggies array
  veggieName: string; // Name for display purposes
  quantity: number; // How many of this veggie needed
};

export type Recipe = {
  id: string; // Unique identifier for the recipe
  name: string; // Display name of the canned product
  description: string; // Description of what this recipe makes
  ingredients: CanningIngredient[]; // What veggies are needed
  processingTime: number; // Time in seconds to complete canning
  baseProcessingTime: number; // Original processing time (for upgrade calculations)
  salePrice: number; // How much the canned product sells for
  baseSalePrice: number; // Original sale price (for upgrade calculations)
  experienceRequired: number; // Experience needed to unlock this recipe
  unlocked: boolean; // Whether player has unlocked this recipe
  timesCompleted: number; // Track how many times player has made this recipe
};

export type CanningProcess = {
  recipeId: string; // Which recipe is being processed
  startTime: number; // When this process started (for save/load)
  remainingTime: number; // How much time is left in seconds
  totalTime: number; // Total processing time (including speed bonuses)
  completed: boolean; // Whether this process is finished
  automated?: boolean; // Whether this process was started automatically
};

export type CanningUpgrade = {
  id: string; // Unique identifier
  name: string; // Display name
  description: string; // What this upgrade does
  type: 'speed' | 'efficiency' | 'quality' | 'automation'; // Category of upgrade
  level: number; // Current level
  cost: number; // Current cost to upgrade
  baseCost: number; // Original cost (for scaling calculations)
  upgradeCostScaling: number; // How fast costs increase per upgrade level
  costCurrency: 'money' | 'knowledge'; // What currency this costs
  maxLevel?: number; // Optional max level
  effect: number; // Current effect value (calculated from level)
  unlocked: boolean; // Whether this upgrade is available
  experienceRequired?: number; // Experience needed to unlock
};

export type CanningState = {
  // Recipe management
  recipes: Recipe[];
  unlockedRecipes: string[]; // Array of recipe IDs that are unlocked
  
  // Active canning processes
  activeProcesses: CanningProcess[];
  maxSimultaneousProcesses: number; // How many can be running at once
  
  // Upgrades
  upgrades: CanningUpgrade[];
  
  // Stats and progression
  totalItemsCanned: number; // Lifetime counter
  canningExperience: number; // Separate experience for canning unlocks
  
  // Auto-canning system
  autoCanning: {
    enabled: boolean;
    selectedRecipes: string[]; // Which recipes to auto-make
    priorityOrder: string[]; // Order to attempt recipes
  };
};

// Canning-related upgrade types for individual veggies
export type VeggieCanningUpgrade = {
  // Per-veggie upgrades that affect canning
  canningYield: {
    level: number;
    cost: number;
    effect: number; // Multiplier for how many vegetables this veggie produces when harvested
  };
  canningQuality: {
    level: number;
    cost: number;
    effect: number; // Multiplier for sale price when this veggie is used in recipes
  };
};

// Configuration for recipe definitions
export type RecipeConfig = {
  id: string;
  name: string;
  description: string;
  ingredients: Array<{
    veggieName: string;
    quantity: number;
  }>;
  baseProcessingTime: number; // In seconds
  baseSalePrice: number;
  experienceRequired: number;
  category: 'simple' | 'complex' | 'gourmet'; // Difficulty categories
};

// Auto-purchase configuration for canning upgrades
export type CanningAutoPurchase = {
  id: string;
  name: string;
  upgradeId: string; // Which upgrade this auto-purchases
  cycleDays: number; // How often it attempts to purchase
  owned: boolean;
  active: boolean;
  cost: number;
  timer: number;
  costCurrency: 'money' | 'knowledge';
};

// Lean save format - only stores player progress, not game constants
export type LeanCanningProgress = {
  // Upgrade progress (just levels)
  upgradeProgress: Record<string, number>; // upgradeId -> level
  
  // Recipe progress
  unlockedRecipes: string[]; // Recipe IDs that are unlocked
  recipeCompletions: Record<string, number>; // recipeId -> times completed
  
  // Active processes (minimal data needed to restore)
  activeProcesses: Array<{
    recipeId: string;
    startTime: number;
    remainingTime: number;
    totalTime: number;
    automated?: boolean;
  }>;
  
  // Player stats
  totalItemsCanned: number;
  canningExperience: number;
  maxSimultaneousProcesses: number;
  
  // Auto-canning preferences
  autoCanning: {
    enabled: boolean;
    selectedRecipes: string[];
    priorityOrder: string[];
  };
};