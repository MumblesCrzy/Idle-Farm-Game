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
  /**
   * Currency type for purchase. 'guildCurrency' is the upgrade's own guild's currency
   * (Wax Seals for the Preservers); 'sigils' is the same for the Growers.
   */
  currencyType: 'money' | 'knowledge' | 'experience' | 'guildCurrency' | 'sigils' | 'guildTokens';
  /** Effect value per level */
  effectPerLevel: number;
  /** Effect description template (use {value} for calculated effect) */
  effectTemplate: string;
  /** How {value} shows: effect x 100 as a percentage (the default), or the plain number */
  effectDisplay?: 'percent' | 'number';
  /** Whether this upgrade is purchased (for one-time) */
  purchased: boolean;
  /** Icon path for the upgrade */
  icon?: string;
}

/**
 * A guild's own currency, earned after committing
 */
export interface GuildCurrency {
  /** Plural name, as in "238 Wax Seals" */
  name: string;
  /** Icon path */
  icon: string;
  /** How members earn it, for tooltips */
  earnedFrom: string;
  /** The guild spends money and has no currency of its own, as the Merchants */
  money?: boolean;
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
  /** The currency members earn and spend on guild upgrades */
  currency: GuildCurrency;
  /** Whether players can commit to this guild yet */
  joinable: boolean;
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
 * Dunkin, the Preservers' Glutton: what the save keeps about his visits
 */
export interface GluttonRecord {
  /** Times he was clicked away, at any stage */
  shoos: number;
  /** Times he was shooed before his first bite */
  earlyShoos: number;
  /** Times a stuffed Dunkin was sent home to the vet */
  vetBills: number;
  /** A stuffed Dunkin still waiting to be sent home, so a reload keeps him */
  stuffed?: { eaten: Record<string, number> };
}

/**
 * Stanley, the Engineers' cat: what the save keeps about his visits
 */
export interface StanleyRecord {
  /** Times he was clicked for a Tune-Up */
  tuneUps: number;
  /** Game steps left on the Tune-Up running now, so a reload keeps it */
  tuneUpLeft?: number;
}

/**
 * Ferdinand, the Merchants' cat: what the save keeps about his visits
 */
export interface FerdinandRecord {
  /** Times he was clicked for a Hot Tip */
  hotTips: number;
  /** Game steps left on the Hot Tip running now, so a reload keeps it */
  hotTipLeft?: number;
}

/**
 * One ended Legacy
 */
export interface LegacyEntry {
  /** The guild the player belonged to */
  guild: GuildType;
  /** When it ended, in ms since the epoch */
  endedAt: number;
  /** Game days it lasted */
  days: number;
  /** The one-time upgrade kept, if any */
  unlock: string | null;
  /** Levels added to the kept levels by this ending */
  levelsKept: number;
}

/**
 * What carries over from one Legacy to the next: the guild benefits a player keeps when
 * they end a Legacy and start the farm over
 */
export interface LegacyRecord {
  /** Legacies ended so far; the current one is count + 1 */
  count: number;
  /** Levels kept per leveled upgrade id, added to levels bought in the current Legacy */
  keptLevels: Record<string, number>;
  /** One-time upgrade ids kept for good */
  keptUnlocks: string[];
  /** Every ended Legacy, oldest first */
  history: LegacyEntry[];
}

/**
 * Ways to earn Guild Tokens before committing to a guild
 */
export type GuildTokenSource = 'manualHarvest' | 'cannedGoods' | 'beeHives' | 'autoHarvests';

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
  /** Guild tokens earned before committing, for starter upgrades. They don't carry over: joining clears them */
  guildTokens: number;
  /** Counts toward the next Guild Token for sources that pay every few actions (missing in older saves) */
  tokenProgress?: Partial<Record<GuildTokenSource, number>>;
  /** Auto harvests and canning batches toward the next Gear for committed Engineers (missing in older saves) */
  gearProgress?: { autoHarvests?: number; batches?: number };
  /** Dunkin's visits to committed Preservers (missing in older saves) */
  glutton?: GluttonRecord;
  /** Stanley's visits to committed Engineers (missing in older saves) */
  stanley?: StanleyRecord;
  /** Hostile Takeovers bought by a committed Merchant this Legacy (missing in older saves) */
  takeovers?: number;
  /** Ferdinand's visits to committed Merchants (missing in older saves) */
  ferdinand?: FerdinandRecord;
  /** Benefits kept from earlier Legacies (missing until the first Legacy ends) */
  legacy?: LegacyRecord;
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
