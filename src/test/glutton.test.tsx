/**
 * Tests for Dunkin, the Preservers' Glutton: the rules of a visit, the hook that runs visits
 * on game steps, the visitor on screen, and his achievements.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { GameClockProvider } from '../hooks/useGameClock';
import { useGluttonVisits, type UseGluttonVisitsOptions } from '../hooks/useGluttonVisits';
import GluttonVisitor from '../components/GluttonVisitor';
import { GAME_STEP_MS } from '../utils/gameClock';
import {
  GLUTTON_BITES,
  GLUTTON_LOCKED_OUT_STEPS,
  GLUTTON_SNIFF_STEPS,
  GLUTTON_VISIT_GAP,
  arrive,
  arriveStuffed,
  chooseBite,
  describeEaten,
  gluttonLook,
  recordShoo,
  recordStuffed,
  shooMessage,
  shooOutcome,
  stepVisit,
  vetBill,
  type GluttonOutcome,
  type GluttonVisit
} from '../utils/glutton';
import { DEFAULT_GUILD_STATE, type GuildState } from '../types/guilds';
import { INITIAL_ACHIEVEMENTS } from '../data/achievements';
import type { AchievementGameState } from '../types/achievements';

const formatNumber = (num: number, decimalPlaces = 0) => num.toFixed(decimalPlaces);
const pantry = () => [
  { name: 'Carrots', stash: 50 },
  { name: 'Broccoli', stash: 3 },
  { name: 'Onions', stash: 0 }
];

/** Runs a visit through game steps with the given stash */
const run = (visit: GluttonVisit, steps: number, crops = pantry(), pantryLocked = false) => {
  let current: GluttonVisit | null = visit;
  const bites: string[] = [];
  for (let i = 0; i < steps && current; i++) {
    const result = stepVisit(current, { pantryLocked, crops, random: () => 0 });
    if (result.bite) {
      bites.push(result.bite.name);
      const crop = crops.find(c => c.name === result.bite!.name)!;
      crop.stash -= result.bite.amount;
    }
    current = result.visit;
  }
  return { visit: current, bites, crops };
};

