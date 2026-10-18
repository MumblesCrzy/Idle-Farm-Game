/**
 * Fall Pumpkin Rush Event Data
 *
 * Varieties, recipes, upgrades, milestones and tuning for the seasonal pumpkin
 * event. Balance changes belong here.
 *
 * Pumpkin art is emoji until images are drawn. To use an image, add the file to
 * public/ and set `image` on its entry in PUMPKIN_ART, for example
 * `sugarPie: { emoji: '🎃', image: './Sugar Pie Pumpkin.png' }`.
 */
import {
  PUMPKIN_SUGAR_PIE,
  PUMPKIN_CARVER,
  PUMPKIN_GIANT,
  PUMPKIN_SPROUT,
  PUMPKIN_CARVED,
  PUMPKIN_CANDLELIT,
  PUMPKIN_LANTERN,
  PUMPKIN_SEEDS,
  PUMPKIN_PULP,
  PUMPKIN_VINES,
  PUMPKIN_PIE,
  PUMPKIN_CANDLE,
  PUMPKIN_STENCIL,
  ICON_CANDY_CORN,
  PUMPKIN_SCARECROW,
  PUMPKIN_COUNTY_FAIR,
  PUMPKIN_SCALE,
  RIBBON_FIRST,
  RIBBON_SECOND,
  RIBBON_THIRD,
  RIBBON_BLUE,
  PUMPKIN_PATCH,
  PUMPKIN_BARN,
  PUMPKIN_STAND,
  PUMPKIN_UPGRADE_SUGAR_PIE_SEEDS,
  PUMPKIN_UPGRADE_CARVER_SEEDS,
  PUMPKIN_UPGRADE_GIANT_SEEDS,
  PUMPKIN_UPGRADE_COMPOST_HEAP,
  PUMPKIN_UPGRADE_PATCH_EXPANSION,
  PUMPKIN_UPGRADE_PRIZE_SEEDS,
  PUMPKIN_UPGRADE_VINE_TONIC,
  PUMPKIN_UPGRADE_WHEELBARROW,
  PUMPKIN_UPGRADE_SEED_DRILL,
  PUMPKIN_UPGRADE_STENCIL_TABLE,
  PUMPKIN_UPGRADE_SPOOKY_PATTERNS,
  PUMPKIN_UPGRADE_SCARECROW_CREW,
  PUMPKIN_UPGRADE_BUSY_SCARECROWS,
  PUMPKIN_UPGRADE_GLOWING_LANTERNS,
  PUMPKIN_UPGRADE_BUNTING,
  PUMPKIN_UPGRADE_CHALKBOARD,
  PUMPKIN_UPGRADE_HAYRIDE,
  PUMPKIN_UPGRADE_FORTUNE_TELLER,
  PUMPKIN_UPGRADE_HARVEST_DISPLAY
} from '../config/assetPaths';
import type { EventArtSource } from '../components/EventArt';
import type { EventUpgrade } from '../types/eventUpgrades';
import type {
  PumpkinVariety,
  PumpkinQuality,
  PumpkinFinish,
  PumpkinMaterials,
  PumpkinRecipe
} from '../types/pumpkinEvent';

// ============================================================================
// ART
// ============================================================================

