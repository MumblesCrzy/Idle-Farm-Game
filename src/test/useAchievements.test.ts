import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAchievements } from '../hooks/useAchievements';
import { INITIAL_ACHIEVEMENTS } from '../data/achievements';
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
