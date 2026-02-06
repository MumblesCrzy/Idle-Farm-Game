/**
 * Harvest Calculations Module
 * 
 * Unified harvest logic extracted from App.tsx and gameLoopProcessors.ts
 * Provides pure functions for calculating harvest amounts, experience, and knowledge gains
 */

import { AUTO_HARVEST_EXPERIENCE_MULTIPLIER, AUTO_HARVEST_KNOWLEDGE_MULTIPLIER } from '../config/gameConstants';
import type { GuildState } from '../types/guilds';
import { getGrowersManualHarvestBonus, getBlessedCropChance, getQualityGradingExpBonus, getGuildBeeYieldBonus } from './guildCalculations';

/**
 * Result of harvest amount calculation
 */
export interface HarvestAmountResult {
  amount: number;
  blessedCropTriggered: boolean;
}

/**
 * Calculates the base harvest amount for a veggie
 */
export function calculateHarvestAmount(
  additionalPlotLevel: number,
  season: string,
  permanentBonuses: string[],
  beeYieldBonus: number,
  isAutoHarvest: boolean = false,
  guildState?: GuildState
): HarvestAmountResult {
  let harvestAmount = 1 + (additionalPlotLevel || 0);
  let blessedCropTriggered = false;
  
  // Apply Growers Guild manual harvest bonus (+1 for committed Growers on manual harvest)
  if (!isAutoHarvest && guildState) {
    harvestAmount += getGrowersManualHarvestBonus(guildState);
  }
  
  // Apply Frost Fertilizer bonus: +5% yield during winter if achievement unlocked
  if (season === 'Winter' && permanentBonuses.includes('frost_fertilizer')) {
    harvestAmount = Math.ceil(harvestAmount * 1.05);
  }
  
  // Apply bee yield bonus from bee boxes and Meadow Magic upgrades
  // Plus guild bee synergy bonus
  let totalBeeBonus = beeYieldBonus;
  if (guildState) {
    totalBeeBonus += getGuildBeeYieldBonus(guildState);
  }
  if (totalBeeBonus > 0) {
    harvestAmount = Math.ceil(harvestAmount * (1 + totalBeeBonus));
  }
  
  // Apply Blessed Crop chance (Soilbound Pact) - chance for double yield
  // This triggers on manual harvest OR when soilbound pact causes self-harvest
  if (!isAutoHarvest && guildState) {
    const blessedChance = getBlessedCropChance(guildState);
    if (blessedChance > 0 && Math.random() < blessedChance) {
      harvestAmount *= 2;
      blessedCropTriggered = true;
    }
  }
  
  return { amount: harvestAmount, blessedCropTriggered };
}

/**
 * Calculates experience gain from a harvest
 */
export function calculateExperienceGain(
  harvestAmount: number,
  knowledge: number,
  isAutoHarvest: boolean,
  guildState?: GuildState
): number {
  let baseExp: number;
  if (isAutoHarvest) {
    baseExp = (harvestAmount * AUTO_HARVEST_EXPERIENCE_MULTIPLIER) + (knowledge * 0.01 * AUTO_HARVEST_EXPERIENCE_MULTIPLIER);
  } else {
    baseExp = harvestAmount + (knowledge * 0.01);
  }
  
  // Apply Quality Grading experience bonus from Growers Guild
  if (guildState) {
    const expBonus = getQualityGradingExpBonus(guildState);
    baseExp *= (1 + expBonus);
  }
  
  return baseExp;
}

/**
 * Calculates knowledge gain from a harvest
 */
export function calculateKnowledgeGain(
  almanacLevel: number,
  farmTier: number,
  isAutoHarvest: boolean
): number {
  const almanacMultiplier = 1 + (almanacLevel * 0.10);
  const baseKnowledgeGain = isAutoHarvest ? AUTO_HARVEST_KNOWLEDGE_MULTIPLIER : 1;
  
  return baseKnowledgeGain * almanacMultiplier + (1.25 * (farmTier - 1));
}

/**
 * Complete harvest calculation result
 */
export interface HarvestResult {
  harvestAmount: number;
  experienceGain: number;
  knowledgeGain: number;
  /** Whether a blessed crop event triggered (Soilbound Pact double yield) */
  blessedCropTriggered: boolean;
}

/**
 * Calculates all harvest-related values in one call
 * Pure function with no side effects
 */
export function calculateHarvestRewards(
  additionalPlotLevel: number,
  season: string,
  permanentBonuses: string[],
  beeYieldBonus: number,
  almanacLevel: number,
  farmTier: number,
  knowledge: number,
  isAutoHarvest: boolean,
  guildState?: GuildState
): HarvestResult {
  const harvestResult = calculateHarvestAmount(
    additionalPlotLevel,
    season,
    permanentBonuses,
    beeYieldBonus,
    isAutoHarvest,
    guildState
  );
  
  const experienceGain = calculateExperienceGain(
    harvestResult.amount,
    knowledge,
    isAutoHarvest,
    guildState
  );
  
  const knowledgeGain = calculateKnowledgeGain(
    almanacLevel,
    farmTier,
    isAutoHarvest
  );
  
  return {
    harvestAmount: harvestResult.amount,
    experienceGain,
    knowledgeGain,
    blessedCropTriggered: harvestResult.blessedCropTriggered
  };
}
