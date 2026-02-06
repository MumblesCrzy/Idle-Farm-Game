/**
 * Guild bonus calculation utilities
 * Calculates all bonuses and penalties from guild upgrades
 */
import type { GuildState } from '../types/guilds';

/** Soft cap multiplier for pre-commitment upgrades (50% effectiveness) */
const PRE_COMMITMENT_SOFT_CAP = 0.5;

/**
 * Helper to get the level of a specific upgrade from guild state
 */
export function getUpgradeLevel(guildState: GuildState, upgradeId: string): number {
  // Check if upgrade is purchased
  if (!guildState.purchasedUpgrades.includes(upgradeId)) {
    return 0;
  }
  // Get level from upgradeLevels, default to 1 for one-time purchases
  return guildState.upgradeLevels[upgradeId] ?? 1;
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
  const fertileSoilLevel = getUpgradeLevel(guildState, 'growers_fertile_soil');
  const advancedFertilizerLevel = getUpgradeLevel(guildState, 'growers_advanced_fertilizer');
  
  // Get soft cap multiplier for Tier 1 sampling upgrade
  const softCap = getSoftCapMultiplier(guildState, 'growers');
  
  // Fertile Soil: +3% per level (Tier 1 - subject to soft cap)
  // Advanced Fertilizer Research: +2% per level (Tier 2 - no soft cap, commitment required)
  return (fertileSoilLevel * 0.03 * softCap) + (advancedFertilizerLevel * 0.02);
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
  const greenThumbLevel = getUpgradeLevel(guildState, 'growers_green_thumb');
  const selectiveBreedingLevel = getUpgradeLevel(guildState, 'growers_selective_breeding');
  
  // Get soft cap multiplier for Tier 1 sampling upgrade
  const softCap = getSoftCapMultiplier(guildState, 'growers');
  
  // Green Thumb: +2% per level (Tier 1 - subject to soft cap)
  // Selective Breeding: +3% per level (Tier 2 - no soft cap, commitment required)
  return (greenThumbLevel * 0.02 * softCap) + (selectiveBreedingLevel * 0.03);
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
  // Apply percentage bonuses
  const percentBonus = getGrowersPriceBonus(guildState);
  let price = basePrice * (1 + percentBonus);
  
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
