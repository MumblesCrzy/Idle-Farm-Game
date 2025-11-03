import { useEffect, useRef, useState, createContext, useContext, useMemo, useCallback } from 'react';
import ArchieIcon from './components/ArchieIcon';
import AdvancedStashDisplay from './components/AdvancedStashDisplay';
import InfoOverlay from './components/InfoOverlay';
import SettingsOverlay from './components/SettingsOverlay';
import GrowingTab from './components/GrowingTab';
import CanningTab from './components/CanningTab';
import StatsDisplay from './components/StatsDisplay';
import HeaderBar from './components/HeaderBar';
import SaveLoadSystem from './components/SaveLoadSystem';
import AchievementDisplay from './components/AchievementDisplay';
import AchievementNotification from './components/AchievementNotification';
import { useArchie } from './context/ArchieContext';
import { useCanningSystem } from './hooks/useCanningSystem';
import { useWeatherSystem } from './hooks/useWeatherSystem';
import { useSeasonSystem } from './hooks/useSeasonSystem';
import { useAchievements } from './hooks/useAchievements';
import { useAutoPurchase } from './hooks/useAutoPurchase';
import { useGameState } from './hooks/useGameState';
import { loadGameStateWithCanning, saveGameStateWithCanning } from './utils/saveSystem';
import type { Veggie, GameState } from './types/game';
import {
  RAIN_CHANCES,
  DROUGHT_CHANCES,
  STORM_CHANCES,
  IRRIGATION_COST,
  IRRIGATION_KN_COST,
  MERCHANT_DAYS,
  MERCHANT_COST,
  MERCHANT_KN_COST,
  GREENHOUSE_COST_PER_PLOT,
  GREENHOUSE_KN_COST_PER_PLOT,
  HEIRLOOM_COST_PER_VEGGIE,
  HEIRLOOM_KN_PER_VEGGIE,
  veggieSeasonBonuses,
  GAME_STORAGE_KEY
} from './config/gameConstants';
import { ALL_IMAGES, ICON_GROWING, ICON_CANNING } from './config/assetPaths';
import styles from './components/App.module.css';
import {
  formatNumber,
  getVeggieGrowthBonus,
  calculateExpRequirement,
  calculateInitialCost,
  calculateUpgradeCost,
  createAutoPurchaserConfigs
} from './utils/gameCalculations';
import {
  processVeggieGrowth,
  processAutoHarvest,
  processVeggieUnlocks
} from './utils/gameLoopProcessors';

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

const GameContext = createContext<GameState | undefined>(undefined);

function saveGameState(state: any) {
  try {
    saveGameStateWithCanning(state);
  } catch {}
}

