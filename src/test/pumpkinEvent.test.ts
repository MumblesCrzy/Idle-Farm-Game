import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  usePumpkinEvent,
  isPumpkinSeason,
  pumpkinDemandMultiplier,
  createInitialPumpkinState,
  thanksgivingDay,
  claimedSalesMilestones
} from '../hooks/usePumpkinEvent';
import {
  archieCandyCornReward,
  finishFor,
  getGiantPrice,
  getPumpkinPrice,
  getPumpkinSaleCandyCorn,
  judgeWeighOff,
  parsePumpkinKey,
  rivalBaseWeight,
  rollGiantWeight
} from '../utils/pumpkinPricing';
import { ALL_PUMPKIN_UPGRADES, PUMPKIN_EVENT_CONSTANTS as C } from '../data/pumpkinEventData';
import type { EventUpgrade } from '../types/eventUpgrades';
import type { PumpkinEventState } from '../types/pumpkinEvent';

const upgradesOwning = (...ids: string[]): EventUpgrade[] =>
  ALL_PUMPKIN_UPGRADES.map(u => ({ ...u, owned: u.owned || ids.includes(u.id) }));

/** A state with some Candy Corn and the given upgrades, for renderHook */
const startWith = (overrides: Partial<PumpkinEventState> = {}, ...owned: string[]): Partial<PumpkinEventState> => ({
  ...createInitialPumpkinState(),
  upgrades: upgradesOwning(...owned),
  ...overrides
});

