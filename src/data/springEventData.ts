/**
 * Spring Farmer's Market Event Data
 *
 * Flowers, herbs, recipes, upgrades and tuning for the seasonal spring event.
 * Balance changes belong here.
 *
 * Each SPRING_ART entry has an image in public/ and keeps its emoji as the fallback,
 * as PUMPKIN_ART does. Seven upgrades keep icons borrowed from the farm and the
 * Pumpkin Rush: Bed Expansion, Heirloom Bulbs, Dibber, Trellis, Second Row,
 * Florist's Touch and Regulars.
 */
import {
  UPGRADE_ADDITIONAL_PLOT,
  UPGRADE_HEIRLOOM_SEEDS,
  ICON_PLOTS,
  ICON_SPARKLES,
  ICON_MERCHANT,
  ICON_PETALS,
  PUMPKIN_VINES,
  PUMPKIN_UPGRADE_SEED_DRILL,
  SPRING_TULIPS,
  SPRING_DAFFODILS,
  SPRING_ROSES,
  SPRING_SPROUT,
  SPRING_PRIZE_BLOOM,
  SPRING_BOUQUET,
  SPRING_GREENERY,
  SPRING_SEEDS,
  SPRING_PACKETS,
  SPRING_MINT,
  SPRING_BASIL,
  SPRING_CHAMOMILE,
  SPRING_LAVENDER,
  SPRING_MINT_TEA,
  SPRING_CHAMOMILE_TEA,
  SPRING_PESTO,
  SPRING_GNOME,
  SPRING_CART,
  SPRING_SANDWICH_BOARD,
  SPRING_BUSKER,
  SPRING_BEDS,
  SPRING_GARDEN,
  SPRING_SHED,
  SPRING_STALL,
  SPRING_UPGRADE_RAIN_BARREL,
  SPRING_UPGRADE_TRUG,
  SPRING_UPGRADE_WATERING_CAN,
  SPRING_UPGRADE_PACKET_PRESS,
  SPRING_UPGRADE_GNOME_CREW,
  SPRING_UPGRADE_BUSY_GNOMES,
  SPRING_UPGRADE_SILK_RIBBONS,
  SPRING_UPGRADE_BUNTING,
  SPRING_UPGRADE_CART_LOADER,
  SPRING_UPGRADE_PONY_CART
} from '../config/assetPaths';
import type { EventArtSource } from '../components/EventArt';
import type { EventUpgrade } from '../types/eventUpgrades';
import type {
  FlowerVariety,
  FlowerQuality,
  FlowerFinish,
  HerbKind,
  SpringGood,
  SpringMaterials,
  SpringRecipe
} from '../types/springEvent';

// ============================================================================
// ART
// ============================================================================

/** Spring Market art: each image with its emoji as the fallback */
export const SPRING_ART = {
  tulip: { image: SPRING_TULIPS, emoji: '🌷' },
  daffodil: { image: SPRING_DAFFODILS, emoji: '🌼' },
  rose: { image: SPRING_ROSES, emoji: '🌹' },
  sprout: { image: SPRING_SPROUT, emoji: '🌱' },
  prizeBloom: { image: SPRING_PRIZE_BLOOM, emoji: '🏵️' },
  bouquet: { image: SPRING_BOUQUET, emoji: '💐' },
  greenery: { image: SPRING_GREENERY, emoji: '🌿' },
  seeds: { image: SPRING_SEEDS, emoji: '🌰' },
  packets: { image: SPRING_PACKETS, emoji: '✉️' },
  mint: { image: SPRING_MINT, emoji: '🌿' },
  basil: { image: SPRING_BASIL, emoji: '🌱' },
  chamomile: { image: SPRING_CHAMOMILE, emoji: '🌼' },
  lavender: { image: SPRING_LAVENDER, emoji: '💜' },
  mintTea: { image: SPRING_MINT_TEA, emoji: '🍵' },
  chamomileTea: { image: SPRING_CHAMOMILE_TEA, emoji: '🫖' },
  pesto: { image: SPRING_PESTO, emoji: '🫙' },
  petals: { image: ICON_PETALS, emoji: '🌸' },
  gnome: { image: SPRING_GNOME, emoji: '🧑‍🌾' },
  cart: { image: SPRING_CART, emoji: '🛒' },
  sandwichBoard: { image: SPRING_SANDWICH_BOARD, emoji: '🪧' },
  busker: { image: SPRING_BUSKER, emoji: '🎻' },
  beds: { image: SPRING_BEDS, emoji: '🌷' },
  garden: { image: SPRING_GARDEN, emoji: '🌿' },
  shed: { image: SPRING_SHED, emoji: '🛖' },
  stall: { image: SPRING_STALL, emoji: '🛒' },
} satisfies Record<string, EventArtSource>;

