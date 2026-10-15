import { useState, useCallback } from 'react';
import { useLatestRef } from './useLatestRef';
import type { Achievement, AchievementGameState, AchievementState } from '../types/achievements';
import { INITIAL_ACHIEVEMENTS } from '../data/achievements';

type GameStateForAchievements = AchievementGameState;

interface UseAchievementsReturn {
  achievements: Achievement[];
  totalUnlocked: number;
  lastUnlockedId: string | null;
  checkAchievements: (gameState: GameStateForAchievements) => Achievement | null;
  clearLastUnlocked: () => void;
  resetAchievements: () => void;
}

/** Whether an achievement's requirement is met */
function checkRequirement(achievement: Achievement, gameState: GameStateForAchievements): boolean {
  const { requirement } = achievement;

  switch (requirement.type) {
    case 'money':
      return gameState.money >= (requirement.value || 0);
    case 'experience':
      return gameState.experience >= (requirement.value || 0);
    case 'knowledge':
      return gameState.knowledge >= (requirement.value || 0);
    case 'veggies_unlocked':
      return gameState.veggiesUnlocked >= (requirement.value || 0);
    case 'canning_items':
      return gameState.canningItemsTotal >= (requirement.value || 0);
    case 'farm_tier':
      return gameState.farmTier >= (requirement.value || 0);
    case 'christmas_trees_sold':
      return (gameState.christmasTreesSold || 0) >= (requirement.value || 0);
    case 'custom':
      return requirement.customCheck ? requirement.customCheck(gameState) : false;
    default:
      return false;
  }
}

/** Current progress toward an achievement, for numeric requirements */
function getProgress(achievement: Achievement, gameState: GameStateForAchievements): { current: number; goal: number } | undefined {
  const { requirement } = achievement;

  // Only track progress for numeric requirements
  if (!requirement.value) return undefined;

  let current = 0;

  switch (requirement.type) {
    case 'money':
      current = gameState.money;
      break;
    case 'experience':
      current = gameState.experience;
      break;
    case 'knowledge':
      current = gameState.knowledge;
      break;
    case 'veggies_unlocked':
      current = gameState.veggiesUnlocked;
      break;
    case 'canning_items':
      current = gameState.canningItemsTotal;
      break;
    case 'farm_tier':
      current = gameState.farmTier;
      break;
    case 'christmas_trees_sold':
      current = gameState.christmasTreesSold || 0;
      break;
    case 'total_harvests':
      current = gameState.totalHarvests || 0;
      break;
    case 'custom':
      // Use custom getProgress function if provided
      if (requirement.getProgress) {
        current = requirement.getProgress(gameState);
      } else {
        return undefined;
      }
      break;
    default:
      return undefined;
  }

  return {
    current: Math.min(current, requirement.value),
    goal: requirement.value
  };
}

/**
 * Updates progress and unlocks at most one achievement, without side effects.
 * Returns null when nothing changed. One unlock per check, so each one gets its
 * own notification.
 */
function evaluateAchievements(
  state: AchievementState,
  gameState: GameStateForAchievements,
  now: number
): { next: AchievementState; unlocked: Achievement | null } | null {
  let achievements = state.achievements;
  let changed = false;
  let unlocked: Achievement | null = null;

  for (let i = 0; i < achievements.length; i++) {
    const achievement = achievements[i];

    // Update progress for all achievements (even unlocked ones)
    const progress = getProgress(achievement, gameState);
    if (progress && (
      !achievement.progress ||
      achievement.progress.current !== progress.current ||
      achievement.progress.goal !== progress.goal
    )) {
      if (!changed) {
        achievements = [...achievements];
        changed = true;
      }
      achievements[i] = { ...achievement, progress };
    }

    // Unlock a locked achievement whose requirement is met
    if (!achievement.unlocked && checkRequirement(achievement, gameState)) {
      if (!changed) {
        achievements = [...achievements];
        changed = true;
      }
      achievements[i] = { ...achievements[i], unlocked: true, unlockedAt: now };
      unlocked = achievements[i];
      break;
    }
  }

  if (!changed) return null;
  return {
    next: {
      ...state,
      achievements,
      totalUnlocked: unlocked ? state.totalUnlocked + 1 : state.totalUnlocked,
      lastUnlockedId: unlocked ? unlocked.id : state.lastUnlockedId
    },
    unlocked
  };
}

