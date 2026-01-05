import { useCallback } from 'react';
import type { Veggie } from '../types/game';
import type { BeeContextValue } from '../types/bees';
import type { UseChristmasEventReturn } from './useChristmasEvent';
import type { EventLogCallbacks } from '../context/EventLogContext';
import type { WeatherType } from '../config/gameConstants';
import { GAME_STORAGE_KEY } from '../config/gameConstants';
import { createInitialVeggies, createAutoPurchaserConfigs, calculateExpRequirement } from '../utils/gameCalculations';

/**
 * Dependencies required for the farm management hook
 */
export interface UseFarmManagementDeps {
  // Current state values
  experience: number;
  money: number;
  farmTier: number;
  knowledge: number;
  maxPlots: number;
  farmCost: number;
  FARM_BASE_COST: number;
  
  // State setters
  setActiveVeggie: React.Dispatch<React.SetStateAction<number>>;
  setVeggies: React.Dispatch<React.SetStateAction<Veggie[]>>;
  setMoney: React.Dispatch<React.SetStateAction<number>>;
  setExperience: React.Dispatch<React.SetStateAction<number>>;
  setKnowledge: React.Dispatch<React.SetStateAction<number>>;
  setDay: React.Dispatch<React.SetStateAction<number>>;
  setTotalDaysElapsed: React.Dispatch<React.SetStateAction<number>>;
  setTotalHarvests: React.Dispatch<React.SetStateAction<number>>;
  setGreenhouseOwned: React.Dispatch<React.SetStateAction<boolean>>;
  setAlmanacLevel: React.Dispatch<React.SetStateAction<number>>;
  setAlmanacCost: React.Dispatch<React.SetStateAction<number>>;
  setAutoSellOwned: React.Dispatch<React.SetStateAction<boolean>>;
  setHeirloomOwned: React.Dispatch<React.SetStateAction<boolean>>;
  setMaxPlots: React.Dispatch<React.SetStateAction<number>>;
  setFarmTier: React.Dispatch<React.SetStateAction<number>>;
  setIrrigationOwned: React.Dispatch<React.SetStateAction<boolean>>;
  setGlobalAutoPurchaseTimer: React.Dispatch<React.SetStateAction<number>>;
  setFarmCost: React.Dispatch<React.SetStateAction<number>>;
  setHighestUnlockedVeggie: React.Dispatch<React.SetStateAction<number>>;
  setCurrentWeather: React.Dispatch<React.SetStateAction<WeatherType>>;
  setBlockAchievementChecks: (value: boolean) => void;
  setJustReset: (value: boolean) => void;
  
  // Event callbacks
  eventLogCallbacks: EventLogCallbacks;
  
  // External systems (optional)
  globalBeeContext: BeeContextValue | null;
  christmasEvent: UseChristmasEventReturn | null;
}

/**
 * Return type for the farm management hook
 */
export interface UseFarmManagementReturn {
  /**
   * Handles purchasing a larger farm (tier upgrade)
   * - Increases max plots based on experience
   * - Resets most game state while keeping some resources
   * - Increases farm tier and farm cost
   */
  handleBuyLargerFarm: () => void;
  
  /**
   * Completely resets the game to initial state
   * - Clears all localStorage data
   * - Resets all state to initial values
   * - Resets achievements, bee system, and events
   */
  resetGame: () => void;
}

/**
 * Custom hook for farm management operations.
 * 
 * This hook handles:
 * - Farm tier upgrades (buying larger farms)
 * - Complete game reset functionality
 * 
 * @example
 * ```tsx
 * const { handleBuyLargerFarm, resetGame } = useFarmManagement({
 *   experience,
 *   money,
 *   farmTier,
 *   // ... other deps
 * });
 * ```
 * 
 * @param deps - Dependencies for farm management operations
 * @returns Farm management handlers
 */