// ============================================================================
// FLOWERS
// ============================================================================

/** Flower definitions. Growth is in game days (one per second). */
export const FLOWER_VARIETIES: Record<FlowerVariety, {
  name: string;
  /** The plural, for a bunch of them */
  plural: string;
  description: string;
  growthTime: number;
  /** Materials a harvest gives besides the bunch */
  baseYield: Pick<SpringMaterials, 'greenery' | 'seeds'>;
  /** Petals for one plain bunch */
  baseValue: number;
  /** Upgrade that unlocks planting this flower */
  unlockUpgrade: string;
  unlockCost: number;
  art: EventArtSource;
}> = {
  tulip: {
    name: 'Tulip',
    plural: 'Tulips',
    description: 'Cheerful and quick, the first flowers of the season',
    growthTime: 150,
    baseYield: { greenery: 1, seeds: 2 },
    baseValue: 2,
    unlockUpgrade: 'unlock_tulip',
    unlockCost: 0,
    art: SPRING_ART.tulip,
  },
  daffodil: {
    name: 'Daffodil',
    plural: 'Daffodils',
    description: 'Bright yellow trumpets, full of greenery for arranging',
    growthTime: 200,
    baseYield: { greenery: 2, seeds: 2 },
    baseValue: 3,
    unlockUpgrade: 'unlock_daffodil',
    unlockCost: 200,
    art: SPRING_ART.daffodil,
  },
  rose: {
    name: 'Rose',
    plural: 'Roses',
    description: "Slow and precious, the Mother's Day flower",
    growthTime: 360,
    baseYield: { greenery: 2, seeds: 1 },
    baseValue: 6,
    unlockUpgrade: 'unlock_rose',
    unlockCost: 1000,
    art: SPRING_ART.rose,
  },
};

/** Flowers in the order the beds and the stall show them */
export const FLOWER_ORDER: FlowerVariety[] = ['tulip', 'daffodil', 'rose'];

/** Sale value multipliers by quality */
export const FLOWER_QUALITY_MULTIPLIERS: Record<FlowerQuality, number> = {
  normal: 1.0,
  prize: 2.0,
};

/** Sale value multipliers by finish: a Gift Bouquet, arranged and scented, is worth triple */
export const FLOWER_FINISH_MULTIPLIERS: Record<FlowerFinish, number> = {
  plain: 1.0,
  arranged: 1.0,
  scented: 1.0,
  bouquet: 3.0,
};

/**
 * Petals an arrangement or a scent adds to each bunch, after the other bonuses.
 * More than greenery (1) or a lavender sprig (2) sells for on its own, so finishing pays.
 */
export const FLOWER_FINISH_BONUSES: Record<FlowerFinish, number> = {
  plain: 0,
  arranged: 2,
  scented: 3,
  bouquet: 0,
};

/** Display names for finishes */
export const FLOWER_FINISH_NAMES: Record<FlowerFinish, string> = {
  plain: 'Plain',
  arranged: 'Arranged',
  scented: 'Scented',
  bouquet: 'Gift Bouquet',
};

/** Finishes in the order a stall card lists them */
export const FLOWER_FINISH_ORDER: FlowerFinish[] = ['plain', 'arranged', 'scented', 'bouquet'];

// ============================================================================
// HERBS
// ============================================================================