/** Pumpkin Rush art: each image, with the emoji it replaced */
export const PUMPKIN_ART = {
  sugarPie: { image: PUMPKIN_SUGAR_PIE, emoji: '🎃' },
  carver: { image: PUMPKIN_CARVER, emoji: '🎃' },
  giant: { image: PUMPKIN_GIANT, emoji: '🎃' },
  sprout: { image: PUMPKIN_SPROUT, emoji: '🌱' },
  carved: { image: PUMPKIN_CARVED, emoji: '🎃' },
  candlelit: { image: PUMPKIN_CANDLELIT, emoji: '🕯️' },
  lantern: { image: PUMPKIN_LANTERN, emoji: '🎃' },
  seeds: { image: PUMPKIN_SEEDS, emoji: '🌰' },
  pulp: { image: PUMPKIN_PULP, emoji: '🥣' },
  vines: { image: PUMPKIN_VINES, emoji: '🌿' },
  pies: { image: PUMPKIN_PIE, emoji: '🥧' },
  candles: { image: PUMPKIN_CANDLE, emoji: '🕯️' },
  stencils: { image: PUMPKIN_STENCIL, emoji: '✂️' },
  candyCorn: { image: ICON_CANDY_CORN, emoji: '🍬' },
  scarecrow: { image: PUMPKIN_SCARECROW, emoji: '👨‍🌾' },
  fair: { image: PUMPKIN_COUNTY_FAIR, emoji: '🎡' },
  scale: { image: PUMPKIN_SCALE, emoji: '⚖️' },
  ribbonFirst: { image: RIBBON_FIRST, emoji: '🥇' },
  ribbonSecond: { image: RIBBON_SECOND, emoji: '🥈' },
  ribbonThird: { image: RIBBON_THIRD, emoji: '🥉' },
  blueRibbon: { image: RIBBON_BLUE, emoji: '🎀' },
  patch: { image: PUMPKIN_PATCH, emoji: '🌾' },
  barn: { image: PUMPKIN_BARN, emoji: '🛖' },
  stand: { image: PUMPKIN_STAND, emoji: '🧺' },
} satisfies Record<string, EventArtSource>;

// ============================================================================
// PUMPKINS
// ============================================================================

/** Pumpkin variety definitions. Growth is in game days (one per second). */
export const PUMPKIN_VARIETIES: Record<PumpkinVariety, {
  name: string;
  displayName: string;
  description: string;
  growthTime: number;
  baseYield: Pick<PumpkinMaterials, 'seeds' | 'pulp' | 'vines'>;
  /** Candy Corn for one plain pumpkin; giants are priced by weight instead */
  baseValue: number;
  /** Upgrade that unlocks planting this variety */
  unlockUpgrade: string;
  unlockCost: number;
  art: EventArtSource;
}> = {
  sugarPie: {
    name: 'Sugar Pie',
    displayName: 'Sugar Pie Pumpkin',
    description: 'Small and sweet, quick to grow, full of pulp for pies',
    growthTime: 180,
    baseYield: { seeds: 2, pulp: 4, vines: 1 },
    baseValue: 2,
    unlockUpgrade: 'unlock_sugar_pie',
    unlockCost: 0,
    art: PUMPKIN_ART.sugarPie,
  },
  carver: {
    name: 'Carver',
    displayName: 'Carver Pumpkin',
    description: 'The classic for carving into Jack-o\'-Lanterns',
    growthTime: 240,
    baseYield: { seeds: 3, pulp: 3, vines: 2 },
    baseValue: 3,
    unlockUpgrade: 'unlock_carver',
    unlockCost: 200,
    art: PUMPKIN_ART.carver,
  },
  giant: {
    name: 'Atlantic Giant',
    displayName: 'Atlantic Giant',
    description: 'Slow and enormous. Weighed for the County Fair instead of carved',
    growthTime: 540,
    baseYield: { seeds: 8, pulp: 10, vines: 4 },
    baseValue: 0,
    unlockUpgrade: 'unlock_giant',
    unlockCost: 1000,
    art: PUMPKIN_ART.giant,
  },
};

/** Varieties that are carved and sold at the stand (giants go to the giant shelf) */
export const CARVABLE_VARIETIES: PumpkinVariety[] = ['sugarPie', 'carver'];

/** Sale value multipliers by quality */
export const PUMPKIN_QUALITY_MULTIPLIERS: Record<PumpkinQuality, number> = {
  normal: 1.0,
  blueRibbon: 2.0,
};

