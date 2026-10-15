/**
 * Christmas Tree Shop Event Hook
 * 
 * Manages the complete state and logic for the Christmas Tree Shop event.
 * Handles Holiday Cheer currency, tree farming, decoration crafting, and sales.
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useLatestRef } from './useLatestRef';
import { getEventUpgradeCost } from '../utils/christmasUpgrades';
import { floorCheer, getTreePrice, getSaleCheerMultiplier, parseTreeKey, rollRegisterTips } from '../utils/christmasTreePricing';
import type {
  ChristmasEventState,
  TreePlot,
  TreeType,
  DecorationType,
  CraftingMaterials,
} from '../types/christmasEvent';
import {
  EVENT_CONSTANTS,
  TREE_DEFINITIONS,
  ALL_EVENT_UPGRADES,
  EVENT_MILESTONES,
  QUALITY_MULTIPLIERS,
  CRAFTING_RECIPES,
} from '../data/christmasEventData';

interface UseChristmasEventParams {
  initialState?: Partial<ChristmasEventState>;
  farmTier: number; // For persisting across prestige
  onTreeSold?: (treeType: string, quantity: number, cheerEarned: number) => void;
  onTreeHarvested?: (treeType: string, quality: string) => void;
  onItemCrafted?: (itemName: string, quantity: number) => void;
  onUpgradePurchased?: (upgradeName: string, cost: number) => void;
  onMilestoneClaimed?: (milestoneName: string) => void;
}

export interface UseChristmasEventReturn {
  // State
  eventState: ChristmasEventState;
  isEventActive: boolean;
  
  // Currency
  holidayCheer: number;
  earnCheer: (amount: number) => void;
  spendCheer: (amount: number) => boolean;
  
  // Tree Management
  treePlots: TreePlot[];
  plantTree: (plotIndex: number, treeType: TreeType) => void;
  harvestTree: (plotIndex: number) => void;
  harvestAllTrees: () => void;
  
  // Materials
  materials: CraftingMaterials;
  
  // Crafting
  craftItem: (recipeId: string, quantity: number) => boolean;
  
  // Decoration
  decorateTree: (treeType: TreeType, decorations: DecorationType[]) => boolean;
  addToDecorationQueue: (treeType: TreeType, decorations: DecorationType[]) => void;
  removeFromQueue: (queueItemId: string) => void;
  
  // Sales
  sellTrees: (treeKey: string, quantity: number) => void;
  sellAllTrees: () => void;
  sellGarland: (quantity: number) => void;
  sellCandle: (quantity: number) => void;
  sellOrnament: (quantity: number) => void;
  claimDailyBonus: () => boolean;
  totalTreesSold: number;
  demandMultiplier: number;
  dailyBonusAvailable: boolean;
  passiveCheerPerSecond: number;
  
  // Upgrades
  purchaseUpgrade: (upgradeId: string) => boolean;
  claimMilestone: (milestoneId: string) => boolean;
  
  // Cosmetics
  toggleCosmetic: (cosmeticId: string) => void;
  
  // Utility
  updatePassiveIncome: (deltaTime: number) => void;
  processTreeGrowth: (ticks?: number) => void;
  processDailyElvesCrafting: (ticks?: number) => void;
  checkEventActive: () => boolean;
  resetEvent: () => void;
  
  // Automation feedback
  currentElvesAction?: ChristmasEventState['currentElvesAction'];
  
  // Magical Register bonus tracking (object with timestamp to trigger new toasts)
  lastMagicalRegisterBonus: { amount: number; timestamp: number };
}

/**
 * Initialize a fresh event state
 */
function createInitialEventState(_farmTier: number): ChristmasEventState {
  const now = new Date();
  const currentYear = now.getFullYear();
  
  return {
    isActive: false,
    eventYear: currentYear,
    holidayCheer: EVENT_CONSTANTS.STARTING_CHEER,
    totalCheerEarned: 0,
    treePlots: Array.from({ length: EVENT_CONSTANTS.DEFAULT_PLOT_COUNT }, (_, i) => ({
      id: `plot_${i}`,
      treeType: null,
      growth: 0,
      growthTime: 0,
      quality: 'normal',
      decorations: {
        ornaments: false,
        garland: false,
        candles: false,
      },
      harvestReady: false,
    })),
    maxPlots: EVENT_CONSTANTS.DEFAULT_PLOT_COUNT,
    materials: {
      wood: 0,
      pinecones: 0,
      branches: 0,
      ornaments: 0,
      garlands: 0,
      naturalOrnaments: 0,
      candles: 0,
    },
    treeInventory: {},
    decorationQueue: [],
    maxQueueSize: EVENT_CONSTANTS.MAX_QUEUE_SIZE,
    totalTreesSold: 0,
    marketDemand: {
      basePrice: 10,
      demandMultiplier: EVENT_CONSTANTS.BASE_DEMAND_MULTIPLIER,
      lastUpdate: now,
    },
    dailyBonus: {
      claimed: false,
      lastClaimDate: '',
      bonusAmount: EVENT_CONSTANTS.DAILY_BONUS_BASE,
    },
    passiveCheerPerSecond: 0,
    upgrades: ALL_EVENT_UPGRADES.map(u => ({ ...u })),
    milestones: EVENT_MILESTONES.map(m => ({ ...m })),
    unlockedCosmetics: [],
    activeCosmetics: [],
    permanentBonuses: [],
    unlockedRecipes: [],
  };
}

/** A pure state change plus what it did, for logging and return values */
type Transition<R> = { next: ChristmasEventState; result: R };

/**
 * Pre-rolled random numbers for a transition. Transitions run twice (once to
 * decide, once inside the updater), so randomness is rolled once beforehand and
 * replayed. Rolls past the end return 1, which never triggers a bonus.
 */
function rollSource(rolls: number[]): () => number {
  let index = 0;
  return () => (index < rolls.length ? rolls[index++] : 1);
}