/** Herb definitions. A sprig grows every `interval` game days. */
export const HERBS: Record<HerbKind, {
  name: string;
  description: string;
  interval: number;
  /** Upgrade that plants the herb */
  unlockUpgrade: string;
  unlockCost: number;
  /** What the sprigs are for, for the garden tile */
  use: string;
  /** Why to plant it, for the tile before it is planted */
  pitch: string;
  art: EventArtSource;
}> = {
  mint: {
    name: 'Mint',
    description: 'Grows like a weed, and makes a fine tea',
    interval: 20,
    unlockUpgrade: 'unlock_mint',
    unlockCost: 0,
    use: 'For Mint Tea, 3 to a tin, and 1 in Chamomile Tea',
    pitch: 'Mint Tea needs it: 3 sprigs to a tin that sells for 4 Petals.',
    art: SPRING_ART.mint,
  },
  basil: {
    name: 'Basil',
    description: 'Sweet basil for jars of pesto',
    interval: 30,
    unlockUpgrade: 'unlock_basil',
    unlockCost: 150,
    use: 'For Pesto, 3 to a jar',
    pitch: 'Pesto needs it: 3 basil to a jar that sells for 5 Petals. Plant it once and it keeps giving all spring.',
    art: SPRING_ART.basil,
  },
  chamomile: {
    name: 'Chamomile',
    description: 'Little daisies for a calming tea',
    interval: 40,
    unlockUpgrade: 'unlock_chamomile',
    unlockCost: 300,
    use: 'For Chamomile Tea, 2 to a tin with a sprig of mint',
    pitch: 'Chamomile Tea needs it: 2 with a sprig of mint make a tin that sells for 6 Petals. Plant it once and it keeps giving all spring.',
    art: SPRING_ART.chamomile,
  },
  lavender: {
    name: 'Lavender',
    description: 'Scents bunches, and sells on its own',
    interval: 60,
    unlockUpgrade: 'unlock_lavender',
    unlockCost: 500,
    use: 'Scents bunches and ties Gift Bouquets, or sells for 2 Petals',
    pitch: 'Scenting needs it: a sprig makes a bunch Scented, and with greenery a Gift Bouquet worth triple. Plant it once and it keeps giving all spring.',
    art: SPRING_ART.lavender,
  },
};

/** Herbs in the order the garden shows them */
export const HERB_ORDER: HerbKind[] = ['mint', 'basil', 'chamomile', 'lavender'];

// ============================================================================
// POTTING SHED RECIPES
// ============================================================================

export const SPRING_RECIPES: SpringRecipe[] = [
  {
    id: 'mint_tea',
    name: 'Mint Tea',
    action: 'Steep Mint Tea',
    description: 'Dry mint into a tin of tea',
    inputs: { mint: 3 },
    output: { mintTea: 1 },
  },
  {
    id: 'chamomile_tea',
    name: 'Chamomile Tea',
    action: 'Steep Chamomile Tea',
    description: 'Chamomile with a sprig of mint, a tin of calming tea',
    inputs: { chamomile: 2, mint: 1 },
    output: { chamomileTea: 1 },
  },
  {
    id: 'pesto',
    name: 'Pesto',
    action: 'Make Pesto',
    description: 'Pound basil into a jar of pesto',
    inputs: { basil: 3 },
    output: { pesto: 1 },
  },
  {
    id: 'seed_packets',
    name: 'Seed Packets',
    action: 'Press Seed Packets',
    description: 'Fold saved seeds into packets for gardeners',
    inputs: { seeds: 3 },
    output: { packets: 1 },
    requiredUpgrade: 'packet_press',
  },
];

/** Display names for the goods the stall buys */
export const SPRING_GOOD_NAMES: Record<SpringGood, string> = {
  greenery: 'Greenery',
  lavender: 'Lavender',
  mintTea: 'Mint Tea',
  chamomileTea: 'Chamomile Tea',
  pesto: 'Pesto',
  packets: 'Seed Packets',
};

/** One of each good, for counts of 1 */
export const SPRING_GOOD_SINGULAR: Record<SpringGood, string> = {
  greenery: 'Greenery',
  lavender: 'Lavender',
  mintTea: 'Mint Tea',
  chamomileTea: 'Chamomile Tea',
  pesto: 'Pesto',
  packets: 'Seed Packet',
};

