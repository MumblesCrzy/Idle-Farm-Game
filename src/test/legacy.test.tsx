/**
 * Tests for Legacy: the kept-level rules, the kept unlock, effective upgrade levels, the
 * fresh save a Legacy starts from, loading it, and the two Legacy achievements.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import App from '../App';
import { GameProviders } from '../GameProviders';
import { GameClockProvider } from '../hooks/useGameClock';
import { useCanningSystem } from '../hooks/useCanningSystem';
import { DEFAULT_GUILD_STATE, type GuildState, type LegacyRecord } from '../types/guilds';
import type { ChristmasEventState } from '../types/christmasEvent';
import type { AchievementGameState } from '../types/achievements';
import { INITIAL_ACHIEVEMENTS } from '../data/achievements';
import { GAME_STORAGE_KEY, LAST_ACTIVE_KEY } from '../config/gameConstants';
import {
  getBoughtLevel,
  getKeptLevel,
  getPreserversValueBonus,
  getUpgradeLevel,
  hasCellarRecipes,
  hasWhispersOfSeed,
  isGuildUpgradeMaxed
} from '../utils/guildCalculations';
import {
  LEGACY_FARM_TIER,
  canEndLegacy,
  describeDays,
  endLegacyRecord,
  halfKept,
  legacyKeepableUnlocks,
  legacyLevelPreview,
  legacyNumeral,
  legacyResetSummary,
  survivesLegacy
} from '../utils/legacy';
import { buildLegacySave, endLegacy } from '../utils/legacyReset';
import { loadGameStateWithCanning, type ExtendedGameState } from '../utils/saveSystem';

/** A Preserver at the end of a long first Legacy */
const preserver: GuildState = {
  ...DEFAULT_GUILD_STATE,
  committedGuild: 'preservers',
  status: 'committed',
  commitmentDay: 40,
  guildCurrencies: { ...DEFAULT_GUILD_STATE.guildCurrencies, preservers: 238 },
  purchasedUpgrades: [
    'preservers_shelf_life', 'preservers_cellar_aging', 'preservers_copper_kettles', 'preservers_honey_glaze',
    'preservers_cellar_recipes', 'preservers_family_cookbook', 'preservers_rush_batch'
  ],
  upgradeLevels: {
    preservers_shelf_life: 5, preservers_cellar_aging: 6, preservers_copper_kettles: 3, preservers_honey_glaze: 1,
    preservers_cellar_recipes: 1, preservers_family_cookbook: 1, preservers_rush_batch: 1
  },
  glutton: { shoos: 4, earlyShoos: 2, vetBills: 1 }
};

const afterOne: LegacyRecord = {
  count: 1,
  keptLevels: { preservers_cellar_aging: 3, preservers_shelf_life: 2 },
  keptUnlocks: ['preservers_cellar_recipes'],
  history: [{ guild: 'preservers', endedAt: 1, days: 870, unlock: 'preservers_cellar_recipes', levelsKept: 5 }]
};

/** A fresh player carrying one Legacy */
const newcomer: GuildState = { ...DEFAULT_GUILD_STATE, legacy: afterOne };

describe('kept levels', () => {
  it('keep half of what was bought, rounded down, so one level alone carries nothing', () => {
    expect([0, 1, 2, 3, 5, 6].map(halfKept)).toEqual([0, 0, 1, 1, 2, 3]);
  });

  it('preview every leveled upgrade of the guild with levels, and what stays', () => {
    const rows = Object.fromEntries(legacyLevelPreview(preserver).map(row => [row.upgrade.id, [row.bought, row.keptBefore, row.keptAfter]]));

    expect(rows).toEqual({
      preservers_shelf_life: [5, 0, 2],
      preservers_cellar_aging: [6, 0, 3],
      preservers_copper_kettles: [3, 0, 1],
      preservers_honey_glaze: [1, 0, 0]
    });
  });

  it('add up across Legacies and stop at the max level', () => {
    const second: GuildState = {
      ...preserver,
      legacy: { ...afterOne, keptLevels: { preservers_cellar_aging: 8 } },
      upgradeLevels: { ...preserver.upgradeLevels, preservers_cellar_aging: 5 }
    };
    const aging = legacyLevelPreview(second).find(row => row.upgrade.id === 'preservers_cellar_aging')!;

    expect(aging).toMatchObject({ bought: 5, keptBefore: 8, keptAfter: 10 });
  });
});

