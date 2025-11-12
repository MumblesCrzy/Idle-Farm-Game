/**
 * Christmas Tree Shop Event Hook
 * 
 * Manages the complete state and logic for the Christmas Tree Shop event.
 * Handles Holiday Cheer currency, tree farming, decoration crafting, and sales.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
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
  processTreeGrowth: () => void;
  checkEventActive: () => boolean;
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
 * Main Christmas Event Hook
 */
export function useChristmasEvent({
  initialState,
  farmTier,
}: UseChristmasEventParams): UseChristmasEventReturn {
  // Initialize event state
  const [eventState, setEventState] = useState<ChristmasEventState>(() => {
    const baseState = createInitialEventState(farmTier);
    return initialState ? { ...baseState, ...initialState } : baseState;
  });
  
  // Check if event is currently active based on date
  const checkEventActive = useCallback(() => {
    return isWithinEventPeriod();
  }, []);
  
  const isEventActive = useMemo(() => checkEventActive(), [checkEventActive]);
  
  // Update event active state when date changes
  useEffect(() => {
    setEventState(prev => ({ ...prev, isActive: isEventActive }));
  }, [isEventActive]);
  
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
    if (eventState.holidayCheer < amount) {
      return false;
    }
    
    setEventState(prev => ({
      ...prev,
      holidayCheer: prev.holidayCheer - amount,
    }));
    
    return true;
  }, [eventState.holidayCheer]);
  
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
    setEventState(prev => {
      const plot = prev.treePlots[plotIndex];
      
      if (!plot.harvestReady || !plot.treeType) {
        return prev;
      }
      
      const treeDefinition = TREE_DEFINITIONS[plot.treeType];
      const qualityMultiplier = QUALITY_MULTIPLIERS[plot.quality];
      const newMaterials = { ...prev.materials };
      
      // Apply quality multiplier to yields (Perfect trees give 2x, Luxury 3x)
      const woodYield = Math.floor(treeDefinition.baseYield.wood * qualityMultiplier);
      const pineconesYield = Math.floor(treeDefinition.baseYield.pinecones * qualityMultiplier);
      const branchesYield = Math.floor(treeDefinition.baseYield.branches * qualityMultiplier);
      
      newMaterials.wood += woodYield;
      newMaterials.pinecones += pineconesYield;
      newMaterials.branches += branchesYield;
      
      // Earn Holiday Cheer from harvesting (base 5, +5 for perfect, +10 for luxury)
      const cheerEarned = plot.quality === 'luxury' ? 15 : plot.quality === 'perfect' ? 10 : 5;
      const newHolidayCheer = prev.holidayCheer + cheerEarned;
      const newTotalCheerEarned = prev.totalCheerEarned + cheerEarned;
      
      // Add plain tree to inventory
      const plainTreeKey = `${plot.treeType}_plain`;
      const newInventory = { ...prev.treeInventory };
      newInventory[plainTreeKey] = (newInventory[plainTreeKey] || 0) + 1;
      
      // Reset plot
      const newPlots = [...prev.treePlots];
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
        ...prev,
        treePlots: newPlots,
        materials: newMaterials,
        treeInventory: newInventory,
        holidayCheer: newHolidayCheer,
        totalCheerEarned: newTotalCheerEarned,
      };
    });
  }, []);
  
  const harvestAllTrees = useCallback(() => {
    eventState.treePlots.forEach((plot, index) => {
      if (plot.harvestReady) {
        harvestTree(index);
      }
    });
  }, [eventState.treePlots, harvestTree]);
  
  // ============================================================================
  // CRAFTING
  // ============================================================================
  
  const craftItem = useCallback((recipeId: string, quantity: number = 1): boolean => {
    const recipe = CRAFTING_RECIPES.find(r => r.id === recipeId);
    
    if (!recipe) {
      return false;
    }
    
    // Check if player has enough materials
    const hasEnoughMaterials = Object.entries(recipe.inputs).every(([material, amount]) => {
      return eventState.materials[material as keyof CraftingMaterials] >= amount * quantity;
    });
    
    if (!hasEnoughMaterials) {
      return false;
    }
    
    // Deduct materials and add output
    setEventState(prev => {
      const newMaterials = { ...prev.materials };
      
      // Deduct inputs
      Object.entries(recipe.inputs).forEach(([material, amount]) => {
        newMaterials[material as keyof CraftingMaterials] -= amount * quantity;
      });
      
      // Add outputs
      Object.entries(recipe.output).forEach(([item, amount]) => {
        newMaterials[item as keyof CraftingMaterials] += amount * quantity;
      });
      
      return {
        ...prev,
        materials: newMaterials,
      };
    });
    
    return true;
  }, [eventState.materials]);
  
  // ============================================================================
  // DECORATION
  // ============================================================================
  
  const decorateTree = useCallback((treeType: TreeType, decorations: DecorationType[]): boolean => {
    // Check if player has a plain tree of this type
    const plainTreeKey = `${treeType}_plain`;
    const hasPlainTree = (eventState.treeInventory[plainTreeKey] || 0) > 0;
    
    if (!hasPlainTree) {
      return false;
    }
    
    // Check if player has the materials for the decorations
    const hasOrnaments = !decorations.includes('ornament') || eventState.materials.ornaments > 0;
    const hasCandles = !decorations.includes('candle') || eventState.materials.candles > 0;
    
    if (!hasOrnaments || !hasCandles) {
      return false;
    }
    
    // Deduct plain tree, decoration materials, and add decorated tree to inventory
    setEventState(prev => {
      const newMaterials = { ...prev.materials };
      const newInventory = { ...prev.treeInventory };
      
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
      
      // Add decorated tree to inventory using serialized key
      const variant = getTreeVariantString(decorations);
      const inventoryKey = `${treeType}_${variant}`;
      newInventory[inventoryKey] = (newInventory[inventoryKey] || 0) + 1;
      
      return {
        ...prev,
        materials: newMaterials,
        treeInventory: newInventory,
      };
    });
    
    return true;
  }, [eventState.materials, eventState.treeInventory]);
  
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
    setEventState(prev => {
      const currentQuantity = prev.treeInventory[treeKey] || 0;
      
      if (currentQuantity < quantity) {
        console.warn('Not enough trees to sell');
        return prev;
      }
      
      // Calculate sale price
      // Base prices: Pine=10, Spruce=15, Fir=20
      let basePrice = 10;
      if (treeKey.startsWith('spruce')) basePrice = 15;
      else if (treeKey.startsWith('fir')) basePrice = 20;
      
      // Decoration multipliers
      let decorationMultiplier = 1.0;
      if (treeKey.includes('ornamented')) decorationMultiplier = 1.05;
      else if (treeKey.includes('candled')) decorationMultiplier = 1.15;
      else if (treeKey.includes('luxury')) decorationMultiplier = 3.0;
      
      // Apply upgrade bonuses
      const garlandStation = prev.upgrades.find(u => u.id === 'garland_station');
      const garlandBorders = prev.upgrades.find(u => u.id === 'garland_borders');
      const fireplaceDisplay = prev.upgrades.find(u => u.id === 'fireplace_display');
      
      let upgradeMultiplier = 1.0;
      if (garlandStation?.owned) upgradeMultiplier += 0.10; // +10% tree value
      if (garlandBorders?.owned) upgradeMultiplier += 0.10; // +10% Cheer gain
      
      // Star Forge already included in luxury multiplier (3x)
      // Fireplace Display: +50% for luxury trees
      if (fireplaceDisplay?.owned && treeKey.includes('luxury')) {
        upgradeMultiplier += 0.50;
      }
      
      const finalPrice = Math.floor(basePrice * decorationMultiplier * prev.marketDemand.demandMultiplier * upgradeMultiplier);
      const totalCheer = finalPrice * quantity;
      
      // Update inventory and currency
      const newInventory = { ...prev.treeInventory };
      newInventory[treeKey] = currentQuantity - quantity;
      if (newInventory[treeKey] === 0) {
        delete newInventory[treeKey];
      }
      
      return {
        ...prev,
        treeInventory: newInventory,
        holidayCheer: prev.holidayCheer + totalCheer,
        totalTreesSold: prev.totalTreesSold + quantity,
      };
    });
  }, []);
  
  const sellAllTrees = useCallback(() => {
    setEventState(prev => {
      let totalCheer = 0;
      let totalSold = 0;
      const newInventory = { ...prev.treeInventory };
      
      // Sell all trees in inventory
      Object.keys(newInventory).forEach(treeKey => {
        const quantity = newInventory[treeKey];
        
        // Calculate sale price (same logic as sellTrees)
        let basePrice = 10;
        if (treeKey.startsWith('spruce')) basePrice = 15;
        else if (treeKey.startsWith('fir')) basePrice = 20;
        
        let decorationMultiplier = 1.0;
        if (treeKey.includes('ornamented')) decorationMultiplier = 1.1;
        else if (treeKey.includes('garlanded')) decorationMultiplier = 1.1;
        else if (treeKey.includes('candled')) decorationMultiplier = 1.15;
        else if (treeKey.includes('luxury')) decorationMultiplier = 3.0;
        
        const garlandStation = prev.upgrades.find(u => u.id === 'garland_station');
        const garlandBorders = prev.upgrades.find(u => u.id === 'garland_borders');
        const fireplaceDisplay = prev.upgrades.find(u => u.id === 'fireplace_display');
        
        let upgradeMultiplier = 1.0;
        if (garlandStation?.owned) upgradeMultiplier += 0.10;
        if (garlandBorders?.owned) upgradeMultiplier += 0.10;
        if (fireplaceDisplay?.owned && treeKey.includes('luxury')) {
          upgradeMultiplier += 0.50;
        }
        
        const finalPrice = Math.floor(basePrice * decorationMultiplier * prev.marketDemand.demandMultiplier * upgradeMultiplier);
        totalCheer += finalPrice * quantity;
        totalSold += quantity;
      });
      
      return {
        ...prev,
        treeInventory: {},
        holidayCheer: prev.holidayCheer + totalCheer,
        totalTreesSold: prev.totalTreesSold + totalSold,
      };
    });
  }, []);
  
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
      
      // Garland sells for 2 Cheer each
      const pricePerGarland = 2;
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
      
      // Candles sell for 1 Cheer each
      const pricePerCandle = 1;
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
  
  const claimDailyBonus = useCallback((): boolean => {
    const today = new Date().toISOString().split('T')[0];
    
    if (eventState.dailyBonus.lastClaimDate === today) {
      return false; // Already claimed today
    }
    
    setEventState(prev => ({
      ...prev,
      holidayCheer: prev.holidayCheer + prev.dailyBonus.bonusAmount,
      dailyBonus: {
        ...prev.dailyBonus,
        claimed: true,
        lastClaimDate: today,
      },
    }));
    
    return true;
  }, [eventState.dailyBonus]);
  
  // ============================================================================
  // UPGRADES & MILESTONES
  // ============================================================================
  
  const purchaseUpgrade = useCallback((upgradeId: string): boolean => {
    const upgrade = eventState.upgrades.find(u => u.id === upgradeId);
    
    if (!upgrade || upgrade.owned) {
      return false;
    }
    
    if (!spendCheer(upgrade.cost)) {
      return false;
    }
    
    setEventState(prev => ({
      ...prev,
      upgrades: prev.upgrades.map(u =>
        u.id === upgradeId ? { ...u, owned: true } : u
      ),
    }));
    
    return true;
  }, [eventState.upgrades, spendCheer]);
  
  const claimMilestone = useCallback((milestoneId: string): boolean => {
    const milestone = eventState.milestones.find(m => m.id === milestoneId);
    
    if (!milestone || milestone.claimed) {
      return false;
    }
    
    if (eventState.totalTreesSold < milestone.requirement) {
      return false;
    }
    
    setEventState(prev => ({
      ...prev,
      milestones: prev.milestones.map(m =>
        m.id === milestoneId ? { ...m, claimed: true } : m
      ),
    }));
    
    // Apply rewards
    if (milestone.reward.cheerAmount) {
      earnCheer(milestone.reward.cheerAmount);
    }
    
    if (milestone.reward.cosmeticId) {
      setEventState(prev => ({
        ...prev,
        unlockedCosmetics: [...prev.unlockedCosmetics, milestone.reward.cosmeticId!],
      }));
    }
    
    return true;
  }, [eventState.milestones, eventState.totalTreesSold, earnCheer]);
  
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
    if (eventState.passiveCheerPerSecond > 0) {
      const cheerGained = eventState.passiveCheerPerSecond * (deltaTime / 1000);
      earnCheer(Math.floor(cheerGained));
    }
  }, [eventState.passiveCheerPerSecond, earnCheer]);
  
  // ============================================================================
  // TREE GROWTH PROCESSING
  // ============================================================================
  
  const processTreeGrowth = useCallback(() => {
    setEventState(prev => {
      // Check if any upgrades affect growth speed
      const fertilizedSoilOwned = prev.upgrades.find(u => u.id === 'fertilized_soil')?.owned ?? false;
      const speedBonus = fertilizedSoilOwned ? 1.25 : 1.0; // +25% if owned
      
      const evergreenEssenceOwned = prev.upgrades.find(u => u.id === 'evergreen_essence')?.owned ?? false;
      const perfectChance = evergreenEssenceOwned ? 0.10 : 0.0;
      
      const newPlots = prev.treePlots.map(plot => {
        if (plot.treeType === null || plot.harvestReady) {
          return plot;
        }
        
        // Grow the tree
        const newGrowth = plot.growth + speedBonus;
        
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
  
  return {
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
    claimDailyBonus,
    totalTreesSold: eventState.totalTreesSold,
    demandMultiplier: eventState.marketDemand.demandMultiplier,
    dailyBonusAvailable: eventState.dailyBonus.lastClaimDate !== new Date().toISOString().split('T')[0],
    passiveCheerPerSecond: eventState.passiveCheerPerSecond,
    purchaseUpgrade,
    claimMilestone,
    toggleCosmetic,
    updatePassiveIncome,
    processTreeGrowth,
    checkEventActive,
  };
}
