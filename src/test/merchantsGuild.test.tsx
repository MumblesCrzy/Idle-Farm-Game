/**
 * Tests for the Merchants Guild's rules: joining with money, Markup on crops and jars, the
 * starters, Shrewd Bargaining and Price Gouging, Bulk Deals, No Time to Learn, Wholesale,
 * Trade Routes and Additives.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
  applyGuildPriceBonuses,
  commitToGuild,
  getBulkDealsMultiplier,
  getGoldenParachuteMoney,
  getHostileTakeoverPrice,
  getGuildKnowledgeMultiplier,
  getMerchantDays,
  getRecipeValueMultiplier,
  getRehirePriceMultiplier,
  getWholesalePriceMultiplier,
  hasAdditives,
  hasFutures,
  hasHostileTakeover,
  recordTakeover,
  withAdditives
} from '../utils/guildCalculations';
import { getGuildById } from '../data/guildData';
import { DEFAULT_GUILD_STATE, type GuildState } from '../types/guilds';
import { calculateHarvestRewards } from '../utils/harvestCalculations';
import { getBatchRewards } from '../utils/canningSimulation';
import { legacyKeepableUnlocks } from '../utils/legacy';
import { GameClockProvider } from '../hooks/useGameClock';
import { useCanningSystem } from '../hooks/useCanningSystem';
import StatsDisplay from '../components/StatsDisplay';
import { createAllCrops, formatNumber } from '../utils/gameCalculations';
import { calculateOfflineProgress } from '../utils/offlineProgress';
import { buildMerchantSaleEvent } from '../utils/eventLogUtils';
import { buildLegacySave } from '../utils/legacyReset';
import type { ExtendedGameState } from '../utils/saveSystem';
import type { CanningState, Recipe } from '../types/canning';

/** A committed Merchant who bought these upgrade levels */
const merchant = (levels: Record<string, number> = {}): GuildState => ({
  ...commitToGuild(DEFAULT_GUILD_STATE, 'merchants', 1),
  purchasedUpgrades: Object.keys(levels),
  upgradeLevels: levels
});

/** A player still choosing, who sampled these Merchants starter levels */
const sampler = (levels: Record<string, number>): GuildState => ({
  ...DEFAULT_GUILD_STATE,
  status: 'sampling',
  sampledUpgrades: { ...DEFAULT_GUILD_STATE.sampledUpgrades, merchants: Object.keys(levels) },
  purchasedUpgrades: Object.keys(levels),
  upgradeLevels: levels
});

const grower = commitToGuild(DEFAULT_GUILD_STATE, 'growers', 1);

/** A one-crop recipe that takes 100 seconds and sells for $100 */
const batchRecipe: Recipe = {
  id: 'canned_radish',
  name: 'Canned Radish',
  description: '',
  ingredients: [{ veggieIndex: 0, veggieName: 'Radish', quantity: 3 }],
  processingTime: 100,
  baseProcessingTime: 100,
  salePrice: 100,
  baseSalePrice: 100,
  experienceRequired: 0,
  unlocked: true,
  timesCompleted: 0
};

/** One batch's rewards, with no bonus jar */
const batch = (guildState: GuildState) => getBatchRewards(batchRecipe, false, [], [], false, guildState, () => 0.99);

/** Knowledge from one manual harvest at Farm Tier 3 */
const harvestKnowledge = (guildState: GuildState) =>
  calculateHarvestRewards(0, 'Spring', [], 0, 0, 3, 0, false, guildState).knowledgeGain;

