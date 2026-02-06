import { useCallback } from 'react';
import type { Veggie } from '../types/game';
import type { GuildState } from '../types/guilds';
import type { EventLogCallbacks } from '../context/EventLogContext';
import { calculateHarvestRewards } from '../utils/harvestCalculations';

/**
 * Dependencies required for the harvest and sell hook
 */
export interface UseHarvestAndSellDeps {
  /** Current veggies state */
  veggies: Veggie[];
  /** Setter for veggies state */
  setVeggies: React.Dispatch<React.SetStateAction<Veggie[]>>;
  /** Current experience */
  experience: number;
  /** Setter for experience */
  setExperience: React.Dispatch<React.SetStateAction<number>>;
  /** Current knowledge */
  knowledge: number;
  /** Setter for knowledge */
  setKnowledge: React.Dispatch<React.SetStateAction<number>>;
  /** Current money */
  money: number;
  /** Setter for money */
  setMoney: React.Dispatch<React.SetStateAction<number>>;
  /** Current season */
  season: string;
  /** Current day (1-365) */
  day: number;
  /** Almanac level */
  almanacLevel: number;
  /** Farm tier */
  farmTier: number;
  /** Maximum plots available */
  maxPlots: number;
  /** Highest unlocked veggie index */
  highestUnlockedVeggie: number;
  /** Setter for highest unlocked veggie */
  setHighestUnlockedVeggie: React.Dispatch<React.SetStateAction<number>>;
  /** Setter for total harvests counter */
  setTotalHarvests: React.Dispatch<React.SetStateAction<number>>;
  /** Permanent bonuses array */
  permanentBonuses: string[];
  /** Bee yield bonus multiplier */
  beeYieldBonus: number;
  /** Currently active veggie index */
  activeVeggie: number;
  /** Event log callbacks for logging */
  eventLogCallbacks: EventLogCallbacks;
  /** Guild state for guild bonuses */
  guildState?: GuildState;
}

/**
 * Return type for the harvest and sell hook
 */
export interface UseHarvestAndSellReturn {
  /**
   * Harvests a specific veggie by index
   * @param index - The veggie index to harvest
   * @param isAutoHarvest - Whether this is an auto-harvest
   * @param onHarvestCallback - Optional callback after harvest
   */
  harvestVeggie: (
    index: number,
    isAutoHarvest?: boolean,
    onHarvestCallback?: (veggieName: string, amount: number, expGain: number, knGain: number, isAuto: boolean) => void
  ) => void;
  
  /**
   * Handles manual harvest of the active veggie
   */
  handleHarvest: () => void;
  
  /**
   * Toggles sell enabled state for a specific veggie
   * @param index - The veggie index to toggle
   */
  handleToggleSell: (index: number) => void;
  
  /**
   * Sells all enabled veggies' stash
   * @param isAutoSell - Whether this is an auto-sell
   */
  handleSell: (isAutoSell?: boolean) => void;
  
  /**
   * Safe harvest logger that defers logging to avoid setState during render
   */
  logHarvest: (name: string, amount: number, expGain: number, knGain: number, isAuto: boolean) => void;
}

/**
 * Custom hook for harvest and sell functionality.
 * 
 * This hook manages:
 * - Harvesting veggies (manual and auto)
 * - Calculating harvest rewards (amount, experience, knowledge)
 * - Unlocking new veggies when experience thresholds are met
 * - Toggling sell enabled state per veggie
 * - Selling veggies to merchant
 * - Event logging for harvests and sales
 * 
 * @example
 * ```tsx
 * const {
 *   harvestVeggie,
 *   handleHarvest,
 *   handleToggleSell,
 *   handleSell,
 *   logHarvest
 * } = useHarvestAndSell({
 *   veggies,
 *   setVeggies,
 *   experience,
 *   setExperience,
 *   // ... other deps
 * });
 * ```
 * 
 * @param deps - Dependencies for harvest and sell operations
 * @returns Harvest and sell handlers
 */
