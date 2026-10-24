/**
 * Legacy: the guild-change prestige. From Farm Tier 6 a guild member can end their Legacy:
 * the farm starts over, and they keep half the levels bought this Legacy in their guild's
 * upgrades (rounded down), one one-time upgrade of their guild, and their special and hidden
 * achievements. Ritual Circles and Rush Batch stay with their guilds, since Ritual Harvest
 * and Rush Batch spend the guild's currency.
 *
 * These are the pure rules. legacyReset.ts builds the fresh save and reloads.
 */
import type { Achievement } from '../types/achievements';
import type { GuildState, GuildType, GuildUpgrade, LegacyRecord } from '../types/guilds';
import { GUILDS } from '../data/guildData';
import { findGuildUpgrade, getBoughtLevel } from './guildCalculations';

/** Farm tier a member needs before they can end a Legacy */
export const LEGACY_FARM_TIER = 6;

/** Upgrades that stay with their guild: their abilities spend the guild's currency */
export const LEGACY_GUILD_ONLY: readonly string[] = ['growers_ritual_circles', 'preservers_rush_batch', 'engineers_overclock'];

/** No Legacy ended yet */
export const EMPTY_LEGACY: LegacyRecord = { count: 0, keptLevels: {}, keptUnlocks: [], history: [] };

/** Whether the player can end their Legacy now: a guild member at the farm tier */
export function canEndLegacy(guildState: GuildState, farmTier: number): boolean {
  return guildState.committedGuild !== null && farmTier >= LEGACY_FARM_TIER;
}

/** Levels kept from levels bought this Legacy: half, rounded down, so one level alone carries nothing */
export function halfKept(bought: number): number {
  return Math.floor(Math.max(0, bought) / 2);
}

/** One leveled upgrade of the guild being left: levels bought this Legacy and what stays */
export interface LegacyLevelPreview {
  upgrade: GuildUpgrade;
  bought: number;
  keptBefore: number;
  keptAfter: number;
}

/** The guild the player belongs to, if any */
const committedGuild = (guildState: GuildState) => GUILDS.find(guild => guild.id === guildState.committedGuild);

/**
 * The leveled upgrades of the player's guild with levels bought this Legacy or kept before,
 * and the levels that stay if the Legacy ends now
 */
export function legacyLevelPreview(guildState: GuildState): LegacyLevelPreview[] {
  const guild = committedGuild(guildState);
  if (!guild) return [];
  return guild.upgrades
    .filter(upgrade => !upgrade.isOneTime)
    .map(upgrade => {
      const bought = getBoughtLevel(guildState, upgrade.id);
      const keptBefore = guildState.legacy?.keptLevels[upgrade.id] ?? 0;
      const keptAfter = Math.min(upgrade.maxLevel, keptBefore + halfKept(bought));
      return { upgrade, bought, keptBefore, keptAfter };
    })
    .filter(row => row.bought > 0 || row.keptBefore > 0);
}

/**
 * The one-time upgrades of the player's guild they could keep: bought this Legacy, not
 * guild-only, not kept already
 */
export function legacyKeepableUnlocks(guildState: GuildState): GuildUpgrade[] {
  const guild = committedGuild(guildState);
  if (!guild) return [];
  return guild.upgrades.filter(upgrade =>
    upgrade.isOneTime
    && !LEGACY_GUILD_ONLY.includes(upgrade.id)
    && getBoughtLevel(guildState, upgrade.id) > 0
    && !(guildState.legacy?.keptUnlocks.includes(upgrade.id)));
}

/**
 * The Legacy record after ending the current Legacy: kept levels raised by half of what was
 * bought, the picked unlock added (when it can be kept), and the Legacy written into history
 */
