/**
 * Queen's Court: every bee upgrade bought and the Beekeeper hired. It used to check five
 * upgrades, so Queen's Blessing earned it while five more were still unbought.
 */
import { describe, it, expect } from 'vitest';
import { INITIAL_ACHIEVEMENTS } from '../data/achievements';
import { createInitialBeeUpgrades } from '../data/beeUpgrades';
import type { AchievementGameState } from '../types/achievements';
import type { BeeState } from '../types/bees';

const court = INITIAL_ACHIEVEMENTS.find(a => a.id === 'queens_court')!;
const ALL = createInitialBeeUpgrades().map(upgrade => upgrade.id);

/** A farm whose bees have these upgrades bought once, with the Beekeeper hired or not */
const withBees = (bought: string[], beekeeper: boolean): AchievementGameState => ({
  money: 0,
  experience: 0,
  knowledge: 0,
  veggiesUnlocked: 0,
  canningItemsTotal: 0,
  farmTier: 4,
  beeState: {
    upgrades: createInitialBeeUpgrades().map(upgrade =>
      bought.includes(upgrade.id) ? { ...upgrade, purchased: true, level: 1 } : upgrade
    ),
    beekeeperAssistant: { unlocked: beekeeper }
  } as unknown as BeeState
});

describe("Queen's Court", () => {
  it('asks for every bee upgrade and the Beekeeper', () => {
    expect(court.description).toBe('Purchase all bee upgrades and the Beekeeper');
  });

  it("isn't earned by Queen's Blessing and the first upgrades alone", () => {
    const firstFive = ['busy_bees', 'royal_jelly', 'hexcomb_engineering', 'meadow_magic', 'queens_blessing'];
    expect(court.requirement.customCheck!(withBees(firstFive, true))).toBe(false);
  });

  it('needs all eleven upgrades and the Beekeeper, one level of each is enough', () => {
    expect(ALL).toHaveLength(11);
    expect(court.requirement.customCheck!(withBees(ALL, false))).toBe(false);
    expect(court.requirement.customCheck!(withBees(ALL.filter(id => id !== 'swift_gatherers'), true))).toBe(false);
    expect(court.requirement.customCheck!(withBees(ALL.filter(id => id !== 'honey_jars'), true))).toBe(false);
    expect(court.requirement.customCheck!(withBees(ALL, true))).toBe(true);
  });

  it('shows how many are bought', () => {
    expect(court.requirement.value).toBe(12);
    expect(court.requirement.getProgress!(withBees([], false))).toBe(0);
    expect(court.requirement.getProgress!(withBees(['royal_jelly', 'queens_blessing'], true))).toBe(3);
  });
});
