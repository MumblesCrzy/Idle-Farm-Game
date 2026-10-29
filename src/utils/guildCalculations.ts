/**
 * Guild bonus calculation utilities
 * Calculates all bonuses and penalties from guild upgrades
 */
import type { GuildState, GuildTokenSource, GuildType, GuildUpgrade } from '../types/guilds';
import { MAX_OFFLINE_MS, MERCHANT_DAYS } from '../config/gameConstants';
import {
  GUILD_TOKEN_SOURCES,
  GUILDS,
  GUILDS_UNLOCK_TIER,
  RECIPE_MASTERY_STAGES,
  RUSH_BATCH_MIN_COST
} from '../data/guildData';

/** Soft cap multiplier for pre-commitment upgrades (50% effectiveness) */
const PRE_COMMITMENT_SOFT_CAP = 0.5;

/** Every guild upgrade by id */
const UPGRADES_BY_ID = new Map(GUILDS.flatMap(guild => guild.upgrades).map(upgrade => [upgrade.id, upgrade]));

/** A guild upgrade's definition, if the id is one */
export function findGuildUpgrade(upgradeId: string): GuildUpgrade | undefined {
  return UPGRADES_BY_ID.get(upgradeId);
}

/** An upgrade's effect per level */
const rateOf = (upgradeId: string): number => UPGRADES_BY_ID.get(upgradeId)?.effectPerLevel ?? 0;

/**
 * Levels of an upgrade bought in the current Legacy: 1 for a bought one-time upgrade
 */
export function getBoughtLevel(guildState: GuildState, upgradeId: string): number {
  if (!guildState.purchasedUpgrades.includes(upgradeId)) {
    return 0;
  }
  return guildState.upgradeLevels[upgradeId] ?? 1;
}

/**
 * Levels of an upgrade kept from earlier Legacies: 1 for a kept one-time upgrade
 */
export function getKeptLevel(guildState: GuildState, upgradeId: string): number {
  const legacy = guildState.legacy;
  if (!legacy) return 0;
  if (legacy.keptUnlocks.includes(upgradeId)) return 1;
  return legacy.keptLevels[upgradeId] ?? 0;
}

/**
 * An upgrade's level: bought this Legacy plus kept from earlier ones, never above its max.
 * Every guild effect reads levels through here, so kept benefits apply everywhere.
 */
export function getUpgradeLevel(guildState: GuildState, upgradeId: string): number {
  const total = getBoughtLevel(guildState, upgradeId) + getKeptLevel(guildState, upgradeId);
  const max = UPGRADES_BY_ID.get(upgradeId)?.maxLevel ?? Infinity;
  return Math.min(max, total);
}

/** Whether an upgrade can't be bought again: a one-time upgrade owned, or a leveled one at its max */
export function isGuildUpgradeMaxed(guildState: GuildState, upgrade: Pick<GuildUpgrade, 'id' | 'isOneTime' | 'maxLevel'>): boolean {
  const level = getUpgradeLevel(guildState, upgrade.id);
  return upgrade.isOneTime ? level > 0 : level >= upgrade.maxLevel;
}

/**
 * Levels that count toward a starter upgrade's effect: levels kept from earlier Legacies at
 * full strength, levels bought this Legacy at the sampling cap until the player joins the guild
 */
function softCappedLevels(guildState: GuildState, upgradeId: string, guildId: string): number {
  const kept = getKeptLevel(guildState, upgradeId);
  const total = getUpgradeLevel(guildState, upgradeId);
  const bought = Math.max(0, total - kept);
  return Math.min(kept, total) + bought * getSoftCapMultiplier(guildState, guildId);
}

/** What the next level of a guild upgrade costs, rounded to a whole number */
export function getGuildUpgradeCost(upgrade: Pick<GuildUpgrade, 'baseCost' | 'costScaling'>, currentLevel: number): number {
  return Math.round(upgrade.baseCost * Math.pow(upgrade.costScaling, currentLevel));
}

/**
 * Joins a guild for good. Guild currency is earned only as a member, so unspent Guild
 * Tokens don't carry over and the guild's currency starts where it was, at zero.
 */
export function commitToGuild(guildState: GuildState, guildId: GuildType, day: number): GuildState {
  return {
    ...guildState,
    committedGuild: guildId,
    status: 'committed',
    commitmentDay: day,
    guildTokens: 0,
    tokenProgress: undefined
  };
}

/**
 * Check if player is committed to a specific guild
 */
