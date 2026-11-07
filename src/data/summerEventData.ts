/**
 * Summer Watermelon Festival Event Data
 *
 * Melons, recipes, upgrades, challenge kinds and tuning for the seasonal summer event.
 * Balance changes belong here.
 *
 * SUMMER_ART pairs each image with its emoji, the fallback if the image can't load, as SPRING_ART
 * does. The trophy and ribbons are the County Fair's, and the tab and the event log use the
 * watermelon slice. Four upgrades show their Festival Grounds image.
 */
import {
  FRUIT_WATERMELON,
  RIBBON_FIRST,
  RIBBON_SECOND,
  RIBBON_THIRD,
  ICON_TROPHY,
  SUMMER_SUGAR_BABY,
  SUMMER_CRIMSON_SWEET,
  SUMMER_CAROLINA_CROSS,
  SUMMER_SUGAR_MELON,
  SUMMER_SPLITS,
  SUMMER_SEEDS,
  SUMMER_RINDS,
  SUMMER_ICE,
  SUMMER_CUPS,
  SUMMER_AGUA,
  SUMMER_PICKLES,
  SUMMER_ROASTED,
  SUMMER_SNOW_CONE,
  SUMMER_CHILLED,
  SUMMER_CARVED,
  SUMMER_BASKET,
  SUMMER_SPROUT,
  ICON_TICKETS,
  SUMMER_CREW,
  SUMMER_CAROUSEL,
  SUMMER_DUNK_TANK,
  SUMMER_PARADE,
  SUMMER_PATCH,
  SUMMER_JUICE_STAND,
  SUMMER_GROUNDS,
  SUMMER_BOARD,
  SUMMER_HARVEST_RACE,
  SUMMER_SALES_SPRINT,
  SUMMER_SWEETEST,
  SUMMER_SPITTING,
  SUMMER_HEAVIEST,
  SUMMER_UPGRADE_STRAW_MULCH,
  SUMMER_UPGRADE_PATCH_EXPANSION,
  SUMMER_UPGRADE_SUGAR_SEEDS,
  SUMMER_UPGRADE_WAGON,
  SUMMER_UPGRADE_JAB_PLANTER,
  SUMMER_UPGRADE_SAWDUST_PACKING,
  SUMMER_UPGRADE_FANCY_CARVING,
  SUMMER_UPGRADE_EXTRA_HANDS,
  SUMMER_UPGRADE_GINGHAM_CLOTH,
  SUMMER_UPGRADE_BUNTING,
  SUMMER_UPGRADE_TASTING_TABLE,
  SUMMER_UPGRADE_SUN_RIPENING,
  SUMMER_UPGRADE_VINE_PRUNING,
  SUMMER_UPGRADE_SPITTING_PRACTICE
} from '../config/assetPaths';
import type { EventArtSource } from '../components/EventArt';
import type { EventUpgrade } from '../types/eventUpgrades';
import type {
  ChallengeKind,
  MelonFinish,
  MelonQuality,
  MelonVariety,
  SummerGood,
  SummerMaterials,
  SummerRecipe
} from '../types/summerEvent';

// ============================================================================
// ART
// ============================================================================