const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load game state fresh each time - this ensures imports work correctly
  const getLoadedState = () => {
    const result = loadGameStateWithCanning();
    return result;
  };
  const loaded = getLoadedState();
  
  // Initialize core game state with custom hook
  const gameState = useGameState({
    loadedState: loaded,
    initialVeggies
  });

  // Destructure game state for easier access
  const {
    veggies,
    setVeggies,
    money,
    setMoney,
    experience,
    setExperience,
    knowledge,
    setKnowledge,
    day,
    setDay,
    totalDaysElapsed,
    setTotalDaysElapsed,
    activeVeggie,
    setActiveVeggie,
    farmTier,
    setFarmTier,
    maxPlots,
    setMaxPlots,
    farmCost,
    setFarmCost,
    FARM_BASE_COST,
    highestUnlockedVeggie,
    setHighestUnlockedVeggie,
    irrigationOwned,
    setIrrigationOwned,
    greenhouseOwned,
    setGreenhouseOwned,
    heirloomOwned,
    setHeirloomOwned,
    autoSellOwned,
    setAutoSellOwned,
    almanacLevel,
    setAlmanacLevel,
    almanacCost,
    setAlmanacCost,
    totalPlotsUsed,
    heirloomMoneyCost,
    heirloomKnowledgeCost
  } = gameState;

  // Irrigation upgrade handler
  const irrigationCost = IRRIGATION_COST;
  const irrigationKnCost = IRRIGATION_KN_COST;
  const handleBuyIrrigation = () => {
    if (!irrigationOwned && money >= irrigationCost && knowledge >= irrigationKnCost) {
      setMoney((m: number) => m - irrigationCost);
      setKnowledge((k: number) => k - irrigationKnCost);
      setIrrigationOwned(true);
    }
  };
  
  // Farm purchase/reset logic
  const handleBuyLargerFarm = () => {
    // Calculate new maxPlots (capped at twice the current max)
    const experienceBonus = Math.floor(experience / 100);
    const uncappedMaxPlots = maxPlots + experienceBonus;
    const newMaxPlots = Math.min(uncappedMaxPlots, maxPlots * 2);
    // Calculate money to keep
    const moneyKept = money - farmCost;
    // Calculate knowledge to keep (third of current)
    const knowledgeKept = knowledge;
    // Calculate new farm tier
    const newFarmTier = farmTier + 1;
    // Calculate starting experience based on farm tier to unlock appropriate vegetables
    // Tier 1: Radish (0 exp), Tier 2: + Lettuce (95 exp), Tier 3: + Green Beans (180 exp), etc.
    const startingExperience = newFarmTier > 1 ? calculateExpRequirement(newFarmTier - 1) : 0;
    // Save current state of irrigation
    // Static knowledge multiplier bonus per farm tier is applied globally in knowledge gain
    // Reset game state, but keep moneyKept, newMaxPlots, and newFarmTier
    setVeggies(initialVeggies.map(v => ({ ...v })));
    setMoney(moneyKept > 0 ? moneyKept : 0);
    setExperience(startingExperience);
    setKnowledge(knowledgeKept);
    setActiveVeggie(0);
    setDay(1);
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
      experience: startingExperience,
      knowledge: knowledgeKept,
      activeVeggie: 0,
      day: 1,
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
  // Farmer's Almanac purchase handler
  const handleBuyAlmanac = () => {
    if (money >= almanacCost) {
      setMoney((m: number) => Math.max(0, m - almanacCost));
      setAlmanacLevel((lvl: number) => lvl + 1);
      setAlmanacCost((cost: number) => Math.ceil(cost * 1.15 + 5));
    }
  };
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
  setDay(1);
  setTotalDaysElapsed(0);
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
    day: 1,
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
            return { ...v, salePrice: newSalePrice };
          }
          return v;
        });
      });
    }
  };

  // Weather system hook
  const { currentWeather, setCurrentWeather } = useWeatherSystem(day, 'Clear');
  
  // Season system hook
  const { season } = useSeasonSystem(day);
  
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
    timerRef.current = window.setInterval(() => {
      setVeggies((prev) => {
        const { veggies: newVeggies } = processVeggieGrowth(
          prev,
          season,
          currentWeather,
          greenhouseOwned,
          irrigationOwned
        );
        return newVeggies;
      });
    }, 1000);

    // Cleanup function
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [season, currentWeather, greenhouseOwned, irrigationOwned]);
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
        const {
          veggies: newVeggies,
          experienceGain: totalExperienceGain,
          knowledgeGain: totalKnowledgeGain,
          needsUpdate
        } = processAutoHarvest(prev, almanacLevel, farmTier, knowledge);

        // Update experience and knowledge for all harvests
        if (totalExperienceGain > 0 && day >= 1 && day <= 365) {
          setTimeout(() => {
            setKnowledge((k: number) => k + totalKnowledgeGain);
            setExperience((exp: number) => exp + totalExperienceGain);
          }, 0);
        }

        // Handle unlocks after all harvests are processed using projected experience
        if (needsUpdate) {
          const projectedExperience = experience + totalExperienceGain;
          const { veggies: unlockedVeggies, highestUnlockedIndex } = processVeggieUnlocks(
            newVeggies,
            projectedExperience,
            maxPlots
          );
          
          // Update highest unlocked veggie if there were any unlocks
          if (highestUnlockedIndex > highestUnlockedVeggie) {
            setHighestUnlockedVeggie(highestUnlockedIndex);
          }
          
          return unlockedVeggies;
        }

        return newVeggies;
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
      
      for (let i = 0; i < unlockOrder.length && totalPlotsUsed < maxPlots; i++) {
        updated[unlockOrder[i].idx].unlocked = true;
        totalPlotsUsed++;
        // Update highest unlocked veggie if this is higher
        if (unlockOrder[i].idx > highestUnlockedVeggie) {
          setHighestUnlockedVeggie(unlockOrder[i].idx);
        }
      }
      return updated;
    });
    
    // Update knowledge and experience (we know harvest succeeded since we checked growth >= 100)
    if (day >= 1 && day <= 365) {
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

  // Initialize auto-purchase system
  const { globalAutoPurchaseTimer, setGlobalAutoPurchaseTimer } = useAutoPurchase({
    veggies,
    setVeggies,
    money,
    knowledge,
    maxPlots,
    handlers: {
      handleBuyFertilizer,
      handleBuyBetterSeeds,
      handleBuyHarvesterSpeed,
      handleBuyAdditionalPlot
    },
    initialTimer: loaded?.globalAutoPurchaseTimer ?? 0
  });

  // Day counter timer with auto-sell and auto-purchase logic
  useEffect(() => {
    let dayIntervalId: number | null = null;
    
    const updateDay = () => {
      setTotalDaysElapsed((total: number) => total + 1);
      setDay((d: number) => {
        const newDay = (d % 365) + 1; // Day cycles from 1-365, not 0-364
        
        // Auto-sell logic for merchant (every MERCHANT_DAYS)
        if (autoSellOwned && newDay % MERCHANT_DAYS === 0) {
          // Trigger auto-sell using the existing handleSell function
          setTimeout(() => {
            handleSell();
          }, 100); // Small delay to ensure state is updated
        }
        
        // Increment auto-purchase timer each day
        setGlobalAutoPurchaseTimer((prevTimer: number) => prevTimer + 1);
        
        return newDay;
      });
    };

    dayIntervalId = window.setInterval(updateDay, 1000);

    return () => {
      if (dayIntervalId !== null) {
        clearInterval(dayIntervalId);
        dayIntervalId = null;
      }
    };
  }, [autoSellOwned, handleSell, setGlobalAutoPurchaseTimer]);



  return (
  <GameContext.Provider value={{ veggies, setVeggies, money, setMoney, experience, setExperience, knowledge, setKnowledge, activeVeggie, day, setDay, totalDaysElapsed, setTotalDaysElapsed, globalAutoPurchaseTimer, setGlobalAutoPurchaseTimer, setActiveVeggie, handleHarvest, handleToggleSell, handleSell, handleBuyFertilizer, handleBuyHarvester, handleBuyBetterSeeds, greenhouseOwned, setGreenhouseOwned, handleBuyGreenhouse, handleBuyHarvesterSpeed, resetGame, heirloomOwned, setHeirloomOwned, handleBuyHeirloom, autoSellOwned, setAutoSellOwned, handleBuyAutoSell, almanacLevel, setAlmanacLevel, almanacCost, setAlmanacCost, handleBuyAlmanac, handleBuyAdditionalPlot, maxPlots, setMaxPlots, farmCost, setFarmCost, handleBuyLargerFarm, farmTier, setFarmTier, irrigationOwned, setIrrigationOwned, irrigationCost, irrigationKnCost, handleBuyIrrigation, currentWeather, setCurrentWeather, highestUnlockedVeggie, setHighestUnlockedVeggie, handleBuyAutoPurchaser, heirloomMoneyCost, heirloomKnowledgeCost }}>
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
  const { soundEnabled, setSoundEnabled } = useArchie();
  
  // ArchieIcon component adds a clickable character that
  // appears randomly on the screen and gives the player money when clicked
  
  // Info overlay state
  const [showInfoOverlay, setShowInfoOverlay] = useState(false);
  
  // Settings overlay state
  const [showSettingsOverlay, setShowSettingsOverlay] = useState(false);
  
  // Advanced stash overlay state
  const [showAdvancedStash, setShowAdvancedStash] = useState(false);

  // Achievements overlay state
  const [showAchievements, setShowAchievements] = useState(false);

  // Tab system state
  const [activeTab, setActiveTab] = useState<'growing' | 'canning'>('growing');
  
  // Load initial canning state fresh each time
  const [initialCanningState] = useState(() => {
    try {
      const loaded = loadGameStateWithCanning();
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

  const { resetGame, veggies, setVeggies, money, setMoney, experience, knowledge, setKnowledge, activeVeggie, day, totalDaysElapsed, globalAutoPurchaseTimer, setActiveVeggie, handleHarvest, handleToggleSell, handleSell, handleBuyFertilizer, handleBuyHarvester, handleBuyBetterSeeds, greenhouseOwned, handleBuyGreenhouse, handleBuyHarvesterSpeed, heirloomOwned, handleBuyHeirloom, autoSellOwned, handleBuyAutoSell, almanacLevel, almanacCost, handleBuyAlmanac, handleBuyAdditionalPlot, maxPlots, farmCost, handleBuyLargerFarm, farmTier, irrigationOwned, irrigationCost, irrigationKnCost, handleBuyIrrigation, currentWeather, setCurrentWeather, highestUnlockedVeggie, handleBuyAutoPurchaser, heirloomMoneyCost, heirloomKnowledgeCost } = useGame();

  // Season system hook
  const { season } = useSeasonSystem(day);

  // Initialize canning system
  const {
    canningState,
    startCanning,
    completeCanning,
    purchaseUpgrade,
    canMakeRecipe,
    toggleAutoCanning
  } = useCanningSystem(experience, veggies, setVeggies, heirloomOwned, money, setMoney, knowledge, setKnowledge, initialCanningState, uiPreferences.canningRecipeSort, farmTier);

  // Check if canning is unlocked (first recipe unlocks at 5,000 experience)
  // Memoized to prevent recalculation on every render
  const canningUnlocked = useMemo(() => experience >= 5000, [experience]);

  // Initialize achievement system
  const [initialAchievementState] = useState(() => {
    try {
      const loaded = loadGameStateWithCanning();
      return loaded?.achievementState || undefined;
    } catch (error) {
      console.error('Error loading achievement state:', error);
      return undefined;
    }
  });

  const {
    achievements,
    totalUnlocked,
    lastUnlockedId,
    checkAchievements,
    clearLastUnlocked
  } = useAchievements(
    initialAchievementState,
    (moneyReward, knowledgeReward) => {
      if (moneyReward > 0) setMoney(prev => prev + moneyReward);
      if (knowledgeReward > 0) setKnowledge(prev => prev + knowledgeReward);
    }
  );

  // Get the last unlocked achievement for notification
  const lastUnlockedAchievement = lastUnlockedId 
    ? achievements.find(a => a.id === lastUnlockedId) || null
    : null;

  // Detect if we just loaded imported data (prevent immediate auto-save)
  useEffect(() => {
    // If experience is significantly high, we likely just imported data
    if (experience > 10000) {
      justImportedRef.current = true;
      // Reset the flag after a short delay to allow normal auto-saving later
      setTimeout(() => {
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
      justImportedRef.current = false;
      return;
    }
    
    if (canningState) {
      const gameState = {
        veggies,
        money,
        experience,
        knowledge,
        activeVeggie,
        day,
        totalDaysElapsed,
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
        uiPreferences,
        achievementState: {
          achievements,
          totalUnlocked,
          lastUnlockedId
        }
      };
      saveGameStateWithCanning(gameState);
      lastSaveTimeRef.current = Date.now();
      pendingSaveRef.current = false;
    }
  }, [canningState, uiPreferences, veggies, money, experience, knowledge, activeVeggie, day, totalDaysElapsed, globalAutoPurchaseTimer, greenhouseOwned, heirloomOwned, autoSellOwned, almanacLevel, almanacCost, maxPlots, farmTier, farmCost, irrigationOwned, currentWeather, highestUnlockedVeggie, achievements, totalUnlocked, lastUnlockedId]);

  // Check achievements periodically
  useEffect(() => {
    const veggiesUnlocked = veggies.filter(v => v.unlocked).length;
    const canningItemsTotal = canningState?.totalItemsCanned || 0;
    
    checkAchievements({
      money,
      experience,
      knowledge,
      veggiesUnlocked,
      canningItemsTotal,
      farmTier,
      totalHarvests: 0 // This would need to be tracked separately if needed
    });
  }, [money, experience, knowledge, veggies, canningState, farmTier, checkAchievements]);

  // Debounced save effect - only trigger save if state has actually changed
  // and enough time has passed
  useEffect(() => {
    const now = Date.now();
    const timeSinceLastSave = now - lastSaveTimeRef.current;
    
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // If it's been more than 30 seconds since last save, save immediately
    if (timeSinceLastSave >= 30000) {
      performSave();
    } else {
      // Otherwise, schedule a save for 30 seconds from last save
      const timeUntilNextSave = 30000 - timeSinceLastSave;
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
        // Get the current performSave function and call it
        const currentPerformSave = performSave;
        currentPerformSave();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []); // Remove performSave dependency

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
  
  // Calculate totalPlotsUsed for UI
  // Memoized to prevent expensive recalculation on every render
  const totalPlotsUsed = useMemo(() => 
    veggies.filter(v => v.unlocked).length + veggies.reduce((sum, v) => sum + (v.additionalPlotLevel || 0), 0),
    [veggies]
  );
  
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
    // Preload using both methods for maximum browser compatibility
    ALL_IMAGES.forEach(src => {
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

  }, []); // Only run once on mount

  return (
    <SaveLoadSystem
      veggies={veggies}
      money={money}
      experience={experience}
      knowledge={knowledge}
      activeVeggie={activeVeggie}
      day={day}
      globalAutoPurchaseTimer={globalAutoPurchaseTimer}
      greenhouseOwned={greenhouseOwned}
      heirloomOwned={heirloomOwned}
      autoSellOwned={autoSellOwned}
      almanacLevel={almanacLevel}
      almanacCost={almanacCost}
      maxPlots={maxPlots}
      farmTier={farmTier}
      irrigationOwned={irrigationOwned}
      currentWeather={currentWeather}
      canningState={canningState}
      resetGame={resetGame}
    >
      {({ handleExportSave, handleImportSave, handleResetGame }) => (
    <>
    <ArchieIcon setMoney={setMoney} money={money} experience={experience} totalPlotsUsed={totalPlotsUsed} />
    <div className={styles.container}>
      <div className={styles.mainContent}>
        <HeaderBar
          experience={experience}
          money={money}
          farmCost={farmCost}
          farmTier={farmTier}
          totalPlotsUsed={totalPlotsUsed}
          maxPlots={maxPlots}
          knowledge={knowledge}
          setShowInfoOverlay={setShowInfoOverlay}
          setShowSettingsOverlay={setShowSettingsOverlay}
          setShowAchievements={setShowAchievements}
          totalAchievements={achievements.length}
          unlockedAchievements={totalUnlocked}
          handleBuyLargerFarm={handleBuyLargerFarm}
          formatNumber={formatNumber}
        />

        <StatsDisplay
          day={day}
          totalDaysElapsed={totalDaysElapsed}
          season={season}
          currentWeather={currentWeather}
          totalPlotsUsed={totalPlotsUsed}
          maxPlots={maxPlots}
          money={money}
          knowledge={knowledge}
          veggies={veggies}
          setShowAdvancedStash={setShowAdvancedStash}
          formatNumber={formatNumber}
        />

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
              <img src={ICON_GROWING} alt="Growing" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
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
                <img src={ICON_CANNING} alt="Canning" style={{ width: '20px', height: '20px', objectFit: 'contain', opacity: canningUnlocked ? 1 : 0.5 }} />
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
          heirloomOwned={heirloomOwned}
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
    <InfoOverlay
      visible={showInfoOverlay}
      onClose={() => setShowInfoOverlay(false)}
      GREENHOUSE_COST_PER_PLOT={GREENHOUSE_COST_PER_PLOT}
      GREENHOUSE_KN_COST_PER_PLOT={GREENHOUSE_KN_COST_PER_PLOT}
    />
    
    {/* Settings Overlay */}
    <SettingsOverlay
      visible={showSettingsOverlay}
      onClose={() => setShowSettingsOverlay(false)}
      soundEnabled={soundEnabled}
      setSoundEnabled={setSoundEnabled}
      handleExportSave={handleExportSave}
      handleImportSave={handleImportSave}
      handleResetGame={handleResetGame}
    />

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

    {/* Achievements Overlay */}
    <AchievementDisplay
      visible={showAchievements}
      onClose={() => setShowAchievements(false)}
      achievements={achievements}
      totalUnlocked={totalUnlocked}
    />

    {/* Achievement Notification */}
    <AchievementNotification
      achievement={lastUnlockedAchievement}
      onClose={clearLastUnlocked}
    />
    </>
      )}
    </SaveLoadSystem>
  );
}

export default App;
export { GameProvider, GameContext };
