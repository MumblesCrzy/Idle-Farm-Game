import { useEffect, useRef, useState, createContext, useContext, useMemo, useCallback } from 'react';
import ArchieIcon from './components/ArchieIcon';
import AdvancedStashDisplay from './components/AdvancedStashDisplay';
import GrowingTab from './components/GrowingTab';
import CanningTab from './components/CanningTab';
import { useArchie } from './context/ArchieContext';
import { useCanningSystem } from './hooks/useCanningSystem';
import { validateCanningImport, loadGameStateWithCanning, saveGameStateWithCanning } from './utils/saveSystem';
import './App.css';

// Utility function to format large numbers with shorthand notation
function formatNumber(num: number, decimalPlaces: number = 1): string {
  if (num < 1000) {
    return num.toFixed(decimalPlaces === 0 ? 0 : Math.min(decimalPlaces, 2)).replace(/\.?0+$/, '');
  }
  
  const units = ['', 'K', 'M', 'B', 'T', 'Q'];
  let unitIndex = 0;
  let value = num;
  
  while (value >= 1000 && unitIndex < units.length - 1) {
    value /= 1000;
    unitIndex++;
  }
  
  // For values >= 1000, always show at least 1 decimal place unless it's a whole number
  const formatted = value.toFixed(decimalPlaces);
  return `${formatted.replace(/\.?0+$/, '')}${units[unitIndex]}`;
}

// Returns the effective growth per tick for a veggie, factoring all bonuses/penalties
function getVeggieGrowthBonus(
  v: Veggie,
  season: string,
  currentWeather: string,
  greenhouseOwned: boolean,
  irrigationOwned: boolean
): number {
  let growthAmount = v.growthRate;
  // Fertilizer bonus - 5% multiplicative increase per level
  growthAmount *= (1 + v.fertilizerLevel * 0.05);
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
const RAIN_CHANCES: Record<string, number> = {
  Spring: 0.20,
  Summer: 0.16,
  Fall: 0.14,
  Winter: 0.10
};

const DROUGHT_CHANCES: Record<string, number> = {
  Spring: 0.012,
  Summer: 0.012,
  Fall: 0.016,
  Winter: 0.004
};

const STORM_CHANCES: Record<string, number> = {
  Spring: 0.04,
  Summer: 0.06,
  Fall: 0.03,
  Winter: 0.01
};
// Weather types
const WEATHER_TYPES = ['Clear', 'Rain', 'Drought', 'Storm', 'Heatwave', 'Snow'] as const;
type WeatherType = typeof WEATHER_TYPES[number];

// Auto-purchase system types
type CurrencyType = 'money' | 'knowledge';

type AutoPurchaseType = 
  | 'fertilizer' 
  | 'betterSeeds' 
  | 'harvesterSpeed' 
  | 'additionalPlot';

type AutoPurchaseConfig = {
  id: string;
  name: string;
  purchaseType: AutoPurchaseType;
  currencyType: CurrencyType;
  cycleDays: number; // How many days between purchases
  owned: boolean;
  active: boolean;
  cost: number;
  timer: number; // Current progress (0 to cycleDays-1)
};

type Veggie = {
  fertilizerMaxLevel: number;
  harvesterSpeedLevel?: number;
  harvesterSpeedCost?: number;
  name: string;
  growth: number;
  growthRate: number;
  stash: number;
  unlocked: boolean;
  experience: number;
  experienceToUnlock: number;
  fertilizerLevel: number;
  fertilizerCost: number;
  harvesterOwned: boolean;
  harvesterCost: number;
  harvesterTimer: number;
  salePrice: number;
  betterSeedsLevel: number;
  betterSeedsCost: number;
  additionalPlotLevel: number;
  additionalPlotCost: number;
  // Auto-purchase system
  autoPurchasers: AutoPurchaseConfig[];
  // Sell control
  sellEnabled: boolean;
};

const SEASON_BONUS = 0.1; // 10% bonus, adjustable
const IRRIGATION_COST = 750; // Cost for Irrigation
const IRRIGATION_KN_COST = 75; // Knowledge cost for Irrigation
const MERCHANT_DAYS = 30; // Every 30 days
const MERCHANT_COST = 1000; // Cost for Auto Sell
const MERCHANT_KN_COST = 100; // Knowledge cost for Auto Sell
const GREENHOUSE_COST_PER_PLOT = 500; // Cost per plot for greenhouse
const GREENHOUSE_KN_COST_PER_PLOT = 25; // Knowledge cost per plot for greenhouse
const HEIRLOOM_COST_PER_VEGGIE = 2500; // Cost for Heirloom Seeds
const HEIRLOOM_KN_PER_VEGGIE = 200; // Knowledge cost for Heirloom Seeds

const veggieSeasonBonuses: Record<string, string[]> = {
  Radish: ['Spring', 'Fall'],
  Lettuce: ['Spring', 'Fall'],
  Carrots: ['Spring', 'Fall'],
  Broccoli: ['Fall'],
  Cabbage: ['Spring', 'Fall'],
  Onions: ['Spring'],
  'Green Beans': ['Summer'],
  Zucchini: ['Summer'],
  Cucumbers: ['Summer'],
  Tomatoes: ['Summer'],
  Peppers: ['Summer'],
};

// Calculate experience requirements using exponential scaling
// Cost configuration for different upgrade types
type CostConfig = {
  baseValue: number;
  firstVeggieDiscount: number; // Multiplier for first veggie (< 1 means cheaper)
  scalingFactor: number; // How fast costs increase per veggie tier
  levelScalingFactor: number; // How fast costs increase per upgrade level
};

const COST_CONFIGS: Record<string, CostConfig> = {
  fertilizer: {
    baseValue: 10,
    firstVeggieDiscount: 0.5, // First veggie pays 50% of base
    scalingFactor: 1.4,
    levelScalingFactor: 1.25
  },
  harvester: {
    baseValue: 15,
    firstVeggieDiscount: 0.53, // ~8 for first veggie
    scalingFactor: 1.5,
    levelScalingFactor: 1.0 // Harvester doesn't scale with level
  },
  betterSeeds: {
    baseValue: 10,
    firstVeggieDiscount: 0.5,
    scalingFactor: 1.4,
    levelScalingFactor: 1.5
  },
  harvesterSpeed: {
    baseValue: 50,
    firstVeggieDiscount: 0.5,
    scalingFactor: 1.5,
    levelScalingFactor: 1.25
  },
  additionalPlot: {
    baseValue: 40,
    firstVeggieDiscount: 0.5,
    scalingFactor: 1.4,
    levelScalingFactor: 1.5
  }
};

const calculateExpRequirement = (index: number): number => {
  if (index === 0) return 0; // First veggie is free
  return Math.floor(50 * Math.pow(1.9, index));
};

const calculateInitialCost = (type: keyof typeof COST_CONFIGS, index: number): number => {
  const config = COST_CONFIGS[type];
  const baseMultiplier = index === 0 ? config.firstVeggieDiscount : 1;
  return Math.floor(config.baseValue * baseMultiplier * Math.pow(config.scalingFactor, index));
};

const calculateUpgradeCost = (type: keyof typeof COST_CONFIGS, currentLevel: number, baseCost: number): number => {
  const config = COST_CONFIGS[type];
  return Math.ceil(baseCost * Math.pow(config.levelScalingFactor, currentLevel) + 5 * currentLevel);
};

const createAutoPurchaserConfigs = (assistantCost: number, cultivatorCost: number, surveyorCost: number, mechanicCost: number): AutoPurchaseConfig[] => [
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
    cycleDays: 7,
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
    cycleDays: 7,
    owned: false,
    active: false,
    cost: mechanicCost,
    timer: 0
  }
];

const initialVeggies: Veggie[] = [
  { name: 'Radish', growth: 0, growthRate: 2.5, stash: 0, unlocked: true, experience: 0, experienceToUnlock: calculateExpRequirement(0), fertilizerLevel: 0, fertilizerCost: calculateInitialCost('fertilizer', 0), harvesterOwned: false, harvesterCost: calculateInitialCost('harvester', 0), harvesterTimer: 0, salePrice: 1, betterSeedsLevel: 0, betterSeedsCost: calculateInitialCost('betterSeeds', 0), harvesterSpeedLevel: 0, harvesterSpeedCost: calculateInitialCost('harvesterSpeed', 0), additionalPlotLevel: 0, additionalPlotCost: calculateInitialCost('additionalPlot', 0), fertilizerMaxLevel: 97, autoPurchasers: createAutoPurchaserConfigs(8, 10, 30*5, 38), sellEnabled: true },
  { name: 'Lettuce', growth: 0, growthRate: 1.4286, stash: 0, unlocked: false, experience: 0, experienceToUnlock: calculateExpRequirement(1), fertilizerLevel: 0, fertilizerCost: 20, harvesterOwned: false, harvesterCost: 30, harvesterTimer: 0, salePrice: 2, betterSeedsLevel: 0, betterSeedsCost: 20, harvesterSpeedLevel: 0, harvesterSpeedCost: 100, additionalPlotLevel: 0, additionalPlotCost: 80, fertilizerMaxLevel: 99, autoPurchasers: createAutoPurchaserConfigs(21, 28, 84*5, 113), sellEnabled: true },
  { name: 'Green Beans', growth: 0, growthRate: 1.4286, stash: 0, unlocked: false, experience: 0, experienceToUnlock: calculateExpRequirement(2), fertilizerLevel: 0, fertilizerCost: 30, harvesterOwned: false, harvesterCost: 60, harvesterTimer: 0, salePrice: 3, betterSeedsLevel: 0, betterSeedsCost: 30, harvesterSpeedLevel: 0, harvesterSpeedCost: 200, additionalPlotLevel: 0, additionalPlotCost: 120, fertilizerMaxLevel: 98, autoPurchasers: createAutoPurchaserConfigs(29, 38, 117*5, 168), sellEnabled: true },
  { name: 'Zucchini', growth: 0, growthRate: 1.4286, stash: 0, unlocked: false, experience: 0, experienceToUnlock: calculateExpRequirement(3), fertilizerLevel: 0, fertilizerCost: 40, harvesterOwned: false, harvesterCost: 120, harvesterTimer: 0, salePrice: 4, betterSeedsLevel: 0, betterSeedsCost: 40, harvesterSpeedLevel: 0, harvesterSpeedCost: 400, additionalPlotLevel: 0, additionalPlotCost: 160, fertilizerMaxLevel: 98, autoPurchasers: createAutoPurchaserConfigs(41, 54, 164*5, 252), sellEnabled: true },
  { name: 'Cucumbers', growth: 0, growthRate: 1.25, stash: 0, unlocked: false, experience: 0, experienceToUnlock: calculateExpRequirement(4), fertilizerLevel: 0, fertilizerCost: 50, harvesterOwned: false, harvesterCost: 240, harvesterTimer: 0, salePrice: 5, betterSeedsLevel: 0, betterSeedsCost: 50, harvesterSpeedLevel: 0, harvesterSpeedCost: 800, additionalPlotLevel: 0, additionalPlotCost: 240, fertilizerMaxLevel: 99, autoPurchasers: createAutoPurchaserConfigs(57, 76, 230*5, 380), sellEnabled: true },
  { name: 'Tomatoes', growth: 0, growthRate: 1.0526, stash: 0, unlocked: false, experience: 0, experienceToUnlock: calculateExpRequirement(5), fertilizerLevel: 0, fertilizerCost: 60, harvesterOwned: false, harvesterCost: 480, harvesterTimer: 0, salePrice: 6, betterSeedsLevel: 0, betterSeedsCost: 60, harvesterSpeedLevel: 0, harvesterSpeedCost: 1600, additionalPlotLevel: 0, additionalPlotCost: 480, fertilizerMaxLevel: 99, autoPurchasers: createAutoPurchaserConfigs(80, 106, 323*5, 569), sellEnabled: true },
  { name: 'Peppers', growth: 0, growthRate: 1, stash: 0, unlocked: false, experience: 0, experienceToUnlock: calculateExpRequirement(6), fertilizerLevel: 0, fertilizerCost: 70, harvesterOwned: false, harvesterCost: 960, harvesterTimer: 0, salePrice: 7, betterSeedsLevel: 0, betterSeedsCost: 70, harvesterSpeedLevel: 0, harvesterSpeedCost: 3200, additionalPlotLevel: 0, additionalPlotCost: 960, fertilizerMaxLevel: 99, autoPurchasers: createAutoPurchaserConfigs(113, 150, 452*5, 854), sellEnabled: true },
  { name: 'Carrots', growth: 0, growthRate: 1.1111, stash: 0, unlocked: false, experience: 0, experienceToUnlock: calculateExpRequirement(7), fertilizerLevel: 0, fertilizerCost: 80, harvesterOwned: false, harvesterCost: 1920, harvesterTimer: 0, salePrice: 8, betterSeedsLevel: 0, betterSeedsCost: 80, harvesterSpeedLevel: 0, harvesterSpeedCost: 6400, additionalPlotLevel: 0, additionalPlotCost: 1920, fertilizerMaxLevel: 99, autoPurchasers: createAutoPurchaserConfigs(158, 210, 632*5, 1281), sellEnabled: true },
  { name: 'Broccoli', growth: 0, growthRate: 1, stash: 0, unlocked: false, experience: 0, experienceToUnlock: calculateExpRequirement(8), fertilizerLevel: 0, fertilizerCost: 90, harvesterOwned: false, harvesterCost: 3840, harvesterTimer: 0, salePrice: 9, betterSeedsLevel: 0, betterSeedsCost: 90, harvesterSpeedLevel: 0, harvesterSpeedCost: 12800, additionalPlotLevel: 0, additionalPlotCost: 3840, fertilizerMaxLevel: 99, autoPurchasers: createAutoPurchaserConfigs(221, 294, 885*5, 1922), sellEnabled: true },
  { name: 'Onions', growth: 0, growthRate: 0.7692, stash: 0, unlocked: false, experience: 0, experienceToUnlock: calculateExpRequirement(9), fertilizerLevel: 0, fertilizerCost: 100, harvesterOwned: false, harvesterCost: 7680, harvesterTimer: 0, salePrice: 10, betterSeedsLevel: 0, betterSeedsCost: 100, harvesterSpeedLevel: 0, harvesterSpeedCost: 25600, additionalPlotLevel: 0, additionalPlotCost: 7680, fertilizerMaxLevel: 99, autoPurchasers: createAutoPurchaserConfigs(309, 412, 1239*5, 2883), sellEnabled: true },
];