/** Summer Festival art: each image with its emoji */
export const SUMMER_ART = {
  sugarBaby: { image: SUMMER_SUGAR_BABY, emoji: '🍉' },
  crimsonSweet: { image: SUMMER_CRIMSON_SWEET, emoji: '🍉' },
  carolinaCross: { image: SUMMER_CAROLINA_CROSS, emoji: '🍉' },
  sprout: { image: SUMMER_SPROUT, emoji: '🌱' },
  sugarMelon: { image: SUMMER_SUGAR_MELON, emoji: '🏅' },
  splits: { image: SUMMER_SPLITS, emoji: '🍉' },
  seeds: { image: SUMMER_SEEDS, emoji: '🌰' },
  rinds: { image: SUMMER_RINDS, emoji: '🥒' },
  ice: { image: SUMMER_ICE, emoji: '🧊' },
  cups: { image: SUMMER_CUPS, emoji: '🥣' },
  agua: { image: SUMMER_AGUA, emoji: '🍹' },
  pickles: { image: SUMMER_PICKLES, emoji: '🫙' },
  roasted: { image: SUMMER_ROASTED, emoji: '🥜' },
  snowCone: { image: SUMMER_SNOW_CONE, emoji: '🍧' },
  chilled: { image: SUMMER_CHILLED, emoji: '🧊' },
  carved: { image: SUMMER_CARVED, emoji: '🧺' },
  basket: { image: SUMMER_BASKET, emoji: '🧺' },
  tickets: { image: ICON_TICKETS, emoji: '🎟️' },
  crew: { image: SUMMER_CREW, emoji: '🧑‍🍳' },
  carousel: { image: SUMMER_CAROUSEL, emoji: '🎠' },
  dunkTank: { image: SUMMER_DUNK_TANK, emoji: '💦' },
  parade: { image: SUMMER_PARADE, emoji: '🎺' },
  patch: { image: SUMMER_PATCH, emoji: '🍉' },
  juiceStand: { image: SUMMER_JUICE_STAND, emoji: '🥤' },
  grounds: { image: SUMMER_GROUNDS, emoji: '🎪' },
  board: { image: SUMMER_BOARD, emoji: '📋' },
  harvestRace: { image: SUMMER_HARVEST_RACE, emoji: '⏱️' },
  salesSprint: { image: SUMMER_SALES_SPRINT, emoji: '💰' },
  sweetest: { image: SUMMER_SWEETEST, emoji: '🍬' },
  spitting: { image: SUMMER_SPITTING, emoji: '💨' },
  heaviest: { image: SUMMER_HEAVIEST, emoji: '⚖️' },
  // The tab and the event log: the watermelon slice
  slice: { image: FRUIT_WATERMELON, emoji: '🍉' },
  trophy: { image: ICON_TROPHY, emoji: '🏆' },
  // The County Fair's ribbons, for the trophy case
  ribbonFirst: { image: RIBBON_FIRST, emoji: '🥇' },
  ribbonSecond: { image: RIBBON_SECOND, emoji: '🥈' },
  ribbonThird: { image: RIBBON_THIRD, emoji: '🥉' },
} satisfies Record<string, EventArtSource>;

// ============================================================================
// MELONS
// ============================================================================

/** Melon definitions. Growth is in game days (one per second). */
export const MELON_VARIETIES: Record<MelonVariety, {
  name: string;
  plural: string;
  description: string;
  growthTime: number;
  /** Materials a harvest gives besides the melon */
  baseYield: Pick<SummerMaterials, 'seeds' | 'splits'>;
  /** Tickets for one plain melon; the Carolina Cross sells by weight instead */
  baseValue: number;
  /** Upgrade that unlocks planting this melon */
  unlockUpgrade: string;
  unlockCost: number;
  art: EventArtSource;
}> = {
  sugarBaby: {
    name: 'Sugar Baby',
    plural: 'Sugar Babies',
    description: 'Small, quick and sweet, a melon for one picnic',
    growthTime: 180,
    baseYield: { seeds: 2, splits: 1 },
    baseValue: 2,
    unlockUpgrade: 'unlock_sugar_baby',
    unlockCost: 0,
    art: SUMMER_ART.sugarBaby,
  },
  crimsonSweet: {
    name: 'Crimson Sweet',
    plural: 'Crimson Sweets',
    description: 'The classic striped melon, red to the rind',
    growthTime: 240,
    baseYield: { seeds: 3, splits: 2 },
    baseValue: 3,
    unlockUpgrade: 'unlock_crimson_sweet',
    unlockCost: 200,
    art: SUMMER_ART.crimsonSweet,
  },
  carolinaCross: {
    name: 'Carolina Cross',
    plural: 'Carolina Crosses',
    description: 'Slow and enormous. Weighed at harvest and sold by the pound',
    growthTime: 540,
    baseYield: { seeds: 8, splits: 4 },
    baseValue: 0,
    unlockUpgrade: 'unlock_carolina_cross',
    unlockCost: 1000,
    art: SUMMER_ART.carolinaCross,
  },
};

