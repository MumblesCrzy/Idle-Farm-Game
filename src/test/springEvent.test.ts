import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useSpringEvent,
  isSpringSeason,
  isMothersDay,
  springDemandMultiplier,
  createInitialSpringState,
  loadSpringState,
  memorialDay,
  mothersDay
} from '../hooks/useSpringEvent';
import {
  archiePetalsReward,
  flowerFinishFor,
  getCartPetals,
  getFlowerPrice,
  getFlowerSalePetals,
  herbCap,
  marketDayInterval,
  parseFlowerKey,
  sprigsPerCycle
} from '../utils/springPricing';
import { archieCandyCornReward } from '../utils/pumpkinPricing';
import { ALL_SPRING_UPGRADES, SPRING_EVENT_CONSTANTS as C } from '../data/springEventData';
import type { EventUpgrade } from '../types/eventUpgrades';
import type { SpringEventState, SpringMaterials } from '../types/springEvent';

const upgradesOwning = (...ids: string[]): EventUpgrade[] =>
  ALL_SPRING_UPGRADES.map(u => ({ ...u, owned: u.owned || ids.includes(u.id) }));

/** The upgrades with one repeatable upgrade at a level */
const withLevel = (upgrades: EventUpgrade[], id: string, level: number): EventUpgrade[] =>
  upgrades.map(u => u.id === id ? { ...u, owned: true, level } : u);

/** A state with the given upgrades, for renderHook */
const startWith = (overrides: Partial<SpringEventState> = {}, ...owned: string[]): Partial<SpringEventState> => ({
  ...createInitialSpringState(),
  upgrades: upgradesOwning(...owned),
  ...overrides
});

const stock = (materials: Partial<SpringMaterials>): SpringMaterials => ({ ...createInitialSpringState().materials, ...materials });

