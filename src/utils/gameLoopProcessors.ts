import type { Veggie } from '../types/game';
import type { WeatherType } from '../config/gameConstants';
import { getVeggieGrowthBonus } from './gameCalculations';
import { RAIN_CHANCES, DROUGHT_CHANCES, STORM_CHANCES } from '../config/gameConstants';
import { processUnlocks } from './unlockSystem';

/**
 * Calculates new weather based on season and random chance
 * @param season - Current season name
 * @param currentWeather - Current weather conditions
 * @returns New weather type (or current if no change)
 */
export function calculateWeatherChange(season: string, currentWeather: WeatherType): WeatherType {
  // Only calculate new weather if currently clear
  if (currentWeather !== 'Clear') {
    return currentWeather;
  }
  
  const rainChance = RAIN_CHANCES[season] ?? 0.2;
  const droughtChance = DROUGHT_CHANCES[season] ?? 0.03;
  const stormChance = STORM_CHANCES[season] ?? 0.03;
  const heatwaveChance = 0.01;
  
  const roll = Math.random();
  let newWeather: WeatherType = 'Clear';
  
  if (roll < rainChance) {
    newWeather = season === 'Winter' ? 'Snow' : 'Rain';
  } else if (roll < rainChance + droughtChance) {
    newWeather = 'Drought';
  } else if (roll < rainChance + droughtChance + stormChance) {
    newWeather = 'Storm';
  } else if (roll < rainChance + droughtChance + stormChance + heatwaveChance) {
    newWeather = 'Heatwave';
  }
  
  return newWeather;
}

/**
 * Processes growth for all unlocked vegetables
 * @param veggies - Current array of vegetables
 * @param season - Current season
 * @param currentWeather - Current weather conditions
 * @param greenhouseOwned - Whether greenhouse upgrade is owned
 * @param irrigationOwned - Whether irrigation upgrade is owned
 * @returns Object with updated veggies array, whether any updates occurred, and array of completed veggies
 */
export function processVeggieGrowth(
  veggies: Veggie[],
  season: string,
  currentWeather: string,
  greenhouseOwned: boolean,
  irrigationOwned: boolean
): { veggies: Veggie[]; needsUpdate: boolean; completedGrowth: Array<{ veggie: Veggie; growthBonus: number }> } {
  let needsUpdate = false;
  const completedGrowth: Array<{ veggie: Veggie; growthBonus: number }> = [];
  
  const newVeggies = veggies.map((v) => {
    if (!v.unlocked || v.growth >= 100) return v;
    
    const growthAmount = getVeggieGrowthBonus(v, season, currentWeather, greenhouseOwned, irrigationOwned);
    const newGrowth = Math.min(100, v.growth + growthAmount);
    
    if (newGrowth !== v.growth) {
      needsUpdate = true;
      const updatedVeggie = { ...v, growth: newGrowth };
      
      // Track when a veggie completes growth (reaches 100%)
      if (v.growth < 100 && newGrowth >= 100) {
        completedGrowth.push({ veggie: updatedVeggie, growthBonus: growthAmount });
      }
      
      return updatedVeggie;
    }
    return v;
  });
  
  return { veggies: needsUpdate ? newVeggies : veggies, needsUpdate, completedGrowth };
}

/**
 * Processes auto-harvester timers and performs harvests when ready
 * @param veggies - Current array of vegetables
 * @param almanacLevel - Current almanac upgrade level
 * @param farmTier - Current farm tier
 * @param knowledge - Current knowledge amount
 * @returns Object with updated veggies, experience gain, knowledge gain, and update flag
 */