/** Melons in the order the patch and the stall show them */
export const MELON_ORDER: MelonVariety[] = ['sugarBaby', 'crimsonSweet', 'carolinaCross'];

/** Sale value multipliers by grade */
export const MELON_QUALITY_MULTIPLIERS: Record<MelonQuality, number> = {
  normal: 1.0,
  sugar: 2.0,
};

/** Sale value multipliers by finish: a Picnic Basket, chilled and carved, is worth triple */
export const MELON_FINISH_MULTIPLIERS: Record<MelonFinish, number> = {
  plain: 1.0,
  chilled: 1.0,
  carved: 1.0,
  basket: 3.0,
};

/**
 * Tickets a chill or a carving adds to each melon, after the other bonuses.
 * More than a Snow Cone (1) or a cup of melon balls (2) sells for on its own, so finishing pays.
 */
export const MELON_FINISH_BONUSES: Record<MelonFinish, number> = {
  plain: 0,
  chilled: 2,
  carved: 3,
  basket: 0,
};

/** Display names for finishes */
export const MELON_FINISH_NAMES: Record<MelonFinish, string> = {
  plain: 'Plain',
  chilled: 'Chilled',
  carved: 'Carved',
  basket: 'Picnic Basket',
};

/** Finishes in the order a stall card lists them */
export const MELON_FINISH_ORDER: MelonFinish[] = ['plain', 'chilled', 'carved', 'basket'];

/** Finishes that sell for more in a Heatwave */
export const COLD_FINISHES: MelonFinish[] = ['chilled', 'basket'];

// ============================================================================
// JUICE STAND RECIPES
// ============================================================================

export const SUMMER_RECIPES: SummerRecipe[] = [
  {
    id: 'melon_balls',
    name: 'Melon Balls',
    action: 'Ball a melon',
    description: 'Scoop a split melon into cups of melon balls',
    inputs: { splits: 1 },
    output: { cups: 2, rinds: 1 },
    requiredUpgrade: 'unlock_melon_baller',
  },
  {
    id: 'agua_fresca',
    name: 'Agua Fresca',
    action: 'Mix Agua Fresca',
    description: 'Blend two split melons into a cold pitcher',
    inputs: { splits: 2 },
    output: { agua: 1, rinds: 2 },
  },
  {
    id: 'pickled_rinds',
    name: 'Pickled Rinds',
    action: 'Pickle the rinds',
    description: 'Put up the rinds in a jar of sweet pickles',
    inputs: { rinds: 3 },
    output: { pickles: 1 },
  },
  {
    id: 'roasted_seeds',
    name: 'Roasted Seeds',
    action: 'Roast seeds',
    description: 'Roast and salt a bag of seeds',
    inputs: { seeds: 4 },
    output: { roasted: 1 },
  },
];

/** Display names for the goods the stall buys */
export const SUMMER_GOOD_NAMES: Record<SummerGood, string> = {
  ice: 'Snow Cones',
  cups: 'Melon Balls',
  agua: 'Agua Fresca',
  pickles: 'Pickled Rinds',
  roasted: 'Roasted Seeds',
};

/** One of each good, for counts of one */
export const SUMMER_GOOD_SINGULAR: Record<SummerGood, string> = {
  ice: 'Snow Cone',
  cups: 'cup of Melon Balls',
  agua: 'Agua Fresca',
  pickles: 'jar of Pickled Rinds',
  roasted: 'bag of Roasted Seeds',
};

/** Goods in the order the goods row lists them */
export const SUMMER_GOOD_ORDER: SummerGood[] = ['ice', 'cups', 'agua', 'pickles', 'roasted'];

/** Goods that sell for more in a Heatwave */
export const COLD_GOODS: SummerGood[] = ['ice', 'agua'];

// ============================================================================
// UPGRADES
// ============================================================================

