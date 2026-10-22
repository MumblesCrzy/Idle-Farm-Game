/**
 * Tests for Honey Jars, the Bees tab upgrade that opens two Kitchen recipes made of honey
 * alone, and for honey spent in the Kitchen coming off the bees' own totals.
 */
import { describe, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { createRef, type ReactNode } from 'react';
import { GameClockProvider } from '../hooks/useGameClock';
import { useCanningSystem } from '../hooks/useCanningSystem';
import { BeeProvider, useBees, type HoneySetters } from '../context/BeeContext';
import { INITIAL_BEE_UPGRADES } from '../data/beeUpgrades';
import { INITIAL_RECIPES } from '../data/recipes';
import { BEE_UPGRADE_GROUPS } from '../utils/beeView';
import { getBatchRewards, pickRecipeToStart } from '../utils/canningSimulation';

// Made once: a new list each render would rebuild the recipes forever
const crops = [{ name: 'Radish', stash: 50, salePrice: 1 }];
const noAchievements: string[] = [];
const wrapper = ({ children }: { children: ReactNode }) => <GameClockProvider>{children}</GameClockProvider>;

/** The Kitchen with 100 honey and 20 Golden Honey, and these bee upgrades owned */
function kitchen(ownedBeeUpgrades: string[], setRegularHoney = vi.fn(), setGoldenHoney = vi.fn()) {
  const setVeggies = vi.fn();
  const setMoney = vi.fn();
  const setKnowledge = vi.fn();
  return renderHook(() => useCanningSystem(
    crops, setVeggies, false, 1e12, setMoney, 1e12, setKnowledge, undefined, 'profit', 5,
    100, 20, 1000, setRegularHoney, setGoldenHoney, noAchievements, undefined, false, undefined, undefined, ownedBeeUpgrades
  ), { wrapper });
}

describe('Honey Jars', () => {
  it('is a 1,000-honey upgrade in the Bees tab\'s Kitchen group', () => {
    const jars = INITIAL_BEE_UPGRADES.find(upgrade => upgrade.id === 'honey_jars')!;
    expect(jars).toMatchObject({ name: 'Honey Jars', cost: 1000, costCurrency: 'regularHoney', repeatable: false });
    expect(BEE_UPGRADE_GROUPS.find(group => group.id === 'kitchen')?.ids).toEqual(['honey_jars']);
  });

  it('opens two recipes made of honey alone: a Jar of Honey and a Jar of Golden Honey', () => {
    const jarRecipes = INITIAL_RECIPES.filter(recipe => recipe.requiredBeeUpgrade === 'honey_jars');
    expect(jarRecipes.map(recipe => [recipe.name, recipe.ingredients.length, recipe.honeyRequirement])).toEqual([
      ['Jar of Honey', 0, { regular: 10, golden: 0 }],
      ['Jar of Golden Honey', 0, { regular: 0, golden: 5 }]
    ]);

    const without = kitchen([]);
    expect(without.result.current.canningState.recipes.some(recipe => recipe.requiredBeeUpgrade)).toBe(false);

    const withJars = kitchen(['honey_jars']);
    const shown = withJars.result.current.canningState.recipes.filter(recipe => recipe.requiredBeeUpgrade === 'honey_jars');
    expect(shown.map(recipe => [recipe.id, recipe.unlocked])).toEqual([['jar_of_honey', true], ['jar_of_golden_honey', true]]);
  });

  it('takes its honey when a jar goes on the stove', () => {
    const setRegularHoney = vi.fn();
    const setGoldenHoney = vi.fn();
    const { result } = kitchen(['honey_jars'], setRegularHoney, setGoldenHoney);

    let started = false;
    act(() => {
      started = result.current.startCanning('jar_of_honey');
    });

    expect(started).toBe(true);
    expect(setRegularHoney).toHaveBeenCalledTimes(1);
    expect(setRegularHoney.mock.calls[0][0](100)).toBe(90);
    expect(setGoldenHoney).not.toHaveBeenCalled();
  });

  it('takes Golden Honey for the golden jar', () => {
    const setGoldenHoney = vi.fn();
    const { result } = kitchen(['honey_jars'], vi.fn(), setGoldenHoney);

    act(() => {
      result.current.startCanning('jar_of_golden_honey');
    });
    expect(setGoldenHoney.mock.calls[0][0](20)).toBe(15);
  });

  it('pays its price, and teaches like a one-crop recipe', () => {
    const { result } = kitchen(['honey_jars']);
    const jar = result.current.canningState.recipes.find(recipe => recipe.id === 'jar_of_honey')!;

    expect(getBatchRewards(jar, false, [], crops, false, undefined, () => 0.99)).toEqual({
      money: 250, knowledge: 2, experience: 10, items: 1, prize: false
    });
  });

  it('is left to the player: the Canner never spends honey on jars', () => {
    const { result } = kitchen(['honey_jars']);
    const recipes = result.current.canningState.recipes;
    const jar = recipes.find(recipe => recipe.id === 'jar_of_honey')!;
    const radish = recipes.find(recipe => recipe.id === 'canned_radish')!;

    expect(pickRecipeToStart([jar, radish], crops, { regular: 100, golden: 20 })).toBe(radish);
    expect(pickRecipeToStart([jar], crops, { regular: 100, golden: 20 })).toBeUndefined();
  });
});

describe('honey spent outside the Bees tab', () => {
  it('comes off the bees\' own totals, and stays off', () => {
    const settersRef = createRef<HoneySetters>();
    const reported: number[] = [];
    const bees = ({ children }: { children: ReactNode }) => (
      <BeeProvider
        farmTier={5}
        initialState={{ unlocked: true, firstTimeSetup: true, boxes: [], regularHoney: 100, goldenHoney: 20 }}
        honeySettersRef={settersRef}
        onStateChange={state => reported.push(state.goldenHoney)}
      >
        {children}
      </BeeProvider>
    );
    const { result } = renderHook(() => useBees(), { wrapper: bees });

    act(() => {
      settersRef.current!.setGoldenHoney(prev => prev - 5);
      settersRef.current!.setRegularHoney(prev => prev - 10);
    });

    expect(result.current.goldenHoney).toBe(15);
    expect(result.current.regularHoney).toBe(90);
    // What the bees report to the game, and what it saves, is the spent amount
    expect(reported.at(-1)).toBe(15);
  });
});
