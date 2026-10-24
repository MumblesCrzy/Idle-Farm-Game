/**
 * Tests for the Engineers Guild's rules: Gears from machines, harvester speed and yield,
 * the auto-buyer discount, Irrigation and the Greenhouse, industrial canning, Standard
 * Grade, the honey penalty, Night Shift and GMO Seeds.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  awardGears,
  commitToGuild,
  applyGuildPriceBonuses,
  getAutoBuyerPriceMultiplier,
  getAutoHarvestYieldBonus,
  getCannerRewardDivisor,
  getEngineersCanningTimeMultiplier,
  getEngineersHarvesterSpeedMultiplier,
  getGreenhouseGrowthBonus,
  getGuildHarvesterSpeedMultiplier,
  getGuildHoneyMultiplier,
  getIrrigationGrowthBonus,
  getMassProductionJars,
  getOfflineCapMs,
  getRecipeValueMultiplier,
  hasFactoryFittedHarvesters,
  hasFullAutoHarvestRewards,
  hasHandsOff,
  hasHeatwaveIrrigation,
  heirloomSeedsName
} from '../utils/guildCalculations';
import { getGuildById } from '../data/guildData';
import { MAX_OFFLINE_MS } from '../config/gameConstants';
import { DEFAULT_GUILD_STATE, type GuildState } from '../types/guilds';
import { fitFactoryHarvesters, getHarvesterInterval } from '../utils/gameLoopProcessors';
import { calculateHarvestRewards } from '../utils/harvestCalculations';
import { createAllCrops, getVeggieGrowthBonus } from '../utils/gameCalculations';
import { getBatchRewards, getBatchTime } from '../utils/canningSimulation';
import { beeLevels, lbsPerBatch } from '../utils/beeProduction';
import { beeUpgradeRow } from '../utils/beeView';
import { createInitialBeeUpgrades } from '../data/beeUpgrades';
import { useAutoPurchase } from '../hooks/useAutoPurchase';
import { AUTO_PURCHASER_CYCLE_DAYS } from '../config/gameConstants';
import { legacyKeepableUnlocks } from '../utils/legacy';
import type { Recipe } from '../types/canning';

/** A committed Engineer who bought these upgrade levels */
const engineer = (levels: Record<string, number> = {}): GuildState => ({
  ...commitToGuild(DEFAULT_GUILD_STATE, 'engineers', 1),
  purchasedUpgrades: Object.keys(levels),
  upgradeLevels: levels
});

/** A player still choosing, who sampled these Engineers starter levels */
const sampler = (levels: Record<string, number>): GuildState => ({
  ...DEFAULT_GUILD_STATE,
  status: 'sampling',
  sampledUpgrades: { ...DEFAULT_GUILD_STATE.sampledUpgrades, engineers: Object.keys(levels) },
  purchasedUpgrades: Object.keys(levels),
  upgradeLevels: levels
});

const grower = commitToGuild(DEFAULT_GUILD_STATE, 'growers', 1);
const recipe = { timesCompleted: 0 };
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

describe('the Engineers in the guild list', () => {
  it('can be joined, earn Gears, and sample their starters with Guild Tokens', () => {
    const guild = getGuildById('engineers');
    expect(guild?.joinable).toBe(true);
    expect(guild?.currency.name).toBe('Gears');
    const starters = guild?.upgrades.filter(u => u.tier === 1) ?? [];
    expect(starters.map(u => u.id)).toEqual(['engineers_automation_boost', 'engineers_precision_tools']);
    expect(starters.every(u => u.currencyType === 'guildTokens')).toBe(true);
    expect(guild?.upgrades.filter(u => u.tier > 1).every(u => u.currencyType === 'guildCurrency')).toBe(true);
  });
});