const readyBed = (variety: 'tulip' | 'daffodil' | 'rose', quality: 'normal' | 'prize' = 'normal') => ({
  id: 'flower_bed_0', variety, growth: 10, growthTime: 10, quality, harvestReady: true
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('Spring Market season', () => {
  it('runs from March 20 through Memorial Day', () => {
    expect(isSpringSeason(new Date(2027, 2, 19, 23, 59))).toBe(false);
    expect(isSpringSeason(new Date(2027, 2, 20))).toBe(true);
    expect(isSpringSeason(new Date(2027, 4, 9))).toBe(true);
    expect(isSpringSeason(new Date(2027, 4, 31, 23, 59))).toBe(true);
    expect(isSpringSeason(new Date(2027, 5, 1))).toBe(false);
    expect(isSpringSeason(new Date(2026, 9, 29))).toBe(false);
  });

  it('finds Memorial Day on the last Monday of May', () => {
    expect([2026, 2027, 2028].map(year => memorialDay(year).getDate())).toEqual([25, 31, 29]);
    expect(memorialDay(2027).getDay()).toBe(1);
  });

  it("finds Mother's Day on the second Sunday of May", () => {
    expect([2026, 2027, 2028].map(year => mothersDay(year).getDate())).toEqual([10, 9, 14]);
    expect(mothersDay(2027).getDay()).toBe(0);
    expect(isMothersDay(new Date(2027, 4, 9, 18))).toBe(true);
    expect(isMothersDay(new Date(2027, 4, 10))).toBe(false);
  });

  it("doubles demand by Mother's Day, holds it until Memorial Day, then returns to normal", () => {
    expect(springDemandMultiplier(new Date(2027, 2, 20))).toBeCloseTo(1);
    const middle = springDemandMultiplier(new Date(2027, 3, 14));
    expect(middle).toBeGreaterThan(1.4);
    expect(middle).toBeLessThan(1.6);
    expect(springDemandMultiplier(new Date(2027, 4, 9))).toBeCloseTo(2);
    expect(springDemandMultiplier(new Date(2027, 4, 31, 20))).toBeCloseTo(2);
    expect(springDemandMultiplier(new Date(2027, 5, 1))).toBeCloseTo(1);
  });
});

describe('Spring pricing', () => {
  it('prices bunches by flower, quality, finish and demand', () => {
    const none = upgradesOwning();
    expect(getFlowerPrice('tulip_normal_plain', none, 1)).toBe(2);
    expect(getFlowerPrice('daffodil_normal_plain', none, 1)).toBe(3);
    expect(getFlowerPrice('rose_normal_plain', none, 1)).toBe(6);
    expect(getFlowerPrice('rose_prize_plain', none, 1)).toBe(12);
    expect(getFlowerPrice('tulip_normal_bouquet', none, 1)).toBe(6);
    expect(getFlowerPrice('tulip_normal_bouquet', none, 2)).toBe(12);
  });

  it('adds Petals for an arrangement or a scent, more than the greenery or lavender sells for', () => {
    const none = upgradesOwning();
    for (const demand of [1, 1.5, 2]) {
      const plain = getFlowerPrice('tulip_normal_plain', none, demand);
      expect(getFlowerPrice('tulip_normal_arranged', none, demand)).toBe(plain + 2);
      expect(getFlowerPrice('tulip_normal_scented', none, demand)).toBe(plain + 3);
      expect(getFlowerPrice('tulip_normal_arranged', none, demand) - plain).toBeGreaterThan(C.GOOD_PRICES.greenery);
      expect(getFlowerPrice('tulip_normal_scented', none, demand) - plain).toBeGreaterThan(C.GOOD_PRICES.lavender);
    }
  });

  it("pays more for a Gift Bouquet than for the bunch, greenery and lavender sold apart", () => {
    const none = upgradesOwning();
    for (const variety of ['tulip', 'daffodil', 'rose']) {
      const apart = getFlowerPrice(`${variety}_normal_plain`, none, 1) + C.GOOD_PRICES.greenery + C.GOOD_PRICES.lavender;
      expect(getFlowerPrice(`${variety}_normal_bouquet`, none, 1)).toBeGreaterThan(apart);
    }
  });

  it("applies Florist's Touch to Arranged bunches and Gift Bouquets, Silk Ribbons to Gift Bouquets", () => {
    const florist = upgradesOwning('florists_touch');
    expect(getFlowerPrice('rose_normal_bouquet', florist, 1)).toBe(22);   // 18 x 1.25
    expect(getFlowerPrice('rose_normal_arranged', florist, 1)).toBe(9);   // 6 x 1.25, +2
    expect(getFlowerPrice('rose_normal_scented', florist, 1)).toBe(9);    // 6, +3; no bonus
    expect(getFlowerPrice('rose_normal_plain', florist, 1)).toBe(6);
    expect(getFlowerPrice('rose_normal_bouquet', upgradesOwning('silk_ribbons'), 1)).toBe(27);                 // 18 x 1.5
    expect(getFlowerPrice('rose_normal_bouquet', upgradesOwning('florists_touch', 'silk_ribbons'), 1)).toBe(31); // 18 x 1.75
  });

  it('applies Spring Bunting to flower sales', () => {
    expect(getFlowerSalePetals('daffodil_normal_plain', 10, upgradesOwning(), 1)).toBe(30);
    expect(getFlowerSalePetals('daffodil_normal_plain', 10, upgradesOwning('spring_bunting'), 1)).toBe(33);
  });

  it('sells the Cart for half again its stall price, Bunting on the bunches only', () => {
    const cart = { bunches: { rose_normal_plain: 5 }, goods: { pesto: 2 } };
    expect(getCartPetals(cart, upgradesOwning(), 1)).toBe(60);                    // (30 + 10) x 1.5
    expect(getCartPetals(cart, upgradesOwning('spring_bunting'), 1)).toBe(64);    // (33 + 10) x 1.5
    expect(getCartPetals({ bunches: {}, goods: {} }, upgradesOwning(), 2)).toBe(0);
  });

  it('names finishes from decorations', () => {
    expect(flowerFinishFor(['arrange'])).toBe('arranged');
    expect(flowerFinishFor(['scent'])).toBe('scented');
    expect(flowerFinishFor(['arrange', 'scent'])).toBe('bouquet');
    expect(parseFlowerKey('rose_prize_bouquet')).toEqual({ variety: 'rose', quality: 'prize', finish: 'bouquet' });
  });

  it('sets the garden and market rates from upgrades', () => {
    expect([herbCap(upgradesOwning()), herbCap(upgradesOwning('trellis'))]).toEqual([10, 25]);
    expect([sprigsPerCycle(upgradesOwning()), sprigsPerCycle(upgradesOwning('second_row'))]).toEqual([1, 2]);
    expect([marketDayInterval(upgradesOwning()), marketDayInterval(upgradesOwning('pony_cart'))]).toEqual([60, 40]);
  });
});

describe('Archie during the Spring Market', () => {
  it('finds Petals by the Candy Corn rule', () => {
    expect(archiePetalsReward(0, 1)).toBe(50);
    expect(archiePetalsReward(999, 1)).toBe(150);
    for (const [sold, streak] of [[0, 3], [250, 2], [10 ** 12, 10]]) {
      expect(archiePetalsReward(sold, streak)).toBe(archieCandyCornReward(sold, streak));
    }
  });
});

describe('useSpringEvent: the Flower Beds', () => {
  it('plants only unlocked flowers and grows them', () => {
    const { result } = renderHook(() => useSpringEvent({ initialState: startWith() }));

    act(() => {
      result.current.plantFlower(0, 'rose');
      result.current.plantFlower(1, 'tulip');
    });
    expect(result.current.beds[0].variety).toBeNull();
    expect(result.current.beds[1].variety).toBe('tulip');

    act(() => {
      result.current.processSpringGrowth(149);
    });
    expect(result.current.beds[1].harvestReady).toBe(false);
    act(() => {
      result.current.processSpringGrowth(1);
    });
    expect(result.current.beds[1].harvestReady).toBe(true);
  });

  it('grows faster with the Rain Barrel and rolls Prize Blooms with Heirloom Bulbs', () => {
    const upgrades = withLevel(upgradesOwning('heirloom_bulbs'), 'rain_barrel', 2);
    const { result } = renderHook(() => useSpringEvent({ initialState: startWith({ upgrades }) }));
    act(() => {
      result.current.plantFlower(0, 'tulip');
    });

    vi.spyOn(Math, 'random').mockReturnValue(0); // every roll hits
    act(() => {
      result.current.processSpringGrowth(116); // 116 x 1.3 = 150.8 days
    });

    expect(result.current.beds[0].harvestReady).toBe(true);
    expect(result.current.beds[0].quality).toBe('prize');
  });

  it('harvests a bunch with greenery, seeds and Petals, and logs once', () => {
    const onFlowerHarvested = vi.fn();
    const beds = createInitialSpringState().beds.map((b, i) => i === 0 ? readyBed('daffodil', 'prize') : b);
    const { result } = renderHook(() => useSpringEvent({ initialState: startWith({ beds }), onFlowerHarvested }));

    act(() => {
      result.current.processSpringGrowth(); // another update queued first
      result.current.harvestFlower(0);
    });

    expect(result.current.eventState.inventory).toEqual({ daffodil_prize_plain: 1 });
    expect(result.current.materials).toMatchObject({ greenery: 4, seeds: 4 });
    expect(result.current.petals).toBe(C.HARVEST_PETALS.prize);
    expect(result.current.beds[0].variety).toBeNull();
    expect(onFlowerHarvested).toHaveBeenCalledTimes(1);
    expect(onFlowerHarvested).toHaveBeenCalledWith('daffodil', 'prize');
  });

  it('lets the Gnome Crew tie a Gift Bouquet at harvest, using the harvest\'s own greenery', () => {
    const beds = createInitialSpringState().beds.map((b, i) => i === 0 ? readyBed('tulip') : b);
    const { result } = renderHook(() => useSpringEvent({
      initialState: startWith({ beds, materials: stock({ lavender: 1 }) }, 'gnome_crew')
    }));

    act(() => {
      result.current.harvestFlower(0);
    });

    expect(result.current.eventState.inventory).toEqual({ tulip_normal_bouquet: 1 });
    expect(result.current.materials).toMatchObject({ greenery: 0, lavender: 0 });
  });

  it('harvests every ready bed at once', () => {
    const beds = createInitialSpringState().beds.map((b, i) => i < 3 ? { ...readyBed('tulip'), id: `flower_bed_${i}` } : b);
    const { result } = renderHook(() => useSpringEvent({ initialState: startWith({ beds }, 'trug') }));
    act(() => {
      result.current.harvestAllFlowers();
    });
    expect(result.current.eventState.inventory).toEqual({ tulip_normal_plain: 3 });
    expect(result.current.beds.every(bed => bed.variety === null)).toBe(true);
  });
});

describe('useSpringEvent: the Herb Garden', () => {
  it('grows a sprig of mint every 20 days, and nothing in an unplanted slot', () => {
    const { result } = renderHook(() => useSpringEvent({ initialState: startWith() }));
    act(() => {
      result.current.processSpringGrowth(39);
    });
    expect(result.current.herbs.mint).toEqual({ sprigs: 1, growth: 19 });
    expect(result.current.herbs.basil).toEqual({ sprigs: 0, growth: 0 });
  });

  it('fills a slot to its cap and no further, however long the player is away', () => {
    const { result } = renderHook(() => useSpringEvent({ initialState: startWith() }));
    act(() => {
      result.current.processSpringGrowth(100_000);
    });
    expect(result.current.herbs.mint).toEqual({ sprigs: C.HERB_CAP, growth: 0 });
  });

  it('gathers sprigs into stock, and a full slot starts growing again', () => {
    const herbs = { ...createInitialSpringState().herbs, mint: { sprigs: 10, growth: 0 }, basil: { sprigs: 3, growth: 12 } };
    const { result } = renderHook(() => useSpringEvent({ initialState: startWith({ herbs }, 'unlock_basil') }));

    let gathered = 0;
    act(() => {
      gathered = result.current.gatherHerb('mint');
    });
    expect(gathered).toBe(10);
    expect(result.current.materials.mint).toBe(10);

    act(() => {
      result.current.processSpringGrowth(20);
    });
    expect(result.current.herbs.mint).toEqual({ sprigs: 1, growth: 0 });

    act(() => {
      gathered = result.current.gatherAllHerbs();
    });
    expect(gathered).toBe(5); // 1 mint, then 3 + 1 basil after 32 days of growth
    expect(result.current.materials).toMatchObject({ mint: 11, basil: 4 });
    expect(result.current.herbs.basil).toEqual({ sprigs: 0, growth: 2 });
  });

  it('holds 25 with the Trellis, grows two at a time with the Second Row, and faster with the Watering Can', () => {
    const trellis = renderHook(() => useSpringEvent({ initialState: startWith({}, 'trellis') }));
    const secondRow = renderHook(() => useSpringEvent({ initialState: startWith({}, 'second_row') }));
    const can = renderHook(() => useSpringEvent({ initialState: startWith({ upgrades: withLevel(upgradesOwning(), 'watering_can', 2) }) }));

    act(() => {
      trellis.result.current.processSpringGrowth(100_000);
      secondRow.result.current.processSpringGrowth(20);
      can.result.current.processSpringGrowth(16); // 16 x 1.3 = 20.8 days
    });

    expect(trellis.result.current.herbs.mint.sprigs).toBe(25);
    expect(secondRow.result.current.herbs.mint.sprigs).toBe(2);
    expect(can.result.current.herbs.mint.sprigs).toBe(1);
    expect(can.result.current.herbs.mint.growth).toBeCloseTo(0.8);
  });
});

describe('useSpringEvent: the Potting Shed', () => {
  it('crafts only unlocked recipes with enough materials', () => {
    const onItemCrafted = vi.fn();
    const { result } = renderHook(() => useSpringEvent({
      initialState: startWith({ materials: stock({ mint: 7, chamomile: 2, seeds: 6 }) }),
      onItemCrafted
    }));

    let tea = false;
    let packets = true;
    act(() => {
      tea = result.current.craftItem('mint_tea', 2);
      packets = result.current.craftItem('seed_packets', 1); // needs the Packet Press
    });
    expect([tea, packets]).toEqual([true, false]);

    let chamomile = false;
    act(() => {
      chamomile = result.current.craftItem('chamomile_tea', 1);
    });
    expect(chamomile).toBe(true);
    expect(result.current.materials).toMatchObject({ mintTea: 2, chamomileTea: 1, mint: 0, chamomile: 0, seeds: 6 });
    expect(onItemCrafted).toHaveBeenCalledTimes(2);
  });

  it('arranges and scents plain bunches, normal ones first', () => {
    const inventory = { daffodil_normal_plain: 1, daffodil_prize_plain: 1 };
    const { result } = renderHook(() => useSpringEvent({
      initialState: startWith({ inventory, materials: stock({ greenery: 2, lavender: 1 }) })
    }));

    act(() => {
      result.current.finishBunch('daffodil', ['arrange', 'scent']);
    });
    act(() => {
      result.current.finishBunch('daffodil', ['arrange']);
    });
    expect(result.current.eventState.inventory).toEqual({ daffodil_normal_bouquet: 1, daffodil_prize_arranged: 1 });
    expect(result.current.materials).toMatchObject({ greenery: 0, lavender: 0 });

    let finished = true;
    act(() => {
      finished = result.current.finishBunch('daffodil', ['scent']);
    });
    expect(finished).toBe(false);
  });
});

describe('useSpringEvent: the Gnome Crew', () => {
  it('gathers a full herb slot before anything else', () => {
    const herbs = { ...createInitialSpringState().herbs, mint: { sprigs: 10, growth: 0 } };
    const { result } = renderHook(() => useSpringEvent({
      initialState: startWith({ herbs, materials: stock({ seeds: 3 }) }, 'gnome_crew', 'packet_press')
    }));

    act(() => {
      result.current.processGnomeCrew(1);
    });
    expect(result.current.currentCrewAction).toEqual({ type: 'gather', herb: 'mint' });
    expect(result.current.materials).toMatchObject({ mint: 10, seeds: 3 });
    expect(result.current.herbs.mint.sprigs).toBe(0);

    act(() => {
      result.current.processGnomeCrew(1);
    });
    expect(result.current.currentCrewAction).toEqual({ type: 'craft', recipeId: 'seed_packets' });
    expect(result.current.materials).toMatchObject({ packets: 1, seeds: 0 });
  });

  it('leaves a slot that is not full for the player', () => {
    const herbs = { ...createInitialSpringState().herbs, mint: { sprigs: 9, growth: 0 } };
    const { result } = renderHook(() => useSpringEvent({ initialState: startWith({ herbs }, 'gnome_crew') }));
    act(() => {
      result.current.processGnomeCrew(3);
    });
    expect(result.current.herbs.mint.sprigs).toBe(9);
    expect(result.current.currentCrewAction).toBeUndefined();
  });

  it('makes Chamomile Tea before Mint Tea, and pesto after', () => {
    const { result } = renderHook(() => useSpringEvent({
      initialState: startWith({ materials: stock({ chamomile: 2, mint: 4, basil: 3 }) }, 'gnome_crew')
    }));

    act(() => {
      result.current.processGnomeCrew(1);
    });
    expect(result.current.materials).toMatchObject({ chamomileTea: 1, mint: 3, mintTea: 0 });

    act(() => {
      result.current.processGnomeCrew(2);
    });
    expect(result.current.materials).toMatchObject({ mintTea: 1, mint: 0, pesto: 1, basil: 0 });
  });

  it('ties the most valuable plain bunch into a Gift Bouquet', () => {
    const inventory = { tulip_normal_plain: 1, rose_normal_plain: 1 };
    const { result } = renderHook(() => useSpringEvent({
      initialState: startWith({ inventory, materials: stock({ greenery: 1, lavender: 1 }) }, 'gnome_crew')
    }));
    act(() => {
      result.current.processGnomeCrew(1);
    });
    expect(result.current.eventState.inventory).toEqual({ tulip_normal_plain: 1, rose_normal_bouquet: 1 });
    expect(result.current.currentCrewAction).toEqual({ type: 'finish', finish: 'bouquet' });
  });

  it('saves a lone greenery or lavender for a Gift Bouquet instead of a lesser finish', () => {
    const inventory = { tulip_normal_plain: 1 };
    const withGreenery = renderHook(() => useSpringEvent({
      initialState: startWith({ inventory, materials: stock({ greenery: 1 }) }, 'gnome_crew')
    }));
    const withLavender = renderHook(() => useSpringEvent({
      initialState: startWith({ inventory, materials: stock({ lavender: 1 }) }, 'gnome_crew')
    }));

    act(() => {
      withGreenery.result.current.processGnomeCrew(2);
      withLavender.result.current.processGnomeCrew(2);
    });

    expect(withGreenery.result.current.eventState.inventory).toEqual(inventory);
    expect(withGreenery.result.current.materials.greenery).toBe(1);
    expect(withLavender.result.current.eventState.inventory).toEqual(inventory);
    expect(withLavender.result.current.materials.lavender).toBe(1);
  });

  it('loads finished bunches and crafted goods onto the Cart with the Cart Loader', () => {
    const inventory = { tulip_normal_bouquet: 2, tulip_normal_plain: 1 };
    const { result } = renderHook(() => useSpringEvent({
      initialState: startWith({ inventory, materials: stock({ mintTea: 3, greenery: 1 }) }, 'gnome_crew', 'cart_loader')
    }));

    act(() => {
      result.current.processGnomeCrew(3);
    });

    expect(result.current.cart).toEqual({ bunches: { tulip_normal_bouquet: 2 }, goods: { mintTea: 3 } });
    expect(result.current.eventState.inventory).toEqual({ tulip_normal_plain: 1 });
    expect(result.current.materials).toMatchObject({ mintTea: 0, greenery: 1 });
    expect(result.current.currentCrewAction).toEqual({ type: 'load' });
  });

  it('does nothing until the crew is hired', () => {
    const { result } = renderHook(() => useSpringEvent({
      initialState: startWith({ materials: stock({ mint: 3 }) })
    }));
    act(() => {
      result.current.processGnomeCrew(5);
    });
    expect(result.current.materials).toMatchObject({ mint: 3, mintTea: 0 });
  });
});

describe('useSpringEvent: the Market Stall', () => {
  it('sells bunches for the priced amount, with Regulars\' tips', () => {
    const onFlowersSold = vi.fn();
    const { result } = renderHook(() => useSpringEvent({
      initialState: startWith({ inventory: { rose_normal_plain: 4 } }, 'sandwich_board', 'busker', 'regulars'),
      onFlowersSold
    }));
    const price = getFlowerPrice('rose_normal_plain', result.current.eventState.upgrades, result.current.demandMultiplier);

    vi.spyOn(Math, 'random').mockReturnValue(0); // every tip hits at its smallest
    act(() => {
      result.current.sellFlowers('rose_normal_plain', 4);
    });

    const tips = 4 * Math.floor(price * 0.2);
    expect(result.current.petals).toBe(price * 4 + tips);
    expect(result.current.totalFlowersSold).toBe(4);
    expect(result.current.lastRegularsTip.amount).toBe(tips);
    expect(onFlowersSold).toHaveBeenCalledWith('rose_normal_plain', 4, price * 4 + tips);
  });

  it('sells every bunch with Sell All, and leaves the goods and the Cart', () => {
    const onFlowersSold = vi.fn();
    const inventory = { tulip_normal_plain: 3, rose_normal_bouquet: 1 };
    const cart = { bunches: { tulip_normal_plain: 2 }, goods: {} };
    const { result } = renderHook(() => useSpringEvent({
      initialState: startWith({ inventory, cart, materials: stock({ pesto: 1 }) }),
      onFlowersSold
    }));
    const demand = result.current.demandMultiplier;
    const upgrades = result.current.eventState.upgrades;
    const expected = Math.floor(
      getFlowerPrice('tulip_normal_plain', upgrades, demand) * 3 + getFlowerPrice('rose_normal_bouquet', upgrades, demand)
    );

    act(() => {
      result.current.sellAllFlowers();
    });

    expect(result.current.eventState.inventory).toEqual({});
    expect(result.current.totalFlowersSold).toBe(4);
    expect(result.current.petals).toBe(expected);
    expect(result.current.materials.pesto).toBe(1);
    expect(result.current.cart.bunches).toEqual({ tulip_normal_plain: 2 });
    expect(onFlowersSold).toHaveBeenCalledWith(null, 4, expected);
  });

  it('sells goods at their fixed prices', () => {
    const { result } = renderHook(() => useSpringEvent({
      initialState: startWith({ materials: stock({ pesto: 2, lavender: 3 }) })
    }));
    act(() => {
      result.current.sellGoods('pesto', 2);
      result.current.sellGoods('lavender', 5); // only 3 in stock
    });
    expect(result.current.petals).toBe(2 * C.GOOD_PRICES.pesto);
    expect(result.current.materials).toMatchObject({ pesto: 0, lavender: 3 });
    expect(result.current.totalFlowersSold).toBe(0);
  });

  it('pays the daily bonus once a day, only with the Sandwich Board', () => {
    const noBoard = renderHook(() => useSpringEvent({ initialState: startWith() }));
    let claimed = true;
    act(() => {
      claimed = noBoard.result.current.claimDailyBonus();
    });
    expect(claimed).toBe(false);

    const { result } = renderHook(() => useSpringEvent({ initialState: startWith({}, 'sandwich_board') }));
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
    expect(result.current.petals).toBe(C.DAILY_BONUS);
    expect(result.current.dailyBonusAvailable).toBe(false);
  });

  it('pays the Busker across seconds without losing the fraction', () => {
    const { result } = renderHook(() => useSpringEvent({ initialState: startWith({ petals: 1800 }, 'sandwich_board') }));
    act(() => {
      result.current.purchaseUpgrade('busker');
    });
    expect(result.current.passivePetalsPerSecond).toBeCloseTo(0.1);

    for (let i = 0; i < 25; i++) {
      act(() => {
        result.current.updatePassiveIncome(1000);
      });
    }
    expect(result.current.petals).toBe(2);
  });

  it("counts Gift Bouquets sold on Mother's Day itself", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2027, 4, 9, 12));
    const inventory = { rose_normal_bouquet: 3, rose_normal_plain: 2 };
    const { result } = renderHook(() => useSpringEvent({ initialState: startWith({ inventory }) }));

    act(() => {
      result.current.sellFlowers('rose_normal_bouquet', 2);
    });
    expect(result.current.eventState.mothersDayBouquets).toEqual({ year: 2027, sold: 2 });

    act(() => {
      result.current.sellAllFlowers();
    });
    expect(result.current.eventState.mothersDayBouquets).toEqual({ year: 2027, sold: 3 });

    vi.setSystemTime(new Date(2027, 4, 10, 12));
    const nextDay = renderHook(() => useSpringEvent({ initialState: startWith({ inventory }) }));
    act(() => {
      nextDay.result.current.sellAllFlowers();
    });
    expect(nextDay.result.current.eventState.mothersDayBouquets.sold).toBe(0);
  });
});

