/**
 * Tests for the shared canning rules and the catch-up simulation: batch time and pay,
 * the Canner's recipe choice, and running missed game steps.
 */
import { describe, it, expect } from 'vitest';
import {
  getBatchRewards,
  getBatchTime,
  pickRecipeToStart,
  simulateCanning,
  seededRandom,
  type CanningCatchUpInput
} from '../utils/canningSimulation';
import type { CanningProcess, CanningState, CanningUpgrade, Recipe } from '../types/canning';

const recipe = (id: string, overrides: Partial<Recipe> = {}): Recipe => ({
  id,
  name: id,
  description: '',
  ingredients: [{ veggieIndex: 0, veggieName: 'Radish', quantity: 3 }],
  processingTime: 30,
  baseProcessingTime: 30,
  salePrice: 5,
  baseSalePrice: 5,
  experienceRequired: 0,
  unlocked: true,
  timesCompleted: 0,
  ...overrides
});

const upgrade = (id: string, effect: number, level = 1): CanningUpgrade => ({
  id,
  name: id,
  description: '',
  type: 'speed',
  level,
  cost: 0,
  baseCost: 0,
  upgradeCostScaling: 1,
  costCurrency: 'money',
  effect,
  unlocked: true
});

const batch = (remainingTime: number, overrides: Partial<CanningProcess> = {}): CanningProcess => ({
  recipeId: 'radish',
  startTime: 0,
  remainingTime,
  totalTime: 30,
  completed: false,
  ...overrides
});

const radish = recipe('radish');

const state = (overrides: Partial<CanningState> = {}): CanningState => ({
  recipes: [radish],
  unlockedRecipes: ['radish'],
  activeProcesses: [],
  maxSimultaneousProcesses: 1,
  upgrades: [],
  totalItemsCanned: 0,
  canningExperience: 0,
  autoCanning: { enabled: true, selectedRecipes: [], priorityOrder: [] },
  ...overrides
});

const input = (overrides: Partial<CanningCatchUpInput> = {}): CanningCatchUpInput => ({
  state: state(),
  crops: [{ name: 'Radish', stash: 0 }],
  honey: { regular: 0, golden: 0 },
  sortedRecipes: [radish],
  cannerOn: false,
  heirloomOwned: false,
  random: () => 0.99,
  ...overrides
});

describe('getBatchTime', () => {
  it('takes the recipe time, shortened by Quick Hands', () => {
    expect(getBatchTime(radish, [])).toBe(30);
    expect(getBatchTime(radish, [upgrade('canning_speed', 0.85)])).toBe(26);
  });
});

describe('getBatchRewards', () => {
  const crops = [{ name: 'Radish', stash: 0 }];

  it('pays the sale price, two knowledge and ten experience per ingredient', () => {
    expect(getBatchRewards(radish, false, [], crops, false, undefined, () => 0.99))
      .toEqual({ money: 5, knowledge: 2, experience: 10, items: 1, prize: false });
  });

  it('gives a tenth of the knowledge and experience for batches the Canner started', () => {
    const rewards = getBatchRewards(radish, true, [], crops, false, undefined, () => 0.99);
    expect(rewards.knowledge).toBe(1);
    expect(rewards.experience).toBe(1);
  });

  it('doubles everything when Heirloom Touch adds a bonus item', () => {
    const rewards = getBatchRewards(radish, false, [upgrade('preservation_mastery', 50)], crops, false, undefined, () => 0.1);
    expect(rewards).toEqual({ money: 10, knowledge: 4, experience: 20, items: 2, prize: false });
  });

  it('raises the price with Family Recipe and the ingredients\' Better Seeds', () => {
    const seeded = [{ name: 'Radish', stash: 0, betterSeedsLevel: 2 }];
    expect(getBatchRewards(radish, false, [upgrade('canning_efficiency', 1.2)], seeded, false, undefined, () => 0.99).money)
      .toBeCloseTo(5 * 1.2 * 1.25 ** 2);
  });
});

describe('pickRecipeToStart', () => {
  const crops = [{ name: 'Radish', stash: 9 }];

  it('takes the first recipe in order the stash covers', () => {
    const big = recipe('big', { ingredients: [{ veggieIndex: 0, veggieName: 'Radish', quantity: 20 }] });
    expect(pickRecipeToStart([big, radish], crops, { regular: 0, golden: 0 })).toBe(radish);
  });

  it('passes over a honey recipe when the honey runs short, instead of stalling', () => {
    const honeyed = recipe('honeyed', { honeyRequirement: { regular: 5, golden: 0 } });
    expect(pickRecipeToStart([honeyed, radish], crops, { regular: 2, golden: 0 })).toBe(radish);
    expect(pickRecipeToStart([honeyed, radish], crops, { regular: 5, golden: 0 })).toBe(honeyed);
  });

  it('skips locked recipes', () => {
    expect(pickRecipeToStart([recipe('locked', { unlocked: false })], crops, { regular: 0, golden: 0 })).toBeUndefined();
  });
});

describe('simulateCanning', () => {
  it('counts a running batch down and pays it once', () => {
    const result = simulateCanning(10, input({ state: state({ activeProcesses: [batch(5)] }) }));

    expect(result.activeProcesses).toEqual([]);
    expect(result.rewards).toEqual({ money: 5, knowledge: 2, experience: 10, items: 1 });
    expect(result.finished).toEqual([expect.objectContaining({ recipe: radish, batches: 1, automated: false })]);
  });

  it('leaves time on a batch that has not finished', () => {
    const result = simulateCanning(10, input({ state: state({ activeProcesses: [batch(25)] }) }));

    expect(result.activeProcesses).toEqual([expect.objectContaining({ remainingTime: 15 })]);
    expect(result.rewards.items).toBe(0);
  });

  it('lets the Canner start a batch every tenth step while the stash covers one', () => {
    const result = simulateCanning(100, input({ cannerOn: true, crops: [{ name: 'Radish', stash: 7 }] }));

    // Starts at steps 10 and 40, finishes at 40 and 70; one radish left is not enough for a third
    expect(result.cropsUsed).toEqual({ Radish: 6 });
    expect(result.rewards.items).toBe(2);
    expect(result.finished).toEqual([expect.objectContaining({ batches: 2, automated: true })]);
    expect(result.activeProcesses).toEqual([]);
  });

  it('spends honey on honey recipes', () => {
    const honeyed = recipe('honeyed', { honeyRequirement: { regular: 2, golden: 1 } });
    const result = simulateCanning(10, input({
      state: state({ recipes: [honeyed] }),
      sortedRecipes: [honeyed],
      cannerOn: true,
      crops: [{ name: 'Radish', stash: 3 }],
      honey: { regular: 5, golden: 1 }
    }));

    expect(result.honeyUsed).toEqual({ regular: 2, golden: 1 });
    expect(result.activeProcesses).toEqual([expect.objectContaining({ recipeId: 'honeyed', automated: true })]);
  });

  it('leaves a finished batch that is waiting to be paid for the live game', () => {
    const waiting = batch(0, { completed: true });
    const result = simulateCanning(20, input({ state: state({ activeProcesses: [waiting] }), cannerOn: true, crops: [{ name: 'Radish', stash: 9 }] }));

    expect(result.activeProcesses).toEqual([waiting]);
    expect(result.rewards.items).toBe(0);
    expect(result.cropsUsed).toEqual({});
  });
});

describe('seededRandom', () => {
  it('repeats the same rolls for the same seed', () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    const rolls = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(rolls);
    rolls.forEach(roll => {
      expect(roll).toBeGreaterThanOrEqual(0);
      expect(roll).toBeLessThan(1);
    });
  });
});
