/**
 * Summer Watermelon Festival Event Hook
 *
 * State and actions for the seasonal summer event (June 21 through Labor Day):
 * Tickets, the Melon Patch, the Juice Stand, the Festival Grounds and the
 * Challenge Board.
 *
 * Every action decides from the latest state, applies the same pure transition
 * inside the state updater, and runs callbacks afterwards. Random rolls are made
 * before the transition, so running it twice gives the same result.
 *
 * The Challenge Board's clocks move only through processChallenges, which the live
 * day loop calls; time away and hidden-tab catch-up never do, so the rivals wait.
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useLatestRef } from './useLatestRef';
import { getEventUpgradeCost, getMissingPrerequisite } from '../utils/eventUpgrades';
import { rollRegisterTips } from '../utils/christmasTreePricing';
import {
  countMelons,
  floorTickets,
  getGiantSaleTickets,
  getGoodSaleTickets,
  getMelonPrice,
  getSaleMultiplier,
  iceCap,
  melonFinishFor,
  melonGrowthSpeed,
  melonKey,
  ownsUpgrade,
  parseMelonKey,
  picnicJobsPerSecond,
  rollGiantWeight,
  rollSpit,
  rollSweetness
} from '../utils/summerPricing';
import { createChallengeBoard, endChallenge, fillBoard, scoreBoard } from '../utils/challenges';
import {
  ALL_SUMMER_UPGRADES,
  MELON_QUALITY_MULTIPLIERS,
  MELON_VARIETIES,
  SUMMER_EVENT_CONSTANTS,
  SUMMER_RECIPES
} from '../data/summerEventData';
import type {
  ChallengeBoardState,
  ChallengeResult,
  GiantMelon,
  MelonDecoration,
  MelonFinish,
  MelonHarvest,
  MelonInventory,
  MelonPlot,
  MelonVariety,
  PicnicCrewAction,
  StockMelon,
  SummerEventState,
  SummerGood,
  SummerMaterials,
  SummerRecipe
} from '../types/summerEvent';

const C = SUMMER_EVENT_CONSTANTS;

interface UseSummerEventParams {
  initialState?: Partial<SummerEventState>;
  /** Run the event out of season: the dev-only Summer Festival Preview flag */
  forceActive?: boolean;
  /** A Heatwave in the main game, which sells cold goods for more */
  isHeatwave?: boolean;
  /** A sale of stock melons. `key` is the inventory key, or null for Sell All. */
  onMelonsSold?: (key: string | null, quantity: number, tickets: number) => void;
  onGiantSold?: (weight: number, tickets: number) => void;
  onMelonHarvested?: (harvest: MelonHarvest) => void;
  onItemCrafted?: (itemName: string, quantity: number) => void;
  onUpgradePurchased?: (upgradeName: string, cost: number) => void;
  onChallengeEnded?: (result: ChallengeResult) => void;
}

export interface UseSummerEventReturn {
  eventState: SummerEventState;
  isEventActive: boolean;
  isHeatwave: boolean;

  // Currency
  tickets: number;
  earnTickets: (amount: number) => void;

  // Melon Patch
  plots: MelonPlot[];
  plantMelon: (plotIndex: number, variety: MelonVariety) => void;
  /** Remembers the melon to plant, so the Melon Patch keeps it when you leave the tab */
  chooseMelon: (variety: MelonVariety) => void;
  /** Plants every empty plot, with the Jab Planter */
  plantAllMelons: (variety: MelonVariety) => void;
  harvestMelon: (plotIndex: number) => void;
  harvestAllMelons: () => void;
  recentHarvests: MelonHarvest[];

  // Juice Stand
  materials: SummerMaterials;
  craftItem: (recipeId: string, quantity?: number) => boolean;
  finishMelon: (variety: StockMelon, decorations: MelonDecoration[]) => boolean;
  currentCrewAction?: PicnicCrewAction;

  // Festival Grounds
  inventory: MelonInventory;
  giantShelf: GiantMelon[];
  sellMelons: (key: string, quantity: number) => void;
  sellAllMelons: () => void;
  sellGiant: (giantId: string) => void;
  sellGoods: (good: SummerGood, quantity: number) => void;
  claimDailyBonus: () => boolean;
  dailyBonusAvailable: boolean;
  totalMelonsSold: number;
  demandMultiplier: number;
  passiveTicketsPerSecond: number;
  lastDunkTip: { amount: number; timestamp: number };

  // Challenge Board
  board: ChallengeBoardState;
  /** One spit at the open Seed Spitting challenge; returns the distance, or null */
  spit: () => number | null;

  // Progression
  purchaseUpgrade: (upgradeId: string) => boolean;

  // Game clock
  updatePassiveIncome: (deltaMs: number) => void;
  /** Grows the patch and fills the Ice House */
  processSummerGrowth: (ticks?: number) => void;
  processPicnicCrew: (ticks?: number) => void;
  /** Counts the Challenge Board down. Live play only: never from time away. */
  processChallenges: (ticks?: number) => void;
}