/** What a crafted good comes in, for the recipe cards: one and many */
export const SPRING_GOOD_UNITS: Partial<Record<SpringGood, [string, string]>> = {
  mintTea: ['tin', 'tins'],
  chamomileTea: ['tin', 'tins'],
  pesto: ['jar', 'jars'],
  packets: ['packet', 'packets'],
};

/** Goods in the order the stall shows them */
export const SPRING_GOOD_ORDER: SpringGood[] = ['greenery', 'lavender', 'mintTea', 'chamomileTea', 'pesto', 'packets'];

/** Goods the Gnome Crew makes, which Everything to the Cart and the Cart Loader take; raw greenery and lavender stay for finishing */
export const CRAFTED_GOODS: SpringGood[] = ['mintTea', 'chamomileTea', 'pesto', 'packets'];

// ============================================================================
// UPGRADES
// ============================================================================

/** Flower Beds upgrades */
export const BED_UPGRADES: EventUpgrade[] = [
  {
    id: 'unlock_tulip',
    name: 'Tulip Bulbs',
    description: FLOWER_VARIETIES.tulip.description,
    icon: SPRING_TULIPS,
    category: 'farming',
    cost: 0,
    owned: true, // Start with this
    effect: 'Unlock Tulips',
  },
  {
    id: 'unlock_daffodil',
    name: 'Daffodil Bulbs',
    description: FLOWER_VARIETIES.daffodil.description,
    icon: SPRING_DAFFODILS,
    category: 'farming',
    cost: FLOWER_VARIETIES.daffodil.unlockCost,
    owned: false,
    effect: 'Unlock Daffodils',
  },
  {
    id: 'unlock_rose',
    name: 'Rose Bushes',
    description: FLOWER_VARIETIES.rose.description,
    icon: SPRING_ROSES,
    category: 'farming',
    cost: FLOWER_VARIETIES.rose.unlockCost,
    owned: false,
    effect: 'Unlock Roses',
  },
  {
    id: 'rain_barrel',
    name: 'Rain Barrel',
    description: 'April showers, saved for the beds',
    icon: SPRING_UPGRADE_RAIN_BARREL,
    category: 'farming',
    cost: 400,
    owned: false,
    effect: '+15% flower growth speed',
    speedBonus: 0.15,
    repeatable: true,
    level: 0,
    maxLevel: 20,
    costScaling: 1.5,
  },
  {
    id: 'bed_expansion',
    name: 'Bed Expansion',
    description: 'Dig another flower bed',
    icon: UPGRADE_ADDITIONAL_PLOT,
    category: 'farming',
    cost: 200,
    owned: false,
    effect: '+1 flower bed',
    repeatable: true,
    level: 0,
    maxLevel: 6,
    costScaling: 1.5,
  },
  {
    id: 'heirloom_bulbs',
    name: 'Heirloom Bulbs',
    description: 'Bulbs passed down from prize-winning gardens',
    icon: UPGRADE_HEIRLOOM_SEEDS,
    category: 'farming',
    cost: 1200,
    owned: false,
    effect: '10% chance of a Prize Bloom',
    procChance: 0.10,
  },
  {
    id: 'trug',
    name: 'Trug',
    description: 'A wide garden basket for cutting every bed at once',
    icon: SPRING_UPGRADE_TRUG,
    category: 'farming',
    cost: 500,
    owned: false,
    effect: 'Unlock "Harvest All" button',
  },
  {
    id: 'dibber',
    name: 'Dibber',
    description: 'Poke a hole, drop a bulb: plant every empty bed at once',
    icon: PUMPKIN_UPGRADE_SEED_DRILL,
    category: 'farming',
    cost: 800,
    owned: false,
    effect: 'Unlock "Plant All" button',
  },
];

