import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { Veggie } from '../types/game';
import type { GuildState } from '../types/guilds';
import type { EventLogCallbacks } from '../context/EventLogContext';
import { calculateHarvestRewards } from '../utils/harvestCalculations';
import { applyGuildPriceBonuses, awardGuildTokens, getUpgradeLevel, hasHandsOff, isCommittedTo } from '../utils/guildCalculations';
import { GROWTH_COMPLETE_THRESHOLD } from '../config/gameConstants';
import { GUILDS_UNLOCK_TIER } from '../data/guildData';
import { useLatestRef } from './useLatestRef';
import { useDeferredEffects } from './useDeferredEffects';

/** Sigils spent on one Ritual Circles harvest */
const RITUAL_HARVEST_COST = 5;

/**
 * Dependencies required for the harvest and sell hook
 */
export interface UseHarvestAndSellDeps {
  /** Current veggies state */
  veggies: Veggie[];
  /** Setter for veggies state */
  setVeggies: Dispatch<SetStateAction<Veggie[]>>;
  /** Current experience */
  experience: number;
  /** Setter for experience */
  setExperience: Dispatch<SetStateAction<number>>;
  /** Current knowledge */
  knowledge: number;
  /** Setter for knowledge */
  setKnowledge: Dispatch<SetStateAction<number>>;
  /** Setter for money */
  setMoney: Dispatch<SetStateAction<number>>;
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
  /** Setter for highest unlocked veggie */
  setHighestUnlockedVeggie: Dispatch<SetStateAction<number>>;
  /** Setter for total harvests counter */
  setTotalHarvests: Dispatch<SetStateAction<number>>;
  /** Permanent bonuses array */
  permanentBonuses: string[];
  /** Bee yield bonus multiplier */
  beeYieldBonus: number;
  /** Currently active veggie index */
  activeVeggie: number;
  /** Event log callbacks for logging */
  eventLogCallbacks: EventLogCallbacks;
  /** Guild state for guild bonuses and currency */
  guildState: GuildState;
  /** Setter for guild state (harvests award guild currency; rituals spend it) */
  setGuildState: Dispatch<SetStateAction<GuildState>>;
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

  /** Handles manual harvest of the active veggie */
  /** Harvests the crop at this index, or the picked crop */
  handleHarvest: (cropIndex?: number) => void;

  /** Growers Guild Ritual Circles: spend sigils to harvest every ready crop */
  handleRitualHarvestAll: () => void;

  /**
   * Toggles sell enabled state for a specific veggie
   * @param index - The veggie index to toggle
   */
  handleToggleSell: (index: number) => void;

  /**
   * Toggles the auto-harvester on or off for a specific veggie
   * @param index - The veggie index to toggle
   */
  handleToggleAutoHarvester: (index: number) => void;

  /**
   * Sells all enabled veggies' stash
   * @param isAutoSell - Whether this is an auto-sell
   */
  handleSell: (isAutoSell?: boolean) => void;

  /** Safe harvest logger that defers logging to avoid setState during render */
  logHarvest: (name: string, amount: number, expGain: number, knGain: number, isAuto: boolean) => void;
}