export function isCommittedTo(guildState: GuildState, guildId: string): boolean {
  return guildState.committedGuild === guildId;
}

/**
 * Get the soft cap multiplier for pre-commitment sampling upgrades
 * Returns 1.0 if committed, PRE_COMMITMENT_SOFT_CAP if not committed
 */
export function getSoftCapMultiplier(guildState: GuildState, guildId: string): number {
  // If committed to this guild, no soft cap
  if (isCommittedTo(guildState, guildId)) {
    return 1.0;
  }
  // If not committed (sampling), apply soft cap
  return PRE_COMMITMENT_SOFT_CAP;
}

// =============================================================================
// GROWERS GUILD BONUSES
// =============================================================================

/**
 * Get total growth rate bonus from Growers guild upgrades
 * Combines: Fertile Soil (+3%/level) + Advanced Fertilizer Research (+2%/level)
 * Tier 1 upgrades (Fertile Soil) have soft cap before commitment
 */
export function getGrowersGrowthBonus(guildState: GuildState): number {
  // Fertile Soil: +3% per level (Tier 1, so bought levels run at half strength until the player joins)
  // Advanced Fertilizer Research: +2% per level (Tier 2, members only)
  const fertileSoilLevels = softCappedLevels(guildState, 'growers_fertile_soil', 'growers');
  const advancedFertilizerLevel = getUpgradeLevel(guildState, 'growers_advanced_fertilizer');
  return (fertileSoilLevels * 0.03) + (advancedFertilizerLevel * 0.02);
}

/**
 * Get fertilizer effectiveness boost from Verdant Glyphs
 * Returns multiplier (1.0 = no boost, 1.25 = +25% boost)
 */
export function getFertilizerEffectivenessMultiplier(guildState: GuildState): number {
  const verdantGlyphsLevel = getUpgradeLevel(guildState, 'growers_verdant_glyphs');
  
  // Verdant Glyphs: +25% fertilizer effectiveness (total, not per level)
  // The upgrade has maxLevel: 1, so it's either 0 or 1
  // Tier 2 upgrade - no soft cap (requires commitment)
  return 1 + (verdantGlyphsLevel * 0.25);
}

/**
 * Get total price bonus from Growers guild upgrades
 * Combines: Green Thumb (+2%/level) + Selective Breeding (+3%/level)
 * Tier 1 upgrades (Green Thumb) have soft cap before commitment
 */
export function getGrowersPriceBonus(guildState: GuildState): number {
  // Green Thumb: +2% per level (Tier 1, so bought levels run at half strength until the player joins)
  // Selective Breeding: +3% per level (Tier 2, members only)
  const greenThumbLevels = softCappedLevels(guildState, 'growers_green_thumb', 'growers');
  const selectiveBreedingLevel = getUpgradeLevel(guildState, 'growers_selective_breeding');
  return (greenThumbLevels * 0.02) + (selectiveBreedingLevel * 0.03);
}

/**
 * Check if Whispers of the Seed is active (10x sale price multiplier)
 */
export function hasWhispersOfSeed(guildState: GuildState): boolean {
  return getUpgradeLevel(guildState, 'growers_whispers_of_seed') > 0;
}

/**
 * Check if Fruit Cultivation is unlocked (allows growing fruits)
 */
export function hasFruitCultivation(guildState: GuildState): boolean {
  return getUpgradeLevel(guildState, 'growers_fruit_cultivation') > 0;
}

/**
 * Get manual harvest bonus from Growers guild
 * Committed Growers get +1 on manual harvests
 */
export function getGrowersManualHarvestBonus(guildState: GuildState): number {
  if (!isCommittedTo(guildState, 'growers')) return 0;
  
  // Committed Growers: +1 to manual harvests
  return 1;
}

/**
 * Get Blessed Crop chance (Soilbound Pact) - chance for double yield
 * Returns probability (0.0 - 1.0)
 */
export function getBlessedCropChance(guildState: GuildState): number {
  const soilboundPactLevel = getUpgradeLevel(guildState, 'growers_soilbound_pact');
  
  // Soilbound Pact: Chance for "Blessed Crop" event (double yield)
  // Let's say 5% chance per level, max 1 level = 5%
  return soilboundPactLevel * 0.05;
}

/**
 * Get Quality Grading bonus - increased exp from harvests
 */
export function getQualityGradingExpBonus(guildState: GuildState): number {
  const qualityGradingLevel = getUpgradeLevel(guildState, 'growers_quality_grading');
  
  // Quality Grading: +10% experience per level
  return qualityGradingLevel * 0.10;
}

