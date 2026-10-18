/**
 * Fall Pumpkin Rush Event Hook
 *
 * State and actions for the seasonal pumpkin event (September 22 through Thanksgiving):
 * Candy Corn, the Pumpkin Patch, the Carving Barn, the Farm Stand and the
 * County Fair weigh-off.
 *
 * Every action decides from the latest state, applies the same pure transition
 * inside the state updater, and runs callbacks afterwards. Random rolls are made
 * before the transition, so running it twice gives the same result.
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useLatestRef } from './useLatestRef';
import { getEventUpgradeCost, getMissingPrerequisite } from '../utils/eventUpgrades';
import { rollRegisterTips } from '../utils/christmasTreePricing';
import {
  crewJobsPerSecond,
  finishFor,
  floorCandyCorn,
  getGiantPrice,
  getPumpkinPrice,
  getSaleMultiplier,
  judgeWeighOff,
  ownsUpgrade,
  parsePumpkinKey,
  pumpkinGrowthSpeed,
  pumpkinKey,
  rollGiantWeight,
  upgradeLevel
} from '../utils/pumpkinPricing';
import {
  ALL_PUMPKIN_UPGRADES,
  CARVABLE_VARIETIES,
  PUMPKIN_EVENT_CONSTANTS,
  PUMPKIN_QUALITY_MULTIPLIERS,
  PUMPKIN_RECIPES,
  PUMPKIN_VARIETIES
} from '../data/pumpkinEventData';
import type {
  GiantPumpkin,
  PumpkinDecoration,
  PumpkinEventState,
  PumpkinFinish,
  PumpkinMaterials,
  PumpkinPlot,
  PumpkinQuality,
  PumpkinVariety,
  ScarecrowCrewAction,
  WeighOffResult
} from '../types/pumpkinEvent';

const C = PUMPKIN_EVENT_CONSTANTS;

/** Goods sold at the Farm Stand on their own */
export type PumpkinGood = 'pies' | 'candles' | 'stencils';

interface UsePumpkinEventParams {
  initialState?: Partial<PumpkinEventState>;
  onPumpkinSold?: (varietyName: string, quantity: number, candyCorn: number) => void;
  onPumpkinHarvested?: (varietyName: string, quality: string, weight?: number) => void;
  onItemCrafted?: (itemName: string, quantity: number) => void;
  onUpgradePurchased?: (upgradeName: string, cost: number) => void;
  onWeighOff?: (result: WeighOffResult) => void;
}

export interface UsePumpkinEventReturn {
  eventState: PumpkinEventState;
  isEventActive: boolean;

  // Currency
  candyCorn: number;
  earnCandyCorn: (amount: number) => void;

  // Pumpkin Patch
  plots: PumpkinPlot[];
  plantPumpkin: (plotIndex: number, variety: PumpkinVariety) => void;
  harvestPumpkin: (plotIndex: number) => void;
  harvestAllPumpkins: () => void;

  // Carving Barn
  materials: PumpkinMaterials;
  craftItem: (recipeId: string, quantity?: number) => boolean;
  decoratePumpkin: (variety: PumpkinVariety, decorations: PumpkinDecoration[]) => boolean;
  currentCrewAction?: ScarecrowCrewAction;

  // Farm Stand
  sellPumpkins: (key: string, quantity: number) => void;
  sellAllPumpkins: () => void;
  sellGoods: (good: PumpkinGood, quantity: number) => void;
  claimDailyBonus: () => boolean;
  dailyBonusAvailable: boolean;
  totalPumpkinsSold: number;
  demandMultiplier: number;
  passiveCandyCornPerSecond: number;
  lastFortuneTip: { amount: number; timestamp: number };

  // County Fair
  giantShelf: GiantPumpkin[];
  sellGiant: (giantId: string) => void;
  enterWeighOff: (giantId: string) => WeighOffResult | null;

  // Progression
  purchaseUpgrade: (upgradeId: string) => boolean;

