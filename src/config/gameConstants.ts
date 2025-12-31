/**
 * Game Constants Configuration
 * 
 * Central location for all game balance, costs, and configuration values.
 * Modify these values to tune game balance without changing core logic.
 */

// ============================================================================
// WEATHER SYSTEM
// ============================================================================

export const RAIN_CHANCES: Record<string, number> = {
  Spring: 0.20,
  Summer: 0.16,
  Fall: 0.14,
  Winter: 0.10
};

export const DROUGHT_CHANCES: Record<string, number> = {
  Spring: 0.012,
  Summer: 0.012,
  Fall: 0.016,
  Winter: 0.004
};

export const STORM_CHANCES: Record<string, number> = {
  Spring: 0.04,
  Summer: 0.06,
  Fall: 0.03,
  Winter: 0.01
};

export const HEATWAVE_CHANCE = 0.01; // 1% chance of heatwave any season

// Weather duration thresholds (days before clearing)
export const RAIN_DURATION_DAYS = 3;
export const DROUGHT_DURATION_DAYS = 5;
export const STORM_DURATION_DAYS = 2;
export const HEATWAVE_DURATION_DAYS = 4;

export const WEATHER_TYPES = ['Clear', 'Rain', 'Drought', 'Storm', 'Heatwave', 'Snow'] as const;
export type WeatherType = typeof WEATHER_TYPES[number];

// ============================================================================
// SEASON SYSTEM
// ============================================================================

export const SEASON_DURATION = 90; // Days per season
export const SEASON_BONUS = 0.1; // 10% growth bonus for seasonal vegetables

export const veggieSeasonBonuses: Record<string, string[]> = {
  Radish: ['Spring', 'Fall'],
  Lettuce: ['Spring', 'Fall'],
  Carrots: ['Spring', 'Fall'],
  Broccoli: ['Fall'],
  Cabbage: ['Spring', 'Fall'],
  Onions: ['Spring'],
  'Green Beans': ['Summer'],
  Zucchini: ['Summer'],
  Cucumbers: ['Summer'],
  Tomatoes: ['Summer'],
  Peppers: ['Summer'],
};

// ============================================================================
// GLOBAL UPGRADES
// ============================================================================

export const IRRIGATION_COST = 750;
export const IRRIGATION_KN_COST = 75;

export const MERCHANT_DAYS = 30; // Every 30 days
export const MERCHANT_COST = 1000;
export const MERCHANT_KN_COST = 100;

export const GREENHOUSE_COST_PER_PLOT = 500;
export const GREENHOUSE_KN_COST_PER_PLOT = 25;

export const HEIRLOOM_COST_PER_VEGGIE = 2500;
export const HEIRLOOM_KN_PER_VEGGIE = 200;

export const ALMANAC_BASE_COST = 10;
export const ALMANAC_LEVEL_COST_MULTIPLIER = 1.15;
export const ALMANAC_LEVEL_COST_ADDITION = 5;
export const ALMANAC_KNOWLEDGE_BONUS = 0.10; // 10% per level

// ============================================================================
// COST CONFIGURATIONS
// ============================================================================

export type CostConfig = {
  baseValue: number;
  firstVeggieDiscount: number; // Multiplier for first veggie (< 1 means cheaper)
  scalingFactor: number; // How fast costs increase per veggie tier
  levelScalingFactor: number; // How fast costs increase per upgrade level
};