export function useHarvestAndSell(deps: UseHarvestAndSellDeps): UseHarvestAndSellReturn {
  const {
    veggies,
    setVeggies,
    experience,
    setExperience,
    knowledge,
    setKnowledge,
    setMoney,
    season,
    day,
    almanacLevel,
    farmTier,
    maxPlots,
    highestUnlockedVeggie,
    setHighestUnlockedVeggie,
    setTotalHarvests,
    permanentBonuses,
    beeYieldBonus,
    activeVeggie,
    eventLogCallbacks,
    guildState,
  } = deps;

  /**
   * Unified harvest logic for both auto and manual harvest.
   * Calculates rewards, updates stash, handles experience/knowledge gain,
   * and unlocks new veggies when thresholds are met.
   */
  const harvestVeggie = useCallback((
    index: number,
    isAutoHarvest: boolean = false,
    onHarvestCallback?: (veggieName: string, amount: number, expGain: number, knGain: number, isAuto: boolean) => void
  ) => {
    // Calculate harvest amount before the state update
    const v = veggies[index];
    if (v.growth < 100) return; // Early exit if not ready to harvest
    
    // Use centralized harvest calculations with guild bonuses
    const { harvestAmount, experienceGain, knowledgeGain: totalKnowledgeGain } = calculateHarvestRewards(
      v.additionalPlotLevel || 0,
      season,
      permanentBonuses,
      beeYieldBonus,
      almanacLevel,
      farmTier,
      knowledge,
      isAutoHarvest,
      guildState
    );
    
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
      let totalPlotsUsed = updated.filter(vg => vg.unlocked).length + 
        updated.reduce((sum, vg) => sum + (vg.additionalPlotLevel || 0), 0);
      
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
      setKnowledge((k: number) => k + totalKnowledgeGain);
      setExperience((exp: number) => exp + experienceGain);
    }
    
    // Increment total harvests counter
    setTotalHarvests((prev: number) => prev + 1);
    
    // Call harvest callback if provided
    if (onHarvestCallback) {
      onHarvestCallback(v.name, harvestAmount, experienceGain, totalKnowledgeGain, isAutoHarvest);
    }
  }, [
    veggies,
    season,
    permanentBonuses,
    beeYieldBonus,
    almanacLevel,
    knowledge,
    experience,
    farmTier,
    maxPlots,
    highestUnlockedVeggie,
    day,
    setVeggies,
    setKnowledge,
    setExperience,
    setTotalHarvests,
    setHighestUnlockedVeggie
  ]);

  /**
   * Safe harvest logger to avoid setState during render.
   * Defers the event logging callback to avoid React warnings.
   */
  const logHarvest = useCallback(
    (name: string, amount: number, expGain: number, knGain: number, isAuto: boolean) => {
      setTimeout(() => {
        eventLogCallbacks.onHarvest(name, amount, expGain, knGain, isAuto);
      }, 0);
    },
    [eventLogCallbacks]
  );

  /**
   * Manual harvest button handler.
   * Harvests the currently active veggie with event logging.
   */
  const handleHarvest = useCallback(() => {
    harvestVeggie(activeVeggie, false, logHarvest);
  }, [harvestVeggie, activeVeggie, logHarvest]);

  /**
   * Toggle sell enabled for a specific veggie.
   * When disabled, the veggie's stash won't be sold on merchant visits.
   */
  const handleToggleSell = useCallback((index: number) => {
    setVeggies((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], sellEnabled: !updated[index].sellEnabled };
      return updated;
    });
  }, [setVeggies]);

  /**
   * Sell handler for merchant visits.
   * Sells all enabled veggies' stash and logs the sale.
   */
  const handleSell = useCallback((isAutoSell: boolean = false) => {
    let total = 0;
    const soldVeggies: Array<{ name: string; quantity: number; earnings: number }> = [];
    
    setVeggies((prev) => {
      total = prev.reduce((sum, v) => {
        // Only include vegetables that are enabled for selling
        if (v.sellEnabled && v.stash > 0) {
          const earnings = v.stash * v.salePrice;
          soldVeggies.push({
            name: v.name,
            quantity: v.stash,
            earnings: earnings
          });
          return sum + earnings;
        }
        return sum;
      }, 0);
      return prev.map((v) => ({
        ...v,
        // Only clear stash for vegetables that are enabled for selling
        stash: v.sellEnabled ? 0 : v.stash
      }));
    });
    setMoney((m: number) => m + total);
    
    // Log the sale if something was sold
    if (total > 0) {
      eventLogCallbacks.onMerchantSale(total, soldVeggies, isAutoSell);
    }
  }, [setVeggies, setMoney, eventLogCallbacks]);

  return {
    harvestVeggie,
    handleHarvest,
    handleToggleSell,
    handleSell,
    logHarvest,
  };
}
