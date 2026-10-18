/**
 * Tests for Guild Tokens earned before committing to a guild: the shared award
 * and its rates, and the canning and hive hooks that report into it.
 */
import { describe, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { awardGuildTokens } from '../utils/guildCalculations';
import { GUILDS_UNLOCK_TIER } from '../data/guildData';
import { DEFAULT_GUILD_STATE, type GuildState } from '../types/guilds';
import { BeeProvider, useBees } from '../context/BeeContext';
import { useCanningSystem } from '../hooks/useCanningSystem';
import type { BeeBox } from '../types/bees';
import type { CanningState } from '../types/canning';

const TIER = GUILDS_UNLOCK_TIER;

describe('awardGuildTokens', () => {
  it('pays 1 per manual harvest and 2 per bee hive', () => {
    expect(awardGuildTokens(DEFAULT_GUILD_STATE, 'manualHarvest', 1, TIER).guildTokens).toBe(1);
    expect(awardGuildTokens(DEFAULT_GUILD_STATE, 'beeHives', 3, TIER).guildTokens).toBe(6);
  });

  it('pays 1 per 5 canned goods and keeps the remainder', () => {
    let state = awardGuildTokens(DEFAULT_GUILD_STATE, 'cannedGoods', 4, TIER);
    expect(state.guildTokens).toBe(0);

    state = awardGuildTokens(state, 'cannedGoods', 2, TIER);
    expect(state.guildTokens).toBe(1);
    expect(state.tokenProgress?.cannedGoods).toBe(1);
  });

  it('pays 1 per 10 auto harvests, many at once included', () => {
    const state = awardGuildTokens(DEFAULT_GUILD_STATE, 'autoHarvests', 25, TIER);

    expect(state.guildTokens).toBe(2);
    expect(state.tokenProgress?.autoHarvests).toBe(5);
  });

  it('counts each source on its own', () => {
    let state = awardGuildTokens(DEFAULT_GUILD_STATE, 'cannedGoods', 3, TIER);
    state = awardGuildTokens(state, 'autoHarvests', 3, TIER);

    expect(state.guildTokens).toBe(0);
    expect(state.tokenProgress).toEqual({ cannedGoods: 3, autoHarvests: 3 });
  });

  it('starts from zero on saves made before the progress was kept', () => {
    const oldSave: GuildState = { ...DEFAULT_GUILD_STATE, guildTokens: 7 };

    expect(awardGuildTokens(oldSave, 'autoHarvests', 10, TIER).guildTokens).toBe(8);
  });

  it('pays nothing before guilds unlock or after committing', () => {
    expect(awardGuildTokens(DEFAULT_GUILD_STATE, 'beeHives', 1, TIER - 1)).toBe(DEFAULT_GUILD_STATE);

    const committed: GuildState = { ...DEFAULT_GUILD_STATE, committedGuild: 'growers', status: 'committed' };
    expect(awardGuildTokens(committed, 'cannedGoods', 50, TIER)).toBe(committed);
  });
});

describe('token sources', () => {
  const box = (i: number, harvestReady: boolean): BeeBox => ({
    id: `box_${i}`,
    active: true,
    productionTimer: 0,
    productionTime: 182,
    honeyProduced: 0,
    lastHarvestTime: 0,
    harvestReady
  });

  it('the hives report each harvested box', () => {
    const onHivesHarvested = vi.fn();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <BeeProvider
        farmTier={TIER}
        season="Spring"
        onHivesHarvested={onHivesHarvested}
        initialState={{ unlocked: true, firstTimeSetup: true, boxes: [box(0, true), box(1, true), box(2, false)] }}
      >
        {children}
      </BeeProvider>
    );
    const { result } = renderHook(() => useBees(), { wrapper });

    act(() => {
      result.current.harvestAllHoney();
    });

    expect(onHivesHarvested).toHaveBeenCalledTimes(2);
    expect(onHivesHarvested).toHaveBeenCalledWith(1);
  });

  it('canning reports the goods each finished batch makes', () => {
    const onGoodsCanned = vi.fn();
    const veggies = [{ name: 'Radish', stash: 0, salePrice: 1 }];
    const setVeggies = vi.fn();
    const setMoney = vi.fn();
    const setKnowledge = vi.fn();
    const initial: CanningState = {
      recipes: [],
      unlockedRecipes: [],
      activeProcesses: [{ recipeId: 'canned_radish', startTime: 0, remainingTime: 0, totalTime: 10, completed: false }],
      maxSimultaneousProcesses: 1,
      upgrades: [],
      totalItemsCanned: 0,
      canningExperience: 0,
      autoCanning: { enabled: false, selectedRecipes: [], priorityOrder: [] }
    };
    const { result } = renderHook(() => useCanningSystem(
      veggies, setVeggies, false, 0, setMoney, 0, setKnowledge, initial, 'profit', 3,
      undefined, undefined, undefined, undefined, undefined, undefined, undefined, false, onGoodsCanned
    ));

    act(() => {
      result.current.completeCanning(0);
    });

    expect(onGoodsCanned).toHaveBeenCalledWith(1);
  });
});