/** Herb Garden upgrades */
export const GARDEN_UPGRADES: EventUpgrade[] = [
  {
    id: 'unlock_mint',
    name: 'Mint',
    description: HERBS.mint.description,
    icon: SPRING_MINT,
    category: 'garden',
    cost: 0,
    owned: true, // Start with this
    effect: 'Plant Mint',
  },
  {
    id: 'unlock_basil',
    name: 'Basil',
    description: HERBS.basil.description,
    icon: SPRING_BASIL,
    category: 'garden',
    cost: HERBS.basil.unlockCost,
    owned: false,
    effect: 'Plant Basil',
  },
  {
    id: 'unlock_chamomile',
    name: 'Chamomile',
    description: HERBS.chamomile.description,
    icon: SPRING_CHAMOMILE,
    category: 'garden',
    cost: HERBS.chamomile.unlockCost,
    owned: false,
    effect: 'Plant Chamomile',
  },
  {
    id: 'unlock_lavender',
    name: 'Lavender',
    description: HERBS.lavender.description,
    icon: SPRING_LAVENDER,
    category: 'garden',
    cost: HERBS.lavender.unlockCost,
    owned: false,
    effect: 'Plant Lavender',
  },
  {
    id: 'watering_can',
    name: 'Watering Can',
    description: 'A morning watering keeps the herbs coming',
    icon: SPRING_UPGRADE_WATERING_CAN,
    category: 'garden',
    cost: 300,
    owned: false,
    effect: '+15% herb growth speed',
    speedBonus: 0.15,
    repeatable: true,
    level: 0,
    maxLevel: 20,
    costScaling: 1.5,
  },
  {
    id: 'trellis',
    name: 'Trellis',
    description: 'Something to climb, so every herb holds more',
    icon: PUMPKIN_VINES,
    category: 'garden',
    cost: 600,
    owned: false,
    effect: 'Each herb holds 25 sprigs',
  },
  {
    id: 'second_row',
    name: 'Second Row',
    description: 'Plant a second row of every herb',
    icon: ICON_PLOTS,
    category: 'garden',
    cost: 900,
    owned: false,
    effect: '2 sprigs each time an herb grows',
  },
];

/** Potting Shed upgrades */
export const SHED_UPGRADES: EventUpgrade[] = [
  {
    id: 'packet_press',
    name: 'Packet Press',
    description: 'Folds and seals paper seed packets',
    icon: SPRING_UPGRADE_PACKET_PRESS,
    category: 'workshop',
    cost: 300,
    owned: false,
    effect: 'Unlock Seed Packets',
  },
  {
    id: 'florists_touch',
    name: "Florist's Touch",
    description: 'A trained eye for a lovely arrangement',
    icon: ICON_SPARKLES,
    category: 'workshop',
    cost: 600,
    owned: false,
    effect: '+25% Arranged and Bouquet value',
    valueBonus: 0.25,
  },
  {
    id: 'gnome_crew',
    name: 'Gnome Crew',
    description: 'Garden gnomes that gather herbs, make teas and tie bouquets',
    icon: SPRING_UPGRADE_GNOME_CREW,
    category: 'workshop',
    cost: 1200,
    owned: false,
    effect: 'Automates the shed and herbs',
  },
  {
    id: 'busy_gnomes',
    name: 'Busy Gnomes',
    description: 'More gnomes on the crew',
    icon: SPRING_UPGRADE_BUSY_GNOMES,
    category: 'workshop',
    cost: 500,
    owned: false,
    effect: '+1 crew job per second',
    requires: 'gnome_crew',
    hiddenUntilRequired: true,
    repeatable: true,
    level: 0,
    maxLevel: 20,
    costScaling: 1.5,
  },
  {
    id: 'silk_ribbons',
    name: 'Silk Ribbons',
    description: 'A satin bow makes any bouquet a gift',
    icon: SPRING_UPGRADE_SILK_RIBBONS,
    category: 'workshop',
    cost: 3000,
    owned: false,
    effect: '+50% sale value for Gift Bouquets',
    valueBonus: 0.50,
  },
];