/** Sale value multipliers by finish */
export const PUMPKIN_FINISH_MULTIPLIERS: Record<PumpkinFinish, number> = {
  plain: 1.0,
  carved: 1.05,     // +5%
  candlelit: 1.15,  // +15%
  lantern: 3.0,     // carved and lit: triple
};

/** Display names for finishes */
export const PUMPKIN_FINISH_NAMES: Record<PumpkinFinish, string> = {
  plain: '',
  carved: 'Carved',
  candlelit: 'Candlelit',
  lantern: "Jack-o'-Lantern",
};

// ============================================================================
// CARVING BARN RECIPES
// ============================================================================

export const PUMPKIN_RECIPES: PumpkinRecipe[] = [
  {
    id: 'bake_pie',
    name: 'Bake Pie',
    description: 'Bake pulp and seeds into a pumpkin pie to sell',
    inputs: { pulp: 4, seeds: 1 },
    output: { pies: 1 },
  },
  {
    id: 'make_candles',
    name: 'Make Candles',
    description: 'Press seed oil into a candle for lighting pumpkins',
    inputs: { seeds: 2 },
    output: { candles: 1 },
  },
  {
    id: 'cut_stencils',
    name: 'Cut Stencils',
    description: 'Cut carving stencils from dried vines',
    inputs: { vines: 1 },
    output: { stencils: 2 },
    requiredUpgrade: 'stencil_table',
  },
];

// ============================================================================
// UPGRADES
// ============================================================================

/** Pumpkin Patch upgrades */
export const PATCH_UPGRADES: EventUpgrade[] = [
  {
    id: 'unlock_sugar_pie',
    name: 'Sugar Pie Seeds',
    description: PUMPKIN_VARIETIES.sugarPie.description,
    icon: PUMPKIN_UPGRADE_SUGAR_PIE_SEEDS,
    category: 'farming',
    cost: 0,
    owned: true, // Start with this
    effect: 'Unlock Sugar Pie pumpkins',
  },
  {
    id: 'unlock_carver',
    name: 'Carver Seeds',
    description: PUMPKIN_VARIETIES.carver.description,
    icon: PUMPKIN_UPGRADE_CARVER_SEEDS,
    category: 'farming',
    cost: PUMPKIN_VARIETIES.carver.unlockCost,
    owned: false,
    effect: 'Unlock Carving pumpkins',
  },
  {
    id: 'unlock_giant',
    name: 'Atlantic Giant Seeds',
    description: PUMPKIN_VARIETIES.giant.description,
    icon: PUMPKIN_UPGRADE_GIANT_SEEDS,
    category: 'farming',
    cost: PUMPKIN_VARIETIES.giant.unlockCost,
    owned: false,
    effect: 'Unlock Atlantic Giant pumpkins',
  },
  {
    id: 'compost_heap',
    name: 'Compost Heap',
    description: 'Rich compost speeds up every vine',
    icon: PUMPKIN_UPGRADE_COMPOST_HEAP,
    category: 'farming',
    cost: 400,
    owned: false,
    effect: '+15% pumpkin growth speed',
    speedBonus: 0.15,
    repeatable: true,
    level: 0,
    maxLevel: 20,
    costScaling: 1.5,
  },
  {
    id: 'patch_expansion',
    name: 'Patch Expansion',
    description: 'Clear more ground for pumpkins',
    icon: PUMPKIN_UPGRADE_PATCH_EXPANSION,
    category: 'farming',
    cost: 200,
    owned: false,
    effect: '+1 pumpkin plot',
    repeatable: true,
    level: 0,
    maxLevel: 6,
    costScaling: 1.5,
  },
  {
    id: 'prize_seeds',
    name: 'Prize Seeds',
    description: 'Seed saved from last year\'s best pumpkins',
    icon: PUMPKIN_UPGRADE_PRIZE_SEEDS,
    category: 'farming',
    cost: 1200,
    owned: false,
    effect: '10% chance of a Blue Ribbon pumpkin',
    procChance: 0.10,
  },
  {
    id: 'giant_vine_tonic',
    name: 'Giant Vine Tonic',
    description: 'A secret feeding mix for record-breaking giants',
    icon: PUMPKIN_UPGRADE_VINE_TONIC,
    category: 'farming',
    cost: 300,
    owned: false,
    effect: '+10% Atlantic Giant weight',
    requires: 'unlock_giant',
    repeatable: true,
    level: 0,
    maxLevel: 10,
    costScaling: 1.6,
  },
  {
    id: 'harvest_all_upgrade',
    name: 'Wheelbarrow',
    description: 'Haul in every ripe pumpkin at once',
    icon: PUMPKIN_UPGRADE_WHEELBARROW,
    category: 'farming',
    cost: 500,
    owned: false,
    effect: 'Unlock "Harvest All" button',
  },
  {
    id: 'plant_all_upgrade',
    name: 'Seed Drill',
    description: 'Plant every empty plot at once',
    icon: PUMPKIN_UPGRADE_SEED_DRILL,
    category: 'farming',
    cost: 800,
    owned: false,
    effect: 'Unlock "Plant All" button',
  },
];

