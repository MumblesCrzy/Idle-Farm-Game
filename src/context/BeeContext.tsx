/**
 * Bee System Context
 * 
 * Manages the bee system state including bee boxes, honey production,
 * upgrades, and the Beekeeper Assistant automation.
 */

import { createContext, useState, useContext, useEffect, useCallback, useMemo, useRef, type Dispatch, type RefObject, type SetStateAction } from 'react';
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
import type { EventCategory, EventPriority } from '../types/game';
import { createInitialBeeUpgrades } from '../data/beeUpgrades';
import { useGameTick } from '../hooks/useGameClock';
import { useLatestRef } from '../hooks/useLatestRef';
import {
  advanceBox,
  batchDays,
  beeLevels,
  collectBatches,
  cropBonus,
  goldenChance,
  hivePrice,
  honeyMultiplier,
  normalizeBox,
  productiveSeconds,
  MAX_GAP_SECONDS,
  storedBatches
} from '../utils/beeProduction';
import { BEE_CONSTANTS } from '../config/gameConstants';

// Context definition
const BeeContext = createContext<BeeContextValue | undefined>(undefined);

interface BeeProviderProps {
  children: React.ReactNode;
  farmTier?: number; // Current farm tier to check unlock condition
  season?: string; // Current season (for winter production stoppage)
  onYieldBonusChange?: (bonus: number) => void; // Callback when yield bonus changes
  initialState?: Partial<BeeState>; // Initial state from save file
  onStateChange?: (state: BeeState) => void; // Callback when state changes (for auto-save)
  addEventLogEntry?: (
    category: EventCategory,
    message: string,
    options?: {
      priority?: EventPriority;
      details?: string;
      icon?: string;
    }
  ) => void; // Callback to add event log entries
  isPaused?: boolean; // Whether the game is paused
  onHivesHarvested?: (count: number) => void; // Called with the batches each collected hive held (pays Guild Tokens)
  /** Receives the honey setters, so honey spent elsewhere, like in the Kitchen, comes off the bees' own totals */
  honeySettersRef?: RefObject<HoneySetters | null>;
  /** Honey per batch as a share, from the player's guild: the Engineers' bees make less */
  guildHoneyMultiplier?: number;
  /** The longest gap the bees are credited for: 8 hours, or 12 with the Engineers' Night Shift */
  maxGapSeconds?: number;
}

/** The bees' own honey setters, for honey spent outside the Bees tab */
export interface HoneySetters {
  setRegularHoney: Dispatch<SetStateAction<number>>;
  setGoldenHoney: Dispatch<SetStateAction<number>>;
}

/** Boxes made this session, so two made in the same millisecond never share an id */
let boxSerial = 0;

/**
 * Generate a unique ID for bee boxes
 */
const generateBoxId = (): string => {
  boxSerial += 1;
  return `box_${Date.now()}_${boxSerial}_${Math.random().toString(36).slice(2, 9)}`;
};

/**
 * Create initial bee box state
 */
