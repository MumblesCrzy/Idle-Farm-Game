/**
 * Tests for Stanley, the Engineers' cat: when he visits and leaves, what a click pays, the
 * Tune-Up that runs the machines twice as fast, his looks, and where the Tune-Up shows.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { GameClockProvider } from '../hooks/useGameClock';
import { useStanleyVisits, type UseStanleyVisitsOptions } from '../hooks/useStanleyVisits';
import { useCanningSystem } from '../hooks/useCanningSystem';
import StanleyVisitor from '../components/StanleyVisitor';
import StatsDisplay from '../components/StatsDisplay';
import { GAME_STEP_MS } from '../utils/gameClock';
import {
  OVERCLOCK_TUNE_UP_STEPS,
  STANLEY_GEARS,
  STANLEY_WAIT_STEPS,
  TUNE_UP_STEPS,
  arriveStanley,
  machineSpeed,
  nextStanleyDelay,
  recordTuneUp,
  stanleyLook,
  stanleyWaitLeft,
  stepStanley,
  tickTuneUp,
  tuneUpLeft
} from '../utils/stanley';
import { processAutoHarvest } from '../utils/gameLoopProcessors';
import { commitToGuild } from '../utils/guildCalculations';
import { createAllCrops, formatNumber } from '../utils/gameCalculations';
import { legacyKeepableUnlocks } from '../utils/legacy';
import { INITIAL_ACHIEVEMENTS } from '../data/achievements';
import { DEFAULT_GUILD_STATE, type GuildState } from '../types/guilds';
import type { CanningProcess, CanningState } from '../types/canning';
import type { AchievementGameState } from '../types/achievements';

/** A committed Engineer, with these upgrades bought and this much Tune-Up left */
const engineer = (levels: Record<string, number> = {}, tuneUpLeft?: number): GuildState => ({
  ...commitToGuild(DEFAULT_GUILD_STATE, 'engineers', 1),
  purchasedUpgrades: Object.keys(levels),
  upgradeLevels: levels,
  stanley: tuneUpLeft === undefined ? undefined : { tuneUps: 1, tuneUpLeft }
});
const grower = commitToGuild(DEFAULT_GUILD_STATE, 'growers', 1);
const clock = ({ children }: { children: ReactNode }) => <GameClockProvider>{children}</GameClockProvider>;
const steps = (count: number) => act(() => {
  vi.advanceTimersByTime(GAME_STEP_MS * count);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('his visits', () => {
  it('come 3 to 6 minutes apart, at a spot clear of the edges', () => {
    expect(nextStanleyDelay(() => 0)).toBe(180);
    expect(nextStanleyDelay(() => 1)).toBe(360);
    const visit = arriveStanley(() => 1);
    expect(visit.x).toBeLessThanOrEqual(0.85);
    expect(visit.y).toBeLessThanOrEqual(0.75);
  });

  it('last 20 seconds, then he wanders off', () => {
    let visit = arriveStanley(() => 0.5);
    for (let i = 1; i < STANLEY_WAIT_STEPS; i++) {
      visit = stepStanley(visit)!;
      expect(stanleyWaitLeft(visit)).toBe(STANLEY_WAIT_STEPS - i);
    }
    expect(stepStanley(visit)).toBeNull();
  });
});

describe('a Tune-Up', () => {
  it('pays 5 Gears, counts the click and runs for 60 seconds, 90 with Overclock', () => {
    const tuned = recordTuneUp(engineer());
    expect(tuned.guildCurrencies.engineers).toBe(STANLEY_GEARS);
    expect(tuned.stanley).toEqual({ tuneUps: 1, tuneUpLeft: TUNE_UP_STEPS });
    expect(recordTuneUp(engineer({ engineers_overclock: 1 })).stanley?.tuneUpLeft).toBe(OVERCLOCK_TUNE_UP_STEPS);
  });

  it('counts down one game step at a time, and then the machines slow back down', () => {
    let state = engineer({}, 2);
    expect(machineSpeed(state)).toBe(2);
    state = tickTuneUp(state);
    expect(tuneUpLeft(state)).toBe(1);
    state = tickTuneUp(state);
    expect(machineSpeed(state)).toBe(1);
    expect(tickTuneUp(state)).toBe(state);
  });

  it('speeds up nobody but the Engineers', () => {
    expect(machineSpeed({ ...grower, stanley: { tuneUps: 3, tuneUpLeft: 40 } })).toBe(1);
    expect(machineSpeed(undefined)).toBe(1);
  });

  it('runs the Auto Harvesters twice as fast, never past their interval', () => {
    const crop = { ...createAllCrops()[0], unlocked: true, harvesterOwned: true, autoHarvesterEnabled: true, growth: 10, harvesterTimer: 37 };
    const normal = processAutoHarvest([crop], 0, 1, 0, 0, 'Spring', [], engineer());
    const tuned = processAutoHarvest([crop], 0, 1, 0, 0, 'Spring', [], engineer({}, 30), 2);
    expect(normal.veggies[0].harvesterTimer).toBe(38);
    expect(tuned.veggies[0].harvesterTimer).toBe(39);
    const nearlyThere = processAutoHarvest([{ ...crop, harvesterTimer: 39 }], 0, 1, 0, 0, 'Spring', [], engineer({}, 30), 2);
    expect(nearlyThere.veggies[0].harvesterTimer).toBe(40);
  });

  it("runs the Canner's batches twice as fast, and leaves the ones started by hand alone", () => {
    vi.useFakeTimers();
    const batch = (automated: boolean): CanningProcess => ({
      recipeId: 'canned_radish', startTime: 0, remainingTime: 50, totalTime: 50, completed: false, automated
    });
    const kitchen: CanningState = {
      recipes: [],
      unlockedRecipes: [],
      activeProcesses: [batch(false), batch(true)],
      maxSimultaneousProcesses: 3,
      upgrades: [],
      totalItemsCanned: 0,
      canningExperience: 0,
      autoCanning: { enabled: false, selectedRecipes: [], priorityOrder: [] }
    };
    // Made once: the hook's effects follow these, so new ones each render would never settle
    const pantry = [{ name: 'Radish', stash: 0, salePrice: 1 }];
    const tunedUp = engineer({}, 30);
    const { result } = renderHook(() => useCanningSystem(
      pantry, vi.fn(), false, 0, vi.fn(), 0, vi.fn(), kitchen, 'profit', 3,
      undefined, undefined, undefined, undefined, undefined, undefined, tunedUp
    ), { wrapper: clock });

    steps(3);

    expect(result.current.canningState.activeProcesses.map(p => p.remainingTime)).toEqual([47, 44]);
  });
});

describe('his looks', () => {
  it('are the vampire through the Pumpkin Rush to Halloween, and everyday otherwise', () => {
    expect(stanleyLook({ pumpkinActive: true, now: new Date(2026, 9, 23) })).toBe('halloween');
    expect(stanleyLook({ pumpkinActive: true, now: new Date(2026, 10, 2) })).toBe('everyday');
    expect(stanleyLook({ pumpkinActive: false, now: new Date(2026, 9, 23) })).toBe('everyday');
  });
});

describe('the visit hook', () => {
  const options = (overrides: Partial<UseStanleyVisitsOptions> = {}): UseStanleyVisitsOptions => ({
    active: true,
    isPaused: false,
    tuneUpRunning: false,
    onTuneUp: vi.fn(),
    onTuneUpStep: vi.fn(),
    onArrive: vi.fn(),
    onWanderOff: vi.fn(),
    random: () => 0,
    ...overrides
  });

  it('brings him after the delay and sends him off 20 steps later', () => {
    vi.useFakeTimers();
    const props = options();
    const { result } = renderHook(() => useStanleyVisits(props), { wrapper: clock });

    steps(179);
    expect(result.current.visit).toBeNull();
    steps(1);
    expect(result.current.visit).not.toBeNull();
    expect(props.onArrive).toHaveBeenCalledTimes(1);

    steps(STANLEY_WAIT_STEPS);
    expect(result.current.visit).toBeNull();
    expect(props.onWanderOff).toHaveBeenCalledTimes(1);
  });

  it('starts a Tune-Up when he is clicked, and not when he is away', () => {
    vi.useFakeTimers();
    const props = options();
    const { result } = renderHook(() => useStanleyVisits(props), { wrapper: clock });

    expect(result.current.tuneUp()).toBe(false);
    steps(180);
    let clicked = false;
    act(() => {
      clicked = result.current.tuneUp();
    });
    expect(clicked).toBe(true);
    expect(props.onTuneUp).toHaveBeenCalledTimes(1);
    expect(result.current.visit).toBeNull();
  });

  it('counts a running Tune-Up down on game steps', () => {
    vi.useFakeTimers();
    const props = options({ tuneUpRunning: true });
    renderHook(() => useStanleyVisits(props), { wrapper: clock });

    steps(5);
    expect(props.onTuneUpStep).toHaveBeenCalledTimes(5);
  });

  it('waits while the game is paused, and never visits anyone but an Engineer', () => {
    vi.useFakeTimers();
    const paused = options({ isPaused: true, tuneUpRunning: true });
    const outsider = options({ active: false });
    const { result: pausedResult } = renderHook(() => useStanleyVisits(paused), { wrapper: clock });
    const { result: outsiderResult } = renderHook(() => useStanleyVisits(outsider), { wrapper: clock });

    steps(400);
    expect(pausedResult.current.visit).toBeNull();
    expect(paused.onTuneUpStep).not.toHaveBeenCalled();
    expect(outsiderResult.current.visit).toBeNull();
    expect(outsider.onArrive).not.toHaveBeenCalled();
  });
});

describe('on screen', () => {
  it('shows him with how long he waits, and toasts the Tune-Up when clicked', () => {
    const onTuneUp = vi.fn(() => true);
    render(<StanleyVisitor visit={{ steps: 5, x: 0.4, y: 0.4 }} image="./Stanley 256.png" tuneUpSeconds={90} onTuneUp={onTuneUp} />);

    const stanley = screen.getByRole('button', { name: /^Stanley is here\. Click him for a Tune-Up/ });
    expect(stanley).toHaveTextContent('Stanley is here · 15 s');
    fireEvent.click(stanley);

    expect(onTuneUp).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Stanley tuned up every machine: twice as fast for 90 seconds. +5 Gears')).toBeInTheDocument();
  });

  it('keeps the Tune-Up in the header for Engineers, running or not', () => {
    const header = (guildState: GuildState) => render(
      <StatsDisplay
        day={10}
        totalDaysElapsed={9}
        season="Spring"
        currentWeather="Clear"
        totalPlotsUsed={3}
        maxPlots={10}
        money={0}
        knowledge={0}
        veggies={[]}
        setShowAdvancedStash={vi.fn()}
        formatNumber={formatNumber}
        experience={0}
        farmCost={100}
        farmTier={5}
        handleBuyLargerFarm={vi.fn()}
        guildState={guildState}
      />
    );
    const { unmount } = header(engineer({}, 42));
    expect(screen.getByText(/Tune-Up 42 s/)).toHaveTextContent('Tune-Up 42 s · machines ×2');
    unmount();

    // Between Tune-Ups the slot stays, quiet, so the row holds still
    const { unmount: unmountIdle } = header(engineer());
    expect(screen.getByText('No Tune-Up running')).toBeInTheDocument();
    unmountIdle();

    header(grower);
    expect(screen.queryByText(/Tune-Up/)).not.toBeInTheDocument();
  });
});

describe('his achievements and Legacy', () => {
  const check = (id: string, tuneUps: number) => {
    const achievement = INITIAL_ACHIEVEMENTS.find(a => a.id === id)!;
    const gameState = { guildState: { ...engineer(), stanley: { tuneUps } } } as unknown as AchievementGameState;
    return achievement.requirement.customCheck!(gameState);
  };

  it('come with the first Tune-Up and the hundredth', () => {
    expect(check('stanley_first_tune_up', 0)).toBe(false);
    expect(check('stanley_first_tune_up', 1)).toBe(true);
    expect(check('stanley_overtime', 99)).toBe(false);
    expect(check('stanley_overtime', 100)).toBe(true);
  });

  it('keep Overclock with the guild, since only members get Tune-Ups', () => {
    const member = engineer({ engineers_overclock: 1, engineers_night_shift: 1 });
    expect(legacyKeepableUnlocks(member).map(upgrade => upgrade.id)).toEqual(['engineers_night_shift']);
  });
});