export const COST_CONFIGS: Record<string, CostConfig> = {
  fertilizer: {
    baseValue: 10,
    firstVeggieDiscount: 0.5, // First veggie pays 50% of base
    scalingFactor: 1.4,
    levelScalingFactor: 1.25
  },
  harvester: {
    baseValue: 15,
    firstVeggieDiscount: 0.53,
    scalingFactor: 1.5,
    levelScalingFactor: 1.0 // No level scaling for one-time purchase
  },
  harvesterSpeed: {
    baseValue: 50,
    firstVeggieDiscount: 0.5,
    scalingFactor: 1.5,
    levelScalingFactor: 1.25
  },
  betterSeeds: {
    baseValue: 10,
    firstVeggieDiscount: 0.5,
    scalingFactor: 1.4,
    levelScalingFactor: 1.5
  },
  additionalPlot: {
    baseValue: 40,
    firstVeggieDiscount: 0.5,
    scalingFactor: 1.4,
    levelScalingFactor: 1.5
  },
  assistant: {
    baseValue: 300,
    firstVeggieDiscount: 1.0,
    scalingFactor: 1.45,
    levelScalingFactor: 1.0
  },
  cultivator: {
    baseValue: 250,
    firstVeggieDiscount: 1.0,
    scalingFactor: 1.45,
    levelScalingFactor: 1.0
  },
  surveyor: {
    baseValue: 350,
    firstVeggieDiscount: 1.0,
    scalingFactor: 1.45,
    levelScalingFactor: 1.0
  },
  mechanic: {
    baseValue: 300,
    firstVeggieDiscount: 1.0,
    scalingFactor: 1.45,
    levelScalingFactor: 1.0
  }
};

// ============================================================================
// EXPERIENCE & PROGRESSION
// ============================================================================

export const EXP_BASE_REQUIREMENT = 50;
export const EXP_SCALING_FACTOR = 1.8;

// ============================================================================
// FARM & PRESTIGE
// ============================================================================

export const INITIAL_MAX_PLOTS = 4;
export const FARM_BASE_COST = 500;
export const FARM_COST_SCALING = 1.85;
export const FARM_KNOWLEDGE_RETENTION = 0.25; // Keep 25% of knowledge on prestige
export const FARM_PLOTS_PER_EXP = 100; // Gain 1 plot per 100 exp (up to 2x current max)

// ============================================================================
// AUTO-HARVEST SYSTEM
// ============================================================================

export const HARVESTER_BASE_TIMER = 50; // Ticks between auto-harvests
export const AUTO_HARVEST_KNOWLEDGE_MULTIPLIER = 0.5; // Auto-harvest gives 50% knowledge
export const AUTO_HARVEST_EXPERIENCE_MULTIPLIER = 0.5; // Auto-harvest gives 50% experience

// ============================================================================
// AUTO-PURCHASER SYSTEM
// ============================================================================

export const AUTO_PURCHASER_CYCLE_DAYS = 7; // All auto-purchasers run every 7 days

// ============================================================================
// GROWTH MULTIPLIERS
// ============================================================================

export const FERTILIZER_BONUS_PER_LEVEL = 0.05; // 5% per level
export const BETTER_SEEDS_PRICE_MULTIPLIER = 1.25; // Normal
export const HEIRLOOM_PRICE_MULTIPLIER = 1.5; // With Heirloom Seeds upgrade
export const HARVESTER_SPEED_BONUS = 0.05; // 5% speed increase per level

// ============================================================================
// WEATHER EFFECTS
// ============================================================================

export const WINTER_PENALTY = 0.1; // 90% reduction (10% normal speed)
export const RAIN_BONUS = 0.2; // +20% growth
export const STORM_BONUS = 0.1; // +10% growth
export const DROUGHT_PENALTY = 0.5; // -50% growth (unless irrigated)
export const DROUGHT_KNOWLEDGE_BONUS = 1; // +1 knowledge per day during drought
export const HEATWAVE_PENALTY = 0.3; // -30% growth in summer
export const HEATWAVE_SUMMER_VEGGIE_BONUS = 0.2; // +20% for summer veggies in spring/fall
export const HEATWAVE_WINTER_BONUS = 0.2; // +20% for all veggies in winter
export const SNOW_PENALTY = 1.0; // -100% growth (complete stop unless greenhouse)

// ============================================================================
// GROWTH THRESHOLDS
// ============================================================================

export const GROWTH_COMPLETE_THRESHOLD = 100; // Growth percentage when ready to harvest

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

