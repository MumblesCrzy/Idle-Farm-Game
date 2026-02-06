/**
 * Guild System Type Definitions
 * 
 * Defines the structure for the guild system including:
 * - Guild types and their properties
 * - Guild upgrades and bonuses
 * - Guild state management
 */

/** The four guild types available in the game */
export type GuildType = 'growers' | 'preservers' | 'engineers' | 'merchants';

/** Guild commitment status */
export type GuildCommitmentStatus = 'uncommitted' | 'sampling' | 'committed';

/**
 * Individual guild upgrade definition
 */
export interface GuildUpgrade {
  id: string;
  name: string;
  description: string;
  guild: GuildType;
  /** Tier 1-3: 1 = available before commitment, 2-3 = post-commitment */
  tier: 1 | 2 | 3;
  /** Current level (0 = not purchased for leveled upgrades) */
  level: number;
  /** Maximum level (1 for one-time purchases) */
  maxLevel: number;
  /** Whether this is a one-time purchase or leveled */
  isOneTime: boolean;
  /** Base cost */
  baseCost: number;
  /** Cost scaling per level (multiplier) */
  costScaling: number;
  /** Currency type for purchase */
  currencyType: 'money' | 'knowledge' | 'experience' | 'guildCurrency' | 'sigils' | 'guildTokens';
  /** Effect value per level */
  effectPerLevel: number;
  /** Effect description template (use {value} for calculated effect) */
  effectTemplate: string;
  /** Whether this upgrade is purchased (for one-time) */
  purchased: boolean;
  /** Icon path for the upgrade */
  icon?: string;
}

/**
 * Guild definition with theming and bonuses
 */
export interface Guild {
  id: GuildType;
  name: string;
  displayName: string;
  description: string;
  philosophy: string;
  /** Primary focus areas */
  focuses: string[];
  /** Color scheme for UI theming */
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    border: string;
  };
  /** Icon/emblem path */
  emblem: string;
  /** Upgrades available for this guild */
  upgrades: GuildUpgrade[];
  /** Passive bonuses when committed to this guild */
  passiveBonuses: GuildPassiveBonus[];
  /** Trade-offs/penalties when committed to this guild */
  tradeOffs: GuildTradeOff[];
}

/**
 * Passive bonus granted by guild membership
 */
export interface GuildPassiveBonus {
  id: string;
  name: string;
  description: string;
  /** Type of bonus */
  type: 'yield' | 'speed' | 'price' | 'automation' | 'special';
  /** Numeric value of the bonus (e.g., 0.05 for 5%) */
  value: number;
  /** Target of the bonus (e.g., 'bees', 'crops', 'canning') */
  target: string;
}

/**
 * Trade-off/penalty for guild membership
 */
export interface GuildTradeOff {
  id: string;
  name: string;
  description: string;
  /** Type of penalty */
  type: 'yield' | 'speed' | 'price' | 'automation' | 'special';
  /** Numeric value of the penalty (e.g., 0.25 for 25% reduction) */
  value: number;
  /** Target of the penalty */
  target: string;
}

/**
 * Player's guild state
 */
export interface GuildState {
  /** Currently committed guild (null if uncommitted) */
  committedGuild: GuildType | null;
  /** Commitment status */
  status: GuildCommitmentStatus;
  /** Day when guild was committed (for tracking) */
  commitmentDay: number | null;
  /** Sampled upgrades from each guild before commitment (max 2-3 per guild) */
  sampledUpgrades: Record<GuildType, string[]>;
  /** Guild tokens earned before committing (converted to guild currency on commitment) */
  guildTokens: number;
  /** Guild-specific currencies earned */
  guildCurrencies: Record<GuildType, number>;
  /** Purchased upgrade IDs */
  purchasedUpgrades: string[];
  /** Upgrade levels for leveled upgrades */
  upgradeLevels: Record<string, number>;
  /** Active quest (if any) */
  activeQuest: GuildQuest | null;
  /** Completed quest IDs */
  completedQuests: string[];
  /** Festival/event state */
  festivalState: GuildFestivalState | null;
}

/**
 * Guild quest definition
 */
export interface GuildQuest {
  id: string;
  name: string;
  description: string;
  guild: GuildType;
  /** Quest objectives */
  objectives: GuildQuestObjective[];
  /** Rewards for completion */
  rewards: GuildQuestReward[];
  /** Whether the quest is completed */
  completed: boolean;
  /** Progress tracking */
  progress: Record<string, number>;
}

/**
 * Quest objective
 */
export interface GuildQuestObjective {
  id: string;
  type: 'harvest' | 'sell' | 'craft' | 'collect' | 'upgrade' | 'special';
  target: string;
  amount: number;
  description: string;
}

/**
 * Quest reward
 */
export interface GuildQuestReward {
  type: 'money' | 'knowledge' | 'experience' | 'guildCurrency' | 'upgrade' | 'special';
  value: number | string;
  description: string;
}

/**
 * Festival/event state for guilds
 */
export interface GuildFestivalState {
  id: string;
  name: string;
  guild: GuildType;
  /** Start day */
  startDay: number;
  /** Duration in days */
  duration: number;
  /** Active bonuses during festival */
  bonuses: GuildPassiveBonus[];
  /** Whether festival is active */
  isActive: boolean;
}

/**
 * Context value for guild system
 */
export interface GuildContextValue {
  /** Current guild state */
  state: GuildState;
  /** All guild definitions */
  guilds: Guild[];
  /** Commit to a guild */
  commitToGuild: (guildId: GuildType) => boolean;
  /** Purchase an upgrade */
  purchaseUpgrade: (upgradeId: string) => boolean;
  /** Check if upgrade can be purchased */
  canPurchaseUpgrade: (upgradeId: string) => boolean;
  /** Get current cost of an upgrade */
  getUpgradeCost: (upgradeId: string) => number;
  /** Get calculated effect value for an upgrade */
  getUpgradeEffect: (upgradeId: string) => number;
  /** Check if player can sample from a guild */
  canSampleFromGuild: (guildId: GuildType) => boolean;
  /** Get total bonus from guild for a specific type */
  getGuildBonus: (bonusType: string, target: string) => number;
  /** Get total penalty from guild for a specific type */
  getGuildPenalty: (penaltyType: string, target: string) => number;
  /** Start a quest */
  startQuest: (questId: string) => boolean;
  /** Update quest progress */
  updateQuestProgress: (objectiveId: string, amount: number) => void;
  /** Claim quest rewards */
  claimQuestRewards: () => boolean;
}

/**
 * Default/initial guild state
 */
export const DEFAULT_GUILD_STATE: GuildState = {
  committedGuild: null,
  status: 'uncommitted',
  commitmentDay: null,
  sampledUpgrades: {
    growers: [],
    preservers: [],
    engineers: [],
    merchants: []
  },
  guildTokens: 0,
  guildCurrencies: {
    growers: 0,
    preservers: 0,
    engineers: 0,
    merchants: 0
  },
  purchasedUpgrades: [],
  upgradeLevels: {},
  activeQuest: null,
  completedQuests: [],
  festivalState: null
};