// ============================================================================
// SEASON
// ============================================================================

/** US Labor Day: the first Monday of September */
export function laborDay(year: number): Date {
  const firstOfSeptember = new Date(year, 8, 1);
  return new Date(year, 8, 1 + ((8 - firstOfSeptember.getDay()) % 7));
}

/** Whether a date falls in the Summer Watermelon Festival: June 21 through Labor Day */
export function isSummerSeason(date: Date = new Date()): boolean {
  const year = date.getFullYear();
  const start = new Date(year, C.START_MONTH, C.START_DAY);
  const end = laborDay(year);
  const dayAfterEnd = new Date(year, end.getMonth(), end.getDate() + 1);
  return date >= start && date < dayAfterEnd;
}

/** Stall demand: rises from 1x on June 21 to 2x on the Fourth of July, then holds until Labor Day */
export function summerDemandMultiplier(date: Date = new Date()): number {
  if (!isSummerSeason(date)) return C.BASE_DEMAND_MULTIPLIER;
  const start = new Date(date.getFullYear(), C.START_MONTH, C.START_DAY);
  const peak = new Date(date.getFullYear(), C.PEAK_MONTH, C.PEAK_DAY);
  const progress = Math.min(1, (date.getTime() - start.getTime()) / (peak.getTime() - start.getTime()));
  return C.BASE_DEMAND_MULTIPLIER + progress * (C.MAX_DEMAND_MULTIPLIER - C.BASE_DEMAND_MULTIPLIER);
}

/** Today as YYYY-MM-DD in local time, so the daily bonus resets at local midnight */
const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

// ============================================================================
// STATE HELPERS
// ============================================================================

const emptyPlot = (index: number): MelonPlot => ({
  id: `melon_plot_${index}`,
  variety: null,
  growth: 0,
  growthTime: 0,
  harvestReady: false,
});

/** A new event: six empty plots, Sugar Babies, no Tickets, and a board that opens with the first day */
export function createInitialSummerState(): SummerEventState {
  return {
    isActive: false,
    eventYear: new Date().getFullYear(),
    tickets: 0,
    totalTicketsEarned: 0,
    passiveRemainder: 0,
    plots: Array.from({ length: C.DEFAULT_PLOT_COUNT }, (_, i) => emptyPlot(i)),
    maxPlots: C.DEFAULT_PLOT_COUNT,
    recentHarvests: [],
    personalBest: { brix: 0, weight: 0 },
    materials: { seeds: 0, splits: 0, rinds: 0, ice: 0, cups: 0, agua: 0, pickles: 0, roasted: 0 },
    inventory: {},
    giantShelf: [],
    giantsGrown: 0,
    iceGrowth: 0,
    totalMelonsSold: 0,
    demandMultiplier: summerDemandMultiplier(),
    lastBonusDate: '',
    passiveTicketsPerSecond: 0,
    board: createChallengeBoard(),
    upgrades: ALL_SUMMER_UPGRADES.map(u => ({ ...u })),
  };
}

/**
 * Brings a saved event up to date: upgrade rules from code with saved purchases and
 * levels kept, so a balance change reaches old saves; demand for today.
 */
export function loadSummerState(saved?: Partial<SummerEventState>): SummerEventState {
  const base = createInitialSummerState();
  if (!saved) return base;

  const savedUpgrades = new Map((saved.upgrades ?? []).map(u => [u.id, u]));
  const upgrades = ALL_SUMMER_UPGRADES.map(definition => {
    const savedUpgrade = savedUpgrades.get(definition.id);
    return savedUpgrade
      ? { ...definition, owned: savedUpgrade.owned, level: savedUpgrade.level ?? definition.level }
      : { ...definition };
  });
  const carousel = upgrades.find(u => u.id === 'carousel');
  const savedBoard = saved.board;

  return {
    ...base,
    ...saved,
    materials: { ...base.materials, ...saved.materials },
    personalBest: { ...base.personalBest, ...saved.personalBest },
    board: {
      ...base.board,
      ...savedBoard,
      ribbons: { ...base.board.ribbons, ...savedBoard?.ribbons },
      bests: { ...base.board.bests, ...savedBoard?.bests },
      beaten: base.board.beaten.map((zero, i) => savedBoard?.beaten?.[i] ?? zero),
      sweep: { ...base.board.sweep, ...savedBoard?.sweep },
    },
    upgrades,
    passiveTicketsPerSecond: carousel?.owned ? carousel.passiveIncome ?? 0 : 0,
    demandMultiplier: summerDemandMultiplier(),
  };
}

/** A pure state change plus what it did, for logging and return values */
type Transition<R> = { next: SummerEventState; result: R };