/** Melon Patch upgrades, with the melon unlocks */
export const PATCH_UPGRADES: EventUpgrade[] = [
  {
    id: 'unlock_sugar_baby',
    name: 'Sugar Baby Seeds',
    description: MELON_VARIETIES.sugarBaby.description,
    icon: SUMMER_SUGAR_BABY,
    category: 'farming',
    cost: 0,
    owned: true, // Start with this
    effect: 'Unlock Sugar Babies',
  },
  {
    id: 'unlock_crimson_sweet',
    name: 'Crimson Sweet Seeds',
    description: MELON_VARIETIES.crimsonSweet.description,
    icon: SUMMER_CRIMSON_SWEET,
    category: 'farming',
    cost: MELON_VARIETIES.crimsonSweet.unlockCost,
    owned: false,
    effect: 'Unlock Crimson Sweets',
  },
  {
    id: 'unlock_carolina_cross',
    name: 'Carolina Cross Seeds',
    description: MELON_VARIETIES.carolinaCross.description,
    icon: SUMMER_CAROLINA_CROSS,
    category: 'farming',
    cost: MELON_VARIETIES.carolinaCross.unlockCost,
    owned: false,
    effect: 'Unlock Carolina Crosses',
  },
  {
    id: 'straw_mulch',
    name: 'Straw Mulch',
    description: 'Keeps the vines cool and the soil damp',
    icon: SUMMER_UPGRADE_STRAW_MULCH,
    category: 'farming',
    cost: 400,
    owned: false,
    effect: '+15% melon growth speed',
    speedBonus: 0.15,
    repeatable: true,
    level: 0,
    maxLevel: 20,
    costScaling: 1.5,
  },
  {
    id: 'patch_expansion',
    name: 'Patch Expansion',
    description: 'Clear another hill for melons',
    icon: SUMMER_UPGRADE_PATCH_EXPANSION,
    category: 'farming',
    cost: 200,
    owned: false,
    effect: '+1 melon plot',
    repeatable: true,
    level: 0,
    maxLevel: 6,
    costScaling: 1.5,
  },
  {
    id: 'sugar_seeds',
    name: 'Sugar Seeds',
    description: 'Seeds saved from the sweetest melons of summers past',
    icon: SUMMER_UPGRADE_SUGAR_SEEDS,
    category: 'farming',
    cost: 1200,
    owned: false,
    effect: '10% chance of a Sugar Melon',
    procChance: 0.10,
  },
  {
    id: 'wagon',
    name: 'Wagon',
    description: 'A red wagon to haul the whole patch in at once',
    icon: SUMMER_UPGRADE_WAGON,
    category: 'farming',
    cost: 500,
    owned: false,
    effect: 'Unlock "Harvest All" button',
  },
  {
    id: 'jab_planter',
    name: 'Jab Planter',
    description: 'Jab, click, a seed in the ground: plant every empty hill at once',
    icon: SUMMER_UPGRADE_JAB_PLANTER,
    category: 'farming',
    cost: 800,
    owned: false,
    effect: 'Unlock "Plant All" button',
  },
];

