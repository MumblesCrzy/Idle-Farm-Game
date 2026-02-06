import { SEASON_BONUS, veggieSeasonBonuses, COST_CONFIGS } from '../config/gameConstants';
import type { Veggie, AutoPurchaseType, CurrencyType, AutoPurchaseConfig } from '../types/game';
import { VEGGIE_CONFIGS, type VeggieConfig } from '../data/veggieConfigs';
import { FRUIT_CONFIGS, calculateFruitExpRequirement, type FruitConfig } from '../data/fruitConfigs';
import type { GuildState } from '../types/guilds';
import { getGuildGrowthMultiplier, getFertilizerEffectivenessMultiplier } from './guildCalculations';

/**
 * Formats a number with K, M, B, T, Q suffixes for large values
 * @param num - The number to format
 * @param decimalPlaces - Number of decimal places to show (default: 1)
 * @returns Formatted string representation of the number
 */
export function formatNumber(num: number, decimalPlaces: number = 1): string {
  // Handle undefined, null, or NaN
  if (num === undefined || num === null || isNaN(num)) {
    return '0';
  }
  
  // Ensure num is actually a number
  const numValue = Number(num);
  if (isNaN(numValue)) {
    return '0';
  }
  
  if (numValue < 1000) {
    const fixed = numValue.toFixed(decimalPlaces === 0 ? 0 : Math.min(decimalPlaces, 2));
    // Only remove trailing zeros after a decimal point
    return fixed.includes('.') ? fixed.replace(/\.?0+$/, '') : fixed;
  }
  
  const units = ['', 'K', 'M', 'B', 'T', 'Q'];
  let unitIndex = 0;
  let value = numValue;
  
  while (value >= 1000 && unitIndex < units.length - 1) {
    value /= 1000;
    unitIndex++;
  }
  
  // For values >= 1000, always show at least 1 decimal place unless it's a whole number
  const formatted = value.toFixed(decimalPlaces);
  return `${formatted.replace(/\.?0+$/, '')}${units[unitIndex]}`;
}

/**
 * Calculates the effective growth rate per tick for a vegetable, accounting for all bonuses and penalties
 * @param v - The vegetable to calculate growth for
 * @param season - Current season (Spring, Summer, Fall, Winter)
 * @param currentWeather - Current weather condition
 * @param greenhouseOwned - Whether the player owns a greenhouse
 * @param irrigationOwned - Whether the player owns irrigation
 * @param guildState - Optional guild state for guild-based bonuses
 * @returns The modified growth rate per tick
 */
export function getVeggieGrowthBonus(
  v: Veggie,
  season: string,
  currentWeather: string,
  greenhouseOwned: boolean,
  irrigationOwned: boolean,
  guildState?: GuildState
): number {
  let growthAmount = v.growthRate;
  
  // Fertilizer bonus - 5% multiplicative increase per level
  // Verdant Glyphs (Guild) boosts fertilizer effectiveness by 25%
  const fertilizerBoostMultiplier = guildState ? getFertilizerEffectivenessMultiplier(guildState) : 1;
  const effectiveFertilizerBonus = v.fertilizerLevel * 0.05 * fertilizerBoostMultiplier;
  growthAmount *= (1 + effectiveFertilizerBonus);
  
  // Guild growth bonuses (Fertile Soil, Advanced Fertilizer Research)
  if (guildState) {
    growthAmount *= getGuildGrowthMultiplier(guildState);
  }
  
  // Season bonus
  const bonusSeasons = veggieSeasonBonuses[v.name] || [];
  if (bonusSeasons.includes(season)) {
    growthAmount += SEASON_BONUS;
  }
  // Weather effects
  if (season === 'Winter' && !greenhouseOwned) {
    growthAmount *= 0.1; // 90% penalty in winter unless greenhouse owned
  }
  // Drought penalty (unless irrigation)
  if (currentWeather === 'Drought' && !irrigationOwned) {
    growthAmount *= 0.5; // 50% penalty
  }
  // Irrigation water efficiency bonus (always active when owned)
  if (irrigationOwned) {
    growthAmount *= 1.15; // 15% growth bonus
  }
  // Rain bonus
  if (currentWeather === 'Rain') {
    growthAmount *= 1.2; // 20% bonus
  }
  // Storm bonus
  if (currentWeather === 'Storm') {
    growthAmount *= 1.1; // 10% bonus
  }
  // Heatwave penalty
  if (currentWeather === 'Heatwave') {
    if (season === 'Summer') {
      growthAmount *= 0.7; // 30% penalty
    } else if (season === 'Spring' || season === 'Fall') {
      veggieSeasonBonuses[v.name].includes('Summer') ? growthAmount *= 1.1 : growthAmount *= 0.7; // 10% bonus for summer veggies, else 30% penalty
    } else {
      growthAmount *= 1.2; // 20% bonus in winter
    }
  }
  if (currentWeather === 'Snow' && !greenhouseOwned) {
    growthAmount *= 0.0; // 100% penalty
  }
  return Math.max(growthAmount, 0.01);
}