/**
 * Pre-rolled random numbers. Rolls past the end return 1, which never triggers
 * a bonus.
 */
function rollSource(rolls: readonly number[]): () => number {
  let index = 0;
  return () => (index < rolls.length ? rolls[index++] : 1);
}

/** Tickets added to the balance and the running total */
function withTickets(state: SummerEventState, amount: number): Pick<SummerEventState, 'tickets' | 'totalTicketsEarned'> {
  return { tickets: state.tickets + amount, totalTicketsEarned: state.totalTicketsEarned + amount };
}

/** Whether there are materials for one batch of a recipe, times `quantity` */
function canCraft(materials: SummerMaterials, recipe: SummerRecipe, quantity = 1): boolean {
  return (Object.entries(recipe.inputs) as [keyof SummerMaterials, number][])
    .every(([material, amount]) => materials[material] >= amount * quantity);
}

/** Spends a recipe's inputs and adds its output, `quantity` times, in place */
function craftInto(materials: SummerMaterials, recipe: SummerRecipe, quantity = 1): void {
  (Object.entries(recipe.inputs) as [keyof SummerMaterials, number][]).forEach(([material, amount]) => {
    materials[material] -= amount * quantity;
  });
  (Object.entries(recipe.output) as [keyof SummerMaterials, number][]).forEach(([material, amount]) => {
    materials[material] += amount * quantity;
  });
}

/** Whether the recipe's upgrade, if any, is owned */
function recipeUnlocked(state: SummerEventState, recipe: SummerRecipe): boolean {
  return !recipe.requiredUpgrade || ownsUpgrade(state.upgrades, recipe.requiredUpgrade);
}

/**
 * The crew's finish: a Picnic Basket when there is ice and a cup of melon balls to spend,
 * otherwise plain. It never spends either on a lesser finish, since a basket is worth far more.
 */
function basketIfStocked(materials: SummerMaterials): MelonFinish {
  if (materials.ice > 0 && materials.cups > 0) {
    materials.ice -= 1;
    materials.cups -= 1;
    return 'basket';
  }
  return 'plain';
}

/** The plain melon worth the most, which the crew finishes first */
function mostValuablePlainKey(inventory: MelonInventory): string | undefined {
  let best: string | undefined;
  let bestValue = -1;
  for (const [key, quantity] of Object.entries(inventory)) {
    if (quantity <= 0) continue;
    const { variety, quality, finish } = parseMelonKey(key);
    if (finish !== 'plain') continue;
    const value = MELON_VARIETIES[variety].baseValue * MELON_QUALITY_MULTIPLIERS[quality];
    if (value > bestValue) {
      best = key;
      bestValue = value;
    }
  }
  return best;
}

// ============================================================================
// TRANSITIONS
// ============================================================================

/**
 * Harvests one ready plot. A Sugar Baby or Crimson Sweet rolls its sweetness and goes
 * into stock; a Carolina Cross rolls its weight and goes on the shelf, or sells on the
 * spot when the shelf is full. Open challenges count it.
 * @param rolls - Grade, sweetness and weight, each from 0 to 1
 */
function applyHarvest(
  state: SummerEventState,
  plotIndex: number,
  rolls: readonly [number, number, number]
): Transition<MelonHarvest> | null {
  const plot = state.plots[plotIndex];
  if (!plot?.variety || !plot.harvestReady) return null;

  const { variety } = plot;
  const definition = MELON_VARIETIES[variety];
  const [gradeRoll, brixRoll, weightRoll] = rolls;
  const ribbons = state.board.ribbons;

  let harvest: MelonHarvest;
  let tickets = 0;
  let saleTickets = 0;
  let inventory = state.inventory;
  let giantShelf = state.giantShelf;
  let giantsGrown = state.giantsGrown;
  let totalMelonsSold = state.totalMelonsSold;
  const materials = { ...state.materials };
  let board = scoreBoard(state.board, 'harvestRace', 1);

  if (variety === 'carolinaCross') {
    const weight = rollGiantWeight(state.upgrades, ribbons.heaviest.first, weightRoll);
    harvest = { variety, quality: 'normal', brix: 0, weight };
    materials.seeds += definition.baseYield.seeds;
    materials.splits += definition.baseYield.splits;
    tickets += C.HARVEST_TICKETS.normal;
    giantsGrown += 1;
    board = scoreBoard(board, 'heaviest', weight);
    if (giantShelf.length < C.MAX_GIANT_SHELF) {
      giantShelf = [...giantShelf, { id: `giant_${giantsGrown}`, weight }];
    } else {
      // Shelf full: the stand buys it on the spot
      saleTickets = getGiantSaleTickets(weight, state.upgrades, state.demandMultiplier);
      totalMelonsSold += 1;
      board = scoreBoard(board, 'salesSprint', saleTickets);
    }
  } else {
    const { brix, quality } = rollSweetness(state.upgrades, ribbons.sweetest.first, gradeRoll, brixRoll);
    harvest = { variety, quality, brix, weight: 0 };
    const qualityMultiplier = MELON_QUALITY_MULTIPLIERS[quality];
    materials.seeds += Math.floor(definition.baseYield.seeds * qualityMultiplier);
    materials.splits += Math.floor(definition.baseYield.splits * qualityMultiplier);
    tickets += C.HARVEST_TICKETS[quality];
    board = scoreBoard(board, 'sweetest', brix);
    // The Picnic Crew packs melons into baskets as they come in
    const finish = ownsUpgrade(state.upgrades, 'picnic_crew') ? basketIfStocked(materials) : 'plain';
    const key = melonKey(variety, quality, finish);
    inventory = { ...inventory, [key]: (inventory[key] ?? 0) + 1 };
  }

  const plots = [...state.plots];
  plots[plotIndex] = { ...emptyPlot(plotIndex), id: plot.id };

  return {
    next: {
      ...state,
      plots,
      materials,
      inventory,
      giantShelf,
      giantsGrown,
      totalMelonsSold,
      board,
      recentHarvests: [harvest, ...state.recentHarvests].slice(0, C.RECENT_HARVESTS),
      personalBest: {
        brix: Math.max(state.personalBest.brix, harvest.brix),
        weight: Math.max(state.personalBest.weight, harvest.weight),
      },
      ...withTickets(state, tickets + saleTickets),
    },
    result: harvest,
  };
}

