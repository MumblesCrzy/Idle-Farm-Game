/**
 * Ending a Legacy: a fresh save holding only what carries over, stored through the same
 * path a save import uses, then a reload. The page comes up as a new game with the Legacy
 * record in place, so nothing from the old farm survives by accident.
 */
import { createAllCrops } from './gameCalculations';
import { createEventLogEntry } from './eventLogUtils';
import { createSaveSnapshot, importGameState, type ExtendedGameState } from './saveSystem';
import { FARM_BASE_COST, LAST_ACTIVE_KEY } from '../config/gameConstants';
import { ICON_SCROLL } from '../config/assetPaths';
import { DEFAULT_GUILD_STATE } from '../types/guilds';
import { PERMANENT_BONUS_ACHIEVEMENTS } from '../data/achievements';
import { describeDays, endLegacyRecord, guildDisplayName, legacyNumeral, legacyUpgradeName, survivesLegacy } from './legacy';

/**
 * The save the next Legacy starts from. The farm is back at its first day; special and
 * hidden achievements stay unlocked with the permanent bonuses they granted; the seasonal
 * events, the settings and the tutorial flags carry over; the guild state is empty but for
 * the Legacy record.
 */
export function buildLegacySave(current: ExtendedGameState, pickedUnlock: string | null, now: number = Date.now()): ExtendedGameState {
  const guildState = current.guildState ?? DEFAULT_GUILD_STATE;
  const legacy = endLegacyRecord(guildState, pickedUnlock, current.totalDaysElapsed ?? 0, now);
  const ended = legacy.history[legacy.history.length - 1];

  const achievements = (current.achievementState?.achievements ?? []).map(achievement => (
    achievement.unlocked && survivesLegacy(achievement)
      ? achievement
      : { ...achievement, unlocked: false, unlockedAt: undefined, progress: undefined }
  ));
  const keptIds = new Set(achievements.filter(achievement => achievement.unlocked).map(achievement => achievement.id));
  const permanentBonuses = (current.permanentBonuses ?? []).filter(bonus =>
    Object.entries(PERMANENT_BONUS_ACHIEVEMENTS).some(([achievementId, granted]) => granted === bonus && keptIds.has(achievementId)));

  const kept = [
    ended.unlock ? legacyUpgradeName(ended.unlock) : null,
    ended.levelsKept > 0 ? `${ended.levelsKept} upgrade ${ended.levelsKept === 1 ? 'level' : 'levels'}` : null
  ].filter((part): part is string => part !== null);
  const entry = createEventLogEntry(
    'milestone',
    `Legacy ${legacyNumeral(legacy.count)} ended after ${describeDays(ended.days)} in the ${guildDisplayName(ended.guild)}`,
    1,
    0,
    {
      priority: 'important',
      details: kept.length > 0 ? `Kept ${kept.join(' and ')}. Legacy ${legacyNumeral(legacy.count + 1)} begins.` : `Legacy ${legacyNumeral(legacy.count + 1)} begins.`,
      icon: ICON_SCROLL
    }
  );

  const fresh: ExtendedGameState = {
    veggies: createAllCrops(),
    money: 0,
    experience: 0,
    knowledge: 0,
    activeVeggie: 0,
    day: 1,
    totalDaysElapsed: 0,
    totalHarvests: 0,
    globalAutoPurchaseTimer: 0,
    greenhouseOwned: false,
    heirloomOwned: false,
    autoSellOwned: false,
    almanacLevel: 0,
    almanacCost: 10,
    maxPlots: 4,
    farmTier: 1,
    farmCost: FARM_BASE_COST,
    irrigationOwned: false,
    currentWeather: 'Clear',
    highestUnlockedVeggie: 0,
    permanentBonuses,
    // Canning and bees are left out, so their systems start from their own defaults
    uiPreferences: current.uiPreferences,
    achievementState: { achievements, totalUnlocked: keptIds.size, lastUnlockedId: null },
    eventLogState: { entries: [entry], maxEntries: current.eventLogState?.maxEntries ?? 100, unreadCount: 1 },
    christmasEventState: current.christmasEventState,
    pumpkinEventState: current.pumpkinEventState,
    harvestTutorialShown: true,
    guildIntroShown: true,
    guildState: { ...DEFAULT_GUILD_STATE, legacy },
    isPaused: false
  };
  return createSaveSnapshot(fresh);
}

/**
 * Ends the Legacy: stores the fresh save (which also stops the closing page from saving the
 * old game back), marks the tab active so the reload credits no time away, and reloads.
 * @param reload - Reloads the page; tests pass their own
 */
export function endLegacy(
  current: ExtendedGameState,
  pickedUnlock: string | null,
  reload: () => void = () => window.location.reload()
): void {
  importGameState(buildLegacySave(current, pickedUnlock));
  try {
    localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
  } catch {
    // Storage refused: the save could not be stored either, and the reload starts a new game
  }
  reload();
}