const readyPlot = (variety: 'sugarPie' | 'carver' | 'giant', quality: 'normal' | 'blueRibbon' = 'normal') => ({
  id: 'pumpkin_plot_0', variety, growth: 10, growthTime: 10, quality, harvestReady: true
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('Pumpkin Rush season', () => {
  it('runs from September 22 through Thanksgiving', () => {
    expect(isPumpkinSeason(new Date(2026, 8, 21))).toBe(false);
    expect(isPumpkinSeason(new Date(2026, 8, 22))).toBe(true);
    expect(isPumpkinSeason(new Date(2026, 9, 31, 23, 59))).toBe(true);
    expect(isPumpkinSeason(new Date(2026, 10, 15))).toBe(true);
    expect(isPumpkinSeason(new Date(2026, 10, 26, 23, 59))).toBe(true);
    expect(isPumpkinSeason(new Date(2026, 10, 27))).toBe(false);
  });

  it('finds Thanksgiving on the fourth Thursday of November', () => {
    expect([2026, 2027, 2028].map(year => thanksgivingDay(year).getDate())).toEqual([26, 25, 23]);
    expect(thanksgivingDay(2026).getDay()).toBe(4);
  });

  it('holds the Halloween demand until Thanksgiving, then returns to normal', () => {
    expect(pumpkinDemandMultiplier(new Date(2026, 10, 15))).toBeCloseTo(2);
    expect(pumpkinDemandMultiplier(new Date(2026, 10, 26, 20))).toBeCloseTo(2);
    expect(pumpkinDemandMultiplier(new Date(2026, 10, 27))).toBeCloseTo(1);
  });

  it('doubles demand by Halloween', () => {
    expect(pumpkinDemandMultiplier(new Date(2026, 8, 22))).toBeCloseTo(1);
    expect(pumpkinDemandMultiplier(new Date(2026, 9, 31))).toBeCloseTo(2);
    const middle = pumpkinDemandMultiplier(new Date(2026, 9, 11));
    expect(middle).toBeGreaterThan(1.4);
    expect(middle).toBeLessThan(1.6);
  });
});

describe('Pumpkin pricing', () => {
  it('prices by variety, quality, finish and demand', () => {
    const none = upgradesOwning();
    expect(getPumpkinPrice('sugarPie_normal_plain', none, 1)).toBe(2);
    expect(getPumpkinPrice('carver_normal_plain', none, 1)).toBe(3);
    expect(getPumpkinPrice('carver_blueRibbon_plain', none, 1)).toBe(6);
    expect(getPumpkinPrice('carver_normal_lantern', none, 1)).toBe(9);
    expect(getPumpkinPrice('carver_normal_lantern', none, 2)).toBe(18);
  });

  it('adds Candy Corn for a carving or a candle, more than the stencil or candle sells for', () => {
    const none = upgradesOwning();
    for (const demand of [1, 1.5, 2]) {
      const plain = getPumpkinPrice('sugarPie_normal_plain', none, demand);
      expect(getPumpkinPrice('sugarPie_normal_carved', none, demand)).toBe(plain + 2);
      expect(getPumpkinPrice('sugarPie_normal_candlelit', none, demand)).toBe(plain + 3);
      expect(getPumpkinPrice('sugarPie_normal_carved', none, demand) - plain).toBeGreaterThan(C.GOOD_PRICES.stencils);
      expect(getPumpkinPrice('sugarPie_normal_candlelit', none, demand) - plain).toBeGreaterThan(C.GOOD_PRICES.candles);
    }
    expect(getPumpkinPrice('carver_blueRibbon_carved', none, 1)).toBe(8);
  });

  it('applies Glowing Lanterns, Harvest Display and Bunting', () => {
    expect(getPumpkinPrice('carver_normal_lantern', upgradesOwning('glowing_lanterns'), 1)).toBe(13); // 9 x 1.5
    expect(getPumpkinPrice('carver_blueRibbon_plain', upgradesOwning('harvest_display'), 1)).toBe(9);  // 6 x 1.5
    expect(getPumpkinSaleCandyCorn('carver_normal_plain', 10, upgradesOwning('bunting'), 1)).toBe(33);
  });

  it('applies Spooky Patterns to carved pumpkins and Jack-o\'-Lanterns only', () => {
    const spooky = upgradesOwning('spooky_patterns');
    expect(getPumpkinPrice('carver_normal_lantern', spooky, 1)).toBe(11);                    // 9 x 1.25
    expect(getPumpkinPrice('carver_normal_carved', spooky, 4)).toBe(17);                     // 12 x 1.25, +2 carving
    expect(getPumpkinPrice('carver_normal_plain', spooky, 4)).toBe(12);                      // no bonus
    expect(getPumpkinPrice('carver_normal_candlelit', spooky, 4)).toBe(15);                  // 12 and +3 candle; no Spooky bonus
    expect(getPumpkinPrice('carver_normal_lantern', upgradesOwning('spooky_patterns', 'glowing_lanterns'), 1)).toBe(15); // 9 x 1.75
  });

  it('prices giants by weight', () => {
    expect(getGiantPrice(800, 'normal', upgradesOwning(), 1)).toBe(20);
    expect(getGiantPrice(800, 'normal', upgradesOwning(), 2)).toBe(40);
  });

  it('names finishes from decorations', () => {
    expect(finishFor(['carving'])).toBe('carved');
    expect(finishFor(['candle'])).toBe('candlelit');
    expect(finishFor(['carving', 'candle'])).toBe('lantern');
    expect(parsePumpkinKey('carver_blueRibbon_lantern')).toEqual({ variety: 'carver', quality: 'blueRibbon', finish: 'lantern' });
  });
});

describe('Archie during the Pumpkin Rush', () => {
  it('finds more Candy Corn as pumpkins sell, and more on a streak', () => {
    expect(archieCandyCornReward(0, 1)).toBe(50);
    expect(archieCandyCornReward(999, 1)).toBe(150);
    expect(archieCandyCornReward(0, 3)).toBe(100);
    expect(archieCandyCornReward(10 ** 12, 10)).toBe(1500);
  });
});

describe('County Fair judging', () => {
  it('weighs giants by roll, quality and tonic', () => {
    expect(rollGiantWeight('normal', 0, 0)).toBe(300);
    expect(rollGiantWeight('normal', 0, 1)).toBe(800);
    expect(rollGiantWeight('blueRibbon', 0, 0)).toBe(450);
    expect(rollGiantWeight('normal', 5, 0)).toBe(450);
  });

  it('places a giant against heavier rivals, with ties going to the player', () => {
    const base = rivalBaseWeight(0);
    const lightest = Math.round(base * 0.8);
    const heaviest = Math.round(base * 1.2);

    expect(judgeWeighOff(heaviest + 1, 0, [1, 1, 1]).placing).toBe(1);
    expect(judgeWeighOff(heaviest, 0, [1, 1, 1]).placing).toBe(1);
    expect(judgeWeighOff(lightest - 1, 0, [0, 0, 0]).placing).toBe(4);
    expect(judgeWeighOff(base, 0, [0, 1, 1]).placing).toBe(3);
  });

  it('makes rivals heavier with each fair entered', () => {
    expect(rivalBaseWeight(5)).toBeGreaterThan(rivalBaseWeight(0));
  });
});

describe('usePumpkinEvent', () => {
  it('plants only unlocked varieties and grows them', () => {
    const { result } = renderHook(() => usePumpkinEvent({ initialState: startWith() }));

    act(() => {
      result.current.plantPumpkin(0, 'giant');
      result.current.plantPumpkin(1, 'sugarPie');
    });
    expect(result.current.plots[0].variety).toBeNull();
    expect(result.current.plots[1].variety).toBe('sugarPie');

    act(() => {
      result.current.processPumpkinGrowth(180);
    });
    expect(result.current.plots[1].harvestReady).toBe(true);
  });

  it('grows faster with Compost Heap and rolls Blue Ribbons with Prize Seeds', () => {
    const upgrades = upgradesOwning('prize_seeds').map(u => u.id === 'compost_heap' ? { ...u, owned: true, level: 2 } : u);
    const { result } = renderHook(() => usePumpkinEvent({ initialState: startWith({ upgrades }) }));
    act(() => {
      result.current.plantPumpkin(0, 'sugarPie');
    });

    vi.spyOn(Math, 'random').mockReturnValue(0); // every roll hits
    act(() => {
      result.current.processPumpkinGrowth(139); // 139 x 1.3 = 180.7 days
    });

    expect(result.current.plots[0].harvestReady).toBe(true);
    expect(result.current.plots[0].quality).toBe('blueRibbon');
  });

  it('harvests a pumpkin into the inventory with materials and Candy Corn, and logs once', () => {
    const onPumpkinHarvested = vi.fn();
    const plots = createInitialPumpkinState().plots.map((p, i) => i === 0 ? readyPlot('carver') : p);
    const { result } = renderHook(() => usePumpkinEvent({ initialState: startWith({ plots }), onPumpkinHarvested }));

    act(() => {
      result.current.processPumpkinGrowth(); // another update queued first
      result.current.harvestPumpkin(0);
    });

    expect(result.current.eventState.inventory).toEqual({ carver_normal_plain: 1 });
    expect(result.current.materials).toMatchObject({ seeds: 3, pulp: 3, vines: 2 });
    expect(result.current.candyCorn).toBe(1);
    expect(result.current.plots[0].variety).toBeNull();
    expect(onPumpkinHarvested).toHaveBeenCalledTimes(1);
    expect(onPumpkinHarvested).toHaveBeenCalledWith('Carver', 'Normal', undefined);
  });

  it('puts a harvested giant on the shelf with its weight', () => {
    const plots = createInitialPumpkinState().plots.map((p, i) => i === 0 ? readyPlot('giant') : p);
    const { result } = renderHook(() => usePumpkinEvent({ initialState: startWith({ plots }, 'unlock_giant') }));

    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    act(() => {
      result.current.harvestPumpkin(0);
    });

    expect(result.current.giantShelf).toHaveLength(1);
    expect(result.current.giantShelf[0].weight).toBe(550);
    expect(result.current.eventState.weighOff.personalBest).toBe(550);
    expect(result.current.eventState.inventory).toEqual({});
  });

  it('grows giants heavier with champion seeds from County Fair wins', () => {
    const initial = createInitialPumpkinState();
    const plots = initial.plots.map((p, i) => i === 0 ? readyPlot('giant') : p);
    const weighOff = { ...initial.weighOff, ribbons: { first: 4, second: 0, third: 0 } };
    const { result } = renderHook(() => usePumpkinEvent({ initialState: startWith({ plots, weighOff }, 'unlock_giant') }));

    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    act(() => {
      result.current.harvestPumpkin(0);
    });

    // 550 lb, and 20% more from four wins
    expect(result.current.giantShelf[0].weight).toBe(660);
  });

  it('lets the Scarecrow Crew finish pumpkins at harvest', () => {
    const plots = createInitialPumpkinState().plots.map((p, i) => i === 0 ? readyPlot('sugarPie') : p);
    const materials = { ...createInitialPumpkinState().materials, stencils: 1, candles: 1 };
    const { result } = renderHook(() => usePumpkinEvent({ initialState: startWith({ plots, materials }, 'scarecrow_crew') }));

    act(() => {
      result.current.harvestPumpkin(0);
    });

    expect(result.current.eventState.inventory).toEqual({ sugarPie_normal_lantern: 1 });
  });

  it('crafts only unlocked recipes with enough materials', () => {
    const materials = { ...createInitialPumpkinState().materials, seeds: 10, pulp: 8, vines: 3 };
    const onItemCrafted = vi.fn();
    const { result } = renderHook(() => usePumpkinEvent({ initialState: startWith({ materials }), onItemCrafted }));

    let pies = false;
    let stencils = true;
    act(() => {
      pies = result.current.craftItem('bake_pie', 2);
      stencils = result.current.craftItem('cut_stencils', 1); // needs the Stencil Table
    });

    expect(pies).toBe(true);
    expect(stencils).toBe(false);
    expect(result.current.materials).toMatchObject({ pies: 2, pulp: 0, seeds: 8, vines: 3 });
    expect(onItemCrafted).toHaveBeenCalledTimes(1);
  });

  it('carves and lights plain pumpkins, normal ones first', () => {
    const materials = { ...createInitialPumpkinState().materials, stencils: 2, candles: 1 };
    const inventory = { carver_normal_plain: 1, carver_blueRibbon_plain: 1 };
    const { result } = renderHook(() => usePumpkinEvent({ initialState: startWith({ materials, inventory }) }));

    act(() => {
      result.current.decoratePumpkin('carver', ['carving', 'candle']);
    });
    act(() => {
      result.current.decoratePumpkin('carver', ['carving']);
    });

    expect(result.current.eventState.inventory).toEqual({ carver_normal_lantern: 1, carver_blueRibbon_carved: 1 });
    expect(result.current.materials).toMatchObject({ stencils: 0, candles: 0 });
    let giant = true;
    act(() => {
      giant = result.current.decoratePumpkin('giant', ['carving']);
    });
    expect(giant).toBe(false);
  });

  it('sells pumpkins for the priced amount, with Fortune Teller tips', () => {
    const onPumpkinSold = vi.fn();
    const inventory = { carver_normal_plain: 4 };
    const { result } = renderHook(() => usePumpkinEvent({
      initialState: startWith({ inventory }, 'chalkboard_sign', 'hayride', 'fortune_teller'),
      onPumpkinSold
    }));
    const demand = result.current.demandMultiplier;
    const price = getPumpkinPrice('carver_normal_plain', result.current.eventState.upgrades, demand);

    vi.spyOn(Math, 'random').mockReturnValue(0); // every tip hits at its smallest
    act(() => {
      result.current.sellPumpkins('carver_normal_plain', 4);
    });

    const tips = 4 * Math.floor(price * 0.2);
    expect(result.current.candyCorn).toBe(price * 4 + tips);
    expect(result.current.totalPumpkinsSold).toBe(4);
    expect(result.current.lastFortuneTip.amount).toBe(tips);
    expect(onPumpkinSold).toHaveBeenCalledWith('Carver', 4, price * 4 + tips);
  });

  it('sells everything in the inventory with Sell All', () => {
    const inventory = { sugarPie_normal_plain: 3, carver_normal_lantern: 1 };
    const { result } = renderHook(() => usePumpkinEvent({ initialState: startWith({ inventory }) }));
    const demand = result.current.demandMultiplier;
    const upgrades = result.current.eventState.upgrades;
    const expected = Math.floor(
      getPumpkinPrice('sugarPie_normal_plain', upgrades, demand) * 3 + getPumpkinPrice('carver_normal_lantern', upgrades, demand)
    );

    act(() => {
      result.current.sellAllPumpkins();
    });

    expect(result.current.eventState.inventory).toEqual({});
    expect(result.current.totalPumpkinsSold).toBe(4);
    expect(result.current.candyCorn).toBe(expected);
  });

  it('sells goods at their fixed prices', () => {
    const materials = { ...createInitialPumpkinState().materials, pies: 2, candles: 3 };
    const { result } = renderHook(() => usePumpkinEvent({ initialState: startWith({ materials }) }));
    act(() => {
      result.current.sellGoods('pies', 2);
      result.current.sellGoods('candles', 5); // only 3 in stock
    });
    expect(result.current.candyCorn).toBe(2 * C.GOOD_PRICES.pies);
    expect(result.current.materials).toMatchObject({ pies: 0, candles: 3 });
  });

  it('pays the daily bonus once a day, only with the Chalkboard Sign', () => {
    const noSign = renderHook(() => usePumpkinEvent({ initialState: startWith() }));
    let claimed = true;
    act(() => {
      claimed = noSign.result.current.claimDailyBonus();
    });
    expect(claimed).toBe(false);

    const { result } = renderHook(() => usePumpkinEvent({ initialState: startWith({}, 'chalkboard_sign') }));
    expect(result.current.dailyBonusAvailable).toBe(true);
    let first = false;
    let second = true;
    act(() => {
      first = result.current.claimDailyBonus();
    });
    act(() => {
      second = result.current.claimDailyBonus();
    });
    expect([first, second]).toEqual([true, false]);
    expect(result.current.candyCorn).toBe(C.DAILY_BONUS);
    expect(result.current.dailyBonusAvailable).toBe(false);
  });

  it('pays Hayride income across seconds without losing the fraction', () => {
    const { result } = renderHook(() => usePumpkinEvent({ initialState: startWith({ candyCorn: 1800 }, 'chalkboard_sign') }));
    act(() => {
      result.current.purchaseUpgrade('hayride');
    });
    expect(result.current.passiveCandyCornPerSecond).toBeCloseTo(0.1);

    for (let i = 0; i < 25; i++) {
      act(() => {
        result.current.updatePassiveIncome(1000);
      });
    }
    expect(result.current.candyCorn).toBe(2);
  });

  it('enforces prerequisites and adds a plot with Patch Expansion', () => {
    const { result } = renderHook(() => usePumpkinEvent({ initialState: startWith({ candyCorn: 5000 }) }));
    let hayride = true;
    act(() => {
      hayride = result.current.purchaseUpgrade('hayride'); // needs the Chalkboard Sign
      result.current.purchaseUpgrade('patch_expansion');
    });
    expect(hayride).toBe(false);
    expect(result.current.plots).toHaveLength(C.DEFAULT_PLOT_COUNT + 1);
    expect(result.current.candyCorn).toBe(5000 - 200);
  });

  it('reads the sales milestones an older save claimed', () => {
    const saved = { milestones: [{ id: 'pumpkin_first_sale', claimed: true }, { id: 'pumpkin_50_sold', claimed: false }] };
    expect([...claimedSalesMilestones(saved)]).toEqual(['pumpkin_first_sale']);
    expect(claimedSalesMilestones(undefined).size).toBe(0);
    expect(claimedSalesMilestones(createInitialPumpkinState()).size).toBe(0);
  });

  describe('the weigh-off', () => {
    const giant = { id: 'giant_1', weight: 2000, quality: 'normal' as const };

    it('only accepts an entry while the fair is open', () => {
      const { result } = renderHook(() => usePumpkinEvent({ initialState: startWith({ giantShelf: [giant] }) }));
      let entry: unknown = 'not run';
      act(() => {
        entry = result.current.enterWeighOff('giant_1');
      });
      expect(entry).toBeNull();
      expect(result.current.giantShelf).toHaveLength(1);
    });

    it('opens after the fair interval of game days', () => {
      const { result } = renderHook(() => usePumpkinEvent({ initialState: startWith() }));
      act(() => {
        result.current.processPumpkinGrowth(C.FAIR_INTERVAL_DAYS);
      });
      expect(result.current.eventState.weighOff.daysUntilFair).toBe(0);
    });

    it('judges the entry, pays the prize and schedules the next fair', () => {
      const onWeighOff = vi.fn();
      const weighOff = { ...createInitialPumpkinState().weighOff, daysUntilFair: 0 };
      const { result } = renderHook(() => usePumpkinEvent({ initialState: startWith({ giantShelf: [giant], weighOff }), onWeighOff }));

      let entry: ReturnType<typeof result.current.enterWeighOff> = null;
      act(() => {
        entry = result.current.enterWeighOff('giant_1');
      });

      expect(entry!.placing).toBe(1);
      expect(result.current.giantShelf).toHaveLength(0);
      expect(result.current.candyCorn).toBe(entry!.prize);
      expect(result.current.eventState.weighOff).toMatchObject({
        daysUntilFair: C.FAIR_INTERVAL_DAYS,
        fairsEntered: 1,
        ribbons: { first: 1, second: 0, third: 0 }
      });
      expect(onWeighOff).toHaveBeenCalledWith(entry);
    });

    it('sells a giant by weight', () => {
      const { result } = renderHook(() => usePumpkinEvent({ initialState: startWith({ giantShelf: [{ ...giant, weight: 400 }] }) }));
      const price = getGiantPrice(400, 'normal', result.current.eventState.upgrades, result.current.demandMultiplier);
      act(() => {
        result.current.sellGiant('giant_1');
      });
      expect(result.current.candyCorn).toBe(price);
      expect(result.current.totalPumpkinsSold).toBe(1);
    });
  });

  it('keeps saved purchases and picks up new upgrades from code', () => {
    const saved = startWith({ candyCorn: 7 }, 'unlock_carver');
    saved.upgrades = saved.upgrades!.filter(u => u.id !== 'glowing_lanterns');

    const { result } = renderHook(() => usePumpkinEvent({ initialState: JSON.parse(JSON.stringify(saved)) }));

    expect(result.current.candyCorn).toBe(7);
    expect(result.current.eventState.upgrades.find(u => u.id === 'unlock_carver')?.owned).toBe(true);
    expect(result.current.eventState.upgrades.some(u => u.id === 'glowing_lanterns')).toBe(true);
  });

  it('crew crafts supplies first, then finishes plain pumpkins', () => {
    const materials = { ...createInitialPumpkinState().materials, seeds: 2, vines: 1 };
    const inventory = { sugarPie_normal_plain: 1 };
    const { result } = renderHook(() => usePumpkinEvent({
      initialState: startWith({ materials, inventory }, 'scarecrow_crew', 'stencil_table')
    }));

    act(() => {
      result.current.processScarecrowCrew(3); // candle, stencils, then carve and light
    });

    expect(result.current.eventState.inventory).toEqual({ sugarPie_normal_lantern: 1 });
    expect(result.current.materials).toMatchObject({ seeds: 0, vines: 0, candles: 0, stencils: 1 });
    expect(result.current.currentCrewAction).toEqual({ type: 'craft', recipeId: 'make_candles' });
  });

  it('crew bakes pies before candles, and candles before stencils', () => {
    const materials = { ...createInitialPumpkinState().materials, seeds: 3, pulp: 4, vines: 1 };
    const { result } = renderHook(() => usePumpkinEvent({
      initialState: startWith({ materials }, 'scarecrow_crew', 'stencil_table')
    }));

    act(() => {
      result.current.processScarecrowCrew(1);
    });
    expect(result.current.materials).toMatchObject({ pies: 1, pulp: 0, seeds: 2, candles: 0, stencils: 0 });
    expect(result.current.currentCrewAction).toEqual({ type: 'craft', recipeId: 'bake_pie' });

    act(() => {
      result.current.processScarecrowCrew(1);
    });
    expect(result.current.materials).toMatchObject({ candles: 1, seeds: 0, stencils: 0 });

    act(() => {
      result.current.processScarecrowCrew(1);
    });
    expect(result.current.materials).toMatchObject({ stencils: 2, vines: 0 });
  });

  it('crew saves a lone candle or stencil for a Jack-o\'-Lantern instead of a lesser finish', () => {
    const inventory = { sugarPie_normal_plain: 1 };
    const withCandle = renderHook(() => usePumpkinEvent({
      initialState: startWith({ materials: { ...createInitialPumpkinState().materials, candles: 1 }, inventory }, 'scarecrow_crew')
    }));
    const withStencil = renderHook(() => usePumpkinEvent({
      initialState: startWith({ materials: { ...createInitialPumpkinState().materials, stencils: 1 }, inventory }, 'scarecrow_crew')
    }));

    act(() => {
      withCandle.result.current.processScarecrowCrew(2);
      withStencil.result.current.processScarecrowCrew(2);
    });

    expect(withCandle.result.current.eventState.inventory).toEqual(inventory);
    expect(withCandle.result.current.materials.candles).toBe(1);
    expect(withStencil.result.current.eventState.inventory).toEqual(inventory);
    expect(withStencil.result.current.materials.stencils).toBe(1);
  });
});
