/**
 * Canning rules shared by the live game and the hidden-tab catch-up: what a finished
 * batch pays, how long a batch takes, which recipe the Canner starts, which of the Engineers'
 * factory floor machines start, and a step-by-step run of game steps the player missed.
 */
import type { CanningMachine, CanningProcess, CanningState, CanningUpgrade, Recipe } from '../types/canning';
import type { GuildState } from '../types/guilds';
import {
  getCannerRewardDivisor,
  getGuildCanningTimeMultiplier,
  getJarsPerBatch,
  getPrizeJarChance,
  getRecipeValueMultiplier,
  type BatchCount
} from './guildCalculations';

/** The parts of a crop that canning reads */
export interface CanningCrop {
  name: string;
  stash: number;
  betterSeedsLevel?: number;
}

/** Honey on hand, for recipes that need it */
export interface HoneyStock {
  regular: number;
  golden: number;
}

/** What one or more finished batches pay */
export interface BatchRewards {
  money: number;
  knowledge: number;
  experience: number;
  /** Jars made, which count as canned goods */
  items: number;
}

/** What one finished batch pays */
export interface OneBatchRewards extends BatchRewards {
  /** Whether Seal of Quality made it a Prize Jar */
  prize: boolean;
}

/** Game steps between the Canner's attempts to start a batch */
export const CANNER_INTERVAL_STEPS = 10;

/** Seconds a batch takes, with Quick Hands and the guilds' time upgrades */
export function getBatchTime(recipe: Recipe, upgrades: CanningUpgrade[], guildState?: GuildState): number {
  const speed = upgrades.find(u => u.id === 'canning_speed')?.effect || 1;
  const guild = getGuildCanningTimeMultiplier(guildState);
  return Math.ceil(recipe.baseProcessingTime * speed * guild);
}

/** Whether the stash, and the honey for honey recipes, covers one batch */
export function hasIngredients(recipe: Recipe, crops: CanningCrop[], honey: HoneyStock): boolean {
  const cropsCovered = recipe.ingredients.every(ingredient => {
    const crop = crops[ingredient.veggieIndex];
    return crop !== undefined && crop.stash >= ingredient.quantity;
  });
  if (!cropsCovered || !recipe.honeyRequirement) return cropsCovered;
  return honey.regular >= recipe.honeyRequirement.regular && honey.golden >= recipe.honeyRequirement.golden;
}

/** A honey jar: one of the recipes of honey alone that the Bees tab's Honey Jars opens */
export function isHoneyJar(recipe: Pick<Recipe, 'requiredBeeUpgrade'>): boolean {
  return recipe.requiredBeeUpgrade === 'honey_jars';
}

/**
 * The ingredients a batch's knowledge and canning experience count. A recipe of honey alone,
 * like a honey jar or Canner's Cocoa, counts as one, so it teaches like a one-crop recipe.
 */
export function rewardIngredients(recipe: Pick<Recipe, 'ingredients'>): number {
  return Math.max(1, recipe.ingredients.length);
}

/**
 * The recipe the Canner starts: the first unlocked one, in the player's order, the stash
 * covers. It leaves honey jars to the player, so it never spends the honey saved for hives.
 */
export function pickRecipeToStart(sortedRecipes: Recipe[], crops: CanningCrop[], honey: HoneyStock): Recipe | undefined {
  return sortedRecipes.find(recipe => recipe.unlocked && !isHoneyJar(recipe) && hasIngredients(recipe, crops, honey));
}

/** Takes one batch's crops and honey off the stock given */
function spendIngredients(recipe: Recipe, crops: CanningCrop[], honey: HoneyStock): void {
  for (const ingredient of recipe.ingredients) {
    const crop = crops[ingredient.veggieIndex];
    if (crop) crop.stash -= ingredient.quantity;
  }
  if (recipe.honeyRequirement) {
    honey.regular -= recipe.honeyRequirement.regular;
    honey.golden -= recipe.honeyRequirement.golden;
  }
}

// =============================================================================
// THE FACTORY FLOOR (Engineers)
// =============================================================================

/** Game steps between looks at the hopper by a machine waiting for stock; every step in a Tune-Up */
export const FLOOR_CHECK_STEPS = 2;

/**
 * The factory floor's machines, one per stove slot. Saved machines keep their recipes, and a
 * machine Batch Canning adds starts with none. A floor set up for the first time gives each
 * machine one of the first unlocked recipes in the player's order, those the hopper covers
 * first, so it runs from the start. Honey jars run only when the player sets them.
 */
