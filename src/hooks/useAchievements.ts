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
  christmasTreesSold?: number;
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
      // Merge saved achievements with new ones from INITIAL_ACHIEVEMENTS
      const savedAchievementMap = new Map(
        initialState.achievements.map(ach => [ach.id, ach])
      );
      
      // Add any new achievements that don't exist in the saved state
      const mergedAchievements = INITIAL_ACHIEVEMENTS.map(templateAch => {
        const savedAch = savedAchievementMap.get(templateAch.id);
        if (savedAch) {
          // Keep the saved achievement data (unlocked status, etc.)
          return savedAch;
        } else {
          // Add new achievement as locked
          return {
            ...templateAch,
            unlocked: false
          };
        }
      });
      
      // Recalculate total unlocked count
      const totalUnlocked = mergedAchievements.filter(ach => ach.unlocked).length;
      
      return {
        achievements: mergedAchievements,
        totalUnlocked,
        lastUnlockedId: initialState.lastUnlockedId
      };
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
      case 'christmas_trees_sold':
        return (gameState.christmasTreesSold || 0) >= (requirement.value || 0);
      case 'custom':
        return requirement.customCheck ? requirement.customCheck(gameState) : false;
      default:
        return false;
    }
  }, []);

  // Get current progress for an achievement
  const getProgress = useCallback((achievement: Achievement, gameState: GameStateForAchievements): { current: number; goal: number } | undefined => {
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
      default:
        return undefined;
    }
    
    return {
      current: Math.min(current, requirement.value),
      goal: requirement.value
    };
  }, []);

  // Check all achievements and unlock any that are newly achieved
  const checkAchievements = useCallback((gameState: GameStateForAchievements): Achievement | null => {
    let newlyUnlocked: Achievement | null = null;

    setAchievementState(prev => {
      const updated = { ...prev };
      let hasChanges = false;

      // Check each achievement and update progress
      for (let i = 0; i < updated.achievements.length; i++) {
        const achievement = updated.achievements[i];
        
        // Update progress for all achievements (even unlocked ones)
        const progress = getProgress(achievement, gameState);
        if (progress && (
          !achievement.progress || 
          achievement.progress.current !== progress.current ||
          achievement.progress.goal !== progress.goal
        )) {
          updated.achievements = [...updated.achievements];
          updated.achievements[i] = {
            ...achievement,
            progress
          };
          hasChanges = true;
        }
        
        // Check if locked achievement should be unlocked
        if (!achievement.unlocked && checkRequirement(achievement, gameState)) {
          // Unlock the achievement
          updated.achievements = [...updated.achievements];
          updated.achievements[i] = {
            ...updated.achievements[i],
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
  }, [checkRequirement, getProgress, onReward, onAchievementUnlock]);

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
