/**
 * Tests for the Engineers' factory floor: setting up the machines, which machines start and
 * which wait for stock, the hidden-tab catch-up, and the canning hook running the floor.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { GameClockProvider } from '../hooks/useGameClock';
import { useCanningSystem } from '../hooks/useCanningSystem';
import CanningTab from '../components/CanningTab';
import { INITIAL_RECIPES } from '../data/recipes';
import { INITIAL_ACHIEVEMENTS } from '../data/achievements';
import { GAME_STEP_MS } from '../utils/gameClock';
import {
  assignMachines,
  floorMachines,
  planFloorStarts,
  shortOf,
  simulateCanning,
  type CanningCrop
} from '../utils/canningSimulation';
import { commitToGuild } from '../utils/guildCalculations';
import { DEFAULT_GUILD_STATE, type GuildState } from '../types/guilds';
import type { AchievementGameState } from '../types/achievements';
import type { Veggie } from '../types/game';
import type { CanningMachine, CanningProcess, CanningState, CanningUpgrade, Recipe } from '../types/canning';

const recipe = (id: string, crop: number, quantity: number, overrides: Partial<Recipe> = {}): Recipe => ({
  id,
  name: id,
  description: '',
  ingredients: [{ veggieIndex: crop, veggieName: ['Radish', 'Lettuce', 'Onions'][crop], quantity }],
  processingTime: 10,
  baseProcessingTime: 10,
  salePrice: 5,
  baseSalePrice: 5,
  experienceRequired: 0,
  unlocked: true,
  timesCompleted: 0,
  ...overrides
});
const radish = recipe('canned_radish', 0, 3);
const lettuce = recipe('pickled_lettuce', 1, 2);
const onions = recipe('onion_jam', 2, 5);
const honeyJar = recipe('honey_jar', 0, 0, { ingredients: [], honeyRequirement: { regular: 10, golden: 0 }, requiredBeeUpgrade: 'honey_jars' });
const crops = (radishes: number, lettuces: number, onionCount = 0): CanningCrop[] => [
  { name: 'Radish', stash: radishes },
  { name: 'Lettuce', stash: lettuces },
  { name: 'Onions', stash: onionCount }
];
const noHoney = { regular: 0, golden: 0 };
const kitchen = (overrides: Partial<CanningState> = {}): CanningState => ({
  recipes: [radish, lettuce, onions, honeyJar],
  unlockedRecipes: [],
  activeProcesses: [],
  maxSimultaneousProcesses: 3,
  upgrades: [],
  totalItemsCanned: 0,
  canningExperience: 0,
  autoCanning: { enabled: false, selectedRecipes: [], priorityOrder: [] },
  ...overrides
});
const machine = (recipeId: string | null): CanningMachine => ({ recipeId, jarsMade: 0 });
const batch = (machineIndex: number | undefined, remainingTime = 5): CanningProcess => ({
  recipeId: 'canned_radish', startTime: 0, remainingTime, totalTime: 10, completed: false, automated: true, machine: machineIndex
});

describe('setting up the floor', () => {
  it('gives each machine one of the first unlocked recipes, those in stock first, never a honey jar', () => {
    const machines = floorMachines(kitchen(), [honeyJar, onions, radish, lettuce], crops(10, 0), { regular: 100, golden: 0 });
    expect(machines.map(m => m.recipeId)).toEqual(['canned_radish', 'onion_jam', 'pickled_lettuce']);
  });

  it('leaves machines without a recipe once every recipe has one, and keeps saved machines', () => {
    expect(floorMachines(kitchen({ maxSimultaneousProcesses: 4 }), [radish], crops(10, 0), noHoney).map(m => m.recipeId))
      .toEqual(['canned_radish', null, null, null]);
    const saved = kitchen({ maxSimultaneousProcesses: 3, machines: [{ recipeId: 'onion_jam', jarsMade: 40 }] });
    expect(floorMachines(saved, [radish], crops(10, 0), noHoney)).toEqual([
      { recipeId: 'onion_jam', jarsMade: 40 }, machine(null), machine(null)
    ]);
  });

  it('puts batches from before the floor on free machines', () => {
    const processes = assignMachines([batch(1), batch(undefined), batch(undefined)], 3);
    expect(processes.map(p => p.machine)).toEqual([1, 0, 2]);
  });
});

describe('machines on the floor', () => {
  it('name the first ingredient the hopper is short of', () => {
    expect(shortOf(radish, crops(2, 0), noHoney)).toBe('Radish');
    expect(shortOf(radish, crops(3, 0), noHoney)).toBeNull();
    expect(shortOf(honeyJar, crops(0, 0), { regular: 5, golden: 0 })).toBe('Honey');
  });

  it('start when the hopper covers their recipe, without two spending the same crops', () => {
    const plan = planFloorStarts({
      machines: [machine('canned_radish'), machine('canned_radish'), machine('pickled_lettuce')],
      processes: [],
      recipes: [radish, lettuce],
      crops: crops(4, 2),
      honey: noHoney,
      waiting: new Set(),
      checkWaiting: false
    });
    expect(plan.starts.map(s => s.machine)).toEqual([0, 2]);
    expect([...plan.waiting]).toEqual([1]);
  });

  it('skip busy machines and those without a recipe, and look again only when waiting machines check', () => {
    const input = {
      machines: [machine('canned_radish'), machine(null), machine('canned_radish')],
      processes: [batch(0)],
      recipes: [radish],
      crops: crops(30, 0),
      honey: noHoney,
      waiting: new Set([2])
    };
    expect(planFloorStarts({ ...input, checkWaiting: false })).toEqual({ starts: [], waiting: new Set([2]) });
    expect(planFloorStarts({ ...input, checkWaiting: true }).starts.map(s => s.machine)).toEqual([2]);
  });
});

describe('the catch-up for a hidden tab', () => {
  it('runs each machine on its recipe, restarting the step after a batch, until the hopper runs dry', () => {
    const state = kitchen({ maxSimultaneousProcesses: 1, machines: [machine('canned_radish')] });
    const result = simulateCanning(40, {
      state,
      crops: crops(9, 0),
      honey: noHoney,
      sortedRecipes: [radish],
      cannerOn: false,
      floor: true,
      heirloomOwned: false
    });
    // 10-second batches, each started the step after the last one finished: steps 11, 22 and 33
    expect(result.floorBatches).toBe(3);
    expect(result.machineJars).toEqual({ 0: 3 });
    expect(result.cropsUsed).toEqual({ Radish: 9 });
    expect(result.batchCount).toEqual({ manual: 0, automated: 3, prizes: 0 });
    expect(result.activeProcesses).toEqual([]);
  });

  it('leaves the Canner off on the floor', () => {
    const state = kitchen({ maxSimultaneousProcesses: 1, machines: [machine(null)] });
    const result = simulateCanning(30, {
      state, crops: crops(30, 0), honey: noHoney, sortedRecipes: [radish], cannerOn: false, floor: true, heirloomOwned: false
    });
    expect(result.floorBatches).toBe(0);
    expect(result.cropsUsed).toEqual({});
  });
});

describe('the canning hook on the floor', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const clock = ({ children }: { children: ReactNode }) => <GameClockProvider>{children}</GameClockProvider>;
  // One act per step, so React renders between steps as it does in play
  const steps = (count: number) => {
    for (let i = 0; i < count; i++) {
      act(() => {
        vi.advanceTimersByTime(GAME_STEP_MS);
      });
    }
  };
  // Made once: the hook's effects follow these, so new ones each render would never settle
  const pantry = [{ name: 'Radish', stash: 30, salePrice: 1 }];
  const engineer = commitToGuild(DEFAULT_GUILD_STATE, 'engineers', 1);
  const start: CanningState = {
    recipes: [],
    unlockedRecipes: [],
    activeProcesses: [],
    maxSimultaneousProcesses: 1,
    upgrades: [],
    totalItemsCanned: 0,
    canningExperience: 0,
    autoCanning: { enabled: false, selectedRecipes: [], priorityOrder: [] }
  };

  const floorHook = (setVeggies = vi.fn(), onBatchesFinished = vi.fn()) => renderHook(() => useCanningSystem(
    pantry, setVeggies, false, 0, vi.fn(), 0, vi.fn(), start, 'profit', 3,
    undefined, undefined, undefined, undefined, undefined, undefined, engineer, false, undefined, onBatchesFinished
  ), { wrapper: clock });

  it('sets up a machine for the first recipe, and it starts on the next step', () => {
    vi.useFakeTimers();
    const setVeggies = vi.fn();
    const { result } = floorHook(setVeggies);

    expect(result.current.canningState.machines).toEqual([machine('canned_radish')]);
    steps(1);
    expect(result.current.canningState.activeProcesses).toMatchObject([{ recipeId: 'canned_radish', machine: 0, automated: true }]);
    const spend = setVeggies.mock.calls[0][0] as (prev: typeof pantry) => typeof pantry;
    expect(spend(pantry)[0].stash).toBe(27);
  });

  it('counts the jars each machine makes and pays them as machine batches', () => {
    vi.useFakeTimers();
    const onBatchesFinished = vi.fn();
    const { result } = floorHook(vi.fn(), onBatchesFinished);

    // Canned Radish takes 21 seconds for Engineers
    steps(23);
    expect(result.current.canningState.machines?.[0].jarsMade).toBe(1);
    expect(result.current.canningState.floorBatches).toBe(1);
    expect(onBatchesFinished).toHaveBeenCalledWith({ manual: 0, automated: 1, prizes: 0 });
  });

  it('lets the player change a machine, and never starts a batch by hand', () => {
    vi.useFakeTimers();
    const { result } = floorHook();

    act(() => {
      result.current.setMachineRecipe(0, null);
    });
    expect(result.current.canningState.machines).toEqual([machine(null)]);
    let started = true;
    act(() => {
      started = result.current.startCanning('canned_radish');
    });
    expect(started).toBe(false);
    steps(3);
    expect(result.current.canningState.activeProcesses).toEqual([]);
  });
});

describe('the Cannery', () => {
  type TabProps = Parameters<typeof CanningTab>[0];
  const crop = (name: string, stash: number) => ({ name, stash, unlocked: true, salePrice: 1, betterSeedsLevel: 0 }) as Veggie;
  const hopper = [crop('Radish', 30), crop('Lettuce', 1), crop('Green Beans', 0)];
  /** Recipes from the game's list, each ingredient on its crop in the hopper */
  const gameRecipes = INITIAL_RECIPES
    .filter(config => ['canned_radish', 'canned_lettuce', 'canned_green_beans'].includes(config.id))
    .map((config): Recipe => ({
      id: config.id,
      name: config.name,
      description: config.description,
      ingredients: config.ingredients.map(ingredient => ({ ...ingredient, veggieIndex: hopper.findIndex(v => v.name === ingredient.veggieName) })),
      processingTime: config.baseProcessingTime,
      baseProcessingTime: config.baseProcessingTime,
      salePrice: config.baseSalePrice,
      baseSalePrice: config.baseSalePrice,
      experienceRequired: config.experienceRequired,
      unlocked: true,
      timesCompleted: 0
    }));
  const upgrade = (id: string, name: string, type: CanningUpgrade['type'], level: number, maxLevel: number): CanningUpgrade => ({
    id, name, description: '', type, level, cost: 100, baseCost: 100, upgradeCostScaling: 2, costCurrency: 'money', maxLevel, effect: 1, unlocked: true
  });
  const floorState: CanningState = {
    recipes: gameRecipes,
    unlockedRecipes: [],
    activeProcesses: [{ recipeId: 'canned_radish', startTime: 0, remainingTime: 7, totalTime: 21, completed: false, automated: true, machine: 0 }],
    maxSimultaneousProcesses: 2,
    upgrades: [upgrade('canning_speed', 'Quick Hands', 'speed', 0, 18), upgrade('canner', 'Canner', 'automation', 1, 1)],
    totalItemsCanned: 12,
    canningExperience: 600,
    autoCanning: { enabled: true, selectedRecipes: [], priorityOrder: [] },
    machines: [{ recipeId: 'canned_radish', jarsMade: 12 }, { recipeId: 'canned_lettuce', jarsMade: 0 }]
  };
  const engineer: GuildState = {
    ...commitToGuild(DEFAULT_GUILD_STATE, 'engineers', 1),
    guildCurrencies: { ...DEFAULT_GUILD_STATE.guildCurrencies, engineers: 400 }
  };

  const renderCannery = (overrides: Partial<TabProps> = {}) => {
    const props: TabProps = {
      canningState: floorState,
      canningUnlocked: true,
      veggies: hopper,
      money: 1000,
      knowledge: 1000,
      heirloomOwned: false,
      startCanning: vi.fn(() => false),
      canMakeRecipe: () => true,
      purchaseUpgrade: vi.fn(() => true),
      toggleAutoCanning: vi.fn(),
      guildState: engineer,
      recipeFilter: 'all',
      recipeSort: 'profit',
      canMakeOnly: false,
      onRecipeFilterChange: vi.fn(),
      onRecipeSortChange: vi.fn(),
      onCanMakeOnlyChange: vi.fn(),
      onSetMachineRecipe: vi.fn(),
      ...overrides
    };
    render(<CanningTab {...props} />);
    return props;
  };

  it('takes the place of the Kitchen for Engineers: the hopper, the machines and the next bay', () => {
    renderCannery();

    expect(screen.getByRole('heading', { name: 'Hopper' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Factory floor · 2 machines' })).toBeInTheDocument();
    const bays = within(screen.getByRole('list', { name: 'Machines' })).getAllByRole('listitem');
    expect(bays).toHaveLength(3);
    expect(bays[0]).toHaveTextContent('Machine 1');
    expect(bays[0]).toHaveTextContent('Running');
    expect(bays[0]).toHaveTextContent('Made 12 jars');
    expect(bays[1]).toHaveTextContent('Waiting for Lettuce: a batch needs 3, the hopper has 1');
    expect(bays[2]).toHaveTextContent('Machine 3');
    expect(screen.queryByRole('button', { name: /^Details for / })).not.toBeInTheDocument();
  });

  it("sets a machine's recipe from the picker", () => {
    const props = renderCannery();

    fireEvent.click(screen.getByRole('button', { name: 'Machine 2: Canned Lettuce. Pick its recipe' }));
    const picker = screen.getByRole('dialog', { name: 'Machine 2: pick a recipe' });
    expect(within(picker).getByRole('button', { name: /^Canned Lettuce/ })).toHaveAttribute('aria-pressed', 'true');
    expect(within(picker).getByRole('button', { name: /^Canned Green Beans/ })).toHaveTextContent('Short of Green Beans');
    fireEvent.click(within(picker).getByRole('button', { name: /^Canned Radish/ }));

    expect(props.onSetMachineRecipe).toHaveBeenCalledWith(1, 'canned_radish');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('leaves the Canner out of the upgrades, and the guild upgrades to the Guilds tab', () => {
    renderCannery();

    const upgrades = screen.getByRole('region', { name: 'Upgrades' });
    expect(within(upgrades).getByText(/Quick Hands/)).toBeInTheDocument();
    expect(upgrades).not.toHaveTextContent(/Canner|Conveyor Belts|Mass Production/);
  });

  it('shows the floor at work', () => {
    renderCannery();

    const stats = screen.getByRole('region', { name: /^Floor/ });
    expect(stats).toHaveTextContent('Machines running1 of 2');
    expect(stats).toHaveTextContent('Next Gearin 5 batches');
    expect(stats).toHaveTextContent('Batch time-30% · Industrial');
    expect(stats).toHaveTextContent('Jar value-25% · Standard Grade');
  });

  it('keeps the Kitchen for everyone else', () => {
    renderCannery({ guildState: DEFAULT_GUILD_STATE });

    expect(screen.getByRole('heading', { name: 'Pantry' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Factory floor/ })).not.toBeInTheDocument();
  });

  it('has a hidden achievement for 10,000 batches off the floor', () => {
    const lightsOut = INITIAL_ACHIEVEMENTS.find(a => a.id === 'engineers_lights_out_factory')!;
    const at = (floorBatches: number) => ({ canningState: { ...floorState, floorBatches } }) as unknown as AchievementGameState;
    expect(lightsOut.hidden).toBe(true);
    expect(lightsOut.requirement.customCheck!(at(9999))).toBe(false);
    expect(lightsOut.requirement.customCheck!(at(10000))).toBe(true);
  });
});
