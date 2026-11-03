/**
 * Spring Farmer's Market Event Hook
 *
 * State and actions for the seasonal spring event (March 20 through Memorial Day):
 * Petals, the Flower Beds, the Herb Garden, the Potting Shed, the Market Stall
 * and the Cart.
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
  countBunches,
  flowerFinishFor,
  flowerGrowthSpeed,
  flowerKey,
  floorPetals,
  getCartPetals,
  getFlowerPrice,
  getGoodSalePetals,
  getSaleMultiplier,
  gnomeJobsPerSecond,
  herbCap,
  herbGrowthSpeed,
  marketDayInterval,
  ownsUpgrade,
  parseFlowerKey,
  sprigsPerCycle
} from '../utils/springPricing';
import {
  ALL_SPRING_UPGRADES,
  CRAFTED_GOODS,
  FLOWER_QUALITY_MULTIPLIERS,
  FLOWER_VARIETIES,
  HERBS,
  HERB_ORDER,
  SPRING_EVENT_CONSTANTS,
  SPRING_RECIPES
} from '../data/springEventData';
import type {
  FlowerBed,
  FlowerDecoration,
  FlowerFinish,
  FlowerInventory,
  FlowerQuality,
  FlowerVariety,
  GnomeCrewAction,
  HerbKind,
  HerbSlot,
  MarketDayResult,
  SpringCart,
  SpringEventState,
  SpringGood,
  SpringMaterials,
  SpringRecipe
} from '../types/springEvent';

const C = SPRING_EVENT_CONSTANTS;

interface UseSpringEventParams {
  initialState?: Partial<SpringEventState>;
  /** Run the event out of season: the dev-only Spring Market Preview flag */
  forceActive?: boolean;
  /** A sale at the stall. `key` is the bunch's inventory key, or null for Sell All. */
  onFlowersSold?: (key: string | null, quantity: number, petals: number) => void;
  onFlowerHarvested?: (variety: FlowerVariety, quality: FlowerQuality) => void;
  onItemCrafted?: (itemName: string, quantity: number) => void;
  onUpgradePurchased?: (upgradeName: string, cost: number) => void;
  /** Market Day sold the Cart; not called when the Cart was empty */
  onMarketDay?: (result: MarketDayResult) => void;
}

export interface UseSpringEventReturn {
  eventState: SpringEventState;
  isEventActive: boolean;

  // Currency
  petals: number;
  earnPetals: (amount: number) => void;

  // Flower Beds
  beds: FlowerBed[];
  plantFlower: (bedIndex: number, variety: FlowerVariety) => void;
  harvestFlower: (bedIndex: number) => void;
  harvestAllFlowers: () => void;

  // Herb Garden
  herbs: Record<HerbKind, HerbSlot>;
  /** Gathers one herb's sprigs into stock; returns how many */
  gatherHerb: (herb: HerbKind) => number;
  gatherAllHerbs: () => number;

  // Potting Shed
  materials: SpringMaterials;
  craftItem: (recipeId: string, quantity?: number) => boolean;
  finishBunch: (variety: FlowerVariety, decorations: FlowerDecoration[]) => boolean;
  currentCrewAction?: GnomeCrewAction;

  // Market Stall
  sellFlowers: (key: string, quantity: number) => void;
  sellAllFlowers: () => void;
  sellGoods: (good: SpringGood, quantity: number) => void;
  claimDailyBonus: () => boolean;
  dailyBonusAvailable: boolean;
  totalFlowersSold: number;
  demandMultiplier: number;
  passivePetalsPerSecond: number;
  lastRegularsTip: { amount: number; timestamp: number };

  // The Cart
  cart: SpringCart;
  daysUntilMarket: number;
  loadBunches: (key: string, quantity: number) => void;
  loadGoods: (good: SpringGood, quantity: number) => void;
  /** Every bunch and crafted good onto the Cart; greenery and lavender stay for finishing */
  loadEverything: () => void;
  /** Everything on the Cart back into stock */
  unloadCart: () => void;

  // Progression
  purchaseUpgrade: (upgradeId: string) => boolean;

  // Game clock
  updatePassiveIncome: (deltaMs: number) => void;
  /** Grows the beds and herbs and counts down to Market Day, which sells the Cart */
  processSpringGrowth: (ticks?: number) => void;
  processGnomeCrew: (ticks?: number) => void;
}

// ============================================================================
// SEASON
// ============================================================================

/** US Memorial Day: the last Monday of May */
export function memorialDay(year: number): Date {
  const lastOfMay = new Date(year, 4, 31);
  const daysBack = (lastOfMay.getDay() + 6) % 7;
  return new Date(year, 4, 31 - daysBack);
}

/** US Mother's Day: the second Sunday of May */
export function mothersDay(year: number): Date {
  const firstOfMay = new Date(year, 4, 1);
  const firstSunday = 1 + ((7 - firstOfMay.getDay()) % 7);
  return new Date(year, 4, firstSunday + 7);
}

