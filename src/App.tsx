// Returns the effective growth per tick for a veggie, factoring all bonuses/penalties
function getVeggieGrowthBonus(
  v: Veggie,
  season: string,
  currentWeather: string,
  greenhouseOwned: boolean,
  irrigationOwned: boolean
): number {
  let growthAmount = v.growthRate;
  // Fertilizer bonus
  growthAmount += v.fertilizerLevel * 0.1;
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
    growthAmount *= 0.7; // 30% penalty
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
import { useEffect, useRef, useState, createContext, useContext } from 'react';
import ProgressBar from './components/ProgressBar';
import './App.css';

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
};

const SEASON_BONUS = 0.1; // 10% bonus, adjustable

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
  return Math.floor(50 * Math.pow(1.8, index));
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

const initialVeggies: Veggie[] = [
  { name: 'Radish', growth: 0, growthRate: 2.5, stash: 0, unlocked: true, experience: 0, experienceToUnlock: calculateExpRequirement(0), fertilizerLevel: 0, fertilizerCost: calculateInitialCost('fertilizer', 0), harvesterOwned: false, harvesterCost: calculateInitialCost('harvester', 0), harvesterTimer: 0, salePrice: 1, betterSeedsLevel: 0, betterSeedsCost: calculateInitialCost('betterSeeds', 0), harvesterSpeedLevel: 0, harvesterSpeedCost: calculateInitialCost('harvesterSpeed', 0), additionalPlotLevel: 0, additionalPlotCost: calculateInitialCost('additionalPlot', 0), fertilizerMaxLevel: 97 },
  { name: 'Lettuce', growth: 0, growthRate: 1.4286, stash: 0, unlocked: false, experience: 0, experienceToUnlock: calculateExpRequirement(1), fertilizerLevel: 0, fertilizerCost: 20, harvesterOwned: false, harvesterCost: 30, harvesterTimer: 0, salePrice: 2, betterSeedsLevel: 0, betterSeedsCost: 20, harvesterSpeedLevel: 0, harvesterSpeedCost: 100, additionalPlotLevel: 0, additionalPlotCost: 80, fertilizerMaxLevel: 99 },
  { name: 'Green Beans', growth: 0, growthRate: 1.4286, stash: 0, unlocked: false, experience: 0, experienceToUnlock: calculateExpRequirement(2), fertilizerLevel: 0, fertilizerCost: 30, harvesterOwned: false, harvesterCost: 60, harvesterTimer: 0, salePrice: 3, betterSeedsLevel: 0, betterSeedsCost: 30, harvesterSpeedLevel: 0, harvesterSpeedCost: 200, additionalPlotLevel: 0, additionalPlotCost: 120, fertilizerMaxLevel: 98 },
  { name: 'Zucchini', growth: 0, growthRate: 1.4286, stash: 0, unlocked: false, experience: 0, experienceToUnlock: calculateExpRequirement(3), fertilizerLevel: 0, fertilizerCost: 40, harvesterOwned: false, harvesterCost: 120, harvesterTimer: 0, salePrice: 4, betterSeedsLevel: 0, betterSeedsCost: 40, harvesterSpeedLevel: 0, harvesterSpeedCost: 400, additionalPlotLevel: 0, additionalPlotCost: 160, fertilizerMaxLevel: 98 },
  { name: 'Cucumbers', growth: 0, growthRate: 1.25, stash: 0, unlocked: false, experience: 0, experienceToUnlock: calculateExpRequirement(4), fertilizerLevel: 0, fertilizerCost: 50, harvesterOwned: false, harvesterCost: 240, harvesterTimer: 0, salePrice: 5, betterSeedsLevel: 0, betterSeedsCost: 50, harvesterSpeedLevel: 0, harvesterSpeedCost: 800, additionalPlotLevel: 0, additionalPlotCost: 240, fertilizerMaxLevel: 99 },
  { name: 'Tomatoes', growth: 0, growthRate: 1.0526, stash: 0, unlocked: false, experience: 0, experienceToUnlock: calculateExpRequirement(5), fertilizerLevel: 0, fertilizerCost: 60, harvesterOwned: false, harvesterCost: 480, harvesterTimer: 0, salePrice: 6, betterSeedsLevel: 0, betterSeedsCost: 60, harvesterSpeedLevel: 0, harvesterSpeedCost: 1600, additionalPlotLevel: 0, additionalPlotCost: 480, fertilizerMaxLevel: 99 },
  { name: 'Peppers', growth: 0, growthRate: 1, stash: 0, unlocked: false, experience: 0, experienceToUnlock: calculateExpRequirement(6), fertilizerLevel: 0, fertilizerCost: 70, harvesterOwned: false, harvesterCost: 960, harvesterTimer: 0, salePrice: 7, betterSeedsLevel: 0, betterSeedsCost: 70, harvesterSpeedLevel: 0, harvesterSpeedCost: 3200, additionalPlotLevel: 0, additionalPlotCost: 960, fertilizerMaxLevel: 99 },
  { name: 'Carrots', growth: 0, growthRate: 1.1111, stash: 0, unlocked: false, experience: 0, experienceToUnlock: calculateExpRequirement(7), fertilizerLevel: 0, fertilizerCost: 80, harvesterOwned: false, harvesterCost: 1920, harvesterTimer: 0, salePrice: 8, betterSeedsLevel: 0, betterSeedsCost: 80, harvesterSpeedLevel: 0, harvesterSpeedCost: 6400, additionalPlotLevel: 0, additionalPlotCost: 1920, fertilizerMaxLevel: 99 },
  { name: 'Broccoli', growth: 0, growthRate: 1, stash: 0, unlocked: false, experience: 0, experienceToUnlock: calculateExpRequirement(8), fertilizerLevel: 0, fertilizerCost: 90, harvesterOwned: false, harvesterCost: 3840, harvesterTimer: 0, salePrice: 9, betterSeedsLevel: 0, betterSeedsCost: 90, harvesterSpeedLevel: 0, harvesterSpeedCost: 12800, additionalPlotLevel: 0, additionalPlotCost: 3840, fertilizerMaxLevel: 99 },
  { name: 'Onions', growth: 0, growthRate: 0.7692, stash: 0, unlocked: false, experience: 0, experienceToUnlock: calculateExpRequirement(9), fertilizerLevel: 0, fertilizerCost: 100, harvesterOwned: false, harvesterCost: 7680, harvesterTimer: 0, salePrice: 10, betterSeedsLevel: 0, betterSeedsCost: 100, harvesterSpeedLevel: 0, harvesterSpeedCost: 25600, additionalPlotLevel: 0, additionalPlotCost: 7680, fertilizerMaxLevel: 99 },
];

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
  setActiveVeggie: (i: number) => void;
  handleHarvest: () => void;
  handleSell: () => void;
  handleBuyFertilizer: (index: number) => void;
  handleBuyHarvester: (index: number) => void;
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

