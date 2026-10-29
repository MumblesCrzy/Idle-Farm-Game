/**
 * Tests for Ferdinand, the Merchants' cat: his visits on game steps, the Hot Tip a click
 * starts and what it doubles, Insider Trading, where the tip shows, and his achievements.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { GameClockProvider } from '../hooks/useGameClock';
import { useFerdinandVisits, type UseFerdinandVisitsOptions } from '../hooks/useFerdinandVisits';
import FerdinandVisitor from '../components/FerdinandVisitor';
import StatsDisplay from '../components/StatsDisplay';
import { GAME_STEP_MS } from '../utils/gameClock';
import {
  FERDINAND_WAIT_STEPS,
  HOT_TIP_STEPS,
  INSIDER_HOT_TIP_STEPS,
  arriveFerdinand,
  ferdinandWaitLeft,
  nextFerdinandDelay,
  recordHotTip,
  stepFerdinand,
  tickHotTip
} from '../utils/ferdinand';
import {
  applyGuildPriceBonuses,
  commitToGuild,
  getHotTipLeft,
  getHotTipMultiplier,
  getRecipeValueMultiplier,
  withoutHotTip
} from '../utils/guildCalculations';
import { formatNumber } from '../utils/gameCalculations';
import { legacyKeepableUnlocks } from '../utils/legacy';
import { INITIAL_ACHIEVEMENTS } from '../data/achievements';
import { DEFAULT_GUILD_STATE, type GuildState } from '../types/guilds';
import type { AchievementGameState } from '../types/achievements';

/** A committed Merchant, with these upgrades bought and this much Hot Tip left */
const merchant = (levels: Record<string, number> = {}, hotTipLeft?: number): GuildState => ({
  ...commitToGuild(DEFAULT_GUILD_STATE, 'merchants', 1),
  purchasedUpgrades: Object.keys(levels),
  upgradeLevels: levels,
  ferdinand: hotTipLeft === undefined ? undefined : { hotTips: 1, hotTipLeft }
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
  it('come 4 to 8 minutes apart, at a spot clear of the edges', () => {
    expect(nextFerdinandDelay(() => 0)).toBe(240);
    expect(nextFerdinandDelay(() => 1)).toBe(480);
    const visit = arriveFerdinand(() => 1);
    expect(visit.x).toBeLessThanOrEqual(0.85);
    expect(visit.y).toBeLessThanOrEqual(0.75);
  });

  it('last 20 seconds, then he wanders off', () => {
    let visit = arriveFerdinand(() => 0.5);
    for (let i = 1; i < FERDINAND_WAIT_STEPS; i++) {
      visit = stepFerdinand(visit)!;
      expect(ferdinandWaitLeft(visit)).toBe(FERDINAND_WAIT_STEPS - i);
    }
    expect(stepFerdinand(visit)).toBeNull();
  });
});

describe('a Hot Tip', () => {
  it('counts the click and runs for 60 seconds, 90 with Insider Trading', () => {
    expect(recordHotTip(merchant()).ferdinand).toEqual({ hotTips: 1, hotTipLeft: HOT_TIP_STEPS });
    expect(recordHotTip(merchant({ merchants_insider_trading: 1 })).ferdinand?.hotTipLeft).toBe(INSIDER_HOT_TIP_STEPS);
  });

  it('counts down one game step at a time, and then prices go back to normal', () => {
    let state = merchant({}, 2);
    expect(getHotTipMultiplier(state)).toBe(2);
    state = tickHotTip(state);
    expect(getHotTipLeft(state)).toBe(1);
    state = tickHotTip(state);
    expect(getHotTipMultiplier(state)).toBe(1);
    expect(tickHotTip(state)).toBe(state);
  });

  it('doubles crop prices and jar values while it runs', () => {
    expect(applyGuildPriceBonuses(100, merchant({}, 30))).toBeCloseTo(applyGuildPriceBonuses(100, merchant()) * 2);
    expect(getRecipeValueMultiplier(merchant({}, 30), { timesCompleted: 0 })).toBeCloseTo(2.3);
  });

  it('pays nobody but the Merchants, and never for time away', () => {
    expect(getHotTipMultiplier({ ...grower, ferdinand: { hotTips: 3, hotTipLeft: 40 } })).toBe(1);
    expect(getHotTipMultiplier(undefined)).toBe(1);
    const away = withoutHotTip(merchant({}, 40));
    expect(getHotTipMultiplier(away)).toBe(1);
    expect(away.ferdinand?.hotTips).toBe(1);
    const none = merchant();
    expect(withoutHotTip(none)).toBe(none);
  });
});