describe('Gears', () => {
  it('pays 1 per 10 auto harvests and 1 per 5 batches, keeping what is left', () => {
    let state = awardGears(engineer(), { autoHarvests: 7 });
    expect(state.guildCurrencies.engineers).toBe(0);
    state = awardGears(state, { autoHarvests: 5, batches: 11 });
    expect(state.guildCurrencies.engineers).toBe(3);
    expect(state.gearProgress).toEqual({ autoHarvests: 2, batches: 1 });
  });

  it('pays nobody else, and leaves the state alone when nothing was done', () => {
    expect(awardGears(grower, { autoHarvests: 50 })).toBe(grower);
    const member = engineer();
    expect(awardGears(member, {})).toBe(member);
  });
});

describe('Auto Harvesters', () => {
  it('run 25% faster for members, more with Hydraulic Arms', () => {
    expect(getEngineersHarvesterSpeedMultiplier(engineer())).toBeCloseTo(1.25);
    expect(getEngineersHarvesterSpeedMultiplier(engineer({ engineers_hydraulic_arms: 2 }))).toBeCloseTo(1.25 * 1.1);
  });

  it('get half of Automation Efficiency while sampling', () => {
    expect(getEngineersHarvesterSpeedMultiplier(sampler({ engineers_automation_boost: 2 }))).toBeCloseTo(1.04);
  });

  it("combine with the Growers' penalty in one guild multiplier", () => {
    expect(getGuildHarvesterSpeedMultiplier(grower)).toBeCloseTo(0.75);
    expect(getGuildHarvesterSpeedMultiplier(engineer())).toBeCloseTo(1.25);
    expect(getGuildHarvesterSpeedMultiplier(DEFAULT_GUILD_STATE)).toBe(1);
  });

  it('bring in more crops with Precision Tools and Combine Header', () => {
    expect(getAutoHarvestYieldBonus(sampler({ engineers_precision_tools: 1 }))).toBeCloseTo(0.01);
    expect(getAutoHarvestYieldBonus(engineer({ engineers_precision_tools: 2, engineers_combine_header: 3 }))).toBeCloseTo(0.13);
  });

  it('come fitted, give full rewards, and replace hand harvests, for members only', () => {
    for (const rule of [hasFactoryFittedHarvesters, hasFullAutoHarvestRewards, hasHandsOff]) {
      expect(rule(engineer())).toBe(true);
      expect(rule(grower)).toBe(false);
      expect(rule(undefined)).toBe(false);
    }
  });

  it('harvest every 40 seconds for a new member, from the usual 50', () => {
    expect(getHarvesterInterval({ harvesterSpeedLevel: 0 })).toBe(50);
    expect(getHarvesterInterval({ harvesterSpeedLevel: 0 }, engineer())).toBe(40);
  });

  it('earn what a hand harvest earns, with the machine yield on auto harvests only', () => {
    const harvest = (auto: boolean, guildState?: GuildState) =>
      calculateHarvestRewards(4, 'Spring', [], 0, 0, 1, 100, auto, guildState);
    const member = engineer({ engineers_combine_header: 3 });
    expect(harvest(true)).toMatchObject({ harvestAmount: 5, experienceGain: 3, knowledgeGain: 0.5 });
    expect(harvest(true, member)).toMatchObject({ harvestAmount: 6, experienceGain: 7, knowledgeGain: 1 });
    expect(harvest(false, member).harvestAmount).toBe(5);
  });

  it('are fitted to every unlocked crop and switched on, never to a locked one', () => {
    const crops = createAllCrops().map((crop, i) => ({
      ...crop, unlocked: i < 3, harvesterOwned: i === 0, autoHarvesterEnabled: i !== 1
    }));
    const fitted = fitFactoryHarvesters(crops, engineer());
    expect(fitted.slice(0, 3).every(v => v.harvesterOwned && v.autoHarvesterEnabled)).toBe(true);
    expect(fitted.slice(3).some(v => v.harvesterOwned)).toBe(false);
    expect(fitFactoryHarvesters(fitted, engineer())).toBe(fitted);
    expect(fitFactoryHarvesters(crops, grower)).toBe(crops);
  });
});