function loadGameState() {
  try {
    const raw = localStorage.getItem(GAME_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveGameState(state: any) {
  try {
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const irrigationCost = 500;
  const irrigationKnCost = 50;
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
  const loaded = loadGameState();
  // Track farm tier (number of times farm has been purchased)
  const [farmTier, setFarmTier] = useState<number>(loaded?.farmTier ?? 1);
  const [irrigationOwned, setIrrigationOwned] = useState(loaded?.irrigationOwned ?? false);
  // Farm purchase/reset logic
  const FARM_BASE_COST = 500;
  const [farmCost, setFarmCost] = useState<number>(FARM_BASE_COST);
  const handleBuyLargerFarm = () => {
    // Only allow if enough money and maxPlots reached
    if (money < farmCost || totalPlotsUsed < maxPlots) return;
    // Calculate new maxPlots
    const newMaxPlots = maxPlots + Math.floor(experience / 100);
    // Calculate money to keep
    const moneyKept = money - farmCost;
    // Calculate new farm tier
    const newFarmTier = farmTier + 1;
    // Save current state of irrigation
    // Static knowledge multiplier bonus per farm tier is applied globally in knowledge gain
    // Reset game state, but keep moneyKept, newMaxPlots, newFarmTier and irrigation
    setVeggies(initialVeggies.map(v => ({ ...v })));
    setMoney(moneyKept > 0 ? moneyKept : 0);
    setExperience(0);
    setKnowledge(0);
    setActiveVeggie(0);
    setDay(0);
    setGreenhouseOwned(false);
    setAlmanacLevel(0);
    setAlmanacCost(10);
    setAutoSellOwned(false);
    setHeirloomOwned(false);
    setMaxPlots(newMaxPlots);
    setFarmTier(newFarmTier);
    setIrrigationOwned(irrigationOwned); // Preserve irrigation state
    setFarmCost(Math.ceil(FARM_BASE_COST * Math.pow(1.85, newFarmTier - 1))); // Increase cost for next farm, exponential scaling
    // Save to localStorage
    saveGameState({
      veggies: initialVeggies.map(v => ({ ...v })),
      money: moneyKept > 0 ? moneyKept : 0,
      experience: 0,
      knowledge: 0,
      activeVeggie: 0,
      day: 0,
      greenhouseOwned: false,
      heirloomOwned: false,
      autoSellOwned: false,
      almanacLevel: 0,
      almanacCost: 10,
      maxPlots: newMaxPlots,
      farmTier: newFarmTier,
      irrigationOwned: irrigationOwned,
      currentWeather: 'Clear' // Reset weather when resetting
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
    if (!autoSellOwned && money >= 1000 && knowledge >= 100) {
      setMoney((m: number) => m - 1000);
      setKnowledge((k: number) => k - 100);
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
    currentWeather: 'Clear'
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
    if (!heirloomOwned && money >= 25000 && knowledge >= 2000) {
      setMoney((m: number) => m - 25000);
      setKnowledge((k: number) => k - 2000);
      setHeirloomOwned(true);
    }
  };
  const [veggies, setVeggies] = useState<Veggie[]>(loaded?.veggies ?? initialVeggies);
  const [money, setMoney] = useState(loaded?.money ?? 0);
  // Helper: total plots used (unlocked veggies + additional plots)
  const totalPlotsUsed = veggies.filter(v => v.unlocked).length + veggies.reduce((sum, v) => sum + (v.additionalPlotLevel || 0), 0);  
  const [experience, setExperience] = useState(loaded?.experience ?? 0);
  const [knowledge, setKnowledge] = useState(loaded?.knowledge ?? 0);
  const [activeVeggie, setActiveVeggie] = useState(loaded?.activeVeggie ?? 0);
  const [day, setDay] = useState(loaded?.day ?? 0);
  // Change browser tab title if any veggie is ready to harvest
  useEffect(() => {
    if (veggies.some(v => v.growth >= 100)) {
      document.title = '🌱 Farm Idle Game';
    } else {
      document.title = 'Farm Idle Game';
    }
  }, [veggies]);
  // Save game state on any change
  useEffect(() => {
  saveGameState({
    veggies,
    money,
    experience,
    knowledge,
    activeVeggie,
    day,
    greenhouseOwned,
    heirloomOwned,
    autoSellOwned,
    almanacLevel,
    almanacCost,
    maxPlots,
    farmTier,
    irrigationOwned,
    currentWeather
  });
  }, [veggies, money, experience, knowledge, activeVeggie, day, greenhouseOwned, heirloomOwned, autoSellOwned, currentWeather]);
  // Auto Sell timer effect
  useEffect(() => {
    // AutoSell timer logic removed (setAutoSellTimer not defined)
  }, [autoSellOwned]);
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
    if (!greenhouseOwned && money >= 10000 && knowledge >= 1000) {
      setMoney((m: number) => m - 10000);
      setKnowledge((k: number) => k - 1000);
      setGreenhouseOwned(true);
    }
  };

  // Auto Harvester timer for each veggie
  useEffect(() => {
    let intervalId: number | null = null;
    
    const harvestTick = () => {
      setVeggies((prev) => {
        let needsUpdate = false;
        const newVeggies = prev.map((v) => {
          if (!v.harvesterOwned) return v;
          
          const speedMultiplier = 1 + (v.harvesterSpeedLevel ?? 0) * 0.05;
          const timerMax = Math.max(1, Math.round(50 / speedMultiplier));
          let newV = v;

          // If timer is primed and veggie is ready, harvest
          if (v.harvesterTimer >= timerMax && v.growth >= 100) {
            const almanacMultiplier = 1 + (almanacLevel * 0.10);
            const harvestAmount = 1 + (v.additionalPlotLevel || 0);
            
            // Batch state updates using refs to avoid closure issues
            setKnowledge((k: number) => k + 0.5 * almanacMultiplier + (1.25 * (farmTier - 1)));
            setExperience((exp: number) => exp + 1);

            needsUpdate = true;
            newV = {
              ...v,
              stash: v.stash + harvestAmount,
              growth: 0,
              harvesterTimer: 0,
            };
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

        // Only update state if something changed
        if (!needsUpdate) return prev;

        // Handle unlocks after all harvests are processed
        let totalPlotsUsed = newVeggies.filter(vg => vg.unlocked).length +
          newVeggies.reduce((sum, vg) => sum + (vg.additionalPlotLevel || 0), 0);

        // Check for unlocks
        let unlocksHappened = false;
        newVeggies.forEach((veg, idx) => {
          if (!veg.unlocked && experience >= veg.experienceToUnlock && totalPlotsUsed < maxPlots) {
            newVeggies[idx] = { ...veg, unlocked: true };
            totalPlotsUsed++;
            unlocksHappened = true;
          }
        });

        return unlocksHappened ? newVeggies : newVeggies;
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
  }, [almanacLevel, farmTier, experience, maxPlots]);

  // Shared harvest logic for a veggie index
  const harvestVeggie = (index: number) => {
    let didHarvest = false;
    setVeggies((prev) => {
      const updated = [...prev];
      const v = { ...updated[index] };
      v.salePrice = updated[index].salePrice;
      if (v.growth >= 100) {
        const harvestAmount = 1 + (v.additionalPlotLevel || 0);
        v.stash += harvestAmount;
        v.growth = 0;
        didHarvest = true;
      }
      updated[index] = v;

      // Unlock all eligible veggies after harvest
      let totalPlotsUsed = updated.filter(vg => vg.unlocked).length + updated.reduce((sum, vg) => sum + (vg.additionalPlotLevel || 0), 0);
      const unlockOrder = updated
        .map((vg, idx) => ({ ...vg, idx }))
        .filter(vg => !vg.unlocked && experience >= vg.experienceToUnlock)
        .sort((a, b) => a.experienceToUnlock - b.experienceToUnlock);
      for (let i = 0; i < unlockOrder.length && totalPlotsUsed < maxPlots; i++) {
        updated[unlockOrder[i].idx].unlocked = true;
        totalPlotsUsed++;
      }
      return updated;
    });
    setTimeout(() => {
      if (didHarvest && day >= 0 && day <= 365) {
        const almanacMultiplier = 1 + (almanacLevel * 0.10);
        setKnowledge((k: number) => k + 1 * almanacMultiplier + (1.25 * (farmTier - 1)));
      }
    }, 0);
    setExperience((exp: number) => exp + 1 + knowledge * 0.01);
  };

  // Manual harvest button uses shared logic
  const handleHarvest = () => {
    harvestVeggie(activeVeggie);
  }

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

  // Day counter timer combined with weather system
  useEffect(() => {
    let dayIntervalId: number | null = null;
    
    const updateDay = () => {
      setDay((d: number) => {
        const newDay = (d + 1) % 366;
        // Handle weather changes inline with day changes to reduce state updates
        const newSeason = getSeason(newDay);
        handleWeatherChange(newSeason);
        return newDay;
      });
    };

    const handleWeatherChange = (season: string) => {
      // Only calculate new weather if needed
      if (currentWeather === 'Clear') {
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
  }, [currentWeather]);

  // Sell handler
  const handleSell = () => {
    let total = 0;
    setVeggies((prev) => {
      total = prev.reduce((sum, v) => sum + v.stash * v.salePrice, 0);
      return prev.map((v) => ({ ...v, stash: 0 }));
    });
  setMoney((m: number) => m + total);
  };

  return (
  <GameContext.Provider value={{ veggies, setVeggies, money, setMoney, experience, setExperience, knowledge, setKnowledge, activeVeggie, day, setDay, setActiveVeggie, handleHarvest, handleSell, handleBuyFertilizer, handleBuyHarvester, handleBuyBetterSeeds, greenhouseOwned, setGreenhouseOwned, handleBuyGreenhouse, handleBuyHarvesterSpeed, resetGame, heirloomOwned, setHeirloomOwned, handleBuyHeirloom, autoSellOwned, setAutoSellOwned, handleBuyAutoSell, almanacLevel, setAlmanacLevel, almanacCost, setAlmanacCost, handleBuyAlmanac, handleBuyAdditionalPlot, maxPlots, setMaxPlots, farmCost, setFarmCost, handleBuyLargerFarm, farmTier, setFarmTier, irrigationOwned, setIrrigationOwned, irrigationCost, irrigationKnCost, handleBuyIrrigation, currentWeather, setCurrentWeather }}>
      {children}
    </GameContext.Provider>
  );
};

function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within a GameProvider');
  return context;
}

export default App;
export { GameProvider };

function App() {
  // Ref for hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        // Basic validation
        if (!data || typeof data !== "object" || !Array.isArray(data.veggies)) {
          alert("Invalid save file format.");
          return;
        }
        // Update all relevant state
        setVeggies(data.veggies);
        setMoney(data.money ?? 0);
        setExperience(data.experience ?? 0);
        setKnowledge(data.knowledge ?? 0);
        setActiveVeggie(data.activeVeggie ?? 0);
        setDay(data.day ?? 0);
        setGreenhouseOwned(data.greenhouseOwned ?? false);
        setAlmanacLevel(data.almanacLevel ?? 0);
        setAlmanacCost(data.almanacCost ?? 10);
        setAutoSellOwned(data.autoSellOwned ?? false);
        setHeirloomOwned(data.heirloomOwned ?? false);
        setMaxPlots(data.maxPlots ?? 4);
        setFarmTier(data.farmTier ?? 1);
        setFarmCost(data.farmCost ?? FARM_BASE_COST);
        setIrrigationOwned(data.irrigationOwned ?? false);
        setCurrentWeather(data.currentWeather ?? 'Clear');
        // Update farm cost based on tier
        const newFarmCost = Math.ceil(FARM_BASE_COST * Math.pow(1.85, (data.farmTier ?? 1) - 1));
        setFarmCost(newFarmCost);
        alert("Save imported successfully!");
      } catch {
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
    greenhouseOwned,
    heirloomOwned,
    autoSellOwned,
    almanacLevel,
    almanacCost,
    maxPlots,
    farmTier,
    irrigationOwned,
    currentWeather,
    // Optionally add a version for future compatibility
    saveVersion: 1
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
  const { resetGame, veggies, setVeggies, money, setMoney, setExperience, experience, knowledge, setKnowledge, activeVeggie, day, setDay, setActiveVeggie, handleHarvest, handleSell, handleBuyFertilizer, handleBuyHarvester, handleBuyBetterSeeds, greenhouseOwned, setGreenhouseOwned, handleBuyGreenhouse, handleBuyHarvesterSpeed, heirloomOwned, setHeirloomOwned, handleBuyHeirloom, autoSellOwned, setAutoSellOwned, handleBuyAutoSell, almanacLevel, setAlmanacLevel, almanacCost, setAlmanacCost, handleBuyAlmanac, handleBuyAdditionalPlot, maxPlots, setMaxPlots, farmCost, setFarmCost, handleBuyLargerFarm, farmTier, setFarmTier, irrigationOwned, setIrrigationOwned, irrigationCost, irrigationKnCost, handleBuyIrrigation, currentWeather, setCurrentWeather } = useGame();

  // Debug: Add $15 to money
  const handleAddDebugMoney = () => {
    setMoney((prev) => prev + 15);
  };
  const handleAddDebugExperience = () => {
    setExperience((prev) => prev + 10);
  }
  const handleAddDebugKnowledge = () => {
    setKnowledge((prev) => prev + 10);
  }
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
  const heatwaveChance = 0.01; // Example: 4% chance per day
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

  return (
  <>
    <input 
      type="file" 
      ref={fileInputRef} 
      style={{ display: 'none' }} 
      onChange={handleFileChange} 
      accept=".json"
    />
    <div className="container" style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', minWidth: '1200px' }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h1 className="game-title" style={{ marginRight: '1rem' }}>Farm Idle Game</h1>
          <button
            onClick={handleResetGame}
            style={{ fontSize: '0.85rem', padding: '2px 10px', marginLeft: '-0.5rem', background: '#e44', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', height: '28px' }}
            title="Reset Game"
          >
            Reset
          </button>
          <button
            onClick={handleAddDebugMoney}
            style={{ fontSize: '0.85rem', padding: '2px 10px', marginLeft: '0.5rem', background: '#228833', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', height: '28px' }}
            title="Add $15 (Debug)"
          >
            Add $15 (Debug)
          </button>
          <button
            onClick={handleAddDebugExperience}
            style={{ fontSize: '0.85rem', padding: '2px 10px', marginLeft: '0.5rem', background: '#228899', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', height: '28px' }}
            title="Add 10 Exp (Debug)"
          >
            Add 10 Exp (Debug)
          </button>
          <button
            onClick={handleAddDebugKnowledge}
            style={{ fontSize: '0.85rem', padding: '2px 10px', marginLeft: '0.5rem', background: '#228899', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', height: '28px' }}
            title="Add 10 Kn (Debug)"
          >
            Add 10 Kn (Debug)
          </button>
          <button
            onClick={handleExportSave}
            style={{ fontSize: '0.85rem', padding: '2px 10px', marginLeft: 'auto', background: '#1976d2', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', height: '28px' }}
            title="Export Save"
          >
            Export Save
          </button>
          <button
            onClick={handleImportSave}
            style={{ fontSize: '0.85rem', padding: '2px 10px', marginLeft: '0.5rem', background: '#8819d2ff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', height: '28px' }}
            title="Import Save"
          >
            Import Save
          </button>
        </div>
        <div className="day-counter">Day: {day} <span style={{marginLeft: '1rem', display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}>
          <img
            src={`/${season.toLowerCase()}.png`}
            alt={season}
            style={{ width: 28, height: 28, marginRight: 6, verticalAlign: 'middle', objectFit: 'contain' }}
          />
          {season}
          <span style={{ marginLeft: '1rem'}}></span>
          <img
            src={`/${currentWeather}.png`}
            alt={currentWeather}
            style={{ width: 28, height: 28, marginRight: 6, verticalAlign: 'middle', objectFit: 'contain' }}
          />
          <span>{currentWeather}</span>
        </span></div>
        <div style={{ marginBottom: '1rem' }} />
        <div className="stats under-title" style={{ display: 'inline-flex', verticalAlign: 'middle', alignItems: 'center', gap: '2rem', flexWrap: 'wrap', fontSize: '1.0rem', marginBottom: '1rem' }}>
            <span>
            <img src="/Plots.png" alt="Plots" style={{ width: 22, height: 22, verticalAlign: 'middle', marginRight: 4 }} />
            Plots: {totalPlotsUsed} / {maxPlots}
            </span>
            <span>
            <img src="/Money.png" alt="Money" style={{ width: 22, height: 22, verticalAlign: 'middle', marginRight: 4 }} />
            Money: ${money.toFixed(2)}
            </span>
            <span>
            <img src="/Experience.png" alt="Experience" style={{ width: 22, height: 22, verticalAlign: 'middle', marginRight: 4 }} />
            Experience: {experience.toFixed(2)}
            </span>
            <span>
            <img src="/Knowledge.png" alt="Knowledge" style={{ width: 22, height: 22, verticalAlign: 'middle', marginRight: 4 }} />
            Knowledge: {knowledge.toFixed(2)}
            </span>
        </div>
        {/* Farm upgrade UI: show when maxPlots reached */}
        {totalPlotsUsed >= maxPlots && (
          <div>
            <button
              onClick={typeof handleBuyLargerFarm === 'function' ? handleBuyLargerFarm : undefined}
              disabled={money < farmCost}
              style={{ 
                display: 'inline-flex', 
                background: '#4a8',
                padding: '.5rem', 
                gap: '1rem', 
                verticalAlign: 'middle', 
                fontSize: '1.0rem', 
                borderRadius: '8px', 
                textAlign: 'center', 
                maxWidth: 950,
                border: money >= farmCost ? '1px solid #ffeb3b' : 'none',
                boxShadow: money >= farmCost ? '0 0 4px 1px #ffe066' : 'none',
                cursor: money >= farmCost ? 'pointer' : 'not-allowed',
                fontWeight: 'bold',
                marginTop: '0.5rem',
                marginBottom: '0.5rem',
                transition: 'box-shadow 0.2s, border 0.2s',
              }}
            >
            <span style={{ color: '#444', marginTop: '0.55rem', marginBottom: '0.55rem' }}>
              Buy Larger Farm
              <span style={{ color: '#228833', fontWeight: 'bold', marginLeft: '0.5rem' }}>New max plots:</span> {maxPlots + Math.floor(experience / 100)}
              <span style={{ color: '#228833', fontWeight: 'bold', marginLeft: '0.5rem' }}>Knowledge bonus:</span> +{((1.25 * ((typeof farmTier !== 'undefined' ? farmTier : 1)))).toFixed(2)} Kn/harvest
              <span style={{ color: '#228833', fontWeight: 'bold', marginLeft: '0.5rem' }}>Farm cost:</span> ${farmCost?.toLocaleString()}
              <span style={{ color: '#228833', fontWeight: 'bold', marginLeft: '0.5rem' }}>Money kept:</span> ${money > farmCost ? (money - farmCost).toLocaleString() : 0}
            </span>
            </button>
          </div>
        )}          
        <div style={{ marginBottom: '1rem' }} />         
        <div className="veggie-selector">
            <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'nowrap',
              gap: '0.5rem',
              overflowX: 'auto',
              fontSize: '0.9rem',
              marginLeft: '-0.5rem',
              marginRight: '-0.5rem',
              // Add minWidth and allow buttons to wrap text
              minWidth: 0,
            }}
            >
            {veggies.map((v, i) => (
              v.unlocked ? (
                <button
                  key={v.name}
                  className={[ 
                    i === activeVeggie ? 'active' : '',
                    v.growth >= 100 ? 'ready' : ''
                  ].filter(Boolean).join(' ')}
                  onClick={() => setActiveVeggie(i)}
                  aria-label={`Select ${v.name}`}
                  disabled={i === activeVeggie}
                  style={{ minWidth: '90px' }}
                >
                  {v.name}
                </button>
              ) : (
                <button key={v.name} disabled aria-label={`Locked veggie`} style={{ minWidth: '90px' }}>
                  Exp: {i > 0 ? veggies[i].experienceToUnlock : v.experienceToUnlock}
                  {totalPlotsUsed >= maxPlots && (
                  <span style={{ color: '#e44', fontWeight: 'bold', marginLeft: 4 }}>Max Plots</span>
                  )}
                </button>
              )
            ))}
          </div>
        </div>
        <div style={{ marginBottom: '2rem' }} />
        <div className="veggie-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <img
                src={`/${veggies[activeVeggie].name}.png`}
                alt={veggies[activeVeggie].name}
                style={{ width: '1.5em', height: '1.5em', objectFit: 'contain', marginRight: 'auto', verticalAlign: 'middle' }}
              />
              {veggies[activeVeggie].name}
              <span style={{ fontWeight: 'bold', color: '#228833', fontSize: '1.1rem' }}>${veggies[activeVeggie].salePrice}</span>
              <span style={{ fontSize: '1rem', fontWeight: 'normal', color: '#888' }}>
                (~{daysToGrow} days to grow)
              </span>
              {/* Seasonal Bonus Indicator inline */}
              <span style={{ color: '#228833', fontSize: '0.95rem', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ fontWeight: 'bold' }}>Bonus Growth:</span>
                {(() => {
                  const bonuses = veggieSeasonBonuses[veggies[activeVeggie].name] || [];
                  if (bonuses.length === 0) return <span style={{ color: '#888', marginLeft: '0.2rem' }}>None</span>;
                  return bonuses.map(season => (
                    <span key={season} style={{ marginLeft: '0.2rem', padding: '2px 8px', background: '#e6ffe6', borderRadius: '4px', border: '1px solid #b2e6b2', color: '#228833', fontWeight: 'bold' }}>{season}</span>
                  ));
                })()}
              </span>
            </h2>
            <button
              onClick={handleHarvest}
              disabled={veggies[activeVeggie].growth < 100}
              aria-label={`Harvest ${veggies[activeVeggie].name}`}
              style={{ marginLeft: 'auto', fontSize: '1rem', padding: '4px 14px', background: '#228833', color: '#fff', border: 'none', borderRadius: '5px', cursor: veggies[activeVeggie].growth < 100 ? 'not-allowed' : 'pointer' }}
            >
              {veggies[activeVeggie].growth < 100 ? 'Growing...' : 'Harvest'}
            </button>
          </div>
          <div style={{ position: 'relative', width: '100%', marginTop: '0.5rem', marginBottom: '0.5rem', height: '22px' }}>
            <ProgressBar value={veggies[activeVeggie].growth} max={100} height={22} />
            <span style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              color: '#222',
              fontSize: '1rem',
              pointerEvents: 'none',
              userSelect: 'none',
            }}>
              {`${Math.floor(veggies[activeVeggie].growth)}%`}
            </span>
          </div>
          {/* Auto Harvester Progress Bar: only show if purchased */}
          {veggies[activeVeggie].harvesterOwned && (
            <div style={{ position: 'relative', width: '100%', marginTop: '0.25rem', height: '22px' }}>
              <ProgressBar
                value={veggies[activeVeggie].harvesterTimer}
                max={Math.max(1, Math.round(50 / (1 + (veggies[activeVeggie].harvesterSpeedLevel ?? 0) * 0.05)))}
                color="#627beeff"
                height={22}
              />
              <span style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                color: '#222',
                fontSize: '1rem',
                pointerEvents: 'none',
                userSelect: 'none',
              }}>
                {`${Math.floor(
                  (veggies[activeVeggie].harvesterTimer /
                    Math.max(1, Math.round(50 / (1 + (veggies[activeVeggie].harvesterSpeedLevel ?? 0) * 0.05)))) * 100
                )}%`}
              </span>
            </div>
          )}
          <br />
          <div style={{
            marginTop: '1rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1rem',
            alignItems: 'start',
            maxWidth: '700px'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5em' }}>
                <img src="/Fertilizer.png" alt="Fertilizer" style={{ width: '1.3em', height: '1.3em', objectFit: 'contain', verticalAlign: 'middle' }} />
                Fertilizer <span style={{ color: '#888', fontWeight: 'normal' }}>Lvl {veggies[activeVeggie].fertilizerLevel}</span>
              </span>
              <button
                style={{ marginLeft: 0, marginTop: '0.5rem' }}
                onClick={() => handleBuyFertilizer(activeVeggie)}
                disabled={money < veggies[activeVeggie].fertilizerCost || veggies[activeVeggie].fertilizerLevel >= veggies[activeVeggie].fertilizerMaxLevel}
              >
                {veggies[activeVeggie].fertilizerLevel >= veggies[activeVeggie].fertilizerMaxLevel
                  ? 'MAX'
                  : `+1% speed ($${veggies[activeVeggie].fertilizerCost})`}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5em' }}>
                <img src="/Better Seeds.png" alt="Better Seeds" style={{ width: '1.3em', height: '1.3em', objectFit: 'contain', verticalAlign: 'middle' }} />
                Better Seeds <span style={{ color: '#888', fontWeight: 'normal' }}>Lvl {veggies[activeVeggie].betterSeedsLevel}</span>
              </span>
              <button
                style={{ marginLeft: 0, marginTop: '0.5rem' }}
                onClick={() => handleBuyBetterSeeds(activeVeggie)}
                disabled={knowledge < veggies[activeVeggie].betterSeedsCost}
              >
                +{heirloomOwned ? 50 : 25}% price ({veggies[activeVeggie].betterSeedsCost} Kn)
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5em' }}>
                <img src="/Additional Plot.png" alt="Additional Plot" style={{ width: '1.3em', height: '1.3em', objectFit: 'contain', verticalAlign: 'middle' }} />
                Additional Plot <span style={{ color: '#888', fontWeight: 'normal' }}>Lvl {veggies[activeVeggie].additionalPlotLevel}</span>
              </span>
              <button
                style={{ marginLeft: 0, marginTop: '0.5rem' }}
                onClick={() => handleBuyAdditionalPlot(activeVeggie)}
                disabled={money < veggies[activeVeggie].additionalPlotCost || totalPlotsUsed >= maxPlots}
              >
                {totalPlotsUsed >= maxPlots ? 'Max Plots' : `+1 veggie/harvest ($${veggies[activeVeggie].additionalPlotCost})`}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5em' }}>
                <img src="/Auto Harvester.png" alt="Auto Harvester" style={{ width: '1.3em', height: '1.3em', objectFit: 'contain', verticalAlign: 'middle' }} />
                Auto Harvester
              </span>
              <button
                style={{ marginLeft: 0, marginTop: '0.5rem' }}
                onClick={() => handleBuyHarvester(activeVeggie)}
                disabled={veggies[activeVeggie].harvesterOwned || money < veggies[activeVeggie].harvesterCost}
              >
                {veggies[activeVeggie].harvesterOwned ? 'Purchased' : `Auto $(${veggies[activeVeggie].harvesterCost})`}
              </button>
            </div>
            {veggies[activeVeggie].harvesterOwned && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5em' }}>
                  <img src="/Harvester Speed.png" alt="Harvester Speed" style={{ width: '1.3em', height: '1.3em', objectFit: 'contain', verticalAlign: 'middle' }} />
                  Harvester Speed <span style={{ color: '#888', fontWeight: 'normal' }}>Lvl {veggies[activeVeggie].harvesterSpeedLevel ?? 0}</span>
                </span>
                <button
                  style={{ marginLeft: 0, marginTop: '0.5rem' }}
                  onClick={() => handleBuyHarvesterSpeed(activeVeggie)}
                  disabled={money < (veggies[activeVeggie].harvesterSpeedCost ?? 50)}
                >
                  +5% speed (${veggies[activeVeggie].harvesterSpeedCost})
                </button>
              </div>
            )}
          </div>
        </div>
        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#888', marginBottom: '0.5rem', display: 'flex', flexDirection: 'row', gap: '2rem', justifyContent: 'center' }}>
            <span>
              {veggies.every((v) => v.stash === 0)
                ? 'No veggies to sell'
                : `Will receive: $${veggies.reduce((sum, v) => sum + v.stash * v.salePrice, 0).toFixed(2)}`}
            </span>
            <span>Stash: {veggies.reduce((sum, v) => sum + v.stash, 0)}</span>
          </div>
          {/* Merchant Progress Bar: only show if purchased */}
          {autoSellOwned && (
            <div style={{ width: '100%', marginBottom: '0.5rem' }}>
              <span style={{ color: '#228833', fontWeight: 'bold', fontSize: '1rem' }}>Merchant: Next sale in {7 - (day % 7)} days</span>
              <div style={{ position: 'relative', width: '100%', height: '18px', marginTop: '0.2rem' }}>
                <ProgressBar value={day % 7} max={7} height={18} color="#ffb300" />
                <span style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  color: '#222',
                  fontSize: '0.95rem',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}>{Math.floor((day % 7) / 7 * 100)}%</span>
              </div>
            </div>
          )}
          <button
            onClick={handleSell}
            disabled={veggies.every((v) => v.stash === 0)}
            aria-label="Sell all veggies"
          >
            {veggies.every((v) => v.stash === 0) ? 'No veggies to sell' : 'Sell All'}
          </button>
        </div>
      </div>
      {/* Veggie Agnostic Upgrades Section */}
      <div style={{ width: '350px', marginLeft: '2rem', background: '#81b886ff', border: '1px solid #cceccc', borderRadius: '8px', padding: '1rem', boxShadow: '0 2px 8px #e0ffe0' }}>
        <h2 style={{ textAlign: 'center', color: '#228833' }}>Upgrades</h2>
        {/* Farmer's Almanac Upgrade - above Merchant */}
        <div style={{ marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', justifyContent: 'center', textAlign: 'center', width: '100%' }}>
            <img src="/Farmer's Almanac.png" alt="Farmer's Almanac" style={{ width: 22, height: 22, marginRight: 0 }} />
            <strong>Farmer's Almanac</strong>
            <span style={{ color: '#228833', fontWeight: 'bold', fontSize: '1.02rem' }}>+{(almanacLevel * 10).toFixed(0)}%</span>
          </div>
          <div style={{ color: '#313131ff', fontSize: '0.95rem', marginBottom: '0.5rem' }}>
            +10% knowledge per purchase.
          </div>
          <button
            onClick={handleBuyAlmanac}
            disabled={money < almanacCost}
            style={{
              background: money >= almanacCost ? '#4a8' : '#aaa',
              color: '#fff',
              padding: '0.5rem 1rem',
              borderRadius: '5px',
              border: money >= almanacCost ? '2px solid #ffeb3b' : 'none',
              boxShadow: money >= almanacCost ? '0 0 8px 2px #ffe066' : 'none',
              cursor: money >= almanacCost ? 'pointer' : 'not-allowed',
              fontWeight: 'bold',
              transition: 'box-shadow 0.2s, border 0.2s',
            }}
          >
            Buy (${almanacCost})
          </button>
        </div>
        {/* Irrigation Upgrade */}
        <div style={{ marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', justifyContent: 'center', textAlign: 'center', width: '100%' }}>
            <img src="/Irrigation.png" alt="Irrigation" style={{ width: 22, height: 22, marginRight: 4 }} />
            <strong>Irrigation</strong>
          </div>
          <div style={{ color: '#313131ff', fontSize: '0.95rem', marginBottom: '0.5rem' }}>
            Negates drought penalty.<br />
          </div>
          <button
            onClick={handleBuyIrrigation}
            disabled={irrigationOwned || money < irrigationCost || knowledge < irrigationKnCost}
            style={{
              background: irrigationOwned ? '#124212ff' : '#228833',
              color: '#fff',
              padding: '0.5rem 1rem',
              borderRadius: '5px',
              border: !irrigationOwned && money >= irrigationCost && knowledge >= irrigationKnCost ? '2px solid #ffeb3b' : 'none',
              boxShadow: !irrigationOwned && money >= irrigationCost && knowledge >= irrigationKnCost ? '0 0 8px 2px #ffe066' : 'none',
              cursor: irrigationOwned ? 'not-allowed' : (money >= irrigationCost && knowledge >= irrigationKnCost ? 'pointer' : 'not-allowed'),
              fontWeight: 'bold',
              transition: 'box-shadow 0.2s, border 0.2s',
            }}
          >
            {irrigationOwned ? 'Purchased' : `$${irrigationCost.toLocaleString()} & ${irrigationKnCost} Kn`}
          </button>
        </div>
        <div style={{ marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', justifyContent: 'center', textAlign: 'center', width: '100%' }}>
            <img src="/Merchant.png" alt="Merchant" style={{ width: 22, height: 22, marginRight: 0 }} />
            <strong>Merchant</strong>
          </div>
          <div style={{ color: '#313131ff', fontSize: '0.95rem', marginBottom: '0.5rem' }}>
            Buys veggies every 7 days.<br />
          </div>
          <button
            onClick={handleBuyAutoSell}
            disabled={autoSellOwned || money < 1000 || knowledge < 100}
            style={{
              background: autoSellOwned ? '#124212ff' : '#228833',
              color: '#fff',
              padding: '0.5rem 1rem',
              borderRadius: '5px',
              border: !autoSellOwned && money >= 1000 && knowledge >= 100 ? '2px solid #ffeb3b' : 'none',
              boxShadow: !autoSellOwned && money >= 1000 && knowledge >= 100 ? '0 0 8px 2px #ffe066' : 'none',
              cursor: autoSellOwned ? 'not-allowed' : (money >= 1000 && knowledge >= 100 ? 'pointer' : 'not-allowed'),
              fontWeight: 'bold',
              transition: 'box-shadow 0.2s, border 0.2s',
            }}
          >
            {autoSellOwned ? 'Purchased' : '$1000 & 100 Kn'}
          </button>
        </div>
        <div style={{ marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', justifyContent: 'center', textAlign: 'center', width: '100%' }}>
            <img src="/Greenhouse.png" alt="Greenhouse" style={{ width: 22, height: 22, marginRight: 0 }} />
            <strong>Greenhouse</strong>
          </div>
          <div style={{ color: '#313131ff', fontSize: '0.95rem', marginBottom: '0.5rem' }}>
            Negates winter growth penalty.<br />
          </div>
          <button
            onClick={handleBuyGreenhouse}
            disabled={greenhouseOwned || money < 10000 || knowledge < 1000}
            style={{
              background: greenhouseOwned ? '#124212ff' : '#228833',
              color: '#fff',
              padding: '0.5rem 1rem',
              borderRadius: '5px',
              border: !greenhouseOwned && money >= 10000 && knowledge >= 1000 ? '2px solid #ffeb3b' : 'none',
              boxShadow: !greenhouseOwned && money >= 10000 && knowledge >= 1000 ? '0 0 8px 2px #ffe066' : 'none',
              cursor: greenhouseOwned ? 'not-allowed' : (money >= 10000 && knowledge >= 1000 ? 'pointer' : 'not-allowed'),
              fontWeight: 'bold',
              transition: 'box-shadow 0.2s, border 0.2s',
            }}
          >
            {greenhouseOwned ? 'Purchased' : '$10,000 & 1000 Kn'}
          </button>
        </div>
        <div style={{ marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', justifyContent: 'center', textAlign: 'center', width: '100%' }}>
            <img src="/Heirloom Seeds.png" alt="Heirloom Seeds" style={{ width: 22, height: 22, marginRight: 0 }} />
            <strong>Heirloom Seeds</strong>
          </div>
          <div style={{ color: '#313131ff', fontSize: '0.95rem', marginBottom: '0.5rem' }}>
            Doubles the effect of Better Seeds.<br />
          </div>
          <button
            onClick={handleBuyHeirloom}
            disabled={heirloomOwned || money < 25000 || knowledge < 2000}
            style={{
              background: heirloomOwned ? '#124212ff' : '#228833',
              color: '#fff',
              padding: '0.5rem 1rem',
              borderRadius: '5px',
              border: !heirloomOwned && money >= 25000 && knowledge >= 2000 ? '2px solid #ffeb3b' : 'none',
              boxShadow: !heirloomOwned && money >= 25000 && knowledge >= 2000 ? '0 0 8px 2px #ffe066' : 'none',
              cursor: heirloomOwned ? 'not-allowed' : (money >= 25000 && knowledge >= 2000 ? 'pointer' : 'not-allowed'),
              fontWeight: 'bold',
              transition: 'box-shadow 0.2s, border 0.2s',
            }}
          >
            {heirloomOwned ? 'Purchased' : '$25,000 & 2000 Kn'}
          </button>
        </div>
        {/* Future global upgrades can be added here */}
      </div>
    </div>
  </>
  );
}
