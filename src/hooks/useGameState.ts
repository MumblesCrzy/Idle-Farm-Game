import { useState, useMemo } from 'react';
import type { Veggie } from '../types/game';
import { createAutoPurchaserConfigs } from '../utils/gameCalculations';
import { HEIRLOOM_COST_PER_VEGGIE, HEIRLOOM_KN_PER_VEGGIE } from '../config/gameConstants';

interface LoadedGameState {
  veggies?: any[];
  money?: number;
  experience?: number;
  knowledge?: number;
  activeVeggie?: number;
  day?: number;
  totalDaysElapsed?: number;
  farmTier?: number;
  farmCost?: number;
  irrigationOwned?: boolean;
  greenhouseOwned?: boolean;
  heirloomOwned?: boolean;
  autoSellOwned?: boolean;
  almanacLevel?: number;
  almanacCost?: number;
  maxPlots?: number;
  highestUnlockedVeggie?: number;
  globalAutoPurchaseTimer?: number;
  totalHarvests?: number;
}

interface UseGameStateParams {
  loadedState: LoadedGameState | null;
  initialVeggies: Veggie[];
}

/**
 * Custom hook for managing core game state.
 * Handles all persistent game data that gets saved/loaded.
 */
export const useGameState = ({ loadedState, initialVeggies }: UseGameStateParams) => {
  // Migration function to add missing properties to saved veggie data
  const migrateVeggieData = (loadedVeggies: any[]): Veggie[] => {
    if (!loadedVeggies) return initialVeggies;
    
    return loadedVeggies.map((savedVeggie, index) => {
      const initialVeggie = initialVeggies[index];
      
      // Add missing properties with defaults
      const migratedVeggie: any = { ...savedVeggie };
      
      // If autoPurchasers is missing, add it from the initial veggie data
      if (!savedVeggie.autoPurchasers) {
        migratedVeggie.autoPurchasers = initialVeggie 
          ? initialVeggie.autoPurchasers 
          : createAutoPurchaserConfigs(8, 10, 30, 38);
      }
      
      // If sellEnabled is missing, default to true (allow selling)
      if (savedVeggie.sellEnabled === undefined) {
        migratedVeggie.sellEnabled = true;
      }
      
      return migratedVeggie;
    });
  };

  // Core resource state
  const [veggies, setVeggies] = useState<Veggie[]>(
    loadedState?.veggies ? migrateVeggieData(loadedState.veggies) : initialVeggies
  );
  const [money, setMoney] = useState(loadedState?.money ?? 0);
  const [experience, setExperience] = useState(loadedState?.experience ?? 0);
  const [knowledge, setKnowledge] = useState(loadedState?.knowledge ?? 0);

  // Time state
  const [day, setDay] = useState(loadedState?.day ?? 1);
  const [totalDaysElapsed, setTotalDaysElapsed] = useState(loadedState?.totalDaysElapsed ?? 0);

  // Statistics state
  const [totalHarvests, setTotalHarvests] = useState(loadedState?.totalHarvests ?? 0);

  // UI/Selection state
  const [activeVeggie, setActiveVeggie] = useState(loadedState?.activeVeggie ?? 0);

  // Farm progression state
  const [farmTier, setFarmTier] = useState<number>(loadedState?.farmTier ?? 1);
  const [maxPlots, setMaxPlots] = useState<number>(loadedState?.maxPlots ?? 4);
  const FARM_BASE_COST = 500;
  const [farmCost, setFarmCost] = useState<number>(
    loadedState?.farmCost ?? Math.ceil(FARM_BASE_COST * Math.pow(1.85, (loadedState?.farmTier ?? 1) - 1))
  );
  const [highestUnlockedVeggie, setHighestUnlockedVeggie] = useState(
    loadedState?.highestUnlockedVeggie ?? 0
  );

  // Global upgrades state
  const [irrigationOwned, setIrrigationOwned] = useState(loadedState?.irrigationOwned ?? false);
  const [greenhouseOwned, setGreenhouseOwned] = useState(loadedState?.greenhouseOwned ?? false);
  const [heirloomOwned, setHeirloomOwned] = useState(loadedState?.heirloomOwned ?? false);
  const [autoSellOwned, setAutoSellOwned] = useState(loadedState?.autoSellOwned ?? false);
  const [almanacLevel, setAlmanacLevel] = useState(loadedState?.almanacLevel ?? 0);
  const [almanacCost, setAlmanacCost] = useState(loadedState?.almanacCost ?? 10);

  // Derived values
  const totalPlotsUsed = useMemo(
    () => veggies.filter(v => v.unlocked).length + veggies.reduce((sum, v) => sum + (v.additionalPlotLevel || 0), 0),
    [veggies]
  );

  const heirloomMoneyCost = useMemo(
    () => HEIRLOOM_COST_PER_VEGGIE * (highestUnlockedVeggie + 1),
    [highestUnlockedVeggie]
  );

  const heirloomKnowledgeCost = useMemo(
    () => HEIRLOOM_KN_PER_VEGGIE * (highestUnlockedVeggie + 1),
    [highestUnlockedVeggie]
  );

  return {
    // Core resources
    veggies,
    setVeggies,
    money,
    setMoney,
    experience,
    setExperience,
    knowledge,
    setKnowledge,

    // Time
    day,
    setDay,
    totalDaysElapsed,
    setTotalDaysElapsed,

    // Statistics
    totalHarvests,
    setTotalHarvests,

    // Selection
    activeVeggie,
    setActiveVeggie,

    // Farm progression
    farmTier,
    setFarmTier,
    maxPlots,
    setMaxPlots,
    farmCost,
    setFarmCost,
    FARM_BASE_COST,
    highestUnlockedVeggie,
    setHighestUnlockedVeggie,

    // Global upgrades
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

    // Derived values
    totalPlotsUsed,
    heirloomMoneyCost,
    heirloomKnowledgeCost,

    // Utility
    migrateVeggieData,
    initialVeggies
  };
};