describe('the farm', () => {
  it('discounts what auto-buyers buy with Bulk Purchasing', () => {
    expect(getAutoBuyerPriceMultiplier(engineer({ engineers_bulk_purchasing: 3 }))).toBeCloseTo(0.91);
    expect(getAutoBuyerPriceMultiplier(engineer())).toBe(1);
    expect(getAutoBuyerPriceMultiplier(undefined)).toBe(1);
  });

  it('lets auto-buyers buy at the discount, and logs what they paid', () => {
    const [radish] = createAllCrops();
    const crop = {
      ...radish,
      unlocked: true,
      fertilizerCost: 100,
      autoPurchasers: radish.autoPurchasers.map(ap => (ap.id === 'assistant' ? { ...ap, owned: true, active: true } : ap))
    };
    const handlers = {
      handleBuyFertilizer: vi.fn(), handleBuyBetterSeeds: vi.fn(), handleBuyHarvesterSpeed: vi.fn(), handleBuyAdditionalPlot: vi.fn()
    };
    const onPurchaseCallback = vi.fn();
    renderHook(() => useAutoPurchase({
      veggies: [crop], setVeggies: vi.fn(), money: 92, knowledge: 0, maxPlots: 10, handlers,
      initialTimer: AUTO_PURCHASER_CYCLE_DAYS, priceFactor: 0.91, onPurchaseCallback
    }));
    expect(handlers.handleBuyFertilizer).toHaveBeenCalledWith(0, 0.91);
    expect(onPurchaseCallback).toHaveBeenCalledWith(crop.name, 'Assistant', 'fertilizer', 1, expect.closeTo(91, 5), 'money');
  });

  it('doubles Irrigation and stops Heatwaves with Sprinkler Network', () => {
    expect(getIrrigationGrowthBonus(undefined)).toBe(0.15);
    expect(getIrrigationGrowthBonus(engineer({ engineers_sprinkler_network: 1 }))).toBe(0.3);
    expect(hasHeatwaveIrrigation(engineer({ engineers_sprinkler_network: 1 }))).toBe(true);
    expect(hasHeatwaveIrrigation(engineer())).toBe(false);
  });

  it('adds growth all year with Climate Control', () => {
    expect(getGreenhouseGrowthBonus(engineer({ engineers_climate_control: 1 }))).toBe(0.2);
    expect(getGreenhouseGrowthBonus(engineer())).toBe(0);
  });

  it('grows crops faster with the Irrigation and Greenhouse the farm owns', () => {
    const radish = { ...createAllCrops()[0], fertilizerLevel: 0 };
    const growth = (weather: string, greenhouse: boolean, irrigation: boolean, guildState: GuildState) =>
      getVeggieGrowthBonus(radish, 'Summer', weather, greenhouse, irrigation, guildState);
    const pipes = engineer({ engineers_sprinkler_network: 1 });
    const glass = engineer({ engineers_climate_control: 1 });
    expect(growth('Clear', false, true, pipes) / growth('Clear', false, true, engineer())).toBeCloseTo(1.3 / 1.15);
    expect(growth('Heatwave', false, true, pipes)).toBeCloseTo(growth('Clear', false, true, pipes));
    expect(growth('Heatwave', false, false, pipes)).toBeCloseTo(growth('Clear', false, false, pipes) * 0.7);
    expect(growth('Clear', true, false, glass) / growth('Clear', true, false, engineer())).toBeCloseTo(1.2);
    expect(growth('Clear', false, false, glass)).toBeCloseTo(growth('Clear', false, false, engineer()));
  });

  it('calls Heirloom Seeds GMO Seeds for members', () => {
    expect(heirloomSeedsName(engineer())).toBe('GMO Seeds');
    expect(heirloomSeedsName(grower)).toBe('Heirloom Seeds');
  });

  it('counts 12 hours away with Night Shift', () => {
    expect(getOfflineCapMs(engineer())).toBe(MAX_OFFLINE_MS);
    expect(getOfflineCapMs(engineer({ engineers_night_shift: 1 }))).toBe(12 * 60 * 60 * 1000);
  });
});