export function floorMachines(state: CanningState, sortedRecipes: Recipe[], crops: CanningCrop[], honey: HoneyStock): CanningMachine[] {
  const count = state.maxSimultaneousProcesses;
  if (state.machines) {
    const kept = state.machines.slice(0, count);
    return [...kept, ...Array.from({ length: count - kept.length }, () => ({ recipeId: null, jarsMade: 0 }))];
  }
  const candidates = sortedRecipes.filter(recipe => recipe.unlocked && !isHoneyJar(recipe));
  const ordered = [
    ...candidates.filter(recipe => hasIngredients(recipe, crops, honey)),
    ...candidates.filter(recipe => !hasIngredients(recipe, crops, honey))
  ];
  return Array.from({ length: count }, (_, index) => ({ recipeId: ordered[index]?.id ?? null, jarsMade: 0 }));
}

/** Running batches, each on a machine: one from before the floor goes to a free machine */
export function assignMachines(processes: CanningProcess[], machineCount: number): CanningProcess[] {
  const taken = new Set(processes.map(process => process.machine));
  let next = 0;
  return processes.map(process => {
    if (process.machine !== undefined) return process;
    while (next < machineCount && taken.has(next)) next++;
    if (next >= machineCount) return process;
    taken.add(next);
    return { ...process, machine: next };
  });
}

/** What a recipe lacks in the hopper for one batch: the first crop or honey short, or null */
export function shortOf(recipe: Recipe, crops: CanningCrop[], honey: HoneyStock): string | null {
  for (const ingredient of recipe.ingredients) {
    const crop = crops[ingredient.veggieIndex];
    if (!crop || crop.stash < ingredient.quantity) return ingredient.veggieName;
  }
  if (recipe.honeyRequirement) {
    if (honey.regular < recipe.honeyRequirement.regular) return 'Honey';
    if (honey.golden < recipe.honeyRequirement.golden) return 'Golden Honey';
  }
  return null;
}

/** A machine starting a batch of its recipe */
export interface FloorStart {
  machine: number;
  recipe: Recipe;
}

export interface FloorPlanInput {
  machines: CanningMachine[];
  /** Batches running now; their machines are busy */
  processes: CanningProcess[];
  recipes: Recipe[];
  crops: CanningCrop[];
  honey: HoneyStock;
  /** Machines that were waiting for stock */
  waiting: ReadonlySet<number>;
  /** Whether waiting machines look at the hopper this step */
  checkWaiting: boolean;
  /** Machines that can't start this step, like those whose batch just finished */
  skip?: ReadonlySet<number>;
}

/**
 * Which free machines start a batch this step. A machine with a recipe the hopper covers starts
 * at once; one already waiting for stock looks again only when waiting machines check. Each
 * start's stock comes off a copy as it goes, so two machines never spend the same crops.
 * Returns the starts in machine order, and the machines waiting after this step.
 */
export function planFloorStarts({ machines, processes, recipes, crops, honey, waiting, checkWaiting, skip }: FloorPlanInput): { starts: FloorStart[]; waiting: Set<number> } {
  const busy = new Set(processes.map(process => process.machine));
  const stock = crops.map(crop => ({ ...crop }));
  const pot = { ...honey };
  const starts: FloorStart[] = [];
  const stillWaiting = new Set<number>();
  machines.forEach((machine, index) => {
    if (busy.has(index) || skip?.has(index) || machine.recipeId === null) return;
    if (waiting.has(index) && !checkWaiting) {
      stillWaiting.add(index);
      return;
    }
    const recipe = recipes.find(r => r.id === machine.recipeId && r.unlocked);
    if (!recipe || !hasIngredients(recipe, stock, pot)) {
      stillWaiting.add(index);
      return;
    }
    spendIngredients(recipe, stock, pot);
    starts.push({ machine: index, recipe });
  });
  return { starts, waiting: stillWaiting };
}

/**
 * What a finished batch pays. Family Recipe raises the price, Better Seeds on the
 * ingredients raise it further (1.25x per average level, 1.5x with Heirloom Seeds),
 * and guilds change it: committed Growers earn less, the Preservers more (see
 * getRecipeValueMultiplier). The Pressure Canner and Mass Production make more jars, Heirloom Touch may
 * add one; each jar sells. A Prize Jar from Seal of Quality doubles the money. Knowledge
 * and canning experience come per batch, doubled by Heirloom Touch's bonus jar; batches
 * the Canner started give a tenth of them, or half with Trusted Apprentice.
 */
