/**
 * The Spring Farmer's Market inside the whole game: the tab appears in season,
 * flowers and herbs grow on the game clock, Petals show in the header, the event is
 * saved and logged, sales earn achievements, and time away catches up.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act, screen, fireEvent, within } from '@testing-library/react';
import { useContext } from 'react';
import App from '../App';
import { GameContext } from '../context/GameContext';
import { GameProviders } from '../GameProviders';
import { GAME_STORAGE_KEY } from '../config/gameConstants';
import { featureFlags } from '../utils/featureFlags';
import { getFlowerSalePetals } from '../utils/springPricing';
import type { GameState } from '../types/game';
import type { ExtendedGameState } from '../utils/saveSystem';

let game: GameState | undefined;
const Probe = () => {
  game = useContext(GameContext);
  return null;
};

const renderGame = () => render(
  <GameProviders>
    <Probe />
    <App />
  </GameProviders>
);

/** A small save: Tier 1, a few seconds old unless told otherwise */
const seedSave = (extra: Record<string, unknown> = {}, savedSecondsAgo = 0) => {
  localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify({
    veggies: [], money: 0, experience: 0, knowledge: 0, activeVeggie: 0, day: 10, totalDaysElapsed: 9,
    farmTier: 1, maxPlots: 4, farmCost: 500, highestUnlockedVeggie: 0, harvestTutorialShown: true,
    lastSavedAt: Date.now() - savedSecondsAgo * 1000,
    ...extra
  }));
};

/** The save the game writes as the page closes */
const savedGame = () => {
  act(() => {
    window.dispatchEvent(new Event('beforeunload'));
  });
  return JSON.parse(localStorage.getItem(GAME_STORAGE_KEY)!) as ExtendedGameState;
};

const tick = (seconds: number) => {
  for (let i = 0; i < seconds; i++) {
    act(() => {
      vi.advanceTimersByTime(1000);
    });
  }
};

