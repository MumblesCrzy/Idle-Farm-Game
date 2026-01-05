import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { Veggie } from '../types/game';
import {
  calculateUpgradeCost,
  calculateInitialCost,
  createInitialVeggies
} from '../utils/gameCalculations';
import {
  IRRIGATION_COST,
  IRRIGATION_KN_COST,
  MERCHANT_COST,
  MERCHANT_KN_COST,
  GREENHOUSE_COST_PER_PLOT,
  GREENHOUSE_KN_COST_PER_PLOT
} from '../config/gameConstants';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Milestone notification object for logging purchases as milestones
 */
interface MilestoneNotification {
  name: string;
  description: string;
  reward: null;
  category: 'milestone';
}

/**
 * Callback for logging milestone events
 */
type OnMilestoneCallback = (milestone: MilestoneNotification) => void;

/**
 * Dependencies required by the purchase handlers hook
 */
export interface UsePurchaseHandlersDependencies {
  // Veggie state
  veggies: Veggie[];
  setVeggies: Dispatch<SetStateAction<Veggie[]>>;
  
  // Currency state
  money: number;
  setMoney: Dispatch<SetStateAction<number>>;
  knowledge: number;
  setKnowledge: Dispatch<SetStateAction<number>>;
  
  // Upgrade state
  heirloomOwned: boolean;
  setHeirloomOwned: Dispatch<SetStateAction<boolean>>;
  irrigationOwned: boolean;
  setIrrigationOwned: Dispatch<SetStateAction<boolean>>;
  greenhouseOwned: boolean;
  setGreenhouseOwned: Dispatch<SetStateAction<boolean>>;
  autoSellOwned: boolean;
  setAutoSellOwned: Dispatch<SetStateAction<boolean>>;
  setAlmanacLevel: Dispatch<SetStateAction<number>>;
  almanacCost: number;
  setAlmanacCost: Dispatch<SetStateAction<number>>;
  
  // Computed values
  totalPlotsUsed: number;
  maxPlots: number;
  heirloomMoneyCost: number;
  heirloomKnowledgeCost: number;
  
  // Event logging callback
  onMilestone?: OnMilestoneCallback;
}

/**
 * Return type for the usePurchaseHandlers hook
 */
export interface PurchaseHandlers {
  // Per-veggie handlers (take veggie index)
  handleBuyFertilizer: (index: number) => void;
  handleBuyHarvester: (index: number) => void;
  handleBuyHarvesterSpeed: (index: number) => void;
  handleBuyBetterSeeds: (index: number) => void;
  handleBuyAdditionalPlot: (index: number) => void;
  
  // Auto-purchaser handler (factory pattern)
  handleBuyAutoPurchaser: (autoPurchaseId: string) => (index: number) => void;
  
  // Global upgrade handlers
  handleBuyIrrigation: () => void;
  handleBuyGreenhouse: () => void;
  handleBuyHeirloom: () => void;
  handleBuyAutoSell: () => void;
  handleBuyAlmanac: () => void;
  
  // Cost constants (exposed for UI display)
  irrigationCost: number;
  irrigationKnCost: number;
}

// ============================================================================
// AUTO-PURCHASER HANDLER FACTORY
// ============================================================================

/**
 * Creates a handler for purchasing or toggling an auto-purchaser
 * 
 * This factory function handles:
 * - Initial purchase of an auto-purchaser
 * - Toggling active state for owned auto-purchasers
 * - Preventing Surveyor activation when at max plots
 * 
 * @param autoPurchaseId - ID of the auto-purchaser (e.g., 'fertilizer_auto', 'surveyor')
 * @param veggies - Current veggie state
 * @param setVeggies - Veggie state setter
 * @param money - Current money amount
 * @param setMoney - Money state setter
 * @param knowledge - Current knowledge amount
 * @param setKnowledge - Knowledge state setter
 * @param maxPlots - Maximum plot limit (optional, used for Surveyor logic)
 * @returns Handler function that takes a veggie index
 */