export function endLegacyRecord(
  guildState: GuildState,
  pickedUnlock: string | null,
  days: number,
  endedAt: number = Date.now()
): LegacyRecord {
  const before = guildState.legacy ?? EMPTY_LEGACY;
  const keptLevels = { ...before.keptLevels };
  let levelsKept = 0;
  for (const row of legacyLevelPreview(guildState)) {
    if (row.keptAfter > 0) keptLevels[row.upgrade.id] = row.keptAfter;
    levelsKept += row.keptAfter - row.keptBefore;
  }
  const unlock = pickedUnlock && legacyKeepableUnlocks(guildState).some(upgrade => upgrade.id === pickedUnlock)
    ? pickedUnlock
    : null;
  return {
    count: before.count + 1,
    keptLevels,
    keptUnlocks: unlock ? [...before.keptUnlocks, unlock] : [...before.keptUnlocks],
    history: [...before.history, { guild: guildState.committedGuild ?? 'growers', endedAt, days, unlock, levelsKept }]
  };
}

/** Achievements that outlive a Legacy: special ones, and hidden ones */
export function survivesLegacy(achievement: Pick<Achievement, 'category' | 'hidden'>): boolean {
  return achievement.category === 'special' || !!achievement.hidden;
}

/** A Legacy's number, as on a monument: I, II, III, IV */
export function legacyNumeral(n: number): string {
  if (n < 1) return '0';
  const parts: Array<[number, string]> = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let rest = Math.floor(n);
  let out = '';
  for (const [value, letters] of parts) {
    while (rest >= value) {
      out += letters;
      rest -= value;
    }
  }
  return out;
}

/** An upgrade's name for the Legacy panels, or its id for one the data no longer has */
export function legacyUpgradeName(upgradeId: string): string {
  return findGuildUpgrade(upgradeId)?.name ?? upgradeId;
}

/** A guild's display name */
export function guildDisplayName(guildId: GuildType | null): string {
  return GUILDS.find(guild => guild.id === guildId)?.displayName ?? 'No guild';
}

/** Game days in words: "2 years and 140 days" */
export function describeDays(days: number): string {
  const years = Math.floor(days / 365);
  const rest = days % 365;
  const yearText = years > 0 ? `${years} ${years === 1 ? 'year' : 'years'}` : '';
  const dayText = `${rest} ${rest === 1 ? 'day' : 'days'}`;
  return yearText ? (rest > 0 ? `${yearText} and ${dayText}` : yearText) : dayText;
}

/** What the End Legacy dialog shows under "Back to the start", with the player's real numbers */
export interface LegacyResetSummary {
  guildName: string;
  guildCurrency: number;
  guildCurrencyName: string;
  farmTier: number;
  maxPlots: number;
  cropsUnlocked: number;
  money: number;
  knowledge: number;
  experience: number;
  recipesUnlocked: number;
  canningUpgradeLevels: number;
  canningExperience: number;
  hives: number;
  honey: number;
  goldenHoney: number;
  beeUpgrades: number;
  achievementsKept: number;
  achievementsReset: number;
  year: number;
  daysThisLegacy: number;
}

export type LegacyResetInput = Omit<LegacyResetSummary, 'guildName' | 'guildCurrency' | 'guildCurrencyName' | 'achievementsKept' | 'achievementsReset' | 'year'> & {
  achievements: ReadonlyArray<Pick<Achievement, 'category' | 'hidden' | 'unlocked'>>;
  guildState: GuildState;
};

/** Builds the dialog's summary from the game's state */
export function legacyResetSummary(input: LegacyResetInput): LegacyResetSummary {
  const { achievements, guildState, ...rest } = input;
  const guild = committedGuild(guildState);
  const unlocked = achievements.filter(achievement => achievement.unlocked);
  return {
    ...rest,
    guildName: guild?.displayName ?? 'No guild',
    guildCurrency: guild ? guildState.guildCurrencies[guild.id] : 0,
    guildCurrencyName: guild?.currency.name ?? 'Guild Tokens',
    achievementsKept: unlocked.filter(survivesLegacy).length,
    achievementsReset: unlocked.filter(achievement => !survivesLegacy(achievement)).length,
    year: Math.floor(input.daysThisLegacy / 365) + 1
  };
}
