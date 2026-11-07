/**
 * Summer Watermelon Festival Type Definitions
 *
 * Seasonal event (June 21 through Labor Day). Grow melons in the Melon Patch, chill,
 * carve and craft at the Juice Stand, sell at the Festival Grounds for Tickets, and
 * race three named rivals on the Challenge Board.
 */
import type { EventUpgrade } from './eventUpgrades';

// ============================================================================
// MELONS
// ============================================================================

/** Melons grown in the patch. The Carolina Cross is the giant, weighed at harvest. */
export type MelonVariety = 'sugarBaby' | 'crimsonSweet' | 'carolinaCross';

/** Melons that go into stock and can be finished; giants go on the shelf instead */
export type StockMelon = Exclude<MelonVariety, 'carolinaCross'>;

/** Melon grade; Sugar Melons, 12.0 Brix and up, are worth double */
export type MelonQuality = 'normal' | 'sugar';

/** Work done on a melon at the Juice Stand; both together make a Picnic Basket */
export type MelonDecoration = 'chill' | 'carve';

/** Finish of a melon for sale, the last part of an inventory key */
export type MelonFinish = 'plain' | 'chilled' | 'carved' | 'basket';

/** One plot in the Melon Patch. Grade, sweetness and weight are rolled at harvest. */
export interface MelonPlot {
  id: string;
  variety: MelonVariety | null; // null = empty plot
  growth: number;                // 0 to growthTime, in game days
  growthTime: number;
  harvestReady: boolean;
}

/** Melons ready to sell, keyed by variety_quality_finish */
export type MelonInventory = Record<string, number>;

/** A Carolina Cross waiting on the shelf */
export interface GiantMelon {
  id: string;
  weight: number; // pounds
}

/** What one harvest gave, for the patch's Last Harvests strip and the log */
export interface MelonHarvest {
  variety: MelonVariety;
  quality: MelonQuality;
  /** Sweetness in Brix, one decimal; 0 for a Carolina Cross */
  brix: number;
  /** Pounds for a Carolina Cross, otherwise 0 */
  weight: number;
}

// ============================================================================
// MATERIALS AND GOODS
// ============================================================================

/** Materials from harvests and the Ice House, and the goods crafted from them */
export interface SummerMaterials {
  seeds: number;
  /** Melons that cracked on the vine: fine for the Juice Stand, not for the stall */
  splits: number;
  rinds: number;
  /** Blocks of ice from the Ice House; spare ones sell as Snow Cones */
  ice: number;
  /** Cups of melon balls */
  cups: number;
  agua: number;
  pickles: number;
  roasted: number;
}

/** Materials and goods the Festival Grounds buy on their own */
export type SummerGood = 'ice' | 'cups' | 'agua' | 'pickles' | 'roasted';

/** A Juice Stand recipe */
export interface SummerRecipe {
  id: string;
  name: string;
  /** What the Picnic Crew is doing while it makes one, such as Ball Melons */
  action: string;
  description: string;
  inputs: Partial<SummerMaterials>;
  output: Partial<SummerMaterials>;
  /** Upgrade that unlocks the recipe, if any */
  requiredUpgrade?: string;
}

// ============================================================================
// THE CHALLENGE BOARD
// ============================================================================

/** The five kinds of challenge; no two open challenges are the same kind */
export type ChallengeKind = 'harvestRace' | 'salesSprint' | 'sweetest' | 'spitting' | 'heaviest';

/** Finishing place among you and the three rivals; 4 means no ribbon */
export type ChallengePlacing = 1 | 2 | 3 | 4;

/** One open challenge */
export interface Challenge {
  id: string;
  kind: ChallengeKind;
  /** Game days it runs; the first board's challenges are shorter */
  length: number;
  daysLeft: number;
  /**
   * Your score: melons harvested, Tickets from sales, best Brix, longest spit in feet,
   * or heaviest Carolina Cross in pounds
   */
  score: number;
  /** Each rival's final score, rolled when it opened, in RIVAL_NAMES order */
  rivalFinals: number[];
  /** Spits left, for Seed Spitting; 0 for the other kinds */
  spitsLeft: number;
}

/** How one challenge ended */
export interface ChallengeResult {
  kind: ChallengeKind;
  placing: ChallengePlacing;
  score: number;
  /** Each rival's final score, in RIVAL_NAMES order */
  rivalScores: number[];
  prize: number;
}

/** Ribbons won in one kind */
export interface RibbonCount {
  first: number;
  second: number;
  third: number;
}

/** The board: three open challenges, the trophy case and the summer's first places */
export interface ChallengeBoardState {
  challenges: Challenge[];
  /** Challenges opened so far, which also numbers them */
  challengesOpened: number;
  ribbons: Record<ChallengeKind, RibbonCount>;
  /** Your best score in any one challenge of each kind, for the trophy case */
  bests: Record<ChallengeKind, number>;
  /** Challenges you finished ahead of each rival, a tie included, in RIVAL_NAMES order */
  beaten: number[];
  /** Kinds won first place in during the summer of `year`, for Clean Sweep */
  sweep: { year: number; kinds: ChallengeKind[] };
  lastResult: ChallengeResult | null;
}

// ============================================================================
// EVENT STATE
// ============================================================================

/** What the Picnic Crew did most recently, for the Juice Stand's crew bar */
export type PicnicCrewAction =
  | { type: 'craft'; recipeId: string }
  | { type: 'finish'; finish: MelonFinish };

/** Complete state of the Summer Watermelon Festival */
export interface SummerEventState {
  isActive: boolean;
  eventYear: number;

  // Currency
  tickets: number;
  totalTicketsEarned: number;
  /** Passive income below one Ticket, carried over to the next second */
  passiveRemainder: number;

  // Melon Patch
  plots: MelonPlot[];
  maxPlots: number;
  /** The last few harvests, newest first */
  recentHarvests: MelonHarvest[];
  /** Sweetest Brix and heaviest pounds ever grown */
  personalBest: { brix: number; weight: number };
  /** The melon chosen to plant, kept across tab switches and reloads */
  chosenMelon?: MelonVariety;

  // Juice Stand
  materials: SummerMaterials;
  inventory: MelonInventory;
  giantShelf: GiantMelon[];
  /** Carolina Cross harvested, which also numbers them */
  giantsGrown: number;
  /** Game days toward the next block of ice */
  iceGrowth: number;

  // Festival Grounds
  /** Melons sold in any finish, giants included; crafted goods do not count */
  totalMelonsSold: number;
  demandMultiplier: number;
  /** Date (YYYY-MM-DD) the daily bonus was last claimed */
  lastBonusDate: string;
  passiveTicketsPerSecond: number;

  // Challenge Board
  board: ChallengeBoardState;

  // Progression
  upgrades: EventUpgrade[];

  // Picnic Crew
  currentCrewAction?: PicnicCrewAction;
}