/** Total trees in an inventory */
function countTrees(inventory: Record<string, number>): number {
  return Object.values(inventory).reduce((sum, quantity) => sum + quantity, 0);
}

/**
 * Works out an upgrade purchase without side effects.
 * Returns the next state plus the name and price for logging, or null when the
 * purchase isn't possible (unknown id, already owned, at max level, or not enough cheer).
 */
function applyUpgradePurchase(
  state: ChristmasEventState,
  upgradeId: string
): { next: ChristmasEventState; name: string; cost: number } | null {
  const upgrade = state.upgrades.find(u => u.id === upgradeId);
  if (!upgrade) return null;

  if (upgrade.repeatable) {
    const currentLevel = upgrade.level ?? 0;
    const maxLevel = upgrade.maxLevel ?? Infinity;
    if (currentLevel >= maxLevel) return null;

    const nextLevelCost = getEventUpgradeCost(upgrade);
    if (state.holidayCheer < nextLevelCost) return null;

    const next: ChristmasEventState = {
      ...state,
      holidayCheer: state.holidayCheer - nextLevelCost,
      upgrades: state.upgrades.map(u =>
        u.id === upgradeId ? { ...u, level: currentLevel + 1, owned: true } : u
      ),
    };

    // Greenhouse Extension adds a tree plot
    if (upgradeId === 'greenhouse_extension') {
      next.treePlots = [...state.treePlots, {
        id: `plot_${state.treePlots.length}`,
        treeType: null,
        growth: 0,
        growthTime: 0,
        quality: 'normal' as const,
        decorations: {
          ornaments: false,
          garland: false,
          candles: false,
        },
        harvestReady: false,
      }];
      next.maxPlots = state.maxPlots + 1;
    }

    return { next, name: upgrade.name, cost: nextLevelCost };
  }

  // Non-repeatable upgrade
  if (upgrade.owned || state.holidayCheer < upgrade.cost) return null;

  const newUpgrades = state.upgrades.map(u =>
    u.id === upgradeId ? { ...u, owned: true } : u
  );

  // Golden Bell Counter sets the passive income rate
  let passiveCheerPerSecond = state.passiveCheerPerSecond;
  if (upgradeId === 'golden_bell_counter') {
    const goldenBell = newUpgrades.find(u => u.id === 'golden_bell_counter');
    if (goldenBell && goldenBell.passiveIncome) {
      passiveCheerPerSecond = goldenBell.passiveIncome;
    }
  }

  return {
    next: {
      ...state,
      holidayCheer: state.holidayCheer - upgrade.cost,
      upgrades: newUpgrades,
      passiveCheerPerSecond,
    },
    name: upgrade.name,
    cost: upgrade.cost,
  };
}

/**
 * Check if the current date is within the event period
 */
function isWithinEventPeriod(): boolean {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  const day = now.getDate();
  
  // November 1 - December 25
  if (month === EVENT_CONSTANTS.START_MONTH && day >= EVENT_CONSTANTS.START_DAY) {
    return true; // November 1-30
  }
  if (month === EVENT_CONSTANTS.END_MONTH && day <= EVENT_CONSTANTS.END_DAY) {
    return true; // December 1-25
  }
  
  return false;
}

/**
 * Calculate market demand multiplier based on proximity to Christmas
 * Increases from BASE_DEMAND_MULTIPLIER (1.0) to MAX_DEMAND_MULTIPLIER (2.0)
 * as it gets closer to December 25
 */
function calculateDemandMultiplier(): number {
  const now = new Date();
  
  // Event runs Nov 1 - Dec 25
  const eventStart = new Date(now.getFullYear(), 10, 1); // Nov 1 (month 10)
  const eventEnd = new Date(now.getFullYear(), 11, 25);   // Dec 25 (month 11)
  
  // If not in event period, return base multiplier
  if (now < eventStart || now > eventEnd) {
    return EVENT_CONSTANTS.BASE_DEMAND_MULTIPLIER;
  }
  
  // Calculate days elapsed and total days in event
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysElapsed = Math.floor((now.getTime() - eventStart.getTime()) / msPerDay);
  const totalEventDays = Math.floor((eventEnd.getTime() - eventStart.getTime()) / msPerDay);
  
  // Linear progression from 1.0 to 2.0
  const progress = daysElapsed / totalEventDays;
  const multiplier = EVENT_CONSTANTS.BASE_DEMAND_MULTIPLIER + 
    (progress * (EVENT_CONSTANTS.MAX_DEMAND_MULTIPLIER - EVENT_CONSTANTS.BASE_DEMAND_MULTIPLIER));
  
  // Clamp between min and max
  return Math.min(
    EVENT_CONSTANTS.MAX_DEMAND_MULTIPLIER,
    Math.max(EVENT_CONSTANTS.BASE_DEMAND_MULTIPLIER, multiplier)
  );
}

/**
 * Main Christmas Event Hook
 */