/** Whether a date is Mother's Day itself */
export function isMothersDay(date: Date = new Date()): boolean {
  const day = mothersDay(date.getFullYear());
  return date.getMonth() === day.getMonth() && date.getDate() === day.getDate();
}

/** Whether a date falls in the Spring Farmer's Market: March 20 through Memorial Day */
export function isSpringSeason(date: Date = new Date()): boolean {
  const year = date.getFullYear();
  const start = new Date(year, C.START_MONTH, C.START_DAY);
  const end = memorialDay(year);
  const dayAfterEnd = new Date(year, end.getMonth(), end.getDate() + 1);
  return date >= start && date < dayAfterEnd;
}

/** Stall demand: rises from 1x on March 20 to 2x on Mother's Day, then holds until Memorial Day */
export function springDemandMultiplier(date: Date = new Date()): number {
  if (!isSpringSeason(date)) return C.BASE_DEMAND_MULTIPLIER;
  const start = new Date(date.getFullYear(), C.START_MONTH, C.START_DAY);
  const peak = mothersDay(date.getFullYear());
  const progress = Math.min(1, (date.getTime() - start.getTime()) / (peak.getTime() - start.getTime()));
  return C.BASE_DEMAND_MULTIPLIER + progress * (C.MAX_DEMAND_MULTIPLIER - C.BASE_DEMAND_MULTIPLIER);
}

/** Today as YYYY-MM-DD in local time, so the daily bonus resets at local midnight */
const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

/** This year, when today is Mother's Day, for counting Gift Bouquets sold on it; otherwise null */
const mothersDayYear = (): number | null => {
  const now = new Date();
  return isMothersDay(now) ? now.getFullYear() : null;
};

// ============================================================================
// STATE HELPERS
// ============================================================================

const emptyBed = (index: number): FlowerBed => ({
  id: `flower_bed_${index}`,
  variety: null,
  growth: 0,
  growthTime: 0,
  quality: 'normal',
  harvestReady: false,
});

const emptyHerbs = (): Record<HerbKind, HerbSlot> => ({
  mint: { sprigs: 0, growth: 0 },
  basil: { sprigs: 0, growth: 0 },
  chamomile: { sprigs: 0, growth: 0 },
  lavender: { sprigs: 0, growth: 0 },
});

/** A new event: six empty beds, Tulips and Mint, no Petals */
export function createInitialSpringState(): SpringEventState {
  return {
    isActive: false,
    eventYear: new Date().getFullYear(),
    petals: 0,
    totalPetalsEarned: 0,
    passiveRemainder: 0,
    beds: Array.from({ length: C.DEFAULT_BED_COUNT }, (_, i) => emptyBed(i)),
    maxBeds: C.DEFAULT_BED_COUNT,
    herbs: emptyHerbs(),
    materials: {
      greenery: 0, seeds: 0,
      mint: 0, basil: 0, chamomile: 0, lavender: 0,
      mintTea: 0, chamomileTea: 0, pesto: 0, packets: 0,
    },
    inventory: {},
    cart: { bunches: {}, goods: {} },
    market: { daysUntilMarket: C.MARKET_DAY_INTERVAL, marketsHeld: 0, lastResult: null },
    totalFlowersSold: 0,
    mothersDayBouquets: { year: 0, sold: 0 },
    demandMultiplier: springDemandMultiplier(),
    lastBonusDate: '',
    passivePetalsPerSecond: 0,
    upgrades: ALL_SPRING_UPGRADES.map(u => ({ ...u })),
  };
}

/**
 * Brings a saved event up to date: upgrade rules from code with saved purchases and
 * levels kept, so a balance change reaches old saves; demand for today.
 */
export function loadSpringState(saved?: Partial<SpringEventState>): SpringEventState {
  const base = createInitialSpringState();
  if (!saved) return base;

  const savedUpgrades = new Map((saved.upgrades ?? []).map(u => [u.id, u]));
  const upgrades = ALL_SPRING_UPGRADES.map(definition => {
    const savedUpgrade = savedUpgrades.get(definition.id);
    return savedUpgrade
      ? { ...definition, owned: savedUpgrade.owned, level: savedUpgrade.level ?? definition.level }
      : { ...definition };
  });
  const busker = upgrades.find(u => u.id === 'busker');
  const herbs = emptyHerbs();
  HERB_ORDER.forEach(herb => { herbs[herb] = { ...herbs[herb], ...saved.herbs?.[herb] }; });

  return {
    ...base,
    ...saved,
    herbs,
    materials: { ...base.materials, ...saved.materials },
    cart: { bunches: { ...saved.cart?.bunches }, goods: { ...saved.cart?.goods } },
    market: { ...base.market, ...saved.market },
    mothersDayBouquets: { ...base.mothersDayBouquets, ...saved.mothersDayBouquets },
    upgrades,
    passivePetalsPerSecond: busker?.owned ? busker.passiveIncome ?? 0 : 0,
    demandMultiplier: springDemandMultiplier(),
  };
}

