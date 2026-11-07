import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useSummerEvent,
  isSummerSeason,
  summerDemandMultiplier,
  createInitialSummerState,
  loadSummerState,
  laborDay
} from '../hooks/useSummerEvent';
import {
  archieTicketsReward,
  championBrixBonus,
  championWeightBonus,
  getGiantPrice,
  getGiantSaleTickets,
  getGoodPrice,
  getGoodSaleTickets,
  getMelonPrice,
  getMelonSaleTickets,
  goodLabel,
  iceCap,
  melonFinishFor,
  melonGrowthSpeed,
  melonLabel,
  picnicJobsPerSecond,
  rollGiantWeight,
  rollSpit,
  rollSweetness
} from '../utils/summerPricing';
import { archieCandyCornReward } from '../utils/pumpkinPricing';
import { createChallengeBoard, openChallenge } from '../utils/challenges';
import { ALL_SUMMER_UPGRADES } from '../data/summerEventData';
import type { EventUpgrade } from '../types/eventUpgrades';
import type {
  ChallengeBoardState,
  ChallengeKind,
  MelonVariety,
  SummerEventState,
  SummerMaterials
} from '../types/summerEvent';

const upgradesOwning = (...ids: string[]): EventUpgrade[] =>
  ALL_SUMMER_UPGRADES.map(u => ({ ...u, owned: u.owned || ids.includes(u.id) }));

/** The upgrades with one repeatable upgrade at a level */
const withLevel = (upgrades: EventUpgrade[], id: string, level: number): EventUpgrade[] =>
  upgrades.map(u => u.id === id ? { ...u, owned: true, level } : u);

/** A state with the given upgrades, for renderHook */
const startWith = (overrides: Partial<SummerEventState> = {}, ...owned: string[]): Partial<SummerEventState> => ({
  ...createInitialSummerState(),
  upgrades: upgradesOwning(...owned),
  ...overrides
});

const stock = (materials: Partial<SummerMaterials>): SummerMaterials => ({ ...createInitialSummerState().materials, ...materials });

const readyPlot = (variety: MelonVariety, index = 0) => ({
  id: `melon_plot_${index}`, variety, growth: 10, growthTime: 10, harvestReady: true
});

/** A board with one challenge of each given kind, a year long, every rival at the middle of the spread */
const boardWith = (...kinds: ChallengeKind[]): ChallengeBoardState => ({
  ...createChallengeBoard(),
  challenges: kinds.map((kind, i) => openChallenge(`challenge_${i}`, kind, 365, 0, [0.5, 0.5, 0.5])),
  challengesOpened: kinds.length,
});

const render = (state: Partial<SummerEventState>, params: Omit<Parameters<typeof useSummerEvent>[0] & object, 'initialState'> = {}) =>
  renderHook(() => useSummerEvent({ initialState: state, ...params }));

beforeEach(() => {
  // Out of season, so stall demand is 1x whenever the tests run
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 3, 12));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('Summer Festival season', () => {
  it('runs from June 21 through Labor Day', () => {
    expect(isSummerSeason(new Date(2027, 5, 20, 23, 59))).toBe(false);
    expect(isSummerSeason(new Date(2027, 5, 21))).toBe(true);
    expect(isSummerSeason(new Date(2027, 6, 4))).toBe(true);
    expect(isSummerSeason(new Date(2027, 8, 6, 23, 59))).toBe(true);
    expect(isSummerSeason(new Date(2027, 8, 7))).toBe(false);
    expect(isSummerSeason(new Date(2026, 10, 3))).toBe(false);
  });

  it('finds Labor Day on the first Monday of September', () => {
    expect([2026, 2027, 2028].map(year => laborDay(year).getDate())).toEqual([7, 6, 4]);
    expect([2026, 2027, 2028].every(year => laborDay(year).getDay() === 1)).toBe(true);
  });

  it('doubles demand by the Fourth of July, holds it until Labor Day, then returns to normal', () => {
    expect(summerDemandMultiplier(new Date(2027, 5, 21))).toBeCloseTo(1);
    expect(summerDemandMultiplier(new Date(2027, 5, 27, 12))).toBeCloseTo(1.5, 1);
    expect(summerDemandMultiplier(new Date(2027, 6, 4))).toBeCloseTo(2);
    expect(summerDemandMultiplier(new Date(2027, 8, 6, 20))).toBeCloseTo(2);
    expect(summerDemandMultiplier(new Date(2027, 8, 8))).toBeCloseTo(1);
  });
});