/** Grows every plot and fills the Ice House by `steps` days */
function applyGrowth(state: SummerEventState, steps: number): SummerEventState {
  const speed = melonGrowthSpeed(state.upgrades);

  let plotsChanged = false;
  const plots = state.plots.map(plot => {
    if (!plot.variety || plot.harvestReady) return plot;
    plotsChanged = true;
    const growth = plot.growth + speed * steps;
    return growth < plot.growthTime ? { ...plot, growth } : { ...plot, growth: plot.growthTime, harvestReady: true };
  });

  // The Ice House freezes a block every 20 days, and a full one waits
  let { iceGrowth } = state;
  let materials = state.materials;
  const cap = iceCap(state.upgrades);
  if (ownsUpgrade(state.upgrades, 'unlock_ice_house') && materials.ice < cap) {
    iceGrowth += steps;
    const blocks = Math.floor(iceGrowth / C.ICE_INTERVAL + 1e-9);
    if (blocks > 0) {
      const ice = Math.min(cap, materials.ice + blocks);
      materials = { ...materials, ice };
      iceGrowth = ice >= cap ? 0 : iceGrowth - blocks * C.ICE_INTERVAL;
    }
  }

  if (!plotsChanged && iceGrowth === state.iceGrowth && materials === state.materials) return state;
  return { ...state, plots: plotsChanged ? plots : state.plots, iceGrowth, materials };
}

/**
 * Picnic Crew jobs, in order: pack the most valuable plain melon into a Picnic Basket
 * when there's ice and a cup, ball a split melon when cups run short of ice, then
 * Agua Fresca, Pickled Rinds and Roasted Seeds, keeping 50 seeds for spitting.
 */
function applyCrew(state: SummerEventState, steps: number): SummerEventState {
  if (!ownsUpgrade(state.upgrades, 'picnic_crew')) {
    return state.currentCrewAction ? { ...state, currentCrewAction: undefined } : state;
  }

  const jobs = picnicJobsPerSecond(state.upgrades) * steps;
  const recipe = (id: string) => SUMMER_RECIPES.find(r => r.id === id && recipeUnlocked(state, r));
  const balls = recipe('melon_balls');
  const agua = recipe('agua_fresca');
  const pickles = recipe('pickled_rinds');
  const roasted = recipe('roasted_seeds');

  const materials = { ...state.materials };
  const inventory = { ...state.inventory };
  let action: PicnicCrewAction | undefined;

  for (let job = 0; job < jobs; job++) {
    let done: PicnicCrewAction | undefined;
    const plainKey = mostValuablePlainKey(inventory);

    if (plainKey && materials.ice > 0 && materials.cups > 0) {
      const { variety, quality } = parseMelonKey(plainKey);
      const finish = basketIfStocked(materials);
      inventory[plainKey] -= 1;
      if (inventory[plainKey] <= 0) delete inventory[plainKey];
      const finishedKey = melonKey(variety, quality, finish);
      inventory[finishedKey] = (inventory[finishedKey] ?? 0) + 1;
      done = { type: 'finish', finish };
    } else if (balls && materials.cups < materials.ice && canCraft(materials, balls)) {
      craftInto(materials, balls);
      done = { type: 'craft', recipeId: balls.id };
    } else if (agua && canCraft(materials, agua)) {
      craftInto(materials, agua);
      done = { type: 'craft', recipeId: agua.id };
    } else if (pickles && canCraft(materials, pickles)) {
      craftInto(materials, pickles);
      done = { type: 'craft', recipeId: pickles.id };
    } else if (roasted && materials.seeds - (roasted.inputs.seeds ?? 0) >= C.CREW_SEED_RESERVE) {
      craftInto(materials, roasted);
      done = { type: 'craft', recipeId: roasted.id };
    }
    if (!done) break;
    action ??= done;
  }

  if (!action && !state.currentCrewAction) return state;
  return action
    ? { ...state, materials, inventory, currentCrewAction: action }
    : { ...state, currentCrewAction: undefined };
}