/**
 * Get Quality Grading high-quality crop chance
 * Returns probability (0.0 - 1.0) for crops to be "high quality" (+50% value)
 */
export function getQualityGradingChance(guildState: GuildState): number {
  const qualityGradingLevel = getUpgradeLevel(guildState, 'growers_quality_grading');
  
  // Quality Grading: 5% chance per level for high-quality crops
  return qualityGradingLevel * 0.05;
}

/**
 * Get Quality Grading value bonus (applied when crop is high quality)
 * Returns the bonus multiplier (1.5 = +50% value)
 */
export function getQualityGradingValueBonus(): number {
  return 1.5; // +50% value for high-quality crops
}

// =============================================================================
// GROWERS GUILD PENALTIES (Trade-offs)
// =============================================================================

/**
 * Get harvester speed penalty for committed Growers
 * Returns multiplier (1.0 = no penalty, 0.75 = 25% slower)
 */
export function getGrowersHarvesterSpeedMultiplier(guildState: GuildState): number {
  if (!isCommittedTo(guildState, 'growers')) return 1.0;
  
  // Committed Growers: -25% auto-harvester speed
  return 0.75;
}

/**
 * Get canning profit penalty for committed Growers
 * Returns multiplier (1.0 = no penalty, 0.85 = 15% less profit)
 */
export function getGrowerCanningProfitMultiplier(guildState: GuildState): number {
  if (!isCommittedTo(guildState, 'growers')) return 1.0;
  
  // Committed Growers: -15% canning profit
  return 0.85;
}

// =============================================================================
// GROWERS GUILD SYNERGIES
// =============================================================================

/**
 * Get bee pollination bonus for committed Growers
 * Returns additional bonus to add to bee yield
 */
export function getGrowersBeePollinationBonus(guildState: GuildState): number {
  if (!isCommittedTo(guildState, 'growers')) return 0;
  
  // Committed Growers: +5% bee pollination effectiveness
  return 0.05;
}

// =============================================================================
// PRESERVERS GUILD
// =============================================================================

/** Master Preserver: committed Preservers' canned goods sell for this much more */
export const MASTER_PRESERVER_BONUS = 0.2;

/** Processing Focus: committed Preservers' raw crops sell for this much less */
export const PROCESSING_FOCUS_PENALTY = 0.1;

/** An upgrade's whole effect: its level times its effect per level */
function levelEffect(guildState: GuildState, upgradeId: string): number {
  return getUpgradeLevel(guildState, upgradeId) * (UPGRADES_BY_ID.get(upgradeId)?.effectPerLevel ?? 0);
}

/** Whether a one-time upgrade is owned */
function owns(guildState: GuildState, upgradeId: string): boolean {
  return getUpgradeLevel(guildState, upgradeId) > 0;
}

/**
 * Added canned goods value from the Preservers: Tight Lids (half strength before
 * committing), Cellar Aging, and Master Preserver for members. 0.2 means +20%.
 */
export function getPreserversValueBonus(guildState: GuildState): number {
  const master = isCommittedTo(guildState, 'preservers') ? MASTER_PRESERVER_BONUS : 0;
  return softCappedLevels(guildState, 'preservers_shelf_life', 'preservers') * rateOf('preservers_shelf_life')
    + levelEffect(guildState, 'preservers_cellar_aging')
    + master;
}

/**
 * Canning time multiplier from Rolling Boil (half strength before committing) and
 * Copper Kettles. 0.9 means batches take 90% of the time.
 */
export function getPreserversTimeMultiplier(guildState: GuildState): number {
  return (1 - softCappedLevels(guildState, 'preservers_efficient_canning', 'preservers') * rateOf('preservers_efficient_canning'))
    * (1 - levelEffect(guildState, 'preservers_copper_kettles'));
}

/** Jars from one batch with the Pressure Canner: 1, plus 1 per level */
export function getPressureCannerJars(guildState: GuildState): number {
  return 1 + getUpgradeLevel(guildState, 'preservers_pressure_canner');
}

/** Recipe Mastery from the Family Cookbook, for a recipe made this many times */
export function getRecipeMasteryBonus(guildState: GuildState, timesCompleted: number): number {
  if (!owns(guildState, 'preservers_family_cookbook')) return 0;
  return RECIPE_MASTERY_STAGES.find(stage => timesCompleted >= stage.batches)?.bonus ?? 0;
}

