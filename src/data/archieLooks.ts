/**
 * Archie's looks, chosen in Settings. Default and Pinecones are always available; the rest
 * are achievement rewards and stay locked until their achievement unlocks.
 */
import {
  SPECIAL_ARCHIE,
  SPECIAL_ARCHIE_PINECONES,
  SPECIAL_ARCHIE_SWEATER,
  SPECIAL_ARCHIE_REINDEER,
  SPECIAL_ARCHIE_FALL_SWEATER,
  SPECIAL_ARCHIE_WARLOCK
} from '../config/assetPaths';
import { INITIAL_ACHIEVEMENTS } from './achievements';

export type ArchieAppearance = 'default' | 'pinecones' | 'sweater' | 'reindeer' | 'fallSweater' | 'warlock';

export interface ArchieLook {
  id: ArchieAppearance;
  /** Button text in Settings */
  label: string;
  /** The button's name for screen readers */
  description: string;
  image: string;
  /** The achievement that unlocks the look; looks without one are always available */
  achievementId?: string;
}

/** In the order Settings shows them */
export const ARCHIE_LOOKS: readonly ArchieLook[] = [
  { id: 'default', label: '🐕 Default', description: 'Default Archie appearance', image: SPECIAL_ARCHIE },
  { id: 'pinecones', label: '🌲 Pinecones', description: 'Archie with pinecones', image: SPECIAL_ARCHIE_PINECONES },
  { id: 'sweater', label: '🧥 Sweater', description: "Archie's winter sweater", image: SPECIAL_ARCHIE_SWEATER, achievementId: 'winter_sweater' },
  { id: 'reindeer', label: '🦌 Reindeer', description: "Archie's reindeer hat", image: SPECIAL_ARCHIE_REINDEER, achievementId: 'reindeer_hat' },
  { id: 'fallSweater', label: '🍂 Fall Sweater', description: "Archie's fall sweater", image: SPECIAL_ARCHIE_FALL_SWEATER, achievementId: 'pumpkin_50_sold' },
  { id: 'warlock', label: '🧙 Warlock', description: "Archie's warlock costume", image: SPECIAL_ARCHIE_WARLOCK, achievementId: 'pumpkin_2500_sold' }
];

/** Whether a saved setting names one of Archie's looks */
export const isArchieAppearance = (value: string): value is ArchieAppearance =>
  ARCHIE_LOOKS.some(look => look.id === value);

/** The image Archie wears for a look */
export const archieLookImage = (appearance: ArchieAppearance): string =>
  ARCHIE_LOOKS.find(look => look.id === appearance)?.image ?? SPECIAL_ARCHIE;

/** The name of the achievement that unlocks a look, for its locked button */
export const unlockingAchievementName = (look: ArchieLook): string | undefined =>
  INITIAL_ACHIEVEMENTS.find(achievement => achievement.id === look.achievementId)?.name;
