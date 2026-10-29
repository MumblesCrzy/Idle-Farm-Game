import { useCallback } from 'react';
import type { Veggie } from '../types/game';
import type { EventLogCallbacks } from '../context/EventLogContext';
import type { GuildState } from '../types/guilds';
import { createAllCrops, calculateExpRequirement, formatNumber } from '../utils/gameCalculations';
import { getHostileTakeoverPrice, recordTakeover } from '../utils/guildCalculations';

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
  setGuildState: React.Dispatch<React.SetStateAction<GuildState>>;
  
  // Event callbacks
  eventLogCallbacks: EventLogCallbacks;
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
  /** A Merchant's Hostile Takeover: the next farm, keeping everything */
  handleHostileTakeover: () => void;
}

/**
 * Custom hook for farm management operations.
 * 
 * This hook handles farm tier upgrades (buying larger farms). Starting a new
 * game is startNewGame in saveSystem, which replaces the save outright.
 * 
 * @example
 * ```tsx
 * const { handleBuyLargerFarm } = useFarmManagement({
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
    setGuildState,
    eventLogCallbacks,
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
    // Calculate new maxPlots (capped at twice the current max): one extra plot per 100 experience
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
    
    // Fresh crops (vegetables and fruits), including fresh auto-purchasers
    const resetVeggies = createAllCrops();
    
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
   * Hostile Takeover, for Merchants who own it: the next Farm Tier and its larger max plots,
   * by the same rule as a larger farm, at ten times the price. Crops, upgrades, auto-buyers,
   * experience, the farm upgrades and the day all stay.
   */
  const handleHostileTakeover = useCallback(() => {
    const price = getHostileTakeoverPrice(farmCost);
    if (money < price) return;
    const newMaxPlots = Math.min(maxPlots + Math.floor(experience / 100), maxPlots * 2);
    const newFarmTier = farmTier + 1;

    setMoney(m => m - price);
    setMaxPlots(newMaxPlots);
    setFarmTier(newFarmTier);
    setFarmCost(Math.ceil(FARM_BASE_COST * Math.pow(1.85, newFarmTier - 1)));
    setGuildState(prev => recordTakeover(prev));

    eventLogCallbacks.onAchievementUnlock({
      name: `Farm Tier ${newFarmTier}`,
      description: `Hostile Takeover: Farm Tier ${newFarmTier} with ${newMaxPlots} max plots, for $${formatNumber(price, 2)}. Everything was kept`,
      reward: null,
      category: 'milestone'
    });
  }, [
    experience,
    money,
    farmTier,
    maxPlots,
    farmCost,
    FARM_BASE_COST,
    setMoney,
    setMaxPlots,
    setFarmTier,
    setFarmCost,
    setGuildState,
    eventLogCallbacks
  ]);

  return {
    handleBuyLargerFarm,
    handleHostileTakeover,
  };

}