/** Juice Stand upgrades */
export const STAND_UPGRADES: EventUpgrade[] = [
  {
    id: 'unlock_ice_house',
    name: 'Ice House',
    description: 'Sawdust, straw and last winter\'s ice, kept cold all summer',
    icon: SUMMER_ICE,
    category: 'workshop',
    cost: 400,
    owned: false,
    effect: 'A block of ice every 20 days',
  },
  {
    id: 'unlock_melon_baller',
    name: 'Melon Baller',
    description: 'Scoops split melons into cups, and fills carved ones',
    icon: SUMMER_CUPS,
    category: 'workshop',
    cost: 300,
    owned: false,
    effect: 'Melon Balls, and carving',
  },
  {
    id: 'sawdust_packing',
    name: 'Sawdust Packing',
    description: 'Pack the ice deeper and it keeps longer',
    icon: SUMMER_UPGRADE_SAWDUST_PACKING,
    category: 'workshop',
    cost: 600,
    owned: false,
    effect: 'The Ice House holds 25',
    requires: 'unlock_ice_house',
  },
  {
    id: 'fancy_carving',
    name: 'Fancy Carving',
    description: 'Scalloped rims and a carved handle',
    icon: SUMMER_UPGRADE_FANCY_CARVING,
    category: 'workshop',
    cost: 600,
    owned: false,
    effect: '+25% Carved and Basket value',
    valueBonus: 0.25,
  },
  {
    id: 'picnic_crew',
    name: 'Picnic Crew',
    description: 'Neighborhood kids who chill, carve and pack baskets',
    icon: SUMMER_CREW,
    category: 'workshop',
    cost: 1200,
    owned: false,
    effect: 'Automates the Juice Stand',
  },
  {
    id: 'extra_hands',
    name: 'Extra Hands',
    description: 'More kids on the crew',
    icon: SUMMER_UPGRADE_EXTRA_HANDS,
    category: 'workshop',
    cost: 500,
    owned: false,
    effect: '+1 crew job per second',
    requires: 'picnic_crew',
    hiddenUntilRequired: true,
    repeatable: true,
    level: 0,
    maxLevel: 20,
    costScaling: 1.5,
  },
  {
    id: 'gingham_cloth',
    name: 'Gingham Cloth',
    description: 'Every basket goes out on a red checked cloth',
    icon: SUMMER_UPGRADE_GINGHAM_CLOTH,
    category: 'workshop',
    cost: 3000,
    owned: false,
    effect: '+50% Picnic Basket value',
    valueBonus: 0.50,
  },
];

/** Festival Grounds upgrades */
export const GROUNDS_UPGRADES: EventUpgrade[] = [
  {
    id: 'summer_bunting',
    name: 'Summer Bunting',
    description: 'Red, white and blue flags along the midway',
    icon: SUMMER_UPGRADE_BUNTING,
    category: 'shopfront',
    cost: 500,
    owned: false,
    effect: '+10% Tickets from melon sales',
    valueBonus: 0.10,
  },
  {
    id: 'parade_route',
    name: 'Parade Route',
    description: 'The parade passes right by the stand',
    icon: SUMMER_PARADE,
    category: 'shopfront',
    cost: 1000,
    owned: false,
    effect: 'Enable the daily customer bonus',
  },
  {
    id: 'carousel',
    name: 'Carousel',
    description: 'A painted carousel beside the stand, a Ticket a ride',
    icon: SUMMER_CAROUSEL,
    category: 'shopfront',
    cost: 1800,
    owned: false,
    effect: 'Passive Ticket income',
    passiveIncome: 0.1, // 1 Ticket every 10 seconds
    requires: 'parade_route',
  },
  {
    id: 'dunk_tank',
    name: 'Dunk Tank',
    description: 'Three throws for a Ticket, and a few to spare for the stand',
    icon: SUMMER_DUNK_TANK,
    category: 'shopfront',
    cost: 2500,
    owned: false,
    effect: 'Random tips from customers',
    requires: 'carousel',
  },
  {
    id: 'tasting_table',
    name: 'Tasting Table',
    description: 'Free samples prove the sweetness',
    icon: SUMMER_UPGRADE_TASTING_TABLE,
    category: 'shopfront',
    cost: 3500,
    owned: false,
    effect: '+50% Sugar Melon value',
    valueBonus: 0.50,
  },
];

/**
 * Challenge Board upgrades: the three with no top level, each raising a challenge score.
 * Sun-Ripening also makes more Sugar Melons, and Vine Pruning heavier giants to sell.
 */