describe('the visit hook', () => {
  const options = (overrides: Partial<UseFerdinandVisitsOptions> = {}): UseFerdinandVisitsOptions => ({
    active: true,
    isPaused: false,
    hotTipRunning: false,
    onHotTip: vi.fn(),
    onHotTipStep: vi.fn(),
    onArrive: vi.fn(),
    onWanderOff: vi.fn(),
    random: () => 0,
    ...overrides
  });

  it('brings him after the delay and sends him off 20 steps later', () => {
    vi.useFakeTimers();
    const props = options();
    const { result } = renderHook(() => useFerdinandVisits(props), { wrapper: clock });

    steps(239);
    expect(result.current.visit).toBeNull();
    steps(1);
    expect(result.current.visit).not.toBeNull();
    expect(props.onArrive).toHaveBeenCalledTimes(1);

    steps(FERDINAND_WAIT_STEPS);
    expect(result.current.visit).toBeNull();
    expect(props.onWanderOff).toHaveBeenCalledTimes(1);
  });

  it('starts a Hot Tip when he is clicked, and not when he is away', () => {
    vi.useFakeTimers();
    const props = options();
    const { result } = renderHook(() => useFerdinandVisits(props), { wrapper: clock });

    expect(result.current.hotTip()).toBe(false);
    steps(240);
    let clicked = false;
    act(() => {
      clicked = result.current.hotTip();
    });
    expect(clicked).toBe(true);
    expect(props.onHotTip).toHaveBeenCalledTimes(1);
    expect(result.current.visit).toBeNull();
  });

  it('counts a running Hot Tip down on game steps', () => {
    vi.useFakeTimers();
    const props = options({ hotTipRunning: true });
    renderHook(() => useFerdinandVisits(props), { wrapper: clock });

    steps(5);
    expect(props.onHotTipStep).toHaveBeenCalledTimes(5);
  });

  it('waits while the game is paused, and never visits anyone but a Merchant', () => {
    vi.useFakeTimers();
    const paused = options({ isPaused: true, hotTipRunning: true });
    const outsider = options({ active: false });
    const { result: pausedResult } = renderHook(() => useFerdinandVisits(paused), { wrapper: clock });
    const { result: outsiderResult } = renderHook(() => useFerdinandVisits(outsider), { wrapper: clock });

    steps(500);
    expect(pausedResult.current.visit).toBeNull();
    expect(paused.onHotTipStep).not.toHaveBeenCalled();
    expect(outsiderResult.current.visit).toBeNull();
    expect(outsider.onArrive).not.toHaveBeenCalled();
  });
});

describe('on screen', () => {
  it('shows him with how long he waits, and toasts the Hot Tip when clicked', () => {
    const onHotTip = vi.fn(() => true);
    render(<FerdinandVisitor visit={{ steps: 2, x: 0.4, y: 0.4 }} image="./Ferdinand 256.png" hotTipSeconds={90} onHotTip={onHotTip} />);

    const ferdinand = screen.getByRole('button', { name: /^Ferdinand is here\. Click him for a Hot Tip/ });
    expect(ferdinand).toHaveTextContent('Ferdinand is here · 18 s');
    fireEvent.click(ferdinand);

    expect(onHotTip).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Ferdinand's Hot Tip: crops and jars sell for double for 90 seconds. Sell what you've been holding")).toBeInTheDocument();
  });

  it('keeps the Hot Tip in the header for Merchants, running or not', () => {
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
    const { unmount } = header(merchant({}, 42));
    expect(screen.getByText(/Hot Tip 42 s/)).toHaveTextContent('Hot Tip 42 s · prices ×2');
    unmount();

    // Between tips the slot stays, quiet, so the row holds still
    const { unmount: unmountIdle } = header(merchant());
    expect(screen.getByText('No Hot Tip running')).toBeInTheDocument();
    unmountIdle();

    header(grower);
    expect(screen.queryByText(/Hot Tip/)).not.toBeInTheDocument();
  });
});

describe('his achievements and Legacy', () => {
  const check = (id: string, guildState: GuildState) => {
    const achievement = INITIAL_ACHIEVEMENTS.find(a => a.id === id)!;
    return achievement.requirement.customCheck!({ guildState } as unknown as AchievementGameState);
  };
  const tips = (hotTips: number) => ({ ...merchant(), ferdinand: { hotTips } });

  it('come with the first Hot Tip and the hundredth', () => {
    expect(check('ferdinand_little_bird', tips(0))).toBe(false);
    expect(check('ferdinand_little_bird', tips(1))).toBe(true);
    expect(check('ferdinand_inside_track', tips(99))).toBe(false);
    expect(check('ferdinand_inside_track', tips(100))).toBe(true);
  });

  it('hide Corporate Raider until the fifth Hostile Takeover', () => {
    const raider = INITIAL_ACHIEVEMENTS.find(a => a.id === 'merchants_corporate_raider')!;
    expect(raider.hidden).toBe(true);
    expect(check('merchants_corporate_raider', { ...merchant(), takeovers: 4 })).toBe(false);
    expect(check('merchants_corporate_raider', { ...merchant(), takeovers: 5 })).toBe(true);
  });

  it('keep Insider Trading with the guild, since Ferdinand visits members only', () => {
    const member = merchant({ merchants_insider_trading: 1, merchants_futures: 1 });
    expect(legacyKeepableUnlocks(member).map(upgrade => upgrade.id)).toEqual(['merchants_futures']);
  });
});