describe('Summer pricing', () => {
  const none = upgradesOwning();

  it('prices melons by kind, grade, finish and demand', () => {
    expect(getMelonPrice('sugarBaby_normal_plain', none, 1)).toBe(2);
    expect(getMelonPrice('crimsonSweet_normal_plain', none, 1)).toBe(3);
    expect(getMelonPrice('sugarBaby_sugar_plain', none, 1)).toBe(4);
    expect(getMelonPrice('sugarBaby_normal_plain', none, 2)).toBe(4);
    expect(getMelonPrice('sugarBaby_normal_chilled', none, 1)).toBe(4);
    expect(getMelonPrice('sugarBaby_normal_carved', none, 1)).toBe(5);
    expect(getMelonPrice('sugarBaby_normal_basket', none, 1)).toBe(6);
  });

  it('pays more for a finish than its ice or cup sells for alone', () => {
    const plain = getMelonPrice('sugarBaby_normal_plain', none, 1);
    expect(getMelonPrice('sugarBaby_normal_chilled', none, 1) - plain).toBeGreaterThan(getGoodPrice('ice'));
    expect(getMelonPrice('sugarBaby_normal_carved', none, 1) - plain).toBeGreaterThan(getGoodPrice('cups'));
    expect(getMelonPrice('sugarBaby_normal_basket', none, 1)).toBeGreaterThan(plain + getGoodPrice('ice') + getGoodPrice('cups'));
  });

  it('sells cold melons and goods for half again in a Heatwave', () => {
    expect(getMelonPrice('sugarBaby_normal_chilled', none, 1, true)).toBe(6);
    expect(getMelonPrice('sugarBaby_normal_basket', none, 1, true)).toBe(9);
    expect(getMelonPrice('sugarBaby_normal_plain', none, 1, true)).toBe(2);
    expect(getMelonPrice('sugarBaby_normal_carved', none, 1, true)).toBe(5);
    expect(getGoodSaleTickets('ice', 3)).toBe(3);
    expect(getGoodSaleTickets('ice', 3, true)).toBe(4);
    expect(getGoodSaleTickets('agua', 1, true)).toBe(9);
    expect(getGoodSaleTickets('cups', 1, true)).toBe(2);
  });

  it('applies Fancy Carving to Carved melons and baskets, Gingham Cloth to baskets, the Tasting Table to Sugar Melons', () => {
    expect(getMelonPrice('crimsonSweet_normal_basket', none, 1)).toBe(9);
    expect(getMelonPrice('crimsonSweet_normal_basket', upgradesOwning('fancy_carving'), 1)).toBe(11);
    expect(getMelonPrice('crimsonSweet_normal_basket', upgradesOwning('fancy_carving', 'gingham_cloth'), 1)).toBe(15);
    expect(getMelonPrice('crimsonSweet_normal_chilled', upgradesOwning('fancy_carving', 'gingham_cloth'), 1)).toBe(5);
    expect(getMelonPrice('sugarBaby_sugar_plain', upgradesOwning('tasting_table'), 1)).toBe(6);
  });

  it('applies Summer Bunting to melon sales, giants included', () => {
    expect(getMelonSaleTickets('sugarBaby_normal_plain', 10, none, 1)).toBe(20);
    expect(getMelonSaleTickets('sugarBaby_normal_plain', 10, upgradesOwning('summer_bunting'), 1)).toBe(22);
    expect(getGiantPrice(142, 1)).toBe(28);
    expect(getGiantPrice(142, 1.6)).toBe(45);
    expect(getGiantSaleTickets(142, upgradesOwning('summer_bunting'), 1)).toBe(30);
  });

  it('names finishes from decorations, and counts in words', () => {
    expect(melonFinishFor([])).toBe('plain');
    expect(melonFinishFor(['chill'])).toBe('chilled');
    expect(melonFinishFor(['carve'])).toBe('carved');
    expect(melonFinishFor(['carve', 'chill'])).toBe('basket');
    expect(melonLabel('sugarBaby', 'plain', 5)).toBe('5 Sugar Babies');
    expect(melonLabel('crimsonSweet', 'chilled', 1)).toBe('1 Chilled Crimson Sweet');
    expect(melonLabel('sugarBaby', 'basket', 3)).toBe('3 Sugar Baby Picnic Baskets');
    expect(goodLabel('ice', 4)).toBe('4 Snow Cones');
    expect(goodLabel('pickles', 1)).toBe('1 jar of Pickled Rinds');
  });

  it('sets the patch, Ice House and crew rates from upgrades', () => {
    expect(melonGrowthSpeed(withLevel(none, 'straw_mulch', 2))).toBeCloseTo(1.3);
    expect(iceCap(none)).toBe(10);
    expect(iceCap(upgradesOwning('sawdust_packing'))).toBe(25);
    expect(picnicJobsPerSecond(none)).toBe(1);
    expect(picnicJobsPerSecond(withLevel(none, 'extra_hands', 3))).toBe(4);
  });
});

