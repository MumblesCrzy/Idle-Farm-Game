/**
 * Harvest Calculations Module
 * 
 * Unified harvest logic extracted from App.tsx and gameLoopProcessors.ts
 * Provides pure functions for calculating harvest amounts, experience, and knowledge gains
 */

import { AUTO_HARVEST_EXPERIENCE_MULTIPLIER, AUTO_HARVEST_KNOWLEDGE_MULTIPLIER } from '../config/gameConstants';

/**
 * Calculates the base harvest amount for a veggie
 */
export function calculateHarvestAmount(
  additionalPlotLevel: number,
  season: string,
  permanentBonuses: string[],
  beeYieldBonus: number
): number {
  let harvestAmount = 1 + (additionalPlotLevel || 0);
  
  // Apply Frost Fertilizer bonus: +5% yield during winter if achievement unlocked
  if (season === 'Winter' && permanentBonuses.includes('frost_fertilizer')) {
    harvestAmount = Math.ceil(harvestAmount * 1.05);
  }
  
  // Apply bee yield bonus from bee boxes and Meadow Magic upgrades
  if (beeYieldBonus > 0) {
    harvestAmount = Math.ceil(harvestAmount * (1 + beeYieldBonus));
  }
  
  return harvestAmount;
}

/**
 * Calculates experience gain from a harvest
 */
export function calculateExperienceGain(
  harvestAmount: number,
  knowledge: number,
  isAutoHarvest: boolean
): number {
  if (isAutoHarvest) {
    return (harvestAmount * AUTO_HARVEST_EXPERIENCE_MULTIPLIER) + (knowledge * 0.01 * AUTO_HARVEST_EXPERIENCE_MULTIPLIER);
  } else {
    return harvestAmount + (knowledge * 0.01);
  }
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
  isAutoHarvest: boolean
): HarvestResult {
  const harvestAmount = calculateHarvestAmount(
    additionalPlotLevel,
    season,
    permanentBonuses,
    beeYieldBonus
  );
  
  const experienceGain = calculateExperienceGain(
    harvestAmount,
    knowledge,
    isAutoHarvest
  );
  
  const knowledgeGain = calculateKnowledgeGain(
    almanacLevel,
    farmTier,
    isAutoHarvest
  );
  
  return {
    harvestAmount,
    experienceGain,
    knowledgeGain
  };
}