describe('the kept unlock', () => {
  it('offers one-time upgrades bought this Legacy, but never the ones that spend guild currency', () => {
    expect(legacyKeepableUnlocks(preserver).map(upgrade => upgrade.id))
      .toEqual(['preservers_cellar_recipes', 'preservers_family_cookbook']);
  });

  it('leaves out unlocks already kept', () => {
    const again: GuildState = { ...preserver, legacy: afterOne };
    expect(legacyKeepableUnlocks(again).map(upgrade => upgrade.id)).toEqual(['preservers_family_cookbook']);
  });

  it('writes the ending into the record', () => {
    const record = endLegacyRecord(preserver, 'preservers_cellar_recipes', 870, 1234);

    expect(record.count).toBe(1);
    expect(record.keptLevels).toEqual({ preservers_shelf_life: 2, preservers_cellar_aging: 3, preservers_copper_kettles: 1 });
    expect(record.keptUnlocks).toEqual(['preservers_cellar_recipes']);
    expect(record.history).toEqual([{ guild: 'preservers', endedAt: 1234, days: 870, unlock: 'preservers_cellar_recipes', levelsKept: 6 }]);
  });

  it('ignores a pick that cannot be kept', () => {
    expect(endLegacyRecord(preserver, 'preservers_rush_batch', 10).keptUnlocks).toEqual([]);
    expect(endLegacyRecord(preserver, null, 10).keptUnlocks).toEqual([]);
  });
});

describe('effective upgrade levels', () => {
  it('add kept levels to bought ones and treat a kept unlock as owned, in any guild', () => {
    expect(getBoughtLevel(newcomer, 'preservers_cellar_aging')).toBe(0);
    expect(getKeptLevel(newcomer, 'preservers_cellar_aging')).toBe(3);
    expect(getUpgradeLevel(newcomer, 'preservers_cellar_aging')).toBe(3);
    expect(getUpgradeLevel(newcomer, 'preservers_cellar_recipes')).toBe(1);
    expect(hasCellarRecipes(newcomer)).toBe(true);
    expect(hasWhispersOfSeed(newcomer)).toBe(false);
  });

  it('count toward the max level', () => {
    const member: GuildState = { ...preserver, legacy: afterOne, upgradeLevels: { ...preserver.upgradeLevels, preservers_cellar_aging: 8 } };
    expect(getUpgradeLevel(member, 'preservers_cellar_aging')).toBe(10);
    expect(isGuildUpgradeMaxed(member, { id: 'preservers_cellar_aging', isOneTime: false, maxLevel: 10 })).toBe(true);
    expect(isGuildUpgradeMaxed(newcomer, { id: 'preservers_cellar_recipes', isOneTime: true, maxLevel: 1 })).toBe(true);
    expect(isGuildUpgradeMaxed(newcomer, { id: 'preservers_cellar_aging', isOneTime: false, maxLevel: 10 })).toBe(false);
  });

  it('work at full strength for a non-member, while sampled levels still run at half', () => {
    // Tight Lids: 2 kept levels at full strength and 2 sampled ones at half, 2% each; Cellar Aging 3 kept at 3%
    const sampler: GuildState = { ...newcomer, purchasedUpgrades: ['preservers_shelf_life'], upgradeLevels: { preservers_shelf_life: 2 } };
    expect(getPreserversValueBonus(sampler)).toBeCloseTo((2 + 2 * 0.5) * 0.02 + 3 * 0.03);
  });
});