describe('Sweetness, weight and spits', () => {
  const none = upgradesOwning();

  it('rolls a plain melon from 8.0 to 11.9 Brix, and Sugar Seeds sometimes from 12.0 to 13.5', () => {
    expect(rollSweetness(none, 0, 0, 0)).toEqual({ brix: 8, quality: 'normal' });
    expect(rollSweetness(none, 0, 0, 1)).toEqual({ brix: 11.9, quality: 'normal' });
    const seeds = upgradesOwning('sugar_seeds');
    expect(rollSweetness(seeds, 0, 0.05, 0)).toEqual({ brix: 12, quality: 'sugar' });
    expect(rollSweetness(seeds, 0, 0.05, 1)).toEqual({ brix: 13.5, quality: 'sugar' });
    expect(rollSweetness(seeds, 0, 0.2, 0)).toEqual({ brix: 8, quality: 'normal' });
  });

  it('makes a Sugar Melon of anything Sun-Ripening or Sweetest Melon wins raise past 12.0', () => {
    expect(rollSweetness(withLevel(none, 'sun_ripening', 5), 0, 0.5, 1)).toEqual({ brix: 12.9, quality: 'sugar' });
    expect(rollSweetness(none, 3, 0.5, 1)).toEqual({ brix: 12.2, quality: 'sugar' });
    expect(championBrixBonus(3)).toBeCloseTo(0.3);
    expect(championBrixBonus(20)).toBeCloseTo(0.8);
  });

  it('weighs a Carolina Cross from 50 to 130 lb, more with Vine Pruning and Heaviest Melon wins', () => {
    expect(rollGiantWeight(none, 0, 0)).toBe(50);
    expect(rollGiantWeight(none, 0, 1)).toBe(130);
    expect(rollGiantWeight(withLevel(none, 'vine_pruning', 2), 0, 0)).toBe(60);
    expect(rollGiantWeight(none, 10, 1)).toBe(182);
    expect(championWeightBonus(3)).toBeCloseTo(0.15);
    expect(championWeightBonus(20)).toBeCloseTo(0.4);
  });

  it('spits from 10 to 30 ft, 2 more a level of Spitting Practice', () => {
    expect(rollSpit(none, 0)).toBe(10);
    expect(rollSpit(none, 1)).toBe(30);
    expect(rollSpit(withLevel(none, 'spitting_practice', 3), 0)).toBe(16);
  });
});

describe('Archie during the Summer Festival', () => {
  it('finds Tickets by the Candy Corn rule', () => {
    for (const [sold, streak] of [[0, 1], [50, 2], [5000, 5]]) {
      expect(archieTicketsReward(sold, streak)).toBe(archieCandyCornReward(sold, streak));
    }
  });
});