/** A pure state change plus what it did, for logging and return values */
type Transition<R> = { next: SpringEventState; result: R };

/**
 * Pre-rolled random numbers. Rolls past the end return 1, which never triggers
 * a bonus.
 */
function rollSource(rolls: readonly number[]): () => number {
  let index = 0;
  return () => (index < rolls.length ? rolls[index++] : 1);
}

/** Petals added to the balance and the running total */
function withPetals(state: SpringEventState, amount: number): Pick<SpringEventState, 'petals' | 'totalPetalsEarned'> {
  return { petals: state.petals + amount, totalPetalsEarned: state.totalPetalsEarned + amount };
}

/** Gift Bouquets among some bunches */
function countBouquets(bunches: FlowerInventory): number {
  return Object.entries(bunches)
    .filter(([key]) => parseFlowerKey(key).finish === 'bouquet')
    .reduce((sum, [, quantity]) => sum + quantity, 0);
}

/** The Mother's Day count after selling some Gift Bouquets; `year` is null on any other day */
function addMothersDayBouquets(
  current: SpringEventState['mothersDayBouquets'],
  sold: number,
  year: number | null
): SpringEventState['mothersDayBouquets'] {
  if (year === null || sold <= 0) return current;
  return { year, sold: (current.year === year ? current.sold : 0) + sold };
}

/** Whether there are materials for one batch of a recipe, times `quantity` */
function canCraft(materials: SpringMaterials, recipe: SpringRecipe, quantity = 1): boolean {
  return (Object.entries(recipe.inputs) as [keyof SpringMaterials, number][])
    .every(([material, amount]) => materials[material] >= amount * quantity);
}

/** Spends a recipe's inputs and adds its output, `quantity` times, in place */
function craftInto(materials: SpringMaterials, recipe: SpringRecipe, quantity = 1): void {
  (Object.entries(recipe.inputs) as [keyof SpringMaterials, number][]).forEach(([material, amount]) => {
    materials[material] -= amount * quantity;
  });
  (Object.entries(recipe.output) as [keyof SpringMaterials, number][]).forEach(([material, amount]) => {
    materials[material] += amount * quantity;
  });
}

/**
 * The crew's finish: a Gift Bouquet when there is greenery and lavender to spend, otherwise
 * plain. It never spends either on a lesser finish, since a bouquet is worth far more.
 */
function bouquetIfStocked(materials: SpringMaterials): FlowerFinish {
  if (materials.greenery > 0 && materials.lavender > 0) {
    materials.greenery -= 1;
    materials.lavender -= 1;
    return 'bouquet';
  }
  return 'plain';
}

/** The plain bunch worth the most, which the crew finishes first */
function mostValuablePlainKey(inventory: FlowerInventory): string | undefined {
  let best: string | undefined;
  let bestValue = -1;
  for (const [key, quantity] of Object.entries(inventory)) {
    if (quantity <= 0) continue;
    const { variety, quality, finish } = parseFlowerKey(key);
    if (finish !== 'plain') continue;
    const value = FLOWER_VARIETIES[variety].baseValue * FLOWER_QUALITY_MULTIPLIERS[quality];
    if (value > bestValue) {
      best = key;
      bestValue = value;
    }
  }
  return best;
}

/** Moves `quantity` of one key from a stock map to another, in place */
function moveStock(from: Record<string, number>, to: Record<string, number>, key: string, quantity: number): void {
  from[key] = (from[key] ?? 0) - quantity;
  if (from[key] <= 0) delete from[key];
  to[key] = (to[key] ?? 0) + quantity;
}

// ============================================================================
// TRANSITIONS
// ============================================================================

/** Harvests one ready bed */
function applyHarvest(state: SpringEventState, bedIndex: number): Transition<{
  variety: FlowerVariety;
  quality: FlowerQuality;
}> | null {
  const bed = state.beds[bedIndex];
  if (!bed?.variety || !bed.harvestReady) return null;

  const { variety, quality } = bed;
  const definition = FLOWER_VARIETIES[variety];
  const qualityMultiplier = FLOWER_QUALITY_MULTIPLIERS[quality];
  const materials = { ...state.materials };
  materials.greenery += Math.floor(definition.baseYield.greenery * qualityMultiplier);
  materials.seeds += Math.floor(definition.baseYield.seeds * qualityMultiplier);

  // The Gnome Crew ties bunches into Gift Bouquets as they come in
  const finish = ownsUpgrade(state.upgrades, 'gnome_crew') ? bouquetIfStocked(materials) : 'plain';
  const key = flowerKey(variety, quality, finish);

  const beds = [...state.beds];
  beds[bedIndex] = { ...emptyBed(bedIndex), id: bed.id };

  return {
    next: {
      ...state,
      beds,
      materials,
      inventory: { ...state.inventory, [key]: (state.inventory[key] ?? 0) + 1 },
      ...withPetals(state, C.HARVEST_PETALS[quality]),
    },
    result: { variety, quality },
  };
}