/**
 * Counts the board down by `steps` days. Opens the first board, ends challenges whose
 * time is up, pays their prizes, and puts a new kind in each one's place.
 * @param rolls - Random numbers from 0 to 1, four for each challenge opened
 * @param year - This summer's year, for Clean Sweep
 */
function applyChallenges(
  state: SummerEventState,
  steps: number,
  rolls: readonly number[],
  year: number
): Transition<ChallengeResult[]> {
  const random = rollSource(rolls);
  let board = fillBoard(state.board, state.upgrades, random);
  board = { ...board, challenges: board.challenges.map(c => ({ ...c, daysLeft: c.daysLeft - steps })) };

  const results: ChallengeResult[] = [];
  for (const challenge of board.challenges.filter(c => c.daysLeft <= 0)) {
    const index = board.challenges.findIndex(c => c.id === challenge.id);
    const ended = endChallenge(board, challenge.id, year);
    if (!ended) continue;
    results.push(ended.result);
    const refilled = fillBoard(ended.board, state.upgrades, random, challenge.kind);
    // The new challenge takes the ended one's place, so the cards don't shuffle
    const challenges = [...refilled.challenges];
    if (challenges.length === board.challenges.length) {
      const fresh = challenges.pop()!;
      challenges.splice(index, 0, fresh);
    }
    board = { ...refilled, challenges };
  }

  const prizes = results.reduce((sum, result) => sum + result.prize, 0);
  return {
    next: { ...state, board, ...withTickets(state, prizes) },
    result: results,
  };
}

/** Buys an upgrade, or returns null when it can't be bought */
function applyUpgradePurchase(state: SummerEventState, upgradeId: string): Transition<{ name: string; cost: number }> | null {
  const upgrade = state.upgrades.find(u => u.id === upgradeId);
  if (!upgrade || getMissingPrerequisite(upgrade, state.upgrades)) return null;

  const cost = getEventUpgradeCost(upgrade);
  if (state.tickets < cost) return null;

  if (upgrade.repeatable) {
    const level = upgrade.level ?? 0;
    if (level >= (upgrade.maxLevel ?? Infinity)) return null;
    const next: SummerEventState = {
      ...state,
      tickets: state.tickets - cost,
      upgrades: state.upgrades.map(u => u.id === upgradeId ? { ...u, level: level + 1, owned: true } : u),
    };
    // Patch Expansion adds a plot
    if (upgradeId === 'patch_expansion') {
      next.plots = [...state.plots, emptyPlot(state.plots.length)];
      next.maxPlots = state.maxPlots + 1;
    }
    return { next, result: { name: upgrade.name, cost } };
  }

  if (upgrade.owned) return null;
  const next: SummerEventState = {
    ...state,
    tickets: state.tickets - cost,
    upgrades: state.upgrades.map(u => u.id === upgradeId ? { ...u, owned: true } : u),
  };
  // The Carousel sets the passive income rate
  if (upgradeId === 'carousel') next.passiveTicketsPerSecond = upgrade.passiveIncome ?? 0;
  return { next, result: { name: upgrade.name, cost } };
}

// ============================================================================
// HOOK
// ============================================================================