export const SLOW_RENDER_THRESHOLD_MS = 16; // 16ms per frame for 60fps
export const FREQUENT_RENDER_THRESHOLD = 50; // Flag components with >50 renders

// ============================================================================
// CANNING SYSTEM
// ============================================================================

export const CANNING_BASE_DURATION_SECONDS = 30; // Base canning time
export const CANNING_TICK_INTERVAL_MS = 100; // Canning progress tick rate

// Auto-canning configuration
export const AUTO_CANNING_EXCESS_THRESHOLD = 10; // Keep this many of each vegetable in reserve

// Canning auto-purchaser costs and cycle times
export const CANNING_AUTO_PURCHASER_CONFIG = {
  canningEngineer: {
    cycleDays: 10,
    cost: 2500,
  },
  preservationSpecialist: {
    cycleDays: 10,
    cost: 3000,
  },
  qualityInspector: {
    cycleDays: 12,
    cost: 4000,
  },
  factoryManager: {
    cycleDays: 15,
    cost: 7500,
  },
} as const;

// ============================================================================
// BEE SYSTEM
// ============================================================================

export const BEE_CONSTANTS = {
  // Production timing
  BASE_PRODUCTION_TIME: 132, // Days per harvest (reduced from 182 to account for 50-day winter pause)
  
  // Box limits
  STARTING_BEE_BOXES: 2,
  MAX_BEE_BOXES: 30,
  
  // Yield bonuses
  BASE_YIELD_BONUS_PER_BOX: 0.005, // 0.5% per box
  MAX_YIELD_BONUS: 1.0, // 100% max yield bonus from bees
  
  // Unlock requirements
  UNLOCK_FARM_TIER: 4,
  BEEKEEPER_ASSISTANT_UNLOCK_BOXES: 4,
  
  // Box purchase costs
  BOX_BASE_COST: 150, // First box costs 150 honey
  BOX_COST_INCREMENT: 75, // Each additional box costs 75 more
  
  // Beekeeper Assistant costs
  BEEKEEPER_BASE_UPGRADE_COST: 1500,
  BEEKEEPER_COST_SCALING: 1.5,
  BEEKEEPER_MAX_LEVEL: 10,
  
  // Golden honey
  BASE_GOLDEN_HONEY_CHANCE: 0.01, // 1% base chance
} as const;

// Bee upgrade costs (multiplied by 15 for honey economy balance)
export const BEE_UPGRADE_COSTS = {
  // Production upgrades
  busyBees: 75, // 5 * 15
  hexcombEngineering: 120, // 8 * 15
  swiftGatherers: 75, // 5 * 15 (golden honey)
  
  // Quality upgrades
  royalJelly: 375, // 25 * 15
  queensBlessing: 150, // 10 * 15 (golden honey)
  goldenTouch: 75, // 5 * 15 (golden honey)
  
  // Yield upgrades
  meadowMagic: 225, // 15 * 15
  flowerPower: 120, // 8 * 15 (golden honey)
  
  // Advanced upgrades
  winterHardiness: 45, // 3 * 15 (golden honey)
  nectarEfficiency: 30, // 2 * 15 (golden honey)
  hiveExpansion: 1500, // 100 * 15
} as const;

// ============================================================================
// KNOWLEDGE SYSTEM
// ============================================================================

export const MANUAL_HARVEST_KNOWLEDGE = 1; // Knowledge per manual harvest
export const AUTO_HARVEST_KNOWLEDGE = 0.5; // Knowledge per auto harvest
export const FARM_TIER_KNOWLEDGE_BONUS = 1.25; // Additional knowledge per harvest per farm tier

// ============================================================================
// STORAGE & SAVE
// ============================================================================

export const GAME_STORAGE_KEY = 'farmIdleGameState';
export const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

// ============================================================================
// UI & GAMEPLAY
// ============================================================================

export const GAME_LOOP_INTERVAL = 100; // Milliseconds per tick (10 ticks/second)
