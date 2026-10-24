/**
 * What the Bees tab shows, worked out from the bee rules: the upgrades grouped by what they
 * improve, each with its effect now and next and why it can't be bought yet; the hive counts
 * that open upgrades; and how long until the bees rest for winter or wake in spring.
 */
import type { BeeUpgrade } from '../types/bees';
import { INITIAL_BEE_UPGRADES, isUpgradeUnlocked } from '../data/beeUpgrades';
import { BEE_CONSTANTS } from '../config/gameConstants';
import { BEE_BEEKEEPER } from '../config/assetPaths';
import { batchDays, cropBonus, goldenChance, lbsPerBatch, type BeeLevels } from './beeProduction';

/** Winter runs from this day to the end of the year; spring starts on day 1 */
export const WINTER_START_DAY = 265;
/** Days in the year */
export const YEAR_DAYS = 365;
/** What hiring the Beekeeper costs, in honey */
export const BEEKEEPER_HIRE_COST = 750;

export type BeeUpgradeGroupId = 'speed' | 'amount' | 'golden' | 'crops' | 'winter' | 'kitchen';

/** The upgrades by what they improve, in the order the tab lists them */
export const BEE_UPGRADE_GROUPS: ReadonlyArray<{ id: BeeUpgradeGroupId; title: string; ids: readonly string[] }> = [
  { id: 'speed', title: 'Speed', ids: ['busy_bees', 'swift_gatherers'] },
  { id: 'amount', title: 'Honey a batch', ids: ['hexcomb_engineering', 'nectar_efficiency'] },
  { id: 'golden', title: 'Golden Honey', ids: ['royal_jelly', 'queens_blessing', 'golden_touch'] },
  { id: 'crops', title: 'Crops', ids: ['meadow_magic', 'flower_power'] },
  { id: 'winter', title: 'Winter', ids: ['winter_hardiness'] },
  { id: 'kitchen', title: 'Kitchen', ids: ['honey_jars'] }
];

/** A hive count that opens something, for the comb's empty cells */
export interface HiveMilestone {
  hives: number;
  name: string;
  icon: string;
}

/** The Beekeeper at 4 hives, then each upgrade that needs a number of hives */
export const HIVE_MILESTONES: readonly HiveMilestone[] = [
  { hives: BEE_CONSTANTS.BEEKEEPER_ASSISTANT_UNLOCK_BOXES, name: 'Beekeeper', icon: BEE_BEEKEEPER },
  ...INITIAL_BEE_UPGRADES
    .filter(upgrade => upgrade.requiredBoxes !== undefined)
    .map(upgrade => ({ hives: upgrade.requiredBoxes as number, name: upgrade.name, icon: upgrade.icon }))
].sort((a, b) => a.hives - b.hives);

