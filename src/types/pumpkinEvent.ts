/**
 * Fall Pumpkin Rush Event Type Definitions
 *
 * Seasonal event (September 22 through Thanksgiving). Grow pumpkins in the Pumpkin
 * Patch, carve and light them in the Carving Barn, sell them at the Farm Stand
 * for Candy Corn, and enter Atlantic Giants in the County Fair weigh-off.
 */
import type { EventUpgrade } from './eventUpgrades';

// ============================================================================
// PUMPKINS
// ============================================================================

/** Pumpkin varieties. Giants are weighed instead of carved. */
export type PumpkinVariety = 'sugarPie' | 'carver' | 'giant';

/** Pumpkin quality; Blue Ribbon pumpkins are worth double */
export type PumpkinQuality = 'normal' | 'blueRibbon';

/** Work done on a pumpkin in the Carving Barn; both together make a Jack-o'-Lantern */
export type PumpkinDecoration = 'carving' | 'candle';

/** Finish of a pumpkin for sale, the last part of an inventory key */
export type PumpkinFinish = 'plain' | 'carved' | 'candlelit' | 'lantern';

/** One plot in the Pumpkin Patch */
export interface PumpkinPlot {
  id: string;
  variety: PumpkinVariety | null; // null = empty plot
  growth: number;                  // 0 to growthTime, in game days
  growthTime: number;
  quality: PumpkinQuality;
  harvestReady: boolean;
}

/** Materials from harvests, and the goods crafted from them */
export interface PumpkinMaterials {
  seeds: number;
  pulp: number;
  vines: number;
  pies: number;
  candles: number;
  stencils: number;
}

/** A Carving Barn recipe */
export interface PumpkinRecipe {
  id: string;
  name: string;
  description: string;
  inputs: Partial<PumpkinMaterials>;
  output: Partial<PumpkinMaterials>;
  /** Upgrade that unlocks the recipe, if any */
  requiredUpgrade?: string;
}

/** Pumpkins ready to sell, keyed by variety_quality_finish. Giants live on the giant shelf instead. */
export type PumpkinInventory = Record<string, number>;

/** An Atlantic Giant waiting on the shelf, to be sold or entered in the weigh-off */
export interface GiantPumpkin {
  id: string;
  weight: number; // pounds
  quality: PumpkinQuality;
}

// ============================================================================
// COUNTY FAIR WEIGH-OFF
// ============================================================================

/** Finishing place at the weigh-off; 4 means no ribbon */
export type FairPlacing = 1 | 2 | 3 | 4;

/** How one weigh-off went */
export interface WeighOffResult {
  placing: FairPlacing;
  weight: number;
  rivalWeights: number[];
  prize: number;
}

/** County Fair progress */
export interface WeighOffState {
  /** Game days until the next fair; 0 means the fair is open for an entry */
  daysUntilFair: number;
  fairsEntered: number;
  ribbons: { first: number; second: number; third: number };
  /** Heaviest giant grown, in pounds */
  personalBest: number;
  /** Atlantic Giants harvested, which also numbers them */
  giantsGrown: number;
  lastResult: WeighOffResult | null;
}

// ============================================================================
// EVENT STATE
// ============================================================================

/** What the Scarecrow Crew did most recently, for the Carving Barn display */
export type ScarecrowCrewAction =
  | { type: 'craft'; recipeId: string }
  | { type: 'decorate'; finish: PumpkinFinish };

/** Complete state of the Fall Pumpkin Rush */
export interface PumpkinEventState {
  isActive: boolean;
  eventYear: number;

  // Currency
  candyCorn: number;
  totalCandyCornEarned: number;
  /** Passive income below one Candy Corn, carried over to the next second */
  passiveRemainder: number;

  // Pumpkin Patch
  plots: PumpkinPlot[];
  maxPlots: number;

  // Materials and goods
  materials: PumpkinMaterials;
  inventory: PumpkinInventory;
  giantShelf: GiantPumpkin[];

  // Farm Stand
  totalPumpkinsSold: number;
  demandMultiplier: number;
  /** Date (YYYY-MM-DD) the daily bonus was last claimed */
  lastBonusDate: string;
  passiveCandyCornPerSecond: number;

  // Progression
  upgrades: EventUpgrade[];
  weighOff: WeighOffState;

  // Scarecrow Crew
  currentCrewAction?: ScarecrowCrewAction;
}