/** Market Stall upgrades */
export const STALL_UPGRADES: EventUpgrade[] = [
  {
    id: 'spring_bunting',
    name: 'Spring Bunting',
    description: 'Pastel flags bring in passing traffic',
    icon: SPRING_UPGRADE_BUNTING,
    category: 'shopfront',
    cost: 500,
    owned: false,
    effect: '+10% Petals from flower sales',
    valueBonus: 0.10,
  },
  {
    id: 'sandwich_board',
    name: 'Sandwich Board',
    description: "Today's specials, chalked by the path",
    icon: SPRING_SANDWICH_BOARD,
    category: 'shopfront',
    cost: 1000,
    owned: false,
    effect: 'Enable the daily customer bonus',
  },
  {
    id: 'busker',
    name: 'Busker',
    description: 'A fiddler by the stall, and a hat for coins',
    icon: SPRING_BUSKER,
    category: 'shopfront',
    cost: 1800,
    owned: false,
    effect: 'Passive Petal income',
    requires: 'sandwich_board',
    passiveIncome: 0.1, // 1 Petal per 10 seconds
  },
  {
    id: 'regulars',
    name: 'Regulars',
    description: 'Customers who come back every week, and tip',
    icon: ICON_MERCHANT,
    category: 'shopfront',
    cost: 2500,
    owned: false,
    effect: 'Random tips from customers',
    requires: 'busker',
  },
  {
    id: 'cart_loader',
    name: 'Cart Loader',
    description: 'The gnomes load the Cart for Market Day',
    icon: SPRING_UPGRADE_CART_LOADER,
    category: 'shopfront',
    cost: 1500,
    owned: false,
    effect: 'The crew loads the Cart',
    requires: 'gnome_crew',
  },
  {
    id: 'pony_cart',
    name: 'Pony Cart',
    description: 'A pony gets the Cart to market sooner',
    icon: SPRING_UPGRADE_PONY_CART,
    category: 'shopfront',
    cost: 2000,
    owned: false,
    effect: 'Market Day every 40 days',
  },
];

export const ALL_SPRING_UPGRADES: EventUpgrade[] = [
  ...BED_UPGRADES,
  ...GARDEN_UPGRADES,
  ...SHED_UPGRADES,
  ...STALL_UPGRADES,
];

// ============================================================================
// TUNING
// ============================================================================

export const SPRING_EVENT_CONSTANTS = {
  // Season: March 20 through Memorial Day, the last Monday of May (months are 0-indexed)
  START_MONTH: 2,
  START_DAY: 20,

  // Flower Beds
  DEFAULT_BED_COUNT: 6,
  /** Petals for each harvest, by quality */
  HARVEST_PETALS: { normal: 1, prize: 3 } as Record<FlowerQuality, number>,

  // Herb Garden
  HERB_CAP: 10,
  TRELLIS_CAP: 25,
  SPRIGS_PER_CYCLE: 1,
  SECOND_ROW_SPRIGS: 2,

  // Market Stall: demand doubles by Mother's Day and holds there until the season ends
  BASE_DEMAND_MULTIPLIER: 1.0,
  MAX_DEMAND_MULTIPLIER: 2.0,
  DAILY_BONUS: 25,
  /** Petals for each good sold on its own */
  GOOD_PRICES: {
    greenery: 1,
    lavender: 2,
    mintTea: 4,
    chamomileTea: 6,
    pesto: 5,
    packets: 4,
  } as Record<SpringGood, number>,

  // The Cart sells everything on it every Market Day, for half again as much
  MARKET_DAY_INTERVAL: 60,
  PONY_CART_INTERVAL: 40,
  MARKET_DAY_BONUS: 0.5,
} as const;

/** Customer messages for the Market Stall feed */
export const SPRING_CUSTOMER_MESSAGES = [
  'Someone bought a bunch of tulips for their mom! 🌷',
  'Archie is asleep under the cart! 💤',
  'The busker just played a request! 🎻',
  'A gardener stocked up on seed packets! 🌱',
  'Kids are chasing bubbles past the stall! 🫧',
  'A regular asked after the roses! 🌹',
  'A light spring shower, and everyone under the awning! 🌦️',
  'A customer left a glowing review! ⭐',
];
