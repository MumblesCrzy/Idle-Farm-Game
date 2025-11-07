import { useState, useCallback } from 'react';
import type { Achievement, AchievementState } from '../types/achievements';
import { INITIAL_ACHIEVEMENTS } from '../data/achievements';

interface GameStateForAchievements {
  money: number;
  experience: number;
  knowledge: number;
  veggiesUnlocked: number;
  canningItemsTotal: number;
  farmTier: number;
  totalHarvests?: number;
}

interface UseAchievementsReturn {
  achievements: Achievement[];
  totalUnlocked: number;
  lastUnlockedId: string | null;
  checkAchievements: (gameState: GameStateForAchievements) => Achievement | null;
  clearLastUnlocked: () => void;
  resetAchievements: () => void;
}

export function useAchievements(
  initialState?: AchievementState,
  onReward?: (money: number, knowledge: number) => void,
  onAchievementUnlock?: (achievement: Achievement) => void
): UseAchievementsReturn {
  // Initialize achievements from saved state or defaults
  const [achievementState, setAchievementState] = useState<AchievementState>(() => {
    if (initialState) {
      return initialState;
    }
    
    // Create new achievement state with all achievements locked
    return {
      achievements: INITIAL_ACHIEVEMENTS.map(ach => ({
        ...ach,
        unlocked: false
      })),
      totalUnlocked: 0,
      lastUnlockedId: null
    };
  });

  // Check if an achievement requirement is met
  const checkRequirement = useCallback((achievement: Achievement, gameState: GameStateForAchievements): boolean => {
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
      case 'custom':
        return requirement.customCheck ? requirement.customCheck(gameState) : false;
      default:
        return false;
    }
  }, []);

  // Check all achievements and unlock any that are newly achieved
  const checkAchievements = useCallback((gameState: GameStateForAchievements): Achievement | null => {
    let newlyUnlocked: Achievement | null = null;

    setAchievementState(prev => {
      const updated = { ...prev };
      let hasChanges = false;

      // Check each locked achievement
      for (let i = 0; i < updated.achievements.length; i++) {
        const achievement = updated.achievements[i];
        
        if (!achievement.unlocked && checkRequirement(achievement, gameState)) {
          // Unlock the achievement
          updated.achievements = [...updated.achievements];
          updated.achievements[i] = {
            ...achievement,
            unlocked: true,
            unlockedAt: Date.now()
          };
          
          updated.totalUnlocked++;
          updated.lastUnlockedId = achievement.id;
          hasChanges = true;
          newlyUnlocked = updated.achievements[i];
          
          // Call achievement unlock callback if provided
          if (onAchievementUnlock) {
            onAchievementUnlock(updated.achievements[i]);
          }
          
          // Grant rewards if they exist
          if (achievement.reward && onReward) {
            onReward(
              achievement.reward.money || 0,
              achievement.reward.knowledge || 0
            );
          }
          
          // Only unlock one achievement per check to show notifications properly
          break;
        }
      }

      return hasChanges ? updated : prev;
    });

    return newlyUnlocked;
  }, [checkRequirement, onReward, onAchievementUnlock]);

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