export const createAutoPurchaseHandler = (
  autoPurchaseId: string,
  veggies: Veggie[],
  setVeggies: Dispatch<SetStateAction<Veggie[]>>,
  money: number,
  setMoney: Dispatch<SetStateAction<number>>,
  knowledge: number,
  setKnowledge: Dispatch<SetStateAction<number>>,
  maxPlots?: number
): ((index: number) => void) => {
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

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * Hook that provides all purchase handlers for the game
 * 
 * This hook consolidates all veggie upgrade purchases and global upgrade
 * purchases into a single, well-organized interface. It handles:
 * 
 * **Per-Veggie Upgrades:**
 * - Fertilizer (increases growth rate)
 * - Harvester (enables auto-harvest)
 * - Harvester Speed (increases harvester efficiency)
 * - Better Seeds (increases sale price, enhanced by Heirloom)
 * - Additional Plot (increases harvest amount)
 * - Auto-Purchasers (automated upgrade purchasing)
 * 
 * **Global Upgrades:**
 * - Irrigation (negates drought effects)
 * - Greenhouse (enables year-round growing)
 * - Heirloom Seeds (enhances Better Seeds multiplier)
 * - Auto-Sell (automatic merchant sales)
 * - Almanac (increases knowledge gain)
 * 
 * @example
 * ```tsx
 * const {
 *   handleBuyFertilizer,
 *   handleBuyGreenhouse,
 *   irrigationCost
 * } = usePurchaseHandlers({
 *   veggies,
 *   setVeggies,
 *   money,
 *   setMoney,
 *   // ... other dependencies
 * });
 * 
 * // Use in component
 * <button onClick={() => handleBuyFertilizer(activeVeggie)}>
 *   Buy Fertilizer
 * </button>
 * ```
 */
export function usePurchaseHandlers(deps: UsePurchaseHandlersDependencies): PurchaseHandlers {
  const {
    veggies,
    setVeggies,
    money,
    setMoney,
    knowledge,
    setKnowledge,
    heirloomOwned,
    setHeirloomOwned,
    irrigationOwned,
    setIrrigationOwned,
    greenhouseOwned,
    setGreenhouseOwned,
    autoSellOwned,
    setAutoSellOwned,
    setAlmanacLevel,
    almanacCost,
    setAlmanacCost,
    totalPlotsUsed,
    maxPlots,
    heirloomMoneyCost,
    heirloomKnowledgeCost,
    onMilestone
  } = deps;

  // -------------------------------------------------------------------------
  // Per-Veggie Purchase Handlers
  // -------------------------------------------------------------------------

  /**
   * Purchase fertilizer upgrade for a specific veggie
   * Increases the veggie's growth rate
   */
  const handleBuyFertilizer = useCallback((index: number) => {
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
  }, [veggies, money, setMoney, setVeggies]);

  /**
   * Purchase harvester for a specific veggie
   * Enables automatic harvesting when growth reaches 100%
   */
  const handleBuyHarvester = useCallback((index: number) => {
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
  }, [veggies, money, setMoney, setVeggies]);

  /**
   * Purchase harvester speed upgrade for a specific veggie
   * Reduces time between auto-harvests
   */
  const handleBuyHarvesterSpeed = useCallback((index: number) => {
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
  }, [veggies, money, setMoney, setVeggies]);

  /**
   * Purchase better seeds upgrade for a specific veggie
   * Increases sale price (enhanced by Heirloom Seeds if owned)
   */
  const handleBuyBetterSeeds = useCallback((index: number) => {
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
  }, [veggies, knowledge, heirloomOwned, setKnowledge, setVeggies]);

  /**
   * Purchase additional plot for a specific veggie
   * Increases harvest amount per harvest
   */
  const handleBuyAdditionalPlot = useCallback((index: number) => {
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
  }, [veggies, totalPlotsUsed, maxPlots, money, setMoney, setVeggies]);

  /**
   * Factory for creating auto-purchaser handlers
   * Returns a handler for a specific auto-purchaser type
   */
  const handleBuyAutoPurchaser = useCallback((autoPurchaseId: string) => {
    return createAutoPurchaseHandler(autoPurchaseId, veggies, setVeggies, money, setMoney, knowledge, setKnowledge, maxPlots);
  }, [veggies, setVeggies, money, setMoney, knowledge, setKnowledge, maxPlots]);

  // -------------------------------------------------------------------------
  // Global Upgrade Purchase Handlers
  // -------------------------------------------------------------------------

  /**
   * Purchase irrigation system
   * Negates the negative effects of drought weather
   */
  const handleBuyIrrigation = useCallback(() => {
    if (!irrigationOwned && money >= IRRIGATION_COST && knowledge >= IRRIGATION_KN_COST) {
      setMoney((m: number) => m - IRRIGATION_COST);
      setKnowledge((k: number) => k - IRRIGATION_KN_COST);
      setIrrigationOwned(true);
      
      // Log irrigation purchase milestone
      onMilestone?.({
        name: 'Irrigation System',
        description: 'Installed irrigation system (Drought no longer affects crops)',
        reward: null,
        category: 'milestone'
      });
    }
  }, [irrigationOwned, money, knowledge, setMoney, setKnowledge, setIrrigationOwned, onMilestone]);

  /**
   * Purchase greenhouse
   * Enables year-round growing regardless of season
   */
  const handleBuyGreenhouse = useCallback(() => {
    const greenhouseCost = GREENHOUSE_COST_PER_PLOT * maxPlots;
    const greenhouseKnCost = GREENHOUSE_KN_COST_PER_PLOT * maxPlots;
    if (!greenhouseOwned && money >= greenhouseCost && knowledge >= greenhouseKnCost) {
      setMoney((m: number) => m - greenhouseCost);
      setKnowledge((k: number) => k - greenhouseKnCost);
      setGreenhouseOwned(true);
      
      // Log greenhouse purchase milestone
      onMilestone?.({
        name: 'Greenhouse Purchased',
        description: `Built a greenhouse for ${maxPlots} plots (All plots grow year-round)`,
        reward: null,
        category: 'milestone'
      });
    }
  }, [greenhouseOwned, money, maxPlots, knowledge, setMoney, setKnowledge, setGreenhouseOwned, onMilestone]);

  /**
   * Purchase heirloom seeds
   * Enhances Better Seeds multiplier from 1.25x to 1.5x
   * Also retroactively updates all existing Better Seeds levels
   */
  const handleBuyHeirloom = useCallback(() => {
    if (!heirloomOwned && money >= heirloomMoneyCost && knowledge >= heirloomKnowledgeCost) {
      setMoney((m: number) => m - heirloomMoneyCost);
      setKnowledge((k: number) => k - heirloomKnowledgeCost);
      setHeirloomOwned(true);
      
      // Log heirloom purchase milestone
      onMilestone?.({
        name: 'Heirloom Seeds Unlocked',
        description: 'Unlocked Heirloom Seeds (Better Seeds now 1.5x more effective)',
        reward: null,
        category: 'milestone'
      });
      
      // Retroactively update all vegetable prices to reflect the heirloom bonus
      setVeggies((prev) => {
        const baseVeggies = createInitialVeggies();
        return prev.map((v, index) => {
          if (v.betterSeedsLevel > 0) {
            // Recalculate the sale price with the heirloom multiplier
            // First, calculate the base price (original price before any Better Seeds)
            const baseSalePrice = baseVeggies[index].salePrice;
            // Then apply the heirloom multiplier (1.5x per level instead of 1.25x)
            const newSalePrice = +(baseSalePrice * Math.pow(1.5, v.betterSeedsLevel)).toFixed(2);
            return { ...v, salePrice: newSalePrice };
          }
          return v;
        });
      });
    }
  }, [heirloomOwned, money, heirloomMoneyCost, knowledge, heirloomKnowledgeCost, setMoney, setKnowledge, setHeirloomOwned, setVeggies, onMilestone]);

  /**
   * Purchase auto-sell (merchant partnership)
   * Enables automatic selling every 7 days
   */
  const handleBuyAutoSell = useCallback(() => {
    if (!autoSellOwned && money >= MERCHANT_COST && knowledge >= MERCHANT_KN_COST) {
      setMoney((m: number) => m - MERCHANT_COST);
      setKnowledge((k: number) => k - MERCHANT_KN_COST);
      setAutoSellOwned(true);
      
      // Log auto-sell purchase milestone
      onMilestone?.({
        name: 'Merchant Partnership',
        description: 'Unlocked auto-sell (Merchant buys stashed veggies every 7 days)',
        reward: null,
        category: 'milestone'
      });
    }
  }, [autoSellOwned, money, knowledge, setMoney, setKnowledge, setAutoSellOwned, onMilestone]);

  /**
   * Purchase almanac upgrade (leveled upgrade)
   * Increases knowledge gain from harvests
   */
  const handleBuyAlmanac = useCallback(() => {
    if (money >= almanacCost) {
      setMoney((m: number) => Math.max(0, m - almanacCost));
      setAlmanacLevel((lvl: number) => lvl + 1);
      setAlmanacCost((cost: number) => Math.ceil(cost * 1.15 + 5));
    }
  }, [money, almanacCost, setMoney, setAlmanacLevel, setAlmanacCost]);

  return {
    // Per-veggie handlers
    handleBuyFertilizer,
    handleBuyHarvester,
    handleBuyHarvesterSpeed,
    handleBuyBetterSeeds,
    handleBuyAdditionalPlot,
    handleBuyAutoPurchaser,
    
    // Global upgrade handlers
    handleBuyIrrigation,
    handleBuyGreenhouse,
    handleBuyHeirloom,
    handleBuyAutoSell,
    handleBuyAlmanac,
    
    // Cost constants for UI display
    irrigationCost: IRRIGATION_COST,
    irrigationKnCost: IRRIGATION_KN_COST
  };
}