export function useFarmManagement(deps: UseFarmManagementDeps): UseFarmManagementReturn {
  const {
    experience,
    money,
    farmTier,
    knowledge,
    maxPlots,
    farmCost,
    FARM_BASE_COST,
    setActiveVeggie,
    setVeggies,
    setMoney,
    setExperience,
    setKnowledge,
    setDay,
    setTotalDaysElapsed,
    setTotalHarvests,
    setGreenhouseOwned,
    setAlmanacLevel,
    setAlmanacCost,
    setAutoSellOwned,
    setHeirloomOwned,
    setMaxPlots,
    setFarmTier,
    setIrrigationOwned,
    setGlobalAutoPurchaseTimer,
    setFarmCost,
    setHighestUnlockedVeggie,
    setCurrentWeather,
    setBlockAchievementChecks,
    setJustReset,
    eventLogCallbacks,
    globalBeeContext,
    christmasEvent,
  } = deps;

  /**
   * Handles purchasing a larger farm (tier upgrade).
   * 
   * This operation:
   * 1. Calculates new max plots based on experience bonus
   * 2. Keeps money above farmCost and all knowledge
   * 3. Resets veggies, upgrades, and most game state
   * 4. Increments farm tier and updates farm cost
   * 5. Sets starting experience based on new tier
   */
  const handleBuyLargerFarm = useCallback(() => {
    // Calculate new maxPlots (capped at twice the current max)
    const experienceBonus = Math.floor(experience / 100);
    const uncappedMaxPlots = maxPlots + experienceBonus;
    const newMaxPlots = Math.min(uncappedMaxPlots, maxPlots * 2);
    
    // Calculate money to keep
    const moneyKept = money - farmCost;
    
    // Calculate knowledge to keep (all of current)
    const knowledgeKept = knowledge;
    
    // Calculate new farm tier
    const newFarmTier = farmTier + 1;
    
    // Calculate starting experience based on farm tier to unlock appropriate vegetables
    // Tier 1: Radish (0 exp), Tier 2: + Lettuce (95 exp), Tier 3: + Green Beans (180 exp), etc.
    const startingExperience = newFarmTier > 1 ? calculateExpRequirement(newFarmTier - 1) : 0;
    
    // Reset veggies with fresh auto-purchaser configs
    const resetVeggies = createInitialVeggies().map(v => ({
      ...v,
      autoPurchasers: createAutoPurchaserConfigs(
        v.autoPurchasers[0].cost,
        v.autoPurchasers[1].cost,
        v.autoPurchasers[2].cost,
        v.autoPurchasers[3].cost
      )
    }));
    
    // Set activeVeggie to 0 FIRST to prevent rendering issues
    setActiveVeggie(0);
    setVeggies(resetVeggies);
    setMoney(moneyKept > 0 ? moneyKept : 0);
    setExperience(startingExperience);
    setKnowledge(knowledgeKept);
    setDay(1);
    setGreenhouseOwned(false);
    setAlmanacLevel(0);
    setAlmanacCost(10);
    setAutoSellOwned(false);
    setHeirloomOwned(false);
    setMaxPlots(newMaxPlots);
    setFarmTier(newFarmTier);
    setIrrigationOwned(false);
    setGlobalAutoPurchaseTimer(0);
    setFarmCost(Math.ceil(FARM_BASE_COST * Math.pow(1.85, newFarmTier - 1)));
    
    // Log farm tier upgrade milestone
    eventLogCallbacks.onAchievementUnlock({
      name: `Farm Tier ${newFarmTier}`,
      description: `Upgraded to Farm Tier ${newFarmTier} with ${newMaxPlots} max plots`,
      reward: null,
      category: 'milestone'
    });
  }, [
    experience,
    money,
    farmTier,
    knowledge,
    maxPlots,
    farmCost,
    FARM_BASE_COST,
    setActiveVeggie,
    setVeggies,
    setMoney,
    setExperience,
    setKnowledge,
    setDay,
    setGreenhouseOwned,
    setAlmanacLevel,
    setAlmanacCost,
    setAutoSellOwned,
    setHeirloomOwned,
    setMaxPlots,
    setFarmTier,
    setIrrigationOwned,
    setGlobalAutoPurchaseTimer,
    setFarmCost,
    eventLogCallbacks
  ]);

  /**
   * Completely resets the game to initial state.
   * 
   * This operation:
   * 1. Blocks achievement checks during reset
   * 2. Clears all localStorage game data
   * 3. Resets all state to initial values
   * 4. Resets achievements, bee system, and Christmas event
   * 5. Re-enables features after state propagation
   */
  const resetGame = useCallback(() => {
    // Block achievement checks during reset to prevent re-unlocking
    setBlockAchievementChecks(true);
    
    // Remove all data from localStorage first
    localStorage.removeItem(GAME_STORAGE_KEY);
    
    // Create fresh veggies using the factory function
    const resetVeggies = createInitialVeggies();
    
    setFarmTier(1);
    setDay(1);
    setTotalDaysElapsed(0);
    setTotalHarvests(0);
    setMaxPlots(4);
    setMoney(0);
    setExperience(0);
    setKnowledge(0);
    setActiveVeggie(0);
    setVeggies(resetVeggies);
    setAlmanacLevel(0);
    setAlmanacCost(10);
    setIrrigationOwned(false);
    setAutoSellOwned(false);
    setGreenhouseOwned(false);
    setHeirloomOwned(false);
    setCurrentWeather('Clear');
    setFarmCost(FARM_BASE_COST);
    setHighestUnlockedVeggie(0);
    
    // Reset achievements FIRST, before resetting bee system
    eventLogCallbacks.resetAchievements();
    
    // Reset bee system (this will trigger beeState update and achievement check)
    if (globalBeeContext?.resetBeeSystem) {
      globalBeeContext.resetBeeSystem();
    }
    
    // Clear event log
    eventLogCallbacks.clearEventLog();
    
    // Reset Christmas event
    if (christmasEvent?.resetEvent) {
      christmasEvent.resetEvent();
    }
    
    // Wait for state updates to propagate, then re-enable features
    setTimeout(() => {
      setBlockAchievementChecks(false);
      setJustReset(false);
      
      // Trigger a state change to ensure auto-save runs with reset values
      setMoney(prev => prev);
    }, 100);
    
    // Prevent auto-save from running until state updates propagate
    setJustReset(true);
  }, [
    FARM_BASE_COST,
    setBlockAchievementChecks,
    setFarmTier,
    setDay,
    setTotalDaysElapsed,
    setTotalHarvests,
    setMaxPlots,
    setMoney,
    setExperience,
    setKnowledge,
    setActiveVeggie,
    setVeggies,
    setAlmanacLevel,
    setAlmanacCost,
    setIrrigationOwned,
    setAutoSellOwned,
    setGreenhouseOwned,
    setHeirloomOwned,
    setCurrentWeather,
    setFarmCost,
    setHighestUnlockedVeggie,
    setJustReset,
    eventLogCallbacks,
    globalBeeContext,
    christmasEvent
  ]);

  return {
    handleBuyLargerFarm,
    resetGame,
  };
}