/** Added value on honey recipes from Honey Glaze */
export function getHoneyGlazeBonus(guildState: GuildState): number {
  return levelEffect(guildState, 'preservers_honey_glaze');
}

/** Chance that a batch is a Prize Jar, from Seal of Quality */
export function getPrizeJarChance(guildState: GuildState): number {
  return levelEffect(guildState, 'preservers_seal_of_quality');
}

/** Canner batches give the knowledge and canning experience of a manual batch divided by this */
export function getCannerRewardDivisor(guildState: GuildState | undefined): number {
  return guildState && (owns(guildState, 'preservers_trusted_apprentice') || isEngineer(guildState)) ? 2 : 10;
}

/** Whether the Cellar recipes are open */
export function hasCellarRecipes(guildState: GuildState | undefined): boolean {
  return !!guildState && owns(guildState, 'preservers_cellar_recipes');
}

/** Whether Rush Batch is owned */
export function hasRushBatch(guildState: GuildState): boolean {
  return owns(guildState, 'preservers_rush_batch');
}

/** Whether Pantry Lock keeps the Glutton out */
export function hasPantryLock(guildState: GuildState): boolean {
  return owns(guildState, 'preservers_pantry_lock');
}

/** Raw crop sale price multiplier: committed Preservers sell raw crops for less */
export function getRawCropPriceMultiplier(guildState: GuildState): number {
  return isCommittedTo(guildState, 'preservers') ? 1 - PROCESSING_FOCUS_PENALTY : 1;
}

/**
 * What guilds do to one canning batch's value, before counting jars: the Growers'
 * canning penalty, the Engineers' Standard Grade, and the bonuses, which add together:
 * the Preservers' value upgrades, Recipe Mastery and, on honey recipes, Honey Glaze, and
 * the Merchants' Markup and Price Gouging. A Hot Tip doubles it all.
 */
export function getRecipeValueMultiplier(
  guildState: GuildState | undefined,
  recipe: { honeyRequirement?: unknown; timesCompleted: number }
): number {
  if (!guildState) return 1;
  const honey = recipe.honeyRequirement ? getHoneyGlazeBonus(guildState) : 0;
  const bonus = getPreserversValueBonus(guildState) + getRecipeMasteryBonus(guildState, recipe.timesCompleted) + honey
    + getMerchantsJarValueBonus(guildState);
  return getGrowerCanningProfitMultiplier(guildState) * getStandardGradeJarMultiplier(guildState) * (1 + bonus)
    * getHotTipMultiplier(guildState);
}

/** Wax Seals one Rush Batch costs */
export function getRushBatchCost(runningBatches: number): number {
  return Math.max(RUSH_BATCH_MIN_COST, runningBatches);
}

/** Finished canning batches, for Wax Seals */
export interface BatchCount {
  /** Batches the player started */
  manual: number;
  /** Batches the Canner started */
  automated: number;
  /** Prize Jars among the batches the player started */
  prizes: number;
}

/**
 * Pays committed Preservers their Wax Seals for finished batches: 1 per batch the player
 * started, and 1 more per Prize Jar among those. The Canner's batches earn none, as the
 * Growers' auto harvests earn no Sigils. Returns the same state when nothing is earned.
 */
export function awardWaxSeals(guildState: GuildState, batches: BatchCount): GuildState {
  if (!isCommittedTo(guildState, 'preservers')) return guildState;
  const seals = batches.manual + batches.prizes;
  if (seals === 0) return guildState;
  return {
    ...guildState,
    guildCurrencies: { ...guildState.guildCurrencies, preservers: guildState.guildCurrencies.preservers + seals }
  };
}

// =============================================================================
// ENGINEERS GUILD
// =============================================================================

/** Automated Excellence: committed Engineers' Auto Harvesters run this much faster */
export const AUTOMATED_EXCELLENCE_BONUS = 0.25;

/** Industrial Canning: committed Engineers' batches take this share of the time */
export const INDUSTRIAL_CANNING_TIME = 0.7;

/** Standard Grade: committed Engineers' raw crops sell for this much less */
export const STANDARD_GRADE_CROP_PENALTY = 0.15;

/** Standard Grade: committed Engineers' canned goods sell for this much less */
export const STANDARD_GRADE_JAR_PENALTY = 0.25;

/** Noisy Machines: committed Engineers' bees make this much less honey */
export const NOISY_MACHINES_HONEY_PENALTY = 0.25;

/** Noisy Machines with Sound Dampers */
export const SOUND_DAMPERS_HONEY_PENALTY = 0.1;