export const BOARD_UPGRADES: EventUpgrade[] = [
  {
    id: 'sun_ripening',
    name: 'Sun-Ripening',
    description: 'Let them sit a few more days in the sun',
    icon: SUMMER_UPGRADE_SUN_RIPENING,
    category: 'board',
    cost: 300,
    owned: false,
    effect: '+0.2 Brix on every melon',
    // No top level: the rising price is the only limit
    repeatable: true,
    level: 0,
    costScaling: 1.6,
  },
  {
    id: 'vine_pruning',
    name: 'Vine Pruning',
    description: 'One melon to a vine, and every bit of the vine behind it',
    icon: SUMMER_UPGRADE_VINE_PRUNING,
    category: 'board',
    cost: 300,
    owned: false,
    effect: '+10% Carolina Cross weight',
    requires: 'unlock_carolina_cross',
    // No top level: the rising price is the only limit
    repeatable: true,
    level: 0,
    costScaling: 1.6,
  },
  {
    id: 'spitting_practice',
    name: 'Spitting Practice',
    description: 'Out behind the barn, every evening',
    icon: SUMMER_UPGRADE_SPITTING_PRACTICE,
    category: 'board',
    cost: 300,
    owned: false,
    effect: '+2 ft per spit',
    // No top level: the rising price is the only limit
    repeatable: true,
    level: 0,
    costScaling: 1.5,
  },
];

export const ALL_SUMMER_UPGRADES: EventUpgrade[] = [
  ...PATCH_UPGRADES,
  ...STAND_UPGRADES,
  ...GROUNDS_UPGRADES,
  ...BOARD_UPGRADES,
];

// ============================================================================
// THE CHALLENGE BOARD
// ============================================================================

/**
 * The five kinds of challenge. Races add up while open; bests keep the highest.
 * Rivals roll around their base: a share of it for `percent` spreads, plus or
 * minus half the spread for `flat` ones. Each first place in a kind raises that
 * kind's base, by a share or by a flat amount.
 */
export const CHALLENGE_KINDS: Record<ChallengeKind, {
  name: string;
  description: string;
  scoring: 'race' | 'best';
  /** What a score counts: "melons", "Tickets", "Brix", "ft", "lb" */
  unit: string;
  decimals: 0 | 1;
  rivalBase: number;
  rivalSpread: number;
  growthPerWin: number;
  growth: 'percent' | 'flat';
  art: EventArtSource;
}> = {
  harvestRace: {
    name: 'Harvest Race',
    description: 'Most melons harvested while it\'s open',
    scoring: 'race',
    unit: 'melons',
    decimals: 0,
    rivalBase: 12,
    rivalSpread: 0.4,
    growthPerWin: 0.12,
    growth: 'percent',
    art: SUMMER_ART.harvestRace,
  },
  salesSprint: {
    name: 'Sales Sprint',
    description: 'Most Tickets from sales while it\'s open',
    scoring: 'race',
    unit: 'Tickets',
    decimals: 0,
    rivalBase: 80,
    rivalSpread: 0.4,
    growthPerWin: 0.12,
    growth: 'percent',
    art: SUMMER_ART.salesSprint,
  },
  sweetest: {
    name: 'Sweetest Melon',
    description: 'Your sweetest melon harvested while it\'s open',
    scoring: 'best',
    unit: 'Brix',
    decimals: 1,
    rivalBase: 11.0,
    rivalSpread: 1.0,
    growthPerWin: 0.2,
    growth: 'flat',
    art: SUMMER_ART.sweetest,
  },
  spitting: {
    name: 'Seed Spitting',
    description: 'Your longest spit while it\'s open',
    scoring: 'best',
    unit: 'ft',
    decimals: 0,
    rivalBase: 25,
    rivalSpread: 0.4,
    growthPerWin: 0.08,
    growth: 'percent',
    art: SUMMER_ART.spitting,
  },
  heaviest: {
    name: 'Heaviest Melon',
    description: 'Your heaviest Carolina Cross harvested while it\'s open',
    scoring: 'best',
    unit: 'lb',
    decimals: 0,
    rivalBase: 100,
    rivalSpread: 0.4,
    growthPerWin: 0.12,
    growth: 'percent',
    art: SUMMER_ART.heaviest,
  },
};

/** Kinds in the order the trophy case shows them */
export const CHALLENGE_ORDER: ChallengeKind[] = ['harvestRace', 'salesSprint', 'sweetest', 'spitting', 'heaviest'];

// ============================================================================
// TUNING
// ============================================================================