describe('the Merchants in the guild list', () => {
  it('can be joined, and spend money on everything, starters included', () => {
    const guild = getGuildById('merchants');
    expect(guild?.joinable).toBe(true);
    expect(guild?.currency.money).toBe(true);
    expect(guild?.upgrades.every(u => u.currencyType === 'money')).toBe(true);
    const starters = guild?.upgrades.filter(u => u.tier === 1) ?? [];
    expect(starters.map(u => u.id)).toEqual(['merchants_haggling', 'merchants_bulk_deals']);
    expect(starters.every(u => u.baseCost === 1_000_000 && u.costScaling === 1.5 && u.effectPerLevel === 0.02)).toBe(true);
  });

  it('give Markup, Payroll and Ferdinand, and take No Time to Learn as their one trade-off', () => {
    const guild = getGuildById('merchants');
    expect(guild?.passiveBonuses.map(bonus => bonus.name)).toEqual(['Markup', 'Payroll', 'Ferdinand']);
    expect(guild?.tradeOffs.map(tradeOff => tradeOff.name)).toEqual(['No Time to Learn']);
  });
});

describe('crop prices', () => {
  it('are 15% higher for members, with Markup', () => {
    expect(applyGuildPriceBonuses(100, merchant())).toBeCloseTo(115);
    expect(applyGuildPriceBonuses(100, grower)).toBeCloseTo(100);
  });

  it('get half of Haggling while sampling, and all of it and Shrewd Bargaining once joined', () => {
    expect(applyGuildPriceBonuses(100, sampler({ merchants_haggling: 2 }))).toBeCloseTo(102);
    expect(applyGuildPriceBonuses(100, merchant({ merchants_haggling: 2, merchants_shrewd_bargaining: 3 }))).toBeCloseTo(128);
  });
});

describe('canned goods', () => {
  it('sell for 15% more for members, and more with Price Gouging', () => {
    expect(getRecipeValueMultiplier(merchant(), { timesCompleted: 0 })).toBeCloseTo(1.15);
    expect(getRecipeValueMultiplier(merchant({ merchants_price_gouging: 4 }), { timesCompleted: 0 })).toBeCloseTo(1.27);
    expect(getRecipeValueMultiplier(DEFAULT_GUILD_STATE, { timesCompleted: 0 })).toBe(1);
  });

  it('sell for the same with Additives', () => {
    expect(batch(merchant({ merchants_additives: 1 })).money).toBeCloseTo(115);
  });
});

describe('No Time to Learn', () => {
  it('cuts knowledge from harvests by 15% for members', () => {
    expect(harvestKnowledge(merchant())).toBeCloseTo(harvestKnowledge(DEFAULT_GUILD_STATE) * 0.85);
    expect(harvestKnowledge(grower)).toBeCloseTo(harvestKnowledge(DEFAULT_GUILD_STATE));
  });

  it('cuts knowledge from canning by 15% for members', () => {
    expect(batch(merchant()).knowledge).toBeCloseTo(batch(DEFAULT_GUILD_STATE).knowledge * 0.85);
    expect(getGuildKnowledgeMultiplier(grower)).toBe(1);
  });
});

describe('Bulk Deals', () => {
  it('pay on a sale of 100 crops or more, at half strength while sampling', () => {
    expect(getBulkDealsMultiplier(merchant({ merchants_bulk_deals: 5 }), 99)).toBe(1);
    expect(getBulkDealsMultiplier(merchant({ merchants_bulk_deals: 5 }), 100)).toBeCloseTo(1.1);
    expect(getBulkDealsMultiplier(sampler({ merchants_bulk_deals: 5 }), 100)).toBeCloseTo(1.05);
    expect(getBulkDealsMultiplier(undefined, 1000)).toBe(1);
  });
});

describe('Wholesale', () => {
  it('takes 2% a level off crop upgrades', () => {
    expect(getWholesalePriceMultiplier(merchant({ merchants_wholesale: 3 }))).toBeCloseTo(0.94);
    expect(getWholesalePriceMultiplier(merchant())).toBe(1);
    expect(getWholesalePriceMultiplier(undefined)).toBe(1);
  });
});