describe('a visit', () => {
  it('starts sniffing at a spot clear of the window edges', () => {
    expect(arrive(() => 0)).toMatchObject({ stage: 'sniffing', steps: 0, bites: 0, eaten: {}, x: 0.1, y: 0.15 });
    const far = arrive(() => 0.999);
    expect(far.x).toBeLessThan(0.86);
    expect(far.y).toBeLessThan(0.81);
  });

  it('sniffs for a while before the first bite', () => {
    const { visit, bites } = run(arrive(() => 0), GLUTTON_SNIFF_STEPS);
    expect(visit?.stage).toBe('eating');
    expect(bites).toEqual([]);
  });

  it('eats every other step and is stuffed after the last bite', () => {
    const { visit, bites } = run(arrive(() => 0), GLUTTON_SNIFF_STEPS + GLUTTON_BITES * 2);
    expect(bites).toHaveLength(GLUTTON_BITES);
    expect(visit?.stage).toBe('stuffed');
    expect(Object.values(visit!.eaten).reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
  });

  it('stays stuffed until clicked', () => {
    const stuffed = arriveStuffed({ Carrots: 5 }, () => 0);
    expect(run(stuffed, 500).visit).toEqual(stuffed);
  });

  it('leaves hungry when the stash is empty, without a vet bill to pay', () => {
    const empty = [{ name: 'Carrots', stash: 0 }];
    expect(run(arrive(() => 0), GLUTTON_SNIFF_STEPS + GLUTTON_BITES * 2, empty).visit).toBeNull();
  });

  it('never bites with Pantry Lock, and wanders off on his own', () => {
    const before = run(arrive(() => 0), GLUTTON_LOCKED_OUT_STEPS - 1, pantry(), true);
    expect(before.visit?.stage).toBe('sniffing');
    expect(before.bites).toEqual([]);
    expect(run(arrive(() => 0), GLUTTON_LOCKED_OUT_STEPS, pantry(), true).visit).toBeNull();
  });
});

describe('a bite', () => {
  it('takes a tenth of one crop, at least 1, from crops that have any', () => {
    expect(chooseBite(pantry(), () => 0)).toEqual({ name: 'Carrots', amount: 5 });
    expect(chooseBite(pantry(), () => 0.9)).toEqual({ name: 'Broccoli', amount: 1 });
    expect(chooseBite([{ name: 'Onions', stash: 0 }], () => 0)).toBeNull();
  });
});

describe('clicking him', () => {
  it('pays Wax Seals at any stage and notes a shoo before his first bite', () => {
    expect(shooOutcome(arrive(() => 0), 1000)).toEqual({ stage: 'sniffing', seals: 3, vetBill: 0, early: true, eaten: {} });
    const eating: GluttonVisit = { ...arrive(() => 0), stage: 'eating', bites: 2, eaten: { Carrots: 9 } };
    expect(shooOutcome(eating, 1000)).toMatchObject({ seals: 3, vetBill: 0, early: false });
  });

  it('charges a vet bill for a stuffed Dunkin: 2% of the money, at least $100, never more than the player has', () => {
    expect(shooOutcome(arriveStuffed({ Carrots: 9 }), 1_000_000).vetBill).toBe(20_000);
    expect(vetBill(1000)).toBe(100);
    expect(vetBill(40)).toBe(40);
    expect(vetBill(0)).toBe(0);
  });

  it('pays the Seals into the guild and counts the visit', () => {
    let state: GuildState = { ...DEFAULT_GUILD_STATE, committedGuild: 'preservers', status: 'committed' };
    state = recordStuffed(state, { Carrots: 9 });
    expect(state.glutton?.stuffed).toEqual({ eaten: { Carrots: 9 } });

    state = recordShoo(state, shooOutcome(arriveStuffed({ Carrots: 9 }), 5000));
    state = recordShoo(state, shooOutcome(arrive(), 5000));
    expect(state.guildCurrencies.preservers).toBe(6);
    expect(state.glutton).toEqual({ shoos: 2, earlyShoos: 1, vetBills: 1 });
  });

  it('says what happened', () => {
    const outcome = (overrides: Partial<GluttonOutcome>): GluttonOutcome => ({ stage: 'eating', seals: 3, vetBill: 0, early: false, eaten: {}, ...overrides });
    expect(shooMessage(outcome({ stage: 'sniffing', early: true }), formatNumber))
      .toBe('Get out of the kitchen, Dunkin! He left before taking a bite. +3 Wax Seals');
    expect(shooMessage(outcome({ eaten: { Carrots: 12, Tomatoes: 4 } }), formatNumber))
      .toBe('You shooed Dunkin out of the kitchen. He ate 12 Carrots and 4 Tomatoes. +3 Wax Seals');
    expect(shooMessage(outcome({ stage: 'stuffed', vetBill: 400 }), formatNumber))
      .toBe('Dunkin waddled home to the vet. Vet bill: $400. +3 Wax Seals');
    expect(describeEaten({ Radish: 1, Lettuce: 2, Onions: 3 })).toBe('1 Radish, 2 Lettuce and 3 Onions');
  });
});

describe('his looks', () => {
  it('wears the sweater for the Christmas Tree Shop and the vampire cape through Halloween', () => {
    const october = new Date(2026, 9, 20);
    const november = new Date(2026, 10, 10);
    expect(gluttonLook({ christmasActive: true, pumpkinActive: true, now: november })).toBe('sweater');
    expect(gluttonLook({ christmasActive: false, pumpkinActive: true, now: october })).toBe('vampire');
    expect(gluttonLook({ christmasActive: false, pumpkinActive: true, now: november })).toBe('everyday');
    expect(gluttonLook({ christmasActive: false, pumpkinActive: false, now: october })).toBe('everyday');
  });
});

describe('useGluttonVisits', () => {
  const step = (count = 1) => act(() => {
    vi.advanceTimersByTime(GAME_STEP_MS * count);
  });
  const wrapper = ({ children }: { children: ReactNode }) => <GameClockProvider>{children}</GameClockProvider>;
  type Options = Omit<UseGluttonVisitsOptions<{ name: string; stash: number }>, 'crops' | 'setCrops'>;
  /** The hook with a real stash in state */
  const useHarness = (options: Options) => {
    const [crops, setCrops] = useState(pantry);
    return { crops, ...useGluttonVisits({ ...options, crops, setCrops }) };
  };
  const options = (overrides: Partial<Options> = {}): Options => ({
    active: true,
    isPaused: false,
    pantryLocked: false,
    money: 10_000,
    onStuffed: vi.fn(),
    onShoo: vi.fn(),
    random: () => 0,
    ...overrides
  });
  const firstVisit = GLUTTON_VISIT_GAP[0];

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('comes after a few minutes of play, sniffs, eats from the stash and ends up stuffed', () => {
    const props = options();
    const { result } = renderHook(() => useHarness(props), { wrapper });

    step(firstVisit - 1);
    expect(result.current.visit).toBeNull();
    step();
    expect(result.current.visit?.stage).toBe('sniffing');

    step(GLUTTON_SNIFF_STEPS + 2);
    expect(result.current.visit?.stage).toBe('eating');
    expect(result.current.crops[0].stash).toBe(45);

    step(GLUTTON_BITES * 2);
    expect(result.current.visit?.stage).toBe('stuffed');
    expect(props.onStuffed).toHaveBeenCalledTimes(1);
  });

  it('never comes to anyone but committed Preservers', () => {
    const { result } = renderHook(() => useHarness(options({ active: false })), { wrapper });
    step(firstVisit * 3);
    expect(result.current.visit).toBeNull();
  });

  it('waits while the game is paused', () => {
    const { result } = renderHook(() => useHarness(options({ isPaused: true })), { wrapper });
    step(firstVisit * 3);
    expect(result.current.visit).toBeNull();
  });

  it('goes when clicked, pays through onShoo, and comes back later', () => {
    const props = options();
    const { result } = renderHook(() => useHarness(props), { wrapper });
    step(firstVisit);

    let outcome: GluttonOutcome | null = null;
    act(() => {
      outcome = result.current.shoo();
    });

    expect(outcome).toMatchObject({ stage: 'sniffing', seals: 3, early: true });
    expect(props.onShoo).toHaveBeenCalledWith(outcome);
    expect(result.current.visit).toBeNull();
    step(firstVisit);
    expect(result.current.visit?.stage).toBe('sniffing');
  });

  it('is still there, stuffed, after a reload', () => {
    const { result } = renderHook(() => useHarness(options({ savedStuffed: { Carrots: 9 } })), { wrapper });
    expect(result.current.visit).toMatchObject({ stage: 'stuffed', eaten: { Carrots: 9 } });
  });
});

describe('GluttonVisitor', () => {
  const visit: GluttonVisit = { ...arrive(() => 0), stage: 'eating', bites: 4, eaten: { Carrots: 5 } };

  it('shows nothing when he is away', () => {
    render(<GluttonVisitor visit={null} image="dog.png" vetBill={100} onShoo={vi.fn()} formatNumber={formatNumber} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('is a button that says what he is up to', () => {
    render(<GluttonVisitor visit={visit} image="dog.png" vetBill={100} onShoo={vi.fn()} formatNumber={formatNumber} />);
    expect(screen.getByRole('button', { name: 'Dunkin is eating from your pantry! Shoo him out.' })).toBeInTheDocument();
    expect(screen.getByText('Nom nom')).toBeInTheDocument();
  });

  it('names the vet bill before a stuffed Dunkin is sent home', () => {
    render(<GluttonVisitor visit={arriveStuffed({ Carrots: 5 })} image="dog.png" vetBill={250} onShoo={vi.fn()} formatNumber={formatNumber} />);
    expect(screen.getByRole('button', { name: /the vet bill is \$250/ })).toBeInTheDocument();
  });

  it('shows what clicking him did', async () => {
    const user = userEvent.setup();
    const onShoo = vi.fn((): GluttonOutcome => ({ stage: 'eating', seals: 3, vetBill: 0, early: false, eaten: { Carrots: 5 } }));
    render(<GluttonVisitor visit={visit} image="dog.png" vetBill={100} onShoo={onShoo} formatNumber={formatNumber} />);

    await user.click(screen.getByRole('button'));

    expect(onShoo).toHaveBeenCalledTimes(1);
    expect(screen.getByText('You shooed Dunkin out of the kitchen. He ate 5 Carrots. +3 Wax Seals')).toBeInTheDocument();
  });
});

describe('his achievements', () => {
  const achievement = (id: string) => INITIAL_ACHIEVEMENTS.find(a => a.id === id)!;
  const withRecord = (glutton: GuildState['glutton']): AchievementGameState => ({
    money: 0, experience: 0, knowledge: 0, veggiesUnlocked: 0, canningItemsTotal: 0, farmTier: 5,
    guildState: { ...DEFAULT_GUILD_STATE, glutton }
  });

  it('"Get out of the kitchen Dunkin!" comes with the first shoo', () => {
    const first = achievement('glutton_first_shoo');
    expect(first.name).toBe('Get out of the kitchen Dunkin!');
    expect(first.requirement.customCheck!(withRecord(undefined))).toBe(false);
    expect(first.requirement.customCheck!(withRecord({ shoos: 1, earlyShoos: 0, vetBills: 1 }))).toBe(true);
  });

  it('Pantry Guardian takes 25 shoos before a bite, and Vet\'s Best Customer 10 vet bills', () => {
    const guardian = achievement('glutton_pantry_guardian').requirement;
    const vet = achievement('glutton_vet_bills').requirement;
    expect(guardian.customCheck!(withRecord({ shoos: 40, earlyShoos: 24, vetBills: 0 }))).toBe(false);
    expect(guardian.customCheck!(withRecord({ shoos: 40, earlyShoos: 25, vetBills: 0 }))).toBe(true);
    expect(guardian.getProgress!(withRecord({ shoos: 40, earlyShoos: 7, vetBills: 0 }))).toBe(7);
    expect(vet.customCheck!(withRecord({ shoos: 10, earlyShoos: 0, vetBills: 10 }))).toBe(true);
  });
});
