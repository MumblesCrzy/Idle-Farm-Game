/**
 * Christmas Tree Shop Event Data
 * 
 * Static data and configuration for the Christmas Tree Shop event.
 * Includes tree definitions, crafting recipes, upgrades, and milestones.
 */

import {
  DECORATION_CANDLE,
  DECORATION_GARLAND,
  DECORATION_WREATH,
  ICON_AXE,
  ICON_CHEERFUL_CRAFTING,
  ICON_ELVES,
  ICON_ELVES_BENCH,
  ICON_ELVES_INDICATOR,
  ICON_EVERGREEN_ESSENCE,
  ICON_FERTILIZED_SOIL,
  ICON_FIREPLACE,
  ICON_GOLD_STAR,
  ICON_GREENHOUSE_EXTENSION,
  ICON_HOLIDAY_BELL,
  ICON_HOLIDAY_CHEER,
  ICON_HOLIDAY_REGISTER,
  ICON_ORNAMENT,
  ICON_ORNAMENT_WORKBENCH,
  ICON_SPARKLES,
  ICON_STAR_FORGE,
  ICON_TRADITIONAL_ORNAMENT,
  ICON_TREE_SHOP,
  ICON_TREE_STOREFRONT,
  ICON_TREE_WORKSHOP,
  MATERIAL_BRANCH,
  MATERIAL_PINECONE,
  MATERIAL_WOOD,
  TREE_DECORATED,
  TREE_FIR,
  TREE_PINE,
  TREE_SAPLING,
  TREE_SPRUCE
} from '../config/assetPaths';
import type { EventArtSource } from '../components/EventArt';
import type {
  TreeQuality,
  CraftingRecipe,
  EventUpgrade,
  EventMilestone,
} from '../types/christmasEvent';

// ============================================================================
// ART
// ============================================================================

/** Tree Shop art: each image, with an emoji for when it cannot load */
export const CHRISTMAS_ART = {
  farm: { image: ICON_TREE_SHOP, emoji: '🌲' },
  workshop: { image: ICON_TREE_WORKSHOP, emoji: '🛠️' },
  shopfront: { image: ICON_TREE_STOREFRONT, emoji: '🏪' },
  cheer: { image: ICON_HOLIDAY_CHEER, emoji: '🎅' },
  sapling: { image: TREE_SAPLING, emoji: '🌱' },
  pine: { image: TREE_PINE, emoji: '🌲' },
  spruce: { image: TREE_SPRUCE, emoji: '🌲' },
  fir: { image: TREE_FIR, emoji: '🎄' },
  decorated: { image: TREE_DECORATED, emoji: '🎄' },
  wood: { image: MATERIAL_WOOD, emoji: '🪵' },
  pinecones: { image: MATERIAL_PINECONE, emoji: '🌰' },
  branches: { image: MATERIAL_BRANCH, emoji: '🌿' },
  garland: { image: DECORATION_GARLAND, emoji: '🎀' },
  candles: { image: DECORATION_CANDLE, emoji: '🕯️' },
  ornaments: { image: ICON_ORNAMENT, emoji: '🔴' },
  traditional: { image: ICON_TRADITIONAL_ORNAMENT, emoji: '🌰' },
  elves: { image: ICON_ELVES, emoji: '🧝' },
  elvesAtWork: { image: ICON_ELVES_INDICATOR, emoji: '🧝' },
  axe: { image: ICON_AXE, emoji: '🪓' },
  wreath: { image: DECORATION_WREATH, emoji: '🎄' },
  bell: { image: ICON_HOLIDAY_BELL, emoji: '🔔' },
  starForge: { image: ICON_STAR_FORGE, emoji: '⭐' },
  perfect: { image: ICON_GOLD_STAR, emoji: '⭐' },
  luxury: { image: ICON_SPARKLES, emoji: '✨' },
} satisfies Record<string, EventArtSource>;

// ============================================================================
// TREE DEFINITIONS
// ============================================================================

/**
 * Base tree type definitions with growth and yield characteristics
 */
export const TREE_DEFINITIONS = {
  pine: {
    name: 'Pine',
    displayName: 'Pine Tree',
    baseGrowthTime: 7 * 365, // 7 in-game years (days)
    baseYield: {
      wood: 3,
      pinecones: 5,
      branches: 4,
    },
    baseValue: 10, // Base Holiday Cheer value
    unlockCost: 0, // Free to start
  },
  spruce: {
    name: 'Spruce',
    displayName: 'Spruce Tree',
    baseGrowthTime: 6 * 365, // Slightly faster
    baseYield: {
      wood: 4,
      pinecones: 6,
      branches: 5,
    },
    baseValue: 15,
    unlockCost: 500,
  },
  fir: {
    name: 'Fir',
    displayName: 'Fir Tree',
    baseGrowthTime: 5 * 365, // Fastest
    baseYield: {
      wood: 5,
      pinecones: 8,
      branches: 6,
    },
    baseValue: 20,
    unlockCost: 1250,
  },
} as const;

