/**
 * Canning rules shared by the live game and the hidden-tab catch-up: what a finished
 * batch pays, how long a batch takes, which recipe the Canner starts, and a step-by-step
 * run of game steps the player missed.
 */
import type { CanningProcess, CanningState, CanningUpgrade, Recipe } from '../types/canning';
import type { GuildState } from '../types/guilds';
import {
  getCannerRewardDivisor,
  getPreserversTimeMultiplier,
  getPressureCannerJars,
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

/** Seconds a batch takes, with Quick Hands and the Preservers' time upgrades */
export function getBatchTime(recipe: Recipe, upgrades: CanningUpgrade[], guildState?: GuildState): number {
  const speed = upgrades.find(u => u.id === 'canning_speed')?.effect || 1;
  const guild = guildState ? getPreserversTimeMultiplier(guildState) : 1;
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

/**
 * What a finished batch pays. Family Recipe raises the price, Better Seeds on the
 * ingredients raise it further (1.25x per average level, 1.5x with Heirloom Seeds),
 * and guilds change it: committed Growers earn less, the Preservers more (see
 * getRecipeValueMultiplier). The Pressure Canner makes more jars and Heirloom Touch may
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
  const jars = (guildState ? getPressureCannerJars(guildState) : 1) + bonusJar;
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
}

export interface CanningCatchUpInput {
  state: CanningState;
  crops: CanningCrop[];
  honey: HoneyStock;
  /** Unlocked recipes in the player's sort order, for the Canner */
  sortedRecipes: Recipe[];
  /** Whether the Canner is owned and switched on */
  cannerOn: boolean;
  heirloomOwned: boolean;
  guildState?: GuildState;
  random?: () => number;
}

/**
 * Runs canning over missed game steps the way the live game would: every step each
 * batch counts down a second and a finished batch pays out; every tenth step the
 * Canner, when on, starts a batch if a slot is free and the stash covers a recipe.
 * Batches already marked finished are left for the live completion to pay.
 */
export function simulateCanning(steps: number, input: CanningCatchUpInput): CanningCatchUp {
  const { state, sortedRecipes, cannerOn, heirloomOwned, guildState, random = Math.random } = input;
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
      const key = `${recipe.id}:${automated}`;
      const entry = finished.get(key) ?? { recipe, automated, batches: 0, money: 0, knowledge: 0, items: 0 };
      entry.batches += 1;
      entry.money += batch.money;
      entry.knowledge += batch.knowledge;
      entry.items += batch.items;
      finished.set(key, entry);
    }
    processes = running;

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

  return { activeProcesses: processes, cropsUsed, honeyUsed, rewards, finished: [...finished.values()], batchCount };
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
