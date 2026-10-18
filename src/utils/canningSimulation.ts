/**
 * Canning rules shared by the live game and the hidden-tab catch-up: what a finished
 * batch pays, how long a batch takes, which recipe the Canner starts, and a step-by-step
 * run of game steps the player missed.
 */
import type { CanningProcess, CanningState, CanningUpgrade, Recipe } from '../types/canning';
import type { GuildState } from '../types/guilds';
import { getGrowerCanningProfitMultiplier } from './guildCalculations';

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
  items: number;
}

/** Game steps between the Canner's attempts to start a batch */
export const CANNER_INTERVAL_STEPS = 10;

/** Seconds a batch takes, with Quick Hands */
export function getBatchTime(recipe: Recipe, upgrades: CanningUpgrade[]): number {
  const speed = upgrades.find(u => u.id === 'canning_speed')?.effect || 1;
  return Math.ceil(recipe.baseProcessingTime * speed);
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

/** The recipe the Canner starts: the first unlocked one, in the player's order, the stash covers */
export function pickRecipeToStart(sortedRecipes: Recipe[], crops: CanningCrop[], honey: HoneyStock): Recipe | undefined {
  return sortedRecipes.find(recipe => recipe.unlocked && hasIngredients(recipe, crops, honey));
}

/**
 * What a finished batch pays. Family Recipe raises the price, Better Seeds on the
 * ingredients raise it further (1.25x per average level, 1.5x with Heirloom Seeds),
 * Heirloom Touch may add a bonus item, and committed Growers earn less. Batches the
 * Canner started give a tenth of the knowledge and canning experience.
 */
export function getBatchRewards(
  recipe: Recipe,
  automated: boolean,
  upgrades: CanningUpgrade[],
  crops: CanningCrop[],
  heirloomOwned: boolean,
  guildState: GuildState | undefined,
  random: () => number = Math.random
): BatchRewards {
  const efficiency = upgrades.find(u => u.id === 'canning_efficiency')?.effect || 1;
  const bonusChance = upgrades.find(u => u.id === 'preservation_mastery')?.effect || 0;

  let seedsMultiplier = 1;
  if (recipe.ingredients.length > 0) {
    const totalSeedsLevel = recipe.ingredients.reduce((sum, ingredient) =>
      sum + (crops.find(crop => crop.name === ingredient.veggieName)?.betterSeedsLevel || 0), 0);
    seedsMultiplier = Math.pow(heirloomOwned ? 1.5 : 1.25, totalSeedsLevel / recipe.ingredients.length);
  }

  const items = 1 + (random() * 100 < bonusChance ? 1 : 0);
  const guildMultiplier = guildState ? getGrowerCanningProfitMultiplier(guildState) : 1;
  const knowledge = recipe.ingredients.length * 2 * items;
  const experience = recipe.ingredients.length * 10 * items;

  return {
    money: recipe.baseSalePrice * efficiency * seedsMultiplier * items * guildMultiplier,
    knowledge: automated ? Math.ceil(knowledge / 10) : knowledge,
    experience: automated ? Math.ceil(experience / 10) : experience,
    items
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
    const time = getBatchTime(recipe, state.upgrades);
    processes = [...processes, {
      recipeId: recipe.id,
      startTime: Date.now(),
      remainingTime: time,
      totalTime: time,
      completed: false,
      automated: true
    }];
  }

  return { activeProcesses: processes, cropsUsed, honeyUsed, rewards, finished: [...finished.values()] };
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