describe('useSpringEvent: the Cart and Market Day', () => {
  it('loads and unloads bunches and goods', () => {
    const inventory = { tulip_normal_plain: 3 };
    const { result } = renderHook(() => useSpringEvent({
      initialState: startWith({ inventory, materials: stock({ pesto: 2, lavender: 2 }) })
    }));

    act(() => {
      result.current.loadBunches('tulip_normal_plain', 2);
      result.current.loadGoods('pesto', 1);
      result.current.loadGoods('lavender', 3); // only 2 in stock
    });
    expect(result.current.cart).toEqual({ bunches: { tulip_normal_plain: 2 }, goods: { pesto: 1 } });
    expect(result.current.eventState.inventory).toEqual({ tulip_normal_plain: 1 });
    expect(result.current.materials).toMatchObject({ pesto: 1, lavender: 2 });

    act(() => {
      result.current.unloadCart();
    });
    expect(result.current.cart).toEqual({ bunches: {}, goods: {} });
    expect(result.current.eventState.inventory).toEqual(inventory);
    expect(result.current.materials).toMatchObject({ pesto: 2, lavender: 2 });
  });

  it('puts every bunch and crafted good on the Cart, and keeps greenery and lavender for finishing', () => {
    const inventory = { tulip_normal_plain: 3, rose_prize_bouquet: 1 };
    const cart = { bunches: { tulip_normal_plain: 1 }, goods: { mintTea: 1 } };
    const { result } = renderHook(() => useSpringEvent({
      initialState: startWith({ inventory, cart, materials: stock({ mintTea: 2, pesto: 1, greenery: 4, lavender: 1, mint: 2 }) })
    }));

    act(() => {
      result.current.loadEverything();
    });

    expect(result.current.cart).toEqual({
      bunches: { tulip_normal_plain: 4, rose_prize_bouquet: 1 },
      goods: { mintTea: 3, pesto: 1 }
    });
    expect(result.current.eventState.inventory).toEqual({});
    expect(result.current.materials).toMatchObject({ mintTea: 0, pesto: 0, greenery: 4, lavender: 1, mint: 2 });
  });

  it('sells the Cart for half again on Market Day, every 60 days', () => {
    const onMarketDay = vi.fn();
    const cart = { bunches: { rose_normal_plain: 5 }, goods: { pesto: 2 } };
    const { result } = renderHook(() => useSpringEvent({ initialState: startWith({ cart }), onMarketDay }));
    const expected = getCartPetals(cart, result.current.eventState.upgrades, result.current.demandMultiplier);

    act(() => {
      result.current.processSpringGrowth(59);
    });
    expect(result.current.daysUntilMarket).toBe(1);
    expect(result.current.petals).toBe(0);

    act(() => {
      result.current.processSpringGrowth(1);
    });
    expect(result.current.petals).toBe(expected);
    expect(result.current.totalFlowersSold).toBe(5);
    expect(result.current.cart).toEqual({ bunches: {}, goods: {} });
    expect(result.current.daysUntilMarket).toBe(C.MARKET_DAY_INTERVAL);
    expect(result.current.eventState.market).toMatchObject({ marketsHeld: 1, lastResult: { bunches: 5, goods: 2, petals: expected } });
    expect(onMarketDay).toHaveBeenCalledTimes(1);
    expect(onMarketDay).toHaveBeenCalledWith({ bunches: 5, goods: 2, petals: expected });
  });

  it('holds Market Day with an empty Cart without reporting a sale', () => {
    const onMarketDay = vi.fn();
    const { result } = renderHook(() => useSpringEvent({ initialState: startWith(), onMarketDay }));
    act(() => {
      result.current.processSpringGrowth(60);
    });
    expect(onMarketDay).not.toHaveBeenCalled();
    expect(result.current.eventState.market).toMatchObject({ daysUntilMarket: 60, marketsHeld: 1, lastResult: null });
  });

  it('sells the Cart once over a long time away, and keeps the countdown in step', () => {
    const onMarketDay = vi.fn();
    const cart = { bunches: { tulip_normal_plain: 1 }, goods: {} };
    const { result } = renderHook(() => useSpringEvent({ initialState: startWith({ cart }), onMarketDay }));
    act(() => {
      result.current.processSpringGrowth(130); // Market Days on days 60 and 120
    });
    expect(onMarketDay).toHaveBeenCalledTimes(1);
    expect(result.current.eventState.market).toMatchObject({ daysUntilMarket: 50, marketsHeld: 2 });
  });

  it('brings Market Day every 40 days with the Pony Cart, starting with the current countdown', () => {
    const { result } = renderHook(() => useSpringEvent({ initialState: startWith({ petals: 2000 }) }));
    act(() => {
      result.current.purchaseUpgrade('pony_cart');
    });
    expect(result.current.daysUntilMarket).toBe(40);

    act(() => {
      result.current.processSpringGrowth(40);
    });
    expect(result.current.daysUntilMarket).toBe(40);
    expect(result.current.eventState.market.marketsHeld).toBe(1);
  });
});

