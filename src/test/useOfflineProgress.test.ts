/**
 * Tests for useOfflineProgress
 *
 * Covers the startup catch-up (from the save's timestamp) and the hidden-tab
 * catch-up (from the moment the tab was hidden), and that the two never
 * count the same time twice.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOfflineProgress, LAST_ACTIVE_KEY, type UseOfflineProgressDeps } from '../hooks/useOfflineProgress';
import { calculateOfflineProgress, type OfflineProgressResult } from '../utils/offlineProgress';
import { saveGameStateWithCanning, type ExtendedGameState } from '../utils/saveSystem';
import { DEFAULT_GUILD_STATE, type GuildState } from '../types/guilds';
import { GUILDS_UNLOCK_TIER } from '../data/guildData';
import { commitToGuild } from '../utils/guildCalculations';
import type { UseChristmasEventReturn } from '../hooks/useChristmasEvent';

vi.mock('../utils/offlineProgress', () => ({
  calculateOfflineProgress: vi.fn()
}));

vi.mock('../utils/saveSystem', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../utils/saveSystem')>()),
  saveGameStateWithCanning: vi.fn()
}));

const NOW = new Date(2026, 5, 1, 12, 0, 0).getTime();
const TEN_MINUTES = 10 * 60 * 1000;

const simulated = (overrides: Partial<OfflineProgressResult> = {}): OfflineProgressResult => ({
  timeElapsed: TEN_MINUTES,
  veggies: [],
  experienceGain: 30,
  knowledgeGain: 5,
  autoHarvests: 0,
  day: 50,
  totalDaysElapsed: 649,
  canningProgressUpdates: new Map(),
  autoCanningProcessed: 0,
  christmasTreeGrowthTicks: 0,
  christmasElvesCraftingTicks: 0,
  christmasPassiveCheerGain: 0,
  ...overrides
});

const christmasEvent = (overrides: Partial<UseChristmasEventReturn> = {}) => ({
  isEventActive: false,
  passiveCheerPerSecond: 0,
  eventState: { upgrades: [] },
  processTreeGrowth: vi.fn(),
  processDailyElvesCrafting: vi.fn(),
  updatePassiveIncome: vi.fn(),
  ...overrides
}) as unknown as UseChristmasEventReturn;

const savedGame = (overrides: Partial<ExtendedGameState> = {}): ExtendedGameState => ({
  veggies: [],
  money: 0,
  experience: 100,
  knowledge: 20,
  activeVeggie: 0,
  day: 10,
  totalDaysElapsed: 9,
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
  highestUnlockedVeggie: 0,
  lastSavedAt: NOW - TEN_MINUTES,
  ...overrides
});

const createDeps = (overrides: Partial<UseOfflineProgressDeps> = {}): UseOfflineProgressDeps => ({
  loaded: null,
  state: {
    veggies: [],
    day: 10,
    totalDaysElapsed: 9,
    season: 'Spring',
    currentWeather: 'Clear',
    greenhouseOwned: false,
    irrigationOwned: false,
    almanacLevel: 0,
    farmTier: 1,
    knowledge: 20,
    guildState: DEFAULT_GUILD_STATE,
    christmasEvent: christmasEvent()
  },
  isPaused: false,
  setVeggies: vi.fn(),
  setExperience: vi.fn(),
  setKnowledge: vi.fn(),
  setDay: vi.fn(),
  setTotalDaysElapsed: vi.fn(),
  setGuildState: vi.fn(),
  ...overrides
});

const setHidden = (hidden: boolean) => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event('visibilitychange'));
};

describe('useOfflineProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.mocked(calculateOfflineProgress).mockReturnValue(simulated());
  });

  afterEach(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    vi.useRealTimers();
  });

  describe('startup catch-up', () => {
    it('applies the time since the save was written, once', () => {
      const deps = createDeps({ loaded: savedGame() });
      renderHook(() => useOfflineProgress(deps));

      expect(calculateOfflineProgress).toHaveBeenCalledTimes(1);
      expect(vi.mocked(calculateOfflineProgress).mock.calls[0][0]).toBe(TEN_MINUTES);
      expect(deps.setExperience).toHaveBeenCalledTimes(1);
      expect(vi.mocked(deps.setExperience).mock.calls[0][0]).toBeTypeOf('function');
      expect(deps.setDay).toHaveBeenCalledWith(50);
      expect(deps.setKnowledge).toHaveBeenCalledTimes(1);
    });

    it('does not count time twice when an old hidden-tab timestamp is also stored', () => {
      localStorage.setItem(LAST_ACTIVE_KEY, String(NOW - TEN_MINUTES));
      const deps = createDeps({ loaded: savedGame() });

      renderHook(() => useOfflineProgress(deps));

      expect(calculateOfflineProgress).toHaveBeenCalledTimes(1);
    });

    it('saves right away so a reload cannot apply the same time again', () => {
      const deps = createDeps({ loaded: savedGame() });
      renderHook(() => useOfflineProgress(deps));

      expect(saveGameStateWithCanning).toHaveBeenCalledWith(
        expect.objectContaining({ experience: 130, knowledge: 25, day: 50, totalDaysElapsed: 649 })
      );
    });

    it('uses the saved weather', () => {
      const deps = createDeps({ loaded: savedGame({ currentWeather: 'Drought' }) });
      renderHook(() => useOfflineProgress(deps));

      expect(vi.mocked(calculateOfflineProgress).mock.calls[0][1].currentWeather).toBe('Drought');
    });

    it('does nothing for a new game', () => {
      renderHook(() => useOfflineProgress(createDeps()));

      expect(calculateOfflineProgress).not.toHaveBeenCalled();
    });

    it('does nothing when the game was saved while paused', () => {
      renderHook(() => useOfflineProgress(createDeps({ loaded: savedGame({ isPaused: true }) })));

      expect(calculateOfflineProgress).not.toHaveBeenCalled();
    });
  });

  describe('hidden-tab catch-up', () => {
    it('applies the hidden time once when the tab comes back', () => {
      const deps = createDeps();
      renderHook(() => useOfflineProgress(deps));

      setHidden(true);
      vi.setSystemTime(NOW + TEN_MINUTES);
      setHidden(false);

      expect(calculateOfflineProgress).toHaveBeenCalledTimes(1);
      expect(vi.mocked(calculateOfflineProgress).mock.calls[0][0]).toBe(TEN_MINUTES);
      expect(deps.setDay).toHaveBeenCalledWith(50);
      expect(saveGameStateWithCanning).not.toHaveBeenCalled();
    });

    it('ignores quick tab switches', () => {
      renderHook(() => useOfflineProgress(createDeps()));

      setHidden(true);
      vi.setSystemTime(NOW + 500);
      setHidden(false);

      expect(calculateOfflineProgress).not.toHaveBeenCalled();
    });

    it('does nothing while paused', () => {
      renderHook((deps: UseOfflineProgressDeps) => useOfflineProgress(deps), {
        initialProps: createDeps({ isPaused: true })
      });
      setHidden(true);
      vi.setSystemTime(NOW + TEN_MINUTES);
      setHidden(false);

      expect(calculateOfflineProgress).not.toHaveBeenCalled();
    });

    it('stops listening when unmounted', () => {
      const { unmount } = renderHook(() => useOfflineProgress(createDeps()));
      unmount();

      setHidden(true);
      vi.setSystemTime(NOW + TEN_MINUTES);
      setHidden(false);

      expect(calculateOfflineProgress).not.toHaveBeenCalled();
    });
  });

  describe('results', () => {
    it('catches up the Christmas event in one pass', () => {
      vi.mocked(calculateOfflineProgress).mockReturnValue(
        simulated({ christmasTreeGrowthTicks: 600, christmasElvesCraftingTicks: 600 })
      );
      const event = christmasEvent({
        isEventActive: true,
        passiveCheerPerSecond: 2,
        eventState: { upgrades: [{ id: 'elves_bench', owned: true }] } as unknown as UseChristmasEventReturn['eventState']
      });
      const deps = createDeps({ loaded: savedGame(), state: { ...createDeps().state, christmasEvent: event } });

      renderHook(() => useOfflineProgress(deps));

      expect(event.processTreeGrowth).toHaveBeenCalledTimes(1);
      expect(event.processTreeGrowth).toHaveBeenCalledWith(600);
      expect(event.processDailyElvesCrafting).toHaveBeenCalledWith(600);
      expect(event.updatePassiveIncome).toHaveBeenCalledWith(TEN_MINUTES);
    });

    it('pays Guild Tokens for the auto harvests', () => {
      vi.mocked(calculateOfflineProgress).mockReturnValue(simulated({ autoHarvests: 25 }));
      const deps = createDeps({ loaded: savedGame(), state: { ...createDeps().state, farmTier: GUILDS_UNLOCK_TIER } });

      renderHook(() => useOfflineProgress(deps));

      expect(deps.setGuildState).toHaveBeenCalledTimes(1);
      const update = vi.mocked(deps.setGuildState).mock.calls[0][0] as (prev: GuildState) => GuildState;
      expect(update(DEFAULT_GUILD_STATE).guildTokens).toBe(2);
    });

    it('makes committed Engineers Gears from the auto harvests', () => {
      vi.mocked(calculateOfflineProgress).mockReturnValue(simulated({ autoHarvests: 25 }));
      const deps = createDeps({ loaded: savedGame(), state: { ...createDeps().state, farmTier: GUILDS_UNLOCK_TIER } });

      renderHook(() => useOfflineProgress(deps));

      const update = vi.mocked(deps.setGuildState).mock.calls[0][0] as (prev: GuildState) => GuildState;
      const member = update(commitToGuild(DEFAULT_GUILD_STATE, 'engineers', 1));
      expect(member.guildCurrencies.engineers).toBe(2);
      expect(member.gearProgress?.autoHarvests).toBe(5);
      expect(member.guildTokens).toBe(0);
    });

    it('leaves guild state alone when nothing was auto harvested', () => {
      const deps = createDeps({ loaded: savedGame() });

      renderHook(() => useOfflineProgress(deps));

      expect(deps.setGuildState).not.toHaveBeenCalled();
    });
  });
});