describe('useSummerEvent: the Melon Patch', () => {
  it('plants only unlocked melons and grows them', () => {
    const { result } = render(startWith());
    act(() => result.current.plantMelon(0, 'crimsonSweet'));
    expect(result.current.plots[0].variety).toBeNull();

    act(() => result.current.plantMelon(0, 'sugarBaby'));
    expect(result.current.plots[0]).toMatchObject({ variety: 'sugarBaby', growthTime: 180, harvestReady: false });
    act(() => result.current.processSummerGrowth(179));
    expect(result.current.plots[0].harvestReady).toBe(false);
    act(() => result.current.processSummerGrowth(1));
    expect(result.current.plots[0].harvestReady).toBe(true);
  });

  it('grows faster with Straw Mulch', () => {
    const { result } = render(startWith({ upgrades: withLevel(upgradesOwning(), 'straw_mulch', 2) }));
    act(() => result.current.plantMelon(0, 'sugarBaby'));
    act(() => result.current.processSummerGrowth(10));
    expect(result.current.plots[0].growth).toBeCloseTo(13);
  });

  it('harvests a Sugar Baby with seeds, a split, a Ticket and a sweetness, and reports it once', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.25);
    const onMelonHarvested = vi.fn();
    const { result } = render(startWith({ plots: [readyPlot('sugarBaby')] }), { onMelonHarvested });

    act(() => result.current.harvestMelon(0));

    expect(result.current.inventory).toEqual({ sugarBaby_normal_plain: 1 });
    expect(result.current.materials).toMatchObject({ seeds: 2, splits: 1 });
    expect(result.current.tickets).toBe(1);
    expect(result.current.plots[0]).toMatchObject({ variety: null, harvestReady: false });
    expect(onMelonHarvested).toHaveBeenCalledTimes(1);
    expect(onMelonHarvested).toHaveBeenCalledWith({ variety: 'sugarBaby', quality: 'normal', brix: 9, weight: 0 });
    expect(result.current.recentHarvests[0].brix).toBe(9);
    expect(result.current.eventState.personalBest.brix).toBe(9);
  });

  it('grows Sugar Melons with Sugar Seeds, with double the seeds and splits and 3 Tickets', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.05);
    const { result } = render(startWith({ plots: [readyPlot('sugarBaby')] }, 'sugar_seeds'));
    act(() => result.current.harvestMelon(0));

    expect(result.current.inventory).toEqual({ sugarBaby_sugar_plain: 1 });
    expect(result.current.materials).toMatchObject({ seeds: 4, splits: 2 });
    expect(result.current.tickets).toBe(3);
    expect(result.current.recentHarvests[0]).toMatchObject({ quality: 'sugar', brix: 12.1 });
  });

  it('puts a Carolina Cross on the shelf with its weight, or sells it on the spot when the shelf is full', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const { result } = render(startWith({ plots: [readyPlot('carolinaCross')] }));
    act(() => result.current.harvestMelon(0));

    expect(result.current.giantShelf).toEqual([{ id: 'giant_1', weight: 90 }]);
    expect(result.current.materials).toMatchObject({ seeds: 8, splits: 4 });
    expect(result.current.tickets).toBe(1);
    expect(result.current.totalMelonsSold).toBe(0);
    expect(result.current.recentHarvests[0]).toEqual({ variety: 'carolinaCross', quality: 'normal', brix: 0, weight: 90 });

    const fullShelf = Array.from({ length: 12 }, (_, i) => ({ id: `giant_${i}`, weight: 60 }));
    const full = render(startWith({ plots: [readyPlot('carolinaCross')], giantShelf: fullShelf, giantsGrown: 12 }));
    act(() => full.result.current.harvestMelon(0));
    expect(full.result.current.giantShelf).toHaveLength(12);
    expect(full.result.current.tickets).toBe(1 + getGiantSaleTickets(90, upgradesOwning(), 1));
    expect(full.result.current.totalMelonsSold).toBe(1);
  });

  it('lets the Picnic Crew pack a Picnic Basket at harvest when ice and a cup are in stock', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.25);
    const { result } = render(startWith({ plots: [readyPlot('crimsonSweet')], materials: stock({ ice: 1, cups: 1 }) }, 'picnic_crew'));
    act(() => result.current.harvestMelon(0));
    expect(result.current.inventory).toEqual({ crimsonSweet_normal_basket: 1 });
    expect(result.current.materials).toMatchObject({ ice: 0, cups: 0 });
  });

  it('harvests every ready plot at once, and remembers the last five, newest first', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.25);
    const plots = [
      ...Array.from({ length: 6 }, (_, i) => readyPlot(i === 5 ? 'crimsonSweet' : 'sugarBaby', i)),
      { id: 'melon_plot_6', variety: null, growth: 0, growthTime: 0, harvestReady: false },
    ];
    const { result } = render(startWith({ plots }, 'unlock_crimson_sweet'));
    act(() => result.current.harvestAllMelons());

    expect(result.current.inventory).toEqual({ sugarBaby_normal_plain: 5, crimsonSweet_normal_plain: 1 });
    expect(result.current.recentHarvests).toHaveLength(5);
    expect(result.current.recentHarvests[0].variety).toBe('crimsonSweet');
  });

  it('plants every empty plot at once with the Jab Planter', () => {
    const without = render(startWith());
    act(() => without.result.current.plantAllMelons('sugarBaby'));
    expect(without.result.current.plots.every(plot => plot.variety === null)).toBe(true);

    const { result } = render(startWith({}, 'jab_planter'));
    act(() => result.current.plantMelon(0, 'sugarBaby'));
    act(() => result.current.processSummerGrowth(50));
    act(() => result.current.plantAllMelons('sugarBaby'));
    expect(result.current.plots.every(plot => plot.variety === 'sugarBaby')).toBe(true);
    expect(result.current.plots[0].growth).toBe(50);
  });
});

describe('useSummerEvent: the Ice House', () => {
  it('freezes nothing until built, then a block every 20 days', () => {
    const without = render(startWith());
    act(() => without.result.current.processSummerGrowth(100));
    expect(without.result.current.materials.ice).toBe(0);

    const { result } = render(startWith({}, 'unlock_ice_house'));
    act(() => result.current.processSummerGrowth(19));
    expect(result.current.materials.ice).toBe(0);
    act(() => result.current.processSummerGrowth(1));
    expect(result.current.materials.ice).toBe(1);
    act(() => result.current.processSummerGrowth(50));
    expect(result.current.materials.ice).toBe(3);
    expect(result.current.eventState.iceGrowth).toBe(10);
  });

  it('fills to 10, or 25 with Sawdust Packing, however long the player is away, then waits', () => {
    const { result } = render(startWith({ inventory: { sugarBaby_normal_plain: 1 } }, 'unlock_ice_house'));
    act(() => result.current.processSummerGrowth(10000));
    expect(result.current.materials.ice).toBe(10);
    expect(result.current.eventState.iceGrowth).toBe(0);

    // Spending a block makes room, and the house starts freezing again from nothing
    act(() => { result.current.finishMelon('sugarBaby', ['chill']); });
    act(() => result.current.processSummerGrowth(19));
    expect(result.current.materials.ice).toBe(9);
    act(() => result.current.processSummerGrowth(1));
    expect(result.current.materials.ice).toBe(10);

    const sawdust = render(startWith({}, 'unlock_ice_house', 'sawdust_packing'));
    act(() => sawdust.result.current.processSummerGrowth(10000));
    expect(sawdust.result.current.materials.ice).toBe(25);
  });
});

