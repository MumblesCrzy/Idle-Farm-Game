/**
 * The world-record giant: champion seeds from County Fair wins make Atlantic Giants heavier, so
 * a Blue Ribbon giant with every bonus can beat the real 3,156 lb record and earn a hidden
 * achievement. Without them, giants stop at 2,400 lb.
 */
import { describe, it, expect } from 'vitest';
import { championSeedBonus, rollGiantWeight } from '../utils/pumpkinPricing';
import { PUMPKIN_EVENT_CONSTANTS as C } from '../data/pumpkinEventData';
import { INITIAL_ACHIEVEMENTS } from '../data/achievements';
import type { AchievementGameState } from '../types/achievements';

const record = INITIAL_ACHIEVEMENTS.find(a => a.id === 'pumpkin_world_record')!;

const withGiant = (heaviestGiant: number): AchievementGameState => ({
  money: 0,
  experience: 0,
  knowledge: 0,
  veggiesUnlocked: 0,
  canningItemsTotal: 0,
  farmTier: 1,
  heaviestGiant
});

const MAX_TONIC = 10;

describe('champion seeds', () => {
  it('add 5% giant weight for each County Fair win, up to 40%', () => {
    expect(championSeedBonus(0)).toBe(0);
    expect(championSeedBonus(3)).toBeCloseTo(0.15);
    expect(championSeedBonus(8)).toBeCloseTo(0.4);
    expect(championSeedBonus(30)).toBeCloseTo(0.4);
  });

  it('make the world record possible, but only with everything at its best', () => {
    // Without them the heaviest giant stops at 2,400 lb
    expect(rollGiantWeight('blueRibbon', MAX_TONIC, 1)).toBe(2400);

    // Six wins are not enough; eight are, with a Blue Ribbon giant and a top roll
    expect(rollGiantWeight('blueRibbon', MAX_TONIC, 1, championSeedBonus(6))).toBeLessThanOrEqual(C.WORLD_RECORD_WEIGHT);
    expect(rollGiantWeight('blueRibbon', MAX_TONIC, 1, championSeedBonus(8))).toBeGreaterThan(C.WORLD_RECORD_WEIGHT);
    expect(rollGiantWeight('normal', MAX_TONIC, 1, championSeedBonus(8))).toBeLessThan(C.WORLD_RECORD_WEIGHT);

    // About the top tenth of rolls does it
    expect(rollGiantWeight('blueRibbon', MAX_TONIC, 0.91, championSeedBonus(8))).toBeGreaterThan(C.WORLD_RECORD_WEIGHT);
    expect(rollGiantWeight('blueRibbon', MAX_TONIC, 0.9, championSeedBonus(8))).toBeLessThanOrEqual(C.WORLD_RECORD_WEIGHT);
  });
});

describe('the New World Record achievement', () => {
  it('stays hidden until earned', () => {
    expect(record.hidden).toBe(true);
    expect(record.description).toContain('3,156 lb');
  });

  it('needs a giant heavier than the record, not one that ties it', () => {
    expect(record.requirement.customCheck!(withGiant(0))).toBe(false);
    expect(record.requirement.customCheck!(withGiant(C.WORLD_RECORD_WEIGHT))).toBe(false);
    expect(record.requirement.customCheck!(withGiant(C.WORLD_RECORD_WEIGHT + 1))).toBe(true);
  });
});