/**
 * Quality multipliers for tree values
 */
export const QUALITY_MULTIPLIERS: Record<TreeQuality, number> = {
  normal: 1.0,
  perfect: 2.0,  // Perfect trees sell for double
  luxury: 3.0,   // Luxury trees sell for triple (after all bonuses)
};

/**
 * Sale value multipliers by decoration, keyed by the last part of a tree
 * inventory key (treeType_quality_decoration). Luxury trees carry both
 * ornaments and candles.
 */
export const DECORATION_MULTIPLIERS: Record<string, number> = {
  plain: 1.0,
  ornamented: 1.05, // +5% value
  candled: 1.15,    // +15% value
  luxury: 2.0,      // double value; the Star Forge makes it triple
  garlanded: 1.1,   // older saves only; garland is now sold on its own
};

// ============================================================================
// CRAFTING RECIPES
// ============================================================================

/**
 * All crafting recipes available in the Workshop
 */
export const CRAFTING_RECIPES: CraftingRecipe[] = [
  {
    id: 'craft_garland',
    name: 'Craft Garland',
    description: 'Weave branches and pinecones into festive garland to sell',
    inputs: {
      branches: 3,
      pinecones: 2,
    },
    output: {
      garlands: 1,
    },
    craftTime: 1, // 1 day
    requiredUpgrade: undefined, // Always available
  },
  {
    id: 'craft_candles',
    name: 'Craft Candles',
    description: 'Make festive candles for tree decoration',
    inputs: {
      wood: 2,
      // Future: wax, berries
    },
    output: {
      candles: 1,
    },
    craftTime: 1,
    requiredUpgrade: undefined, // Always available
  },
  {
    id: 'craft_ornaments',
    name: 'Craft Ornaments',
    description: 'Create ornaments from farm crops and materials',
    inputs: {
      wood: 1
    },
    output: {
      ornaments: 2,
    },
    craftTime: 0.5, // Half day
    requiredUpgrade: 'ornament_crafting_bench', // Locked behind upgrade
  },
  {
    id: 'craft_traditional_ornaments',
    name: 'Traditional Ornaments',
    description: 'Transform pinecones into rustic ornaments',
    inputs: {
      pinecones: 5,
    },
    output: {
      ornaments: 3, // Changed from naturalOrnaments to ornaments
    },
    craftTime: 0.5,
    requiredUpgrade: 'traditional_ornaments', // Locked behind upgrade
  },
];

// ============================================================================
// EVENT UPGRADES
// ============================================================================

/**
 * Stage 1: Evergreen Farming Upgrades
 */
export const FARMING_UPGRADES: EventUpgrade[] = [
  {
    id: 'unlock_pine',
    name: 'Pine Sapling',
    description: 'Basic evergreen tree with long growth time',
    icon: TREE_PINE,
    category: 'farming',
    cost: 0, // Free
    owned: true, // Start with this
    effect: 'Unlock Pine trees',
  },
  {
    id: 'unlock_spruce',
    name: 'Spruce Sapling',
    description: 'Faster-growing tree with better yields',
    icon: TREE_SPRUCE,
    category: 'farming',
    cost: TREE_DEFINITIONS.spruce.unlockCost,
    owned: false,
    effect: 'Unlock Spruce trees',
  },
  {
    id: 'unlock_fir',
    name: 'Fir Sapling',
    description: 'Premium tree with fastest growth and highest value',
    icon: TREE_FIR,
    category: 'farming',
    cost: TREE_DEFINITIONS.fir.unlockCost,
    owned: false,
    effect: 'Unlock Fir trees',
  },
  {
    id: 'fertilized_soil',
    name: 'Fertilized Soil',
    description: 'Rich nutrients accelerate tree growth',
    icon: ICON_FERTILIZED_SOIL,
    category: 'farming',
    cost: 400,
    owned: false,
    effect: '+15% tree growth speed',
    speedBonus: 0.15,
    repeatable: true,
    level: 0,
    maxLevel: 20,
    costScaling: 1.5, // Cost increases by 1.5x per purchase
  },
  {
    id: 'greenhouse_extension',
    name: 'Greenhouse Extension',
    description: 'Expand your tree farm with additional growing space',
    icon: ICON_GREENHOUSE_EXTENSION,
    category: 'farming',
    cost: 200,
    owned: false,
    effect: '+1 tree plot',
    repeatable: true,
    level: 0,
    maxLevel: 12,
    costScaling: 1.5, // Cost increases by 1.5x per purchase
  },
  {
    id: 'evergreen_essence',
    name: 'Evergreen Essence',
    description: 'Magical essence that enhances tree quality',
    icon: ICON_EVERGREEN_ESSENCE,
    category: 'farming',
    cost: 1200,
    owned: false,
    effect: '10% chance to grow Perfect Tree',
    procChance: 0.10,
  },
  {
    id: 'harvest_all_upgrade',
    name: 'Efficient Harvester',
    description: 'Tools to harvest all ready trees at once',
    icon: ICON_AXE,
    category: 'farming',
    cost: 500,
    owned: false,
    effect: 'Unlock "Harvest All" button',
  },
  {
    id: 'plant_all_upgrade',
    name: 'Bulk Planter',
    description: 'Plant multiple trees simultaneously across all empty plots',
    icon: TREE_SAPLING,
    category: 'farming',
    cost: 800,
    owned: false,
    effect: 'Unlock "Plant All" button',
  },
];

