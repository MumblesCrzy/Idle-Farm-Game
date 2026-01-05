export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'farming' | 'canning' | 'bees' | 'progression' | 'wealth' | 'special' | 'milestone';
  
  // Unlock requirements
  requirement: {
    type: 'money' | 'experience' | 'knowledge' | 'veggies_unlocked' | 'canning_items' | 'farm_tier' | 'total_harvests' | 'christmas_trees_sold' | 'custom';
    value?: number;
    customCheck?: (gameState: any) => boolean;
    getProgress?: (gameState: any) => number; // For custom achievements that want progress tracking
  };
  
  // Rewards (optional - can be null or undefined)
  reward?: {
    money?: number;
    knowledge?: number;
    message?: string;
  } | null;
  
  // Progress tracking
  unlocked: boolean;
  unlockedAt?: number; // Timestamp
  hidden?: boolean; // Hide until unlocked
  progress?: {
    current: number;
    goal: number;
  };
}

/**
 * Milestone notification - simpler type for logging game milestones
 * that don't have all achievement properties
 */
export interface MilestoneNotification {
  name: string;
  description: string;
  category: 'milestone';
  reward: null;
}

/** Union type for achievement unlock events - can be full achievement or milestone */
export type AchievementOrMilestone = Achievement | MilestoneNotification;

export interface AchievementState {
  achievements: Achievement[];
  totalUnlocked: number;
  lastUnlockedId: string | null;
}
