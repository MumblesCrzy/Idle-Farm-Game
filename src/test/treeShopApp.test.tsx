/**
 * The Christmas Tree Shop inside the whole game: its sections, and the tree sales
 * achievements that pay the Holiday Cheer the Shopfront's milestones used to.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act, screen, fireEvent, within } from '@testing-library/react';
import { useContext } from 'react';
import App from '../App';
import { GameContext } from '../context/GameContext';
import { GameProviders } from '../GameProviders';
import { GAME_STORAGE_KEY } from '../config/gameConstants';
import type { GameState } from '../types/game';

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

/** A small save with these extras, last played a moment ago */
const save = (extra: Record<string, unknown>) => {
  localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify({
    veggies: [], money: 0, experience: 0, knowledge: 0, activeVeggie: 0, day: 10, totalDaysElapsed: 9,
    farmTier: 1, maxPlots: 4, farmCost: 500, highestUnlockedVeggie: 0, harvestTutorialShown: true,
    lastSavedAt: Date.now(),
    ...extra
  }));
};

const milestone = (id: string) => game!.christmasEvent!.eventState.milestones.find(m => m.id === id);

// Boots the whole game, which can take several seconds while other test files run in parallel
describe('The Tree Shop in the game', { timeout: 20_000 }, () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 10, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
    game = undefined;
  });

  it('shows three sections, each without an error, and no daily bonus in the section bar', () => {
    save({ christmasEventState: { upgrades: [{ id: 'wreath_sign', owned: true }] } });
    renderGame();

    fireEvent.click(screen.getByRole('tab', { name: /Tree Shop/ }));
    const sections = screen.getByRole('tablist', { name: 'Tree Shop sections' });
    expect(within(sections).getAllByRole('tab')).toHaveLength(3);
    expect(within(sections).queryByRole('button')).toBeNull();

    for (const name of [/Workshop/, /Shopfront/, /Tree Farm/]) {
      fireEvent.click(within(sections).getByRole('tab', { name }));
      expect(screen.queryByText(/Something went wrong/i)).toBeNull();
    }
    fireEvent.click(within(sections).getByRole('tab', { name: /Shopfront/ }));
    expect(screen.getByRole('region', { name: 'Daily bonus' })).toBeInTheDocument();
  });

  it('pays a tree sales achievement its Holiday Cheer, unless the milestone was claimed', () => {
    // 60 trees sold: First Sale was claimed on the old Shopfront, Growing Business was not
    save({
      christmasEventState: {
        holidayCheer: 0,
        totalTreesSold: 60,
        milestones: [{ id: 'milestone_first_tree', claimed: true }]
      }
    });
    renderGame();
    tick(2);

    // First Tree Sold and Growing Business unlock; only Growing Business pays
    expect(game!.christmasEvent!.holidayCheer).toBe(150);
    expect(milestone('milestone_first_tree')?.claimed).toBe(true);
    expect(milestone('milestone_50_trees')?.claimed).toBe(true);

    // Nothing pays twice
    tick(3);
    expect(game!.christmasEvent!.holidayCheer).toBe(150);
  });

  it('pays an older save whose achievement unlocked before its milestone was claimed', () => {
    save({
      achievementState: { achievements: [{ id: 'first_tree_sold', unlocked: true }], totalUnlocked: 1, lastUnlockedId: null },
      christmasEventState: { holidayCheer: 10, totalTreesSold: 5 }
    });
    renderGame();
    tick(1);

    expect(game!.christmasEvent!.holidayCheer).toBe(60);
    expect(milestone('milestone_first_tree')?.claimed).toBe(true);
  });
});
