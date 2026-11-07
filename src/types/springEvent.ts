/**
 * Spring Farmer's Market Event Type Definitions
 *
 * Seasonal event (March 20 through Memorial Day). Grow flowers in the Flower Beds,
 * gather herbs in the Herb Garden, finish bunches and make teas in the Potting Shed,
 * and sell at the Market Stall for Petals, now or on Market Day from the Cart.
 */
import type { EventUpgrade } from './eventUpgrades';

// ============================================================================
// FLOWERS
// ============================================================================

/** Flower varieties grown in the beds */
export type FlowerVariety = 'tulip' | 'daffodil' | 'rose';

/** Flower quality; Prize Blooms are worth double */
export type FlowerQuality = 'normal' | 'prize';

/** Work done on a bunch in the Potting Shed; both together make a Gift Bouquet */
export type FlowerDecoration = 'arrange' | 'scent';

/** Finish of a bunch for sale, the last part of an inventory key */
export type FlowerFinish = 'plain' | 'arranged' | 'scented' | 'bouquet';

/** One bed in the Flower Beds */
export interface FlowerBed {
  id: string;
  variety: FlowerVariety | null; // null = empty bed
  growth: number;                 // 0 to growthTime, in game days
  growthTime: number;
  quality: FlowerQuality;
  harvestReady: boolean;
}

/** Bunches ready to sell, keyed by variety_quality_finish */
export type FlowerInventory = Record<string, number>;

// ============================================================================
// HERBS
// ============================================================================

/** Perennial herbs: each is planted once and keeps giving sprigs */
export type HerbKind = 'mint' | 'basil' | 'chamomile' | 'lavender';

/** One herb's slot in the Herb Garden. Planting is an unlock upgrade, so the slot only counts. */
export interface HerbSlot {
  /** Sprigs waiting to be gathered, up to the slot's cap */
  sprigs: number;
  /** Game days toward the next sprig; held at 0 while the slot is full */
  growth: number;
}

// ============================================================================
// MATERIALS AND GOODS
// ============================================================================

/** Materials from harvests and the herb garden, and the goods crafted from them */
export interface SpringMaterials {
  greenery: number;
  seeds: number;
  mint: number;
  basil: number;
  chamomile: number;
  lavender: number;
  mintTea: number;
  chamomileTea: number;
  pesto: number;
  packets: number;
}

/** Materials and goods the Market Stall buys on their own */
export type SpringGood = 'greenery' | 'lavender' | 'mintTea' | 'chamomileTea' | 'pesto' | 'packets';

/** A Potting Shed recipe */
export interface SpringRecipe {
  id: string;
  name: string;
  /** What the Gnome Crew is doing while it makes one, such as Steep Mint Tea */
  action: string;
  description: string;
  inputs: Partial<SpringMaterials>;
  output: Partial<SpringMaterials>;
  /** Upgrade that unlocks the recipe, if any */
  requiredUpgrade?: string;
}

// ============================================================================
// THE CART AND MARKET DAY
// ============================================================================

/** Goods waiting on the Cart for Market Day */
export interface SpringCart {
  /** Bunches, keyed like the inventory */
  bunches: FlowerInventory;
  goods: Partial<Record<SpringGood, number>>;
}

/** What one Market Day sold */
export interface MarketDayResult {
  bunches: number;
  goods: number;
  petals: number;
}

/** The countdown to Market Day, and how the last one went */
export interface MarketDayState {
  /** Game days until the Cart sells */
  daysUntilMarket: number;
  marketsHeld: number;
  lastResult: MarketDayResult | null;
}

// ============================================================================
// EVENT STATE
// ============================================================================

/** What the Gnome Crew did most recently, for the Potting Shed and Herb Garden displays */
export type GnomeCrewAction =
  | { type: 'gather'; herb: HerbKind }
  | { type: 'craft'; recipeId: string }
  | { type: 'finish'; finish: FlowerFinish }
  | { type: 'load' };

/** Complete state of the Spring Farmer's Market */
export interface SpringEventState {
  isActive: boolean;
  eventYear: number;

  // Currency
  petals: number;
  totalPetalsEarned: number;
  /** Passive income below one Petal, carried over to the next second */
  passiveRemainder: number;

  // Flower Beds
  beds: FlowerBed[];
  maxBeds: number;
  /** The flower chosen to plant, kept across tab switches and reloads */
  chosenFlower?: FlowerVariety;

  // Herb Garden
  herbs: Record<HerbKind, HerbSlot>;

  // Materials and goods
  materials: SpringMaterials;
  inventory: FlowerInventory;

  // Market Stall
  cart: SpringCart;
  market: MarketDayState;
  /** Bunches sold in any finish, at the stall or from the Cart; crafted goods do not count */
  totalFlowersSold: number;
  /** Gift Bouquets sold on the real Mother's Day of `year` */
  mothersDayBouquets: { year: number; sold: number };
  demandMultiplier: number;
  /** Date (YYYY-MM-DD) the daily bonus was last claimed */
  lastBonusDate: string;
  passivePetalsPerSecond: number;

  // Progression
  upgrades: EventUpgrade[];

  // Gnome Crew
  currentCrewAction?: GnomeCrewAction;
}
