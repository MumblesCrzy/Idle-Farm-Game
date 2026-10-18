/**
 * The Fall Pumpkin Rush inside the whole game: the tab appears in season,
 * pumpkins grow on the game clock, and the event is saved.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act, screen, fireEvent, within } from '@testing-library/react';
import { useContext } from 'react';
import App from '../App';
import { GameContext } from '../context/GameContext';
import { GameProviders } from '../GameProviders';
import { GAME_STORAGE_KEY } from '../config/gameConstants';
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

const tick = (seconds: number) => {
  for (let i = 0; i < seconds; i++) {
    act(() => {
      vi.advanceTimersByTime(1000);
    });
  }
};

// Boots the whole game, which can take several seconds while other test files run in parallel
describe('Pumpkin Rush in the game', { timeout: 20_000 }, () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    game = undefined;
  });

  it('shows the tab in season, grows pumpkins on the clock, and saves them', () => {
    vi.setSystemTime(new Date(2026, 9, 15, 12, 0, 0));
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify({
      veggies: [], money: 0, experience: 0, knowledge: 0, activeVeggie: 0, day: 10, totalDaysElapsed: 9,
      farmTier: 1, maxPlots: 4, farmCost: 500, highestUnlockedVeggie: 0, harvestTutorialShown: true,
      lastSavedAt: Date.now()
    }));
    renderGame();

    const tab = screen.getByRole('tab', { name: /Pumpkin Rush/ });
    fireEvent.click(tab);
    const sections = screen.getByRole('tablist', { name: 'Pumpkin Rush sections' });
    expect(within(sections).getAllByRole('tab')).toHaveLength(4);

    act(() => {
      game!.pumpkinEvent.plantPumpkin(0, 'sugarPie');
    });
    tick(5);
    const growth = game!.pumpkinEvent.plots[0].growth;
    expect(growth).toBeGreaterThanOrEqual(4);

    // Each section renders without falling into an error boundary
    for (const name of [/Carving Barn/, /Farm Stand/, /County Fair/, /Pumpkin Patch/]) {
      fireEvent.click(within(sections).getByRole('tab', { name }));
      expect(screen.queryByText(/Something went wrong/i)).toBeNull();
    }

    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });
    const saved = JSON.parse(localStorage.getItem(GAME_STORAGE_KEY)!) as ExtendedGameState;
    expect(saved.pumpkinEventState?.plots[0].variety).toBe('sugarPie');
    expect(saved.pumpkinEventState?.plots[0].growth).toBeGreaterThanOrEqual(4);
  });

  it('hides the tab out of season and leaves pumpkins alone', () => {
    vi.setSystemTime(new Date(2026, 11, 5, 12, 0, 0));
    renderGame();

    expect(screen.queryByRole('tab', { name: /Pumpkin Rush/ })).toBeNull();
    act(() => {
      game!.pumpkinEvent.plantPumpkin(0, 'sugarPie');
    });
    tick(3);
    expect(game!.pumpkinEvent.plots[0].growth).toBe(0);
  });
});