/** Grows every planted herb by `steps` days, up to the slot's cap */
function growHerbs(state: SpringEventState, steps: number): Record<HerbKind, HerbSlot> {
  const speed = herbGrowthSpeed(state.upgrades);
  const cap = herbCap(state.upgrades);
  const perCycle = sprigsPerCycle(state.upgrades);

  let changed = false;
  const herbs = { ...state.herbs };
  for (const herb of HERB_ORDER) {
    const slot = state.herbs[herb];
    if (!ownsUpgrade(state.upgrades, HERBS[herb].unlockUpgrade) || slot.sprigs >= cap) continue;
    changed = true;
    const interval = HERBS[herb].interval;
    const growth = slot.growth + speed * steps;
    const cycles = Math.floor(growth / interval + 1e-9);
    if (cycles === 0) {
      herbs[herb] = { ...slot, growth };
      continue;
    }
    const sprigs = Math.min(cap, slot.sprigs + cycles * perCycle);
    // A full slot waits to be gathered before it grows again
    herbs[herb] = { sprigs, growth: sprigs >= cap ? 0 : Math.max(0, growth - cycles * interval) };
  }
  return changed ? herbs : state.herbs;
}

/**
 * Grows the beds and herbs by `steps` days and counts down to Market Day, which sells
 * everything on the Cart. One Prize Bloom roll per bed. `bouquetYear` is this year on
 * Mother's Day, otherwise null.
 */
function applyGrowth(
  state: SpringEventState,
  steps: number,
  rolls: readonly number[],
  bouquetYear: number | null
): Transition<MarketDayResult | null> {
  const speed = flowerGrowthSpeed(state.upgrades);
  const bulbs = state.upgrades.find(u => u.id === 'heirloom_bulbs');
  const prizeChance = bulbs?.owned ? bulbs.procChance ?? 0 : 0;

  let bedsChanged = false;
  const beds = state.beds.map((bed, i) => {
    if (!bed.variety || bed.harvestReady) return bed;
    bedsChanged = true;
    const growth = bed.growth + speed * steps;
    if (growth < bed.growthTime) return { ...bed, growth };
    return {
      ...bed,
      growth: bed.growthTime,
      harvestReady: true,
      quality: (rolls[i] ?? 1) < prizeChance ? 'prize' as const : bed.quality,
    };
  });
  const herbs = growHerbs(state, steps);

  let next: SpringEventState = {
    ...state,
    beds: bedsChanged ? beds : state.beds,
    herbs,
  };

  // Market Day
  const remaining = state.market.daysUntilMarket - steps;
  if (remaining > 0) {
    next.market = { ...state.market, daysUntilMarket: remaining };
    return { next, result: null };
  }

  const interval = marketDayInterval(state.upgrades);
  const overdue = -remaining;
  const bunches = countBunches(state.cart.bunches);
  const goods = Object.values(state.cart.goods).reduce((sum, quantity) => sum + (quantity ?? 0), 0);
  let sold: MarketDayResult | null = null;
  if (bunches + goods > 0) {
    const petals = getCartPetals(state.cart, state.upgrades, state.demandMultiplier);
    sold = { bunches, goods, petals };
    next = {
      ...next,
      ...withPetals(state, petals),
      cart: { bunches: {}, goods: {} },
      totalFlowersSold: state.totalFlowersSold + bunches,
      mothersDayBouquets: addMothersDayBouquets(state.mothersDayBouquets, countBouquets(state.cart.bunches), bouquetYear),
    };
  }
  next.market = {
    daysUntilMarket: interval - (overdue % interval),
    marketsHeld: state.market.marketsHeld + 1 + Math.floor(overdue / interval),
    lastResult: sold ?? state.market.lastResult,
  };
  return { next, result: sold };
}

/**
 * Gnome Crew jobs, in order: gather a full herb slot, press seed packets, make teas and
 * pesto, tie plain bunches into Gift Bouquets, then, with the Cart Loader, load the Cart.
 */