describe('Trade Routes', () => {
  it('bring the Merchant every 25, 20, 15 or 10 days instead of 30', () => {
    const days = [0, 1, 2, 3, 4].map(level => getMerchantDays(merchant(level > 0 ? { merchants_trade_routes: level } : {})));
    expect(days).toEqual([30, 25, 20, 15, 10]);
    expect(getMerchantDays(undefined)).toBe(30);
  });
});

describe('Additives', () => {
  it('take one of each crop off a recipe, never below 1', () => {
    expect([6, 3, 2, 1].map(quantity => withAdditives(quantity, true))).toEqual([5, 2, 1, 1]);
    expect(withAdditives(3, false)).toBe(3);
  });

  it('count when bought, or kept from a Legacy in any guild', () => {
    expect(hasAdditives(merchant({ merchants_additives: 1 }))).toBe(true);
    expect(hasAdditives(merchant())).toBe(false);
    const kept: GuildState = { ...grower, legacy: { count: 1, keptLevels: {}, keptUnlocks: ['merchants_additives'], history: [] } };
    expect(hasAdditives(kept)).toBe(true);
  });

  it('can be the unlock a Legacy keeps', () => {
    expect(legacyKeepableUnlocks(merchant({ merchants_additives: 1 })).map(upgrade => upgrade.id)).toContain('merchants_additives');
  });

  it('change the recipes the Kitchen reads', () => {
    const saved: CanningState = {
      recipes: [],
      unlockedRecipes: [],
      activeProcesses: [],
      maxSimultaneousProcesses: 1,
      upgrades: [],
      totalItemsCanned: 0,
      canningExperience: 0,
      autoCanning: { enabled: false, selectedRecipes: [], priorityOrder: [] }
    };
    const crops = ['Radish', 'Lettuce', 'Green Beans'].map(name => ({ name, stash: 10, salePrice: 1, growth: 0 }));
    const wrapper = ({ children }: { children: ReactNode }) => <GameClockProvider>{children}</GameClockProvider>;
    // Made once: a new guild state or setter on every render would loop the hook's effects
    const withAdditivesOwned = merchant({ merchants_additives: 1 });
    const [setVeggies, setMoney, setKnowledge] = [vi.fn(), vi.fn(), vi.fn()];
    const achievements: string[] = [];
    const { result } = renderHook(() => useCanningSystem(
      crops, setVeggies, false, 0, setMoney, 0, setKnowledge, saved, 'profit', 3,
      0, 0, 0, undefined, undefined, achievements, withAdditivesOwned
    ), { wrapper });
    const needs = (id: string) => result.current.canningState.recipes.find(recipe => recipe.id === id)?.ingredients.map(i => i.quantity);

    expect(needs('canned_radish')).toEqual([2]);
    expect(needs('garden_mix')).toEqual([1, 1, 1]);
  });
});

describe('the header', () => {
  it('shows no guild currency for Merchants: their money is already there', () => {
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
    const { unmount } = header(merchant());
    expect(screen.getAllByText(/Money:/)).toHaveLength(1);
    unmount();

    header(grower);
    expect(screen.getByText(/Sigils:/)).toBeInTheDocument();
  });
});

describe('Head Hunters', () => {
  it('halve what rehiring everyone costs', () => {
    expect(getRehirePriceMultiplier(merchant({ merchants_head_hunters: 1 }))).toBe(0.5);
    expect(getRehirePriceMultiplier(merchant())).toBe(1);
  });
});