describe('ending a Legacy', () => {
  const achievements = INITIAL_ACHIEVEMENTS.map(achievement => ({
    ...achievement,
    unlocked: ['first_harvest', 'frost_fertilizer', 'millionaire', 'pumpkin_50_sold'].includes(achievement.id),
    unlockedAt: 5
  }));
  const current: ExtendedGameState = {
    veggies: [],
    money: 5_000_000,
    experience: 2_000_000,
    knowledge: 400_000,
    activeVeggie: 3,
    day: 200,
    totalDaysElapsed: 870,
    totalHarvests: 9000,
    greenhouseOwned: true,
    heirloomOwned: true,
    autoSellOwned: true,
    almanacLevel: 4,
    almanacCost: 999,
    maxPlots: 16,
    farmTier: 6,
    farmCost: 12345,
    irrigationOwned: true,
    currentWeather: 'Rain',
    highestUnlockedVeggie: 9,
    permanentBonuses: ['frost_fertilizer', 'harvest_moon'],
    uiPreferences: { canningRecipeFilter: 'cellar', canningRecipeSort: 'time', canningCanMakeOnly: true },
    achievementState: { achievements, totalUnlocked: 4, lastUnlockedId: 'millionaire' },
    eventLogState: { entries: [], maxEntries: 150, unreadCount: 0 },
    christmasEventState: { totalTreesSold: 7 } as unknown as ChristmasEventState,
    harvestTutorialShown: true,
    guildIntroShown: true,
    guildState: preserver,
    isPaused: true
  };

  beforeEach(() => localStorage.clear());

  it('starts the next Legacy from day one with only the kept pieces', () => {
    const save = buildLegacySave(current, 'preservers_cellar_recipes', 777);

    expect(save).toMatchObject({
      money: 0, experience: 0, knowledge: 0, activeVeggie: 0, day: 1, totalDaysElapsed: 0, totalHarvests: 0,
      greenhouseOwned: false, heirloomOwned: false, autoSellOwned: false, almanacLevel: 0, almanacCost: 10,
      maxPlots: 4, farmTier: 1, farmCost: 500, irrigationOwned: false, currentWeather: 'Clear', highestUnlockedVeggie: 0,
      harvestTutorialShown: true, guildIntroShown: true, isPaused: false
    });
    expect(save.veggies.length).toBeGreaterThan(10);
    expect(save.veggies.filter(v => v.unlocked).map(v => v.name)).toEqual(['Radish']);
    expect(save.canningState).toBeUndefined();
    expect(save.beeState).toBeUndefined();
    expect(save.christmasEventState).toEqual({ totalTreesSold: 7 });
    expect(save.uiPreferences).toEqual(current.uiPreferences);
    expect(save.guildState).toMatchObject({ ...DEFAULT_GUILD_STATE, legacy: { count: 1, keptUnlocks: ['preservers_cellar_recipes'] } });
    expect(save.guildState?.legacy?.keptLevels).toEqual({ preservers_shelf_life: 2, preservers_cellar_aging: 3, preservers_copper_kettles: 1 });
    expect(save.guildState?.glutton).toBeUndefined();
    expect(save._saveVersion).toBeDefined();
  });

  it('keeps special and hidden achievements with their bonuses, and resets the rest', () => {
    const save = buildLegacySave(current, null);
    const unlocked = save.achievementState!.achievements.filter(a => a.unlocked).map(a => a.id).sort();

    expect(unlocked).toEqual(['frost_fertilizer', 'millionaire', 'pumpkin_50_sold']);
    expect(save.achievementState!.totalUnlocked).toBe(3);
    expect(save.achievementState!.achievements.find(a => a.id === 'first_harvest')).toMatchObject({ unlocked: false, unlockedAt: undefined });
    // Frost Fertilizer's achievement survived; Harvest Moon's was never unlocked here
    expect(save.permanentBonuses).toEqual(['frost_fertilizer']);
  });

  it('opens the event log with the ending', () => {
    const save = buildLegacySave(current, 'preservers_cellar_recipes');
    expect(save.eventLogState?.entries).toHaveLength(1);
    expect(save.eventLogState?.entries[0].message).toBe('Legacy I ended after 2 years and 140 days in the Preservers Guild');
    expect(save.eventLogState?.entries[0].details).toBe('Kept Cellar Recipes and 6 upgrade levels. Legacy II begins.');
  });

  it('stores the fresh save, marks the tab active and reloads, and the game loads it as a Tier 1 farm', () => {
    const reload = vi.fn();
    const before = Date.now() - 1;

    endLegacy(current, 'preservers_cellar_recipes', reload);

    expect(reload).toHaveBeenCalledTimes(1);
    expect(Number(localStorage.getItem(LAST_ACTIVE_KEY))).toBeGreaterThan(before);
    const stored = JSON.parse(localStorage.getItem(GAME_STORAGE_KEY)!);
    expect(stored.farmTier).toBe(1);
    expect(stored.lastSavedAt).toBeGreaterThan(before);

    const loaded = loadGameStateWithCanning();
    expect(loaded).toMatchObject({ farmTier: 1, money: 0, day: 1 });
    expect(loaded?.guildState?.legacy?.count).toBe(1);
    expect(loaded?.canningState?.recipes.length).toBeGreaterThan(0);
  });

  it('describes a Legacy for the dialog', () => {
    expect(legacyNumeral(1)).toBe('I');
    expect(legacyNumeral(4)).toBe('IV');
    expect(legacyNumeral(9)).toBe('IX');
    expect(describeDays(870)).toBe('2 years and 140 days');
    expect(describeDays(365)).toBe('1 year');
    expect(describeDays(1)).toBe('1 day');
    expect(canEndLegacy(preserver, LEGACY_FARM_TIER - 1)).toBe(false);
    expect(canEndLegacy(preserver, LEGACY_FARM_TIER)).toBe(true);
    expect(canEndLegacy(DEFAULT_GUILD_STATE, LEGACY_FARM_TIER)).toBe(false);
    expect(survivesLegacy({ category: 'special', hidden: false })).toBe(true);
    expect(survivesLegacy({ category: 'canning', hidden: true })).toBe(true);
    expect(survivesLegacy({ category: 'canning', hidden: false })).toBe(false);

    const summary = legacyResetSummary({
      farmTier: 6, maxPlots: 16, cropsUnlocked: 10, money: 5e6, knowledge: 4e5, experience: 2e6, daysThisLegacy: 870,
      recipesUnlocked: 38, canningUpgradeLevels: 20, canningExperience: 90000, hives: 12, honey: 442, goldenHoney: 3.2, beeUpgrades: 6,
      achievements, guildState: preserver
    });
    expect(summary).toMatchObject({ guildName: 'Preservers Guild', guildCurrency: 238, guildCurrencyName: 'Wax Seals', achievementsKept: 3, achievementsReset: 1, year: 3 });
  });
});