/** Carving Barn upgrades */
export const BARN_UPGRADES: EventUpgrade[] = [
  {
    id: 'stencil_table',
    name: 'Stencil Table',
    description: 'A work table for cutting carving stencils',
    icon: PUMPKIN_UPGRADE_STENCIL_TABLE,
    category: 'workshop',
    cost: 300,
    owned: false,
    effect: 'Unlock stencils from vines',
  },
  {
    id: 'spooky_patterns',
    name: 'Spooky Patterns',
    description: 'A book of spooky faces that draws a crowd',
    icon: PUMPKIN_UPGRADE_SPOOKY_PATTERNS,
    category: 'workshop',
    cost: 600,
    owned: false,
    effect: '+25% value for all carved pumpkins',
    valueBonus: 0.25,
  },
  {
    id: 'scarecrow_crew',
    name: 'Scarecrow Crew',
    description: 'Straw-stuffed helpers that craft, carve and light pumpkins',
    icon: PUMPKIN_UPGRADE_SCARECROW_CREW,
    category: 'workshop',
    cost: 1200,
    owned: false,
    effect: 'Automate crafting and carving',
  },
  {
    id: 'busy_scarecrows',
    name: 'Busy Scarecrows',
    description: 'More scarecrows on the crew',
    icon: PUMPKIN_UPGRADE_BUSY_SCARECROWS,
    category: 'workshop',
    cost: 500,
    owned: false,
    effect: '+1 crew job per second',
    requires: 'scarecrow_crew',
    hiddenUntilRequired: true,
    repeatable: true,
    level: 0,
    maxLevel: 20,
    costScaling: 1.5,
  },
  {
    id: 'glowing_lanterns',
    name: 'Glowing Lanterns',
    description: 'Lanterns that glow all night draw a crowd',
    icon: PUMPKIN_UPGRADE_GLOWING_LANTERNS,
    category: 'workshop',
    cost: 3000,
    owned: false,
    effect: '+50% sale value for Jack-o\'-Lanterns',
    valueBonus: 0.50,
  },
];