describe('Futures', () => {
  /** Radish with 50 in the stash marked Sell, and Lettuce with 80 on Hold */
  const stocked = () => createAllCrops().map((crop, i) => (i === 0
    ? { ...crop, unlocked: true, stash: 50, sellEnabled: true }
    : i === 1 ? { ...crop, unlocked: true, stash: 80, sellEnabled: false } : crop));
  const away = (guildState: GuildState, autoSellOwned = true, seconds = 30) => calculateOfflineProgress(seconds * 1000, {
    veggies: stocked(), day: 1, totalDaysElapsed: 0, dayLength: 1000, season: 'Spring', currentWeather: 'Clear',
    greenhouseOwned: false, irrigationOwned: false, almanacLevel: 0, farmTier: 1, knowledge: 0,
    canningProcesses: [], canningUpgrades: {}, autoCanning: { enabled: false }, guildState, autoSellOwned
  });

  it('has the Merchant sell what is marked Sell on his days while you are away', () => {
    const result = away(merchant({ merchants_futures: 1 }));
    const price = applyGuildPriceBonuses(stocked()[0].salePrice, merchant({ merchants_futures: 1 }));
    expect(result.awaySales.visits).toBe(1);
    expect(result.awaySales.sold).toEqual([{ name: 'Radish', quantity: 50, earnings: expect.closeTo(50 * price, 6) }]);
    expect(result.awaySales.money).toBeCloseTo(50 * price);
    expect(result.veggies[0].stash).toBe(0);
    expect(result.veggies[1].stash).toBe(80);
  });

  it('keeps the Trade Routes schedule', () => {
    // Away from day 1: day 10 comes after 9 seconds, day 30 after 29
    const routes = merchant({ merchants_futures: 1, merchants_trade_routes: 4 });
    expect(away(routes, true, 8).awaySales.visits).toBe(0);
    expect(away(routes, true, 9).awaySales.visits).toBe(1);
    expect(away(merchant({ merchants_futures: 1 }), true, 9).awaySales.visits).toBe(0);
    expect(away(merchant({ merchants_futures: 1 }), true, 29).awaySales.visits).toBe(1);
  });

  it('logs the sale total as money, not a long decimal', () => {
    const event = buildMerchantSaleEvent(32_423.71494999997, [{ name: 'Broccoli', quantity: 54, earnings: 32_423.71494999997 }], true, { merchant: 'm', money: 'd' });
    expect(event.details).toBe('Sold 54 Broccoli for $32.42K');
  });

  it('sells nothing without Futures, or without the Merchant', () => {
    expect(away(merchant()).awaySales.money).toBe(0);
    expect(away(merchant({ merchants_futures: 1 }), false).awaySales.money).toBe(0);
    expect(hasFutures(merchant({ merchants_futures: 1 }))).toBe(true);
  });
});

describe('Hostile Takeover', () => {
  it('costs ten times the larger farm, is counted, and stays with the guild at a Legacy', () => {
    expect(getHostileTakeoverPrice(37_080)).toBe(370_800);
    expect(recordTakeover(recordTakeover(merchant())).takeovers).toBe(2);
    expect(hasHostileTakeover(merchant({ merchants_hostile_takeover: 1 }))).toBe(true);
    const keepable = legacyKeepableUnlocks(merchant({ merchants_hostile_takeover: 1, merchants_futures: 1 })).map(upgrade => upgrade.id);
    expect(keepable).toEqual(['merchants_futures']);
  });
});

describe('Golden Parachute', () => {
  const ending = (guildState: GuildState, money: number) => buildLegacySave({
    money,
    guildState,
    totalDaysElapsed: 900,
    permanentBonuses: [],
    achievementState: { achievements: [], totalUnlocked: 0, lastUnlockedId: null }
  } as unknown as ExtendedGameState, null, 777);

  it('carries a tenth of the money into the next Legacy', () => {
    const save = ending(merchant({ merchants_golden_parachute: 1 }), 1_310_000_000);
    expect(save.money).toBe(131_000_000);
    expect(save.eventLogState?.entries[0].details).toContain('Golden Parachute carried $131M.');
    expect(ending(merchant(), 1_310_000_000).money).toBe(0);
  });

  it('keeps paying in any guild once a Legacy keeps it', () => {
    const kept: GuildState = { ...grower, legacy: { count: 1, keptLevels: {}, keptUnlocks: ['merchants_golden_parachute'], history: [] } };
    expect(getGoldenParachuteMoney(kept, 5_000)).toBe(500);
  });
});
