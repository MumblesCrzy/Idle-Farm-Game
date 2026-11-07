/**
 * The Summer Watermelon Festival inside the whole game: the tab appears in season,
 * melons grow and the Challenge Board counts down on the game clock, Tickets show in
 * the header, a Heatwave reaches the stall prices, the event is saved and logged, sales
 * earn achievements, a Dunk Tank tip shows a toast, and time away catches up without the board.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act, screen, fireEvent, within } from '@testing-library/react';
import { useContext } from 'react';
import App from '../App';
import { GameContext } from '../context/GameContext';
import { GameProviders } from '../GameProviders';
import { GAME_STORAGE_KEY } from '../config/gameConstants';
import { featureFlags } from '../utils/featureFlags';
import { getMelonSaleTickets } from '../utils/summerPricing';
import { ALL_SUMMER_UPGRADES } from '../data/summerEventData';
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

/** The festival's lines in the saved event log */
const summerLines = (saved: ExtendedGameState) =>
  saved.eventLogState?.entries.filter(entry => entry.category === 'summer') ?? [];

/** Saved upgrades with these owned, on top of the ones owned from the start */
const owning = (...ids: string[]) =>
  ALL_SUMMER_UPGRADES.map(u => ({ ...u, owned: u.owned || ids.includes(u.id) }));

const tick = (seconds: number) => {
  for (let i = 0; i < seconds; i++) {
    act(() => {
      vi.advanceTimersByTime(1000);
    });
  }
};

