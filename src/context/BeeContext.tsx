/**
 * Bee System Context
 * 
 * Manages the bee system state including bee boxes, honey production,
 * upgrades, and the Beekeeper Assistant automation.
 */

import { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import type { 
  BeeBox, 
  BeeUpgrade,
  BeekeeperAssistant,
  BeeContextValue,
  BeeStats,
  BeeBoxPurchaseInfo,
  UpgradeEffect,
  HoneyProduction,
  BeeState
} from '../types/bees';
import { createInitialBeeUpgrades } from '../data/beeUpgrades';
import { useGameLoop } from '../hooks/useGameLoop';

// Import constants
const BEE_CONSTANTS_IMPL = {
  BASE_PRODUCTION_TIME: 182,
  STARTING_BEE_BOXES: 2,
  MAX_BEE_BOXES: 50,
  BASE_YIELD_BONUS_PER_BOX: 0.005,
  MAX_YIELD_BONUS: 0.25,
  UNLOCK_FARM_TIER: 3,
  BEEKEEPER_ASSISTANT_UNLOCK_BOXES: 4,
} as const;

// Context definition
const BeeContext = createContext<BeeContextValue | undefined>(undefined);

interface BeeProviderProps {
  children: React.ReactNode;
  farmTier?: number; // Current farm tier to check unlock condition
  onYieldBonusChange?: (bonus: number) => void; // Callback when yield bonus changes
  initialState?: Partial<BeeState>; // Initial state from save file
  onStateChange?: (state: BeeState) => void; // Callback when state changes (for auto-save)
}

/**
 * Generate a unique ID for bee boxes
 */
const generateBoxId = (): string => {
  return `box_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Create initial bee box state
 */
const createBeeBox = (): BeeBox => ({
  id: generateBoxId(),
  active: true,
  productionTimer: 0,
  productionTime: BEE_CONSTANTS_IMPL.BASE_PRODUCTION_TIME,
  honeyProduced: 0,
  lastHarvestTime: Date.now(),
  harvestReady: false,
});

/**
 * Create initial Beekeeper Assistant state
 */
const createBeekeeperAssistant = (): BeekeeperAssistant => ({
  unlocked: false,
  active: false,
  autoCollectEnabled: false,
  productionSpeedBonus: 0,
  downtimeReduction: 0,
  level: 0,
  upgradeCost: 1500, // 100 * 15
  baseUpgradeCost: 1500,
  costScaling: 1.5,
  maxLevel: 10,
});

/**
 * BeeProvider component - manages all bee system state
 */
export const BeeProvider: React.FC<BeeProviderProps> = ({ 
  children, 
  farmTier = 1,
  onYieldBonusChange,
  initialState,
  onStateChange
}) => {
  // Core state - initialize from saved state if available
  const [unlocked, setUnlocked] = useState(initialState?.unlocked ?? false);
  const [firstTimeSetup, setFirstTimeSetup] = useState(initialState?.firstTimeSetup ?? false);
  const [boxes, setBoxes] = useState<BeeBox[]>(initialState?.boxes ?? []);
  const [regularHoney, setRegularHoney] = useState(initialState?.regularHoney ?? 0);
  const [goldenHoney, setGoldenHoney] = useState(initialState?.goldenHoney ?? 0);
  const [totalHoneyCollected, setTotalHoneyCollected] = useState(initialState?.totalHoneyCollected ?? 0);
  const [totalGoldenHoneyCollected, setTotalGoldenHoneyCollected] = useState(initialState?.totalGoldenHoneyCollected ?? 0);
  const [upgrades, setUpgrades] = useState<BeeUpgrade[]>(() => {
    if (initialState?.upgrades && initialState.upgrades.length > 0) {
      // Migration: Update currency type for specific upgrades that changed to goldenHoney
      const migratedUpgrades = initialState.upgrades.map(upgrade => {
        if (upgrade.id === 'winter_hardiness' || upgrade.id === 'nectar_efficiency' || upgrade.id === 'swift_gatherers') {
          return {
            ...upgrade,
            costCurrency: 'goldenHoney' as const,
            baseCost: upgrade.id === 'winter_hardiness' ? 3 : upgrade.id === 'nectar_efficiency' ? 2 : 5,
            cost: upgrade.id === 'winter_hardiness' ? 3 : upgrade.id === 'nectar_efficiency' ? 2 : 5,
          };
        }
        return upgrade;
      });
      return migratedUpgrades;
    }
    return createInitialBeeUpgrades();
  });
  const [beekeeperAssistant, setBeekeeperAssistant] = useState<BeekeeperAssistant>(() => {
    if (initialState?.beekeeperAssistant) {
      return initialState.beekeeperAssistant;
    }
    return createBeekeeperAssistant();
  });
  const [totalBoxesPurchased, setTotalBoxesPurchased] = useState(initialState?.totalBoxesPurchased ?? 0);
  const [honeySpent, setHoneySpent] = useState(initialState?.honeySpent ?? 0);
  const [lastUpdateTime, setLastUpdateTime] = useState(initialState?.lastUpdateTime ?? Date.now());

  // Refs for tracking
  const previousYieldBonus = useRef(0);

  /**
   * Initialize bee system when player reaches Tier 3
   */
  const initializeBeeSystem = useCallback(() => {
    if (farmTier >= BEE_CONSTANTS_IMPL.UNLOCK_FARM_TIER && !unlocked) {
      setUnlocked(true);
      
      // Give starting bee boxes if this is first time setup
      if (!firstTimeSetup && boxes.length === 0) {
        const startingBoxes: BeeBox[] = [];
        for (let i = 0; i < BEE_CONSTANTS_IMPL.STARTING_BEE_BOXES; i++) {
          startingBoxes.push(createBeeBox());
        }
        setBoxes(startingBoxes);
        setFirstTimeSetup(true);
        console.log('🐝 Bee System unlocked! Starting with 2 bee boxes.');
      }
    }
  }, [farmTier, unlocked, firstTimeSetup, boxes.length]);

  /**
   * Remove a bee box (for potential future use)
   */
  const removeBeeBox = useCallback((boxId: string): boolean => {
    const boxIndex = boxes.findIndex(b => b.id === boxId);
    if (boxIndex === -1) {
      console.warn('Bee box not found:', boxId);
      return false;
    }

    setBoxes(prev => prev.filter(b => b.id !== boxId));
    console.log(`🐝 Bee box removed: ${boxId}`);
    return true;
  }, [boxes]);

  /**
   * Add a new bee hive (purchase)
   */
  const addBeeBox = useCallback((): boolean => {
    if (boxes.length >= BEE_CONSTANTS_IMPL.MAX_BEE_BOXES) {
      console.warn('Maximum bee boxes reached');
      return false;
    }

    // Calculate cost (increases with each box) - scaled by 15x
    const cost = 150 + (boxes.length * 75); // 150, 225, 300, 375... honey

    if (regularHoney < cost) {
      console.warn('Not enough honey to purchase bee box');
      return false;
    }

    // Deduct honey
    setRegularHoney(prev => prev - cost);
    setHoneySpent(prev => prev + cost);

    // Add new box
    const newBox = createBeeBox();
    setBoxes(prev => [...prev, newBox]);
    setTotalBoxesPurchased(prev => prev + 1);

    console.log(`🐝 New bee hive added! Total hives: ${boxes.length + 1}`);
    return true;
  }, [boxes.length, regularHoney]);

  /**
   * Calculate if Golden Honey should be produced based on upgrades
   */
  const calculateGoldenHoneyChance = useCallback((): number => {
    let chance = 0;

    // Check for Royal Jelly upgrade (5% base chance)
    const royalJelly = upgrades.find(u => u.id === 'royal_jelly' && u.purchased);
    if (royalJelly) {
      chance += 0.05;
    }

    // Check for Queen's Blessing (doubles chance)
    const queensBlessing = upgrades.find(u => u.id === 'queens_blessing' && u.purchased);
    if (queensBlessing && chance > 0) {
      chance *= 2;
    }

    return chance;
  }, [upgrades]);

  /**
   * Calculate honey production multiplier from upgrades
   */
  const calculateHoneyProductionMultiplier = useCallback((): number => {
    let multiplier = 1;

    // Apply Hexcomb Engineering upgrade (+5% per level)
    const hexcomb = upgrades.find(u => u.id === 'hexcomb_engineering');
    if (hexcomb && hexcomb.level > 0) {
      multiplier += hexcomb.level * 0.05;
    }

    return multiplier;
  }, [upgrades]);

  /**
   * Harvest honey from a specific bee box
   */
  const harvestHoney = useCallback((boxId: string): HoneyProduction | null => {
    const boxIndex = boxes.findIndex(b => b.id === boxId);
    if (boxIndex === -1) {
      console.warn('Bee box not found:', boxId);
      return null;
    }

    const box = boxes[boxIndex];
    if (!box.harvestReady) {
      console.warn('Bee box not ready for harvest');
      return null;
    }

    // Determine if Golden Honey is produced
    const goldenChance = calculateGoldenHoneyChance();
    const isGolden = Math.random() < goldenChance;

    // Calculate honey amount with production multiplier (base 15 lbs per harvest)
    const productionMultiplier = calculateHoneyProductionMultiplier();
    const honeyAmount = Math.round(15 * productionMultiplier);

    const production: HoneyProduction = {
      type: isGolden ? 'golden' : 'regular',
      amount: honeyAmount,
      boxId: box.id,
    };

    // Update honey inventory
    if (isGolden) {
      setGoldenHoney(prev => prev + honeyAmount);
      setTotalGoldenHoneyCollected(prev => prev + honeyAmount);
      console.log(`✨ Collected ${honeyAmount} Golden Honey from box ${boxId}`);
    } else {
      setRegularHoney(prev => prev + honeyAmount);
      setTotalHoneyCollected(prev => prev + honeyAmount);
      console.log(`🍯 Collected ${honeyAmount} Honey from box ${boxId}`);
    }

    // Reset box production
    setBoxes(prev => {
      const updated = [...prev];
      updated[boxIndex] = {
        ...box,
        productionTimer: 0,
        harvestReady: false,
        lastHarvestTime: Date.now(),
        honeyProduced: box.honeyProduced + honeyAmount,
      };
      return updated;
    });

    return production;
  }, [boxes, calculateGoldenHoneyChance, calculateHoneyProductionMultiplier]);

  /**
   * Harvest all ready bee boxes
   */
  const harvestAllHoney = useCallback((): HoneyProduction[] => {
    const readyBoxes = boxes.filter(b => b.harvestReady);
    const productions: HoneyProduction[] = [];

    for (const box of readyBoxes) {
      const production = harvestHoney(box.id);
      if (production) {
        productions.push(production);
      }
    }

    if (productions.length > 0) {
      console.log(`🐝 Harvested honey from ${productions.length} boxes`);
    }

    return productions;
  }, [boxes, harvestHoney]);

  /**
   * Calculate production time with speed bonuses
   */
  const calculateProductionTime = useCallback((): number => {
    let baseTime = BEE_CONSTANTS_IMPL.BASE_PRODUCTION_TIME;

    // Apply Busy Bees upgrade (+1% speed per level)
    const busyBees = upgrades.find(u => u.id === 'busy_bees');
    if (busyBees && busyBees.level > 0) {
      const speedBonus = busyBees.level * 0.01; // 1% per level
      baseTime = baseTime / (1 + speedBonus);
    }

    // Apply Beekeeper Assistant bonus
    if (beekeeperAssistant.active && beekeeperAssistant.productionSpeedBonus > 0) {
      baseTime = baseTime / (1 + beekeeperAssistant.productionSpeedBonus);
    }

    return baseTime;
  }, [upgrades, beekeeperAssistant]);

  /**
   * Update production timers based on elapsed time
   */
  const updateProduction = useCallback((deltaTime: number) => {
    const productionTime = calculateProductionTime();

    setBoxes(prev => {
      const updated = prev.map(box => {
        if (!box.active) return box;

        const newTimer = box.productionTimer + deltaTime;
        
        // Check if production is complete
        if (newTimer >= productionTime && !box.harvestReady) {
          return {
            ...box,
            productionTimer: productionTime,
            harvestReady: true,
          };
        }

        return {
          ...box,
          productionTimer: Math.min(newTimer, productionTime),
        };
      });

      return updated;
    });

    // Auto-collect if Beekeeper Assistant is active
    if (beekeeperAssistant.active && beekeeperAssistant.autoCollectEnabled) {
      // Check for ready boxes and harvest them
      setTimeout(() => {
        const readyBoxes = boxes.filter(b => b.harvestReady);
        if (readyBoxes.length > 0) {
          harvestAllHoney();
        }
      }, 0);
    }
  }, [calculateProductionTime, beekeeperAssistant, boxes, harvestAllHoney]);

  /**
   * Check which boxes are ready to harvest
   */
  const checkReadyBoxes = useCallback((): string[] => {
    return boxes.filter(b => b.harvestReady).map(b => b.id);
  }, [boxes]);

  /**
   * Purchase an upgrade
   */
  const purchaseUpgrade = useCallback((upgradeId: string): boolean => {
    const upgradeIndex = upgrades.findIndex(u => u.id === upgradeId);
    if (upgradeIndex === -1) {
      console.warn('Upgrade not found:', upgradeId);
      return false;
    }

    const upgrade = upgrades[upgradeIndex];

    // Check if already at max level
    if (upgrade.purchased && !upgrade.repeatable) {
      console.warn('Upgrade already purchased');
      return false;
    }

    if (upgrade.repeatable && upgrade.maxLevel && upgrade.level >= upgrade.maxLevel) {
      console.warn('Upgrade at max level');
      return false;
    }

    // Check if can afford
    const cost = upgrade.cost;
    const hasEnough = upgrade.costCurrency === 'regularHoney' 
      ? regularHoney >= cost 
      : goldenHoney >= cost;

    if (!hasEnough) {
      console.warn('Not enough honey for upgrade');
      return false;
    }

    // Deduct honey
    if (upgrade.costCurrency === 'regularHoney') {
      setRegularHoney(prev => prev - cost);
    } else {
      setGoldenHoney(prev => prev - cost);
    }
    setHoneySpent(prev => prev + cost);

    // Update upgrade
    setUpgrades(prev => {
      const updated = [...prev];
      const newLevel = upgrade.level + 1;
      const newCost = upgrade.repeatable && upgrade.costScaling
        ? Math.floor(upgrade.baseCost * Math.pow(upgrade.costScaling, newLevel))
        : upgrade.cost;

      updated[upgradeIndex] = {
        ...upgrade,
        purchased: true,
        level: newLevel,
        cost: newCost,
        effect: upgrade.effectValue * newLevel,
      };
      return updated;
    });

    console.log(`✅ Purchased upgrade: ${upgrade.name} (Level ${upgrade.level + 1})`);
    return true;
  }, [upgrades, regularHoney, goldenHoney]);

  /**
   * Check if player can afford an upgrade
   */
  const canAffordUpgrade = useCallback((upgradeId: string): boolean => {
    const upgrade = upgrades.find(u => u.id === upgradeId);
    if (!upgrade) return false;

    const cost = upgrade.cost;
    return upgrade.costCurrency === 'regularHoney' 
      ? regularHoney >= cost 
      : goldenHoney >= cost;
  }, [upgrades, regularHoney, goldenHoney]);

  /**
   * Unlock Beekeeper Assistant
   */
  const unlockBeekeeperAssistant = useCallback((): boolean => {
    if (beekeeperAssistant.unlocked) {
      console.warn('Beekeeper Assistant already unlocked');
      return false;
    }

    if (boxes.length < BEE_CONSTANTS_IMPL.BEEKEEPER_ASSISTANT_UNLOCK_BOXES) {
      console.warn(`Need ${BEE_CONSTANTS_IMPL.BEEKEEPER_ASSISTANT_UNLOCK_BOXES} boxes to unlock assistant`);
      return false;
    }

    const cost = 750; // Cost in regular honey (50 * 15)
    if (regularHoney < cost) {
      console.warn('Not enough honey to unlock assistant');
      return false;
    }

    setRegularHoney(prev => prev - cost);
    setHoneySpent(prev => prev + cost);
    setBeekeeperAssistant(prev => ({
      ...prev,
      unlocked: true,
      active: true,
      autoCollectEnabled: true,
      productionSpeedBonus: 0.1, // 10% base bonus
    }));

    console.log('🧑‍🌾 Beekeeper Assistant unlocked!');
    return true;
  }, [beekeeperAssistant, boxes.length, regularHoney]);

  /**
   * Upgrade Beekeeper Assistant
   */
  const upgradeBeekeeperAssistant = useCallback((): boolean => {
    if (!beekeeperAssistant.unlocked) {
      console.warn('Assistant not unlocked yet');
      return false;
    }

    if (beekeeperAssistant.level >= beekeeperAssistant.maxLevel) {
      console.warn('Assistant at max level');
      return false;
    }

    const cost = beekeeperAssistant.upgradeCost;
    if (regularHoney < cost) {
      console.warn('Not enough honey to upgrade assistant');
      return false;
    }

    setRegularHoney(prev => prev - cost);
    setHoneySpent(prev => prev + cost);

    const newLevel = beekeeperAssistant.level + 1;
    const newCost = Math.floor(beekeeperAssistant.baseUpgradeCost * Math.pow(beekeeperAssistant.costScaling, newLevel));
    const newBonus = 0.1 + (newLevel * 0.05); // +5% per level

    setBeekeeperAssistant(prev => ({
      ...prev,
      level: newLevel,
      upgradeCost: newCost,
      productionSpeedBonus: newBonus,
    }));

    console.log(`🧑‍🌾 Beekeeper Assistant upgraded to level ${newLevel}!`);
    return true;
  }, [beekeeperAssistant, regularHoney]);

  /**
   * Toggle Beekeeper Assistant active state
   */
  const toggleBeekeeperAssistant = useCallback((active: boolean) => {
    if (!beekeeperAssistant.unlocked) {
      console.warn('Assistant not unlocked yet');
      return;
    }

    setBeekeeperAssistant(prev => ({
      ...prev,
      active,
      autoCollectEnabled: active,
    }));
  }, [beekeeperAssistant]);

  /**
   * Calculate total crop yield bonus from bee boxes
   */
  const calculateYieldBonus = useCallback((): number => {
    let bonus = boxes.length * BEE_CONSTANTS_IMPL.BASE_YIELD_BONUS_PER_BOX;

    // Apply Meadow Magic upgrade (+0.5% per level per box)
    const meadowMagic = upgrades.find(u => u.id === 'meadow_magic');
    if (meadowMagic && meadowMagic.level > 0) {
      const additionalBonusPerBox = meadowMagic.level * 0.005; // 0.5% per level
      bonus += boxes.length * additionalBonusPerBox;
    }

    // Cap at max yield bonus
    return Math.min(bonus, BEE_CONSTANTS_IMPL.MAX_YIELD_BONUS);
  }, [boxes.length, upgrades]);

  /**
   * Calculate current honey production rate (honey per second)
   */
  const calculateProductionRate = useCallback((): number => {
    if (boxes.length === 0) return 0;
    
    const productionTime = calculateProductionTime();
    const activeBoxes = boxes.filter(b => b.active).length;
    
    return activeBoxes / productionTime; // honey per second
  }, [boxes, calculateProductionTime]);

  /**
   * Get bee system statistics
   */
  const getBeeStats = useCallback((): BeeStats => {
    const activeBoxes = boxes.filter(b => b.active).length;
    const readyBoxes = boxes.filter(b => b.harvestReady).length;
    const honeyPerSecond = calculateProductionRate();
    const productionTime = calculateProductionTime();

    return {
      totalBoxes: boxes.length,
      activeBoxes,
      readyBoxes,
      totalHoneyProduced: totalHoneyCollected,
      totalGoldenHoneyProduced: totalGoldenHoneyCollected,
      currentYieldBonus: calculateYieldBonus() * 100, // as percentage
      honeyPerHour: honeyPerSecond * 3600,
      averageProductionTime: productionTime,
    };
  }, [boxes, totalHoneyCollected, totalGoldenHoneyCollected, calculateProductionRate, calculateProductionTime, calculateYieldBonus]);

  /**
   * Get bee box purchase information
   */
  const getBeeBoxPurchaseInfo = useCallback((): BeeBoxPurchaseInfo => {
    const cost = 150 + (boxes.length * 75);
    const canAfford = regularHoney >= cost;
    const atMaxCapacity = boxes.length >= BEE_CONSTANTS_IMPL.MAX_BEE_BOXES;
    const yieldBonusGain = BEE_CONSTANTS_IMPL.BASE_YIELD_BONUS_PER_BOX;

    return {
      cost,
      canAfford,
      atMaxCapacity,
      currentCount: boxes.length,
      maxCount: BEE_CONSTANTS_IMPL.MAX_BEE_BOXES,
      yieldBonusGain,
    };
  }, [boxes.length, regularHoney]);

  /**
   * Check if player can afford a new bee hive
   */
  const canAffordBeeBox = useCallback((): boolean => {
    const info = getBeeBoxPurchaseInfo();
    return info.canAfford && !info.atMaxCapacity;
  }, [getBeeBoxPurchaseInfo]);

  /**
   * Dev tool: Add regular honey
   */
  const devAddHoney = useCallback((amount: number) => {
    setRegularHoney(prev => prev + amount);
  }, []);

  /**
   * Dev tool: Add golden honey
   */
  const devAddGoldenHoney = useCallback((amount: number) => {
    setGoldenHoney(prev => prev + amount);
  }, []);

  /**
   * Dev tool: Instantly complete all box production
   */
  const devCompleteAllBoxes = useCallback(() => {
    const productionTime = calculateProductionTime();
    setBoxes(prev => prev.map(box => ({
      ...box,
      productionTimer: productionTime,
      harvestReady: true,
    })));
  }, [calculateProductionTime]);

  /**
   * Reset bee system to initial state
   */
  const resetBeeSystem = useCallback(() => {
    setUnlocked(false);
    setFirstTimeSetup(false);
    setBoxes([]);
    setRegularHoney(0);
    setGoldenHoney(0);
    setTotalHoneyCollected(0);
    setTotalGoldenHoneyCollected(0);
    setTotalBoxesPurchased(0);
    setHoneySpent(0);
    setUpgrades(createInitialBeeUpgrades());
    setBeekeeperAssistant(createBeekeeperAssistant());
    setLastUpdateTime(Date.now());
  }, []);

  /**
   * Get upgrade effect details
   */
  const getUpgradeEffect = useCallback((upgradeId: string): UpgradeEffect | null => {
    const upgrade = upgrades.find(u => u.id === upgradeId);
    if (!upgrade) return null;

    const nextLevelValue = upgrade.effectValue * (upgrade.level + 1);
    const isMaxLevel = upgrade.repeatable && upgrade.maxLevel 
      ? upgrade.level >= upgrade.maxLevel 
      : upgrade.purchased;

    return {
      upgradeId: upgrade.id,
      effectType: upgrade.effectType,
      currentValue: upgrade.effect,
      nextLevelValue,
      isMaxLevel,
    };
  }, [upgrades]);

  // Initialize system when first reaching Tier 3 (only runs once)
  useEffect(() => {
    initializeBeeSystem();
  }, [initializeBeeSystem]);

  // Handle offline production when component mounts or becomes visible
  useEffect(() => {
    if (!unlocked || boxes.length === 0) return;

    const now = Date.now();
    const elapsedSeconds = (now - lastUpdateTime) / 1000;

    // Only process offline production if more than 2 seconds have passed
    if (elapsedSeconds > 2) {
      console.log(`Processing ${elapsedSeconds.toFixed(1)}s of offline bee production`);
      updateProduction(elapsedSeconds);
      setLastUpdateTime(now);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked, boxes.length]); // Only run on mount or when unlocked/boxes change

  // Set up production update loop using useGameLoop (runs every second)
  useGameLoop(
    () => {
      if (!unlocked || boxes.length === 0) return;

      const now = Date.now();
      const deltaTime = (now - lastUpdateTime) / 1000; // Convert to seconds
      setLastUpdateTime(now);

      updateProduction(deltaTime);
    },
    1000, // Update every second
    [unlocked, boxes.length] // Restart loop when these change
  );

  // Notify parent of yield bonus changes
  useEffect(() => {
    const currentBonus = calculateYieldBonus();
    if (currentBonus !== previousYieldBonus.current) {
      previousYieldBonus.current = currentBonus;
      onYieldBonusChange?.(currentBonus);
    }
  }, [boxes.length, upgrades, calculateYieldBonus, onYieldBonusChange]);

  // Auto-save bee state when it changes
  useEffect(() => {
    if (!onStateChange) return;
    
    const currentState: BeeState = {
      unlocked,
      firstTimeSetup,
      boxes,
      maxBoxes: BEE_CONSTANTS_IMPL.MAX_BEE_BOXES,
      regularHoney,
      goldenHoney,
      totalHoneyCollected,
      totalGoldenHoneyCollected,
      lastUpdateTime,
      honeyPerSecond: calculateProductionRate(),
      upgrades,
      beekeeperAssistant,
      totalBoxesPurchased,
      honeySpent,
    };
    
    onStateChange(currentState);
  }, [
    unlocked,
    firstTimeSetup,
    boxes,
    regularHoney,
    goldenHoney,
    totalHoneyCollected,
    totalGoldenHoneyCollected,
    lastUpdateTime,
    upgrades,
    beekeeperAssistant,
    totalBoxesPurchased,
    honeySpent,
    onStateChange,
    calculateProductionRate
  ]);

  // Construct context value
  const contextValue: BeeContextValue = {
    // State
    unlocked,
    firstTimeSetup,
    boxes,
    maxBoxes: BEE_CONSTANTS_IMPL.MAX_BEE_BOXES,
    regularHoney,
    goldenHoney,
    totalHoneyCollected,
    totalGoldenHoneyCollected,
    lastUpdateTime,
    honeyPerSecond: calculateProductionRate(),
    upgrades,
    beekeeperAssistant,
    totalBoxesPurchased,
    honeySpent,

    // Actions
    addBeeBox,
    removeBeeBox,
    harvestHoney,
    harvestAllHoney,
    updateProduction,
    checkReadyBoxes,
    purchaseUpgrade,
    canAffordUpgrade,
    unlockBeekeeperAssistant,
    upgradeBeekeeperAssistant,
    toggleBeekeeperAssistant,
    initializeBeeSystem,
    calculateYieldBonus,
    calculateProductionRate,
    calculateHoneyProductionMultiplier,
    resetBeeSystem,

    // Helpers
    getBeeStats,
    getBeeBoxPurchaseInfo,
    getUpgradeEffect,
    canAffordBeeBox,
    
    // Dev tools (only available in development)
    devAddHoney,
    devAddGoldenHoney,
    devCompleteAllBoxes,
  };

  return (
    <BeeContext.Provider value={contextValue}>
      {children}
    </BeeContext.Provider>
  );
};

/**
 * Hook to access bee context
 */
export const useBees = () => {
  const context = useContext(BeeContext);
  if (!context) {
    throw new Error('useBees must be used within a BeeProvider');
  }
  return context;
};
