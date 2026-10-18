/**
 * Starting a new game replaces the save outright, so nothing from the old game
 * (achievements included) can carry over.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, act, screen, cleanup } from '@testing-library/react';
import { useContext } from 'react';
import {
  GAME_STORAGE_KEY,
  LAST_ACTIVE_KEY,
  ARCHIE_STREAK_KEY,
  ARCHIE_LAST_CLICK_KEY
} from '../config/gameConstants';
import type { GameState } from '../types/game';

// saveSystem blocks saves until the page reloads, using a module-level flag,
// so each test loads fresh copies of the modules.
const loadModules = async () => {
  vi.resetModules();
  const save = await import('../utils/saveSystem');
  const app = await import('../App');
  const providers = await import('../GameProviders');
  return { save, ...app, ...providers };
};

// Boots the whole game, which can take several seconds while other test files run in parallel
describe('startNewGame', { timeout: 20_000 }, () => {
  beforeEach(() => localStorage.clear());

  it('erases stored progress, keeps settings, and reloads', async () => {
    const { save } = await loadModules();
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify({ day: 200 }));
    localStorage.setItem(LAST_ACTIVE_KEY, '123');
    localStorage.setItem(ARCHIE_STREAK_KEY, '4');
    localStorage.setItem(ARCHIE_LAST_CLICK_KEY, '456');
    localStorage.setItem('farmIdleMigrationLog', '{"entries":[]}');
    localStorage.setItem('archieSoundEnabled', 'false');
    localStorage.setItem('archieAppearance', 'classic');
    localStorage.setItem('farm_idle_feature_flags', '{}');
    const reload = vi.fn();

    save.startNewGame(reload);

    for (const key of [GAME_STORAGE_KEY, LAST_ACTIVE_KEY, ARCHIE_STREAK_KEY, ARCHIE_LAST_CLICK_KEY, 'farmIdleMigrationLog']) {
      expect(localStorage.getItem(key), key).toBeNull();
    }
    expect(localStorage.getItem('archieSoundEnabled')).toBe('false');
    expect(localStorage.getItem('archieAppearance')).toBe('classic');
    expect(localStorage.getItem('farm_idle_feature_flags')).toBe('{}');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('stops the closing page from saving the old game back', async () => {
    const { save } = await loadModules();
    save.startNewGame(vi.fn());

    save.saveGameStateWithCanning({ day: 200 } as Parameters<typeof save.saveGameStateWithCanning>[0]);

    expect(localStorage.getItem(GAME_STORAGE_KEY)).toBeNull();
  });

  it('brings back a day-one game with no achievements after the reload', async () => {
    const { GameContext, GameProviders, default: App } = await loadModules();
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
    const achievementCount = () =>
      screen.getByRole('button', { name: /View achievements/ }).getAttribute('aria-label');

    // A long-played save with achievements
    const unlocked = (id: string) => ({ id, unlocked: true, unlockedAt: 1 });
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify({
      veggies: [],
      money: 5000,
      experience: 900,
      knowledge: 300,
      activeVeggie: 0,
      day: 200,
      totalDaysElapsed: 199,
      farmTier: 3,
      maxPlots: 8,
      farmCost: 5000,
      highestUnlockedVeggie: 2,
      harvestTutorialShown: true,
      achievementState: {
        achievements: [unlocked('first_harvest'), unlocked('veggie_collector'), unlocked('penny_pincher')],
        totalUnlocked: 3,
        lastUnlockedId: null
      },
      lastSavedAt: Date.now()
    }));

    renderGame();
    expect(game?.day).toBeGreaterThan(1);
    expect(achievementCount()).not.toMatch(/^View achievements\. 0 of/);

    // jsdom can't navigate, so it reports the reload as not implemented
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    act(() => {
      game!.resetGame();
    });
    // The page unloads: the game tries one last save
    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });
    consoleError.mockRestore();

    expect(localStorage.getItem(GAME_STORAGE_KEY)).toBeNull();

    // The reload: the game starts with no save
    cleanup();
    renderGame();
    expect(game?.day).toBe(1);
    expect(game?.money).toBe(0);
    expect(game?.farmTier).toBe(1);
    expect(achievementCount()).toMatch(/^View achievements\. 0 of/);
  });
});
