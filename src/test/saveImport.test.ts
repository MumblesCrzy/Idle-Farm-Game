import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GAME_STORAGE_KEY } from '../config/gameConstants';
import { CURRENT_SAVE_VERSION } from '../utils/migrations/registry';
import { validateSaveData } from '../utils/validation';

// saveSystem blocks saves after an import until the page reloads, using a module-level
// flag, so each test loads a fresh copy of the module.
const loadSaveSystem = async () => {
  vi.resetModules();
  return import('../utils/saveSystem');
};

/** A minimal save from before version stamps were written. */
const oldExport = {
  veggies: [],
  money: 500,
  experience: 0,
  knowledge: 0,
  activeVeggie: 0,
  day: 42,
  greenhouseOwned: false,
  heirloomOwned: false,
  autoSellOwned: false,
  almanacLevel: 0,
  almanacCost: 10,
  maxPlots: 4,
  farmTier: 1,
  farmCost: 500,
  irrigationOwned: false,
  currentWeather: 'Clear',
  highestUnlockedVeggie: 0
};

describe('importing a save', () => {
  beforeEach(() => localStorage.clear());

  it('runs the migrations an older export needs on the next load', async () => {
    const save = await loadSaveSystem();
    save.importGameState(oldExport);

    const loaded = save.loadGameStateWithCanning();

    // Migration v7 fills totalDaysElapsed from day, and v4 adds achievement state
    expect(loaded?.totalDaysElapsed).toBe(42);
    expect(loaded?.achievementState).toBeDefined();
  });

  it('blocks saves until the page reloads, so the import is not overwritten', async () => {
    const save = await loadSaveSystem();
    save.importGameState(oldExport);
    const stored = localStorage.getItem(GAME_STORAGE_KEY);

    save.saveGameStateWithCanning({ ...oldExport, money: 1 });

    expect(localStorage.getItem(GAME_STORAGE_KEY)).toBe(stored);
  });

  it('accepts farm tiers above 10', () => {
    const farmTierErrors = (farmTier: number) =>
      validateSaveData({ ...oldExport, farmTier }).errors.filter(e => /farm tier/i.test(e));

    expect(farmTierErrors(15)).toEqual([]);
    expect(farmTierErrors(0)).toHaveLength(1);
  });
});

describe('loading a save', () => {
  beforeEach(() => localStorage.clear());

  it('backs up the original before migrating it', async () => {
    const save = await loadSaveSystem();
    const raw = JSON.stringify(oldExport);
    localStorage.setItem(GAME_STORAGE_KEY, raw);

    save.loadGameStateWithCanning();

    expect(localStorage.getItem(save.SAVE_BACKUP_KEY)).toBe(raw);
  });

  it('backs up a save it cannot read instead of leaving it for autosave to replace', async () => {
    const save = await loadSaveSystem();
    localStorage.setItem(GAME_STORAGE_KEY, 'not json');

    expect(save.loadGameStateWithCanning()).toBeNull();
    expect(localStorage.getItem(save.SAVE_BACKUP_KEY)).toBe('not json');
  });

  it('restores Frost Fertilizer for players who earned it', async () => {
    const save = await loadSaveSystem();
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify({
      ...oldExport,
      _saveVersion: CURRENT_SAVE_VERSION,
      permanentBonuses: [],
      achievementState: {
        achievements: [{ id: 'frost_fertilizer', unlocked: true }],
        totalUnlocked: 1,
        lastUnlockedId: null
      }
    }));

    expect(save.loadGameStateWithCanning()?.permanentBonuses).toContain('frost_fertilizer');
  });
});