/** Irrigation's growth bonus, and the larger one with Sprinkler Network */
export const IRRIGATION_GROWTH_BONUS = 0.15;
export const SPRINKLER_GROWTH_BONUS = 0.3;

/** Climate Control: the Greenhouse adds this much growth in every season */
export const CLIMATE_CONTROL_GROWTH_BONUS = 0.2;

/** Night Shift: time away counts up to this many hours */
export const NIGHT_SHIFT_HOURS = 12;

/** Gears for committed Engineers: one for every this many auto harvests, and canning batches */
export const GEAR_SOURCES = { autoHarvests: 10, batches: 5 } as const;

/** Whether the player has joined the Engineers */
export function isEngineer(guildState: GuildState | undefined): guildState is GuildState {
  return !!guildState && isCommittedTo(guildState, 'engineers');
}

/**
 * Auto Harvester speed from the Engineers: Automated Excellence for members, Automation
 * Efficiency (half strength before joining) and Hydraulic Arms. 1.25 means 25% faster.
 */
export function getEngineersHarvesterSpeedMultiplier(guildState: GuildState): number {
  const excellence = isEngineer(guildState) ? AUTOMATED_EXCELLENCE_BONUS : 0;
  return (1 + excellence)
    * (1 + softCappedLevels(guildState, 'engineers_automation_boost', 'engineers') * rateOf('engineers_automation_boost'))
    * (1 + levelEffect(guildState, 'engineers_hydraulic_arms'));
}

/** Every guild's effect on Auto Harvester speed: the Growers' penalty and the Engineers' bonuses */
export function getGuildHarvesterSpeedMultiplier(guildState: GuildState): number {
  return getGrowersHarvesterSpeedMultiplier(guildState) * getEngineersHarvesterSpeedMultiplier(guildState);
}

/** Extra crops from auto harvests: Precision Tools (half strength before joining) and Combine Header. 0.1 means +10% */
export function getAutoHarvestYieldBonus(guildState: GuildState): number {
  return softCappedLevels(guildState, 'engineers_precision_tools', 'engineers') * rateOf('engineers_precision_tools')
    + levelEffect(guildState, 'engineers_combine_header');
}

/** Engineers' auto harvests give a manual harvest's full experience and knowledge */
export function hasFullAutoHarvestRewards(guildState: GuildState | undefined): boolean {
  return isEngineer(guildState);
}

/** Hands Off: committed Engineers can't harvest by hand; their machines bring in every crop */
export function hasHandsOff(guildState: GuildState | undefined): boolean {
  return isEngineer(guildState);
}

/** Every unlocked crop of a committed Engineer comes with an Auto Harvester */
export function hasFactoryFittedHarvesters(guildState: GuildState | undefined): boolean {
  return isEngineer(guildState);
}

/** What auto-buyers pay with Bulk Purchasing: 0.91 means 9% less */
export function getAutoBuyerPriceMultiplier(guildState: GuildState | undefined): number {
  return guildState ? 1 - levelEffect(guildState, 'engineers_bulk_purchasing') : 1;
}

/** Irrigation's growth bonus: +15%, or +30% with Sprinkler Network */
export function getIrrigationGrowthBonus(guildState: GuildState | undefined): number {
  return guildState && owns(guildState, 'engineers_sprinkler_network') ? SPRINKLER_GROWTH_BONUS : IRRIGATION_GROWTH_BONUS;
}

/** Whether Irrigation also keeps Heatwaves from slowing crops, with Sprinkler Network */
export function hasHeatwaveIrrigation(guildState: GuildState | undefined): boolean {
  return !!guildState && owns(guildState, 'engineers_sprinkler_network');
}

/** Growth the Greenhouse adds in every season with Climate Control */
export function getGreenhouseGrowthBonus(guildState: GuildState | undefined): number {
  return guildState && owns(guildState, 'engineers_climate_control') ? CLIMATE_CONTROL_GROWTH_BONUS : 0;
}

/** Canning time from the Engineers: Industrial Canning for members, and Conveyor Belts. 0.7 means 70% of the time */
export function getEngineersCanningTimeMultiplier(guildState: GuildState): number {
  return (isEngineer(guildState) ? INDUSTRIAL_CANNING_TIME : 1) * (1 - levelEffect(guildState, 'engineers_conveyor_belts'));
}

/** Extra jars per canning batch from Mass Production */
export function getMassProductionJars(guildState: GuildState): number {
  return getUpgradeLevel(guildState, 'engineers_mass_production');
}