/**
 * Stage 2: Decoration Workshop Upgrades
 */
export const WORKSHOP_UPGRADES: EventUpgrade[] = [
  {
    id: 'ornament_crafting_bench',
    name: 'Ornament Crafting Bench',
    description: 'Unlock ornament crafting from wood',
    icon: ICON_ORNAMENT_WORKBENCH,
    category: 'workshop',
    cost: 300,
    owned: false,
    effect: 'Unlock ornament crafting',
  },
  {
    id: 'traditional_ornaments',
    name: 'Traditional Ornaments',
    description: 'Convert pinecones into rustic ornaments',
    icon: ICON_TRADITIONAL_ORNAMENT,
    category: 'workshop',
    cost: 600,
    owned: false,
    effect: 'Unlock pinecone ornament crafting',
  },
  {
    id: 'elves_bench',
    name: "Elves' Bench",
    description: 'Magical helpers automate tree decoration',
    icon: ICON_ELVES_BENCH,
    category: 'workshop',
    cost: 1200,
    owned: false,
    effect: 'Automate tree decoration',
  },
  {
    id: 'star_forge',
    name: 'Star Forge',
    description: 'Legendary forge for creating perfect tree toppers',
    icon: ICON_STAR_FORGE,
    category: 'workshop',
    cost: 3000,
    owned: false,
    effect: 'Luxury Trees sell for triple value',
    multiplier: 3.0,
  },
  {
    id: 'cheerful_crafting',
    name: 'Cheerful Crafting',
    description: 'Speed up elves crafting by adding more helpers',
    icon: ICON_CHEERFUL_CRAFTING,
    category: 'workshop',
    cost: 500,
    owned: false,
    effect: '+1 item crafted per second',
    requires: 'elves_bench',
    hiddenUntilRequired: true,
    repeatable: true,
    level: 0,
    maxLevel: 20,
    costScaling: 1.5, // Cost increases by 50% per level
  },
];

/**
 * Stage 3: Shopfront & Sales Upgrades
 */
export const SHOPFRONT_UPGRADES: EventUpgrade[] = [
  {
    id: 'garland_borders',
    name: 'Garland Borders',
    description: 'Festive decorations attract more customers',
    icon: DECORATION_GARLAND,
    category: 'shopfront',
    cost: 500,
    owned: false,
    effect: '+10% Holiday Cheer from sales',
    valueBonus: 0.10,
  },
  {
    id: 'wreath_sign',
    name: 'Wreath Sign',
    description: 'Beautiful sign draws in daily customers',
    icon: DECORATION_WREATH,
    category: 'shopfront',
    cost: 1000,
    owned: false,
    effect: 'Enable daily customer bonuses',
  },
  {
    id: 'golden_bell_counter',
    name: 'Golden Bell Counter',
    description: 'Enchanted register generates passive income',
    icon: ICON_HOLIDAY_BELL,
    category: 'shopfront',
    cost: 1800,
    owned: false,
    effect: 'Passive Holiday Cheer income',
    requires: 'wreath_sign',
    passiveIncome: 0.1, // 1 Cheer per 10 seconds
  },
  {
    id: 'magical_register',
    name: 'Magical Register',
    description: 'Occasionally delights customers with magic',
    icon: ICON_HOLIDAY_REGISTER,
    category: 'shopfront',
    cost: 2500,
    owned: false,
    effect: 'Random holiday tips from customers',
    requires: 'golden_bell_counter',
  },
  {
    id: 'fireplace_display',
    name: 'Fireplace Display',
    description: 'Cozy fireplace showcases premium trees',
    icon: ICON_FIREPLACE,
    category: 'shopfront',
    cost: 3500,
    owned: false,
    effect: '+50% sale value for Luxury Trees',
    requires: 'golden_bell_counter',
    valueBonus: 0.50,
  },
];

