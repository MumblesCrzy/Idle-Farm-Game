import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import App from '../App';
import { GameProviders } from '../GameProviders';
import { GAME_STORAGE_KEY } from '../config/gameConstants';
import { CURRENT_SAVE_VERSION } from '../utils/migrations/registry';

// Same provider tree as main.tsx
const renderGame = () =>
  render(
    <GameProviders>
      <App />
    </GameProviders>
  );

describe('App smoke test', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.useRealTimers());

  it('runs several game days without hitting an error boundary', () => {
    vi.useFakeTimers();
    renderGame();
    const dayText = () => screen.getByText(/Day: \d+/).textContent ?? '';
    const dayOf = () => Number(/Day: (\d+)/.exec(dayText())?.[1]);
    const startDay = dayOf();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(dayOf()).toBeGreaterThan(startDay);
    expect(screen.queryByText(/encountered an error/i)).not.toBeInTheDocument();
  });

  it('renders a new game without hitting an error boundary', () => {
    renderGame();

    expect(screen.getByRole('tab', { name: /growing/i })).toBeInTheDocument();
    expect(screen.queryByText(/encountered an error/i)).not.toBeInTheDocument();
  });

  it('loads a saved game that was last saved ten minutes ago', () => {
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify({
      veggies: [],
      money: 250,
      experience: 0,
      knowledge: 0,
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
      _saveVersion: CURRENT_SAVE_VERSION,
      lastSavedAt: Date.now() - 10 * 60 * 1000
    }));

    renderGame();

    expect(screen.getByRole('tab', { name: /growing/i })).toBeInTheDocument();
    expect(screen.queryByText(/encountered an error/i)).not.toBeInTheDocument();
  });
});