export function getBatchRewards(
  recipe: Recipe,
  automated: boolean,
  upgrades: CanningUpgrade[],
  crops: CanningCrop[],
  heirloomOwned: boolean,
  guildState: GuildState | undefined,
  random: () => number = Math.random
): OneBatchRewards {
  const efficiency = upgrades.find(u => u.id === 'canning_efficiency')?.effect || 1;
  const bonusChance = upgrades.find(u => u.id === 'preservation_mastery')?.effect || 0;

  let seedsMultiplier = 1;
  if (recipe.ingredients.length > 0) {
    const totalSeedsLevel = recipe.ingredients.reduce((sum, ingredient) =>
      sum + (crops.find(crop => crop.name === ingredient.veggieName)?.betterSeedsLevel || 0), 0);
    seedsMultiplier = Math.pow(heirloomOwned ? 1.5 : 1.25, totalSeedsLevel / recipe.ingredients.length);
  }

  const bonusJar = random() * 100 < bonusChance ? 1 : 0;
  const jars = getJarsPerBatch(guildState) + bonusJar;
  // Rolled only when the chance exists, so batches without it use one random number
  const prizeChance = guildState ? getPrizeJarChance(guildState) : 0;
  const prize = prizeChance > 0 && random() < prizeChance;
  const knowledge = rewardIngredients(recipe) * 2 * (1 + bonusJar);
  const experience = rewardIngredients(recipe) * 10 * (1 + bonusJar);
  const cannerDivisor = getCannerRewardDivisor(guildState);

  return {
    money: recipe.baseSalePrice * efficiency * seedsMultiplier * getRecipeValueMultiplier(guildState, recipe) * jars * (prize ? 2 : 1),
    knowledge: automated ? Math.ceil(knowledge / cannerDivisor) : knowledge,
    experience: automated ? Math.ceil(experience / cannerDivisor) : experience,
    items: jars,
    prize
  };
}

/** One recipe's finished batches in a catch-up, for the event log */
export interface FinishedBatches extends Omit<BatchRewards, 'experience'> {
  recipe: Recipe;
  batches: number;
  automated: boolean;
}

/** What a catch-up changed */
export interface CanningCatchUp {
  /** Batches still running, in their original order, with any the Canner started after them */
  activeProcesses: CanningProcess[];
  /** Stash spent, by crop name */
  cropsUsed: Record<string, number>;
  honeyUsed: HoneyStock;
  /** Totals over every batch that finished */
  rewards: BatchRewards;
  /** Finished batches by recipe */
  finished: FinishedBatches[];
  /** Finished batches by who started them, and Prize Jars, for Wax Seals */
  batchCount: BatchCount;
  /** Jars each factory floor machine made, by machine */
  machineJars: Record<number, number>;
  /** Batches off the factory floor */
  floorBatches: number;
}

export interface CanningCatchUpInput {
  state: CanningState;
  crops: CanningCrop[];
  honey: HoneyStock;
  /** Unlocked recipes in the player's sort order, for the Canner */
  sortedRecipes: Recipe[];
  /** Whether the Canner is owned and switched on */
  cannerOn: boolean;
  /** Whether the Engineers' factory floor runs instead of the Canner */
  floor?: boolean;
  heirloomOwned: boolean;
  guildState?: GuildState;
  random?: () => number;
}

/**
 * Runs canning over missed game steps the way the live game would: every step each
 * batch counts down a second and a finished batch pays out; every tenth step the
 * Canner, when on, starts a batch if a slot is free and the stash covers a recipe. On the
 * Engineers' factory floor each free machine starts its recipe instead, the step after its
 * last batch finished, and machines waiting for stock look every other step.
 * Batches already marked finished are left for the live completion to pay.
 */
