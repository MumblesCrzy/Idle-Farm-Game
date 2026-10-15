import { describe, it, expect } from 'vitest';
import { calculateOfflineProgress } from '../utils/offlineProgress';
import { processVeggieGrowth, processAutoHarvest } from '../utils/gameLoopProcessors';
import { createInitialVeggies, getSeason } from '../utils/gameCalculations';
import type { Veggie } from '../types/game';

type OfflineState = Parameters<typeof calculateOfflineProgress>[1];

const offlineState = (veggies: Veggie[], overrides: Partial<OfflineState> = {}): OfflineState => ({
  veggies,
  day: 1,
  totalDaysElapsed: 0,
  dayLength: 1000,
  season: 'Spring',
  currentWeather: 'Clear',
  greenhouseOwned: false,
  irrigationOwned: false,
  almanacLevel: 0,
  farmTier: 1,
  knowledge: 0,
  canningProcesses: [],
  canningUpgrades: {},
  autoCanning: { enabled: false },
  ...overrides
});

/** Radish unlocked with an auto-harvester, so time away produces harvests. */
const farmWithHarvester = (): Veggie[] => {
  const [radish, ...rest] = createInitialVeggies();
  return [{ ...radish, unlocked: true, harvesterOwned: true, autoHarvesterEnabled: true }, ...rest];
};

describe('calculateOfflineProgress', () => {
  it('matches what the live game loops produce over the same time', () => {
    const veggies = farmWithHarvester();
    const seconds = 200;

    const offline = calculateOfflineProgress(seconds * 1000, offlineState(veggies));

    // Replay the live loops: one growth step and one auto-harvest step per second,
    // with one in-game day passing each second
    let live = veggies;
    let experience = 0;
    let knowledge = 0;
    for (let i = 0; i < seconds; i++) {
      live = processVeggieGrowth(live, getSeason(1 + i), 'Clear', false, false).veggies;
      const harvest = processAutoHarvest(live, 0, 1, knowledge);
      if (harvest.needsUpdate) {
        live = harvest.veggies;
        experience += harvest.experienceGain;
        knowledge += harvest.knowledgeGain;
      }
    }

    expect(offline.veggies).toEqual(live);
    expect(offline.experienceGain).toBeCloseTo(experience);
    expect(offline.knowledgeGain).toBeCloseTo(knowledge);
    expect(offline.day).toBe(1 + seconds);
  });

  it('wraps the day at 365 like the live game, so seasons keep cycling', () => {
    const result = calculateOfflineProgress(3 * 1000, offlineState(farmWithHarvester(), { day: 364 }));

    // 364 -> 365 -> 1 -> 2
    expect(result.day).toBe(2);
    expect(result.totalDaysElapsed).toBe(3);
  });

  it('keeps a long absence out of permanent winter', () => {
    // Two years away should yield about twice one year, instead of staying in winter after day 265
    const yearAway = calculateOfflineProgress(365 * 2 * 1000, offlineState(farmWithHarvester()));
    const firstYearOnly = calculateOfflineProgress(365 * 1000, offlineState(farmWithHarvester()));

    const ratio = yearAway.veggies[0].stash / firstYearOnly.veggies[0].stash;
    expect(ratio).toBeGreaterThan(1.8);
  });

  it('credits the same rate below and above one hour away', () => {
    const veggies = farmWithHarvester();
    // A greenhouse removes the winter slowdown, so the rate is even across seasons
    const halfHour = calculateOfflineProgress(30 * 60 * 1000, offlineState(veggies, { greenhouseOwned: true }));
    const twoHours = calculateOfflineProgress(2 * 60 * 60 * 1000, offlineState(veggies, { greenhouseOwned: true }));

    expect(halfHour.veggies[0].stash).toBeGreaterThan(0);
    // Four times as long away should yield about four times the harvest
    const ratio = twoHours.veggies[0].stash / halfHour.veggies[0].stash;
    expect(ratio).toBeGreaterThan(3.8);
    expect(ratio).toBeLessThan(4.2);
  });
});