// Auto-purchase utility functions
const getAutoPurchaseCost = (veggie: Veggie, purchaseType: AutoPurchaseType): number => {
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

const canMakePurchase = (
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



const createAutoPurchaseHandler = (
  autoPurchaseId: string,
  veggies: Veggie[],
  setVeggies: React.Dispatch<React.SetStateAction<Veggie[]>>,
  money: number,
  setMoney: React.Dispatch<React.SetStateAction<number>>,
  knowledge: number,
  setKnowledge: React.Dispatch<React.SetStateAction<number>>,
  maxPlots?: number
) => {
  return (index: number) => {
    const veggie = veggies[index];
    const autoPurchaser = veggie.autoPurchasers.find(ap => ap.id === autoPurchaseId);
    
    if (!autoPurchaser) return;

    const currency = autoPurchaser.currencyType === 'money' ? money : knowledge;
    const canAfford = !autoPurchaser.owned && currency >= autoPurchaser.cost;

    if (canAfford) {
      // Purchase the auto-purchaser
      if (autoPurchaser.currencyType === 'money') {
        setMoney((m: number) => Math.max(0, m - autoPurchaser.cost));
      } else {
        setKnowledge((k: number) => Math.max(0, k - autoPurchaser.cost));
      }
      setVeggies((prev) => {
        const updated = [...prev];
        const v2 = { ...updated[index] };
        const apIndex = v2.autoPurchasers.findIndex(ap => ap.id === autoPurchaseId);
        if (apIndex >= 0) {
          v2.autoPurchasers[apIndex] = {
            ...v2.autoPurchasers[apIndex],
            owned: true,
            active: true,
            timer: 0
          };
        }
        updated[index] = v2;
        return updated;
      });
    } else if (autoPurchaser.owned) {
      // Toggle activation - but prevent Surveyor from being turned on at max plots
      if (autoPurchaseId === 'surveyor' && !autoPurchaser.active && maxPlots !== undefined) {
        const totalPlotsUsed = veggies.filter(v => v.unlocked).length + veggies.reduce((sum, v) => sum + (v.additionalPlotLevel || 0), 0);
        if (totalPlotsUsed >= maxPlots) {
          return; // Don't allow turning Surveyor on when at max plots
        }
      }
      
      setVeggies((prev) => {
        const updated = [...prev];
        const v2 = { ...updated[index] };
        const apIndex = v2.autoPurchasers.findIndex(ap => ap.id === autoPurchaseId);
        if (apIndex >= 0) {
          v2.autoPurchasers[apIndex] = {
            ...v2.autoPurchasers[apIndex],
            active: !v2.autoPurchasers[apIndex].active
          };
        }
        updated[index] = v2;
        return updated;
      });
    }
  };
};



type GameState = {
  currentWeather: WeatherType;
  setCurrentWeather: React.Dispatch<React.SetStateAction<WeatherType>>;
  irrigationOwned: boolean;
  setIrrigationOwned: React.Dispatch<React.SetStateAction<boolean>>;
  irrigationCost: number;
  irrigationKnCost: number;
  handleBuyIrrigation: () => void;
  resetGame: () => void;
  veggies: Veggie[];
  setVeggies: React.Dispatch<React.SetStateAction<Veggie[]>>;
  money: number;
  setMoney: React.Dispatch<React.SetStateAction<number>>;
  experience: number;
  setExperience: React.Dispatch<React.SetStateAction<number>>;
  knowledge: number;
  setKnowledge: React.Dispatch<React.SetStateAction<number>>;
  activeVeggie: number;
  day: number;
  setDay: React.Dispatch<React.SetStateAction<number>>;
  globalAutoPurchaseTimer: number;
  setGlobalAutoPurchaseTimer: React.Dispatch<React.SetStateAction<number>>;
  setActiveVeggie: (i: number) => void;
  handleHarvest: () => void;
  handleToggleSell: (index: number) => void;
  handleSell: () => void;
  handleBuyFertilizer: (index: number) => void;
  handleBuyHarvester: (index: number) => void;
  handleBuyAutoPurchaser: (autoPurchaseId: string) => (index: number) => void;
  handleBuyBetterSeeds: (index: number) => void;
  handleBuyAdditionalPlot: (index: number) => void;
  greenhouseOwned: boolean;
  setGreenhouseOwned: React.Dispatch<React.SetStateAction<boolean>>;
  handleBuyGreenhouse: () => void;
  handleBuyHarvesterSpeed: (index: number) => void;
  heirloomOwned: boolean;
  setHeirloomOwned: React.Dispatch<React.SetStateAction<boolean>>;
  handleBuyHeirloom: () => void;
  autoSellOwned: boolean;
  setAutoSellOwned: React.Dispatch<React.SetStateAction<boolean>>;
  handleBuyAutoSell: () => void;
  almanacLevel: number;
  setAlmanacLevel: React.Dispatch<React.SetStateAction<number>>;
  almanacCost: number;
  setAlmanacCost: React.Dispatch<React.SetStateAction<number>>;
  handleBuyAlmanac: () => void;
  maxPlots: number;
  setMaxPlots: React.Dispatch<React.SetStateAction<number>>;
  farmCost: number;
  setFarmCost: React.Dispatch<React.SetStateAction<number>>;
  handleBuyLargerFarm: () => void;
  farmTier: number;
  setFarmTier: React.Dispatch<React.SetStateAction<number>>;
  highestUnlockedVeggie: number;
  setHighestUnlockedVeggie: React.Dispatch<React.SetStateAction<number>>;
  heirloomMoneyCost: number;
  heirloomKnowledgeCost: number;
};

const FARM_BASE_COST = 500;

const GameContext = createContext<GameState | undefined>(undefined);

const getSeason = (day: number) => {
  if (day >= 0 && day < 80) return 'Spring';
  if (day >= 80 && day < 172) return 'Summer';
  if (day >= 172 && day < 265) return 'Fall';
  return 'Winter';
};

const GAME_STORAGE_KEY = 'farmIdleGameState';

function saveGameState(state: any) {
  try {
    saveGameStateWithCanning(state);
  } catch {}
}

const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const irrigationCost = IRRIGATION_COST;
  const irrigationKnCost = IRRIGATION_KN_COST;
  const handleBuyIrrigation = () => {
    if (!irrigationOwned && money >= irrigationCost && knowledge >= irrigationKnCost) {
      setMoney((m: number) => m - irrigationCost);
      setKnowledge((k: number) => k - irrigationKnCost);
      setIrrigationOwned(true);
    }
  };
  // Weather and irrigation state for growth calculation
  const [currentWeather, setCurrentWeather] = useState<WeatherType>('Clear');
  // Only one declaration for irrigationOwned and setIrrigationOwned
  // Irrigation upgrade state
  
  // Load game state fresh each time - this ensures imports work correctly
  const getLoadedState = () => {
    const result = loadGameStateWithCanning();
    console.log('GameProvider: Raw localStorage data:', localStorage.getItem('farmIdleGameState'));
    console.log('GameProvider: Parsed result:', result);
    return result;
  };
  const loaded = getLoadedState();
  console.log('GameProvider: Loading state with experience =', loaded?.experience || 0);
  
  // Track farm tier (number of times farm has been purchased)
  const [farmTier, setFarmTier] = useState<number>(loaded?.farmTier ?? 1);
  const [irrigationOwned, setIrrigationOwned] = useState(loaded?.irrigationOwned ?? false);
  // Farm purchase/reset logic
  const FARM_BASE_COST = 500;
  const [farmCost, setFarmCost] = useState<number>(
    loaded?.farmCost ?? Math.ceil(FARM_BASE_COST * Math.pow(1.85, (loaded?.farmTier ?? 1) - 1))
  );
  const handleBuyLargerFarm = () => {
    // Only allow if enough money and maxPlots reached
    if (money < farmCost || totalPlotsUsed < maxPlots) return;
    // Calculate new maxPlots (capped at twice the current max)
    const experienceBonus = Math.floor(experience / 100);
    const uncappedMaxPlots = maxPlots + experienceBonus;
    const newMaxPlots = Math.min(uncappedMaxPlots, maxPlots * 2);
    // Calculate money to keep
    const moneyKept = money - farmCost;
    // Calculate knowledge to keep (third of current)
    const knowledgeKept = Math.floor(knowledge / 3);
    // Calculate new farm tier
    const newFarmTier = farmTier + 1;
    // Save current state of irrigation
    // Static knowledge multiplier bonus per farm tier is applied globally in knowledge gain
    // Reset game state, but keep moneyKept, newMaxPlots, and newFarmTier
    setVeggies(initialVeggies.map(v => ({ ...v })));
    setMoney(moneyKept > 0 ? moneyKept : 0);
    setExperience(0);
    setKnowledge(knowledgeKept);
    setActiveVeggie(0);
    setDay(0);
    setGreenhouseOwned(false);
    setAlmanacLevel(0);
    setAlmanacCost(10);
    setAutoSellOwned(false);
    setHeirloomOwned(false);
    setMaxPlots(newMaxPlots);
    setFarmTier(newFarmTier);
    setIrrigationOwned(false); // Preserve irrigation state
    setGlobalAutoPurchaseTimer(0); // Reset auto-purchaser timer
    setFarmCost(Math.ceil(FARM_BASE_COST * Math.pow(1.85, newFarmTier - 1))); // Increase cost for next farm, exponential scaling
    // Save to localStorage
    saveGameState({
      veggies: initialVeggies.map(v => ({ ...v })),
      money: moneyKept > 0 ? moneyKept : 0,
      experience: 0,
      knowledge: knowledgeKept,
      activeVeggie: 0,
      day: 0,
      greenhouseOwned: false,
      heirloomOwned: false,
      autoSellOwned: false,
      almanacLevel: 0,
      almanacCost: 10,
      maxPlots: newMaxPlots,
      farmTier: newFarmTier,
      farmCost: Math.ceil(FARM_BASE_COST * Math.pow(1.85, newFarmTier - 1)),
      irrigationOwned: irrigationOwned,
      globalAutoPurchaseTimer: 0, // Reset auto-purchaser timer
      currentWeather: 'Clear', // Reset weather when resetting
      highestUnlockedVeggie: highestUnlockedVeggie // Preserve highest unlocked veggie through farm upgrades
    });
  };
  // Removed duplicate loaded declaration and invalid farmTier type usage
  // Farmer's Almanac upgrade state
  const [almanacLevel, setAlmanacLevel] = useState(loaded?.almanacLevel ?? 0);
  const [almanacCost, setAlmanacCost] = useState(loaded?.almanacCost ?? 10);
  // Farmer's Almanac purchase handler
  const handleBuyAlmanac = () => {
    if (money >= almanacCost) {
      setMoney((m: number) => Math.max(0, m - almanacCost));
      setAlmanacLevel((lvl: number) => lvl + 1);
      setAlmanacCost((cost: number) => Math.ceil(cost * 1.15 + 5));
    }
  };
  // Heirloom Seeds upgrade state
  const [heirloomOwned, setHeirloomOwned] = useState(loaded?.heirloomOwned ?? false);
  // Auto Sell upgrade state
  const [autoSellOwned, setAutoSellOwned] = useState(loaded?.autoSellOwned ?? false);
  // Auto Sell upgrade purchase handler
  const handleBuyAutoSell = () => {
    if (!autoSellOwned && money >= MERCHANT_COST && knowledge >= MERCHANT_KN_COST) {
      setMoney((m: number) => m - MERCHANT_COST);
      setKnowledge((k: number) => k - MERCHANT_KN_COST);
      setAutoSellOwned(true);
    }
  };
  // Reset game handler
  const resetGame = () => {
  localStorage.removeItem(GAME_STORAGE_KEY);
  setFarmTier(1);
  setDay(0);
  setMaxPlots(4);
  setMoney(0);
  setExperience(0);
  setKnowledge(0);
  setActiveVeggie(0);
  setVeggies(initialVeggies.map(v => ({ ...v })));
  setAlmanacLevel(0);
  setAlmanacCost(10);
  setIrrigationOwned(false);
  setAutoSellOwned(false);
  setGreenhouseOwned(false);
  setHeirloomOwned(false);
  setCurrentWeather('Clear');
  setFarmCost(FARM_BASE_COST);
  setHighestUnlockedVeggie(0); // Reset highest unlocked veggie for complete reset
  // Also force experience to 0 in localStorage
  saveGameState({
    farmTier: 1,
    day: 0,
    maxPlots: 4,
    money: 0,
    experience: 0,
    knowledge: 0,
    activeVeggie: 0,
    veggies: initialVeggies.map(v => ({ ...v })),
    almanacLevel: 0,
    almanacCost: 10,
    irrigationOwned: false,
    autoSellOwned: false,
    greenhouseOwned: false,
    heirloomOwned: false,
    farmCost: FARM_BASE_COST,
    currentWeather: 'Clear',
    highestUnlockedVeggie: 0 // Reset to 0 for complete game reset
  });
  };
  // Prestige mechanic: max plots
  const [maxPlots, setMaxPlots] = useState<number>(loaded?.maxPlots ?? 4);
  // Auto Harvester Speed upgrade purchase
  const handleBuyHarvesterSpeed = (index: number) => {
    const v = veggies[index];
    if (v.harvesterOwned && money >= v.harvesterSpeedCost!) {
      setMoney((m: number) => Math.max(0, m - v.harvesterSpeedCost!));
      setVeggies((prev) => {
        const updated = [...prev];
        const v2 = { ...updated[index] };
        v2.harvesterSpeedLevel = (v2.harvesterSpeedLevel ?? 0) + 1;
        v2.harvesterSpeedCost = calculateUpgradeCost('harvesterSpeed', v2.harvesterSpeedLevel, calculateInitialCost('harvesterSpeed', index));
        updated[index] = v2;
        return updated;
      });
    }
  };
  // Greenhouse upgrade state
  const [greenhouseOwned, setGreenhouseOwned] = useState(loaded?.greenhouseOwned ?? false);
  // Prestige: Better Seeds upgrade purchase
  const handleBuyBetterSeeds = (index: number) => {
    const v = veggies[index];
    if (knowledge >= v.betterSeedsCost) {
      const cost = v.betterSeedsCost;
      setKnowledge((k: number) => Math.max(0, k - cost));
      setVeggies((prev) => {
        const updated = [...prev];
        const v2 = { ...updated[index] };
        v2.betterSeedsLevel += 1;
        const multiplier = heirloomOwned ? 1.5 : 1.25;
        v2.salePrice = +(v2.salePrice * multiplier).toFixed(2);
        v2.betterSeedsCost = calculateUpgradeCost('betterSeeds', v2.betterSeedsLevel, calculateInitialCost('betterSeeds', index));
        updated[index] = v2;
        return updated;
      });
    }
  };
  // Heirloom Seeds purchase handler
  const handleBuyHeirloom = () => {
    if (!heirloomOwned && money >= heirloomMoneyCost && knowledge >= heirloomKnowledgeCost) {
      setMoney((m: number) => m - heirloomMoneyCost);
      setKnowledge((k: number) => k - heirloomKnowledgeCost);
      setHeirloomOwned(true);
      
      // Retroactively update all vegetable prices to reflect the heirloom bonus
      setVeggies((prev) => {
        return prev.map((v, index) => {
          if (v.betterSeedsLevel > 0) {
            // Recalculate the sale price with the heirloom multiplier
            // First, calculate the base price (original price before any Better Seeds)
            const baseSalePrice = initialVeggies[index].salePrice;
            // Then apply the heirloom multiplier (1.5x per level instead of 1.25x)
            const newSalePrice = +(baseSalePrice * Math.pow(1.5, v.betterSeedsLevel)).toFixed(2);
            console.log(`Updating ${v.name}: base=${baseSalePrice}, level=${v.betterSeedsLevel}, old=${v.salePrice}, new=${newSalePrice}`);
            return { ...v, salePrice: newSalePrice };
          }
          return v;
        });
      });
    }
  };

  // Migration function to add missing properties to saved veggie data
  const migrateVeggieData = (loadedVeggies: any[]): Veggie[] => {
    if (!loadedVeggies) return initialVeggies;
    
    return loadedVeggies.map((savedVeggie, index) => {
      const initialVeggie = initialVeggies[index];
      
      // Add missing properties with defaults
      const migratedVeggie: any = { ...savedVeggie };
      
      // If autoPurchasers is missing, add it from the initial veggie data
      if (!savedVeggie.autoPurchasers) {
        migratedVeggie.autoPurchasers = initialVeggie ? initialVeggie.autoPurchasers : createAutoPurchaserConfigs(8, 10, 30, 38);
      }
      
      // If sellEnabled is missing, default to true (allow selling)
      if (savedVeggie.sellEnabled === undefined) {
        migratedVeggie.sellEnabled = true;
      }
      
      return migratedVeggie;
    });
  };

  const [veggies, setVeggies] = useState<Veggie[]>(loaded?.veggies ? migrateVeggieData(loaded.veggies) : initialVeggies);
  const [money, setMoney] = useState(loaded?.money ?? 0);
  // Helper: total plots used (unlocked veggies + additional plots)
  const totalPlotsUsed = veggies.filter(v => v.unlocked).length + veggies.reduce((sum, v) => sum + (v.additionalPlotLevel || 0), 0);  
  const [experience, setExperience] = useState(loaded?.experience ?? 0);
  const [knowledge, setKnowledge] = useState(loaded?.knowledge ?? 0);
  const [activeVeggie, setActiveVeggie] = useState(loaded?.activeVeggie ?? 0);
  const [day, setDay] = useState(loaded?.day ?? 0);
  const [globalAutoPurchaseTimer, setGlobalAutoPurchaseTimer] = useState(loaded?.globalAutoPurchaseTimer ?? 0);
  const [highestUnlockedVeggie, setHighestUnlockedVeggie] = useState(loaded?.highestUnlockedVeggie ?? 0);
  
  // Calculate dynamic heirloom costs based on highest unlocked veggie using useMemo for proper reactivity
  const heirloomMoneyCost = useMemo(() => {
    const cost = HEIRLOOM_COST_PER_VEGGIE * (highestUnlockedVeggie + 1);
    console.log(`Heirloom cost recalculated: highestUnlockedVeggie=${highestUnlockedVeggie}, cost=$${cost}`);
    return cost;
  }, [highestUnlockedVeggie]);
  const heirloomKnowledgeCost = useMemo(() => 
    HEIRLOOM_KN_PER_VEGGIE * (highestUnlockedVeggie + 1), 
    [highestUnlockedVeggie]
  );
  
  // Initialize highestUnlockedVeggie for existing players who don't have it in their save data
  useEffect(() => {
    if (loaded && loaded.highestUnlockedVeggie === undefined && loaded.veggies) {
      // Find the highest index of unlocked veggies from the loaded save data
      const currentHighest = loaded.veggies.reduce((highest: number, veggie: any, index: number) => {
        return veggie.unlocked && index > highest ? index : highest;
      }, 0);
      setHighestUnlockedVeggie(currentHighest);
    }
  }, []); // Run only once on mount with empty dependency array since loaded is stable    

  // Change browser tab title if any veggie is ready to harvest
  useEffect(() => {
    if (veggies.some(v => v.growth >= 100)) {
      document.title = '🌱 Farm Idle Game';
    } else {
      document.title = 'Farm Idle Game';
    }
  }, [veggies]);
  
  const timerRef = useRef<number | null>(null);
  // Growth timer for all unlocked veggies
  useEffect(() => {
    // Memoize season calculation outside the interval
    const season = getSeason(day);
    
    timerRef.current = window.setInterval(() => {
      setVeggies((prev) => {
        let needsUpdate = false;
        const newVeggies = prev.map((v) => {
          if (!v.unlocked || v.growth >= 100) return v;
          const growthAmount = getVeggieGrowthBonus(v, season, currentWeather, greenhouseOwned, irrigationOwned);
          const newGrowth = Math.min(100, v.growth + growthAmount);
          if (newGrowth !== v.growth) {
            needsUpdate = true;
            return { ...v, growth: newGrowth };
          }
          return v;
        });
        // Only return new array if there were actual changes
        return needsUpdate ? newVeggies : prev;
      });
    }, 1000);

    // Cleanup function
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [day, greenhouseOwned, currentWeather, irrigationOwned]);
  // Greenhouse upgrade purchase handler
  const handleBuyGreenhouse = () => {
    const greenhouseCost = GREENHOUSE_COST_PER_PLOT * maxPlots;
    const greenhouseKnCost = GREENHOUSE_KN_COST_PER_PLOT * maxPlots;
    if (!greenhouseOwned && money >= greenhouseCost && knowledge >= greenhouseKnCost) {
      setMoney((m: number) => m - greenhouseCost);
      setKnowledge((k: number) => k - greenhouseKnCost);
      setGreenhouseOwned(true);
    }
  };

  // Memoize harvester speed levels to avoid unnecessary effect re-runs
  const harvesterSpeedLevelsString = veggies.map(v => v.harvesterSpeedLevel ?? 0).join(',');
  const harvesterSpeedLevels = useMemo(() => 
    veggies.map(v => v.harvesterSpeedLevel ?? 0), 
    [harvesterSpeedLevelsString]
  );

  // Auto Harvester timer for each veggie
  useEffect(() => {
    let intervalId: number | null = null;
    
    const harvestTick = () => {
      setVeggies((prev) => {
        let needsUpdate = false;
        let totalExperienceGain = 0;
        let totalKnowledgeGain = 0;
        
        const newVeggies = prev.map((v) => {
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

        // Update experience and knowledge for all harvests
        if (totalExperienceGain > 0 && day >= 0 && day <= 365) {
          setTimeout(() => {
            setKnowledge((k: number) => k + totalKnowledgeGain);
            setExperience((exp: number) => exp + totalExperienceGain);
          }, 0);
        }

        // Handle unlocks after all harvests are processed using projected experience
        if (needsUpdate) {
          const projectedExperience = experience + totalExperienceGain;
          let totalPlotsUsed = newVeggies.filter(vg => vg.unlocked).length +
            newVeggies.reduce((sum, vg) => sum + (vg.additionalPlotLevel || 0), 0);

          console.log(`Auto-harvest unlock check: current exp=${experience}, gained=${totalExperienceGain}, projected=${projectedExperience}`);

          // Check for unlocks using projected experience
          newVeggies.forEach((veg, idx) => {
            if (!veg.unlocked && projectedExperience >= veg.experienceToUnlock && totalPlotsUsed < maxPlots) {
              console.log(`Auto-unlocking ${veg.name} (index: ${idx}) - required: ${veg.experienceToUnlock}, projected: ${projectedExperience}`);
              newVeggies[idx] = { ...veg, unlocked: true };
              totalPlotsUsed++;
              // Update highest unlocked veggie if this is higher
              if (idx > highestUnlockedVeggie) {
                console.log(`Auto-harvest unlocking new highest veggie: ${veg.name} (index: ${idx})`);
                setHighestUnlockedVeggie(idx);
              }
            }
          });
        }

        return needsUpdate ? newVeggies : prev;
      });
    };

    intervalId = window.setInterval(harvestTick, 1000);

    // Cleanup function
    return () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
  }, [almanacLevel, farmTier, experience, maxPlots, harvesterSpeedLevels]);

  // Unified harvest logic for both auto and manual harvest
  const harvestVeggie = (index: number, isAutoHarvest: boolean = false) => {
    // Calculate harvest amount before the state update
    const v = veggies[index];
    if (v.growth < 100) return; // Early exit if not ready to harvest
    
    const harvestAmount = 1 + (v.additionalPlotLevel || 0);
    
    // Since we already checked growth >= 100, we know we'll harvest
    const almanacMultiplier = 1 + (almanacLevel * 0.10);
    const knowledgeGain = isAutoHarvest ? 0.5 : 1;
    
    // Calculate what the new experience will be after this harvest
    const experienceGain = isAutoHarvest 
      ? (harvestAmount * 0.5) + (knowledge * 0.01 * 0.5)
      : harvestAmount + knowledge * 0.01;
    const newExperience = experience + experienceGain;
    
    setVeggies((prev) => {
      const updated = [...prev];
      const veggie = { ...updated[index] };
      veggie.salePrice = updated[index].salePrice;
      
      // Perform the harvest
      veggie.stash += harvestAmount;
      veggie.growth = 0;
      
      // Reset harvester timer if this is an auto harvest
      if (isAutoHarvest) {
        veggie.harvesterTimer = 0;
      }
      
      updated[index] = veggie;

      // Unlock all eligible veggies after harvest using the NEW experience value
      let totalPlotsUsed = updated.filter(vg => vg.unlocked).length + updated.reduce((sum, vg) => sum + (vg.additionalPlotLevel || 0), 0);
      const unlockOrder = updated
        .map((vg, idx) => ({ ...vg, idx }))
        .filter(vg => !vg.unlocked && newExperience >= vg.experienceToUnlock)
        .sort((a, b) => a.experienceToUnlock - b.experienceToUnlock);
      
      console.log(`Checking veggie unlocks: current exp=${experience}, new exp=${newExperience}, eligible veggies=${unlockOrder.length}`);
      
      for (let i = 0; i < unlockOrder.length && totalPlotsUsed < maxPlots; i++) {
        updated[unlockOrder[i].idx].unlocked = true;
        totalPlotsUsed++;
        // Update highest unlocked veggie if this is higher
        if (unlockOrder[i].idx > highestUnlockedVeggie) {
          console.log(`Unlocking new highest veggie: ${updated[unlockOrder[i].idx].name} (index: ${unlockOrder[i].idx})`);
          console.log(`New heirloom cost will be: $${HEIRLOOM_COST_PER_VEGGIE * (unlockOrder[i].idx + 1)} & ${HEIRLOOM_KN_PER_VEGGIE * (unlockOrder[i].idx + 1)} Kn`);
          setHighestUnlockedVeggie(unlockOrder[i].idx);
        }
      }
      return updated;
    });
    
    // Update knowledge and experience (we know harvest succeeded since we checked growth >= 100)
    if (day >= 0 && day <= 365) {
      setKnowledge((k: number) => k + knowledgeGain * almanacMultiplier + (1.25 * (farmTier - 1)));
      
      // Apply experience based on harvest type (auto vs manual)
      if (isAutoHarvest) {
        // Auto harvest gives half experience
        setExperience((exp: number) => exp + (harvestAmount * 0.5) + (knowledge * 0.01 * 0.5));
      } else {
        // Manual harvest gives full experience
        setExperience((exp: number) => exp + harvestAmount + knowledge * 0.01);
      }
    }
  };

  // Manual harvest button uses unified logic
  const handleHarvest = () => {
    harvestVeggie(activeVeggie, false);
  }

  // Toggle sell enabled for a specific veggie
  const handleToggleSell = (index: number) => {
    setVeggies((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], sellEnabled: !updated[index].sellEnabled };
      return updated;
    });
  };

  // Fertilizer upgrade purchase
  // Additional Plot upgrade purchase
  const handleBuyAdditionalPlot = (index: number) => {
    const v = veggies[index];
    // Block purchase if maxPlots reached
    if (totalPlotsUsed >= maxPlots) return;
    if (money >= v.additionalPlotCost) {
      setMoney((m: number) => Math.max(0, m - v.additionalPlotCost));
      setVeggies((prev) => {
        const updated = [...prev];
        const v2 = { ...updated[index] };
        v2.additionalPlotLevel += 1;
        v2.additionalPlotCost = calculateUpgradeCost('additionalPlot', v2.additionalPlotLevel, calculateInitialCost('additionalPlot', index));
        updated[index] = v2;
        return updated;
      });
    }
  };
  const handleBuyFertilizer = (index: number) => {
    const v = veggies[index];
    if (money >= v.fertilizerCost) {
      setMoney((m: number) => Math.max(0, m - v.fertilizerCost));
      setVeggies((prev) => {
        const updated = [...prev];
        const v2 = { ...updated[index] };
        v2.fertilizerLevel += 1;
        v2.fertilizerCost = calculateUpgradeCost('fertilizer', v2.fertilizerLevel, calculateInitialCost('fertilizer', index));
        updated[index] = v2;
        return updated;
      });
    }
  };

  // Generic auto-purchase handler using the new system
  const handleBuyAutoPurchaser = (autoPurchaseId: string) => {
    return createAutoPurchaseHandler(autoPurchaseId, veggies, setVeggies, money, setMoney, knowledge, setKnowledge, maxPlots);
  };

  // Harvester upgrade purchase
  const handleBuyHarvester = (index: number) => {
    const v = veggies[index];
    if (!v.harvesterOwned && money >= v.harvesterCost) {
      setMoney((m: number) => Math.max(0, m - v.harvesterCost));
      setVeggies((prev) => {
        const updated = [...prev];
        const v2 = { ...updated[index] };
        v2.harvesterOwned = true;
        updated[index] = v2;
        return updated;
      });
    }
  };

  // Sell handler - memoized to prevent useEffect re-runs
  const handleSell = useCallback(() => {
    let total = 0;
    setVeggies((prev) => {
      total = prev.reduce((sum, v) => {
        // Only include vegetables that are enabled for selling
        return v.sellEnabled ? sum + v.stash * v.salePrice : sum;
      }, 0);
      return prev.map((v) => ({
        ...v,
        // Only clear stash for vegetables that are enabled for selling
        stash: v.sellEnabled ? 0 : v.stash
      }));
    });
    setMoney((m: number) => m + total);
  }, [setVeggies, setMoney]);

  // Create a ref to track current weather without causing effect re-runs
  const currentWeatherRef = useRef(currentWeather);
  
  // Update ref when weather changes
  useEffect(() => {
    currentWeatherRef.current = currentWeather;
  }, [currentWeather]);

  // Day counter timer combined with weather system
  useEffect(() => {
    let dayIntervalId: number | null = null;
    
    const updateDay = () => {
      setDay((d: number) => {
        const newDay = (d + 1) % 366;
        // Handle weather changes inline with day changes to reduce state updates
        const newSeason = getSeason(newDay);
        handleWeatherChange(newSeason);
        
        // Auto-sell logic for merchant (every MERCHANT_DAYS)
        if (autoSellOwned && newDay % MERCHANT_DAYS === 0) {
          // Trigger auto-sell using the existing handleSell function
          setTimeout(() => {
            handleSell();
          }, 100); // Small delay to ensure state is updated
        }
        
        // Process all auto-purchaser timers using the new generic system
        setGlobalAutoPurchaseTimer((prevTimer: number) => prevTimer + 1);
        
        return newDay;
      });
    };

    const handleWeatherChange = (season: string) => {
      // Only calculate new weather if needed
      if (currentWeatherRef.current === 'Clear') {
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
        
        if (newWeather !== currentWeather) {
          setCurrentWeather(newWeather);
        }
      }
    };

    dayIntervalId = window.setInterval(updateDay, 1000);

    return () => {
      if (dayIntervalId !== null) {
        clearInterval(dayIntervalId);
        dayIntervalId = null;
      }
    };
  }, [autoSellOwned, handleSell]);

  // Auto-purchase logic - separate effect that triggers when timer reaches 7
  useEffect(() => {
    if (globalAutoPurchaseTimer >= 7) {
      // Reset timer first
      setGlobalAutoPurchaseTimer(0);
      
      // Process all auto-purchases for each veggie
      veggies.forEach((v, veggieIndex) => {
        // Process each active auto-purchaser for this veggie
        for (const ap of v.autoPurchasers) {
          if (ap.owned && ap.active) {
            // Try to make purchase if possible
            if (canMakePurchase(v, ap.purchaseType, money, knowledge, ap.currencyType, veggies, maxPlots)) {
              // Call the appropriate existing handler function
              switch (ap.purchaseType) {
                case 'fertilizer':
                  handleBuyFertilizer(veggieIndex);
                  break;
                case 'betterSeeds':
                  handleBuyBetterSeeds(veggieIndex);
                  break;
                case 'harvesterSpeed':
                  handleBuyHarvesterSpeed(veggieIndex);
                  break;
                case 'additionalPlot':
                  handleBuyAdditionalPlot(veggieIndex);
                  break;
              }
            } else if (ap.purchaseType === 'additionalPlot' && ap.id === 'surveyor') {
              // If Surveyor can't buy more plots due to max limit, turn it off
              const totalPlotsUsed = veggies.filter(veg => veg.unlocked).length + veggies.reduce((sum, veg) => sum + (veg.additionalPlotLevel || 0), 0);
              if (totalPlotsUsed >= maxPlots) {
                setVeggies((prevVeggies) => {
                  const updated = [...prevVeggies];
                  const v2 = { ...updated[veggieIndex] };
                  v2.autoPurchasers = v2.autoPurchasers.map(autopurchaser => 
                    autopurchaser.id === 'surveyor' 
                      ? { ...autopurchaser, active: false }
                      : autopurchaser
                  );
                  updated[veggieIndex] = v2;
                  return updated;
                });
              }
            }
          }
        }
      });
    }
  }, [globalAutoPurchaseTimer, money, knowledge, maxPlots, veggies, handleBuyFertilizer, handleBuyBetterSeeds, handleBuyHarvesterSpeed, handleBuyAdditionalPlot, setVeggies]);



  return (
  <GameContext.Provider value={{ veggies, setVeggies, money, setMoney, experience, setExperience, knowledge, setKnowledge, activeVeggie, day, setDay, globalAutoPurchaseTimer, setGlobalAutoPurchaseTimer, setActiveVeggie, handleHarvest, handleToggleSell, handleSell, handleBuyFertilizer, handleBuyHarvester, handleBuyBetterSeeds, greenhouseOwned, setGreenhouseOwned, handleBuyGreenhouse, handleBuyHarvesterSpeed, resetGame, heirloomOwned, setHeirloomOwned, handleBuyHeirloom, autoSellOwned, setAutoSellOwned, handleBuyAutoSell, almanacLevel, setAlmanacLevel, almanacCost, setAlmanacCost, handleBuyAlmanac, handleBuyAdditionalPlot, maxPlots, setMaxPlots, farmCost, setFarmCost, handleBuyLargerFarm, farmTier, setFarmTier, irrigationOwned, setIrrigationOwned, irrigationCost, irrigationKnCost, handleBuyIrrigation, currentWeather, setCurrentWeather, highestUnlockedVeggie, setHighestUnlockedVeggie, handleBuyAutoPurchaser, heirloomMoneyCost, heirloomKnowledgeCost }}>
      {children}
    </GameContext.Provider>
  );
};

function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within a GameProvider');
  return context;
}

function App() {
  // Ref for hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { soundEnabled, setSoundEnabled } = useArchie();
  
  // ArchieIcon component adds a clickable character that
  // appears randomly on the screen and gives the player money when clicked
  
  // Info overlay state
  const [showInfoOverlay, setShowInfoOverlay] = useState(false);
  const [selectedInfoCategory, setSelectedInfoCategory] = useState('seasons');
  
  // Settings overlay state
  const [showSettingsOverlay, setShowSettingsOverlay] = useState(false);
  
  // Advanced stash overlay state
  const [showAdvancedStash, setShowAdvancedStash] = useState(false);

  // Tab system state
  const [activeTab, setActiveTab] = useState<'growing' | 'canning'>('growing');
  
  // Load initial canning state fresh each time
  const [initialCanningState] = useState(() => {
    try {
      const loaded = loadGameStateWithCanning();
      console.log('Loading canning state:', loaded?.canningState ? 'Found saved state' : 'No saved state');
      return loaded?.canningState || undefined;
    } catch (error) {
      console.error('Error loading canning state:', error);
      return undefined;
    }
  });

  // Load and manage UI preferences
  const [uiPreferences, setUiPreferences] = useState<{
    canningRecipeFilter: 'all' | 'available' | 'simple' | 'complex' | 'gourmet';
    canningRecipeSort: 'name' | 'profit' | 'time' | 'difficulty';
  }>(() => {
    const loaded = loadGameStateWithCanning();
    return {
      canningRecipeFilter: loaded?.uiPreferences?.canningRecipeFilter || 'all',
      canningRecipeSort: loaded?.uiPreferences?.canningRecipeSort || 'profit'
    };
  });

  // Handlers for updating UI preferences
  const setCanningRecipeFilter = useCallback((filter: 'all' | 'available' | 'simple' | 'complex' | 'gourmet') => {
    setUiPreferences(prev => ({ ...prev, canningRecipeFilter: filter }));
  }, []);

  const setCanningRecipeSort = useCallback((sort: 'name' | 'profit' | 'time' | 'difficulty') => {
    setUiPreferences(prev => ({ ...prev, canningRecipeSort: sort }));
  }, []);

  // Import save handler: triggers file input
  const handleImportSave = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  // File input change handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        console.log('Import: Loaded data from file:', data);
        
        // Validate and migrate data with canning support
        if (!validateCanningImport(data)) {
          console.error('Import: Validation failed for data:', data);
          alert("Invalid save file format.");
          return;
        }
        console.log('Import: Data validation passed');
        
        // Save the imported data to localStorage
        console.log('Import: About to save data:', data);
        saveGameStateWithCanning(data);
        console.log('Import: Data saved to localStorage');
        
        // Verify it was saved correctly
        const verification = loadGameStateWithCanning();
        console.log('Import: Verification load from localStorage:', verification);
        
        // Also check raw localStorage to make sure it's actually there
        const rawStored = localStorage.getItem('farmIdleGameState');
        console.log('Import: Raw localStorage after save:', rawStored ? JSON.parse(rawStored) : 'null');
        
        // Reload the page to reinitialize all systems with imported data
        alert("Save imported successfully! The page will reload to apply all changes.");
        window.location.reload();
        
      } catch (error) {
        console.error('Import: Error during import:', error);
        alert("Failed to import save file.");
      }
    };
    reader.readAsText(file);
  };
  // Returns a serializable snapshot of the current game state
  const getSerializableGameState = () => ({
    veggies,
    money,
    experience,
    knowledge,
    activeVeggie,
    day,
    globalAutoPurchaseTimer,
    greenhouseOwned,
    heirloomOwned,
    autoSellOwned,
    almanacLevel,
    almanacCost,
    maxPlots,
    farmTier,
    irrigationOwned,
    currentWeather,
    canningState,
    // Optionally add a version for future compatibility
    saveVersion: 2
  });

  // Export save handler
  const handleExportSave = () => {
    const saveData = getSerializableGameState();
    // Add timestamp and format filename
    const date = new Date();
    const timestamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}`;
    const filename = `farm-idle-save_${timestamp}.json`;
    
    const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  // Reset game handler for UI button or logic
  const handleResetGame = () => {
    if (window.confirm('Are you sure you want to reset your game? This will erase all progress!')) {
      resetGame();
    }
  };
  const { resetGame, veggies, setVeggies, money, setMoney, setExperience, experience, knowledge, setKnowledge, activeVeggie, day, setDay, globalAutoPurchaseTimer, setActiveVeggie, handleHarvest, handleToggleSell, handleSell, handleBuyFertilizer, handleBuyHarvester, handleBuyBetterSeeds, greenhouseOwned, setGreenhouseOwned, handleBuyGreenhouse, handleBuyHarvesterSpeed, heirloomOwned, setHeirloomOwned, handleBuyHeirloom, autoSellOwned, setAutoSellOwned, handleBuyAutoSell, almanacLevel, setAlmanacLevel, almanacCost, setAlmanacCost, handleBuyAlmanac, handleBuyAdditionalPlot, maxPlots, setMaxPlots, farmCost, setFarmCost, handleBuyLargerFarm, farmTier, setFarmTier, irrigationOwned, setIrrigationOwned, irrigationCost, irrigationKnCost, handleBuyIrrigation, currentWeather, setCurrentWeather, highestUnlockedVeggie, handleBuyAutoPurchaser, heirloomMoneyCost, heirloomKnowledgeCost } = useGame();

  // Initialize canning system
  const {
    canningState,
    startCanning,
    completeCanning,
    purchaseUpgrade,
    canMakeRecipe,
    toggleAutoCanning
  } = useCanningSystem(experience, veggies, setVeggies, money, setMoney, knowledge, setKnowledge, initialCanningState, uiPreferences.canningRecipeSort);

  // Check if canning is unlocked (first recipe unlocks at 5,000 experience)
  const canningUnlocked = experience >= 5000;

  // Detect if we just loaded imported data (prevent immediate auto-save)
  useEffect(() => {
    // If experience is significantly high, we likely just imported data
    if (experience > 10000) {
      console.log('Detected imported data with experience:', experience);
      justImportedRef.current = true;
      // Reset the flag after a short delay to allow normal auto-saving later
      setTimeout(() => {
        console.log('Re-enabling auto-save after import delay');
        justImportedRef.current = false;
      }, 5000);
    }
  }, [experience]);

  // Throttled save system - save at most once every 30 seconds
  const saveTimeoutRef = useRef<number | null>(null);
  const lastSaveTimeRef = useRef<number>(Date.now());
  const pendingSaveRef = useRef<boolean>(false);
  const justImportedRef = useRef<boolean>(false);

  const performSave = useCallback(() => {
    // Don't auto-save if we just imported data
    if (justImportedRef.current) {
      console.log('Skipping auto-save because data was just imported');
      justImportedRef.current = false;
      return;
    }
    
    if (canningState) {
      console.log('Saving canning state:', {
        upgradeCount: canningState.upgrades?.length,
        recipeCount: canningState.recipes?.length,
        unlockedRecipeCount: canningState.unlockedRecipes?.length,
        canningExperience: canningState.canningExperience,
        totalItemsCanned: canningState.totalItemsCanned
      });
      const gameState = {
        veggies,
        money,
        experience,
        knowledge,
        activeVeggie,
        day,
        globalAutoPurchaseTimer,
        greenhouseOwned,
        heirloomOwned,
        autoSellOwned,
        almanacLevel,
        almanacCost,
        maxPlots,
        farmTier,
        farmCost,
        irrigationOwned,
        currentWeather,
        highestUnlockedVeggie,
        canningState,
        uiPreferences
      };
      saveGameStateWithCanning(gameState);
      lastSaveTimeRef.current = Date.now();
      pendingSaveRef.current = false;
    }
  }, [canningState, uiPreferences, veggies, money, experience, knowledge, activeVeggie, day, globalAutoPurchaseTimer, greenhouseOwned, heirloomOwned, autoSellOwned, almanacLevel, almanacCost, maxPlots, farmTier, farmCost, irrigationOwned, currentWeather, highestUnlockedVeggie]);

  // Throttled save effect
  useEffect(() => {
    const now = Date.now();
    const timeSinceLastSave = now - lastSaveTimeRef.current;
    
    // If it's been more than 30 seconds since last save, save immediately
    if (timeSinceLastSave >= 30000) {
      performSave();
    } else if (!pendingSaveRef.current) {
      // Otherwise, schedule a save for when the 30 second window is up
      pendingSaveRef.current = true;
      const timeUntilNextSave = 30000 - timeSinceLastSave;
      
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        performSave();
      }, timeUntilNextSave);
    }
  }, [performSave]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Force save on page unload (refresh/close)
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Force immediate save if there are pending changes
      if (pendingSaveRef.current || Date.now() - lastSaveTimeRef.current >= 30000) {
        performSave();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [performSave]);

  // Reset tab to growing if canning becomes locked while on canning tab
  useEffect(() => {
    if (activeTab === 'canning' && !canningUnlocked) {
      setActiveTab('growing');
    }
  }, [activeTab, canningUnlocked]);

  // // Debug buttons for testing
  // const handleAddDebugMoney = () => {
  //   setMoney((prev) => prev + 15000);
  // };
  // const handleAddDebugExperience = () => {
  //   setExperience((prev) => prev + 100);
  // }
  // const handleAddDebugKnowledge = () => {
  //   setKnowledge((prev) => prev + 10000);
  // }
  const season = getSeason(day);
  // Calculate totalPlotsUsed for UI
  const totalPlotsUsed = veggies.filter(v => v.unlocked).length + veggies.reduce((sum, v) => sum + (v.additionalPlotLevel || 0), 0);
  // Weather event logic: Rain and Drought, based on seasonal chance
  const rainDaysRef = useRef(0);
  const droughtDaysRef = useRef(0);
  const stormDaysRef = useRef(0);
  const heatwaveDaysRef = useRef(0);
  useEffect(() => {
  const rainChance = RAIN_CHANCES[season] ?? 0.2;
  const droughtChance = DROUGHT_CHANCES[season] ?? 0.03;
  const stormChance = STORM_CHANCES[season] ?? 0.03;
  const heatwaveChance = 0.01; // Example: 1% chance per day
    // Only roll for events if weather is clear
    if (currentWeather === 'Clear') {
      const roll = Math.random();
      if (roll < rainChance) {
        if(season === 'Winter') {
          setCurrentWeather('Snow');
        } else {
          setCurrentWeather('Rain');
        }
        rainDaysRef.current = 1;
        droughtDaysRef.current = 0;
        stormDaysRef.current = 0;
        heatwaveDaysRef.current = 0;
      } else if (roll < rainChance + droughtChance) {
        setCurrentWeather('Drought');
        droughtDaysRef.current = 1;
        rainDaysRef.current = 0;
        stormDaysRef.current = 0;
        heatwaveDaysRef.current = 0;
      } else if (roll < rainChance + droughtChance + stormChance) {
        setCurrentWeather('Storm');
        stormDaysRef.current = 1;
        rainDaysRef.current = 0;
        droughtDaysRef.current = 0;
        heatwaveDaysRef.current = 0;
      } else if (roll < rainChance + droughtChance + stormChance + heatwaveChance) {
        setCurrentWeather('Heatwave');
        heatwaveDaysRef.current = 1;
        rainDaysRef.current = 0;
        droughtDaysRef.current = 0;
        stormDaysRef.current = 0;
      } else {
        rainDaysRef.current = 0;
        droughtDaysRef.current = 0;
        stormDaysRef.current = 0;
        heatwaveDaysRef.current = 0;
      }
    }
    // If it's rain, after 3 days revert to clear
    if (currentWeather === 'Rain' || currentWeather === 'Snow') {
      rainDaysRef.current++;
      if (rainDaysRef.current > 3) {
        setCurrentWeather('Clear');
        rainDaysRef.current = 0;
      }
    }
    // If it's drought, add knowledge and revert after N days
    if (currentWeather === 'Drought') {
      setKnowledge((k: number) => k + 1);
      droughtDaysRef.current++;
      if (droughtDaysRef.current > 5) {
        setCurrentWeather('Clear');
        droughtDaysRef.current = 0;
      }
    }
    // If it's storm, after 2 days revert to clear
    if (currentWeather === 'Storm') {
      stormDaysRef.current++;
      if (stormDaysRef.current > 2) {
        setCurrentWeather('Clear');
        stormDaysRef.current = 0;
      }
    }
    // If it's heatwave, after 4 days revert to clear
    if (currentWeather === 'Heatwave') {
      heatwaveDaysRef.current++;
      if (heatwaveDaysRef.current > 4) {
        // If heatwave was in summer, trigger drought next
        if (season === 'Summer') {
          setCurrentWeather('Drought');
          droughtDaysRef.current = 1;
          rainDaysRef.current = 0;
          stormDaysRef.current = 0;
          heatwaveDaysRef.current = 0;
        } else {
          setCurrentWeather('Clear');
          heatwaveDaysRef.current = 0;
        }
      }
    }
  }, [day, season, currentWeather]);
  const v = veggies[activeVeggie];
  const growthMultiplier = getVeggieGrowthBonus(
    v,
    season,
    currentWeather,
    greenhouseOwned,
    irrigationOwned
  );
  const daysToGrow = growthMultiplier > 0 ? Math.ceil(100 / growthMultiplier) : 0;

  // Preload all images to prevent loading delays when switching tabs
  useEffect(() => {
    const allImages = [
      // Tab and UI icons
      './Growing.png', './Canning.png', './Plots.png', './Money.png', './Knowledge.png', './Experience.png',
      
      // Season images
      './spring.png', './summer.png', './fall.png', './winter.png',
      
      // Weather images
      './Clear.png', './Rain.png', './Drought.png', './Storm.png', './Heatwave.png', './Snow.png',
      
      // All vegetable images
      './Radish.png', './Carrots.png', './Broccoli.png', './Lettuce.png', './Onions.png', 
      './Tomatoes.png', './Peppers.png', './Cucumbers.png', './Green Beans.png', './Zucchini.png',
      
      // Growing tab upgrade images
      './Fertilizer.png', './Better Seeds.png', './Additional Plot.png', './Auto Harvester.png', './Harvester Speed.png',
      './Farmer\'s Almanac.png', './Irrigation.png', './Merchant.png', './Greenhouse.png', './Heirloom Seeds.png',
      
      // Auto-purchaser images
      './Assistant.png', './Cultivator.png', './Surveyor.png', './Mechanic.png',
      
      // Canning upgrade images
      './Quick Hands.png', './Family Recipe.png', './Heirloom Touch.png', './Batch Canning.png', './Canner.png',
      
      // Special images
      './Archie.png'
    ];

    // Preload using both methods for maximum browser compatibility
    allImages.forEach(src => {
      // Method 1: Create Image object for immediate loading
      const img = new Image();
      img.src = src;
      
      // Method 2: Add preload link for better caching
      if (!document.querySelector(`link[href="${src}"]`)) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = src;
        document.head.appendChild(link);
      }
    });

    console.log('All images preloading started');
  }, []); // Only run once on mount

  return (
    <>
      <input 
      type="file" 
      ref={fileInputRef} 
      style={{ display: 'none' }} 
      onChange={handleFileChange} 
      accept=".json"
    />
    <ArchieIcon setMoney={setMoney} money={money} experience={experience} totalPlotsUsed={totalPlotsUsed} />
    <div className="container" style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', minWidth: '1200px' }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
          {/* <h1 className="game-title" style={{ marginRight: '1rem' }}>Farm Idle Game</h1> */}
          {/* <button
            onClick={handleAddDebugMoney}
            style={{ fontSize: '0.85rem', padding: '2px 10px', marginLeft: '0.5rem', background: '#228833', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', height: '28px' }}
            title="Add $15000 (Debug)"
          >
            Add $15000 (Debug)
          </button>
          <button
            onClick={handleAddDebugExperience}
            style={{ fontSize: '0.85rem', padding: '2px 10px', marginLeft: '0.5rem', background: '#228899', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', height: '28px' }}
            title="Add 10 Exp (Debug)"
          >
            Add 100 Exp (Debug)
          </button>
          <button
            onClick={handleAddDebugKnowledge}
            style={{ fontSize: '0.85rem', padding: '2px 10px', marginLeft: '0.5rem', background: '#228899', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', height: '28px' }}
            title="Add 10000 Kn (Debug)"
          >
            Add 10000 Kn (Debug)
          </button> */}
          <button
            onClick={() => setShowInfoOverlay(true)}
            style={{ fontSize: '0.85rem', padding: '2px 10px', marginLeft: 'auto', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', height: '28px' }}
            title="Info - Game Help"
          >
            Info
          </button>
          <button
            onClick={() => setShowSettingsOverlay(true)}
            style={{ fontSize: '0.85rem', padding: '2px 10px', marginLeft: '0.5rem', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', height: '28px' }}
            title="Settings"
          >
            Settings
          </button>
        </div>
        <div className="day-counter">Day: {day} <span style={{marginLeft: '1rem', display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}>
          <img
            src={`./${season.toLowerCase()}.png`}
            alt={season}
            style={{ width: 28, height: 28, marginRight: 6, verticalAlign: 'middle', objectFit: 'contain' }}
          />
          {season}
          <span style={{ marginLeft: '1rem'}}></span>
          <img
            src={`./${currentWeather}.png`}
            alt={currentWeather}
            style={{ width: 28, height: 28, marginRight: 6, verticalAlign: 'middle', objectFit: 'contain' }}
          />
          <span>{currentWeather}</span>
        </span></div>
        <div style={{ marginBottom: '1rem' }} />
        <div className="stats under-title" style={{ display: 'inline-flex', verticalAlign: 'middle', alignItems: 'center', gap: '2rem', flexWrap: 'wrap', fontSize: '1.0rem', marginBottom: '1rem' }}>
            <span style={{ position: 'relative' }}>
              <img src="./Plots.png" alt="Plots" style={{ width: 22, height: 22, verticalAlign: 'middle', marginRight: 4 }} />
              Plots: {totalPlotsUsed} / {maxPlots}
              <div 
                style={{ 
                  display: 'inline-block',
                  marginLeft: '5px',
                  width: '16px', 
                  height: '16px', 
                  backgroundColor: totalPlotsUsed >= maxPlots ? '#ffe0e0' : '#e0ffe0', 
                  border: `1px solid ${totalPlotsUsed >= maxPlots ? '#ffaaaa' : '#aaffaa'}`,
                  borderRadius: '50%', 
                  textAlign: 'center', 
                  lineHeight: '14px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'help'
                }}
                title={totalPlotsUsed >= maxPlots ? 
                  'You\'ve reached your maximum plot limit! Buy a larger farm to unlock more plots for vegetables.' : 
                  'Each vegetable and additional plot uses one plot.' }
              >
              </div>
            </span>
            <span>
            <img src="./Money.png" alt="Money" style={{ width: 22, height: 22, verticalAlign: 'middle', marginRight: 4 }} />
            Money: ${formatNumber(money, 2)}
            </span>
            <span>
            <img src="./Knowledge.png" alt="Knowledge" style={{ width: 22, height: 22, verticalAlign: 'middle', marginRight: 4 }} />
            Knowledge: {knowledge.toFixed(2)}
            </span>
            <span>
              <button
                onClick={() => setShowAdvancedStash(true)}
                style={{
                  background: '#228833',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'background-color 0.2s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#1e6b2b'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#228833'}
                title="View detailed stash breakdown"
              >
                <img src="./Money.png" alt="Stash" style={{ width: 18, height: 18, objectFit: 'contain' }} />
                Stash: {veggies.reduce((sum, v) => sum + v.stash, 0)}
              </button>
            </span>
        </div>
        {/* Farm upgrade UI: show when maxPlots reached - Fixed height container to prevent layout shifts */}
        <div style={{ minHeight: totalPlotsUsed >= maxPlots ? 'auto' : '0', marginBottom: '1rem' }}>
          {totalPlotsUsed >= maxPlots && (
            <div>
              <button
                onClick={typeof handleBuyLargerFarm === 'function' ? handleBuyLargerFarm : undefined}
                disabled={money < farmCost}
                style={{ 
                display: 'inline-flex', 
                background: money >= farmCost ? '#2e7d32' : '#4a5568',
                padding: '.5rem', 
                gap: '1rem', 
                verticalAlign: 'middle', 
                fontSize: '1.0rem', 
                borderRadius: '8px', 
                textAlign: 'center', 
                maxWidth: 765,
                border: money >= farmCost ? '2px solid #ffeb3b' : '1px solid #718096',
                boxShadow: money >= farmCost ? '0 0 8px 2px #ffe066' : 'none',
                cursor: money >= farmCost ? 'pointer' : 'not-allowed',
                fontWeight: 'bold',
                marginTop: '0.5rem',
                marginBottom: '0.5rem',
                transition: 'all 0.2s',
                color: '#fff'
                }} 
                aria-label="Buy Larger Farm"
                title="New max plots formula: Current max plots + (Experience ÷ 100), capped at 2× current max plots. Example: 4 plots + (500 exp ÷ 100) = 8 plots maximum"
              >
              <span style={{ color: '#fff', marginTop: '0.55rem', marginBottom: '0.55rem' }}>
                <span style={{ color: '#a7f3d0', fontWeight: 'bold', marginLeft: '0.5rem' }}>Buy Larger Farm:</span> ${formatNumber(farmCost, 1)}
                <span style={{ color: '#a7f3d0', fontWeight: 'bold', marginLeft: '0.5rem' }}>New max plots:</span> {Math.min(maxPlots + Math.floor(experience / 100), maxPlots * 2)}
                {(maxPlots + Math.floor(experience / 100)) > (maxPlots * 2) && (
                <span style={{ color: '#fbbf24', fontSize: '0.9rem', marginLeft: '0.5rem' }}>(capped at 2x current)</span>
                )}
                <div />
                <span style={{ color: '#a7f3d0', fontWeight: 'bold', marginLeft: '0.5rem' }}>Knowledge+:</span> +{((1.25 * ((typeof farmTier !== 'undefined' ? farmTier : 1)))).toFixed(2)} Kn/harvest
                <span style={{ color: '#a7f3d0', fontWeight: 'bold', marginLeft: '0.5rem' }}>Money/Knowledge kept:</span> ${money > farmCost ? formatNumber(money - farmCost, 1) : 0} / {knowledge / 3 > 0 ? formatNumber(Math.floor(knowledge / 3), 1) : 0}n
                {/* <span style={{ color: '#a7f3d0', fontWeight: 'bold', marginLeft: '0.5rem' }}></span>  */}
              </span>
              </button>
            </div>
          )}
        </div>
        <div style={{ marginBottom: '1rem' }} />
          
          {/* Tab Navigation */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid #444' }}>
              <button
                onClick={() => setActiveTab('growing')}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: activeTab === 'growing' ? '#4caf50' : '#333',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px 8px 0 0',
                  cursor: 'pointer',
                  fontWeight: activeTab === 'growing' ? 'bold' : 'normal',
                  fontSize: '1rem',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <img src="./Growing.png" alt="Growing" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                Growing
              </button>
              <button
                onClick={() => canningUnlocked ? setActiveTab('canning') : null}
                disabled={!canningUnlocked}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: canningUnlocked 
                    ? (activeTab === 'canning' ? '#ff8503' : '#333')
                    : '#666',
                  color: canningUnlocked ? '#fff' : '#bbb',
                  border: 'none',
                  borderRadius: '8px 8px 0 0',
                  cursor: canningUnlocked ? 'pointer' : 'not-allowed',
                  fontWeight: activeTab === 'canning' ? 'bold' : 'normal',
                  fontSize: '1rem',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  flexDirection: 'column'
                }}
                title={canningUnlocked ? 'Canning System' : `Canning unlocks at ${Math.round(5000 - experience).toLocaleString()} more experience`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <img src="./Canning.png" alt="Canning" style={{ width: '20px', height: '20px', objectFit: 'contain', opacity: canningUnlocked ? 1 : 0.5 }} />
                  Canning
                </div>
                {!canningUnlocked && (
                    <div style={{ fontSize: '0.7rem', color: '#999', marginTop: '2px' }}>
                    Req: {Math.round(5000 - experience).toLocaleString()} exp
                    </div>
                )}
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'growing' && (
            <GrowingTab
              veggies={veggies}
              activeVeggie={activeVeggie}
              totalPlotsUsed={totalPlotsUsed}
              maxPlots={maxPlots}
              money={money}
              knowledge={knowledge}
              experience={experience}
              day={day}
              globalAutoPurchaseTimer={globalAutoPurchaseTimer}
              autoSellOwned={autoSellOwned}
              season={season}
              currentWeather={currentWeather}
              greenhouseOwned={greenhouseOwned}
              irrigationOwned={irrigationOwned}
              heirloomOwned={heirloomOwned}
              almanacLevel={almanacLevel}
              almanacCost={almanacCost}
              irrigationCost={irrigationCost}
              irrigationKnCost={irrigationKnCost}
              heirloomMoneyCost={heirloomMoneyCost}
              heirloomKnowledgeCost={heirloomKnowledgeCost}
              highestUnlockedVeggie={highestUnlockedVeggie}
              farmTier={farmTier}
              MERCHANT_DAYS={MERCHANT_DAYS}
              MERCHANT_COST={MERCHANT_COST}
              MERCHANT_KN_COST={MERCHANT_KN_COST}
              GREENHOUSE_COST_PER_PLOT={GREENHOUSE_COST_PER_PLOT}
              GREENHOUSE_KN_COST_PER_PLOT={GREENHOUSE_KN_COST_PER_PLOT}
              HEIRLOOM_COST_PER_VEGGIE={HEIRLOOM_COST_PER_VEGGIE}
              HEIRLOOM_KN_PER_VEGGIE={HEIRLOOM_KN_PER_VEGGIE}
              initialVeggies={initialVeggies}
              veggieSeasonBonuses={veggieSeasonBonuses}
              daysToGrow={daysToGrow}
              growthMultiplier={growthMultiplier}
              setActiveVeggie={setActiveVeggie}
              handleHarvest={handleHarvest}
              handleToggleSell={handleToggleSell}
              handleSell={handleSell}
              handleBuyFertilizer={handleBuyFertilizer}
              handleBuyHarvester={handleBuyHarvester}
              handleBuyBetterSeeds={handleBuyBetterSeeds}
              handleBuyAdditionalPlot={handleBuyAdditionalPlot}
              handleBuyHarvesterSpeed={handleBuyHarvesterSpeed}
              handleBuyAutoPurchaser={handleBuyAutoPurchaser}
              handleBuyAlmanac={handleBuyAlmanac}
              handleBuyIrrigation={handleBuyIrrigation}
              handleBuyAutoSell={handleBuyAutoSell}
              handleBuyGreenhouse={handleBuyGreenhouse}
              handleBuyHeirloom={handleBuyHeirloom}
              formatNumber={formatNumber}
            />
          )}


      
      {/* Canning Tab Content */}
      {activeTab === 'canning' && (
        <CanningTab
          canningState={canningState}
          canningUnlocked={canningUnlocked}
          veggies={veggies}
          money={money}
          knowledge={knowledge}
          startCanning={startCanning}
          completeCanning={completeCanning}
          canMakeRecipe={canMakeRecipe}
          purchaseUpgrade={purchaseUpgrade}
          toggleAutoCanning={toggleAutoCanning}
          recipeFilter={uiPreferences.canningRecipeFilter}
          recipeSort={uiPreferences.canningRecipeSort}
          onRecipeFilterChange={setCanningRecipeFilter}
          onRecipeSortChange={setCanningRecipeSort}
        />
      )}
      </div>
    </div>
    
    {/* Info Overlay */}
    {showInfoOverlay && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: '#ffffffff',
          borderRadius: '8px',
          padding: '20px',
          maxWidth: '800px',
          maxHeight: '600px',
          width: '90%',
          height: '80%',
          display: 'flex',
          flexDirection: 'row',
          overflow: 'hidden'
        }}>
          {/* Category Navigation */}
          <div style={{
            width: '200px',
            borderRight: '2px solid #e0e0e0',
            paddingRight: '15px',
            marginRight: '15px'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#333' }}>Game Help</h3>
            {[
              { id: 'seasons', label: 'Seasons & Weather' },
              { id: 'farm', label: 'Farm & Experience' },
              { id: 'veggies', label: 'Veggie Upgrades' },
              { id: 'upgrades', label: 'Farm Upgrades' },
              { id: 'autopurchase', label: 'Auto-Purchasers' }
            ].map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedInfoCategory(category.id)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px',
                  marginBottom: '5px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: selectedInfoCategory === category.id ? '#007bff' : '#f8f9fa',
                  color: selectedInfoCategory === category.id ? '#fff' : '#333',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {category.label}
              </button>
            ))}
          </div>
          
          {/* Content Area */}
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#333' }}>
                {selectedInfoCategory === 'seasons' && 'Seasons & Weather'}
                {selectedInfoCategory === 'farm' && 'Farm & Experience'}
                {selectedInfoCategory === 'veggies' && 'Veggie Upgrades'}
                {selectedInfoCategory === 'upgrades' && 'Farm Upgrades'}
                {selectedInfoCategory === 'autopurchase' && 'Auto-Purchasers'}
              </h3>
              <button
                onClick={() => setShowInfoOverlay(false)}
                style={{
                  padding: '5px 10px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: '#dc3545',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Close
              </button>
            </div>
            
            {/* Content based on selected category */}
            <div style={{ lineHeight: '1.6', color: '#555', textAlign: 'left' }}>
              {selectedInfoCategory === 'seasons' && (
                <div>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <img src="./Growing.png" alt="Growing" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                    Seasons
                  </h4>
                  <p>The game cycles through four seasons: <strong>Spring → Summer → Fall → Winter</strong>. Each season lasts ~90 days and affects how your vegetables grow.</p>
                  
                  <h5>Season Effects:</h5>
                  <ul>
                    <li><strong>Winter:</strong> 90% growth penalty (only 10% normal speed) unless you own a Greenhouse</li>
                    <li><strong>Spring/Summer/Fall:</strong> Normal growth rates</li>
                    <li><strong>Seasonal Bonuses:</strong> All vegetables get +10% growth during their preferred seasons</li>
                  </ul>
                  
                  <h5>Seasonal Vegetable Bonuses (+10% growth):</h5>
                  <ul>
                    <li><strong>Spring:</strong> Radish, Lettuce, Carrots, Cabbage, Onions</li>
                    <li><strong>Summer:</strong> Green Beans, Zucchini, Cucumbers, Tomatoes, Peppers</li>
                    <li><strong>Fall:</strong> Radish, Lettuce, Carrots, Broccoli, Cabbage</li>
                    <li><strong>Winter:</strong> No bonuses</li>
                  </ul>
                  
                  <h4>🌦️ Weather System</h4>
                  <p>Weather changes randomly each day with different probabilities by season:</p>
                  
                  <h5>Weather Effects:</h5>
                  <ul>
                    <li><strong>Clear:</strong> Normal growth (no bonus/penalty)</li>
                    <li><strong>Rain:</strong> +20% growth boost for all vegetables</li>
                    <li><strong>Storm:</strong> +10% growth boost for all vegetables</li>
                    <li><strong>Drought:</strong> -50% growth penalty unless you have Irrigation, +1 Kn per day</li>
                    <li><strong>Heatwave:</strong> -30% growth penalty in Summer, +20% bonus to summer vegetables in spring and fall, +20% bonus to all vegetables in winter</li>
                    <li><strong>Snow:</strong> 100% growth penalty (plants stop growing) unless you have a Greenhouse</li>
                  </ul>
                  
                  <h5>Weather Probabilities by Season:</h5>
                  <ul>
                    <li><strong>Rain Chances:</strong> Spring: 20% • Summer: 16% • Fall: 14% • Winter: 10%</li>
                    <li><strong>Drought Chances:</strong> Spring: 1.2% • Summer: 1.2% • Fall: 1.6% • Winter: 0.4%</li>
                    <li><strong>Storm Chances:</strong> Spring: 4% • Summer: 6% • Fall: 3% • Winter: 1%</li>
                    <li><strong>Heatwave Chances:</strong> 1% chance all year</li>
                  </ul>
                  
                  <h4>💡 Strategy Tips:</h4>
                  <ul>
                    <li><strong>Irrigation:</strong> Protects against Drought events</li>
                    <li><strong>Greenhouse:</strong> Essential upgrade! Eliminates Winter and Snow penalties</li>
                  </ul>
                </div>
              )}
              {selectedInfoCategory === 'farm' && (
                <div>
                  <h4>🎓 Experience System</h4>
                  <p>Experience is earned every time you harvest any vegetable. Each vegetable requires a certain amount of experience to unlock:</p>
                  
                  <h5>Vegetable Unlock Requirements:</h5>
                  <ul>
                    <li><strong>Radish:</strong> 0 exp (starting vegetable)</li>
                    <li><strong>Lettuce:</strong> 90 exp</li>
                    <li><strong>Green Beans:</strong> 162 exp</li>
                    <li><strong>Zucchini:</strong> 292 exp</li>
                    <li><strong>Cucumbers:</strong> 525 exp</li>
                    <li><strong>Tomatoes:</strong> 945 exp</li>
                    <li><strong>Peppers:</strong> 1,701 exp</li>
                    <li><strong>Carrots:</strong> 3,062 exp</li>
                    <li><strong>Broccoli:</strong> 5,512 exp</li>
                    <li><strong>Onions:</strong> 9,921 exp</li>
                  </ul>
                  <p><em>Formula: 50 × 1.8^(index) for each vegetable</em></p>
                  
                  <h4>🧠 Knowledge Currency</h4>
                  <p>Knowledge is a secondary currency earned from harvesting vegetables:</p>
                  
                  <h5>Knowledge Earning:</h5>
                  <ul>
                    <li><strong>Auto Harvest:</strong> +0.5 Knowledge per vegetable harvested</li>
                    <li><strong>Manual Harvest:</strong> +1 Knowledge per vegetable harvested</li>
                    <li><strong>Experience:</strong> Auto harvest gives 50% of the experience compared to manual harvest</li>
                    <li><strong>Farm Tier Bonus:</strong> +1.25 Knowledge per harvest per farm tier</li>
                    <li><strong>Farmer's Almanac:</strong> Multiplies ALL knowledge gains by (1 + level)</li>
                  </ul>
                  
                  <h5>Knowledge Uses:</h5>
                  <ul>
                    <li><strong>Current Knowledge:</strong> Current knowledge multiplies gained experience per harvest by 1%</li>
                    <li><strong>Better Seeds:</strong> Increases sale price (1.25x per level, 1.5x with Heirloom Seeds)</li>
                    <li><strong>Irrigation:</strong> 50 Knowledge + $500 (protects against Drought)</li>
                    <li><strong>Heirloom Seeds:</strong> Cost scales with highest unlocked veggie ever ($2,500 + 200 Knowledge per veggie level)</li>
                  </ul>
                  
                  <h4>🏡 Plot System</h4>
                  <p>Each vegetable can have multiple plots. More plots = more simultaneous growing!</p>
                  
                  <h5>Plot Limitations:</h5>
                  <ul>
                    <li><strong>Starting Plots:</strong> 4 total plots across ALL vegetables</li>
                    <li><strong>Additional Plots:</strong> Buy more plots per vegetable (costs money)</li>
                    <li><strong>Max Plots:</strong> Total plots cannot exceed your farm limit</li>
                    <li><strong>⚠️ IMPORTANT:</strong> Each unlocked vegetable AND each additional plot counts toward your plot limit</li>
                    <li><strong>Solution:</strong> Expand your farm when you reach the maximum plots to increase your limit</li>
                  </ul>
                  
                  <h4>🚜 Farm Expansion (Prestige)</h4>
                  <p>When you've used all available plots, you can buy a larger farm to reset progress but gain permanent bonuses:</p>
                  
                  <h5>Farm Purchase Requirements:</h5>
                  <ul>
                    <li><strong>Condition:</strong> Must have used ALL available plots</li>
                    <li><strong>Cost:</strong> $500 × 1.85^(farm tier) (exponential scaling)</li>
                    <li><strong>Base Cost:</strong> First farm costs $500, second costs $925, etc.</li>
                  </ul>
                  
                  <h5>What You Keep:</h5>
                  <ul>
                    <li><strong>Money:</strong> Leftover money after paying farm cost</li>
                    <li><strong>Knowledge:</strong> 25% of current knowledge (1/3 retention)</li>
                    <li><strong>Max Plots:</strong> Previous max + (experience ÷ 100) new plots (capped at 2x current max)</li>
                    <li><strong>Farm Tier:</strong> Permanent progression level</li>
                  </ul>
                  
                  <h5>What Resets:</h5>
                  <ul>
                    <li><strong>Experience:</strong> Back to 0 (must re-unlock vegetables)</li>
                    <li><strong>All Upgrades:</strong> Fertilizer, Harvesters, Speed, Better Seeds reset to 0</li>
                    <li><strong>Global Upgrades:</strong> Greenhouse, Irrigation, Almanac, Auto-Sell, Heirloom reset</li>
                    <li><strong>Current Progress:</strong> All growing vegetables and stashes cleared</li>
                  </ul>
                  
                  <h4>💡 Strategy Tips:</h4>
                  <ul>
                    <li><strong>Prestige Timing:</strong> Buy a new farm when you have excess money, experience and knowledge</li>
                    <li><strong>Knowledge Planning:</strong> Don't spend knowledge right away, as it boosts experience gain</li>
                    <li><strong>Focus on One Veggie:</strong> Usually better to max one vegetable than spread upgrades around</li>
                    <li><strong>Experience Scaling:</strong> Experience determines how many plots your new farm has so stockpile it before prestige</li>
                  </ul>
                </div>
              )}
              {selectedInfoCategory === 'veggies' && (
                <div>
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <img src="./Growing.png" alt="Growing" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                    Per-Vegetable Upgrades
                  </h4>
                  <p>Each vegetable has its own individual upgrades that only affect that specific crop:</p>
                  
                  <h5>🧪 Fertilizer (Growth Speed)</h5>
                  <ul>
                    <li><strong>Effect:</strong> +5% multiplicative growth rate per level</li>
                    <li><strong>Base Cost:</strong> $5 for Radish, scales by 1.4× per vegetable</li>
                    <li><strong>Level Scaling:</strong> Cost increases by 1.25× per level</li>
                    <li><strong>Max Levels:</strong> ~97-99 depending on vegetable</li>
                    <li><strong>Example:</strong> Level 10 = +50% growth (1.5× speed)</li>
                  </ul>
                  
                  <h5>🤖 Auto Harvester</h5>
                  <ul>
                    <li><strong>Function:</strong> Automatically harvests when vegetables reach 100% growth</li>
                    <li><strong>Base Timer:</strong> 50 seconds between harvest attempts</li>
                    <li><strong>Base Cost:</strong> $8 for Radish, scales by 1.5× per vegetable</li>
                    <li><strong>One-Time Purchase:</strong> No levels, just owned/not owned</li>
                    <li><strong>Knowledge:</strong> Auto harvest gives +0.5 Knowledge vs +1 for manual</li>
                    <li><strong>Experience:</strong> Auto harvest gives 50% of the experience compared to manual harvest</li>
                  </ul>
                  
                  <h5>⚡ Harvester Speed</h5>
                  <ul>
                    <li><strong>Effect:</strong> +5% harvester speed per level</li>
                    <li><strong>Formula:</strong> Timer = 50 ÷ (1 + level × 0.05) ticks</li>
                    <li><strong>Base Cost:</strong> $25 for Radish, scales by 1.5× per vegetable</li>
                    <li><strong>Level Scaling:</strong> Cost increases by 1.25× per level</li>
                    <li><strong>Example:</strong> Level 10 = 33 seconds between harvests</li>
                  </ul>
                  
                  <h5>📦 Additional Plots</h5>
                  <ul>
                    <li><strong>Effect:</strong> Each level adds +1 plot for that vegetable</li>
                    <li><strong>Harvesting:</strong> Each plot harvests +1 additional vegetable</li>
                    <li><strong>Base Cost:</strong> $20 for Radish, scales by 1.4× per vegetable</li>
                    <li><strong>Level Scaling:</strong> Cost increases by 1.5× per level</li>
                    <li><strong>Plot Limit:</strong> Total plots across ALL vegetables cannot exceed farm limit</li>
                  </ul>
                  
                  <h5>🌟 Better Seeds (Knowledge Upgrade)</h5>
                  <ul>
                    <li><strong>Effect:</strong> Increases sale price by 1.25× per level (1.5× with Heirloom Seeds)</li>
                    <li><strong>Currency:</strong> Costs Knowledge, not money</li>
                    <li><strong>Base Cost:</strong> 5 Knowledge for Radish, scales by 1.4× per vegetable</li>
                    <li><strong>Level Scaling:</strong> Cost increases by 1.5× per level</li>
                    <li><strong>Example:</strong> Level 3 Better Seeds = 1.95× sale price (2.92× with Heirloom)</li>
                  </ul>
                  
                  <h4>💡 Strategy Tips:</h4>
                  <ul>
                    <li><strong>Fertilizer Priority:</strong> Most cost-effective upgrade for increasing income</li>
                    <li><strong>Harvester First:</strong> Essential for idle gameplay and knowledge generation</li>
                    <li><strong>Plots vs New Vegetables:</strong> Buy more plots for a lower tier vegetable is often more beneficial than waiting for higher tier vegetables</li>
                    <li><strong>Better Seeds Timing:</strong> Save knowledge for the experience boost rather than immediate upgrades</li>
                    <li><strong>Focus Strategy:</strong> Usually better to max one vegetable than spread upgrades around</li>
                  </ul>
                </div>
              )}
              {selectedInfoCategory === 'upgrades' && (
                <div>
                  <h4>🏗️ Global Farm Upgrades</h4>
                  <p>These upgrades affect your entire farm and apply to all vegetables:</p>
                  
                  <h5>📚 Farmer's Almanac (Knowledge Multiplier)</h5>
                  <ul>
                    <li><strong>Effect:</strong> +10% to ALL knowledge gains per level</li>
                    <li><strong>Formula:</strong> Knowledge × (1 + almanac level × 0.10)</li>
                    <li><strong>Base Cost:</strong> $10</li>
                    <li><strong>Level Scaling:</strong> Cost = previous cost × 1.15 + $5</li>
                    <li><strong>Example:</strong> Level 5 Almanac = +50% knowledge from all sources</li>
                    <li><strong>Progression:</strong> $10 → $17 → $25 → $34 → $44...</li>
                  </ul>
                  
                  <h5>💧 Irrigation System</h5>
                  <ul>
                    <li><strong>Effect:</strong> Complete immunity to Drought weather penalty</li>
                    <li><strong>Cost:</strong> $500 + 50 Knowledge (one-time purchase, per farm)</li>
                    <li><strong>Weather Protection:</strong> Prevents -50% growth penalty during Drought</li>
                    <li><strong>Value:</strong> Essential for consistent growth rates</li>
                    <li><strong>Note:</strong> Resets when you buy a larger farm (prestige)</li>
                  </ul>

                  <h5>🏪 Merchant (Auto-Sell)</h5>
                  <ul>
                    <li><strong>Effect:</strong> Automatically sells vegetables from stash every day</li>
                    <li><strong>Cost:</strong> $1,000 + 100 Knowledge (one-time purchase, per farm)</li>
                    <li><strong>Timing:</strong> Triggers once per day at day transition</li>
                    <li><strong>Convenience:</strong> No need to manually click Sell All</li>
                    <li><strong>Value:</strong> Essential for idle gameplay progression</li>
                    <li><strong>Note:</strong> Resets when you buy a larger farm (prestige)</li>
                  </ul>

                  <h5>🏠 Greenhouse</h5>
                  <ul>
                    <li><strong>Effect:</strong> Complete immunity to Winter and Snow penalties</li>
                    <li><strong>Cost:</strong> ${formatNumber(GREENHOUSE_COST_PER_PLOT, 1)} + {GREENHOUSE_KN_COST_PER_PLOT} Knowledge per plot (scales with max plots)</li>
                    <li><strong>Winter Protection:</strong> Prevents -90% growth penalty in Winter</li>
                    <li><strong>Snow Protection:</strong> Prevents -100% growth penalty during Snow</li>
                    <li><strong>Value:</strong> Transforms Winter from terrible to normal growing season</li>
                    <li><strong>Note:</strong> Resets when you buy a larger farm (prestige)</li>
                  </ul>
                  
                  <h5>🌟 Heirloom Seeds</h5>
                  <ul>
                    <li><strong>Effect:</strong> Improves Better Seeds upgrade from 1.25× to 1.5× per level</li>
                    <li><strong>Cost:</strong> $2,500 + 200 Knowledge per highest vegetable unlocked</li>
                    <li><strong>Calculation:</strong> Each Better Seeds level gives 1.5× price instead of 1.25×</li>
                    <li><strong>Example:</strong> Better Seeds Level 3 = 1.95× without vs 3.375× with Heirloom</li>
                    <li><strong>Value:</strong> Massive late-game money multiplier</li>
                    <li><strong>Note:</strong> Resets when you buy a larger farm (prestige)</li>
                  </ul>
                  
                  <h4>💡 Strategy Tips:</h4>
                  <ul>
                    <li><strong>Knowledge Management:</strong> Knowledge factors into experience gain, so don't spend all of it at once.</li>
                  </ul>
                </div>
              )}
              {selectedInfoCategory === 'autopurchase' && (
                <div>
                  <h4>🤖 Auto-Purchaser System</h4>
                  <p>Auto-Purchasers automatically buy upgrades for you every 7 days when active and affordable. Each vegetable has its own set of auto-purchasers that operate independently.</p>
                  
                  <h5>🎯 How Auto-Purchasers Work:</h5>
                  <ul>
                    <li><strong>Timer:</strong> All auto-purchasers share a unified 7-day cycle timer</li>
                    <li><strong>Purchase Check:</strong> When timer reaches 0, each active auto-purchaser attempts to buy its upgrade</li>
                    <li><strong>Currency Check:</strong> Purchase only happens if you have enough money or knowledge</li>
                    <li><strong>Automatic Reset:</strong> Timer restarts for another 7-day cycle</li>
                    <li><strong>Per-Vegetable:</strong> Each vegetable has independent auto-purchasers</li>
                    <li><strong>Manual Control:</strong> You can toggle each auto-purchaser ON/OFF at any time after purchase</li>
                      </ul>
                      
                      <h5>🎯 Purchase Priority System:</h5>
                      <ul>
                      <li><strong>Vegetable Order:</strong> Radish → Lettuce → Green Beans → Zucchini → Cucumbers → Tomatoes → Peppers → Carrots → Broccoli → Onions</li>
                      <li><strong>Auto-Purchaser Order:</strong> Assistant → Cultivator → Surveyor → Mechanic</li>
                      <li><strong>How it Works:</strong> All active auto-purchasers attempt purchases simultaneously every 7 days</li>
                      <li><strong>Currency Limits:</strong> If multiple auto-purchasers need the same currency, earlier vegetables get priority</li>
                  </ul>

                  <h5>🤝 Assistant</h5>
                  <ul>
                    <li><strong>Purchases:</strong> Upgrades Fertilizer automatically</li>
                    <li><strong>Currency:</strong> Uses Money ($)</li>
                    <li><strong>Benefit:</strong> Continuously improves growth speed without manual clicking</li>
                    <li><strong>Strategy:</strong> Essential for idle progression on fertilizer</li>
                  </ul>

                  <h5>🧑‍🌾 Cultivator</h5>
                  <ul>
                    <li><strong>Purchases:</strong> Upgrades Better Seeds automatically</li>
                    <li><strong>Currency:</strong> Uses Knowledge (Kn)</li>
                    <li><strong>Benefit:</strong> Automatically increases sale prices for better profits</li>
                    <li><strong>Strategy:</strong> Crucial for scaling income without manual management</li>
                  </ul>

                  <h5>🗺️ Surveyor</h5>
                  <ul>
                    <li><strong>Purchases:</strong> Upgrades Additional Plot automatically</li>
                    <li><strong>Currency:</strong> Uses Money ($)</li>
                    <li><strong>Benefit:</strong> Automatically expands production capacity</li>
                    <li><strong>Strategy:</strong> Increases vegetables per harvest for exponential growth</li>
                  </ul>

                  <h5>🔧 Mechanic</h5>
                  <ul>
                    <li><strong>Purchases:</strong> Upgrades Harvester Speed automatically</li>
                    <li><strong>Currency:</strong> Uses Money ($)</li>
                    <li><strong>Benefit:</strong> Automatically improves auto-harvester efficiency</li>
                    <li><strong>Strategy:</strong> Only useful after buying the Auto Harvester</li>
                  </ul>

                  <h5>🎮 Button States & Visual Guide:</h5>
                  <ul>
                    <li><strong>Gray Button:</strong> Not purchased and can't afford</li>
                    <li><strong>Yellow Glow:</strong> Not purchased but affordable - click to buy!</li>
                    <li><strong>Green Button:</strong> Purchased and currently ON</li>
                    <li><strong>Red Button:</strong> Purchased but currently OFF</li>
                  </ul>

                  <h4>💡 Auto-Purchaser Strategy:</h4>
                  <ul>
                    <li><strong>Early Game:</strong> Buy Assistant first for consistent fertilizer upgrades</li>
                    <li><strong>Knowledge Phase:</strong> Add Cultivator when you have steady knowledge income</li>
                    <li><strong>Expansion Phase:</strong> Get Surveyor to automatically increase production</li>
                    <li><strong>Late Game:</strong> Add Mechanic after buying Auto Harvester for full automation</li>
                    <li><strong>Active Management:</strong> Turn off auto-purchasers if you need to save currency for big purchases</li>
                    <li><strong>Per-Vegetable Setup:</strong> Remember to activate auto-purchasers on each new vegetable you unlock</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )}
    
    {/* Settings Overlay */}
    {showSettingsOverlay && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: '#ffffffff',
          borderRadius: '8px',
          padding: '20px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '400px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, color: '#333' }}>Settings</h3>
            <button
              onClick={() => setShowSettingsOverlay(false)}
              style={{
                padding: '5px 10px',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: '#dc3545',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Close
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>Save Management</h4>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  onClick={handleExportSave}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '4px',
                    backgroundColor: '#1976d2',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Export Save
                </button>
                <button
                  onClick={handleImportSave}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '4px',
                    backgroundColor: '#8819d2ff',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Import Save
                </button>
              </div>
            </div>
            
            <div>
              <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>Sound Settings</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
                <label style={{ fontSize: '14px', color: '#333' }}>Sound Effects:</label>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  style={{
                    padding: '6px 12px',
                    border: 'none',
                    borderRadius: '4px',
                    backgroundColor: soundEnabled ? '#28a745' : '#dc3545',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  {soundEnabled ? '🔊 ON' : '🔇 OFF'}
                </button>
              </div>
            </div>
            
            <div>
              <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>Game Actions</h4>
              <button
                onClick={() => {
                  setShowSettingsOverlay(false);
                  handleResetGame();
                }}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: '#dc3545',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Reset Game
              </button>
              <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#666' }}>
                This will permanently delete all progress!
              </p>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Advanced Stash Display Overlay */}
    <AdvancedStashDisplay
      visible={showAdvancedStash}
      onClose={() => setShowAdvancedStash(false)}
      veggies={veggies}
      greenhouseOwned={greenhouseOwned}
      irrigationOwned={irrigationOwned}
      day={day}
      onToggleSell={handleToggleSell}
    />
    </>
  );
}

export default App;
export { GameProvider, GameContext };