// Boots the whole game, which can take several seconds while other test files run in parallel
describe('Spring Market in the game', { timeout: 20_000 }, () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    featureFlags.resetFlag('springPreview');
    game = undefined;
  });

  it('shows the tab in season, grows flowers and herbs on the clock, and saves them', () => {
    vi.setSystemTime(new Date(2027, 3, 15, 12, 0, 0));
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify({
      veggies: [], money: 0, experience: 0, knowledge: 0, activeVeggie: 0, day: 10, totalDaysElapsed: 9,
      farmTier: 1, maxPlots: 4, farmCost: 500, highestUnlockedVeggie: 0, harvestTutorialShown: true,
      lastSavedAt: Date.now()
    }));
    renderGame();

    fireEvent.click(screen.getByRole('tab', { name: /Spring Market/ }));
    const sections = screen.getByRole('tablist', { name: 'Spring Market sections' });
    expect(within(sections).getAllByRole('tab')).toHaveLength(4);
    expect(screen.getByText(/Petals: 0/)).toBeInTheDocument();

    act(() => {
      game!.springEvent.plantFlower(0, 'tulip');
    });
    tick(5);
    expect(game!.springEvent.beds[0].growth).toBeGreaterThanOrEqual(4);
    expect(game!.springEvent.herbs.mint.growth).toBeGreaterThanOrEqual(4);
    expect(game!.springEvent.daysUntilMarket).toBeLessThanOrEqual(56);

    // Each section renders without falling into an error boundary
    for (const name of [/Herb Garden/, /Potting Shed/, /Market Stall/, /Flower Beds/]) {
      fireEvent.click(within(sections).getByRole('tab', { name }));
      expect(screen.queryByText(/Something went wrong/i)).toBeNull();
    }

    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });
    const saved = JSON.parse(localStorage.getItem(GAME_STORAGE_KEY)!) as ExtendedGameState;
    expect(saved.springEventState?.beds[0].variety).toBe('tulip');
    expect(saved.springEventState?.beds[0].growth).toBeGreaterThanOrEqual(4);
    expect(saved.springEventState?.herbs.mint.growth).toBeGreaterThanOrEqual(4);
  });

  it('hides the tab out of season and leaves the beds alone', () => {
    vi.setSystemTime(new Date(2026, 9, 29, 12, 0, 0));
    renderGame();

    expect(screen.queryByRole('tab', { name: /Spring Market/ })).toBeNull();
    expect(screen.queryByText(/Petals:/)).toBeNull();
    act(() => {
      game!.springEvent.plantFlower(0, 'tulip');
    });
    tick(3);
    expect(game!.springEvent.beds[0].growth).toBe(0);
  });

  it('opens out of season in dev with the Spring Market Preview flag', () => {
    vi.setSystemTime(new Date(2026, 9, 29, 12, 0, 0));
    featureFlags.setFlag('springPreview', true);
    renderGame();

    fireEvent.click(screen.getByRole('tab', { name: /Spring Market/ }));
    expect(screen.getByRole('tablist', { name: 'Spring Market sections' })).toBeInTheDocument();
    act(() => {
      game!.springEvent.plantFlower(0, 'tulip');
    });
    tick(3);
    expect(game!.springEvent.beds[0].growth).toBeGreaterThanOrEqual(2);
    featureFlags.resetFlag('springPreview');
  });

  it('logs a sale, and the first bunch sold earns Stall\'s Open and its Petals', () => {
    vi.setSystemTime(new Date(2027, 3, 15, 12, 0, 0));
    seedSave({ springEventState: { inventory: { tulip_normal_plain: 1 } } });
    renderGame();

    const price = getFlowerSalePetals('tulip_normal_plain', 1, game!.springEvent.eventState.upgrades, game!.springEvent.demandMultiplier);
    act(() => {
      game!.springEvent.sellFlowers('tulip_normal_plain', 1);
    });
    tick(2);

    expect(game!.springEvent.petals).toBe(price + 50);
    const saved = savedGame();
    expect(saved.achievementState?.achievements.find(a => a.id === 'spring_first_sale')?.unlocked).toBe(true);
    const springLines = saved.eventLogState?.entries.filter(entry => entry.category === 'spring') ?? [];
    expect(springLines.map(entry => entry.message)).toContain('Sold 1 Tulip');
    expect(springLines.find(entry => entry.message === 'Sold 1 Tulip')?.details).toBe(`Earned ${price} Petals`);
  });

  it('catches up an hour away: beds ripen, herbs fill to their cap, and Market Day sells the Cart', () => {
    vi.setSystemTime(new Date(2027, 3, 15, 12, 0, 0));
    seedSave({
      springEventState: {
        beds: [{ id: 'flower_bed_0', variety: 'tulip', growth: 0, growthTime: 150, quality: 'normal', harvestReady: false }],
        cart: { bunches: { tulip_normal_bouquet: 2 }, goods: { pesto: 1 } },
      }
    }, 60 * 60);
    renderGame();
    tick(1);

    expect(game!.springEvent.beds[0].harvestReady).toBe(true);
    expect(game!.springEvent.herbs.mint).toEqual({ sprigs: 10, growth: 0 });
    expect(game!.springEvent.cart).toEqual({ bunches: {}, goods: {} });
    expect(game!.springEvent.totalFlowersSold).toBe(2);
    expect(game!.springEvent.petals).toBeGreaterThan(0);
    const springLines = savedGame().eventLogState?.entries.filter(entry => entry.category === 'spring') ?? [];
    expect(springLines.map(entry => entry.message)).toContain('Market Day: sold 2 bunches and 1 good from the Cart');
  });

  it('opens and closes out of season from the Dev Tools switch, with Petals to spend', async () => {
    vi.setSystemTime(new Date(2026, 9, 29, 12, 0, 0));
    renderGame();
    // Dev Tools loads lazily
    await act(async () => {
      await vi.dynamicImportSettled();
    });
    expect(screen.queryByRole('tab', { name: /Spring Market/ })).toBeNull();

    fireEvent.click(screen.getByTitle('Developer Tools'));
    const toggle = screen.getByRole('checkbox', { name: /Play it now, out of season/ });
    expect(toggle).not.toBeChecked();
    expect(screen.queryByRole('button', { name: '+1K Petals' })).toBeNull();

    fireEvent.click(toggle);
    expect(screen.getByRole('tab', { name: /Spring Market/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '+1K Petals' }));
    expect(game!.springEvent.petals).toBe(1000);
    expect(screen.getByText(/Petals: 1/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: /Play it now, out of season/ }));
    expect(screen.queryByRole('tab', { name: /Spring Market/ })).toBeNull();
  });
});