describe('useSummerEvent: the Juice Stand', () => {
  it('crafts only unlocked recipes with enough materials', () => {
    const onItemCrafted = vi.fn();
    const materials = stock({ splits: 3, seeds: 4 });
    const without = render(startWith({ materials }));
    act(() => { without.result.current.craftItem('melon_balls'); });
    expect(without.result.current.materials.cups).toBe(0);

    const { result } = render(startWith({ materials }, 'unlock_melon_baller'), { onItemCrafted });
    act(() => { result.current.craftItem('melon_balls'); });
    expect(result.current.materials).toMatchObject({ splits: 2, cups: 2, rinds: 1 });
    expect(onItemCrafted).toHaveBeenCalledWith('Melon Balls', 1);

    act(() => { result.current.craftItem('agua_fresca'); });
    expect(result.current.materials).toMatchObject({ splits: 0, agua: 1, rinds: 3 });
    act(() => { result.current.craftItem('pickled_rinds'); });
    expect(result.current.materials).toMatchObject({ rinds: 0, pickles: 1 });
    act(() => { result.current.craftItem('roasted_seeds'); });
    expect(result.current.materials).toMatchObject({ seeds: 0, roasted: 1 });

    let crafted = true;
    act(() => { crafted = result.current.craftItem('agua_fresca'); });
    expect(crafted).toBe(false);
  });

  it('chills and carves plain melons, normal ones before Sugar Melons', () => {
    const { result } = render(startWith({
      inventory: { sugarBaby_normal_plain: 1, sugarBaby_sugar_plain: 1 },
      materials: stock({ ice: 2, cups: 1 })
    }));

    act(() => { result.current.finishMelon('sugarBaby', ['chill']); });
    expect(result.current.inventory).toEqual({ sugarBaby_normal_chilled: 1, sugarBaby_sugar_plain: 1 });
    act(() => { result.current.finishMelon('sugarBaby', ['chill', 'carve']); });
    expect(result.current.inventory).toEqual({ sugarBaby_normal_chilled: 1, sugarBaby_sugar_basket: 1 });
    expect(result.current.materials).toMatchObject({ ice: 0, cups: 0 });

    let finished = true;
    act(() => { finished = result.current.finishMelon('sugarBaby', ['carve']); });
    expect(finished).toBe(false);
  });

  it('needs a block of ice to chill and a cup of melon balls to carve', () => {
    const { result } = render(startWith({ inventory: { crimsonSweet_normal_plain: 2 }, materials: stock({ ice: 1 }) }));
    let finished = true;
    act(() => { finished = result.current.finishMelon('crimsonSweet', ['carve']); });
    expect(finished).toBe(false);
    act(() => { finished = result.current.finishMelon('crimsonSweet', ['chill', 'carve']); });
    expect(finished).toBe(false);
    act(() => { finished = result.current.finishMelon('crimsonSweet', ['chill']); });
    expect(finished).toBe(true);
    expect(result.current.inventory).toEqual({ crimsonSweet_normal_plain: 1, crimsonSweet_normal_chilled: 1 });
  });
});

describe('useSummerEvent: the Picnic Crew', () => {
  it('packs the most valuable plain melon into a Picnic Basket first', () => {
    const { result } = render(startWith({
      inventory: { sugarBaby_normal_plain: 1, crimsonSweet_normal_plain: 1 },
      materials: stock({ ice: 1, cups: 1, splits: 4 })
    }, 'picnic_crew', 'unlock_melon_baller'));
    act(() => result.current.processPicnicCrew(1));
    expect(result.current.inventory).toEqual({ sugarBaby_normal_plain: 1, crimsonSweet_normal_basket: 1 });
    expect(result.current.currentCrewAction).toEqual({ type: 'finish', finish: 'basket' });
  });

  it('balls a split melon when cups run short of ice, then makes Agua Fresca, pickles and roasted seeds', () => {
    const { result } = render(startWith({ materials: stock({ ice: 2, splits: 3, rinds: 0, seeds: 58 }) }, 'picnic_crew', 'unlock_melon_baller'));
    act(() => result.current.processPicnicCrew(1));
    expect(result.current.materials).toMatchObject({ cups: 2, splits: 2, rinds: 1 });
    expect(result.current.currentCrewAction).toEqual({ type: 'craft', recipeId: 'melon_balls' });

    act(() => result.current.processPicnicCrew(1));
    expect(result.current.materials).toMatchObject({ agua: 1, splits: 0, rinds: 3 });
    act(() => result.current.processPicnicCrew(1));
    expect(result.current.materials).toMatchObject({ pickles: 1, rinds: 0 });
    act(() => result.current.processPicnicCrew(5));
    // Seeds stop at 50, kept for Seed Spitting
    expect(result.current.materials).toMatchObject({ roasted: 2, seeds: 50 });
  });

  it('never spends a lone block of ice or cup on a half finish', () => {
    const { result } = render(startWith({
      inventory: { crimsonSweet_normal_plain: 1 },
      materials: stock({ ice: 3 })
    }, 'picnic_crew'));
    act(() => result.current.processPicnicCrew(10));
    expect(result.current.inventory).toEqual({ crimsonSweet_normal_plain: 1 });
    expect(result.current.materials.ice).toBe(3);
    expect(result.current.currentCrewAction).toBeUndefined();
  });

  it('does more jobs a second with Extra Hands, and nothing until hired', () => {
    const without = render(startWith({ materials: stock({ splits: 8 }) }));
    act(() => without.result.current.processPicnicCrew(4));
    expect(without.result.current.materials.agua).toBe(0);

    const { result } = render(startWith({
      materials: stock({ splits: 8 }),
      upgrades: withLevel(upgradesOwning('picnic_crew'), 'extra_hands', 3)
    }));
    act(() => result.current.processPicnicCrew(1));
    expect(result.current.materials.agua).toBe(4);
  });
});

