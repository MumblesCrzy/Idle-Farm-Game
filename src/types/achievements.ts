export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'farming' | 'canning' | 'progression' | 'wealth' | 'special';
  
  // Unlock requirements
  requirement: {
    type: 'money' | 'experience' | 'knowledge' | 'veggies_unlocked' | 'canning_items' | 'farm_tier' | 'total_harvests' | 'christmas_trees_sold' | 'custom';
    value?: number;
    customCheck?: (gameState: any) => boolean;
  };
  
  // Rewards
  reward?: {
    money?: number;
    knowledge?: number;
    message?: string;
  };
  
  // Progress tracking
  unlocked: boolean;
  unlockedAt?: number; // Timestamp
  hidden?: boolean; // Hide until unlocked
  progress?: {
    current: number;
    goal: number;
  };
}

export interface AchievementState {
  achievements: Achievement[];
  totalUnlocked: number;
  lastUnlockedId: string | null;
}