export function processAutoHarvest(
  veggies: Veggie[],
  almanacLevel: number,
  farmTier: number,
  knowledge: number,
  beeYieldBonus: number = 0,
  season: string = '',
  permanentBonuses: string[] = []
): {
  veggies: Veggie[];
  experienceGain: number;
  knowledgeGain: number;
  needsUpdate: boolean;
  harvestedVeggies: Array<{ veggie: Veggie; amount: number; expGain: number; knGain: number }>;
} {
  let needsUpdate = false;
  let totalExperienceGain = 0;
  let totalKnowledgeGain = 0;
  const harvestedVeggies: Array<{ veggie: Veggie; amount: number; expGain: number; knGain: number }> = [];
  
  const newVeggies = veggies.map((v) => {
    if (!v.harvesterOwned) return v;
    
    const speedMultiplier = 1 + (v.harvesterSpeedLevel ?? 0) * 0.05;
    const timerMax = Math.max(1, Math.round(50 / speedMultiplier));
    let newV = v;

    // If timer is primed and veggie is ready, harvest immediately
    if (v.harvesterTimer >= timerMax && v.growth >= 100) {
      let harvestAmount = 1 + (v.additionalPlotLevel || 0);
      
      // Apply Frost Fertilizer bonus: +5% yield during winter if achievement unlocked
      if (season === 'Winter' && permanentBonuses.includes('frost_fertilizer')) {
        harvestAmount = Math.ceil(harvestAmount * 1.05);
      }
      
      // Apply bee yield bonus from bee boxes and Meadow Magic upgrades
      if (beeYieldBonus > 0) {
        harvestAmount = Math.ceil(harvestAmount * (1 + beeYieldBonus));
      }
      
      const almanacMultiplier = 1 + (almanacLevel * 0.10);
      const knowledgeGain = 0.5; // Auto harvest knowledge gain
      
      // Calculate experience gain for this harvest
      const experienceGain = (harvestAmount * 0.5) + (knowledge * 0.01 * 0.5);
      const totalKnGain = knowledgeGain * almanacMultiplier + (1.25 * (farmTier - 1));
      
      totalExperienceGain += experienceGain;
      totalKnowledgeGain += totalKnGain;
      
      // Perform the harvest
      newV = {
        ...v,
        stash: v.stash + harvestAmount,
        growth: 0,
        harvesterTimer: 0
      };
      
      // Track this harvest for logging
      harvestedVeggies.push({
        veggie: v,
        amount: harvestAmount,
        expGain: experienceGain,
        knGain: totalKnGain
      });
      
      needsUpdate = true;
    } 
    // If timer is primed but veggie is not ready, keep timer at max
    else if (v.harvesterTimer >= timerMax && v.growth < 100) {
      if (v.harvesterTimer !== timerMax) {
        needsUpdate = true;
        newV = { ...v, harvesterTimer: timerMax };
      }
    }
    // If timer is not primed, increment
    else if (v.harvesterTimer < timerMax) {
      needsUpdate = true;
      newV = { ...v, harvesterTimer: v.harvesterTimer + 1 };
    }

    return newV;
  });
  
  return {
    veggies: needsUpdate ? newVeggies : veggies,
    experienceGain: totalExperienceGain,
    knowledgeGain: totalKnowledgeGain,
    needsUpdate,
    harvestedVeggies
  };
}

/**
 * Checks and unlocks vegetables based on experience threshold
 * @param veggies - Current array of vegetables
 * @param experience - Current experience amount
 * @param maxPlots - Maximum plots available
 * @returns Object with updated veggies and highest unlocked index
 */
export function processVeggieUnlocks(
  veggies: Veggie[],
  experience: number,
  maxPlots: number
): {
  veggies: Veggie[];
  highestUnlockedIndex: number;
} {
  const result = processUnlocks(veggies, experience, maxPlots);
  return {
    veggies: result.veggies,
    highestUnlockedIndex: result.highestUnlockedIndex
  };
}

/**
 * Processes auto-sell for merchant upgrade
 * @param veggies - Current array of vegetables
 * @returns Object with updated veggies (sell flags reset) and total money gained
 */
export function processAutoSell(veggies: Veggie[]): {
  veggies: Veggie[];
  moneyGained: number;
} {
  let totalMoneyGained = 0;
  
  const newVeggies = veggies.map((v) => {
    if (v.sellEnabled && v.stash > 0) {
      const saleValue = v.stash * v.salePrice;
      totalMoneyGained += saleValue;
      return { ...v, stash: 0 };
    }
    return v;
  });
  
  return { veggies: newVeggies, moneyGained: totalMoneyGained };
}