const createBeeBox = (): BeeBox => ({
  id: generateBoxId(),
  active: true,
  productionTimer: 0,
  productionTime: BEE_CONSTANTS.BASE_PRODUCTION_TIME,
  honeyProduced: 0,
  lastHarvestTime: Date.now(),
  harvestReady: false,
  storedBatches: 0,
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
  season = 'Spring',
  onYieldBonusChange,
  initialState,
  onStateChange,
  addEventLogEntry,
  isPaused = false,
  onHivesHarvested,
  honeySettersRef,
  guildHoneyMultiplier = 1,
  maxGapSeconds = MAX_GAP_SECONDS
}) => {
  // Core state - initialize from saved state if available
  const [unlocked, setUnlocked] = useState(initialState?.unlocked ?? false);
  const [firstTimeSetup, setFirstTimeSetup] = useState(initialState?.firstTimeSetup ?? false);
  // Hives from saves made before stockpiling hold their ready batch as one stored batch
  const [boxes, setBoxes] = useState<BeeBox[]>(() => (initialState?.boxes ?? []).map(normalizeBox));
  const [regularHoney, setRegularHoney] = useState(initialState?.regularHoney ?? 0);
  const [goldenHoney, setGoldenHoney] = useState(initialState?.goldenHoney ?? 0);
  const [totalHoneyCollected, setTotalHoneyCollected] = useState(initialState?.totalHoneyCollected ?? 0);
  const [totalGoldenHoneyCollected, setTotalGoldenHoneyCollected] = useState(initialState?.totalGoldenHoneyCollected ?? 0);
  const [upgrades, setUpgrades] = useState<BeeUpgrade[]>(() => {
    if (initialState?.upgrades && initialState.upgrades.length > 0) {
      // Merge saved upgrades with default definitions to ensure all properties are present
      const defaultUpgrades = createInitialBeeUpgrades();
      const savedUpgrades = initialState.upgrades;
      const mergedUpgrades = defaultUpgrades.map(defaultUpgrade => {
        const savedUpgrade = savedUpgrades.find(u => u.id === defaultUpgrade.id);
        if (savedUpgrade) {
          // Migration: Update currency type for specific upgrades that changed to goldenHoney
          let costCurrency = savedUpgrade.costCurrency;
          let baseCost = savedUpgrade.baseCost;
          let cost = savedUpgrade.cost;
          
          if (savedUpgrade.id === 'winter_hardiness' || savedUpgrade.id === 'nectar_efficiency' || savedUpgrade.id === 'swift_gatherers') {
            costCurrency = 'goldenHoney' as const;
            baseCost = savedUpgrade.id === 'winter_hardiness' ? 45 : savedUpgrade.id === 'nectar_efficiency' ? 30 : 75;
            cost = savedUpgrade.id === 'winter_hardiness' ? 45 : savedUpgrade.id === 'nectar_efficiency' ? 30 : 75;
          }
          
          return {
            ...defaultUpgrade,
            purchased: savedUpgrade.purchased ?? false,
            level: savedUpgrade.level ?? 0,
            effect: savedUpgrade.effect ?? 0,
            cost: cost,
            baseCost: baseCost,
            costCurrency: costCurrency,
          };
        }
        return defaultUpgrade;
      });
      return mergedUpgrades;
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
  
  // Use ref for lastUpdateTime to avoid re-renders every second
  const lastUpdateTimeRef = useRef(initialState?.lastUpdateTime ?? Date.now());

  // Honey spent elsewhere, like the Kitchen's honey recipes, goes through these setters. A copy
  // of the totals kept outside would be overwritten by the bees' next update.
  useEffect(() => {
    if (!honeySettersRef) return;
    honeySettersRef.current = { setRegularHoney, setGoldenHoney };
    return () => {
      honeySettersRef.current = null;
    };
  }, [honeySettersRef]);

  // Refs for tracking
  const previousYieldBonus = useRef(0);

  /**
   * Initialize bee system when player reaches Tier 4
   */
  const initializeBeeSystem = useCallback(() => {
    if (farmTier >= BEE_CONSTANTS.UNLOCK_FARM_TIER && !unlocked) {
      setUnlocked(true);
      // The hives' clock starts now, so time spent before the unlock makes no honey
      lastUpdateTimeRef.current = Date.now();
      
      // Give starting bee boxes if this is first time setup
      if (!firstTimeSetup && boxes.length === 0) {
        const startingBoxes: BeeBox[] = [];
        for (let i = 0; i < BEE_CONSTANTS.STARTING_BEE_BOXES; i++) {
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
    if (boxes.length >= BEE_CONSTANTS.MAX_BEE_BOXES) {
      console.warn('Maximum bee boxes reached');
      return false;
    }

    // Charge the same tiered price the purchase panel shows
    const cost = hivePrice(boxes.length);

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
    
    // Log bee box purchase
    if (addEventLogEntry) {
      addEventLogEntry(
        'bees',
        `Purchased bee box #${boxes.length + 1}`,
        {
          priority: 'normal',
          details: `Cost: ${cost} honey`,
          icon: '🐝'
        }
      );
    }
    
    return true;
  }, [boxes.length, regularHoney, addEventLogEntry]);

  /**
   * Calculate if Golden Honey should be produced based on upgrades
   */
  const calculateGoldenHoneyChance = useCallback((): number => goldenChance(beeLevels(upgrades)), [upgrades]);

  /**
   * Calculate honey production multiplier from upgrades
   */
  const calculateHoneyProductionMultiplier = useCallback((): number => honeyMultiplier(beeLevels(upgrades)), [upgrades]);

  const onHivesHarvestedRef = useLatestRef(onHivesHarvested);

  /**
   * Collect every batch stored in one hive. Each batch is golden by its own roll. The bees
   * keep working, so the timer toward the next batch carries on.
   */
  const harvestHoney = useCallback((boxId: string): HoneyProduction[] => {
    const box = boxes.find(b => b.id === boxId);
    if (!box) {
      console.warn('Bee box not found:', boxId);
      return [];
    }
    const batches = storedBatches(box);
    if (batches === 0) return [];

    // Each batch is 15 lbs, raised by Super Frames, and lowered for the Engineers (Noisy Machines)
    const honeyPerBatch = Math.round(15 * calculateHoneyProductionMultiplier() * guildHoneyMultiplier);
    const { regular, golden } = collectBatches(batches, { honeyPerBatch, goldenChance: calculateGoldenHoneyChance() });

    if (regular > 0) {
      setRegularHoney(prev => prev + regular);
      setTotalHoneyCollected(prev => prev + regular);
    }
    if (golden > 0) {
      setGoldenHoney(prev => prev + golden);
      setTotalGoldenHoneyCollected(prev => prev + golden);
    }
    setBoxes(prev => prev.map(b => (b.id === boxId
      ? { ...b, storedBatches: 0, harvestReady: false, lastHarvestTime: Date.now(), honeyProduced: b.honeyProduced + regular + golden }
      : b)));

    onHivesHarvestedRef.current?.(batches);
    const productions: HoneyProduction[] = [];
    if (regular > 0) productions.push({ type: 'regular', amount: regular, boxId });
    if (golden > 0) productions.push({ type: 'golden', amount: golden, boxId });
    return productions;
  }, [boxes, calculateGoldenHoneyChance, calculateHoneyProductionMultiplier, guildHoneyMultiplier, onHivesHarvestedRef]);

  /**
   * Collect the honey stored in every hive
   */
  const harvestAllHoney = useCallback((): HoneyProduction[] => {
    const fullBoxes = boxes.filter(box => storedBatches(box) > 0);
    const productions = fullBoxes.flatMap(box => harvestHoney(box.id));

    if (productions.length > 0 && addEventLogEntry) {
      const total = productions.reduce((sum, p) => sum + p.amount, 0);
      const golden = productions.filter(p => p.type === 'golden').reduce((sum, p) => sum + p.amount, 0);
      const boxWord = fullBoxes.length === 1 ? 'box' : 'boxes';
      addEventLogEntry(
        'bees',
        `Harvested ${total} honey from ${fullBoxes.length} ${boxWord}${golden > 0 ? ` (${golden} golden!)` : ''}`,
        {
          priority: golden > 0 ? 'important' : 'normal',
          details: golden > 0 ? `Regular: ${total - golden}, Golden: ${golden}` : undefined,
          icon: golden > 0 ? '✨' : '🍯'
        }
      );
    }

    return productions;
  }, [boxes, harvestHoney, addEventLogEntry]);

  /**
   * Calculate production time with speed bonuses
   */
  const calculateProductionTime = useCallback((): number => batchDays(
    beeLevels(upgrades),
    beekeeperAssistant.active ? beekeeperAssistant.productionSpeedBonus : 0
  ), [upgrades, beekeeperAssistant]);

  /**
   * Advance every hive by elapsed time. Finished batches are stored and the bees go on to the
   * next; winter stops them unless they have Winter Hardiness. Long gaps (time away, a hidden
   * tab) are capped at 8 hours, or 12 with Night Shift, and count the warm share of the year.
   */
  const updateProduction = useCallback((deltaTime: number, currentSeason?: string) => {
    const winterHardiness = upgrades.find(u => u.id === 'winter_hardiness')?.purchased || false;
    const seconds = productiveSeconds(deltaTime, { winter: currentSeason === 'Winter', winterHardiness, maxSeconds: maxGapSeconds });
    if (seconds <= 0) return;

    const productionTime = calculateProductionTime();
    // Count from current state. A count set inside the updater below may not
    // exist yet when it is read, because React can run the updater later.
    const newlyReadyCount = boxes.filter(box =>
      storedBatches(box) === 0 && box.productionTimer + seconds >= productionTime
    ).length;

    setBoxes(prev => prev.map(box => advanceBox(box, seconds, productionTime)));

    // Log when boxes first have honey waiting
    if (newlyReadyCount > 0 && addEventLogEntry) {
      const boxWord = newlyReadyCount === 1 ? 'box is' : 'boxes are';
      addEventLogEntry(
        'bees',
        `${newlyReadyCount} bee ${boxWord} ready to harvest!`,
        {
          priority: 'normal',
          icon: '🍯'
        }
      );
    }

    // Auto-collect if Beekeeper Assistant is active
    if (beekeeperAssistant.active && beekeeperAssistant.autoCollectEnabled) {
      setTimeout(() => {
        if (boxes.some(box => storedBatches(box) > 0)) {
          harvestAllHoney();
        }
      }, 0);
    }
  }, [calculateProductionTime, beekeeperAssistant, boxes, harvestAllHoney, addEventLogEntry, upgrades, maxGapSeconds]);

  /**
   * Check which boxes are ready to harvest
   */
  const checkReadyBoxes = useCallback((): string[] => {
    return boxes.filter(b => storedBatches(b) > 0).map(b => b.id);
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
    
    // Log upgrade purchase
    if (addEventLogEntry) {
      const levelText = upgrade.repeatable ? ` (Level ${upgrade.level + 1})` : '';
      addEventLogEntry(
        'bees',
        `Purchased: ${upgrade.name}${levelText}`,
        {
          priority: 'normal',
          details: upgrade.description,
          icon: '⬆️'
        }
      );
    }
    
    return true;
  }, [upgrades, regularHoney, goldenHoney, addEventLogEntry]);

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

    if (boxes.length < BEE_CONSTANTS.BEEKEEPER_ASSISTANT_UNLOCK_BOXES) {
      console.warn(`Need ${BEE_CONSTANTS.BEEKEEPER_ASSISTANT_UNLOCK_BOXES} boxes to unlock assistant`);
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
    
    // Log assistant unlock
    if (addEventLogEntry) {
      addEventLogEntry(
        'bees',
        'Beekeeper Assistant unlocked!',
        {
          priority: 'important',
          details: 'Automatically collects honey from bee boxes. +10% production speed.',
          icon: '🧑‍🌾'
        }
      );
    }
    
    return true;
  }, [beekeeperAssistant, boxes.length, regularHoney, addEventLogEntry]);

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
    
    // Log assistant upgrade
    if (addEventLogEntry) {
      addEventLogEntry(
        'bees',
        `Beekeeper Assistant upgraded to Level ${newLevel}`,
        {
          priority: 'normal',
          details: `Production bonus: +${(newBonus * 100).toFixed(0)}%`,
          icon: '🧑‍🌾'
        }
      );
    }
    
    return true;
  }, [beekeeperAssistant, regularHoney, addEventLogEntry]);

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
  const calculateYieldBonus = useCallback((): number => cropBonus(boxes.length, beeLevels(upgrades)), [boxes.length, upgrades]);

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
    const readyBoxes = boxes.filter(b => storedBatches(b) > 0).length;
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
    const cost = hivePrice(boxes.length);
    const canAfford = regularHoney >= cost;
    const atMaxCapacity = boxes.length >= BEE_CONSTANTS.MAX_BEE_BOXES;
    const yieldBonusGain = BEE_CONSTANTS.BASE_YIELD_BONUS_PER_BOX;

    return {
      cost,
      canAfford,
      atMaxCapacity,
      currentCount: boxes.length,
      maxCount: BEE_CONSTANTS.MAX_BEE_BOXES,
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
    setBoxes(prev => prev.map(box => ({
      ...box,
      storedBatches: storedBatches(box) + 1,
      harvestReady: true,
    })));
  }, []);

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
    lastUpdateTimeRef.current = Date.now();
  }, []);

  /**
   * Apply offline progress to bee system
   * This is called when the player returns after being away
   */
  const applyOfflineProgress = useCallback((progress: {
    boxes: BeeBox[];
    regularHoney: number;
    goldenHoney: number;
    totalHoneyCollected: number;
    totalGoldenHoneyCollected: number;
    lastUpdateTime: number;
  }) => {
    setBoxes(progress.boxes);
    setRegularHoney(progress.regularHoney);
    setGoldenHoney(progress.goldenHoney);
    setTotalHoneyCollected(progress.totalHoneyCollected);
    setTotalGoldenHoneyCollected(progress.totalGoldenHoneyCollected);
    lastUpdateTimeRef.current = progress.lastUpdateTime;
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

  // Initialize system when first reaching Tier 4 (only runs once)
  useEffect(() => {
    initializeBeeSystem();
  }, [initializeBeeSystem]);

  // Handle offline production when component mounts or becomes visible
  useEffect(() => {
    if (!unlocked || boxes.length === 0 || isPaused) return;

    const now = Date.now();
    const elapsedSeconds = (now - lastUpdateTimeRef.current) / 1000;

    // Only process offline production if more than 2 seconds have passed
    if (elapsedSeconds > 2) {
      console.log(`Processing ${elapsedSeconds.toFixed(1)}s of offline bee production`);
      updateProduction(elapsedSeconds, season);
      lastUpdateTimeRef.current = now;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked, boxes.length, isPaused]); // Only run on mount or when unlocked/boxes change

  // Production, one game step per second. It uses real elapsed time, so the first
  // step after the tab was hidden credits the hidden time.
  useGameTick(() => {
    // Time while locked, without hives or paused makes no honey. The clock keeps up with it,
    // or the first step after would credit all of that time to the hives.
    if (!unlocked || boxes.length === 0 || isPaused) {
      lastUpdateTimeRef.current = Date.now();
      return;
    }

    const now = Date.now();
    const deltaTime = (now - lastUpdateTimeRef.current) / 1000; // Convert to seconds
    lastUpdateTimeRef.current = now;

    updateProduction(deltaTime, season);
  }, { order: 50 });

  // Update box active status based on season
  useEffect(() => {
    const winterHardinessUpgrade = upgrades.find(u => u.id === 'winter_hardiness');
    const hasWinterHardiness = winterHardinessUpgrade?.purchased || false;
    const isWinter = season === 'Winter';
    
    // Set boxes as inactive during winter unless Winter Hardiness is purchased
    const shouldBeActive = !isWinter || hasWinterHardiness;
    
    setBoxes(prev => {
      // Check if any box needs to change its active status
      const needsUpdate = prev.some(box => box.active !== shouldBeActive);
      if (!needsUpdate) return prev;
      
      return prev.map(box => ({
        ...box,
        active: shouldBeActive
      }));
    });
  }, [season, upgrades]);

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
      maxBoxes: BEE_CONSTANTS.MAX_BEE_BOXES,
      regularHoney,
      goldenHoney,
      totalHoneyCollected,
      totalGoldenHoneyCollected,
      lastUpdateTime: lastUpdateTimeRef.current,
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
    upgrades,
    beekeeperAssistant,
    totalBoxesPurchased,
    honeySpent,
    onStateChange,
    calculateProductionRate
  ]);

  // Construct context value. Memoized so consumers re-render only when something
  // in it changes. Every value it reads is listed below; lastUpdateTime is a getter
  // because it lives in a ref, so it can never be stale.
  const contextValue = useMemo<BeeContextValue>(() => ({
    // State
    unlocked,
    firstTimeSetup,
    boxes,
    maxBoxes: BEE_CONSTANTS.MAX_BEE_BOXES,
    regularHoney,
    goldenHoney,
    totalHoneyCollected,
    totalGoldenHoneyCollected,
    get lastUpdateTime() {
      return lastUpdateTimeRef.current;
    },
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
    applyOfflineProgress,
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
  }), [
    unlocked,
    firstTimeSetup,
    boxes,
    regularHoney,
    goldenHoney,
    totalHoneyCollected,
    totalGoldenHoneyCollected,
    upgrades,
    beekeeperAssistant,
    totalBoxesPurchased,
    honeySpent,
    addBeeBox,
    removeBeeBox,
    harvestHoney,
    harvestAllHoney,
    applyOfflineProgress,
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
    getBeeStats,
    getBeeBoxPurchaseInfo,
    getUpgradeEffect,
    canAffordBeeBox,
    devAddHoney,
    devAddGoldenHoney,
    devCompleteAllBoxes,
  ]);

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
