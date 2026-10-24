/**
 * The whole game as a committed Engineer: every unlocked crop gets its Auto Harvester,
 * switched on, the machines' harvests make Gears, and Stanley comes by with his Tune-Up.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act, fireEvent, screen } from '@testing-library/react';
import App from '../App';
import { GameProviders } from '../GameProviders';
import { GAME_STORAGE_KEY } from '../config/gameConstants';
import { createAllCrops } from '../utils/gameCalculations';
import { commitToGuild } from '../utils/guildCalculations';
import { GUILDS_UNLOCK_TIER } from '../data/guildData';
import { DEFAULT_GUILD_STATE } from '../types/guilds';
import type { ExtendedGameState } from '../utils/saveSystem';

const START = new Date(2026, 5, 15, 12, 0, 0).getTime();
const SECONDS = 120;

/** An Engineer's farm with two crops nearly ripe and no harvesters bought */
const engineerSave = () => ({
  veggies: createAllCrops().map((crop, i) => (i < 2 ? { ...crop, unlocked: true, growth: 90 } : crop)),
  money: 1000,
  experience: 0,
  knowledge: 500,
  activeVeggie: 0,
  day: 40,
  totalDaysElapsed: 39,
  greenhouseOwned: false,
  heirloomOwned: false,
  autoSellOwned: false,
  almanacLevel: 0,
  almanacCost: 10,
  maxPlots: 20,
  farmTier: GUILDS_UNLOCK_TIER,
  farmCost: 50000,
  irrigationOwned: false,
  currentWeather: 'Clear',
  highestUnlockedVeggie: 1,
  harvestTutorialShown: true,
  guildIntroShown: true,
  guildState: commitToGuild(DEFAULT_GUILD_STATE, 'engineers', 1),
  _saveVersion: 8,
  lastSavedAt: START
});

/** Forces the close-tab save and reads it back */
const savedGame = (): ExtendedGameState => {
  window.dispatchEvent(new Event('beforeunload'));
  return JSON.parse(localStorage.getItem(GAME_STORAGE_KEY)!);
};

// Boots the whole game, which can take several seconds while other test files run in parallel
describe('playing as an Engineer', { timeout: 20_000 }, () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date',
        'requestAnimationFrame', 'cancelAnimationFrame', 'performance']
    });
    vi.setSystemTime(START);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const play = (seconds: number) => {
    for (let i = 0; i < seconds; i++) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }
  };

  it('fits every unlocked crop with a harvester, and the harvests make Gears', () => {
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(engineerSave()));
    render(<GameProviders><App /></GameProviders>);

    for (let i = 0; i < SECONDS; i++) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }

    const { veggies, guildState } = savedGame();
    const unlocked = veggies.filter(v => v.unlocked);
    expect(unlocked.length).toBeGreaterThanOrEqual(2);
    expect(unlocked.every(v => v.harvesterOwned && v.autoHarvesterEnabled)).toBe(true);
    expect(veggies.filter(v => !v.unlocked).some(v => v.harvesterOwned)).toBe(false);

    const harvests = guildState!.guildCurrencies.engineers * 10 + (guildState!.gearProgress?.autoHarvests ?? 0);
    expect(harvests).toBeGreaterThanOrEqual(2);
  });

  it('brings Stanley, whose Tune-Up shows in the header until it runs out', { timeout: 40_000 }, () => {
    // With every roll at 0.5 his first visit comes 270 game steps in
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(engineerSave()));
    render(<GameProviders><App /></GameProviders>);

    play(275);
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /^Stanley is here/ }));
    });

    expect(screen.getByText(/Tune-Up 60 s/)).toHaveTextContent('Tune-Up 60 s · machines ×2');
    expect(savedGame().guildState?.stanley).toEqual({ tuneUps: 1, tuneUpLeft: 60 });

    play(60);
    expect(screen.queryByText(/Tune-Up [0-9]+ s/)).not.toBeInTheDocument();
    expect(savedGame().guildState?.stanley).toEqual({ tuneUps: 1, tuneUpLeft: 0 });
  });
});
