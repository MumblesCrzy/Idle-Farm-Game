import type { Veggie } from '../types/game';
import type { WeatherType } from '../config/gameConstants';
import { getVeggieGrowthBonus } from './gameCalculations';
import { RAIN_CHANCES, DROUGHT_CHANCES, STORM_CHANCES } from '../config/gameConstants';

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
 * @returns Object with updated veggies array and whether any updates occurred
 */
export function processVeggieGrowth(
  veggies: Veggie[],
  season: string,
  currentWeather: string,
  greenhouseOwned: boolean,
  irrigationOwned: boolean
): { veggies: Veggie[]; needsUpdate: boolean } {
  let needsUpdate = false;
  
  const newVeggies = veggies.map((v) => {
    if (!v.unlocked || v.growth >= 100) return v;
    
    const growthAmount = getVeggieGrowthBonus(v, season, currentWeather, greenhouseOwned, irrigationOwned);
    const newGrowth = Math.min(100, v.growth + growthAmount);
    
    if (newGrowth !== v.growth) {
      needsUpdate = true;
      return { ...v, growth: newGrowth };
    }
    return v;
  });
  
  return { veggies: needsUpdate ? newVeggies : veggies, needsUpdate };
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
  knowledge: number
): {
  veggies: Veggie[];
  experienceGain: number;
  knowledgeGain: number;
  needsUpdate: boolean;
} {
  let needsUpdate = false;
  let totalExperienceGain = 0;
  let totalKnowledgeGain = 0;
  
  const newVeggies = veggies.map((v) => {
    if (!v.harvesterOwned) return v;
    
    const speedMultiplier = 1 + (v.harvesterSpeedLevel ?? 0) * 0.05;
    const timerMax = Math.max(1, Math.round(50 / speedMultiplier));
    let newV = v;

    // If timer is primed and veggie is ready, harvest immediately
    if (v.harvesterTimer >= timerMax && v.growth >= 100) {
      const harvestAmount = 1 + (v.additionalPlotLevel || 0);
      const almanacMultiplier = 1 + (almanacLevel * 0.10);
      const knowledgeGain = 0.5; // Auto harvest knowledge gain
      
      // Calculate experience gain for this harvest
      const experienceGain = (harvestAmount * 0.5) + (knowledge * 0.01 * 0.5);
      totalExperienceGain += experienceGain;
      totalKnowledgeGain += knowledgeGain * almanacMultiplier + (1.25 * (farmTier - 1));
      
      // Perform the harvest
      newV = {
        ...v,
        stash: v.stash + harvestAmount,
        growth: 0,
        harvesterTimer: 0
      };
      
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
    needsUpdate
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
  const newVeggies = [...veggies];
  let highestUnlockedIndex = -1;
  
  let totalPlotsUsed = newVeggies.filter(vg => vg.unlocked).length +
    newVeggies.reduce((sum, vg) => sum + (vg.additionalPlotLevel || 0), 0);

  // Check for unlocks
  newVeggies.forEach((veg, idx) => {
    if (!veg.unlocked && experience >= veg.experienceToUnlock && totalPlotsUsed < maxPlots) {
      newVeggies[idx] = { ...veg, unlocked: true };
      totalPlotsUsed++;
      highestUnlockedIndex = Math.max(highestUnlockedIndex, idx);
    }
  });
  
  return { veggies: newVeggies, highestUnlockedIndex };
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