export function useChristmasEvent({
  initialState,
  farmTier,
  onTreeSold,
  onTreeHarvested,
  onItemCrafted,
  onUpgradePurchased,
  onMilestoneClaimed,
}: UseChristmasEventParams): UseChristmasEventReturn {
  // Track last magical register bonus for toast display
  // Using object with timestamp ensures each bonus triggers a new toast
  const [lastMagicalRegisterBonus, setLastMagicalRegisterBonus] = useState({ amount: 0, timestamp: 0 });
  
  // Use refs for callbacks so they can be updated without recreating the hook functions
  const callbacksRef = useRef({
    onTreeSold,
    onTreeHarvested,
    onItemCrafted,
    onUpgradePurchased,
    onMilestoneClaimed,
  });
  
  // Update refs when callbacks change
  useEffect(() => {
    callbacksRef.current = {
      onTreeSold,
      onTreeHarvested,
      onItemCrafted,
      onUpgradePurchased,
      onMilestoneClaimed,
    };
  }, [onTreeSold, onTreeHarvested, onItemCrafted, onUpgradePurchased, onMilestoneClaimed]);
  
  // Initialize event state
  const [eventState, setEventState] = useState<ChristmasEventState>(() => {
    const baseState = createInitialEventState(farmTier);
    
    if (!initialState) {
      // Set initial demand multiplier based on current date
      baseState.marketDemand.demandMultiplier = calculateDemandMultiplier();
      return baseState;
    }
    
    // Merge saved state with base state
    const mergedState = { ...baseState, ...initialState };
    
    // Update demand multiplier to current date (in case game was loaded from an old save)
    mergedState.marketDemand.demandMultiplier = calculateDemandMultiplier();
    mergedState.marketDemand.lastUpdate = new Date();
    
    // Migrate old tree inventory keys to new format with quality
    // Old format: pine_plain, New format: pine_normal_plain
    if (mergedState.treeInventory) {
      const migratedInventory: Record<string, number> = {};
      Object.keys(mergedState.treeInventory).forEach(key => {
        const quantity = mergedState.treeInventory[key];
        // Check if key is in old format (doesn't have quality)
        const parts = key.split('_');
        if (parts.length === 2) {
          // Old format: treeType_decorationLevel -> convert to treeType_normal_decorationLevel
          const [treeType, decorationLevel] = parts;
          const newKey = `${treeType}_normal_${decorationLevel}`;
          migratedInventory[newKey] = (migratedInventory[newKey] || 0) + quantity;
        } else {
          // Already in new format or unrecognized, keep as is
          migratedInventory[key] = quantity;
        }
      });
      mergedState.treeInventory = migratedInventory;
    }
    
    // Migrate upgrades: merge saved state (owned, level) with current definitions (icon, name, etc.)
    // This ensures old saves get new fields like 'icon' while preserving purchase state
    const savedUpgradeMap = new Map(mergedState.upgrades.map(u => [u.id, u]));
    
    mergedState.upgrades = ALL_EVENT_UPGRADES.map(baseUpgrade => {
      const savedUpgrade = savedUpgradeMap.get(baseUpgrade.id);
      if (savedUpgrade) {
        // Merge: take base upgrade definition and override with saved state
        return {
          ...baseUpgrade,  // Fresh data from code (icon, name, description, etc.)
          ...savedUpgrade, // Saved state (owned, level, etc.)
          // Ensure critical fields from base are preserved
          icon: baseUpgrade.icon,
          name: baseUpgrade.name,
          description: baseUpgrade.description,
          category: baseUpgrade.category,
          cost: baseUpgrade.cost,
          effect: baseUpgrade.effect,
          maxLevel: baseUpgrade.maxLevel, // Update max level from base
          costScaling: baseUpgrade.costScaling, // Update cost scaling from base
          requires: baseUpgrade.requires,
          hiddenUntilRequired: baseUpgrade.hiddenUntilRequired,
        };
      }
      // New upgrade not in saved state
      return { ...baseUpgrade };
    });
    
    // Migrate passive income: if player owns golden bell but passiveCheerPerSecond is 0, set it
    const goldenBell = mergedState.upgrades.find(u => u.id === 'golden_bell_counter');
    if (goldenBell?.owned && mergedState.passiveCheerPerSecond === 0 && goldenBell.passiveIncome) {
      mergedState.passiveCheerPerSecond = goldenBell.passiveIncome;
    }
    
    return mergedState;
  });
  
  // Check if event is currently active based on date
  const checkEventActive = useCallback(() => {
    return isWithinEventPeriod();
  }, []);
  
  // Re-checked by the hourly timer below, so a tab left open starts and ends the event on time
  const [isEventActive, setIsEventActive] = useState(() => isWithinEventPeriod());

  // Latest state for handlers that must decide before queueing an update
  const eventStateRef = useLatestRef(eventState);

  /**
   * Applies a pure state transition and returns its result.
   *
   * The transition decides from the state it is given and returns the next state
   * with a result, or null when nothing should happen. It runs on the latest state
   * to decide and report, then again inside the updater so it composes with any
   * other queued update. Callers fire callbacks afterwards, outside the updater,
   * so a result is never read back out of an updater that may not have run yet.
   */
  const transact = useCallback(<R>(
    transition: (state: ChristmasEventState) => Transition<R> | null
  ): R | null => {
    const outcome = transition(eventStateRef.current);
    if (!outcome) return null;
    // Let a second action in the same frame see this one
    eventStateRef.current = outcome.next;
    setEventState(prev => transition(prev)?.next ?? prev);
    return outcome.result;
  }, [eventStateRef]);
  
  // Update event active state when date changes
  useEffect(() => {
    setEventState(prev => ({ ...prev, isActive: isEventActive }));
  }, [isEventActive]);
  
  // Update market demand multiplier based on proximity to Christmas
  useEffect(() => {
    const updateDemand = () => {
      setIsEventActive(isWithinEventPeriod());
      const newMultiplier = calculateDemandMultiplier();
      setEventState(prev => {
        // Only update if multiplier has changed to avoid unnecessary re-renders
        if (prev.marketDemand.demandMultiplier !== newMultiplier) {
          return {
            ...prev,
            marketDemand: {
              ...prev.marketDemand,
              demandMultiplier: newMultiplier,
              lastUpdate: new Date(),
            },
          };
        }
        return prev;
      });
    };
    
    // Update immediately on mount
    updateDemand();
    
    // Update every hour (3600000ms) to catch date changes
    const interval = setInterval(updateDemand, 3600000);
    
    return () => clearInterval(interval);
  }, []);
  
  // ============================================================================
  // CURRENCY MANAGEMENT
  // ============================================================================
  
  const earnCheer = useCallback((amount: number) => {
    setEventState(prev => ({
      ...prev,
      holidayCheer: prev.holidayCheer + amount,
      totalCheerEarned: prev.totalCheerEarned + amount,
    }));
  }, []);
  
  const spendCheer = useCallback((amount: number): boolean => {
    return transact(state => state.holidayCheer < amount ? null : {
      next: { ...state, holidayCheer: state.holidayCheer - amount },
      result: true
    }) ?? false;
  }, [transact]);
  
  // ============================================================================
  // TREE MANAGEMENT
  // ============================================================================
  
  const plantTree = useCallback((plotIndex: number, treeType: TreeType) => {
    setEventState(prev => {
      const newPlots = [...prev.treePlots];
      const plot = newPlots[plotIndex];
      
      if (plot.treeType !== null) {
        return prev; // Plot already occupied
      }
      
      const treeDefinition = TREE_DEFINITIONS[treeType];
      
      newPlots[plotIndex] = {
        ...plot,
        treeType,
        growth: 0,
        growthTime: treeDefinition.baseGrowthTime,
        quality: 'normal',
        decorations: {
          ornaments: false,
          garland: false,
          candles: false,
        },
        harvestReady: false,
      };
      
      return {
        ...prev,
        treePlots: newPlots,
      };
    });
  }, []);
  
  const harvestTree = useCallback((plotIndex: number) => {
    const harvested = transact(state => {
      const plot = state.treePlots[plotIndex];

      if (!plot || !plot.harvestReady || !plot.treeType) {
        return null;
      }

      const treeDefinition = TREE_DEFINITIONS[plot.treeType];
      const qualityMultiplier = QUALITY_MULTIPLIERS[plot.quality];
      const newMaterials = { ...state.materials };

      // Apply quality multiplier to yields (Perfect trees give 2x, Luxury 3x)
      newMaterials.wood += Math.floor(treeDefinition.baseYield.wood * qualityMultiplier);
      newMaterials.pinecones += Math.floor(treeDefinition.baseYield.pinecones * qualityMultiplier);
      newMaterials.branches += Math.floor(treeDefinition.baseYield.branches * qualityMultiplier);

      // Earn Holiday Cheer from harvesting (base 5, +5 for perfect, +10 for luxury)
      const cheerEarned = plot.quality === 'luxury' ? 15 : plot.quality === 'perfect' ? 10 : 5;

      // Check if Elves' Bench is enabled for auto-decorating
      const elvesBenchOwned = state.upgrades.find(u => u.id === 'elves_bench')?.owned ?? false;

      // Include quality in the tree key: treeType_quality_decorationLevel
      let finalTreeKey = `${plot.treeType}_${plot.quality}_plain`;
      const newInventory = { ...state.treeInventory };

      // Elves' Bench Automation: auto-decorate the harvested tree with the most
      // valuable decorations available. Priority: Luxury > Candled > Ornamented > Plain
      if (elvesBenchOwned) {
        const hasOrnament = (newMaterials.ornaments || 0) > 0;
        const hasCandle = (newMaterials.candles || 0) > 0;

        if (hasOrnament && hasCandle) {
          newMaterials.ornaments = (newMaterials.ornaments || 0) - 1;
          newMaterials.candles = (newMaterials.candles || 0) - 1;
          finalTreeKey = `${plot.treeType}_${plot.quality}_luxury`;
        } else if (hasCandle) {
          newMaterials.candles = (newMaterials.candles || 0) - 1;
          finalTreeKey = `${plot.treeType}_${plot.quality}_candled`;
        } else if (hasOrnament) {
          newMaterials.ornaments = (newMaterials.ornaments || 0) - 1;
          finalTreeKey = `${plot.treeType}_${plot.quality}_ornamented`;
        }
      }

      // Add tree to inventory
      newInventory[finalTreeKey] = (newInventory[finalTreeKey] || 0) + 1;

      // Reset plot
      const newPlots = [...state.treePlots];
      newPlots[plotIndex] = {
        ...plot,
        treeType: null,
        growth: 0,
        growthTime: 0,
        quality: 'normal',
        decorations: {
          ornaments: false,
          garland: false,
          candles: false,
        },
        harvestReady: false,
      };

      return {
        next: {
          ...state,
          treePlots: newPlots,
          materials: newMaterials,
          treeInventory: newInventory,
          holidayCheer: state.holidayCheer + cheerEarned,
          totalCheerEarned: state.totalCheerEarned + cheerEarned,
        },
        result: { treeType: plot.treeType, quality: plot.quality }
      };
    });

    // Log the harvest event
    if (harvested) {
      const treeTypeName = harvested.treeType.charAt(0).toUpperCase() + harvested.treeType.slice(1);
      const qualityName = harvested.quality.charAt(0).toUpperCase() + harvested.quality.slice(1);
      callbacksRef.current.onTreeHarvested?.(treeTypeName, qualityName);
    }
  }, [transact]);
  
  const harvestAllTrees = useCallback(() => {
    // Each harvest updates the latest-state ref, so the next one sees it
    eventStateRef.current.treePlots.forEach((plot, index) => {
      if (plot.harvestReady) {
        harvestTree(index);
      }
    });
  }, [harvestTree, eventStateRef]);
  
  // ============================================================================
  // CRAFTING
  // ============================================================================
  
  const craftItem = useCallback((recipeId: string, quantity: number = 1): boolean => {
    const recipe = CRAFTING_RECIPES.find(r => r.id === recipeId);
    
    if (!recipe) {
      return false;
    }
    
    const crafted = transact(state => {
      // Check if player has enough materials
      const hasEnoughMaterials = Object.entries(recipe.inputs).every(([material, amount]) => {
        return state.materials[material as keyof CraftingMaterials] >= amount * quantity;
      });
      if (!hasEnoughMaterials) return null;

      const newMaterials = { ...state.materials };

      // Deduct inputs
      Object.entries(recipe.inputs).forEach(([material, amount]) => {
        newMaterials[material as keyof CraftingMaterials] -= amount * quantity;
      });

      // Add outputs
      Object.entries(recipe.output).forEach(([item, amount]) => {
        newMaterials[item as keyof CraftingMaterials] += amount * quantity;
      });

      return { next: { ...state, materials: newMaterials }, result: true };
    });

    // Log the crafting event
    if (crafted) {
      callbacksRef.current.onItemCrafted?.(recipe.name, quantity);
    }

    return crafted ?? false;
  }, [transact]);
  
  // ============================================================================
  // DECORATION
  // ============================================================================
  
  const decorateTree = useCallback((treeType: TreeType, decorations: DecorationType[]): boolean => {
    return transact(state => {
      // Find a plain tree of this type (any quality).
      // Format: treeType_quality_plain (e.g., pine_normal_plain, pine_perfect_plain)
      const plainTreeKeys = Object.keys(state.treeInventory).filter(key =>
        key.startsWith(`${treeType}_`) && key.endsWith('_plain')
      );
      if (plainTreeKeys.length === 0) return null;

      // Use the first available plain tree (prioritize normal, then perfect, then luxury)
      const qualityOrder = { normal: 0, perfect: 1, luxury: 2 };
      const sortedKeys = [...plainTreeKeys].sort((a, b) => {
        const qualityA = a.split('_')[1] as 'normal' | 'perfect' | 'luxury';
        const qualityB = b.split('_')[1] as 'normal' | 'perfect' | 'luxury';
        return qualityOrder[qualityA] - qualityOrder[qualityB];
      });
      const plainTreeKey = sortedKeys[0];
      const quality = plainTreeKey.split('_')[1] as 'normal' | 'perfect' | 'luxury';

      // Check if player has the materials for the decorations
      const hasOrnaments = !decorations.includes('ornament') || state.materials.ornaments > 0;
      const hasCandles = !decorations.includes('candle') || state.materials.candles > 0;
      if (!hasOrnaments || !hasCandles) return null;

      const newMaterials = { ...state.materials };
      const newInventory = { ...state.treeInventory };

      // Consume plain tree
      newInventory[plainTreeKey] = (newInventory[plainTreeKey] || 0) - 1;
      if (newInventory[plainTreeKey] <= 0) {
        delete newInventory[plainTreeKey];
      }

      // Consume decoration materials
      decorations.forEach(decoration => {
        if (decoration === 'ornament' && newMaterials.ornaments > 0) {
          newMaterials.ornaments--;
        } else if (decoration === 'candle' && newMaterials.candles > 0) {
          newMaterials.candles--;
        }
      });

      // Add decorated tree to inventory using serialized key with quality preserved
      const variant = getTreeVariantString(decorations);
      const inventoryKey = `${treeType}_${quality}_${variant}`;
      newInventory[inventoryKey] = (newInventory[inventoryKey] || 0) + 1;

      return { next: { ...state, materials: newMaterials, treeInventory: newInventory }, result: true };
    }) ?? false;
  }, [transact]);
  
  const addToDecorationQueue = useCallback((treeType: TreeType, decorations: DecorationType[]) => {
    const newQueueItem = {
      id: `queue_${Date.now()}_${Math.random()}`,
      treeType,
      decorations,
      progress: 0,
      duration: 1, // 1 day per decoration
    };
    
    setEventState(prev => ({
      ...prev,
      decorationQueue: [...prev.decorationQueue, newQueueItem],
    }));
  }, []);
  
  const removeFromQueue = useCallback((queueItemId: string) => {
    setEventState(prev => ({
      ...prev,
      decorationQueue: prev.decorationQueue.filter(item => item.id !== queueItemId),
    }));
  }, []);
  
  // Helper function to determine tree variant string based on decorations
  const getTreeVariantString = (decorations: DecorationType[]): string => {
    if (decorations.length === 0) return 'plain';
    
    // Single decoration types
    if (decorations.includes('ornament') && !decorations.includes('candle')) {
      return 'ornamented';
    }
    if (decorations.includes('candle') && !decorations.includes('ornament')) {
      return 'candled';
    }
    
    // Multiple decorations = luxury (ornament + candle)
    if (decorations.includes('ornament') && decorations.includes('candle')) {
      return 'luxury';
    }
    
    return 'plain';
  };
  
  // ============================================================================
  // SALES
  // ============================================================================
  
  /**
   * Sell trees from inventory
   */
  const sellTrees = useCallback((treeKey: string, quantity: number) => {
    // Two rolls per tree for the Magical Register bonus (chance, then size),
    // rolled once and replayed each time the transition runs
    const rolls = Array.from({ length: quantity * 2 }, () => Math.random());

    const sale = transact(state => {
      const random = rollSource(rolls);
      const currentQuantity = state.treeInventory[treeKey] || 0;
      if (currentQuantity < quantity) return null;

      const treePrice = getTreePrice(treeKey, state.upgrades, state.marketDemand.demandMultiplier);
      // Garland Borders raises all cheer from sales, tips included
      const cheerMultiplier = getSaleCheerMultiplier(state.upgrades);
      const totalCheer = floorCheer(treePrice * quantity * cheerMultiplier);

      // Magical Register tips
      const registerOwned = state.upgrades.some(u => u.id === 'magical_register' && u.owned);
      const tips = registerOwned ? rollRegisterTips(treePrice, quantity, random) : 0;
      const bonusCheer = floorCheer(tips * cheerMultiplier);

      // Update inventory and currency
      const newInventory = { ...state.treeInventory };
      newInventory[treeKey] = currentQuantity - quantity;
      if (newInventory[treeKey] === 0) {
        delete newInventory[treeKey];
      }

      return {
        next: {
          ...state,
          treeInventory: newInventory,
          holidayCheer: state.holidayCheer + totalCheer + bonusCheer,
          totalTreesSold: state.totalTreesSold + quantity,
        },
        result: { treeType: parseTreeKey(treeKey).treeType, cheer: totalCheer + bonusCheer, bonusCheer }
      };
    });

    if (!sale) {
      console.warn('Not enough trees to sell');
      return;
    }
    if (sale.bonusCheer > 0) {
      // Show the Magical Register toast
      setLastMagicalRegisterBonus({ amount: sale.bonusCheer, timestamp: Date.now() });
    }
    // Log the sale event
    const treeTypeName = sale.treeType.charAt(0).toUpperCase() + sale.treeType.slice(1);
    callbacksRef.current.onTreeSold?.(treeTypeName, quantity, sale.cheer);
  }, [transact]);
  
  const sellAllTrees = useCallback(() => {
    // Two Magical Register rolls per tree, rolled once and replayed each run
    const rolls = Array.from({ length: countTrees(eventStateRef.current.treeInventory) * 2 }, () => Math.random());

    const sale = transact(state => {
      const random = rollSource(rolls);
      const demand = state.marketDemand.demandMultiplier;
      const registerOwned = state.upgrades.some(u => u.id === 'magical_register' && u.owned);
      let treeCheer = 0;
      let tips = 0;
      let totalSold = 0;

      // Sell all trees in inventory
      for (const [treeKey, quantity] of Object.entries(state.treeInventory)) {
        const treePrice = getTreePrice(treeKey, state.upgrades, demand);
        treeCheer += treePrice * quantity;
        totalSold += quantity;
        if (registerOwned) tips += rollRegisterTips(treePrice, quantity, random);
      }

      // Garland Borders raises all cheer from sales, tips included
      const cheerMultiplier = getSaleCheerMultiplier(state.upgrades);
      const totalCheer = floorCheer(treeCheer * cheerMultiplier);
      const bonusCheer = floorCheer(tips * cheerMultiplier);

      return {
        next: {
          ...state,
          treeInventory: {},
          holidayCheer: state.holidayCheer + totalCheer + bonusCheer,
          totalTreesSold: state.totalTreesSold + totalSold,
        },
        result: { bonusCheer }
      };
    });

    if (sale && sale.bonusCheer > 0) {
      // Show the Magical Register toast
      setLastMagicalRegisterBonus({ amount: sale.bonusCheer, timestamp: Date.now() });
    }
  }, [transact, eventStateRef]);
  
  /**
   * Sell garland from materials
   */
  const sellGarland = useCallback((quantity: number) => {
    setEventState(prev => {
      const currentQuantity = prev.materials.garlands || 0;
      
      if (currentQuantity < quantity) {
        console.warn('Not enough garland to sell');
        return prev;
      }
      
      // Garland sells for 4 Cheer each
      const pricePerGarland = 4;
      const totalCheer = pricePerGarland * quantity;
      
      return {
        ...prev,
        materials: {
          ...prev.materials,
          garlands: currentQuantity - quantity,
        },
        holidayCheer: prev.holidayCheer + totalCheer,
      };
    });
  }, []);

  /**
   * Sell candles from materials
   */
  const sellCandle = useCallback((quantity: number) => {
    setEventState(prev => {
      const currentQuantity = prev.materials.candles || 0;
      
      if (currentQuantity < quantity) {
        console.warn('Not enough candles to sell');
        return prev;
      }
      
      // Candles sell for 2 Cheer each
      const pricePerCandle = 2;
      const totalCheer = pricePerCandle * quantity;
      
      return {
        ...prev,
        materials: {
          ...prev.materials,
          candles: currentQuantity - quantity,
        },
        holidayCheer: prev.holidayCheer + totalCheer,
      };
    });
  }, []);

  /**
   * Sell ornaments from materials
   */
  const sellOrnament = useCallback((quantity: number) => {
    setEventState(prev => {
      const currentQuantity = prev.materials.ornaments || 0;
      
      if (currentQuantity < quantity) {
        console.warn('Not enough ornaments to sell');
        return prev;
      }
      
      // Ornaments sell for 1 Cheer each
      const pricePerOrnament = 1;
      const totalCheer = pricePerOrnament * quantity;
      
      return {
        ...prev,
        materials: {
          ...prev.materials,
          ornaments: currentQuantity - quantity,
        },
        holidayCheer: prev.holidayCheer + totalCheer,
      };
    });
  }, []);
  
  const claimDailyBonus = useCallback((): boolean => {
    const today = new Date().toISOString().split('T')[0];
    
    return transact(state => state.dailyBonus.lastClaimDate === today ? null : {
      next: {
        ...state,
        holidayCheer: state.holidayCheer + state.dailyBonus.bonusAmount,
        dailyBonus: {
          ...state.dailyBonus,
          claimed: true,
          lastClaimDate: today,
        },
      },
      result: true
    }) ?? false;
  }, [transact]);
  
  // ============================================================================
  // UPGRADES & MILESTONES
  // ============================================================================
  
  const purchaseUpgrade = useCallback((upgradeId: string): boolean => {
    // The tree farm uses the result to select a newly unlocked tree
    const purchase = transact(state => {
      const applied = applyUpgradePurchase(state, upgradeId);
      return applied && { next: applied.next, result: { name: applied.name, cost: applied.cost } };
    });
    if (!purchase) return false;
    callbacksRef.current.onUpgradePurchased?.(purchase.name, purchase.cost);
    return true;
  }, [transact]);
  
  const claimMilestone = useCallback((milestoneId: string): boolean => {
    const milestoneName = transact(state => {
      const milestone = state.milestones.find(m => m.id === milestoneId);
      if (!milestone || milestone.claimed) return null;
      if (state.totalTreesSold < milestone.requirement) return null;

      return {
        next: {
          ...state,
          // Cheer and cosmetic rewards, if any
          holidayCheer: milestone.reward.cheerAmount
            ? state.holidayCheer + milestone.reward.cheerAmount
            : state.holidayCheer,
          unlockedCosmetics: milestone.reward.cosmeticId
            ? [...state.unlockedCosmetics, milestone.reward.cosmeticId]
            : state.unlockedCosmetics,
          milestones: state.milestones.map(m =>
            m.id === milestoneId ? { ...m, claimed: true } : m
          ),
        },
        result: milestone.name
      };
    });

    // Log the milestone claim event
    if (milestoneName === null) return false;
    callbacksRef.current.onMilestoneClaimed?.(milestoneName);
    return true;
  }, [transact]);
  
  // ============================================================================
  // COSMETICS
  // ============================================================================
  
  const toggleCosmetic = useCallback((cosmeticId: string) => {
    setEventState(prev => {
      const isActive = prev.activeCosmetics.includes(cosmeticId);
      
      return {
        ...prev,
        activeCosmetics: isActive
          ? prev.activeCosmetics.filter(id => id !== cosmeticId)
          : [...prev.activeCosmetics, cosmeticId],
      };
    });
  }, []);
  
  // ============================================================================
  // PASSIVE INCOME
  // ============================================================================
  
  const updatePassiveIncome = useCallback((deltaTime: number) => {
    // Use functional pattern to avoid stale closure on passiveCheerPerSecond
    setEventState(prev => {
      if (prev.passiveCheerPerSecond > 0) {
        const cheerGained = prev.passiveCheerPerSecond * (deltaTime / 1000);
        return {
          ...prev,
          holidayCheer: prev.holidayCheer + Math.floor(cheerGained),
          totalCheerEarned: prev.totalCheerEarned + Math.floor(cheerGained),
        };
      }
      return prev;
    });
  }, []);
  
  // ============================================================================
  // TREE GROWTH PROCESSING
  // ============================================================================
  
  const processTreeGrowth = useCallback((ticks: number = 1) => {
    // Offline catch-up passes many ticks at once. Growth is linear and the
    // perfect-tree roll happens once at completion, so one pass is exact.
    const steps = typeof ticks === 'number' && ticks > 0 ? ticks : 1;
    setEventState(prev => {
      // Check if any upgrades affect growth speed
      const fertilizedSoil = prev.upgrades.find(u => u.id === 'fertilized_soil');
      const fertilizedSoilLevel = fertilizedSoil?.level ?? 0;
      const speedBonus = 1.0 + (fertilizedSoilLevel * 0.15); // +15% per level
      
      const evergreenEssenceOwned = prev.upgrades.find(u => u.id === 'evergreen_essence')?.owned ?? false;
      const perfectChance = evergreenEssenceOwned ? 0.10 : 0.0;
      
      const newPlots = prev.treePlots.map(plot => {
        if (plot.treeType === null || plot.harvestReady) {
          return plot;
        }
        
        // Grow the tree
        const newGrowth = plot.growth + speedBonus * steps;
        
        // Check if tree is ready to harvest
        if (newGrowth >= plot.growthTime) {
          // Check for Perfect Tree proc
          const isPerfect = perfectChance > 0 && Math.random() < perfectChance;
          
          return {
            ...plot,
            growth: plot.growthTime,
            harvestReady: true,
            quality: isPerfect ? 'perfect' as const : plot.quality,
          };
        }
        
        return {
          ...plot,
          growth: newGrowth,
        };
      });
      
      return {
        ...prev,
        treePlots: newPlots,
      };
    });
  }, []);
  
  // ============================================================================
  // DAILY ELVES' BENCH CRAFTING
  // ============================================================================
  
  const processDailyElvesCrafting = useCallback((ticks: number = 1) => {
    // Offline catch-up passes many ticks at once. Crafting is deterministic and
    // stops when nothing is left to do, so one pass is exact.
    const steps = typeof ticks === 'number' && ticks > 0 ? ticks : 1;
    setEventState(prev => {
      // Check if Elves' Bench is owned
      const elvesBenchOwned = prev.upgrades.find(u => u.id === 'elves_bench')?.owned ?? false;
      
      if (!elvesBenchOwned) {
        return {
          ...prev,
          currentElvesAction: undefined,
        }; // No automation if upgrade not owned
      }
      
      // Get Cheerful Crafting level (how many items to craft per second)
      const cheerfulCraftingUpgrade = prev.upgrades.find(u => u.id === 'cheerful_crafting');
      const itemsPerSecond = cheerfulCraftingUpgrade?.owned ? (cheerfulCraftingUpgrade.level || 1) : 1;
      
      const newMaterials = { ...prev.materials };
      const newInventory = { ...prev.treeInventory };
      let currentAction: ChristmasEventState['currentElvesAction'] = undefined;
      
      // Process multiple items based on Cheerful Crafting level
      for (let i = 0; i < itemsPerSecond * steps; i++) {
        let actionTaken = false;
        
        // First Priority: Craft decorations from materials
        // Priority 1: Craft garland (3 branches + 2 pinecones → 1 garland)
        if (!actionTaken && newMaterials.branches >= 3 && newMaterials.pinecones >= 2) {
          newMaterials.branches -= 3;
          newMaterials.pinecones -= 2;
          newMaterials.garlands = (newMaterials.garlands || 0) + 1;
          actionTaken = true;
          // Only set currentAction for the FIRST item processed
          if (!currentAction) {
            currentAction = { type: 'craft', recipeId: 'craft_garland' };
          }
        }
        
        // Priority 2: Craft candles (2 wood → 1 candle)
        if (!actionTaken && newMaterials.wood >= 2) {
          newMaterials.wood -= 2;
          newMaterials.candles = (newMaterials.candles || 0) + 1;
          actionTaken = true;
          // Only set currentAction for the FIRST item processed
          if (!currentAction) {
            currentAction = { type: 'craft', recipeId: 'craft_candles' };
          }
        }
        
        // Priority 3: Craft ornaments from wood (1 wood → 2 ornaments) - Requires upgrade
        const hasOrnamentBench = prev.upgrades.find(u => u.id === 'ornament_crafting_bench')?.owned ?? false;
        if (!actionTaken && hasOrnamentBench && newMaterials.wood >= 1) {
          newMaterials.wood -= 1;
          newMaterials.ornaments = (newMaterials.ornaments || 0) + 2;
          actionTaken = true;
          // Only set currentAction for the FIRST item processed
          if (!currentAction) {
            currentAction = { type: 'craft', recipeId: 'craft_ornaments' };
          }
        }
        
        // Priority 4: Craft traditional ornaments (5 pinecones → 3 ornaments) - Requires upgrade
        const hasTraditionalOrnaments = prev.upgrades.find(u => u.id === 'traditional_ornaments')?.owned ?? false;
        if (!actionTaken && hasTraditionalOrnaments && newMaterials.pinecones >= 5) {
          newMaterials.pinecones -= 5;
          newMaterials.ornaments = (newMaterials.ornaments || 0) + 3;
          actionTaken = true;
          // Only set currentAction for the FIRST item processed
          if (!currentAction) {
            currentAction = { type: 'craft', recipeId: 'craft_traditional_ornaments' };
          }
        }
        
        // If materials were crafted, continue to next iteration
        if (actionTaken) {
          continue;
        }
        
        // Second Priority: Only decorate trees if we can't craft any more decorations
        // Find the first plain tree in inventory (any quality, any tree type)
        const plainTreeKeys = Object.keys(newInventory).filter(key => 
          key.endsWith('_plain') && (newInventory[key] || 0) > 0
        );
        
        if (plainTreeKeys.length > 0) {
          const plainTreeKey = plainTreeKeys[0];
          const hasOrnament = (newMaterials.ornaments || 0) > 0;
          const hasCandle = (newMaterials.candles || 0) > 0;
          
          if (hasOrnament || hasCandle) {
            // Extract tree type and quality from the key (e.g., "pine_normal_plain" -> "pine", "normal")
            const parts = plainTreeKey.split('_');
            const treeType = parts[0]; // pine, spruce, or fir
            const quality = parts[1]; // normal, perfect, or luxury
            
            let newTreeKey = plainTreeKey;
            let decorationType: string | undefined;
            
            // Decorate with priority: Luxury > Candled > Ornamented
            if (hasOrnament && hasCandle) {
              newMaterials.ornaments = (newMaterials.ornaments || 0) - 1;
              newMaterials.candles = (newMaterials.candles || 0) - 1;
              newTreeKey = `${treeType}_${quality}_luxury`;
              decorationType = 'luxury';
              actionTaken = true;
            } else if (hasCandle) {
              newMaterials.candles = (newMaterials.candles || 0) - 1;
              newTreeKey = `${treeType}_${quality}_candled`;
              decorationType = 'candled';
              actionTaken = true;
            } else if (hasOrnament) {
              newMaterials.ornaments = (newMaterials.ornaments || 0) - 1;
              newTreeKey = `${treeType}_${quality}_ornamented`;
              decorationType = 'ornamented';
              actionTaken = true;
            }
            
            if (actionTaken) {
              // Only set currentAction for the FIRST item processed
              if (!currentAction) {
                currentAction = { type: 'decorate', decorationType };
              }
              // Remove one plain tree
              newInventory[plainTreeKey] = (newInventory[plainTreeKey] || 0) - 1;
              if (newInventory[plainTreeKey] === 0) {
                delete newInventory[plainTreeKey];
              }
              
              // Add one decorated tree
              newInventory[newTreeKey] = (newInventory[newTreeKey] || 0) + 1;
              continue; // Continue to next iteration
            }
          }
        }
        
        // If no action could be taken, stop processing
        if (!actionTaken) {
          break;
        }
      }
      
      // Return updated state with materials, inventory, and current action
      return {
        ...prev,
        materials: newMaterials,
        treeInventory: newInventory,
        currentElvesAction: currentAction,
      };
    });
  }, []);
  
  /**
   * Reset the Christmas event to initial state
   */
  const resetEvent = useCallback(() => {
    setEventState(createInitialEventState(farmTier));
    setLastMagicalRegisterBonus({ amount: 0, timestamp: 0 });
  }, [farmTier]);
  
  // Memoized so the game context stays stable between changes. Every value it
  // reads is listed below. dailyBonusAvailable is a getter because it depends on
  // today's date, which no dependency tracks.
  return useMemo<UseChristmasEventReturn>(() => ({
    eventState,
    isEventActive,
    holidayCheer: eventState.holidayCheer,
    earnCheer,
    spendCheer,
    treePlots: eventState.treePlots,
    plantTree,
    harvestTree,
    harvestAllTrees,
    materials: eventState.materials,
    craftItem,
    decorateTree,
    addToDecorationQueue,
    removeFromQueue,
    sellTrees,
    sellAllTrees,
    sellGarland,
    sellCandle,
    sellOrnament,
    claimDailyBonus,
    totalTreesSold: eventState.totalTreesSold,
    demandMultiplier: eventState.marketDemand.demandMultiplier,
    get dailyBonusAvailable() {
      return eventState.dailyBonus.lastClaimDate !== new Date().toISOString().split('T')[0];
    },
    passiveCheerPerSecond: eventState.passiveCheerPerSecond,
    purchaseUpgrade,
    claimMilestone,
    toggleCosmetic,
    updatePassiveIncome,
    processTreeGrowth,
    processDailyElvesCrafting,
    checkEventActive,
    resetEvent,
    currentElvesAction: eventState.currentElvesAction,
    lastMagicalRegisterBonus,
  }), [
    eventState,
    isEventActive,
    lastMagicalRegisterBonus,
    earnCheer,
    spendCheer,
    plantTree,
    harvestTree,
    harvestAllTrees,
    craftItem,
    decorateTree,
    addToDecorationQueue,
    removeFromQueue,
    sellTrees,
    sellAllTrees,
    sellGarland,
    sellCandle,
    sellOrnament,
    claimDailyBonus,
    purchaseUpgrade,
    claimMilestone,
    toggleCosmetic,
    updatePassiveIncome,
    processTreeGrowth,
    processDailyElvesCrafting,
    checkEventActive,
    resetEvent,
  ]);
}