/** Canning time from every guild: the Preservers' time upgrades and the Engineers' line */
export function getGuildCanningTimeMultiplier(guildState: GuildState | undefined): number {
  if (!guildState) return 1;
  return getPreserversTimeMultiplier(guildState) * getEngineersCanningTimeMultiplier(guildState);
}

/** Jars from one batch: 1, plus the Pressure Canner's and Mass Production's */
export function getJarsPerBatch(guildState: GuildState | undefined): number {
  if (!guildState) return 1;
  return getPressureCannerJars(guildState) + getMassProductionJars(guildState);
}

/** Standard Grade: what committed Engineers' raw crops sell for, as a share of the price */
export function getStandardGradeCropMultiplier(guildState: GuildState | undefined): number {
  return isEngineer(guildState) ? 1 - STANDARD_GRADE_CROP_PENALTY : 1;
}

/** Standard Grade: what committed Engineers' canned goods sell for, as a share of the price */
export function getStandardGradeJarMultiplier(guildState: GuildState | undefined): number {
  return isEngineer(guildState) ? 1 - STANDARD_GRADE_JAR_PENALTY : 1;
}

/** Honey per batch as a share: committed Engineers' bees make 25% less, or 10% less with Sound Dampers */
export function getGuildHoneyMultiplier(guildState: GuildState | undefined): number {
  if (!isEngineer(guildState)) return 1;
  return 1 - (owns(guildState, 'engineers_sound_dampers') ? SOUND_DAMPERS_HONEY_PENALTY : NOISY_MACHINES_HONEY_PENALTY);
}

/** How much time away counts: 8 hours, or 12 with Night Shift */
export function getOfflineCapMs(guildState: GuildState | undefined): number {
  return guildState && owns(guildState, 'engineers_night_shift') ? NIGHT_SHIFT_HOURS * 60 * 60 * 1000 : MAX_OFFLINE_MS;
}

/** The farm upgrade's name: Heirloom Seeds, or GMO Seeds for committed Engineers. The effect is the same */
export function heirloomSeedsName(guildState: GuildState | undefined): string {
  return isEngineer(guildState) ? 'GMO Seeds' : 'Heirloom Seeds';
}

/** Machine work that pays Gears */
export interface GearWork {
  autoHarvests?: number;
  batches?: number;
}

/**
 * Pays committed Engineers their Gears: 1 for every 10 auto harvests and 1 for every 5 canning
 * batches. What's left toward the next Gear carries over in the save. Returns the same state when
 * the player isn't an Engineer or nothing was done.
 */
export function awardGears(guildState: GuildState, work: GearWork): GuildState {
  const harvested = Math.max(0, work.autoHarvests ?? 0);
  const canned = Math.max(0, work.batches ?? 0);
  if (!isEngineer(guildState) || harvested + canned === 0) return guildState;
  const harvests = (guildState.gearProgress?.autoHarvests ?? 0) + harvested;
  const batches = (guildState.gearProgress?.batches ?? 0) + canned;
  const gears = Math.floor(harvests / GEAR_SOURCES.autoHarvests) + Math.floor(batches / GEAR_SOURCES.batches);
  return {
    ...guildState,
    guildCurrencies: { ...guildState.guildCurrencies, engineers: guildState.guildCurrencies.engineers + gears },
    gearProgress: { autoHarvests: harvests % GEAR_SOURCES.autoHarvests, batches: batches % GEAR_SOURCES.batches }
  };
}

// =============================================================================
// MERCHANTS GUILD
// =============================================================================

/** Markup: committed Merchants' crops and canned goods sell for this much more */
export const MARKUP_BONUS = 0.15;

/** No Time to Learn: committed Merchants earn this much less knowledge from harvests and canning */
export const NO_TIME_TO_LEARN_PENALTY = 0.15;

/** Bulk Deals pays on a sale of at least this many crops */
export const BULK_DEAL_MIN_CROPS = 100;

/** Additives: recipes need one fewer of each crop */
export const ADDITIVES_UPGRADE = 'merchants_additives';

/** Whether the player has joined the Merchants */
export function isMerchant(guildState: GuildState | undefined): guildState is GuildState {
  return !!guildState && isCommittedTo(guildState, 'merchants');
}

/**
 * Added crop sale price from the Merchants: Markup for members, Haggling (half strength
 * before joining) and Shrewd Bargaining. 0.15 means +15%.
 */