  // Game clock
  updatePassiveIncome: (deltaMs: number) => void;
  processPumpkinGrowth: (ticks?: number) => void;
  processScarecrowCrew: (ticks?: number) => void;
}

// ============================================================================
// SEASON
// ============================================================================

/** US Thanksgiving: the fourth Thursday of November */
export function thanksgivingDay(year: number): Date {
  const firstOfNovember = new Date(year, 10, 1);
  const firstThursday = 1 + ((4 - firstOfNovember.getDay() + 7) % 7);
  return new Date(year, 10, firstThursday + 21);
}

/** Whether a date falls in the Fall Pumpkin Rush: September 22 through Thanksgiving Day */
export function isPumpkinSeason(date: Date = new Date()): boolean {
  const year = date.getFullYear();
  const start = new Date(year, C.START_MONTH, C.START_DAY);
  const end = thanksgivingDay(year);
  const dayAfterEnd = new Date(year, end.getMonth(), end.getDate() + 1);
  return date >= start && date < dayAfterEnd;
}

/** Farm Stand demand: rises from 1x on September 22 to 2x on Halloween, then holds until Thanksgiving */
export function pumpkinDemandMultiplier(date: Date = new Date()): number {
  if (!isPumpkinSeason(date)) return C.BASE_DEMAND_MULTIPLIER;
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

const emptyPlot = (index: number): PumpkinPlot => ({
  id: `pumpkin_plot_${index}`,
  variety: null,
  growth: 0,
  growthTime: 0,
  quality: 'normal',
  harvestReady: false,
});

/**
 * Sales milestones a saved event claimed on the Farm Stand. They became achievements
 * in October 2026, and an achievement must not pay Candy Corn a milestone already paid.
 */
export function claimedSalesMilestones(saved: unknown): Set<string> {
  const milestones = (saved as { milestones?: Array<{ id: string; claimed?: boolean }> } | undefined)?.milestones ?? [];
  return new Set(milestones.filter(milestone => milestone.claimed).map(milestone => milestone.id));
}

/** A new event: six empty plots, Sugar Pie seeds, no Candy Corn */
export function createInitialPumpkinState(): PumpkinEventState {
  return {
    isActive: false,
    eventYear: new Date().getFullYear(),
    candyCorn: 0,
    totalCandyCornEarned: 0,
    passiveRemainder: 0,
    plots: Array.from({ length: C.DEFAULT_PLOT_COUNT }, (_, i) => emptyPlot(i)),
    maxPlots: C.DEFAULT_PLOT_COUNT,
    materials: { seeds: 0, pulp: 0, vines: 0, pies: 0, candles: 0, stencils: 0 },
    inventory: {},
    giantShelf: [],
    totalPumpkinsSold: 0,
    demandMultiplier: pumpkinDemandMultiplier(),
    lastBonusDate: '',
    passiveCandyCornPerSecond: 0,
    upgrades: ALL_PUMPKIN_UPGRADES.map(u => ({ ...u })),
    weighOff: {
      daysUntilFair: C.FAIR_INTERVAL_DAYS,
      fairsEntered: 0,
      ribbons: { first: 0, second: 0, third: 0 },
      personalBest: 0,
      giantsGrown: 0,
      lastResult: null,
    },
  };
}

/**
 * Brings a saved event up to date: new upgrades from code, saved purchases kept,
 * demand for today. Saves from before the sales milestones became achievements keep
 * their milestones list, which claimedSalesMilestones reads.
 */
function loadPumpkinState(saved?: Partial<PumpkinEventState>): PumpkinEventState {
  const base = createInitialPumpkinState();
  if (!saved) return base;

  const savedUpgrades = new Map((saved.upgrades ?? []).map(u => [u.id, u]));
  const upgrades = ALL_PUMPKIN_UPGRADES.map(definition => {
    const savedUpgrade = savedUpgrades.get(definition.id);
    return savedUpgrade
      ? { ...definition, owned: savedUpgrade.owned, level: savedUpgrade.level ?? definition.level }
      : { ...definition };
  });
  const hayride = upgrades.find(u => u.id === 'hayride');

  return {
    ...base,
    ...saved,
    materials: { ...base.materials, ...saved.materials },
    weighOff: {
      ...base.weighOff,
      ...saved.weighOff,
      ribbons: { ...base.weighOff.ribbons, ...saved.weighOff?.ribbons },
    },
    upgrades,
    passiveCandyCornPerSecond: hayride?.owned ? hayride.passiveIncome ?? 0 : 0,
    demandMultiplier: pumpkinDemandMultiplier(),
  };
}

/** A pure state change plus what it did, for logging and return values */
type Transition<R> = { next: PumpkinEventState; result: R };

/**
 * Pre-rolled random numbers. Rolls past the end return 1, which never triggers
 * a bonus.
 */
function rollSource(rolls: readonly number[]): () => number {
  let index = 0;
  return () => (index < rolls.length ? rolls[index++] : 1);
}

/** Pumpkins in an inventory */
function countPumpkins(inventory: Record<string, number>): number {
  return Object.values(inventory).reduce((sum, quantity) => sum + quantity, 0);
}

const varietyName = (variety: PumpkinVariety) => PUMPKIN_VARIETIES[variety].name;
const qualityName = (quality: PumpkinQuality) => quality === 'blueRibbon' ? 'Blue Ribbon' : 'Normal';

/**
 * The crew's finish: a Jack-o'-Lantern when there is a stencil and a candle to spend, otherwise
 * plain. It never spends either on a lesser finish, since a lantern is worth far more.
 */
function lanternIfStocked(materials: PumpkinMaterials): PumpkinFinish {
  if (materials.stencils > 0 && materials.candles > 0) {
    materials.stencils -= 1;
    materials.candles -= 1;
    return 'lantern';
  }
  return 'plain';
}

// ============================================================================
// TRANSITIONS
// ============================================================================

/** Harvests one ready plot. `weightRoll` sizes an Atlantic Giant. */
function applyHarvest(state: PumpkinEventState, plotIndex: number, weightRoll: number): Transition<{
  variety: PumpkinVariety;
  quality: PumpkinQuality;
  weight?: number;
}> | null {
  const plot = state.plots[plotIndex];
  if (!plot?.variety || !plot.harvestReady) return null;

  const { variety, quality } = plot;
  const definition = PUMPKIN_VARIETIES[variety];
  const qualityMultiplier = PUMPKIN_QUALITY_MULTIPLIERS[quality];
  const materials = { ...state.materials };
  materials.seeds += Math.floor(definition.baseYield.seeds * qualityMultiplier);
  materials.pulp += Math.floor(definition.baseYield.pulp * qualityMultiplier);
  materials.vines += Math.floor(definition.baseYield.vines * qualityMultiplier);

  let candyCorn = C.HARVEST_CANDY_CORN[quality];
  let inventory = state.inventory;
  let giantShelf = state.giantShelf;
  let weighOff = state.weighOff;
  let totalPumpkinsSold = state.totalPumpkinsSold;
  let weight: number | undefined;

  if (variety === 'giant') {
    weight = rollGiantWeight(quality, upgradeLevel(state.upgrades, 'giant_vine_tonic'), weightRoll);
    weighOff = { ...weighOff, personalBest: Math.max(weighOff.personalBest, weight), giantsGrown: weighOff.giantsGrown + 1 };
    if (giantShelf.length < C.MAX_GIANT_SHELF) {
      giantShelf = [...giantShelf, { id: `giant_${weighOff.giantsGrown}`, weight, quality }];
    } else {
      // Shelf full: the stand buys it on the spot
      candyCorn += floorCandyCorn(getGiantPrice(weight, quality, state.upgrades, state.demandMultiplier) * getSaleMultiplier(state.upgrades));
      totalPumpkinsSold += 1;
    }
  } else {
    // The Scarecrow Crew carves and lights pumpkins as they come in
    const finish = ownsUpgrade(state.upgrades, 'scarecrow_crew') ? lanternIfStocked(materials) : 'plain';
    const key = pumpkinKey(variety, quality, finish);
    inventory = { ...inventory, [key]: (inventory[key] ?? 0) + 1 };
  }

  const plots = [...state.plots];
  plots[plotIndex] = emptyPlot(plotIndex);
  plots[plotIndex].id = plot.id;

  return {
    next: {
      ...state,
      plots,
      materials,
      inventory,
      giantShelf,
      weighOff,
      totalPumpkinsSold,
      candyCorn: state.candyCorn + candyCorn,
      totalCandyCornEarned: state.totalCandyCornEarned + candyCorn,
    },
    result: { variety, quality, weight },
  };
}

/** Grows every plot by `steps` days and counts down to the next fair. One roll per plot. */
function applyGrowth(state: PumpkinEventState, steps: number, rolls: readonly number[]): PumpkinEventState {
  const speed = pumpkinGrowthSpeed(state.upgrades);
  const blueRibbonChance = ownsUpgrade(state.upgrades, 'prize_seeds') ? 0.10 : 0;

  let changed = false;
  const plots = state.plots.map((plot, i) => {
    if (!plot.variety || plot.harvestReady) return plot;
    changed = true;
    const growth = plot.growth + speed * steps;
    if (growth < plot.growthTime) return { ...plot, growth };
    return {
      ...plot,
      growth: plot.growthTime,
      harvestReady: true,
      quality: (rolls[i] ?? 1) < blueRibbonChance ? 'blueRibbon' as const : plot.quality,
    };
  });

  const daysUntilFair = Math.max(0, state.weighOff.daysUntilFair - steps);
  if (!changed && daysUntilFair === state.weighOff.daysUntilFair) return state;
  return {
    ...state,
    plots: changed ? plots : state.plots,
    weighOff: daysUntilFair === state.weighOff.daysUntilFair ? state.weighOff : { ...state.weighOff, daysUntilFair },
  };
}

/** Scarecrow Crew jobs, in order: pies, candles, vine stencils, then Jack-o'-Lanterns */
function applyCrew(state: PumpkinEventState, steps: number): PumpkinEventState {
  if (!ownsUpgrade(state.upgrades, 'scarecrow_crew')) {
    return state.currentCrewAction ? { ...state, currentCrewAction: undefined } : state;
  }

  const jobsPerSecond = crewJobsPerSecond(state.upgrades);
  const hasStencilTable = ownsUpgrade(state.upgrades, 'stencil_table');
  const materials = { ...state.materials };
  const inventory = { ...state.inventory };
  let action: ScarecrowCrewAction | undefined;

  for (let job = 0; job < jobsPerSecond * steps; job++) {
    let done: ScarecrowCrewAction | undefined;
    if (materials.pulp >= 4 && materials.seeds >= 1) {
      materials.pulp -= 4;
      materials.seeds -= 1;
      materials.pies += 1;
      done = { type: 'craft', recipeId: 'bake_pie' };
    } else if (materials.seeds >= 2) {
      materials.seeds -= 2;
      materials.candles += 1;
      done = { type: 'craft', recipeId: 'make_candles' };
    } else if (hasStencilTable && materials.vines >= 1) {
      materials.vines -= 1;
      materials.stencils += 2;
      done = { type: 'craft', recipeId: 'cut_stencils' };
    } else {
      // Nothing left to craft: make a Jack-o'-Lantern from a plain pumpkin. The crew never spends
      // a stencil or a candle on a lesser finish, so it waits until it has one of each.
      const plainKey = Object.keys(inventory).find(key => key.endsWith('_plain') && inventory[key] > 0);
      if (plainKey && materials.stencils > 0 && materials.candles > 0) {
        const { variety, quality } = parsePumpkinKey(plainKey);
        const finish = lanternIfStocked(materials);
        inventory[plainKey] -= 1;
        if (inventory[plainKey] === 0) delete inventory[plainKey];
        const finishedKey = pumpkinKey(variety, quality, finish);
        inventory[finishedKey] = (inventory[finishedKey] ?? 0) + 1;
        done = { type: 'decorate', finish };
      }
    }
    if (!done) break;
    action ??= done;
  }

  if (!action && !state.currentCrewAction) return state;
  return action
    ? { ...state, materials, inventory, currentCrewAction: action }
    : { ...state, currentCrewAction: undefined };
}

/** Buys an upgrade, or returns null when it can't be bought */
function applyUpgradePurchase(state: PumpkinEventState, upgradeId: string): Transition<{ name: string; cost: number }> | null {
  const upgrade = state.upgrades.find(u => u.id === upgradeId);
  if (!upgrade || getMissingPrerequisite(upgrade, state.upgrades)) return null;

  const cost = getEventUpgradeCost(upgrade);
  if (state.candyCorn < cost) return null;

  if (upgrade.repeatable) {
    const level = upgrade.level ?? 0;
    if (level >= (upgrade.maxLevel ?? Infinity)) return null;
    const next: PumpkinEventState = {
      ...state,
      candyCorn: state.candyCorn - cost,
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
  return {
    next: {
      ...state,
      candyCorn: state.candyCorn - cost,
      upgrades: state.upgrades.map(u => u.id === upgradeId ? { ...u, owned: true } : u),
      // The Hayride sets the passive income rate
      passiveCandyCornPerSecond: upgradeId === 'hayride' ? upgrade.passiveIncome ?? 0 : state.passiveCandyCornPerSecond,
    },
    result: { name: upgrade.name, cost },
  };
}

// ============================================================================
// HOOK
// ============================================================================

export function usePumpkinEvent({
  initialState,
  onPumpkinSold,
  onPumpkinHarvested,
  onItemCrafted,
  onUpgradePurchased,
  onWeighOff,
}: UsePumpkinEventParams = {}): UsePumpkinEventReturn {
  const [eventState, setEventState] = useState<PumpkinEventState>(() => loadPumpkinState(initialState));
  const [isEventActive, setIsEventActive] = useState(() => isPumpkinSeason());
  const [lastFortuneTip, setLastFortuneTip] = useState({ amount: 0, timestamp: 0 });

  const callbacksRef = useLatestRef({ onPumpkinSold, onPumpkinHarvested, onItemCrafted, onUpgradePurchased, onWeighOff });
  const eventStateRef = useLatestRef(eventState);

  /**
   * Runs a pure transition on the latest state to decide and report, then again
   * inside the updater so it composes with other queued updates.
   */
  const transact = useCallback(<R>(transition: (state: PumpkinEventState) => Transition<R> | null): R | null => {
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
      setIsEventActive(isPumpkinSeason());
      const demandMultiplier = pumpkinDemandMultiplier();
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

  const earnCandyCorn = useCallback((amount: number) => {
    if (amount <= 0) return;
    setEventState(prev => ({
      ...prev,
      candyCorn: prev.candyCorn + amount,
      totalCandyCornEarned: prev.totalCandyCornEarned + amount,
    }));
  }, []);

  // ── Pumpkin Patch ──

  const plantPumpkin = useCallback((plotIndex: number, variety: PumpkinVariety) => {
    transact(state => {
      const plot = state.plots[plotIndex];
      const definition = PUMPKIN_VARIETIES[variety];
      if (!plot || plot.variety !== null || !ownsUpgrade(state.upgrades, definition.unlockUpgrade)) return null;
      const plots = [...state.plots];
      plots[plotIndex] = { ...plot, variety, growth: 0, growthTime: definition.growthTime, quality: 'normal', harvestReady: false };
      return { next: { ...state, plots }, result: true };
    });
  }, [transact]);

  const harvestPumpkin = useCallback((plotIndex: number) => {
    const weightRoll = Math.random();
    const harvested = transact(state => applyHarvest(state, plotIndex, weightRoll));
    if (harvested) {
      callbacksRef.current.onPumpkinHarvested?.(varietyName(harvested.variety), qualityName(harvested.quality), harvested.weight);
    }
  }, [transact, callbacksRef]);

  const harvestAllPumpkins = useCallback(() => {
    // Each harvest updates the latest-state ref, so the next one sees it
    eventStateRef.current.plots.forEach((plot, index) => {
      if (plot.harvestReady) harvestPumpkin(index);
    });
  }, [harvestPumpkin, eventStateRef]);

  // ── Carving Barn ──

  const craftItem = useCallback((recipeId: string, quantity: number = 1): boolean => {
    const recipe = PUMPKIN_RECIPES.find(r => r.id === recipeId);
    if (!recipe || quantity < 1) return false;

    const crafted = transact(state => {
      if (recipe.requiredUpgrade && !ownsUpgrade(state.upgrades, recipe.requiredUpgrade)) return null;
      const inputs = Object.entries(recipe.inputs) as [keyof PumpkinMaterials, number][];
      if (!inputs.every(([material, amount]) => state.materials[material] >= amount * quantity)) return null;

      const materials = { ...state.materials };
      inputs.forEach(([material, amount]) => { materials[material] -= amount * quantity; });
      (Object.entries(recipe.output) as [keyof PumpkinMaterials, number][]).forEach(([material, amount]) => {
        materials[material] += amount * quantity;
      });
      return { next: { ...state, materials }, result: true };
    });

    if (crafted) callbacksRef.current.onItemCrafted?.(recipe.name, quantity);
    return crafted ?? false;
  }, [transact, callbacksRef]);

  const decoratePumpkin = useCallback((variety: PumpkinVariety, decorations: PumpkinDecoration[]): boolean => {
    if (!CARVABLE_VARIETIES.includes(variety) || decorations.length === 0) return false;
    return transact(state => {
      // Normal pumpkins first, then Blue Ribbons
      const plainKey = (['normal', 'blueRibbon'] as const)
        .map(quality => pumpkinKey(variety, quality, 'plain'))
        .find(key => (state.inventory[key] ?? 0) > 0);
      if (!plainKey) return null;
      if (decorations.includes('carving') && state.materials.stencils < 1) return null;
      if (decorations.includes('candle') && state.materials.candles < 1) return null;

      const materials = { ...state.materials };
      if (decorations.includes('carving')) materials.stencils -= 1;
      if (decorations.includes('candle')) materials.candles -= 1;

      const inventory = { ...state.inventory };
      inventory[plainKey] -= 1;
      if (inventory[plainKey] === 0) delete inventory[plainKey];
      const finishedKey = pumpkinKey(variety, parsePumpkinKey(plainKey).quality, finishFor(decorations));
      inventory[finishedKey] = (inventory[finishedKey] ?? 0) + 1;

      return { next: { ...state, materials, inventory }, result: true };
    }) ?? false;
  }, [transact]);

  // ── Farm Stand ──

  const sellPumpkins = useCallback((key: string, quantity: number) => {
    // Two rolls per pumpkin for Fortune Teller tips (chance, then size)
    const rolls = Array.from({ length: Math.max(0, quantity) * 2 }, () => Math.random());

    const sale = transact(state => {
      const held = state.inventory[key] ?? 0;
      if (quantity < 1 || held < quantity) return null;
      const random = rollSource(rolls);
      const price = getPumpkinPrice(key, state.upgrades, state.demandMultiplier);
      const multiplier = getSaleMultiplier(state.upgrades);
      const earned = floorCandyCorn(price * quantity * multiplier);
      const tips = ownsUpgrade(state.upgrades, 'fortune_teller')
        ? floorCandyCorn(rollRegisterTips(price, quantity, random) * multiplier)
        : 0;

      const inventory = { ...state.inventory, [key]: held - quantity };
      if (inventory[key] === 0) delete inventory[key];
      return {
        next: {
          ...state,
          inventory,
          candyCorn: state.candyCorn + earned + tips,
          totalCandyCornEarned: state.totalCandyCornEarned + earned + tips,
          totalPumpkinsSold: state.totalPumpkinsSold + quantity,
        },
        result: { variety: parsePumpkinKey(key).variety, candyCorn: earned + tips, tips },
      };
    });

    if (!sale) return;
    if (sale.tips > 0) setLastFortuneTip({ amount: sale.tips, timestamp: Date.now() });
    callbacksRef.current.onPumpkinSold?.(varietyName(sale.variety), quantity, sale.candyCorn);
  }, [transact, callbacksRef]);

  const sellAllPumpkins = useCallback(() => {
    const rolls = Array.from({ length: countPumpkins(eventStateRef.current.inventory) * 2 }, () => Math.random());

    const sale = transact(state => {
      const entries = Object.entries(state.inventory).filter(([, quantity]) => quantity > 0);
      if (entries.length === 0) return null;
      const random = rollSource(rolls);
      const fortuneTeller = ownsUpgrade(state.upgrades, 'fortune_teller');
      let value = 0;
      let tips = 0;
      let sold = 0;
      for (const [key, quantity] of entries) {
        const price = getPumpkinPrice(key, state.upgrades, state.demandMultiplier);
        value += price * quantity;
        sold += quantity;
        if (fortuneTeller) tips += rollRegisterTips(price, quantity, random);
      }
      const multiplier = getSaleMultiplier(state.upgrades);
      const earned = floorCandyCorn(value * multiplier) + floorCandyCorn(tips * multiplier);
      return {
        next: {
          ...state,
          inventory: {},
          candyCorn: state.candyCorn + earned,
          totalCandyCornEarned: state.totalCandyCornEarned + earned,
          totalPumpkinsSold: state.totalPumpkinsSold + sold,
        },
        result: { sold, earned, tips: floorCandyCorn(tips * multiplier) },
      };
    });

    if (!sale) return;
    if (sale.tips > 0) setLastFortuneTip({ amount: sale.tips, timestamp: Date.now() });
    callbacksRef.current.onPumpkinSold?.('Pumpkin', sale.sold, sale.earned);
  }, [transact, eventStateRef, callbacksRef]);

  const sellGoods = useCallback((good: PumpkinGood, quantity: number) => {
    transact(state => {
      if (quantity < 1 || state.materials[good] < quantity) return null;
      const earned = C.GOOD_PRICES[good] * quantity;
      return {
        next: {
          ...state,
          materials: { ...state.materials, [good]: state.materials[good] - quantity },
          candyCorn: state.candyCorn + earned,
          totalCandyCornEarned: state.totalCandyCornEarned + earned,
        },
        result: true,
      };
    });
  }, [transact]);

  const claimDailyBonus = useCallback((): boolean => {
    const date = today();
    return transact(state => {
      if (!ownsUpgrade(state.upgrades, 'chalkboard_sign') || state.lastBonusDate === date) return null;
      return {
        next: {
          ...state,
          lastBonusDate: date,
          candyCorn: state.candyCorn + C.DAILY_BONUS,
          totalCandyCornEarned: state.totalCandyCornEarned + C.DAILY_BONUS,
        },
        result: true,
      };
    }) ?? false;
  }, [transact]);

  // ── County Fair ──

  const sellGiant = useCallback((giantId: string) => {
    const sale = transact(state => {
      const giant = state.giantShelf.find(g => g.id === giantId);
      if (!giant) return null;
      const earned = floorCandyCorn(getGiantPrice(giant.weight, giant.quality, state.upgrades, state.demandMultiplier) * getSaleMultiplier(state.upgrades));
      return {
        next: {
          ...state,
          giantShelf: state.giantShelf.filter(g => g.id !== giantId),
          candyCorn: state.candyCorn + earned,
          totalCandyCornEarned: state.totalCandyCornEarned + earned,
          totalPumpkinsSold: state.totalPumpkinsSold + 1,
        },
        result: earned,
      };
    });
    if (sale !== null) callbacksRef.current.onPumpkinSold?.(varietyName('giant'), 1, sale);
  }, [transact, callbacksRef]);

  const enterWeighOff = useCallback((giantId: string): WeighOffResult | null => {
    const rolls = Array.from({ length: C.RIVAL_COUNT }, () => Math.random());
    const result = transact(state => {
      const giant = state.giantShelf.find(g => g.id === giantId);
      if (!giant || state.weighOff.daysUntilFair > 0) return null;

      const judged = judgeWeighOff(giant.weight, state.weighOff.fairsEntered, rolls);
      const ribbons = { ...state.weighOff.ribbons };
      if (judged.placing === 1) ribbons.first += 1;
      else if (judged.placing === 2) ribbons.second += 1;
      else if (judged.placing === 3) ribbons.third += 1;

      return {
        next: {
          ...state,
          giantShelf: state.giantShelf.filter(g => g.id !== giantId),
          candyCorn: state.candyCorn + judged.prize,
          totalCandyCornEarned: state.totalCandyCornEarned + judged.prize,
          weighOff: {
            ...state.weighOff,
            daysUntilFair: C.FAIR_INTERVAL_DAYS,
            fairsEntered: state.weighOff.fairsEntered + 1,
            ribbons,
            lastResult: judged,
          },
        },
        result: judged,
      };
    });
    if (result) callbacksRef.current.onWeighOff?.(result);
    return result;
  }, [transact, callbacksRef]);

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
      if (prev.passiveCandyCornPerSecond <= 0 || deltaMs <= 0) return prev;
      // Keep the fraction, so 0.1 per second pays 1 every 10 seconds
      const total = prev.passiveRemainder + prev.passiveCandyCornPerSecond * (deltaMs / 1000);
      const whole = Math.floor(total + 1e-9);
      return {
        ...prev,
        candyCorn: prev.candyCorn + whole,
        totalCandyCornEarned: prev.totalCandyCornEarned + whole,
        passiveRemainder: Math.max(0, total - whole),
      };
    });
  }, []);

  const processPumpkinGrowth = useCallback((ticks: number = 1) => {
    const steps = ticks > 0 ? ticks : 1;
    // One Blue Ribbon roll per plot, made before the update
    const rolls = eventStateRef.current.plots.map(() => Math.random());
    setEventState(prev => applyGrowth(prev, steps, rolls));
  }, [eventStateRef]);

  const processScarecrowCrew = useCallback((ticks: number = 1) => {
    const steps = ticks > 0 ? ticks : 1;
    setEventState(prev => applyCrew(prev, steps));
  }, []);

  // Memoized so the game context stays stable between changes.
  // dailyBonusAvailable is a getter because it depends on today's date.
  return useMemo<UsePumpkinEventReturn>(() => ({
    eventState,
    isEventActive,
    candyCorn: eventState.candyCorn,
    earnCandyCorn,
    plots: eventState.plots,
    plantPumpkin,
    harvestPumpkin,
    harvestAllPumpkins,
    materials: eventState.materials,
    craftItem,
    decoratePumpkin,
    currentCrewAction: eventState.currentCrewAction,
    sellPumpkins,
    sellAllPumpkins,
    sellGoods,
    claimDailyBonus,
    get dailyBonusAvailable() {
      return ownsUpgrade(eventState.upgrades, 'chalkboard_sign') && eventState.lastBonusDate !== today();
    },
    totalPumpkinsSold: eventState.totalPumpkinsSold,
    demandMultiplier: eventState.demandMultiplier,
    passiveCandyCornPerSecond: eventState.passiveCandyCornPerSecond,
    lastFortuneTip,
    giantShelf: eventState.giantShelf,
    sellGiant,
    enterWeighOff,
    purchaseUpgrade,
    updatePassiveIncome,
    processPumpkinGrowth,
    processScarecrowCrew,
  }), [
    eventState,
    isEventActive,
    lastFortuneTip,
    earnCandyCorn,
    plantPumpkin,
    harvestPumpkin,
    harvestAllPumpkins,
    craftItem,
    decoratePumpkin,
    sellPumpkins,
    sellAllPumpkins,
    sellGoods,
    claimDailyBonus,
    sellGiant,
    enterWeighOff,
    purchaseUpgrade,
    updatePassiveIncome,
    processPumpkinGrowth,
    processScarecrowCrew,
  ]);
}