describe('useSummerEvent: the Festival Grounds', () => {
  it('sells melons for the priced amount, with Dunk Tank tips', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const onMelonsSold = vi.fn();
    const { result } = render(startWith({ inventory: { crimsonSweet_normal_basket: 2 } }, 'dunk_tank'), { onMelonsSold });
    act(() => result.current.sellMelons('crimsonSweet_normal_basket', 2));

    // 9 each, and a 20% tip on each, rounded down
    expect(result.current.tickets).toBe(20);
    expect(result.current.inventory).toEqual({});
    expect(result.current.totalMelonsSold).toBe(2);
    expect(result.current.lastDunkTip.amount).toBe(2);
    expect(onMelonsSold).toHaveBeenCalledWith('crimsonSweet_normal_basket', 2, 20);
  });

  it('sells Chilled melons for half again in a Heatwave', () => {
    const inventory = { crimsonSweet_normal_chilled: 1, crimsonSweet_normal_plain: 1 };
    const hot = render(startWith({ inventory }), { isHeatwave: true });
    act(() => hot.result.current.sellMelons('crimsonSweet_normal_chilled', 1));
    expect(hot.result.current.tickets).toBe(7);
    act(() => hot.result.current.sellMelons('crimsonSweet_normal_plain', 1));
    expect(hot.result.current.tickets).toBe(10);

    const mild = render(startWith({ inventory }));
    act(() => mild.result.current.sellMelons('crimsonSweet_normal_chilled', 1));
    expect(mild.result.current.tickets).toBe(5);
  });

  it('sells every melon with Sell All, and leaves the giants and goods', () => {
    const onMelonsSold = vi.fn();
    const { result } = render(startWith({
      inventory: { sugarBaby_normal_plain: 3, crimsonSweet_normal_plain: 2 },
      giantShelf: [{ id: 'giant_1', weight: 100 }],
      materials: stock({ agua: 1 })
    }), { onMelonsSold });
    act(() => result.current.sellAllMelons());

    expect(result.current.tickets).toBe(12);
    expect(result.current.inventory).toEqual({});
    expect(result.current.giantShelf).toHaveLength(1);
    expect(result.current.materials.agua).toBe(1);
    expect(result.current.totalMelonsSold).toBe(5);
    expect(onMelonsSold).toHaveBeenCalledWith(null, 5, 12);
  });

  it('sells a Carolina Cross by weight, and counts it sold', () => {
    const onGiantSold = vi.fn();
    const { result } = render(startWith({ giantShelf: [{ id: 'giant_1', weight: 142 }] }), { onGiantSold });
    act(() => result.current.sellGiant('giant_1'));
    expect(result.current.tickets).toBe(28);
    expect(result.current.giantShelf).toEqual([]);
    expect(result.current.totalMelonsSold).toBe(1);
    expect(onGiantSold).toHaveBeenCalledWith(142, 28);
  });

  it('sells goods at their fixed prices, cold ones for more in a Heatwave, without counting them as melons', () => {
    const { result } = render(startWith({ materials: stock({ ice: 3, agua: 1, pickles: 1 }) }), { isHeatwave: true });
    act(() => result.current.sellGoods('ice', 3));
    expect(result.current.tickets).toBe(4);
    act(() => result.current.sellGoods('agua', 1));
    expect(result.current.tickets).toBe(13);
    act(() => result.current.sellGoods('pickles', 1));
    expect(result.current.tickets).toBe(18);
    act(() => result.current.sellGoods('pickles', 1));
    expect(result.current.tickets).toBe(18);
    expect(result.current.totalMelonsSold).toBe(0);
  });

  it('pays the daily bonus once a day, only with the Parade Route', () => {
    const without = render(startWith());
    let claimed = true;
    act(() => { claimed = without.result.current.claimDailyBonus(); });
    expect(claimed).toBe(false);

    const { result } = render(startWith({}, 'parade_route'));
    expect(result.current.dailyBonusAvailable).toBe(true);
    act(() => { claimed = result.current.claimDailyBonus(); });
    expect(claimed).toBe(true);
    expect(result.current.tickets).toBe(25);
    act(() => { claimed = result.current.claimDailyBonus(); });
    expect(claimed).toBe(false);
    expect(result.current.dailyBonusAvailable).toBe(false);
  });

  it('pays the Carousel across seconds without losing the fraction', () => {
    const { result } = render(startWith({}, 'parade_route', 'carousel'));
    expect(result.current.passiveTicketsPerSecond).toBeCloseTo(0.1);
    act(() => result.current.updatePassiveIncome(5000));
    expect(result.current.tickets).toBe(0);
    act(() => result.current.updatePassiveIncome(5000));
    expect(result.current.tickets).toBe(1);
  });
});