function applyCrew(state: SpringEventState, steps: number): SpringEventState {
  if (!ownsUpgrade(state.upgrades, 'gnome_crew')) {
    return state.currentCrewAction ? { ...state, currentCrewAction: undefined } : state;
  }

  const jobs = gnomeJobsPerSecond(state.upgrades) * steps;
  const cap = herbCap(state.upgrades);
  const planted = HERB_ORDER.filter(herb => ownsUpgrade(state.upgrades, HERBS[herb].unlockUpgrade));
  const recipes = SPRING_RECIPES
    .filter(recipe => !recipe.requiredUpgrade || ownsUpgrade(state.upgrades, recipe.requiredUpgrade));
  // Packets first, and Chamomile Tea before Mint Tea, so mint goes where it is worth most
  const craftOrder = ['seed_packets', 'chamomile_tea', 'mint_tea', 'pesto']
    .map(id => recipes.find(recipe => recipe.id === id))
    .filter((recipe): recipe is SpringRecipe => recipe !== undefined);
  const cartLoader = ownsUpgrade(state.upgrades, 'cart_loader');

  const herbs = { ...state.herbs };
  const materials = { ...state.materials };
  const inventory = { ...state.inventory };
  const cartBunches = { ...state.cart.bunches };
  const cartGoods = { ...state.cart.goods };
  let action: GnomeCrewAction | undefined;

  for (let job = 0; job < jobs; job++) {
    let done: GnomeCrewAction | undefined;
    const fullHerb = planted.find(herb => herbs[herb].sprigs >= cap);
    const recipe = craftOrder.find(r => canCraft(materials, r));
    const plainKey = mostValuablePlainKey(inventory);

    if (fullHerb) {
      materials[fullHerb] += herbs[fullHerb].sprigs;
      herbs[fullHerb] = { sprigs: 0, growth: 0 };
      done = { type: 'gather', herb: fullHerb };
    } else if (recipe) {
      craftInto(materials, recipe);
      done = { type: 'craft', recipeId: recipe.id };
    } else if (plainKey && materials.greenery > 0 && materials.lavender > 0) {
      // Never a half finish: the crew waits until it has greenery and lavender both
      const { variety, quality } = parseFlowerKey(plainKey);
      const finish = bouquetIfStocked(materials);
      inventory[plainKey] -= 1;
      if (inventory[plainKey] <= 0) delete inventory[plainKey];
      const finishedKey = flowerKey(variety, quality, finish);
      inventory[finishedKey] = (inventory[finishedKey] ?? 0) + 1;
      done = { type: 'finish', finish };
    } else if (cartLoader) {
      // One kind of finished bunch or crafted good onto the Cart per job
      const finishedKey = Object.keys(inventory).find(key => parseFlowerKey(key).finish !== 'plain' && inventory[key] > 0);
      const good = CRAFTED_GOODS.find(g => materials[g] > 0);
      if (finishedKey) {
        moveStock(inventory, cartBunches, finishedKey, inventory[finishedKey]);
        done = { type: 'load' };
      } else if (good) {
        cartGoods[good] = (cartGoods[good] ?? 0) + materials[good];
        materials[good] = 0;
        done = { type: 'load' };
      }
    }
    if (!done) break;
    action ??= done;
  }

  if (!action && !state.currentCrewAction) return state;
  return action
    ? { ...state, herbs, materials, inventory, cart: { bunches: cartBunches, goods: cartGoods }, currentCrewAction: action }
    : { ...state, currentCrewAction: undefined };
}

/** Buys an upgrade, or returns null when it can't be bought */
function applyUpgradePurchase(state: SpringEventState, upgradeId: string): Transition<{ name: string; cost: number }> | null {
  const upgrade = state.upgrades.find(u => u.id === upgradeId);
  if (!upgrade || getMissingPrerequisite(upgrade, state.upgrades)) return null;

  const cost = getEventUpgradeCost(upgrade);
  if (state.petals < cost) return null;

  if (upgrade.repeatable) {
    const level = upgrade.level ?? 0;
    if (level >= (upgrade.maxLevel ?? Infinity)) return null;
    const next: SpringEventState = {
      ...state,
      petals: state.petals - cost,
      upgrades: state.upgrades.map(u => u.id === upgradeId ? { ...u, level: level + 1, owned: true } : u),
    };
    // Bed Expansion adds a bed
    if (upgradeId === 'bed_expansion') {
      next.beds = [...state.beds, emptyBed(state.beds.length)];
      next.maxBeds = state.maxBeds + 1;
    }
    return { next, result: { name: upgrade.name, cost } };
  }

  if (upgrade.owned) return null;
  const next: SpringEventState = {
    ...state,
    petals: state.petals - cost,
    upgrades: state.upgrades.map(u => u.id === upgradeId ? { ...u, owned: true } : u),
  };
  // The Busker sets the passive income rate
  if (upgradeId === 'busker') next.passivePetalsPerSecond = upgrade.passiveIncome ?? 0;
  // The Pony Cart brings the next Market Day within its shorter interval
  if (upgradeId === 'pony_cart') {
    next.market = { ...state.market, daysUntilMarket: Math.min(state.market.daysUntilMarket, C.PONY_CART_INTERVAL) };
  }
  return { next, result: { name: upgrade.name, cost } };
}

// ============================================================================
// HOOK
// ============================================================================