export function simulateCanning(steps: number, input: CanningCatchUpInput): CanningCatchUp {
  const { state, sortedRecipes, cannerOn, heirloomOwned, guildState, random = Math.random } = input;
  const machines = input.floor && state.machines ? state.machines : null;
  let waiting: Set<number> = new Set();
  const machineJars: Record<number, number> = {};
  let floorBatches = 0;
  const crops = input.crops.map(crop => ({ ...crop }));
  const honey = { ...input.honey };
  const cropsUsed: Record<string, number> = {};
  const honeyUsed: HoneyStock = { regular: 0, golden: 0 };
  const rewards: BatchRewards = { money: 0, knowledge: 0, experience: 0, items: 0 };
  const finished = new Map<string, FinishedBatches>();
  const batchCount: BatchCount = { manual: 0, automated: 0, prizes: 0 };
  let processes = state.activeProcesses;

  for (let step = 1; step <= steps; step++) {
    const running: CanningProcess[] = [];
    const justFinished = new Set<number>();
    for (const process of processes) {
      if (process.completed) {
        running.push(process);
        continue;
      }
      if (process.remainingTime > 1) {
        running.push({ ...process, remainingTime: process.remainingTime - 1 });
        continue;
      }
      const recipe = state.recipes.find(r => r.id === process.recipeId);
      if (!recipe) continue;
      const automated = process.automated ?? false;
      const batch = getBatchRewards(recipe, automated, state.upgrades, crops, heirloomOwned, guildState, random);
      rewards.money += batch.money;
      rewards.knowledge += batch.knowledge;
      rewards.experience += batch.experience;
      rewards.items += batch.items;
      batchCount[automated ? 'automated' : 'manual'] += 1;
      if (batch.prize && !automated) batchCount.prizes += 1;
      if (process.machine !== undefined) {
        justFinished.add(process.machine);
        machineJars[process.machine] = (machineJars[process.machine] ?? 0) + batch.items;
        floorBatches += 1;
      }
      const key = `${recipe.id}:${automated}`;
      const entry = finished.get(key) ?? { recipe, automated, batches: 0, money: 0, knowledge: 0, items: 0 };
      entry.batches += 1;
      entry.money += batch.money;
      entry.knowledge += batch.knowledge;
      entry.items += batch.items;
      finished.set(key, entry);
    }
    processes = running;

    if (machines) {
      const plan = planFloorStarts({
        machines,
        processes,
        recipes: state.recipes,
        crops,
        honey,
        waiting,
        checkWaiting: step % FLOOR_CHECK_STEPS === 0,
        skip: justFinished
      });
      waiting = plan.waiting;
      for (const { machine, recipe } of plan.starts) {
        for (const ingredient of recipe.ingredients) {
          cropsUsed[ingredient.veggieName] = (cropsUsed[ingredient.veggieName] ?? 0) + ingredient.quantity;
        }
        if (recipe.honeyRequirement) {
          honeyUsed.regular += recipe.honeyRequirement.regular;
          honeyUsed.golden += recipe.honeyRequirement.golden;
        }
        spendIngredients(recipe, crops, honey);
        const time = getBatchTime(recipe, state.upgrades, guildState);
        processes = [...processes, {
          recipeId: recipe.id,
          startTime: Date.now(),
          remainingTime: time,
          totalTime: time,
          completed: false,
          automated: true,
          machine
        }];
      }
      continue;
    }

    if (!cannerOn || step % CANNER_INTERVAL_STEPS !== 0) continue;
    if (processes.length >= state.maxSimultaneousProcesses) continue;
    const recipe = pickRecipeToStart(sortedRecipes, crops, honey);
    if (!recipe) continue;
    for (const ingredient of recipe.ingredients) {
      const crop = crops[ingredient.veggieIndex];
      crop.stash -= ingredient.quantity;
      cropsUsed[crop.name] = (cropsUsed[crop.name] ?? 0) + ingredient.quantity;
    }
    if (recipe.honeyRequirement) {
      honey.regular -= recipe.honeyRequirement.regular;
      honey.golden -= recipe.honeyRequirement.golden;
      honeyUsed.regular += recipe.honeyRequirement.regular;
      honeyUsed.golden += recipe.honeyRequirement.golden;
    }
    const time = getBatchTime(recipe, state.upgrades, guildState);
    processes = [...processes, {
      recipeId: recipe.id,
      startTime: Date.now(),
      remainingTime: time,
      totalTime: time,
      completed: false,
      automated: true
    }];
  }

  return { activeProcesses: processes, cropsUsed, honeyUsed, rewards, finished: [...finished.values()], batchCount, machineJars, floorBatches };
}

/**
 * A small seeded random source, so a state updater that React runs twice makes the
 * same rolls both times
 */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
