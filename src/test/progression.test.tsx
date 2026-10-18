/**
 * Whole-game progression test.
 *
 * Renders the full game from a mid-game save, runs two minutes of game time,
 * then forces the close-tab save and checks that every system moved forward:
 * days, crop growth and auto-harvest, the merchant, bees, canning and the
 * Christmas event. A memoization or clock change that leaves any of them stale
 * fails here.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { useContext } from 'react';
import App, { GameContext } from '../App';
import { GameProviders } from '../GameProviders';
import { GAME_STORAGE_KEY } from '../config/gameConstants';
import { loadGameStateWithCanning, type ExtendedGameState } from '../utils/saveSystem';
import { createAllCrops } from '../utils/gameCalculations';
import type { GameState } from '../types/game';

// November, so the Christmas event is active
const START = new Date(2026, 10, 15, 12, 0, 0).getTime();
const SECONDS = 120;

let game: GameState | undefined;
const Probe = () => {
  game = useContext(GameContext);
  return null;
};

const renderGame = () =>
  render(
    <GameProviders>
      <Probe />
      <App />
    </GameProviders>
  );

/** A tier-5 farm: radish ready to auto-harvest, merchant owned, one bee box, one canning job running */
const midGameSave = (): ExtendedGameState => {
  const crops = createAllCrops();
  crops[0] = { ...crops[0], unlocked: true, growth: 90, harvesterOwned: true, autoHarvesterEnabled: true, harvesterTimer: 45 };

  // Let the loader fill canning state, then start one job
  localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify({
    veggies: crops,
    money: 1000,
    experience: 5000,
    knowledge: 500,
    activeVeggie: 0,
    day: 40,
    totalDaysElapsed: 39,
    greenhouseOwned: true,
    heirloomOwned: false,
    autoSellOwned: true,
    almanacLevel: 0,
    almanacCost: 10,
    maxPlots: 20,
    farmTier: 5,
    farmCost: 50000,
    irrigationOwned: false,
    currentWeather: 'Clear',
    highestUnlockedVeggie: 0,
    harvestTutorialShown: true,
    guildIntroShown: true,
    _saveVersion: 8,
    lastSavedAt: START
  }));
  const base = loadGameStateWithCanning()!;
  const recipe = base.canningState!.recipes[0];
  return {
    ...base,
    canningState: {
      ...base.canningState!,
      recipes: base.canningState!.recipes.map(r => r.id === recipe.id ? { ...r, unlocked: true } : r),
      activeProcesses: [{ recipeId: recipe.id, startTime: START, remainingTime: 5, totalTime: 30, completed: false }]
    },
    beeState: {
      ...base.beeState!,
      unlocked: true,
      firstTimeSetup: true,
      boxes: [{
        id: 'box_1', active: true, productionTimer: 0, productionTime: 132,
        honeyProduced: 0, lastHarvestTime: START, harvestReady: false
      }],
      lastUpdateTime: START
    },
    lastSavedAt: START
  };
};

/** Forces the close-tab save and reads it back */
const savedGame = (): ExtendedGameState => {
  window.dispatchEvent(new Event('beforeunload'));
  return JSON.parse(localStorage.getItem(GAME_STORAGE_KEY)!);
};

// Boots the whole game, which can take several seconds while other test files run in parallel
describe('game progression', { timeout: 20_000 }, () => {
  beforeEach(() => {
    localStorage.clear();
    game = undefined;
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date',
        'requestAnimationFrame', 'cancelAnimationFrame', 'performance']
    });
    vi.setSystemTime(START);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('advances every system over two minutes of play', () => {
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(midGameSave()));
    renderGame();
    expect(game).toBeDefined();

    // Plant a Christmas tree to watch it grow
    act(() => {
      game!.christmasEvent!.plantTree(0, 'pine');
    });

    for (let i = 0; i < SECONDS; i++) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }

    const saved = savedGame();

    // Days: one per second
    expect(saved.totalDaysElapsed).toBeGreaterThanOrEqual(39 + SECONDS - 5);

    // Crops: the radish kept growing and the auto-harvester kept harvesting
    const harvestEvents = saved.eventLogState?.entries.filter(e => e.category === 'harvest') ?? [];
    expect(harvestEvents.length).toBeGreaterThanOrEqual(2);
    expect(saved.experience).toBeGreaterThan(5000);

    // Merchant: sold the stash on merchant days
    const merchantEvents = saved.eventLogState?.entries.filter(e => e.category === 'merchant') ?? [];
    expect(merchantEvents.length).toBeGreaterThanOrEqual(1);
    expect(saved.money).toBeGreaterThan(1000);

    // Canning: the running job finished
    expect(saved.canningState?.activeProcesses).toHaveLength(0);
    expect(saved.canningState?.totalItemsCanned).toBeGreaterThanOrEqual(1);

    // Bees: the box kept producing
    expect(saved.beeState?.boxes[0].productionTimer).toBeGreaterThan(100);

    // Christmas: the planted tree grew
    expect(saved.christmasEventState?.treePlots[0].growth).toBeGreaterThan(100);
  });

  it('stops advancing while paused', () => {
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(midGameSave()));
    renderGame();

    act(() => {
      game!.setIsPaused(true);
    });
    const dayWhenPaused = game!.totalDaysElapsed;
    const growthWhenPaused = game!.veggies[0].growth;

    for (let i = 0; i < 10; i++) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }

    expect(game!.totalDaysElapsed).toBe(dayWhenPaused);
    expect(game!.veggies[0].growth).toBe(growthWhenPaused);

    // Bees don't get credit for the paused time after unpausing
    act(() => {
      game!.setIsPaused(false);
    });
    for (let i = 0; i < 2; i++) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }
    expect(savedGame().beeState?.boxes[0].productionTimer).toBeLessThan(5);
  });
});