export const SUMMER_EVENT_CONSTANTS = {
  // Season: June 21 through Labor Day, the first Monday of September (months are 0-indexed)
  START_MONTH: 5,
  START_DAY: 21,
  /** Demand peaks on the Fourth of July */
  PEAK_MONTH: 6,
  PEAK_DAY: 4,

  // Melon Patch
  DEFAULT_PLOT_COUNT: 6,
  /** Tickets for each harvest, by grade; a Carolina Cross pays the normal rate */
  HARVEST_TICKETS: { normal: 1, sugar: 3 } as Record<MelonQuality, number>,

  // Sweetness, in Brix: a plain roll is 8.0 to 11.9, a Sugar Seeds roll 12.0 to 13.5;
  // 12.0 and up is a Sugar Melon, whatever raised it there
  BRIX_MIN: 8.0,
  BRIX_RANGE: 3.9,
  SUGAR_BRIX_MIN: 12.0,
  SUGAR_BRIX_RANGE: 1.5,
  SUN_RIPENING_BRIX: 0.2,
  /** Each first place in Sweetest Melon, up to the max */
  CHAMPION_BRIX_PER_WIN: 0.1,
  CHAMPION_BRIX_MAX: 0.8,

  // The Carolina Cross
  GIANT_MIN_WEIGHT: 50,        // pounds
  GIANT_WEIGHT_RANGE: 80,      // up to 130 pounds before bonuses
  VINE_PRUNING_PER_LEVEL: 0.10,
  /** Each first place in Heaviest Melon, up to the max: the champion seed rule */
  CHAMPION_WEIGHT_PER_WIN: 0.05,
  CHAMPION_WEIGHT_MAX: 0.4,
  POUNDS_PER_TICKET: 5,
  MAX_GIANT_SHELF: 12,
  WORLD_RECORD_WEIGHT: 350.5,
  /** Harvests the patch remembers for its Last Harvests strip */
  RECENT_HARVESTS: 5,

  // Juice Stand
  ICE_INTERVAL: 20,
  ICE_CAP: 10,
  SAWDUST_ICE_CAP: 25,
  /** Seeds the Picnic Crew leaves for Seed Spitting */
  CREW_SEED_RESERVE: 50,

  // Festival Grounds: demand doubles by the Fourth of July and holds there until the season ends
  BASE_DEMAND_MULTIPLIER: 1.0,
  MAX_DEMAND_MULTIPLIER: 2.0,
  DAILY_BONUS: 25,
  /** Tickets for each good sold on its own */
  GOOD_PRICES: {
    ice: 1,
    cups: 2,
    agua: 6,
    pickles: 5,
    roasted: 3,
  } as Record<SummerGood, number>,
  /** A Heatwave in the main game: cold finishes and goods sell for this much more */
  HEATWAVE_COLD_BONUS: 0.5,

  // Challenge Board
  OPEN_CHALLENGES: 3,
  CHALLENGE_LENGTH: 365,
  /** The first board's three, so one ends about every two minutes */
  FIRST_BOARD_LENGTHS: [365, 245, 125],
  PRIZES: { 1: 100, 2: 50, 3: 25, 4: 5 } as Record<1 | 2 | 3 | 4, number>,
  SPIT_SEEDS: 5,
  SPITS_PER_CHALLENGE: 10,
  SPIT_MIN: 10,                // feet
  SPIT_RANGE: 20,              // up to 30 feet before practice
  PRACTICE_FEET: 2,
} as const;

/** Customer messages for the Festival Grounds feed */
export const SUMMER_CUSTOMER_MESSAGES = [
  'A family bought a melon for the picnic! 🍉',
  'Archie is asleep in the shade of the stand! 💤',
  'Someone just got dunked! 💦',
  'The parade band is warming up! 🎺',
  'Kids are racing to the carousel! 🎠',
  'A regular asked how sweet the Crimson Sweets are! 🍬',
  'Hot one today, and the Snow Cones are flying! 🍧',
  'A customer left a glowing review! ⭐',
];