export function getMerchantsCropPriceBonus(guildState: GuildState): number {
  const markup = isMerchant(guildState) ? MARKUP_BONUS : 0;
  return markup
    + softCappedLevels(guildState, 'merchants_haggling', 'merchants') * rateOf('merchants_haggling')
    + levelEffect(guildState, 'merchants_shrewd_bargaining');
}

/** Added canned goods value from the Merchants: Markup for members, and Price Gouging. 0.15 means +15% */
export function getMerchantsJarValueBonus(guildState: GuildState): number {
  return (isMerchant(guildState) ? MARKUP_BONUS : 0) + levelEffect(guildState, 'merchants_price_gouging');
}

/** Bulk Deals: added money on a sale of 100 crops or more, half strength before joining. 0.1 means +10% */
export function getBulkDealsBonus(guildState: GuildState | undefined): number {
  return guildState ? softCappedLevels(guildState, 'merchants_bulk_deals', 'merchants') * rateOf('merchants_bulk_deals') : 0;
}

/** What a sale of this many crops pays, as a share of their price: more with Bulk Deals on 100 or more */
export function getBulkDealsMultiplier(guildState: GuildState | undefined, crops: number): number {
  return crops >= BULK_DEAL_MIN_CROPS ? 1 + getBulkDealsBonus(guildState) : 1;
}

/** Knowledge from harvests and canning as a share: committed Merchants earn 15% less */
export function getGuildKnowledgeMultiplier(guildState: GuildState | undefined): number {
  return isMerchant(guildState) ? 1 - NO_TIME_TO_LEARN_PENALTY : 1;
}

/** What crop upgrades cost with Wholesale, bought by the player or the auto-buyers: 0.96 means 4% less */
export function getWholesalePriceMultiplier(guildState: GuildState | undefined): number {
  return guildState ? 1 - levelEffect(guildState, 'merchants_wholesale') : 1;
}

/** Days between the Merchant's sales: 30, and 5 fewer per level of Trade Routes */
export function getMerchantDays(guildState: GuildState | undefined): number {
  return MERCHANT_DAYS - (guildState ? levelEffect(guildState, 'merchants_trade_routes') : 0);
}

/** Whether Additives are owned, bought this Legacy or kept from an earlier one */
export function hasAdditives(guildState: GuildState | undefined): boolean {
  return !!guildState && owns(guildState, ADDITIVES_UPGRADE);
}

/** How many of a crop a recipe needs: one fewer with Additives, never fewer than 1 */
export function withAdditives(quantity: number, additives: boolean): number {
  return additives ? Math.max(1, quantity - 1) : quantity;
}

/** Head Hunters: rehiring everyone costs this share of the price */
export const HEAD_HUNTERS_REHIRE_SHARE = 0.5;

/** Hostile Takeover costs this many times the larger farm */
export const HOSTILE_TAKEOVER_PRICE_MULTIPLIER = 10;

/** Golden Parachute: the share of money that carries into the next Legacy */
export const GOLDEN_PARACHUTE_SHARE = 0.1;

/** Ferdinand's Hot Tip: crops and jars sell for this many times their price while it runs */
export const HOT_TIP_MULTIPLIER = 2;

/** Game steps left on the running Hot Tip: 0 when none runs, or for anyone but a Merchant */
export function getHotTipLeft(guildState: GuildState | undefined): number {
  return isMerchant(guildState) ? guildState.ferdinand?.hotTipLeft ?? 0 : 0;
}

/** What sales are worth during a Hot Tip: twice as much */
export function getHotTipMultiplier(guildState: GuildState | undefined): number {
  return getHotTipLeft(guildState) > 0 ? HOT_TIP_MULTIPLIER : 1;
}

/** The guild state without a running Hot Tip, for time away: the tip pays only in live play */
export function withoutHotTip<T extends GuildState | undefined>(guildState: T): T {
  if (!guildState?.ferdinand?.hotTipLeft) return guildState;
  return { ...guildState, ferdinand: { ...guildState.ferdinand, hotTipLeft: 0 } };
}

/** Payroll: committed Merchants lay off and rehire every auto-buyer with one switch */
export function hasPayroll(guildState: GuildState | undefined): boolean {
  return isMerchant(guildState);
}

/** What rehiring everyone costs as a share of the hire prices: half with Head Hunters */
export function getRehirePriceMultiplier(guildState: GuildState | undefined): number {
  return guildState && owns(guildState, 'merchants_head_hunters') ? HEAD_HUNTERS_REHIRE_SHARE : 1;
}