/** Farm Stand upgrades */
export const STAND_UPGRADES: EventUpgrade[] = [
  {
    id: 'bunting',
    name: 'Autumn Bunting',
    description: 'Bright flags bring in passing traffic',
    icon: PUMPKIN_UPGRADE_BUNTING,
    category: 'shopfront',
    cost: 500,
    owned: false,
    effect: '+10% Candy Corn from sales',
    valueBonus: 0.10,
  },
  {
    id: 'chalkboard_sign',
    name: 'Chalkboard Sign',
    description: 'A daily special draws regulars',
    icon: PUMPKIN_UPGRADE_CHALKBOARD,
    category: 'shopfront',
    cost: 1000,
    owned: false,
    effect: 'Enable the daily customer bonus',
  },
  {
    id: 'hayride',
    name: 'Hayride',
    description: 'Visitors pay for a ride around the patch',
    icon: PUMPKIN_UPGRADE_HAYRIDE,
    category: 'shopfront',
    cost: 1800,
    owned: false,
    effect: 'Passive Candy Corn income',
    requires: 'chalkboard_sign',
    passiveIncome: 0.1, // 1 Candy Corn per 10 seconds
  },
  {
    id: 'fortune_teller',
    name: 'Fortune Teller',
    description: 'A tent of mystery that delights customers',
    icon: PUMPKIN_UPGRADE_FORTUNE_TELLER,
    category: 'shopfront',
    cost: 2500,
    owned: false,
    effect: 'Random tips from customers',
    requires: 'hayride',
  },
  {
    id: 'harvest_display',
    name: 'Harvest Display',
    description: 'Hay bales and corn stalks show off your best',
    icon: PUMPKIN_UPGRADE_HARVEST_DISPLAY,
    category: 'shopfront',
    cost: 3500,
    owned: false,
    effect: '+50% sale value for Blue Ribbon pumpkins',
    requires: 'hayride',
    valueBonus: 0.50,
  },
];

export const ALL_PUMPKIN_UPGRADES: EventUpgrade[] = [
  ...PATCH_UPGRADES,
  ...BARN_UPGRADES,
  ...STAND_UPGRADES,
];

// ============================================================================
// TUNING
// ============================================================================

export const PUMPKIN_EVENT_CONSTANTS = {
  // Season: September 22 through Thanksgiving, the fourth Thursday of November (months are 0-indexed)
  START_MONTH: 8,
  START_DAY: 22,
  // Demand peaks on Halloween and holds there until the season ends
  PEAK_MONTH: 9,
  PEAK_DAY: 31,

  // Pumpkin Patch
  DEFAULT_PLOT_COUNT: 6,
  /** Candy Corn for each harvest, by quality */
  HARVEST_CANDY_CORN: { normal: 1, blueRibbon: 3 } as Record<PumpkinQuality, number>,

  // Farm Stand
  BASE_DEMAND_MULTIPLIER: 1.0,
  MAX_DEMAND_MULTIPLIER: 2.0, // Doubles by Halloween
  DAILY_BONUS: 25,
  /** Candy Corn for each standalone good */
  GOOD_PRICES: { pies: 4, candles: 2, stencils: 1 } as Record<'pies' | 'candles' | 'stencils', number>,

  // Atlantic Giants
  GIANT_MIN_WEIGHT: 300,       // pounds
  GIANT_WEIGHT_RANGE: 500,     // up to 800 pounds before bonuses
  GIANT_BLUE_RIBBON_WEIGHT: 1.5,
  GIANT_TONIC_PER_LEVEL: 0.10,
  POUNDS_PER_CANDY_CORN: 40,   // Farm Stand price for a giant
  MAX_GIANT_SHELF: 12,

  // County Fair weigh-off
  FAIR_INTERVAL_DAYS: 365,    // once a game year, about six real minutes
  RIVAL_COUNT: 3,
  RIVAL_BASE_WEIGHT: 520,       // pounds at the first fair
  RIVAL_GROWTH_PER_FAIR: 0.12,  // rivals get heavier each fair you enter
  RIVAL_SPREAD: 0.4,            // each rival is 80% to 120% of the base
} as const;

/** Customer messages for the Farm Stand feed */
export const PUMPKIN_CUSTOMER_MESSAGES = [
  'A family picked out the perfect pumpkin! 🎃',
  'Someone bought a pie for the road! 🥧',
  'Kids are racing through the corn maze! 🌽',
  'A regular stopped by for apple cider! 🍎',
  'Archie is napping in a pile of leaves! 🍂',
  'The hayride just rolled past, full of giggles! 🚜',
  'A customer left a glowing review! ⭐',
  'Crisp autumn breeze across the patch... 🍁',
];