describe('Legacy', () => {
  it('can keep any one-time upgrade, and kept upgrades work in any guild', () => {
    const oneTimes = ['engineers_sprinkler_network', 'engineers_climate_control', 'engineers_sound_dampers', 'engineers_night_shift'];
    const member = engineer(Object.fromEntries(oneTimes.map(id => [id, 1])));
    expect(legacyKeepableUnlocks(member).map(upgrade => upgrade.id)).toEqual(oneTimes);

    const keeper: GuildState = {
      ...grower,
      legacy: { count: 1, keptLevels: { engineers_bulk_purchasing: 2 }, keptUnlocks: ['engineers_night_shift', 'engineers_sprinkler_network'], history: [] }
    };
    expect(getOfflineCapMs(keeper)).toBe(12 * 60 * 60 * 1000);
    expect(getIrrigationGrowthBonus(keeper)).toBe(0.3);
    expect(getAutoBuyerPriceMultiplier(keeper)).toBeCloseTo(0.94);
  });
});

describe('canning and prices', () => {
  it('runs batches 30% faster for members, faster again with Conveyor Belts', () => {
    expect(getEngineersCanningTimeMultiplier(engineer())).toBeCloseTo(0.7);
    expect(getEngineersCanningTimeMultiplier(engineer({ engineers_conveyor_belts: 2 }))).toBeCloseTo(0.7 * 0.94);
    expect(getEngineersCanningTimeMultiplier(DEFAULT_GUILD_STATE)).toBe(1);
  });

  it('adds jars with Mass Production', () => {
    expect(getMassProductionJars(engineer({ engineers_mass_production: 2 }))).toBe(2);
  });

  it('count the faster line and the extra jars in every batch', () => {
    expect(getBatchTime(batchRecipe, [], engineer({ engineers_conveyor_belts: 2 }))).toBe(66);
    const batch = (guildState: GuildState) => getBatchRewards(batchRecipe, false, [], [], false, guildState, () => 0.99);
    const plain = batch(engineer());
    const mass = batch(engineer({ engineers_mass_production: 2 }));
    expect(plain.items).toBe(1);
    expect(mass.items).toBe(3);
    expect(mass.money).toBeCloseTo(plain.money * 3);
  });

  it("gives the Canner's batches half the rewards instead of a tenth", () => {
    expect(getCannerRewardDivisor(engineer())).toBe(2);
    expect(getCannerRewardDivisor(DEFAULT_GUILD_STATE)).toBe(10);
  });

  it('sells crops for 15% less and jars for 25% less', () => {
    expect(applyGuildPriceBonuses(100, engineer())).toBeCloseTo(85);
    expect(applyGuildPriceBonuses(100, DEFAULT_GUILD_STATE)).toBe(100);
    expect(getRecipeValueMultiplier(engineer(), recipe)).toBeCloseTo(0.75);
  });

  it('makes 25% less honey, or 10% less with Sound Dampers', () => {
    expect(getGuildHoneyMultiplier(engineer())).toBeCloseTo(0.75);
    expect(getGuildHoneyMultiplier(engineer({ engineers_sound_dampers: 1 }))).toBeCloseTo(0.9);
    expect(getGuildHoneyMultiplier(grower)).toBe(1);
  });

  it('fill 11 lb honey batches instead of 15, or 14 with Sound Dampers', () => {
    const levels = { superFrames: 0, nectarEfficiency: false };
    expect(lbsPerBatch(levels)).toBe(15);
    expect(lbsPerBatch(levels, getGuildHoneyMultiplier(engineer()))).toBe(11);
    expect(lbsPerBatch(levels, getGuildHoneyMultiplier(engineer({ engineers_sound_dampers: 1 })))).toBe(14);
  });

  it('show the smaller batches in the Nectar Efficiency preview', () => {
    const upgrades = createInitialBeeUpgrades();
    const nectar = upgrades.find(upgrade => upgrade.id === 'nectar_efficiency')!;
    const context = { upgrades, levels: beeLevels(upgrades), hives: 20, honey: 0, goldenHoney: 0, beekeeperBonus: 0 };
    expect(beeUpgradeRow(nectar, context).effect).toBe('15 lbs a batch, then 17');
    expect(beeUpgradeRow(nectar, { ...context, honeyMultiplier: 0.75 }).effect).toBe('11 lbs a batch, then 12');
  });
});
