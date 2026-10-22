/**
 * Tests for the Preservers Guild: its rules on canning value, time and jars, the raw crop
 * penalty, Wax Seals, Rush Batch, and the Cellar recipes.
 */
import { describe, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { GameClockProvider } from '../hooks/useGameClock';
import { useCanningSystem } from '../hooks/useCanningSystem';
import { DEFAULT_GUILD_STATE, type GuildState } from '../types/guilds';
import type { CanningProcess, CanningState, Recipe } from '../types/canning';
import {
  applyGuildPriceBonuses,
  awardWaxSeals,
  commitToGuild,
  getGuildUpgradeCost,
  getPreserversTimeMultiplier,
  getPreserversValueBonus,
  getPressureCannerJars,
  getRecipeMasteryBonus,
  getRecipeValueMultiplier,
  getRushBatchCost
} from '../utils/guildCalculations';
import { getBatchRewards, getBatchTime, simulateCanning } from '../utils/canningSimulation';
import { CELLAR_RECIPES_UPGRADE, filterRecipesByCategory, getEffectiveSalePrice } from '../utils/recipeHelpers';
import { INITIAL_RECIPES } from '../data/recipes';
import { VEGGIE_CONFIGS } from '../data/veggieConfigs';
import { PRESERVERS_UPGRADES } from '../data/guildData';

/** A guild state with these upgrade levels bought */
const withUpgrades = (base: GuildState, levels: Record<string, number>): GuildState => ({
  ...base,
  purchasedUpgrades: [...base.purchasedUpgrades, ...Object.keys(levels)],
  upgradeLevels: { ...base.upgradeLevels, ...levels }
});

const preserver: GuildState = { ...DEFAULT_GUILD_STATE, committedGuild: 'preservers', status: 'committed', commitmentDay: 1 };
const grower: GuildState = { ...DEFAULT_GUILD_STATE, committedGuild: 'growers', status: 'committed', commitmentDay: 1 };

const recipe = (overrides: Partial<Recipe> = {}): Recipe => ({
  id: 'canned_radish',
  name: 'Canned Radish',
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
const honeyRecipe = recipe({ id: 'honey_radish_medley', honeyRequirement: { regular: 0, golden: 0.03125 } });
const threeCrops = recipe({
  id: 'garden_mix',
  ingredients: ['Radish', 'Lettuce', 'Green Beans'].map((veggieName, veggieIndex) => ({ veggieIndex, veggieName, quantity: 2 }))
});
const crops = [{ name: 'Radish', stash: 0 }];
/** Random rolls in order; repeats the last one */
const rolls = (...values: number[]) => {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
};

describe('Preservers rules', () => {
  it('run the sampling upgrades at half strength before committing', () => {
    const sampled = withUpgrades(DEFAULT_GUILD_STATE, { preservers_shelf_life: 2, preservers_efficient_canning: 2 });

    expect(getPreserversValueBonus(sampled)).toBeCloseTo(0.02);
    expect(getPreserversTimeMultiplier(sampled)).toBeCloseTo(0.97);
  });

  it('give members Master Preserver, full-strength sampling upgrades and the guild upgrades', () => {
    const member = withUpgrades(preserver, {
      preservers_shelf_life: 2,
      preservers_cellar_aging: 3,
      preservers_efficient_canning: 2,
      preservers_copper_kettles: 5
    });

    expect(getPreserversValueBonus(preserver)).toBeCloseTo(0.2);
    expect(getPreserversValueBonus(member)).toBeCloseTo(0.04 + 0.09 + 0.2);
    expect(getPreserversTimeMultiplier(member)).toBeCloseTo(0.94 * 0.9);
  });

  it('add a jar per Pressure Canner level', () => {
    expect(getPressureCannerJars(preserver)).toBe(1);
    expect(getPressureCannerJars(withUpgrades(preserver, { preservers_pressure_canner: 3 }))).toBe(4);
  });

  it('pay Recipe Mastery only with the Family Cookbook, at 25, 100 and 500 batches', () => {
    const cookbook = withUpgrades(preserver, { preservers_family_cookbook: 1 });

    expect(getRecipeMasteryBonus(preserver, 600)).toBe(0);
    expect([24, 25, 99, 100, 499, 500].map(batches => getRecipeMasteryBonus(cookbook, batches)))
      .toEqual([0, 0.1, 0.1, 0.25, 0.25, 0.5]);
  });

  it('raise honey recipes with Honey Glaze and leave others alone', () => {
    const glazed = withUpgrades(preserver, { preservers_honey_glaze: 2 });

    expect(getRecipeValueMultiplier(glazed, honeyRecipe)).toBeCloseTo(1.3);
    expect(getRecipeValueMultiplier(glazed, recipe())).toBeCloseTo(1.2);
  });

  it('leave the Growers earning less from canning', () => {
    expect(getRecipeValueMultiplier(grower, recipe())).toBeCloseTo(0.85);
    expect(getRecipeValueMultiplier(undefined, recipe())).toBe(1);
  });

  it('sell raw crops for 10% less', () => {
    expect(applyGuildPriceBonuses(10, preserver)).toBeCloseTo(9);
    expect(applyGuildPriceBonuses(10, DEFAULT_GUILD_STATE)).toBe(10);
  });
});

describe('Preservers batches', () => {
  it('make more jars with the Pressure Canner, each one sold, with knowledge per batch', () => {
    const rewards = getBatchRewards(recipe(), false, [], crops, false, withUpgrades(preserver, { preservers_pressure_canner: 2 }), () => 0.99);

    expect(rewards).toEqual({ money: 5 * 1.2 * 3, knowledge: 2, experience: 10, items: 3, prize: false });
  });

  it('double the money for a Prize Jar', () => {
    const sealed = withUpgrades(preserver, { preservers_seal_of_quality: 5 });

    expect(getBatchRewards(recipe(), false, [], crops, false, sealed, rolls(0.99, 0.1)))
      .toMatchObject({ money: 5 * 1.2 * 2, prize: true });
    expect(getBatchRewards(recipe(), false, [], crops, false, sealed, rolls(0.99, 0.3)))
      .toMatchObject({ money: 5 * 1.2, prize: false });
  });

  it('roll for a Prize Jar only with Seal of Quality', () => {
    const random = vi.fn(() => 0.99);
    getBatchRewards(recipe(), false, [], crops, false, preserver, random);

    expect(random).toHaveBeenCalledTimes(1);
  });

  it('give Canner batches half the knowledge with Trusted Apprentice, instead of a tenth', () => {
    const apprentice = withUpgrades(preserver, { preservers_trusted_apprentice: 1 });

    expect(getBatchRewards(threeCrops, true, [], crops, false, preserver, () => 0.99))
      .toMatchObject({ knowledge: 1, experience: 3 });
    expect(getBatchRewards(threeCrops, true, [], crops, false, apprentice, () => 0.99))
      .toMatchObject({ knowledge: 3, experience: 15 });
  });

  it('take less time with Copper Kettles', () => {
    expect(getBatchTime(recipe(), [], withUpgrades(preserver, { preservers_copper_kettles: 5 }))).toBe(27);
    expect(getBatchTime(recipe(), [], preserver)).toBe(30);
  });

  it('are counted by who started them in a catch-up', () => {
    const running = (automated: boolean): CanningProcess => ({
      recipeId: 'canned_radish', startTime: 0, remainingTime: 1, totalTime: 30, completed: false, automated
    });
    const state: CanningState = {
      recipes: [recipe()],
      unlockedRecipes: ['canned_radish'],
      activeProcesses: [running(false), running(true), running(true)],
      maxSimultaneousProcesses: 3,
      upgrades: [],
      totalItemsCanned: 0,
      canningExperience: 0,
      autoCanning: { enabled: false, selectedRecipes: [], priorityOrder: [] }
    };
    const result = simulateCanning(1, {
      state, crops, honey: { regular: 0, golden: 0 }, sortedRecipes: [], cannerOn: false, heirloomOwned: false, guildState: preserver, random: () => 0.99
    });

    expect(result.batchCount).toEqual({ manual: 1, automated: 2, prizes: 0 });

    // Prize Jars count toward Wax Seals only on batches the player started
    const sealed = withUpgrades(preserver, { preservers_seal_of_quality: 5 });
    const prized = simulateCanning(1, {
      state, crops, honey: { regular: 0, golden: 0 }, sortedRecipes: [], cannerOn: false, heirloomOwned: false, guildState: sealed, random: () => 0.1
    });
    expect(prized.batchCount).toEqual({ manual: 1, automated: 2, prizes: 1 });
  });

  it('are worth their guild value and jars in the recipe list', () => {
    const context = {
      veggies: [{ name: 'Radish', salePrice: 1 }],
      heirloomOwned: false,
      guildState: withUpgrades(preserver, { preservers_pressure_canner: 1 })
    };

    expect(getEffectiveSalePrice(recipe(), context)).toBeCloseTo(5 * 1.2 * 2);
  });
});

describe('Wax Seals', () => {
  it('pay 1 per batch the player starts and 1 per Prize Jar', () => {
    expect(awardWaxSeals(preserver, { manual: 2, automated: 0, prizes: 1 }).guildCurrencies.preservers).toBe(3);
  });

  it('pay nothing for batches the Canner starts', () => {
    expect(awardWaxSeals(preserver, { manual: 0, automated: 25, prizes: 0 })).toBe(preserver);
    expect(awardWaxSeals(preserver, { manual: 1, automated: 25, prizes: 0 }).guildCurrencies.preservers).toBe(1);
  });

  it('start at zero: Guild Tokens don\'t carry over when joining', () => {
    const sampling: GuildState = {
      ...DEFAULT_GUILD_STATE,
      status: 'sampling',
      guildTokens: 504,
      tokenProgress: { cannedGoods: 3 }
    };
    const joined = commitToGuild(sampling, 'preservers', 42);

    expect(joined).toMatchObject({ committedGuild: 'preservers', status: 'committed', commitmentDay: 42, guildTokens: 0 });
    expect(joined.guildCurrencies.preservers).toBe(0);
    expect(joined.tokenProgress).toBeUndefined();
  });

  it('pay nobody but committed Preservers', () => {
    const batches = { manual: 3, automated: 8, prizes: 1 };

    expect(awardWaxSeals(grower, batches)).toBe(grower);
    expect(awardWaxSeals(DEFAULT_GUILD_STATE, batches)).toBe(DEFAULT_GUILD_STATE);
  });

  it('price Rush Batch at 1 per running batch, never under 5', () => {
    expect(getRushBatchCost(2)).toBe(5);
    expect(getRushBatchCost(8)).toBe(8);
  });
});

describe('guild upgrade costs', () => {
  it('are whole numbers at every level', () => {
    const aging = PRESERVERS_UPGRADES.find(upgrade => upgrade.id === 'preservers_cellar_aging')!;
    // 75 x 1.8^3 is 437.4
    expect(getGuildUpgradeCost(aging, 3)).toBe(437);
    for (const upgrade of PRESERVERS_UPGRADES) {
      for (let level = 0; level < upgrade.maxLevel; level++) {
        expect(Number.isInteger(getGuildUpgradeCost(upgrade, level))).toBe(true);
      }
    }
  });
});

describe('Cellar recipes', () => {
  const cellarRecipes = INITIAL_RECIPES.filter(config => config.requiredGuildUpgrade === CELLAR_RECIPES_UPGRADE);
  const vegetablePrices = new Map(VEGGIE_CONFIGS.map(veggie => [veggie.name, veggie.salePrice]));

  it('are ten, made from vegetables, each worth more than its ingredients sold raw', () => {
    expect(cellarRecipes).toHaveLength(10);
    for (const config of cellarRecipes) {
      const raw = config.ingredients.reduce((sum, ingredient) => {
        expect(vegetablePrices.has(ingredient.veggieName)).toBe(true);
        return sum + (vegetablePrices.get(ingredient.veggieName) ?? 0) * ingredient.quantity;
      }, 0);
      expect(config.baseSalePrice).toBeGreaterThan(raw * 2);
    }
  });

  it('appear once Cellar Recipes is bought, then unlock with canning experience', () => {
    const wrapper = ({ children }: { children: ReactNode }) => <GameClockProvider>{children}</GameClockProvider>;
    const veggies = [{ name: 'Radish', stash: 10, salePrice: 1 }];
    const { result, rerender } = renderHook(({ guildState }) => useCanningSystem(
      veggies, vi.fn(), false, 0, vi.fn(), 0, vi.fn(), undefined, 'profit', 3,
      undefined, undefined, undefined, undefined, undefined, undefined, guildState
    ), { initialProps: { guildState: preserver }, wrapper });
    const cellar = () => result.current.canningState.recipes.filter(r => r.requiredGuildUpgrade === CELLAR_RECIPES_UPGRADE);

    expect(cellar()).toHaveLength(0);
    rerender({ guildState: withUpgrades(preserver, { [CELLAR_RECIPES_UPGRADE]: 1 }) });
    expect(cellar()).toHaveLength(10);
    expect(cellar().every(r => !r.unlocked)).toBe(true);
  });

  it('have their own filter', () => {
    const recipes = INITIAL_RECIPES.map(config => recipe({ id: config.id, requiredGuildUpgrade: config.requiredGuildUpgrade }));
    const filtered = filterRecipesByCategory(recipes, 'cellar', () => true);

    expect(filtered.map(r => r.id)).toEqual(cellarRecipes.map(config => config.id));
  });
});

describe('canning hook', () => {
  const wrapper = ({ children }: { children: ReactNode }) => <GameClockProvider>{children}</GameClockProvider>;
  const veggies = [{ name: 'Radish', stash: 0, salePrice: 1 }];
  const kitchen = (activeProcesses: CanningProcess[]): CanningState => ({
    recipes: [],
    unlockedRecipes: [],
    activeProcesses,
    maxSimultaneousProcesses: 3,
    upgrades: [],
    totalItemsCanned: 0,
    canningExperience: 0,
    autoCanning: { enabled: false, selectedRecipes: [], priorityOrder: [] }
  });
  const batch = (remainingTime: number, automated = false): CanningProcess => ({
    recipeId: 'canned_radish', startTime: 0, remainingTime, totalTime: 120, completed: false, automated
  });

  it('reports each finished batch for Wax Seals, with who started it', () => {
    const onBatchesFinished = vi.fn();
    const { result } = renderHook(() => useCanningSystem(
      veggies, vi.fn(), false, 0, vi.fn(), 0, vi.fn(), kitchen([batch(0), batch(0, true)]), 'profit', 3,
      undefined, undefined, undefined, undefined, undefined, undefined, preserver, false, undefined, onBatchesFinished
    ), { wrapper });

    act(() => {
      result.current.completeCanning(1);
    });
    expect(onBatchesFinished).toHaveBeenLastCalledWith({ manual: 0, automated: 1, prizes: 0 });

    act(() => {
      result.current.completeCanning(0);
    });
    expect(onBatchesFinished).toHaveBeenLastCalledWith({ manual: 1, automated: 0, prizes: 0 });
  });

  it('finishes every running batch on Rush Batch', () => {
    const { result } = renderHook(() => useCanningSystem(
      veggies, vi.fn(), false, 0, vi.fn(), 0, vi.fn(), kitchen([batch(50), batch(80, true)]), 'profit', 3
    ), { wrapper });

    act(() => {
      result.current.rushBatches();
    });

    expect(result.current.canningState.activeProcesses.map(p => [p.remainingTime, p.completed]))
      .toEqual([[0, true], [0, true]]);
  });
});