describe('a kept Cellar Recipes', () => {
  it('opens the Cellar recipes for a player in no guild', () => {
    const wrapper = ({ children }: { children: ReactNode }) => <GameClockProvider>{children}</GameClockProvider>;
    const veggies = [{ name: 'Radish', stash: 10, salePrice: 1 }];
    const { result } = renderHook(() => useCanningSystem(
      veggies, vi.fn(), false, 0, vi.fn(), 0, vi.fn(), undefined, 'profit', 3,
      undefined, undefined, undefined, undefined, undefined, undefined, newcomer
    ), { wrapper });

    expect(result.current.canningState.recipes.filter(r => r.requiredGuildUpgrade)).toHaveLength(10);
  });
});

describe('Legacy achievements', () => {
  const achievement = (id: string) => INITIAL_ACHIEVEMENTS.find(a => a.id === id)!;
  const state = (legacy?: LegacyRecord): AchievementGameState => ({
    money: 0, experience: 0, knowledge: 0, veggiesUnlocked: 0, canningItemsTotal: 0, farmTier: 1,
    guildState: { ...DEFAULT_GUILD_STATE, legacy }
  });

  it('are special, so they survive the reset they celebrate', () => {
    expect(achievement('legacy_first').category).toBe('special');
    expect(achievement('legacy_two_trades').category).toBe('special');
  });

  it('Turning the Page comes with the first Legacy, Two Trades with unlocks from two guilds', () => {
    expect(achievement('legacy_first').requirement.customCheck!(state())).toBe(false);
    expect(achievement('legacy_first').requirement.customCheck!(state(afterOne))).toBe(true);
    expect(achievement('legacy_two_trades').requirement.customCheck!(state(afterOne))).toBe(false);
    expect(achievement('legacy_two_trades').requirement.customCheck!(state({
      ...afterOne, keptUnlocks: ['preservers_cellar_recipes', 'growers_fruit_cultivation']
    }))).toBe(true);
  });
});

describe('the game after a Legacy', { timeout: 20_000 }, () => {
  beforeEach(() => localStorage.clear());

  it('boots as a new farm that shows its Legacy on the Guilds tab', async () => {
    const user = userEvent.setup();
    const current: ExtendedGameState = {
      veggies: [], money: 100, experience: 100, knowledge: 100, activeVeggie: 0, day: 50, totalDaysElapsed: 400,
      greenhouseOwned: false, heirloomOwned: false, autoSellOwned: false, almanacLevel: 0, almanacCost: 10,
      maxPlots: 16, farmTier: 6, farmCost: 1000, irrigationOwned: false, currentWeather: 'Clear', highestUnlockedVeggie: 5,
      guildState: preserver, harvestTutorialShown: true, guildIntroShown: true
    };
    endLegacy(current, 'preservers_cellar_recipes', vi.fn());

    render(
      <GameProviders>
        <App />
      </GameProviders>
    );
    const guildsTab = screen.getByRole('tab', { name: /guilds/i });
    expect(guildsTab).toBeEnabled();
    await user.click(guildsTab);

    expect(guildsTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Legacy II')).toBeInTheDocument();
    expect(screen.getByText('Cellar Recipes')).toBeInTheDocument();
    expect(screen.getByText(/Farm Tier: 1/)).toBeInTheDocument();
    expect(screen.queryByText(/encountered an error/i)).not.toBeInTheDocument();
  });
});