// Boots the whole game, which can take several seconds while other test files run in parallel
describe('Summer Festival in the game', { timeout: 20_000 }, () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    featureFlags.resetFlag('summerPreview');
    game = undefined;
  });

  it('shows the tab in season, grows melons and runs the board on the clock, and saves them', () => {
    vi.setSystemTime(new Date(2027, 6, 10, 12, 0, 0));
    seedSave();
    renderGame();

    fireEvent.click(screen.getByRole('tab', { name: /Summer Festival/ }));
    const sections = screen.getByRole('tablist', { name: 'Summer Festival sections' });
    expect(within(sections).getAllByRole('tab')).toHaveLength(4);
    expect(screen.getByText(/Tickets: 0/)).toBeInTheDocument();

    act(() => {
      game!.summerEvent.plantMelon(0, 'sugarBaby');
    });
    tick(5);
    expect(game!.summerEvent.plots[0].growth).toBeGreaterThanOrEqual(4);
    // The board opened on the first live day and has been counting down since
    const board = game!.summerEvent.board;
    expect(board.challenges).toHaveLength(3);
    expect(board.challenges[0].daysLeft).toBeLessThanOrEqual(361);

    // Each section renders without falling into an error boundary
    for (const name of [/Juice Stand/, /Festival Grounds/, /Challenge Board/, /Melon Patch/]) {
      fireEvent.click(within(sections).getByRole('tab', { name }));
      expect(screen.queryByText(/Something went wrong/i)).toBeNull();
    }

    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });
    const saved = JSON.parse(localStorage.getItem(GAME_STORAGE_KEY)!) as ExtendedGameState;
    expect(saved.summerEventState?.plots[0].variety).toBe('sugarBaby');
    expect(saved.summerEventState?.plots[0].growth).toBeGreaterThanOrEqual(4);
    expect(saved.summerEventState?.board.challenges).toHaveLength(3);
  });

  it('carries a saved board on from where it was', () => {
    vi.setSystemTime(new Date(2027, 6, 10, 12, 0, 0));
    seedSave({
      summerEventState: {
        tickets: 40,
        board: {
          challenges: [{ id: 'challenge_7', kind: 'spitting', length: 365, daysLeft: 50, score: 27, rivalFinals: [24, 29, 22], spitsLeft: 4 }],
          challengesOpened: 8,
        },
      },
    });
    renderGame();

    expect(game!.summerEvent.tickets).toBe(40);
    tick(1);
    const challenges = game!.summerEvent.board.challenges;
    expect(challenges[0]).toMatchObject({ id: 'challenge_7', kind: 'spitting', score: 27, spitsLeft: 4 });
    expect(challenges[0].daysLeft).toBe(49);
    // The two empty slots filled with other kinds, a year long
    expect(challenges).toHaveLength(3);
    expect(challenges.slice(1).every(c => c.kind !== 'spitting' && c.length === 365)).toBe(true);
  });

  it('hides the tab out of season and leaves the patch and board alone', () => {
    vi.setSystemTime(new Date(2026, 10, 3, 12, 0, 0));
    renderGame();

    expect(screen.queryByRole('tab', { name: /Summer Festival/ })).toBeNull();
    expect(screen.queryByText(/Tickets:/)).toBeNull();
    act(() => {
      game!.summerEvent.plantMelon(0, 'sugarBaby');
    });
    tick(3);
    expect(game!.summerEvent.plots[0].growth).toBe(0);
    expect(game!.summerEvent.board.challenges).toHaveLength(0);
  });

  it('opens out of season in dev with the Summer Festival Preview flag', () => {
    vi.setSystemTime(new Date(2026, 10, 3, 12, 0, 0));
    featureFlags.setFlag('summerPreview', true);
    renderGame();

    fireEvent.click(screen.getByRole('tab', { name: /Summer Festival/ }));
    expect(screen.getByRole('tablist', { name: 'Summer Festival sections' })).toBeInTheDocument();
    act(() => {
      game!.summerEvent.plantMelon(0, 'sugarBaby');
    });
    tick(3);
    expect(game!.summerEvent.plots[0].growth).toBeGreaterThanOrEqual(2);
  });

  it('tells the event about a Heatwave in the main game', () => {
    vi.setSystemTime(new Date(2027, 6, 10, 12, 0, 0));
    seedSave({ currentWeather: 'Heatwave' });
    renderGame();

    act(() => {
      game!.setCurrentWeather('Heatwave');
    });
    expect(game!.summerEvent.isHeatwave).toBe(true);
    act(() => {
      game!.setCurrentWeather('Clear');
    });
    expect(game!.summerEvent.isHeatwave).toBe(false);
  });

  it('logs a sale, and the first melon sold earns Opening Day and its Tickets', () => {
    vi.setSystemTime(new Date(2027, 6, 10, 12, 0, 0));
    seedSave({ summerEventState: { inventory: { sugarBaby_sugar_chilled: 1 } } });
    renderGame();

    const { upgrades } = game!.summerEvent.eventState;
    const price = getMelonSaleTickets('sugarBaby_sugar_chilled', 1, upgrades, game!.summerEvent.demandMultiplier);
    act(() => {
      game!.summerEvent.sellMelons('sugarBaby_sugar_chilled', 1);
    });
    tick(2);

    expect(game!.summerEvent.tickets).toBe(price + 50);
    const saved = savedGame();
    expect(saved.achievementState?.achievements.find(a => a.id === 'summer_first_sale')?.unlocked).toBe(true);
    const sale = summerLines(saved).find(entry => entry.message === 'Sold 1 Chilled Sugar Baby, a Sugar Melon');
    expect(sale?.details).toBe(`Earned ${price} Tickets`);
  });

  it('logs a challenge result with its prize', () => {
    vi.setSystemTime(new Date(2027, 6, 10, 12, 0, 0));
    seedSave({
      summerEventState: {
        board: {
          challenges: [{ id: 'challenge_7', kind: 'harvestRace', length: 365, daysLeft: 1, score: 15, rivalFinals: [10, 12, 9], spitsLeft: 0 }],
          challengesOpened: 8,
        },
      },
    });
    renderGame();
    tick(1);

    expect(game!.summerEvent.tickets).toBe(100);
    expect(summerLines(savedGame()).map(entry => entry.message))
      .toContain('Harvest Race: 1st place, beating Earl Boone by 3 melons. +100 Tickets');
  });

  it('shows a toast for a Dunk Tank tip', () => {
    vi.setSystemTime(new Date(2027, 6, 10, 12, 0, 0));
    seedSave({ summerEventState: { inventory: { crimsonSweet_normal_basket: 4 }, upgrades: owning('dunk_tank') } });
    renderGame();

    // Every melon tips
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    act(() => {
      game!.summerEvent.sellMelons('crimsonSweet_normal_basket', 4);
    });
    random.mockRestore();

    expect(game!.summerEvent.lastDunkTip.amount).toBeGreaterThan(0);
    // The toast, and its copy for screen readers
    expect(screen.getAllByText(`Dunk Tank tip! +${game!.summerEvent.lastDunkTip.amount} Tickets`).length).toBeGreaterThan(0);
  });

  it('catches up an hour away: melons ripen, the Ice House fills, the crew works and the Carousel pays, and the board waits', () => {
    vi.setSystemTime(new Date(2027, 6, 10, 12, 0, 0));
    seedSave({
      summerEventState: {
        plots: [{ id: 'melon_plot_0', variety: 'sugarBaby', growth: 0, growthTime: 180, harvestReady: false }],
        upgrades: owning('unlock_ice_house', 'picnic_crew', 'parade_route', 'carousel'),
        passiveTicketsPerSecond: 0.1,
        materials: { splits: 4 },
        board: {
          challenges: [{ id: 'challenge_7', kind: 'spitting', length: 365, daysLeft: 50, score: 27, rivalFinals: [24, 29, 22], spitsLeft: 4 }],
          challengesOpened: 8,
        },
      }
    }, 60 * 60);
    renderGame();
    tick(1);

    const summer = game!.summerEvent;
    expect(summer.plots[0].harvestReady).toBe(true);
    expect(summer.materials.ice).toBe(10);
    expect(summer.materials.agua).toBe(2);
    expect(summer.materials.splits).toBe(0);
    expect(summer.tickets).toBeGreaterThanOrEqual(359);
    // Only the one live day moved the board
    expect(summer.board.challenges[0]).toMatchObject({ id: 'challenge_7', daysLeft: 49, score: 27, spitsLeft: 4 });
  });
});