/**
 * All event upgrades combined
 */
export const ALL_EVENT_UPGRADES: EventUpgrade[] = [
  ...FARMING_UPGRADES,
  ...WORKSHOP_UPGRADES,
  ...SHOPFRONT_UPGRADES,
];

// ============================================================================
// TREE SALES REWARDS
// ============================================================================

/**
 * Holiday Cheer for trees sold. Each step is an achievement (data/achievements.ts)
 * that pays its Cheer once, through the sales milestone with the same count: older
 * saves claimed those milestones on the Shopfront, and a claimed one never pays again.
 */
export const TREE_SALES_REWARDS = [
  { achievementId: 'first_tree_sold', milestoneId: 'milestone_first_tree', name: 'First Sale', trees: 1, cheer: 50 },
  { achievementId: 'winter_sweater', milestoneId: 'milestone_50_trees', name: 'Growing Business', trees: 50, cheer: 150 },
  { achievementId: 'reindeer_hat', milestoneId: 'milestone_250_trees', name: 'Master Decorator', trees: 250, cheer: 500 },
  { achievementId: 'frost_fertilizer', milestoneId: 'milestone_1000_trees', name: 'Winter Farmer', trees: 1000, cheer: 1500 },
  { achievementId: 'canners_cocoa', milestoneId: 'milestone_2500_trees', name: 'Holiday Tradition', trees: 2500, cheer: 4000 },
  { achievementId: 'snowfall_cosmetic', milestoneId: 'milestone_5000_trees', name: 'Christmas Legend', trees: 5000, cheer: 8000 },
] as const;

/** Holiday Cheer the tree sales achievement pays */
export const treeSalesCheer = (achievementId: string): number =>
  TREE_SALES_REWARDS.find(reward => reward.achievementId === achievementId)?.cheer ?? 0;

const cheerMilestone = (id: string, name: string, requirement: number, cheerAmount: number): EventMilestone => ({
  id,
  name,
  description: `Sell ${requirement.toLocaleString('en-US')} Christmas tree${requirement === 1 ? '' : 's'}`,
  requirement,
  claimed: false,
  reward: {
    type: 'currency',
    name: 'Holiday Cheer',
    description: `${cheerAmount.toLocaleString('en-US')} Holiday Cheer`,
    cheerAmount,
  },
});

/** The sales milestones, which record which tree sales rewards have been paid */
export const EVENT_MILESTONES: EventMilestone[] = TREE_SALES_REWARDS.map(reward =>
  cheerMilestone(reward.milestoneId, reward.name, reward.trees, reward.cheer)
);

// ============================================================================
// EVENT CONSTANTS
// ============================================================================

/**
 * Event configuration constants
 */
export const EVENT_CONSTANTS = {
  // Date range
  START_MONTH: 10, // November (0-indexed: Jan=0, Nov=10)
  START_DAY: 1,
  END_MONTH: 11,   // December (0-indexed: Jan=0, Dec=11)
  END_DAY: 25,
  
  // Tree farming
  DEFAULT_PLOT_COUNT: 6,
  MAX_PLOT_COUNT: 12,
  PERFECT_TREE_BASE_CHANCE: 0.10, // 10% with Evergreen Essence
  
  // Workshop
  MAX_QUEUE_SIZE: 5,
  DECORATION_TIME_BASE: 1, // 1 day per tree decoration
  
  // Sales
  BASE_DEMAND_MULTIPLIER: 1.0,
  MAX_DEMAND_MULTIPLIER: 2.0, // Doubles by Dec 25
  CHRISTMAS_DAY: 25,
  
  // Passive income
  GOLDEN_BELL_BASE_RATE: 0.1, // 1 Cheer per 10 seconds
  
  // Daily bonus
  DAILY_BONUS_BASE: 25, // Base Holiday Cheer

  // Holiday Cheer for each crafted good sold on its own
  GOOD_PRICES: { garlands: 4, candles: 2, ornaments: 1 },
  
  // Currency
  STARTING_CHEER: 0,
} as const;

/**
 * Customer feed messages for cozy atmosphere
 */
export const CUSTOMER_MESSAGES = [
  "A family just bought a beautiful tree! 🎄",
  "Customer left a glowing review! ⭐",
  "Someone brought hot cocoa to share! ☕",
  "Children are singing carols outside! 🎵",
  "A regular customer returned! 💚",
  "Archie got head pats from a customer! 🐾",
  "Snow is starting to fall gently... ❄️",
  "The fireplace is crackling warmly 🔥",
  "Someone donated extra tips! 💰",
  "The shop smells like pine and cinnamon! 🌲",
];

/**
 * Holiday tips amounts (random bonuses)
 */
export const HOLIDAY_TIP_RANGE = {
  min: 5,
  max: 50,
} as const;