export function useSpringEvent({
  initialState,
  forceActive = false,
  onFlowersSold,
  onFlowerHarvested,
  onItemCrafted,
  onUpgradePurchased,
  onMarketDay,
}: UseSpringEventParams = {}): UseSpringEventReturn {
  const [eventState, setEventState] = useState<SpringEventState>(() => loadSpringState(initialState));
  const [inSeason, setInSeason] = useState(() => isSpringSeason());
  const isEventActive = inSeason || forceActive;
  const [lastRegularsTip, setLastRegularsTip] = useState({ amount: 0, timestamp: 0 });

  const callbacksRef = useLatestRef({ onFlowersSold, onFlowerHarvested, onItemCrafted, onUpgradePurchased, onMarketDay });
  const eventStateRef = useLatestRef(eventState);

  /**
   * Runs a pure transition on the latest state to decide and report, then again
   * inside the updater so it composes with other queued updates.
   */
  const transact = useCallback(<R>(transition: (state: SpringEventState) => Transition<R> | null): R | null => {
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
      setInSeason(isSpringSeason());
      const demandMultiplier = springDemandMultiplier();
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

  const earnPetals = useCallback((amount: number) => {
    if (amount <= 0) return;
    setEventState(prev => ({ ...prev, ...withPetals(prev, amount) }));
  }, []);

  // ── Flower Beds ──

  const plantFlower = useCallback((bedIndex: number, variety: FlowerVariety) => {
    transact(state => {
      const bed = state.beds[bedIndex];
      const definition = FLOWER_VARIETIES[variety];
      if (!bed || bed.variety !== null || !ownsUpgrade(state.upgrades, definition.unlockUpgrade)) return null;
      const beds = [...state.beds];
      beds[bedIndex] = { ...bed, variety, growth: 0, growthTime: definition.growthTime, quality: 'normal', harvestReady: false };
      return { next: { ...state, beds }, result: true };
    });
  }, [transact]);

  const harvestFlower = useCallback((bedIndex: number) => {
    const harvested = transact(state => applyHarvest(state, bedIndex));
    if (harvested) callbacksRef.current.onFlowerHarvested?.(harvested.variety, harvested.quality);
  }, [transact, callbacksRef]);

  const harvestAllFlowers = useCallback(() => {
    // Each harvest updates the latest-state ref, so the next one sees it
    eventStateRef.current.beds.forEach((bed, index) => {
      if (bed.harvestReady) harvestFlower(index);
    });
  }, [harvestFlower, eventStateRef]);

  // ── Herb Garden ──

  const gatherHerb = useCallback((herb: HerbKind): number => {
    return transact(state => {
      const sprigs = state.herbs[herb].sprigs;
      if (sprigs <= 0) return null;
      // A full slot starts growing again from nothing
      const growth = sprigs >= herbCap(state.upgrades) ? 0 : state.herbs[herb].growth;
      return {
        next: {
          ...state,
          herbs: { ...state.herbs, [herb]: { sprigs: 0, growth } },
          materials: { ...state.materials, [herb]: state.materials[herb] + sprigs },
        },
        result: sprigs,
      };
    }) ?? 0;
  }, [transact]);

  const gatherAllHerbs = useCallback((): number => {
    return HERB_ORDER.reduce((sum, herb) => sum + gatherHerb(herb), 0);
  }, [gatherHerb]);

  // ── Potting Shed ──

  const craftItem = useCallback((recipeId: string, quantity: number = 1): boolean => {
    const recipe = SPRING_RECIPES.find(r => r.id === recipeId);
    if (!recipe || quantity < 1) return false;

    const crafted = transact(state => {
      if (recipe.requiredUpgrade && !ownsUpgrade(state.upgrades, recipe.requiredUpgrade)) return null;
      if (!canCraft(state.materials, recipe, quantity)) return null;
      const materials = { ...state.materials };
      craftInto(materials, recipe, quantity);
      return { next: { ...state, materials }, result: true };
    });

    if (crafted) callbacksRef.current.onItemCrafted?.(recipe.name, quantity);
    return crafted ?? false;
  }, [transact, callbacksRef]);

  const finishBunch = useCallback((variety: FlowerVariety, decorations: FlowerDecoration[]): boolean => {
    if (decorations.length === 0) return false;
    return transact(state => {
      // Normal bunches first, then Prize Blooms
      const plainKey = (['normal', 'prize'] as const)
        .map(quality => flowerKey(variety, quality, 'plain'))
        .find(key => (state.inventory[key] ?? 0) > 0);
      if (!plainKey) return null;
      const arrange = decorations.includes('arrange');
      const scent = decorations.includes('scent');
      if (arrange && state.materials.greenery < 1) return null;
      if (scent && state.materials.lavender < 1) return null;

      const materials = { ...state.materials };
      if (arrange) materials.greenery -= 1;
      if (scent) materials.lavender -= 1;

      const inventory = { ...state.inventory };
      inventory[plainKey] -= 1;
      if (inventory[plainKey] === 0) delete inventory[plainKey];
      const finishedKey = flowerKey(variety, parseFlowerKey(plainKey).quality, flowerFinishFor(decorations));
      inventory[finishedKey] = (inventory[finishedKey] ?? 0) + 1;

      return { next: { ...state, materials, inventory }, result: true };
    }) ?? false;
  }, [transact]);

  // ── Market Stall ──

  const sellFlowers = useCallback((key: string, quantity: number) => {
    // Two rolls per bunch for Regulars' tips (chance, then size)
    const rolls = Array.from({ length: Math.max(0, quantity) * 2 }, () => Math.random());
    const bouquetYear = mothersDayYear();

    const sale = transact(state => {
      const held = state.inventory[key] ?? 0;
      if (quantity < 1 || held < quantity) return null;
      const random = rollSource(rolls);
      const price = getFlowerPrice(key, state.upgrades, state.demandMultiplier);
      const multiplier = getSaleMultiplier(state.upgrades);
      const earned = floorPetals(price * quantity * multiplier);
      const tips = ownsUpgrade(state.upgrades, 'regulars')
        ? floorPetals(rollRegisterTips(price, quantity, random) * multiplier)
        : 0;

      const inventory = { ...state.inventory, [key]: held - quantity };
      if (inventory[key] === 0) delete inventory[key];
      return {
        next: {
          ...state,
          inventory,
          ...withPetals(state, earned + tips),
          totalFlowersSold: state.totalFlowersSold + quantity,
          mothersDayBouquets: addMothersDayBouquets(state.mothersDayBouquets, countBouquets({ [key]: quantity }), bouquetYear),
        },
        result: { petals: earned + tips, tips },
      };
    });

    if (!sale) return;
    if (sale.tips > 0) setLastRegularsTip({ amount: sale.tips, timestamp: Date.now() });
    callbacksRef.current.onFlowersSold?.(key, quantity, sale.petals);
  }, [transact, callbacksRef]);

  const sellAllFlowers = useCallback(() => {
    const rolls = Array.from({ length: countBunches(eventStateRef.current.inventory) * 2 }, () => Math.random());
    const bouquetYear = mothersDayYear();

    const sale = transact(state => {
      const entries = Object.entries(state.inventory).filter(([, quantity]) => quantity > 0);
      if (entries.length === 0) return null;
      const random = rollSource(rolls);
      const regulars = ownsUpgrade(state.upgrades, 'regulars');
      let value = 0;
      let tips = 0;
      let sold = 0;
      for (const [key, quantity] of entries) {
        const price = getFlowerPrice(key, state.upgrades, state.demandMultiplier);
        value += price * quantity;
        sold += quantity;
        if (regulars) tips += rollRegisterTips(price, quantity, random);
      }
      const multiplier = getSaleMultiplier(state.upgrades);
      const tipPetals = floorPetals(tips * multiplier);
      const earned = floorPetals(value * multiplier) + tipPetals;
      return {
        next: {
          ...state,
          inventory: {},
          ...withPetals(state, earned),
          totalFlowersSold: state.totalFlowersSold + sold,
          mothersDayBouquets: addMothersDayBouquets(state.mothersDayBouquets, countBouquets(state.inventory), bouquetYear),
        },
        result: { sold, earned, tips: tipPetals },
      };
    });

    if (!sale) return;
    if (sale.tips > 0) setLastRegularsTip({ amount: sale.tips, timestamp: Date.now() });
    callbacksRef.current.onFlowersSold?.(null, sale.sold, sale.earned);
  }, [transact, eventStateRef, callbacksRef]);

  const sellGoods = useCallback((good: SpringGood, quantity: number) => {
    transact(state => {
      if (quantity < 1 || state.materials[good] < quantity) return null;
      return {
        next: {
          ...state,
          materials: { ...state.materials, [good]: state.materials[good] - quantity },
          ...withPetals(state, getGoodSalePetals(good, quantity)),
        },
        result: true,
      };
    });
  }, [transact]);

  const claimDailyBonus = useCallback((): boolean => {
    const date = today();
    return transact(state => {
      if (!ownsUpgrade(state.upgrades, 'sandwich_board') || state.lastBonusDate === date) return null;
      return {
        next: { ...state, lastBonusDate: date, ...withPetals(state, C.DAILY_BONUS) },
        result: true,
      };
    }) ?? false;
  }, [transact]);

  // ── The Cart ──

  const loadBunches = useCallback((key: string, quantity: number) => {
    transact(state => {
      if (quantity < 1 || (state.inventory[key] ?? 0) < quantity) return null;
      const inventory = { ...state.inventory };
      const bunches = { ...state.cart.bunches };
      moveStock(inventory, bunches, key, quantity);
      return { next: { ...state, inventory, cart: { ...state.cart, bunches } }, result: true };
    });
  }, [transact]);

  const loadGoods = useCallback((good: SpringGood, quantity: number) => {
    transact(state => {
      if (quantity < 1 || state.materials[good] < quantity) return null;
      return {
        next: {
          ...state,
          materials: { ...state.materials, [good]: state.materials[good] - quantity },
          cart: { ...state.cart, goods: { ...state.cart.goods, [good]: (state.cart.goods[good] ?? 0) + quantity } },
        },
        result: true,
      };
    });
  }, [transact]);

  const loadEverything = useCallback(() => {
    transact(state => {
      const goods = CRAFTED_GOODS.filter(good => state.materials[good] > 0);
      if (countBunches(state.inventory) === 0 && goods.length === 0) return null;
      const bunches = { ...state.cart.bunches };
      Object.entries(state.inventory).forEach(([key, quantity]) => {
        if (quantity > 0) bunches[key] = (bunches[key] ?? 0) + quantity;
      });
      const materials = { ...state.materials };
      const cartGoods = { ...state.cart.goods };
      goods.forEach(good => {
        cartGoods[good] = (cartGoods[good] ?? 0) + materials[good];
        materials[good] = 0;
      });
      return { next: { ...state, inventory: {}, materials, cart: { bunches, goods: cartGoods } }, result: true };
    });
  }, [transact]);

  const unloadCart = useCallback(() => {
    transact(state => {
      const goods = Object.entries(state.cart.goods) as [SpringGood, number | undefined][];
      if (countBunches(state.cart.bunches) === 0 && goods.every(([, quantity]) => !quantity)) return null;
      const inventory = { ...state.inventory };
      Object.entries(state.cart.bunches).forEach(([key, quantity]) => {
        if (quantity > 0) inventory[key] = (inventory[key] ?? 0) + quantity;
      });
      const materials = { ...state.materials };
      goods.forEach(([good, quantity]) => { materials[good] += quantity ?? 0; });
      return { next: { ...state, inventory, materials, cart: { bunches: {}, goods: {} } }, result: true };
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
      if (prev.passivePetalsPerSecond <= 0 || deltaMs <= 0) return prev;
      // Keep the fraction, so 0.1 per second pays 1 every 10 seconds
      const total = prev.passiveRemainder + prev.passivePetalsPerSecond * (deltaMs / 1000);
      const whole = Math.floor(total + 1e-9);
      return {
        ...prev,
        ...withPetals(prev, whole),
        passiveRemainder: Math.max(0, total - whole),
      };
    });
  }, []);

  const processSpringGrowth = useCallback((ticks: number = 1) => {
    const steps = ticks > 0 ? ticks : 1;
    // One Prize Bloom roll per bed, made before the update
    const rolls = eventStateRef.current.beds.map(() => Math.random());
    const bouquetYear = mothersDayYear();
    const sold = transact(state => applyGrowth(state, steps, rolls, bouquetYear));
    if (sold) callbacksRef.current.onMarketDay?.(sold);
  }, [transact, eventStateRef, callbacksRef]);

  const processGnomeCrew = useCallback((ticks: number = 1) => {
    const steps = ticks > 0 ? ticks : 1;
    setEventState(prev => applyCrew(prev, steps));
  }, []);

  // Memoized so the game context stays stable between changes.
  // dailyBonusAvailable is a getter because it depends on today's date.
  return useMemo<UseSpringEventReturn>(() => ({
    eventState,
    isEventActive,
    petals: eventState.petals,
    earnPetals,
    beds: eventState.beds,
    plantFlower,
    harvestFlower,
    harvestAllFlowers,
    herbs: eventState.herbs,
    gatherHerb,
    gatherAllHerbs,
    materials: eventState.materials,
    craftItem,
    finishBunch,
    currentCrewAction: eventState.currentCrewAction,
    sellFlowers,
    sellAllFlowers,
    sellGoods,
    claimDailyBonus,
    get dailyBonusAvailable() {
      return ownsUpgrade(eventState.upgrades, 'sandwich_board') && eventState.lastBonusDate !== today();
    },
    totalFlowersSold: eventState.totalFlowersSold,
    demandMultiplier: eventState.demandMultiplier,
    passivePetalsPerSecond: eventState.passivePetalsPerSecond,
    lastRegularsTip,
    cart: eventState.cart,
    daysUntilMarket: eventState.market.daysUntilMarket,
    loadBunches,
    loadGoods,
    loadEverything,
    unloadCart,
    purchaseUpgrade,
    updatePassiveIncome,
    processSpringGrowth,
    processGnomeCrew,
  }), [
    eventState,
    isEventActive,
    lastRegularsTip,
    earnPetals,
    plantFlower,
    harvestFlower,
    harvestAllFlowers,
    gatherHerb,
    gatherAllHerbs,
    craftItem,
    finishBunch,
    sellFlowers,
    sellAllFlowers,
    sellGoods,
    claimDailyBonus,
    loadBunches,
    loadGoods,
    loadEverything,
    unloadCart,
    purchaseUpgrade,
    updatePassiveIncome,
    processSpringGrowth,
    processGnomeCrew,
  ]);
}