/**
 * Calculates the experience required to unlock a vegetable
 * @param index - The vegetable index (0-based)
 * @returns The experience required to unlock
 */
export const calculateExpRequirement = (index: number): number => {
  if (index === 0) return 0; // First veggie is free
  return Math.floor(50 * Math.pow(1.9, index));
};

/**
 * Calculates the initial cost for a new auto-purchaser
 * @param type - The type of cost config to use
 * @param index - The vegetable index
 * @returns The initial cost
 */
export const calculateInitialCost = (type: keyof typeof COST_CONFIGS, index: number): number => {
  const config = COST_CONFIGS[type];
  const baseMultiplier = index === 0 ? config.firstVeggieDiscount : 1;
  return Math.floor(config.baseValue * baseMultiplier * Math.pow(config.scalingFactor, index));
};

/**
 * Calculates the cost of an upgrade based on current level
 * @param type - The type of cost config to use
 * @param currentLevel - The current level of the upgrade
 * @param baseCost - The base cost for this upgrade
 * @returns The cost for the next level
 */
export const calculateUpgradeCost = (type: keyof typeof COST_CONFIGS, currentLevel: number, baseCost: number): number => {
  const config = COST_CONFIGS[type];
  return Math.ceil(baseCost * Math.pow(config.levelScalingFactor, currentLevel) + 5 * currentLevel);
};

/**
 * Gets the cost for a specific auto-purchase type on a vegetable
 * @param veggie - The vegetable to check
 * @param purchaseType - The type of auto-purchase
 * @returns The cost for that purchase type
 */
export const getAutoPurchaseCost = (veggie: Veggie, purchaseType: AutoPurchaseType): number => {
  switch (purchaseType) {
    case 'fertilizer':
      return veggie.fertilizerCost;
    case 'betterSeeds':
      return veggie.betterSeedsCost;
    case 'harvesterSpeed':
      return veggie.harvesterSpeedCost || 0;
    case 'additionalPlot':
      return veggie.additionalPlotCost;
    default:
      return 0;
  }
};

/**
 * Checks if a purchase can be made based on available currency and constraints
 * @param veggie - The vegetable to purchase for
 * @param purchaseType - The type of purchase
 * @param money - Current money amount
 * @param knowledge - Current knowledge amount
 * @param currencyType - Whether purchase uses money or knowledge (default: money)
 * @param veggies - Optional: All veggies array (needed for additionalPlot check)
 * @param maxPlots - Optional: Maximum plots available (needed for additionalPlot check)
 * @returns Whether the purchase can be made
 */
export const canMakePurchase = (
  veggie: Veggie, 
  purchaseType: AutoPurchaseType, 
  money: number, 
  knowledge: number,
  currencyType: CurrencyType = 'money',
  veggies?: Veggie[],
  maxPlots?: number
): boolean => {
  const cost = getAutoPurchaseCost(veggie, purchaseType);
  const currency = currencyType === 'money' ? money : knowledge;
  
  switch (purchaseType) {
    case 'fertilizer':
      return currency >= cost && veggie.fertilizerLevel < veggie.fertilizerMaxLevel;
    case 'betterSeeds':
      return currency >= cost;
    case 'harvesterSpeed':
      return currency >= cost;
    case 'additionalPlot':
      if (!veggies || maxPlots === undefined) return currency >= cost;
      // Check if we're already at max plots
      const totalPlotsUsed = veggies.filter(v => v.unlocked).length + veggies.reduce((sum, v) => sum + (v.additionalPlotLevel || 0), 0);
      return currency >= cost && totalPlotsUsed < maxPlots;

    default:
      return false;
  }
};

/**
 * Gets the current season based on day count
 * @param day - Current day number (1-365)
 * @returns The current season name
 */
export const getSeason = (day: number): string => {
  if (day >= 1 && day < 80) return 'Spring';
  if (day >= 80 && day < 172) return 'Summer';
  if (day >= 172 && day < 265) return 'Fall';
  return 'Winter';
};

/**
 * Creates the initial auto-purchaser configuration array for a vegetable
 * @param assistantCost - Cost for the Assistant auto-purchaser
 * @param cultivatorCost - Cost for the Cultivator auto-purchaser
 * @param surveyorCost - Cost for the Surveyor auto-purchaser
 * @param mechanicCost - Cost for the Mechanic auto-purchaser
 * @returns Array of auto-purchaser configurations
 */