/**
 * Custom hook for harvest and sell functionality.
 *
 * This hook manages:
 * - Harvesting veggies (manual and auto), including guild currency rewards
 * - Calculating harvest rewards (amount, experience, knowledge)
 * - Unlocking new veggies when experience thresholds are met
 * - The Growers Guild ritual harvest
 * - Toggling sell and auto-harvest per veggie
 * - Selling veggies to the merchant
 * - Event logging for harvests and sales
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
    setHighestUnlockedVeggie,
    setTotalHarvests,
    permanentBonuses,
    beeYieldBonus,
    activeVeggie,
    eventLogCallbacks,
    guildState,
    setGuildState,
  } = deps;

  // Latest values for handlers that should not be recreated on every change
  const veggiesRef = useLatestRef(veggies);
  const guildStateRef = useLatestRef(guildState);

  // Runs work recorded by state updaters once their result is committed
  const scheduleAfterCommit = useDeferredEffects();

  /**
   * Unified harvest logic for both auto and manual harvest.
   * Calculates rewards, updates stash, handles experience/knowledge gain,
   * awards guild currency, and unlocks new veggies when thresholds are met.
   */
  const harvestVeggie = useCallback((
    index: number,
    isAutoHarvest: boolean = false,
    onHarvestCallback?: (veggieName: string, amount: number, expGain: number, knGain: number, isAuto: boolean) => void
  ) => {
    try {
      // Calculate harvest amount before the state update
      const v = veggies[index];
      if (!v || v.growth < 100) return; // Early exit if not ready to harvest or invalid index

      // Use centralized harvest calculations with guild bonuses (use ref for latest state)
      const { harvestAmount, experienceGain, knowledgeGain: totalKnowledgeGain, blessedCropTriggered } = calculateHarvestRewards(
        v.additionalPlotLevel || 0,
        season,
        permanentBonuses,
        beeYieldBonus,
        almanacLevel,
        farmTier,
        knowledge,
        isAutoHarvest,
        guildStateRef.current
      );

      const newExperience = experience + experienceGain;
      const unlockKey = {};

      // Award guild currency on harvest once guilds unlock:
      // - Manual harvests always earn 1 currency
      // - Blessed crop (Soilbound Pact) triggers earn 1 currency (even on auto-harvest)
      // Members of other guilds earn their currency elsewhere (Preservers: canning).
      const earnCurrency = !isAutoHarvest || blessedCropTriggered;
      if (earnCurrency && farmTier >= GUILDS_UNLOCK_TIER) {
        const committedGuild = guildStateRef.current.committedGuild;
        if (committedGuild === 'growers') {
          // After commitment: Growers earn Sigils
          setGuildState(prev => ({
            ...prev,
            guildCurrencies: {
              ...prev.guildCurrencies,
              growers: prev.guildCurrencies.growers + 1
            }
          }));
        } else if (committedGuild === null) {
          // Before commitment: award generic guild tokens
          setGuildState(prev => awardGuildTokens(prev, 'manualHarvest', 1, farmTier));
        }
      }

      setVeggies((prev) => {
        const updated = [...prev];
        const veggie = { ...updated[index] };

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

        let highestNewlyUnlocked = -1;
        for (let i = 0; i < unlockOrder.length && totalPlotsUsed < maxPlots; i++) {
          const unlockIndex = unlockOrder[i].idx;
          updated[unlockIndex] = { ...updated[unlockIndex], unlocked: true };
          totalPlotsUsed++;
          highestNewlyUnlocked = Math.max(highestNewlyUnlocked, unlockIndex);
        }

        // Record the highest unlock after the commit
        scheduleAfterCommit(unlockKey, highestNewlyUnlocked >= 0
          ? () => setHighestUnlockedVeggie(current => Math.max(current, highestNewlyUnlocked))
          : undefined);
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
    } catch (error) {
      console.error('❌ Error in harvestVeggie:', error);
      // Don't rethrow - prevent cascade failures
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
    day,
    setVeggies,
    setKnowledge,
    setExperience,
    setTotalHarvests,
    setHighestUnlockedVeggie,
    setGuildState,
    guildStateRef,
    scheduleAfterCommit
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
   * Harvests the crop at cropIndex, or the active veggie, with event logging. Anything but a
   * number (a click event, say) means the active veggie.
   */
  const handleHarvest = useCallback((cropIndex?: number) => {
    // Engineers leave the harvest to their machines (Hands Off)
    if (hasHandsOff(guildStateRef.current)) return;
    harvestVeggie(typeof cropIndex === 'number' ? cropIndex : activeVeggie, false, logHarvest);
  }, [harvestVeggie, activeVeggie, logHarvest, guildStateRef]);

  /**
   * Ritual harvest (Growers Guild, Ritual Circles): spend sigils to harvest all ready crops
   */
  const handleRitualHarvestAll = useCallback(() => {
    const currentGuildState = guildStateRef.current;
    if (!isCommittedTo(currentGuildState, 'growers')) return;
    if (getUpgradeLevel(currentGuildState, 'growers_ritual_circles') <= 0) return;

    const currentSigils = currentGuildState.guildCurrencies['growers'] ?? 0;
    const readyIndices = veggies
      .map((v, index) => (v.growth >= GROWTH_COMPLETE_THRESHOLD ? index : -1))
      .filter(index => index >= 0);

    if (currentSigils < RITUAL_HARVEST_COST || readyIndices.length === 0) return;

    setGuildState(prev => {
      const prevSigils = prev.guildCurrencies['growers'] ?? 0;
      if (prevSigils < RITUAL_HARVEST_COST) return prev;
      return {
        ...prev,
        guildCurrencies: {
          ...prev.guildCurrencies,
          growers: prevSigils - RITUAL_HARVEST_COST
        }
      };
    });

    readyIndices.forEach(index => {
      harvestVeggie(index, false, logHarvest);
    });
  }, [veggies, harvestVeggie, logHarvest, setGuildState, guildStateRef]);

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
   * Toggle the auto-harvester for a specific veggie.
   */
  const handleToggleAutoHarvester = useCallback((index: number) => {
    // Engineers' harvesters stay on: with Hands Off, a paused crop would never be picked
    if (hasHandsOff(guildStateRef.current)) return;
    setVeggies((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], autoHarvesterEnabled: !updated[index].autoHarvesterEnabled };
      return updated;
    });
  }, [setVeggies, guildStateRef]);

  /**
   * Sell handler for merchant visits. The sale is worked out from current state
   * before any update is queued, so the money and the event log always match it.
   */
  const handleSell = useCallback((isAutoSell: boolean = false) => {
    let total = 0;
    const soldVeggies: Array<{ name: string; quantity: number; earnings: number }> = [];

    for (const v of veggiesRef.current) {
      // Only include vegetables that are enabled for selling
      if (v.sellEnabled && v.stash > 0) {
        // Apply guild price bonuses to each item individually (for Quality Grading)
        let veggieEarnings = 0;
        for (let i = 0; i < v.stash; i++) {
          // Pass true to apply quality grading bonus chance per item
          veggieEarnings += applyGuildPriceBonuses(v.salePrice, guildState, true);
        }
        soldVeggies.push({ name: v.name, quantity: v.stash, earnings: veggieEarnings });
        total += veggieEarnings;
      }
    }
    if (soldVeggies.length === 0) return;

    // Remove only what was sold, so a harvest that lands meanwhile is kept
    const soldByName = new Map(soldVeggies.map(s => [s.name, s.quantity]));
    setVeggies((prev) => prev.map((v) => {
      const sold = soldByName.get(v.name);
      return sold ? { ...v, stash: Math.max(0, v.stash - sold) } : v;
    }));
    setMoney((m: number) => m + total);

    if (total > 0) {
      eventLogCallbacks.onMerchantSale(total, soldVeggies, isAutoSell);
    }
  }, [setVeggies, setMoney, guildState, eventLogCallbacks, veggiesRef]);

  return {
    harvestVeggie,
    handleHarvest,
    handleRitualHarvestAll,
    handleToggleSell,
    handleToggleAutoHarvester,
    handleSell,
    logHarvest,
  };
}