/** A share as a percent, with one decimal only when it needs one: 0.07 is "7%", 0.105 "10.5%" */
export function percent(share: number): string {
  const value = Math.round(share * 1000) / 10;
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}%`;
}

/** Days for a batch now and after the next level, in whole days unless both round the same */
export function dayPair(now: number, next: number): [string, string] {
  if (Math.round(now) !== Math.round(next)) return [String(Math.round(now)), String(Math.round(next))];
  return [now.toFixed(1), next.toFixed(1)];
}

/** The Beekeeper's speed bonus at a level: hired at level 0 for 10%, then 5% more a level */
export function beekeeperBonusAt(level: number): number {
  return 0.1 + level * 0.05;
}

/** How long until the bees rest for winter, or, in winter, until they wake in spring */
export function winterCountdown(day: number): { winter: boolean; days: number } {
  if (day >= WINTER_START_DAY) return { winter: true, days: YEAR_DAYS + 1 - day };
  return { winter: false, days: WINTER_START_DAY - day };
}

export type BeeUpgradeState = 'afford' | 'short' | 'owned' | 'max' | 'locked';

/** One row in the upgrades list */
export interface BeeUpgradeRow {
  upgrade: BeeUpgrade;
  /** What it does, with now and next where the level changes it */
  effect: string;
  state: BeeUpgradeState;
  /** Why it can't be bought yet, for a locked row: "10 hives" or "Needs Royal Jelly" */
  lockReason?: string;
}

/** What a row needs to work out its effect and whether it can be bought */
export interface BeeRowContext {
  upgrades: ReadonlyArray<BeeUpgrade>;
  levels: BeeLevels;
  hives: number;
  honey: number;
  goldenHoney: number;
  /** The Beekeeper's speed bonus while he works, 0 when he doesn't */
  beekeeperBonus: number;
  /** Honey per batch as a share, from the player's guild: the Engineers' bees make less */
  honeyMultiplier?: number;
}

function effectOf(upgrade: BeeUpgrade, { levels, hives, beekeeperBonus, honeyMultiplier = 1 }: BeeRowContext): string {
  const atMax = upgrade.repeatable && upgrade.maxLevel !== undefined && upgrade.level >= upgrade.maxLevel;
  switch (upgrade.id) {
    case 'busy_bees': {
      const now = batchDays(levels, beekeeperBonus);
      if (atMax) return `${Math.round(now)} days a batch`;
      const [a, b] = dayPair(now, batchDays({ ...levels, busyBees: levels.busyBees + 1 }, beekeeperBonus));
      return `${a} days a batch, next ${b}`;
    }
    case 'swift_gatherers': {
      if (levels.swiftGatherers) return 'Batches take 15% less time';
      const [a, b] = dayPair(batchDays(levels, beekeeperBonus), batchDays({ ...levels, swiftGatherers: true }, beekeeperBonus));
      return `${a} days a batch, then ${b}`;
    }
    case 'hexcomb_engineering':
      return atMax ? `+${levels.superFrames * 5}% honey` : `+${levels.superFrames * 5}% honey, next +${(levels.superFrames + 1) * 5}%`;
    case 'meadow_magic': {
      const now = percent(cropBonus(hives, levels));
      return atMax ? `Crops +${now}` : `Crops +${now}, next +${percent(cropBonus(hives, { ...levels, meadowMagic: levels.meadowMagic + 1 }))}`;
    }
    case 'flower_power':
      return levels.flowerPower
        ? 'Crops +0.2% per hive'
        : `Crops +${percent(cropBonus(hives, levels))}, then +${percent(cropBonus(hives, { ...levels, flowerPower: true }))}`;
    case 'royal_jelly':
      return levels.royalJelly
        ? '+1% chance a batch is Golden'
        : `Golden chance ${percent(goldenChance(levels))}, then ${percent(goldenChance({ ...levels, royalJelly: true }))}`;
    case 'queens_blessing':
      return levels.queensBlessing
        ? 'Doubles the Golden chance'
        : `Golden chance ${percent(goldenChance(levels))}, then ${percent(goldenChance({ ...levels, queensBlessing: true }))}`;
    case 'golden_touch':
      return levels.goldenTouch
        ? '+2% chance a batch is Golden'
        : `Golden chance ${percent(goldenChance(levels))}, then ${percent(goldenChance({ ...levels, goldenTouch: true }))}`;
    case 'nectar_efficiency':
      return levels.nectarEfficiency
        ? '+10% honey a batch'
        : `${lbsPerBatch(levels, honeyMultiplier)} lbs a batch, then ${lbsPerBatch({ ...levels, nectarEfficiency: true }, honeyMultiplier)}`;
    case 'winter_hardiness':
      return 'Bees work through winter';
    case 'honey_jars':
      return upgrade.purchased ? 'Honey jars are in the Kitchen' : 'Jar honey in the Kitchen';
    default:
      return upgrade.description;
  }
}

/** One upgrade's row: its effect, and whether it can be bought now */
export function beeUpgradeRow(upgrade: BeeUpgrade, context: BeeRowContext): BeeUpgradeRow {
  const effect = effectOf(upgrade, context);
  if (!upgrade.repeatable && upgrade.purchased) return { upgrade, effect, state: 'owned' };
  if (upgrade.repeatable && upgrade.maxLevel !== undefined && upgrade.level >= upgrade.maxLevel) return { upgrade, effect, state: 'max' };

  const bought = context.upgrades.filter(u => u.purchased).map(u => u.id);
  if (!isUpgradeUnlocked(upgrade, context.hives, bought)) {
    const missingHives = upgrade.requiredBoxes !== undefined && context.hives < upgrade.requiredBoxes;
    const missing = (upgrade.requiredUpgrades ?? [])
      .filter(id => !bought.includes(id))
      .map(id => context.upgrades.find(u => u.id === id)?.name ?? id);
    const lockReason = missingHives ? `${upgrade.requiredBoxes} hives` : `Needs ${missing.join(' and ')}`;
    return { upgrade, effect, state: 'locked', lockReason };
  }

  const wallet = upgrade.costCurrency === 'goldenHoney' ? context.goldenHoney : context.honey;
  return { upgrade, effect, state: wallet >= upgrade.cost ? 'afford' : 'short' };
}

/** The upgrade groups with their rows, skipping any upgrade the list doesn't have */
export function beeUpgradeGroups(context: BeeRowContext): Array<{ id: BeeUpgradeGroupId; title: string; rows: BeeUpgradeRow[] }> {
  return BEE_UPGRADE_GROUPS.map(group => ({
    id: group.id,
    title: group.title,
    rows: group.ids
      .map(id => context.upgrades.find(upgrade => upgrade.id === id))
      .filter((upgrade): upgrade is BeeUpgrade => upgrade !== undefined)
      .map(upgrade => beeUpgradeRow(upgrade, context))
  }));
}