export const createAutoPurchaserConfigs = (
  assistantCost: number, 
  cultivatorCost: number, 
  surveyorCost: number, 
  mechanicCost: number
): AutoPurchaseConfig[] => [
  {
    id: 'assistant',
    name: 'Assistant',
    purchaseType: 'fertilizer',
    currencyType: 'money',
    cycleDays: 7,
    owned: false,
    active: false,
    cost: assistantCost,
    timer: 0
  },
  {
    id: 'cultivator',
    name: 'Cultivator',
    purchaseType: 'betterSeeds',
    currencyType: 'knowledge',
    cycleDays: 7,
    owned: false,
    active: false,
    cost: cultivatorCost,
    timer: 0
  },
  {
    id: 'surveyor',
    name: 'Surveyor',
    purchaseType: 'additionalPlot',
    currencyType: 'money',
    cycleDays: 30,
    owned: false,
    active: false,
    cost: surveyorCost,
    timer: 0
  },
  {
    id: 'mechanic',
    name: 'Mechanic',
    purchaseType: 'harvesterSpeed',
    currencyType: 'money',
    cycleDays: 15,
    owned: false,
    active: false,
    cost: mechanicCost,
    timer: 0
  }
];

/**
 * Creates a complete Veggie object from configuration data
 * This factory function reduces code duplication by generating veggies from a config array
 * @param config - The veggie configuration object
 * @returns A fully initialized Veggie object
 */
export const createVeggieFromConfig = (config: VeggieConfig): Veggie => {
  // Helper to get cost value (either direct number or calculated)
  const getCost = (
    cost: number | 'calculated',
    upgradeType: 'fertilizer' | 'harvester' | 'betterSeeds' | 'harvesterSpeed' | 'additionalPlot'
  ): number => {
    return cost === 'calculated' ? calculateInitialCost(upgradeType, config.unlockIndex) : cost;
  };

  return {
    name: config.name,
    growth: 0,
    growthRate: config.growthRate,
    stash: 0,
    unlocked: config.unlocked,
    experience: 0,
    experienceToUnlock: calculateExpRequirement(config.unlockIndex),
    cropType: 'vegetable',
    fertilizerLevel: 0,
    fertilizerCost: getCost(config.initialFertilizerCost, 'fertilizer'),
    harvesterOwned: false,
    harvesterCost: getCost(config.initialHarvesterCost, 'harvester'),
    harvesterTimer: 0,
    autoHarvesterEnabled: true,
    salePrice: config.salePrice,
    betterSeedsLevel: 0,
    betterSeedsCost: getCost(config.initialBetterSeedsCost, 'betterSeeds'),
    harvesterSpeedLevel: 0,
    harvesterSpeedCost: config.initialHarvesterSpeedCost,
    additionalPlotLevel: 0,
    additionalPlotCost: config.initialAdditionalPlotCost,
    fertilizerMaxLevel: config.fertilizerMaxLevel,
    autoPurchasers: createAutoPurchaserConfigs(
      config.autoPurchaserCosts[0],
      config.autoPurchaserCosts[1],
      config.autoPurchaserCosts[2],
      config.autoPurchaserCosts[3]
    ),
    sellEnabled: true
  };
};

/**
 * Creates the initial veggies array from VEGGIE_CONFIGS
 * This replaces the hardcoded initialVeggies array in App.tsx
 * @returns Array of initialized Veggie objects
 */
export const createInitialVeggies = (): Veggie[] => {
  return VEGGIE_CONFIGS.map(config => createVeggieFromConfig(config));
};

/**
 * Creates a complete Veggie object from a fruit configuration
 * Fruits use the same Veggie type but have different scaling
 * @param config - The fruit configuration object
 * @returns A fully initialized Veggie object for the fruit
 */
export const createFruitFromConfig = (config: FruitConfig): Veggie => {
  return {
    name: config.name,
    growth: 0,
    growthRate: config.growthRate,
    stash: 0,
    unlocked: config.unlocked,
    experience: 0,
    experienceToUnlock: calculateFruitExpRequirement(config.unlockIndex),
    cropType: 'fruit',
    fertilizerLevel: 0,
    fertilizerCost: config.initialFertilizerCost,
    harvesterOwned: false,
    harvesterCost: config.initialHarvesterCost,
    harvesterTimer: 0,
    autoHarvesterEnabled: true,
    salePrice: config.salePrice,
    betterSeedsLevel: 0,
    betterSeedsCost: config.initialBetterSeedsCost,
    harvesterSpeedLevel: 0,
    harvesterSpeedCost: config.initialHarvesterSpeedCost,
    additionalPlotLevel: 0,
    additionalPlotCost: config.initialAdditionalPlotCost,
    fertilizerMaxLevel: config.fertilizerMaxLevel,
    autoPurchasers: createAutoPurchaserConfigs(
      config.autoPurchaserCosts[0],
      config.autoPurchaserCosts[1],
      config.autoPurchaserCosts[2],
      config.autoPurchaserCosts[3]
    ),
    sellEnabled: true
  };
};

/**
 * Creates the initial fruits array from FRUIT_CONFIGS
 * Fruits are unlocked via the Growers Guild "Fruit Cultivation" upgrade
 * @returns Array of initialized Veggie objects for fruits
 */
export const createInitialFruits = (): Veggie[] => {
  return FRUIT_CONFIGS.map(config => createFruitFromConfig(config));
};