/** Whether Futures has the Merchant sell during time away, bought or kept from a Legacy */
export function hasFutures(guildState: GuildState | undefined): boolean {
  return !!guildState && owns(guildState, 'merchants_futures');
}

/** Whether Hostile Takeover is owned; it stays with the guild at a Legacy */
export function hasHostileTakeover(guildState: GuildState | undefined): boolean {
  return !!guildState && owns(guildState, 'merchants_hostile_takeover');
}

/** What a Hostile Takeover costs: ten times the larger farm */
export function getHostileTakeoverPrice(farmCost: number): number {
  return farmCost * HOSTILE_TAKEOVER_PRICE_MULTIPLIER;
}

/** Counts one more Hostile Takeover, for Corporate Raider */
export function recordTakeover(guildState: GuildState): GuildState {
  return { ...guildState, takeovers: (guildState.takeovers ?? 0) + 1 };
}

/** Whether Golden Parachute is owned, bought or kept from a Legacy */
export function hasGoldenParachute(guildState: GuildState | undefined): boolean {
  return !!guildState && owns(guildState, 'merchants_golden_parachute');
}

/** Money Golden Parachute carries into the next Legacy: a tenth of it */
export function getGoldenParachuteMoney(guildState: GuildState | undefined, money: number): number {
  return hasGoldenParachute(guildState) ? Math.floor(Math.max(0, money) * GOLDEN_PARACHUTE_SHARE) : 0;
}

// =============================================================================
// COMPOSITE FUNCTIONS
// =============================================================================

/**
 * Calculate final sale price with all guild bonuses applied
 * @param basePrice - The base price of the item
 * @param guildState - Current guild state
 * @param applyQualityBonus - Whether to roll for quality grading bonus (use for individual items)
 */
export function applyGuildPriceBonuses(
  basePrice: number, 
  guildState: GuildState,
  applyQualityBonus: boolean = false
): number {
  // Apply percentage bonuses, the Preservers' raw crop penalty and the Engineers' Standard Grade
  const percentBonus = getGuildCropPriceBonus(guildState);
  let price = basePrice * (1 + percentBonus) * getRawCropPriceMultiplier(guildState) * getStandardGradeCropMultiplier(guildState);
  
  // Apply Whispers of the Seed 10x multiplier
  if (hasWhispersOfSeed(guildState)) {
    price *= 10;
  }

  // Ferdinand's Hot Tip doubles it
  price *= getHotTipMultiplier(guildState);
  
  // Apply Quality Grading bonus (random chance per item)
  if (applyQualityBonus) {
    const qualityChance = getQualityGradingChance(guildState);
    if (qualityChance > 0 && Math.random() < qualityChance) {
      price *= getQualityGradingValueBonus();
    }
  }
  
  return price;
}

/** Added crop sale price from every guild: the Growers' and the Merchants'. 0.15 means +15% */
export function getGuildCropPriceBonus(guildState: GuildState): number {
  return getGrowersPriceBonus(guildState) + getMerchantsCropPriceBonus(guildState);
}

/**
 * Calculate total guild growth bonus (as a multiplier, e.g., 1.06 for +6%)
 */
export function getGuildGrowthMultiplier(guildState: GuildState): number {
  const growthBonus = getGrowersGrowthBonus(guildState);
  return 1 + growthBonus;
}

/**
 * Get total bee yield bonus to add from guilds
 */
export function getGuildBeeYieldBonus(guildState: GuildState): number {
  return getGrowersBeePollinationBonus(guildState);
}

// =============================================================================
// GUILD TOKENS
// =============================================================================

/**
 * Adds Guild Tokens for work done before committing to a guild. Sources that pay
 * every few actions keep the remainder, so the count carries over between calls.
 * Returns the same state when nothing is earned: guilds still locked, or already committed.
 */
export function awardGuildTokens(
  guildState: GuildState,
  source: GuildTokenSource,
  count: number,
  farmTier: number
): GuildState {
  if (count <= 0 || farmTier < GUILDS_UNLOCK_TIER || guildState.committedGuild !== null) {
    return guildState;
  }
  const { tokens, every } = GUILD_TOKEN_SOURCES[source];
  if (every <= 1) {
    return { ...guildState, guildTokens: guildState.guildTokens + tokens * count };
  }
  const progress = (guildState.tokenProgress?.[source] ?? 0) + count;
  return {
    ...guildState,
    guildTokens: guildState.guildTokens + tokens * Math.floor(progress / every),
    tokenProgress: { ...guildState.tokenProgress, [source]: progress % every }
  };
}
