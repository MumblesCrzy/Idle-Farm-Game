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
  processTreeGrowth: () => void;
  processDailyElvesCrafting: () => void;
  checkEventActive: () => boolean;
  
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
}: UseChristmasEventParams): UseChristmasEventReturn {
  // Track last magical register bonus for toast display
  // Using object with timestamp ensures each bonus triggers a new toast
  const [lastMagicalRegisterBonus, setLastMagicalRegisterBonus] = useState({ amount: 0, timestamp: 0 });
  
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
  
  const isEventActive = useMemo(() => checkEventActive(), [checkEventActive]);
  
  // Update event active state when date changes
  useEffect(() => {
    setEventState(prev => ({ ...prev, isActive: isEventActive }));
  }, [isEventActive]);
  
  // Update market demand multiplier based on proximity to Christmas
  useEffect(() => {
    const updateDemand = () => {
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
      let newMaterials = { ...prev.materials };
      
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
      
      // Check if Elves' Bench is enabled for auto-crafting and auto-decorating
      const elvesBenchOwned = prev.upgrades.find(u => u.id === 'elves_bench')?.owned ?? false;
      
      // Include quality in the tree key: treeType_quality_decorationLevel
      let finalTreeKey = `${plot.treeType}_${plot.quality}_plain`;
      const newInventory = { ...prev.treeInventory };
      
      // Elves' Bench Automation: Auto-decorate ONE tree when harvesting
      if (elvesBenchOwned) {
        // Auto-decorate the harvested tree with the most valuable decorations possible
        // Priority: Luxury (ornament + candle) > Candled > Ornamented > Plain
        
        const hasOrnament = (newMaterials.ornaments || 0) > 0;
        const hasCandle = (newMaterials.candles || 0) > 0;
        
        if (hasOrnament && hasCandle) {
          // Make Luxury tree (both decorations)
          newMaterials.ornaments = (newMaterials.ornaments || 0) - 1;
          newMaterials.candles = (newMaterials.candles || 0) - 1;
          finalTreeKey = `${plot.treeType}_${plot.quality}_luxury`;
        } else if (hasCandle) {
          // Make Candled tree (candles are more valuable)
          newMaterials.candles = (newMaterials.candles || 0) - 1;
          finalTreeKey = `${plot.treeType}_${plot.quality}_candled`;
        } else if (hasOrnament) {
          // Make Ornamented tree
          newMaterials.ornaments = (newMaterials.ornaments || 0) - 1;
          finalTreeKey = `${plot.treeType}_${plot.quality}_ornamented`;
        }
        // else: leave as plain tree
      }
      
      // Add tree to inventory
      newInventory[finalTreeKey] = (newInventory[finalTreeKey] || 0) + 1;
      
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
    // Check if player has a plain tree of this type (any quality)
    // New format: treeType_quality_plain (e.g., pine_normal_plain, pine_perfect_plain)
    const plainTreeKeys = Object.keys(eventState.treeInventory).filter(key => 
      key.startsWith(`${treeType}_`) && key.endsWith('_plain')
    );
    
    if (plainTreeKeys.length === 0) {
      return false;
    }
    
    // Use the first available plain tree (prioritize normal, then perfect, then luxury)
    const sortedKeys = plainTreeKeys.sort((a, b) => {
      const qualityOrder = { normal: 0, perfect: 1, luxury: 2 };
      const qualityA = a.split('_')[1] as 'normal' | 'perfect' | 'luxury';
      const qualityB = b.split('_')[1] as 'normal' | 'perfect' | 'luxury';
      return qualityOrder[qualityA] - qualityOrder[qualityB];
    });
    const plainTreeKey = sortedKeys[0];
    const quality = plainTreeKey.split('_')[1] as 'normal' | 'perfect' | 'luxury';
    
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
      
      // Add decorated tree to inventory using serialized key with quality preserved
      const variant = getTreeVariantString(decorations);
      const inventoryKey = `${treeType}_${quality}_${variant}`;
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
      
      // Extract quality from tree key (format: treeType_quality_decorationLevel)
      // Examples: pine_perfect_luxury, spruce_normal_plain
      const keyParts = treeKey.split('_');
      const quality = keyParts[1] as 'normal' | 'perfect' | 'luxury';
      const qualityMultiplier = QUALITY_MULTIPLIERS[quality] || 1.0;
      
      // Decoration multipliers (check the decoration level part of the key)
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
      
      const finalPrice = Math.floor(basePrice * qualityMultiplier * decorationMultiplier * prev.marketDemand.demandMultiplier * upgradeMultiplier);
      const totalCheer = finalPrice * quantity;
      
      // Check for Magical Register bonus (10% chance PER TREE for 20-50% bonus on ONE tree)
      const magicalRegister = prev.upgrades.find(u => u.id === 'magical_register');
      let bonusCheer = 0;
      if (magicalRegister?.owned) {
        // Roll once for each tree sold
        for (let i = 0; i < quantity; i++) {
          if (Math.random() < 0.10) {
            const bonusPercent = 0.20 + Math.random() * 0.30; // 20-50% bonus on one tree
            bonusCheer += Math.floor(finalPrice * bonusPercent);
          }
        }
        
        if (bonusCheer > 0) {
          // Update state to trigger toast with timestamp
          setLastMagicalRegisterBonus({ amount: bonusCheer, timestamp: Date.now() });
        }
      }
      
      // Update inventory and currency
      const newInventory = { ...prev.treeInventory };
      newInventory[treeKey] = currentQuantity - quantity;
      if (newInventory[treeKey] === 0) {
        delete newInventory[treeKey];
      }
      
      return {
        ...prev,
        treeInventory: newInventory,
        holidayCheer: prev.holidayCheer + totalCheer + bonusCheer,
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
        
        // Extract quality from tree key (format: treeType_quality_decorationLevel)
        const keyParts = treeKey.split('_');
        const quality = keyParts[1] as 'normal' | 'perfect' | 'luxury';
        const qualityMultiplier = QUALITY_MULTIPLIERS[quality] || 1.0;
        
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
        
        const finalPrice = Math.floor(basePrice * qualityMultiplier * decorationMultiplier * prev.marketDemand.demandMultiplier * upgradeMultiplier);
        totalCheer += finalPrice * quantity;
        totalSold += quantity;
      });
      
      // Check for Magical Register bonus (10% chance PER TREE for 20-50% bonus)
      const magicalRegister = prev.upgrades.find(u => u.id === 'magical_register');
      let bonusCheer = 0;
      if (magicalRegister?.owned && totalSold > 0) {
        // Need to roll for each individual tree across all types
        Object.keys(prev.treeInventory).forEach(treeKey => {
          const quantity = prev.treeInventory[treeKey];
          
          // Calculate the price for this tree type (same logic as above)
          let basePrice = 10;
          if (treeKey.startsWith('spruce')) basePrice = 15;
          else if (treeKey.startsWith('fir')) basePrice = 20;
          
          const keyParts = treeKey.split('_');
          const quality = keyParts[1] as 'normal' | 'perfect' | 'luxury';
          const qualityMultiplier = QUALITY_MULTIPLIERS[quality] || 1.0;
          
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
          
          const singleTreePrice = Math.floor(basePrice * qualityMultiplier * decorationMultiplier * prev.marketDemand.demandMultiplier * upgradeMultiplier);
          
          // Roll once for each tree of this type
          for (let i = 0; i < quantity; i++) {
            if (Math.random() < 0.10) {
              const bonusPercent = 0.20 + Math.random() * 0.30; // 20-50% bonus
              bonusCheer += Math.floor(singleTreePrice * bonusPercent);
            }
          }
        });
        
        if (bonusCheer > 0) {
          // Update state to trigger toast with timestamp
          setLastMagicalRegisterBonus({ amount: bonusCheer, timestamp: Date.now() });
        }
      }
      
      return {
        ...prev,
        treeInventory: {},
        holidayCheer: prev.holidayCheer + totalCheer + bonusCheer,
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
    
    if (!upgrade) {
      return false;
    }
    
    // Check if upgrade is repeatable and at max level
    if (upgrade.repeatable) {
      const currentLevel = upgrade.level ?? 0;
      const maxLevel = upgrade.maxLevel ?? Infinity;
      
      if (currentLevel >= maxLevel) {
        return false; // Already at max level
      }
      
      // Calculate cost for next level
      const costScaling = upgrade.costScaling ?? 1.5;
      const nextLevelCost = Math.floor(upgrade.cost * Math.pow(costScaling, currentLevel));
      
      if (!spendCheer(nextLevelCost)) {
        return false;
      }
      
      setEventState(prev => {
        const newUpgrades = prev.upgrades.map(u => {
          if (u.id === upgradeId) {
            return {
              ...u,
              level: currentLevel + 1,
              owned: true,
            };
          }
          return u;
        });
        
        // Special handling for greenhouse_extension: add a tree plot
        if (upgradeId === 'greenhouse_extension') {
          const newPlots = [...prev.treePlots, {
            id: `plot_${prev.treePlots.length}`,
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
          
          return {
            ...prev,
            upgrades: newUpgrades,
            treePlots: newPlots,
            maxPlots: prev.maxPlots + 1,
          };
        }
        
        return {
          ...prev,
          upgrades: newUpgrades,
        };
      });
      
      return true;
    }
    
    // Non-repeatable upgrade logic
    if (upgrade.owned) {
      return false;
    }
    
    if (!spendCheer(upgrade.cost)) {
      return false;
    }
    
    setEventState(prev => {
      const newUpgrades = prev.upgrades.map(u =>
        u.id === upgradeId ? { ...u, owned: true } : u
      );
      
      // Calculate new passive income if Golden Bell Counter was purchased
      let newPassiveCheerPerSecond = prev.passiveCheerPerSecond;
      if (upgradeId === 'golden_bell_counter') {
        const goldenBell = newUpgrades.find(u => u.id === 'golden_bell_counter');
        if (goldenBell && goldenBell.passiveIncome) {
          newPassiveCheerPerSecond = goldenBell.passiveIncome;
        }
      }
      
      return {
        ...prev,
        upgrades: newUpgrades,
        passiveCheerPerSecond: newPassiveCheerPerSecond,
      };
    });
    
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
  
  // ============================================================================
  // DAILY ELVES' BENCH CRAFTING
  // ============================================================================
  
  const processDailyElvesCrafting = useCallback(() => {
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
      for (let i = 0; i < itemsPerSecond; i++) {
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
    sellOrnament,
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
    processDailyElvesCrafting,
    checkEventActive,
    currentElvesAction: eventState.currentElvesAction,
    lastMagicalRegisterBonus,
  };
}