describe('useSummerEvent: the Challenge Board', () => {
  it('opens the first board on the first live day, without Heaviest Melon before the Carolina Cross', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { result } = render(startWith());
    act(() => result.current.processChallenges());

    expect(result.current.board.challenges.map(c => c.kind)).toEqual(['harvestRace', 'salesSprint', 'sweetest']);
    expect(result.current.board.challenges.map(c => c.daysLeft)).toEqual([364, 244, 124]);
  });

  it('counts harvests, sweetness and sales toward the open challenges', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.25);
    const { result } = render(startWith({
      plots: [readyPlot('crimsonSweet')],
      inventory: { sugarBaby_normal_plain: 2 },
      board: boardWith('harvestRace', 'sweetest', 'salesSprint')
    }, 'unlock_crimson_sweet'));

    act(() => result.current.harvestMelon(0));
    act(() => result.current.sellMelons('sugarBaby_normal_plain', 2));
    expect(result.current.board.challenges.map(c => c.score)).toEqual([1, 9, 4]);
  });

  it('weighs a Carolina Cross for Heaviest Melon', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const { result } = render(startWith({ plots: [readyPlot('carolinaCross')], board: boardWith('heaviest', 'harvestRace', 'spitting') }));
    act(() => result.current.harvestMelon(0));
    expect(result.current.board.challenges.map(c => c.score)).toEqual([90, 1, 0]);
  });

  it('spits 5 seeds at a time at Seed Spitting, ten spits a challenge, keeping the longest', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const { result } = render(startWith({ materials: stock({ seeds: 16 }), board: boardWith('spitting') }));

    let distance: number | null = null;
    act(() => { distance = result.current.spit(); });
    expect(distance).toBe(20);
    random.mockReturnValue(0.75);
    act(() => { distance = result.current.spit(); });
    expect(distance).toBe(25);
    random.mockReturnValue(0);
    act(() => { distance = result.current.spit(); });
    expect(distance).toBe(10);

    const challenge = result.current.board.challenges[0];
    expect(challenge).toMatchObject({ score: 25, spitsLeft: 7 });
    expect(result.current.materials.seeds).toBe(1);
    act(() => { distance = result.current.spit(); });
    expect(distance).toBeNull();

    const spent = boardWith('spitting');
    spent.challenges[0] = { ...spent.challenges[0], spitsLeft: 0 };
    const noSpits = render(startWith({ materials: stock({ seeds: 50 }), board: spent }));
    act(() => { distance = noSpits.result.current.spit(); });
    expect(distance).toBeNull();

    const noBoard = render(startWith({ materials: stock({ seeds: 50 }), board: boardWith('harvestRace') }));
    act(() => { distance = noBoard.result.current.spit(); });
    expect(distance).toBeNull();
  });

  it('ends a challenge with its prize and ribbon, and opens a new kind in its place', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const onChallengeEnded = vi.fn();
    const board = boardWith('harvestRace', 'sweetest', 'spitting');
    board.challenges[0] = { ...board.challenges[0], daysLeft: 1, score: 20 };
    const { result } = render(startWith({ board }), { onChallengeEnded });

    act(() => result.current.processChallenges(1));

    expect(result.current.tickets).toBe(100);
    expect(result.current.board.ribbons.harvestRace).toEqual({ first: 1, second: 0, third: 0 });
    expect(result.current.board.bests.harvestRace).toBe(20);
    expect(result.current.board.challenges.map(c => c.kind)).toEqual(['salesSprint', 'sweetest', 'spitting']);
    expect(result.current.board.challenges.map(c => c.daysLeft)).toEqual([365, 364, 364]);
    expect(result.current.board.sweep).toEqual({ year: 2026, kinds: ['harvestRace'] });
    expect(onChallengeEnded).toHaveBeenCalledTimes(1);
    expect(onChallengeEnded).toHaveBeenCalledWith({ kind: 'harvestRace', placing: 1, score: 20, rivalScores: [12, 12, 12], prize: 100 });
  });

  it('never moves the board while growing, freezing or crafting, which time away also runs', () => {
    const { result } = render(startWith({
      board: boardWith('harvestRace', 'sweetest', 'spitting'),
      materials: stock({ splits: 10 })
    }, 'unlock_ice_house', 'picnic_crew', 'parade_route', 'carousel'));
    act(() => {
      result.current.processSummerGrowth(1000);
      result.current.processPicnicCrew(1000);
      result.current.updatePassiveIncome(1000000);
    });
    expect(result.current.board.challenges.map(c => c.daysLeft)).toEqual([365, 365, 365]);
  });
});