export function useSummerEvent({
  initialState,
  forceActive = false,
  isHeatwave = false,
  onMelonsSold,
  onGiantSold,
  onMelonHarvested,
  onItemCrafted,
  onUpgradePurchased,
  onChallengeEnded,
}: UseSummerEventParams = {}): UseSummerEventReturn {
  const [eventState, setEventState] = useState<SummerEventState>(() => loadSummerState(initialState));
  const [inSeason, setInSeason] = useState(() => isSummerSeason());
  const isEventActive = inSeason || forceActive;
  const [lastDunkTip, setLastDunkTip] = useState({ amount: 0, timestamp: 0 });

  const callbacksRef = useLatestRef({ onMelonsSold, onGiantSold, onMelonHarvested, onItemCrafted, onUpgradePurchased, onChallengeEnded });
  const eventStateRef = useLatestRef(eventState);
  const heatwaveRef = useLatestRef(isHeatwave);

  /**
   * Runs a pure transition on the latest state to decide and report, then again
   * inside the updater so it composes with other queued updates.
   */
  const transact = useCallback(<R>(transition: (state: SummerEventState) => Transition<R> | null): R | null => {
    const outcome = transition(eventStateRef.current);
    if (!outcome) return null;
    // Let a second action in the same frame see this one
    eventStateRef.current = outcome.next;
    setEventState(prev => transition(prev)?.next ?? prev);
    return outcome.result;
  }, [eventStateRef]);

  // Season and demand: checked now and hourly, so an open tab starts and ends the event on time
  useEffect(() => {
    const update = () => {
      setInSeason(isSummerSeason());
      const demandMultiplier = summerDemandMultiplier();
      setEventState(prev => prev.demandMultiplier === demandMultiplier ? prev : { ...prev, demandMultiplier });
    };
    update();
    const interval = setInterval(update, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setEventState(prev => prev.isActive === isEventActive ? prev : { ...prev, isActive: isEventActive });
  }, [isEventActive]);

  // ── Currency ──

  const earnTickets = useCallback((amount: number) => {
    if (amount <= 0) return;
    setEventState(prev => ({ ...prev, ...withTickets(prev, amount) }));
  }, []);

  // ── Melon Patch ──

  const plantMelon = useCallback((plotIndex: number, variety: MelonVariety) => {
    transact(state => {
      const plot = state.plots[plotIndex];
      const definition = MELON_VARIETIES[variety];
      if (!plot || plot.variety !== null || !ownsUpgrade(state.upgrades, definition.unlockUpgrade)) return null;
      const plots = [...state.plots];
      plots[plotIndex] = { ...plot, variety, growth: 0, growthTime: definition.growthTime, harvestReady: false };
      return { next: { ...state, plots }, result: true };
    });
  }, [transact]);

  const plantAllMelons = useCallback((variety: MelonVariety) => {
    transact(state => {
      const definition = MELON_VARIETIES[variety];
      if (!ownsUpgrade(state.upgrades, 'jab_planter') || !ownsUpgrade(state.upgrades, definition.unlockUpgrade)) return null;
      if (!state.plots.some(plot => plot.variety === null)) return null;
      const plots = state.plots.map(plot => plot.variety === null
        ? { ...plot, variety, growth: 0, growthTime: definition.growthTime, harvestReady: false }
        : plot);
      return { next: { ...state, plots }, result: true };
    });
  }, [transact]);

  const harvestMelon = useCallback((plotIndex: number) => {
    const rolls: [number, number, number] = [Math.random(), Math.random(), Math.random()];
    const harvested = transact(state => applyHarvest(state, plotIndex, rolls));
    if (harvested) callbacksRef.current.onMelonHarvested?.(harvested);
  }, [transact, callbacksRef]);

  const harvestAllMelons = useCallback(() => {
    // Each harvest updates the latest-state ref, so the next one sees it
    eventStateRef.current.plots.forEach((plot, index) => {
      if (plot.harvestReady) harvestMelon(index);
    });
  }, [harvestMelon, eventStateRef]);

  // ── Juice Stand ──

  const craftItem = useCallback((recipeId: string, quantity: number = 1): boolean => {
    const recipe = SUMMER_RECIPES.find(r => r.id === recipeId);
    if (!recipe || quantity < 1) return false;

    const crafted = transact(state => {
      if (!recipeUnlocked(state, recipe) || !canCraft(state.materials, recipe, quantity)) return null;
      const materials = { ...state.materials };
      craftInto(materials, recipe, quantity);
      return { next: { ...state, materials }, result: true };
    });

    if (crafted) callbacksRef.current.onItemCrafted?.(recipe.name, quantity);
    return crafted ?? false;
  }, [transact, callbacksRef]);

  const finishMelon = useCallback((variety: StockMelon, decorations: MelonDecoration[]): boolean => {
    if (decorations.length === 0) return false;
    return transact(state => {
      // Normal melons first, then Sugar Melons
      const plainKey = (['normal', 'sugar'] as const)
        .map(quality => melonKey(variety, quality, 'plain'))
        .find(key => (state.inventory[key] ?? 0) > 0);
      if (!plainKey) return null;
      const chill = decorations.includes('chill');
      const carve = decorations.includes('carve');
      if (chill && state.materials.ice < 1) return null;
      if (carve && state.materials.cups < 1) return null;

      const materials = { ...state.materials };
      if (chill) materials.ice -= 1;
      if (carve) materials.cups -= 1;

      const inventory = { ...state.inventory };
      inventory[plainKey] -= 1;
      if (inventory[plainKey] === 0) delete inventory[plainKey];
      const finishedKey = melonKey(variety, parseMelonKey(plainKey).quality, melonFinishFor(decorations));
      inventory[finishedKey] = (inventory[finishedKey] ?? 0) + 1;

      return { next: { ...state, materials, inventory }, result: true };
    }) ?? false;
  }, [transact]);

  // ── Festival Grounds ──

  const sellMelons = useCallback((key: string, quantity: number) => {
    // Two rolls per melon for Dunk Tank tips (chance, then size)
    const rolls = Array.from({ length: Math.max(0, quantity) * 2 }, () => Math.random());
    const heatwave = heatwaveRef.current;

    const sale = transact(state => {
      const held = state.inventory[key] ?? 0;
      if (quantity < 1 || held < quantity) return null;
      const random = rollSource(rolls);
      const price = getMelonPrice(key, state.upgrades, state.demandMultiplier, heatwave);
      const multiplier = getSaleMultiplier(state.upgrades);
      const earned = floorTickets(price * quantity * multiplier);
      const tips = ownsUpgrade(state.upgrades, 'dunk_tank')
        ? floorTickets(rollRegisterTips(price, quantity, random) * multiplier)
        : 0;

      const inventory = { ...state.inventory, [key]: held - quantity };
      if (inventory[key] === 0) delete inventory[key];
      return {
        next: {
          ...state,
          inventory,
          ...withTickets(state, earned + tips),
          totalMelonsSold: state.totalMelonsSold + quantity,
          board: scoreBoard(state.board, 'salesSprint', earned + tips),
        },
        result: { tickets: earned + tips, tips },
      };
    });

    if (!sale) return;
    if (sale.tips > 0) setLastDunkTip({ amount: sale.tips, timestamp: Date.now() });
    callbacksRef.current.onMelonsSold?.(key, quantity, sale.tickets);
  }, [transact, callbacksRef, heatwaveRef]);

  const sellAllMelons = useCallback(() => {
    const rolls = Array.from({ length: countMelons(eventStateRef.current.inventory) * 2 }, () => Math.random());
    const heatwave = heatwaveRef.current;

    const sale = transact(state => {
      const entries = Object.entries(state.inventory).filter(([, quantity]) => quantity > 0);
      if (entries.length === 0) return null;
      const random = rollSource(rolls);
      const dunkTank = ownsUpgrade(state.upgrades, 'dunk_tank');
      let value = 0;
      let tips = 0;
      let sold = 0;
      for (const [key, quantity] of entries) {
        const price = getMelonPrice(key, state.upgrades, state.demandMultiplier, heatwave);
        value += price * quantity;
        sold += quantity;
        if (dunkTank) tips += rollRegisterTips(price, quantity, random);
      }
      const multiplier = getSaleMultiplier(state.upgrades);
      const tipTickets = floorTickets(tips * multiplier);
      const earned = floorTickets(value * multiplier) + tipTickets;
      return {
        next: {
          ...state,
          inventory: {},
          ...withTickets(state, earned),
          totalMelonsSold: state.totalMelonsSold + sold,
          board: scoreBoard(state.board, 'salesSprint', earned),
        },
        result: { sold, earned, tips: tipTickets },
      };
    });

    if (!sale) return;
    if (sale.tips > 0) setLastDunkTip({ amount: sale.tips, timestamp: Date.now() });
    callbacksRef.current.onMelonsSold?.(null, sale.sold, sale.earned);
  }, [transact, eventStateRef, callbacksRef, heatwaveRef]);

  const sellGiant = useCallback((giantId: string) => {
    const sale = transact(state => {
      const giant = state.giantShelf.find(g => g.id === giantId);
      if (!giant) return null;
      const earned = getGiantSaleTickets(giant.weight, state.upgrades, state.demandMultiplier);
      return {
        next: {
          ...state,
          giantShelf: state.giantShelf.filter(g => g.id !== giantId),
          ...withTickets(state, earned),
          totalMelonsSold: state.totalMelonsSold + 1,
          board: scoreBoard(state.board, 'salesSprint', earned),
        },
        result: { weight: giant.weight, earned },
      };
    });
    if (sale) callbacksRef.current.onGiantSold?.(sale.weight, sale.earned);
  }, [transact, callbacksRef]);

  const sellGoods = useCallback((good: SummerGood, quantity: number) => {
    const heatwave = heatwaveRef.current;
    transact(state => {
      if (quantity < 1 || state.materials[good] < quantity) return null;
      const earned = getGoodSaleTickets(good, quantity, heatwave);
      return {
        next: {
          ...state,
          materials: { ...state.materials, [good]: state.materials[good] - quantity },
          ...withTickets(state, earned),
          board: scoreBoard(state.board, 'salesSprint', earned),
        },
        result: true,
      };
    });
  }, [transact, heatwaveRef]);

  const claimDailyBonus = useCallback((): boolean => {
    const date = today();
    return transact(state => {
      if (!ownsUpgrade(state.upgrades, 'parade_route') || state.lastBonusDate === date) return null;
      return {
        next: { ...state, lastBonusDate: date, ...withTickets(state, C.DAILY_BONUS) },
        result: true,
      };
    }) ?? false;
  }, [transact]);

  // ── Challenge Board ──

  const spit = useCallback((): number | null => {
    const roll = Math.random();
    return transact(state => {
      const index = state.board.challenges.findIndex(c => c.kind === 'spitting');
      const challenge = state.board.challenges[index];
      if (!challenge || challenge.spitsLeft <= 0 || state.materials.seeds < C.SPIT_SEEDS) return null;
      const distance = rollSpit(state.upgrades, roll);
      const challenges = [...state.board.challenges];
      challenges[index] = { ...challenge, spitsLeft: challenge.spitsLeft - 1, score: Math.max(challenge.score, distance) };
      return {
        next: {
          ...state,
          materials: { ...state.materials, seeds: state.materials.seeds - C.SPIT_SEEDS },
          board: { ...state.board, challenges },
        },
        result: distance,
      };
    });
  }, [transact]);

  // ── Progression ──

  const purchaseUpgrade = useCallback((upgradeId: string): boolean => {
    const purchase = transact(state => applyUpgradePurchase(state, upgradeId));
    if (!purchase) return false;
    callbacksRef.current.onUpgradePurchased?.(purchase.name, purchase.cost);
    return true;
  }, [transact, callbacksRef]);

  // ── Game clock ──

  const updatePassiveIncome = useCallback((deltaMs: number) => {
    setEventState(prev => {
      if (prev.passiveTicketsPerSecond <= 0 || deltaMs <= 0) return prev;
      // Keep the fraction, so 0.1 per second pays 1 every 10 seconds
      const total = prev.passiveRemainder + prev.passiveTicketsPerSecond * (deltaMs / 1000);
      const whole = Math.floor(total + 1e-9);
      return {
        ...prev,
        ...withTickets(prev, whole),
        passiveRemainder: Math.max(0, total - whole),
      };
    });
  }, []);

  const processSummerGrowth = useCallback((ticks: number = 1) => {
    const steps = ticks > 0 ? ticks : 1;
    setEventState(prev => applyGrowth(prev, steps));
  }, []);

  const processPicnicCrew = useCallback((ticks: number = 1) => {
    const steps = ticks > 0 ? ticks : 1;
    setEventState(prev => applyCrew(prev, steps));
  }, []);

  const processChallenges = useCallback((ticks: number = 1) => {
    const steps = ticks > 0 ? ticks : 1;
    // Four rolls for each challenge that might open: the kind, then one per rival
    const rolls = Array.from({ length: C.OPEN_CHALLENGES * 4 * 2 }, () => Math.random());
    const year = new Date().getFullYear();
    const results = transact(state => applyChallenges(state, steps, rolls, year)) ?? [];
    results.forEach(result => callbacksRef.current.onChallengeEnded?.(result));
  }, [transact, callbacksRef]);

  // Memoized so the game context stays stable between changes.
  // dailyBonusAvailable is a getter because it depends on today's date.
  const chooseMelon = useCallback((variety: MelonVariety) => {
    setEventState(prev => prev.chosenMelon === variety ? prev : { ...prev, chosenMelon: variety });
  }, []);

  return useMemo<UseSummerEventReturn>(() => ({
    eventState,
    isEventActive,
    isHeatwave,
    tickets: eventState.tickets,
    earnTickets,
    plots: eventState.plots,
    plantMelon,
    chooseMelon,
    plantAllMelons,
    harvestMelon,
    harvestAllMelons,
    recentHarvests: eventState.recentHarvests,
    materials: eventState.materials,
    craftItem,
    finishMelon,
    currentCrewAction: eventState.currentCrewAction,
    inventory: eventState.inventory,
    giantShelf: eventState.giantShelf,
    sellMelons,
    sellAllMelons,
    sellGiant,
    sellGoods,
    claimDailyBonus,
    get dailyBonusAvailable() {
      return ownsUpgrade(eventState.upgrades, 'parade_route') && eventState.lastBonusDate !== today();
    },
    totalMelonsSold: eventState.totalMelonsSold,
    demandMultiplier: eventState.demandMultiplier,
    passiveTicketsPerSecond: eventState.passiveTicketsPerSecond,
    lastDunkTip,
    board: eventState.board,
    spit,
    purchaseUpgrade,
    updatePassiveIncome,
    processSummerGrowth,
    processPicnicCrew,
    processChallenges,
  }), [
    eventState,
    isEventActive,
    isHeatwave,
    lastDunkTip,
    earnTickets,
    plantMelon,
    chooseMelon,
    plantAllMelons,
    harvestMelon,
    harvestAllMelons,
    craftItem,
    finishMelon,
    sellMelons,
    sellAllMelons,
    sellGiant,
    sellGoods,
    claimDailyBonus,
    spit,
    purchaseUpgrade,
    updatePassiveIncome,
    processSummerGrowth,
    processPicnicCrew,
    processChallenges,
  ]);
}