describe('useSpringEvent: upgrades and saves', () => {
  it('enforces prerequisites and adds a bed with Bed Expansion', () => {
    const { result } = renderHook(() => useSpringEvent({ initialState: startWith({ petals: 5000 }) }));
    let busker = true;
    let loader = true;
    act(() => {
      busker = result.current.purchaseUpgrade('busker'); // needs the Sandwich Board
      loader = result.current.purchaseUpgrade('cart_loader'); // needs the Gnome Crew
      result.current.purchaseUpgrade('bed_expansion');
    });
    expect([busker, loader]).toEqual([false, false]);
    expect(result.current.beds).toHaveLength(C.DEFAULT_BED_COUNT + 1);
    expect(result.current.eventState.maxBeds).toBe(C.DEFAULT_BED_COUNT + 1);
    expect(result.current.petals).toBe(5000 - 200);
  });

  it('plants an herb by buying its unlock, and it starts growing', () => {
    const onUpgradePurchased = vi.fn();
    const { result } = renderHook(() => useSpringEvent({ initialState: startWith({ petals: 150 }), onUpgradePurchased }));
    act(() => {
      result.current.purchaseUpgrade('unlock_basil');
    });
    act(() => {
      result.current.processSpringGrowth(30);
    });
    expect(result.current.herbs.basil.sprigs).toBe(1);
    expect(result.current.petals).toBe(0);
    expect(onUpgradePurchased).toHaveBeenCalledWith('Basil', 150);
  });

  it('keeps saved purchases, levels and herbs, and picks up new upgrades from code', () => {
    const saved = startWith({ petals: 7 }, 'unlock_daffodil');
    saved.upgrades = withLevel(saved.upgrades!, 'rain_barrel', 3)
      .filter(u => u.id !== 'silk_ribbons')
      .map(u => u.id === 'rain_barrel' ? { ...u, speedBonus: 0.01 } : u);
    saved.herbs = { mint: { sprigs: 4, growth: 5 } } as SpringEventState['herbs'];

    const loaded = loadSpringState(JSON.parse(JSON.stringify(saved)));

    expect(loaded.petals).toBe(7);
    expect(loaded.upgrades.find(u => u.id === 'unlock_daffodil')?.owned).toBe(true);
    expect(loaded.upgrades.some(u => u.id === 'silk_ribbons')).toBe(true);
    // The level is kept, the rule comes from code
    expect(loaded.upgrades.find(u => u.id === 'rain_barrel')).toMatchObject({ level: 3, speedBonus: 0.15 });
    expect(loaded.herbs.mint).toEqual({ sprigs: 4, growth: 5 });
    expect(loaded.herbs.lavender).toEqual({ sprigs: 0, growth: 0 });
    expect(loaded.cart).toEqual({ bunches: {}, goods: {} });
  });

  it('starts a new event with six beds, Tulips, Mint and an empty Cart', () => {
    const state = createInitialSpringState();
    expect(state.beds).toHaveLength(6);
    expect(state.upgrades.filter(u => u.owned).map(u => u.id)).toEqual(['unlock_tulip', 'unlock_mint']);
    expect(state.market.daysUntilMarket).toBe(C.MARKET_DAY_INTERVAL);
    expect(state.petals).toBe(0);
  });

  it('has 19 upgrades besides the flower and herb unlocks', () => {
    const upgrades = ALL_SPRING_UPGRADES.filter(u => !u.id.startsWith('unlock_'));
    expect(upgrades).toHaveLength(19);
    expect(new Set(ALL_SPRING_UPGRADES.map(u => u.id)).size).toBe(ALL_SPRING_UPGRADES.length);
    expect(upgrades.filter(u => u.category === 'garden').map(u => u.id)).toEqual(['watering_can', 'trellis', 'second_row']);
  });
});