describe('useSummerEvent: upgrades and saves', () => {
  it('enforces prerequisites and adds a plot with Patch Expansion', () => {
    const onUpgradePurchased = vi.fn();
    const { result } = render(startWith({ tickets: 10000 }), { onUpgradePurchased });
    const buy = (id: string) => {
      let bought = false;
      act(() => { bought = result.current.purchaseUpgrade(id); });
      return bought;
    };

    expect(buy('vine_pruning')).toBe(false);
    expect(buy('sawdust_packing')).toBe(false);
    expect(buy('extra_hands')).toBe(false);
    expect(buy('dunk_tank')).toBe(false);
    expect(buy('unlock_carolina_cross')).toBe(true);
    expect(buy('vine_pruning')).toBe(true);
    expect(buy('patch_expansion')).toBe(true);
    expect(result.current.plots).toHaveLength(7);
    expect(result.current.eventState.maxPlots).toBe(7);
    expect(result.current.tickets).toBe(10000 - 1000 - 300 - 200);
    expect(onUpgradePurchased).toHaveBeenCalledWith('Carolina Cross Seeds', 1000);
  });

  it('sets the Carousel\'s income when bought', () => {
    const { result } = render(startWith({ tickets: 5000 }));
    act(() => { result.current.purchaseUpgrade('parade_route'); });
    act(() => { result.current.purchaseUpgrade('carousel'); });
    expect(result.current.passiveTicketsPerSecond).toBeCloseTo(0.1);
  });

  it('keeps saved purchases, levels, ribbons and bests, and picks up new upgrades from code', () => {
    const saved = {
      tickets: 321,
      upgrades: [
        { ...ALL_SUMMER_UPGRADES.find(u => u.id === 'unlock_crimson_sweet')!, owned: true },
        { ...ALL_SUMMER_UPGRADES.find(u => u.id === 'straw_mulch')!, owned: true, level: 3, cost: 1 },
      ],
      board: { challenges: [], challengesOpened: 4, ribbons: { spitting: { first: 2, second: 1, third: 0 } }, bests: { spitting: 31 } },
    } as unknown as Partial<SummerEventState>;
    const state = loadSummerState(saved);

    expect(state.tickets).toBe(321);
    expect(state.upgrades).toHaveLength(ALL_SUMMER_UPGRADES.length);
    expect(state.upgrades.find(u => u.id === 'unlock_crimson_sweet')?.owned).toBe(true);
    // Saved levels stay; the rules come from code
    expect(state.upgrades.find(u => u.id === 'straw_mulch')).toMatchObject({ level: 3, cost: 400 });
    expect(state.board.challengesOpened).toBe(4);
    expect(state.board.ribbons.spitting).toEqual({ first: 2, second: 1, third: 0 });
    expect(state.board.ribbons.harvestRace).toEqual({ first: 0, second: 0, third: 0 });
    expect(state.board.bests).toMatchObject({ spitting: 31, heaviest: 0 });
    expect(state.materials.ice).toBe(0);
  });

  it('starts a new event with six plots, Sugar Babies and an empty board', () => {
    const state = createInitialSummerState();
    expect(state.plots).toHaveLength(6);
    expect(state.upgrades.filter(u => u.owned).map(u => u.id)).toEqual(['unlock_sugar_baby']);
    expect(state.board.challenges).toEqual([]);
    expect(state.tickets).toBe(0);
  });

  it('has 20 upgrades besides the melon unlocks, the Ice House and Melon Baller bought from their tiles', () => {
    const unlocks = ALL_SUMMER_UPGRADES.filter(u => u.id.startsWith('unlock_')).map(u => u.id);
    expect(unlocks).toEqual(['unlock_sugar_baby', 'unlock_crimson_sweet', 'unlock_carolina_cross', 'unlock_ice_house', 'unlock_melon_baller']);
    expect(ALL_SUMMER_UPGRADES).toHaveLength(23);
    expect(ALL_SUMMER_UPGRADES.filter(u => u.category === 'board').map(u => u.id)).toEqual(['sun_ripening', 'vine_pruning', 'spitting_practice']);
  });
});
