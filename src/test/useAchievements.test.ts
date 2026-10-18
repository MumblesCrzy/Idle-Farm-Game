import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAchievements } from '../hooks/useAchievements';
import { INITIAL_ACHIEVEMENTS } from '../data/achievements';
import { ARCHIE_LOOKS } from '../data/archieLooks';
import type { AchievementGameState, AchievementState } from '../types/achievements';

const gameState = (overrides: Partial<AchievementGameState> = {}): AchievementGameState => ({
  money: 0,
  experience: 0,
  knowledge: 0,
  veggiesUnlocked: 1,
  canningItemsTotal: 0,
  farmTier: 1,
  totalHarvests: 0,
  ...overrides
});

const freshState = (): AchievementState => ({
  achievements: INITIAL_ACHIEVEMENTS.map(a => ({ ...a, unlocked: false })),
  totalUnlocked: 0,
  lastUnlockedId: null
});

/** What a save and reload does to achievement state: JSON drops the requirement functions. */
const reloaded = (state: AchievementState): AchievementState => JSON.parse(JSON.stringify(state));

describe('useAchievements after a reload', () => {
  it('still unlocks custom achievements', () => {
    const { result } = renderHook(() => useAchievements(reloaded(freshState())));

    // checkAchievements unlocks one achievement per call, so run it until nothing is left
    for (let i = 0; i < INITIAL_ACHIEVEMENTS.length; i++) {
      act(() => {
        result.current.checkAchievements(gameState({ totalHarvests: 1 }));
      });
    }

    expect(result.current.achievements.find(a => a.id === 'first_harvest')?.unlocked).toBe(true);
  });

  it('keeps unlock status and time from the save and behavior from the template', () => {
    const saved = freshState();
    saved.achievements = saved.achievements.map(a =>
      a.id === 'first_harvest' ? { ...a, unlocked: true, unlockedAt: 123 } : a
    );
    saved.totalUnlocked = 1;

    const { result } = renderHook(() => useAchievements(reloaded(saved)));
    const firstHarvest = result.current.achievements.find(a => a.id === 'first_harvest');

    expect(firstHarvest?.unlocked).toBe(true);
    expect(firstHarvest?.unlockedAt).toBe(123);
    expect(typeof firstHarvest?.requirement.customCheck).toBe('function');
  });
});

describe('useAchievements checks', () => {
  it('returns the unlock and fires each callback once, even in strict mode', () => {
    const onReward = vi.fn();
    const onUnlock = vi.fn();
    const { result } = renderHook(
      () => useAchievements(freshState(), onReward, onUnlock),
      { reactStrictMode: true }
    );

    let unlocked: ReturnType<typeof result.current.checkAchievements> = null;
    act(() => {
      unlocked = result.current.checkAchievements(gameState({ totalHarvests: 1 }));
    });

    expect(unlocked).not.toBeNull();
    expect(unlocked!.id).toBe('first_harvest');
    expect(onUnlock).toHaveBeenCalledTimes(1);
    expect(onReward).toHaveBeenCalledTimes(1);
    expect(onReward).toHaveBeenCalledWith(50, 0);
    expect(result.current.totalUnlocked).toBe(1);
    expect(result.current.lastUnlockedId).toBe('first_harvest');
  });

  it('reports a different unlock for each check before a render', () => {
    const onUnlock = vi.fn();
    const { result } = renderHook(() => useAchievements(freshState(), undefined, onUnlock));

    const ids: (string | undefined)[] = [];
    act(() => {
      const state = gameState({ totalHarvests: 1, money: 1_000_000 });
      ids.push(result.current.checkAchievements(state)?.id);
      ids.push(result.current.checkAchievements(state)?.id);
    });

    expect(ids[0]).toBeDefined();
    expect(ids[1]).toBeDefined();
    expect(ids[0]).not.toBe(ids[1]);
    expect(onUnlock).toHaveBeenCalledTimes(2);
    expect(result.current.totalUnlocked).toBe(2);
    const unlockedIds = result.current.achievements.filter(a => a.unlocked).map(a => a.id);
    expect(unlockedIds).toEqual(expect.arrayContaining(ids as string[]));
  });

  it('returns null and fires nothing when nothing changes', () => {
    const onUnlock = vi.fn();
    const { result } = renderHook(() => useAchievements(freshState(), undefined, onUnlock));
    act(() => {
      result.current.checkAchievements(gameState());
    });

    let second: ReturnType<typeof result.current.checkAchievements> = null;
    act(() => {
      second = result.current.checkAchievements(gameState());
    });

    expect(second).toBeNull();
    expect(onUnlock).not.toHaveBeenCalled();
  });
});

describe("Archie's looks", () => {
  it('each look earned from an achievement names one that exists', () => {
    const earned = ARCHIE_LOOKS.filter(look => look.achievementId);
    expect(earned.map(look => look.id)).toEqual(['sweater', 'reindeer', 'fallSweater', 'warlock']);
    for (const look of earned) {
      expect(INITIAL_ACHIEVEMENTS.some(a => a.id === look.achievementId)).toBe(true);
    }
  });
});

describe('Pumpkin Rush sales achievements', () => {
  const pumpkinIds = ['pumpkin_first_sale', 'pumpkin_50_sold', 'pumpkin_250_sold', 'pumpkin_1000_sold', 'pumpkin_2500_sold'];

  it('unlock from pumpkins sold, with progress toward the next', () => {
    const onUnlock = vi.fn();
    const { result } = renderHook(() => useAchievements(freshState(), undefined, onUnlock));
    for (let i = 0; i < 5; i++) {
      act(() => {
        result.current.checkAchievements(gameState({ pumpkinsSold: 60 }));
      });
    }

    const unlocked = onUnlock.mock.calls.map(([achievement]) => achievement.id).filter(id => pumpkinIds.includes(id));
    expect(unlocked).toEqual(['pumpkin_first_sale', 'pumpkin_50_sold']);
    expect(result.current.achievements.find(a => a.id === 'pumpkin_250_sold')?.progress).toEqual({ current: 60, goal: 250 });
  });

  it("unlock Archie's Fall Sweater on the 2nd and his Warlock Costume on the 5th", () => {
    const unlockedBy = (appearance: string) => ARCHIE_LOOKS.find(look => look.id === appearance)?.achievementId;
    expect(unlockedBy('fallSweater')).toBe(pumpkinIds[1]);
    expect(unlockedBy('warlock')).toBe(pumpkinIds[4]);

    const unlocks = (id: string) => INITIAL_ACHIEVEMENTS.find(a => a.id === id)?.reward?.unlocks;
    expect(unlocks(pumpkinIds[1])).toEqual(["Archie's Fall Sweater"]);
    expect(unlocks(pumpkinIds[4])).toEqual(['Harvest Moon', "Archie's Warlock Costume"]);
  });

  it('pay Candy Corn and a farm reward', () => {
    for (const id of pumpkinIds) {
      const reward = INITIAL_ACHIEVEMENTS.find(a => a.id === id)?.reward;
      expect(reward?.candyCorn).toBeGreaterThan(0);
      expect((reward?.money ?? 0) + (reward?.knowledge ?? 0)).toBeGreaterThan(0);
    }
  });
});