export function useAchievements(
  initialState?: AchievementState,
  onReward?: (money: number, knowledge: number) => void,
  onAchievementUnlock?: (achievement: Achievement) => void
): UseAchievementsReturn {
  // Initialize achievements from saved state or defaults
  const [achievementState, setAchievementState] = useState<AchievementState>(() => {
    if (initialState) {
      // Merge saved achievements with new ones from INITIAL_ACHIEVEMENTS
      const savedAchievementMap = new Map(
        initialState.achievements.map(ach => [ach.id, ach])
      );

      const mergedAchievements = INITIAL_ACHIEVEMENTS.map(templateAch => {
        const savedAch = savedAchievementMap.get(templateAch.id);
        if (savedAch) {
          // Take only progress from the save. Everything else, including the
          // customCheck and getProgress functions that JSON can't store, comes
          // from the template; otherwise custom achievements never unlock after a reload.
          return {
            ...templateAch,
            unlocked: savedAch.unlocked,
            unlockedAt: savedAch.unlockedAt,
            progress: savedAch.progress
          };
        }
        // New achievement since the save was made
        return {
          ...templateAch,
          unlocked: false
        };
      });

      return {
        achievements: mergedAchievements,
        totalUnlocked: mergedAchievements.filter(ach => ach.unlocked).length,
        lastUnlockedId: initialState.lastUnlockedId
      };
    }

    // No saved state: a fresh game
    return {
      achievements: INITIAL_ACHIEVEMENTS.map(ach => ({
        ...ach,
        unlocked: false
      })),
      totalUnlocked: 0,
      lastUnlockedId: null
    };
  });

  // Latest state, so a check can decide and report before its update is committed
  const achievementStateRef = useLatestRef(achievementState);

  // Check all achievements and unlock any that are newly achieved.
  // Decides from the latest state, applies the same evaluation in the updater so
  // it composes with other queued updates, then fires callbacks outside it.
  const checkAchievements = useCallback((gameState: GameStateForAchievements): Achievement | null => {
    const now = Date.now();
    const outcome = evaluateAchievements(achievementStateRef.current, gameState, now);
    if (!outcome) return null;

    // Let a second check before the commit see this one
    achievementStateRef.current = outcome.next;
    setAchievementState(prev => evaluateAchievements(prev, gameState, now)?.next ?? prev);

    const { unlocked } = outcome;
    if (unlocked) {
      onAchievementUnlock?.(unlocked);
      // Grant rewards if they exist
      if (unlocked.reward && onReward) {
        onReward(unlocked.reward.money || 0, unlocked.reward.knowledge || 0);
      }
    }
    return unlocked;
  }, [achievementStateRef, onReward, onAchievementUnlock]);

  // Clear the last unlocked achievement (after showing notification)
  const clearLastUnlocked = useCallback(() => {
    setAchievementState(prev => ({
      ...prev,
      lastUnlockedId: null
    }));
  }, []);

  // Reset all achievements to initial locked state
  const resetAchievements = useCallback(() => {
    setAchievementState({
      achievements: INITIAL_ACHIEVEMENTS.map(ach => ({
        ...ach,
        unlocked: false
      })),
      totalUnlocked: 0,
      lastUnlockedId: null
    });
  }, []);

  return {
    achievements: achievementState.achievements,
    totalUnlocked: achievementState.totalUnlocked,
    lastUnlockedId: achievementState.lastUnlockedId,
    checkAchievements,
    clearLastUnlocked,
    resetAchievements
  };
}
