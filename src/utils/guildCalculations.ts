/**
 * Guild bonus calculation utilities
 * Calculates all bonuses and penalties from guild upgrades
 */
import type { GuildState, GuildTokenSource, GuildType, GuildUpgrade } from '../types/guilds';
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
  return guildState && owns(guildState, 'preservers_trusted_apprentice') ? 2 : 10;
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
 * canning penalty, and the Preservers' bonuses, which add together: value upgrades,
 * Recipe Mastery and, on honey recipes, Honey Glaze.
 */
export function getRecipeValueMultiplier(
  guildState: GuildState | undefined,
  recipe: { honeyRequirement?: unknown; timesCompleted: number }
): number {
  if (!guildState) return 1;
  const honey = recipe.honeyRequirement ? getHoneyGlazeBonus(guildState) : 0;
  const bonus = getPreserversValueBonus(guildState) + getRecipeMasteryBonus(guildState, recipe.timesCompleted) + honey;
  return getGrowerCanningProfitMultiplier(guildState) * (1 + bonus);
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
  // Apply percentage bonuses, and the Preservers' raw crop penalty
  const percentBonus = getGrowersPriceBonus(guildState);
  let price = basePrice * (1 + percentBonus) * getRawCropPriceMultiplier(guildState);
  
  // Apply Whispers of the Seed 10x multiplier
  if (hasWhispersOfSeed(guildState)) {
    price *= 10;
  }
  
  // Apply Quality Grading bonus (random chance per item)
  if (applyQualityBonus) {
    const qualityChance = getQualityGradingChance(guildState);
    if (qualityChance > 0 && Math.random() < qualityChance) {
      price *= getQualityGradingValueBonus();
    }
  }
  
  return price;
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
