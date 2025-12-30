/**
 * Offline Progress System
 * 
 * Simulates game progress when the player returns after being away.
 * Calculates how much would have happened during the offline time.
 */

import type { Veggie } from '../types/game';
import type { BeeBox, BeeUpgrade, BeekeeperAssistant, OfflineBeeProgress } from '../types/bees';
import type { CanningProcess } from '../types/canning';
import { CANNING_BASE_DURATION_SECONDS, GROWTH_COMPLETE_THRESHOLD } from '../config/gameConstants';

interface OfflineBeeStateInput {
  unlocked?: boolean;
  boxes: BeeBox[];
  upgrades: BeeUpgrade[];
  beekeeperAssistant?: BeekeeperAssistant;
  regularHoney: number;
  goldenHoney: number;
  totalHoneyCollected: number;
  totalGoldenHoneyCollected: number;
  lastUpdateTime?: number;
}
import { processVeggieGrowth, processAutoHarvest } from './gameLoopProcessors';

export interface OfflineProgressResult {
  timeElapsed: number; // milliseconds
  veggies: Veggie[];
  experienceGain: number;
  knowledgeGain: number;
  day: number;
  totalDaysElapsed: number;
  canningProgressUpdates: Map<string, number>; // recipeId -> progress gained
  autoCanningProcessed: number; // number of auto-canning cycles completed
  christmasTreeGrowthTicks: number; // number of tree growth ticks processed
  christmasElvesCraftingTicks: number; // number of elves crafting ticks processed
  christmasPassiveCheerGain: number; // passive Holiday Cheer earned
  beeProgress?: OfflineBeeProgress; // Honey production and updated bee state
}

function getUpgrade(beeUpgrades: BeeUpgrade[] | undefined, id: string): BeeUpgrade | undefined {
  return beeUpgrades?.find(u => u.id === id);
}

function simulateBeeOfflineProduction(
  elapsedSeconds: number,
  season: string,
  beeState?: OfflineBeeStateInput
): OfflineBeeProgress | undefined {
  if (!beeState?.unlocked || beeState.boxes.length === 0) {
    return undefined;
  }

  const isWinter = season === 'Winter';
  const winterHardiness = getUpgrade(beeState.upgrades, 'winter_hardiness');
  const hasWinterHardiness = Boolean(winterHardiness?.purchased || (winterHardiness?.level ?? 0) > 0);
  const boxesActive = !isWinter || hasWinterHardiness;

  if (!boxesActive) {
    return {
      boxes: beeState.boxes,
      regularHoney: beeState.regularHoney,
      goldenHoney: beeState.goldenHoney,
      totalHoneyCollected: beeState.totalHoneyCollected,
      totalGoldenHoneyCollected: beeState.totalGoldenHoneyCollected,
      lastUpdateTime: Date.now(),
      honeyGained: 0,
      goldenHoneyGained: 0,
      harvestsProcessed: 0,
    };
  }

  const busyBees = getUpgrade(beeState.upgrades, 'busy_bees');
  const speedBonus = busyBees ? (busyBees.level ?? 0) * 0.01 : 0;
  const assistantBonus = beeState.beekeeperAssistant?.active ? (beeState.beekeeperAssistant.productionSpeedBonus || 0) : 0;
  const autoCollectEnabled = Boolean(beeState.beekeeperAssistant?.active && beeState.beekeeperAssistant.autoCollectEnabled);

  let productionTime = 132; // base seconds
  productionTime = productionTime / (1 + speedBonus);
  if (assistantBonus > 0) {
    productionTime = productionTime / (1 + assistantBonus);
  }

  const hexcomb = getUpgrade(beeState.upgrades, 'hexcomb_engineering');
  const productionMultiplier = 1 + ((hexcomb?.level ?? 0) * 0.05);
  const honeyPerHarvest = Math.round(15 * productionMultiplier);

  let goldenChance = 0.01;
  const royalJelly = getUpgrade(beeState.upgrades, 'royal_jelly');
  if (royalJelly && (royalJelly.purchased || (royalJelly.level ?? 0) > 0)) {
    goldenChance += 0.01;
  }
  const queensBlessing = getUpgrade(beeState.upgrades, 'queens_blessing');
  if (queensBlessing && (queensBlessing.purchased || (queensBlessing.level ?? 0) > 0) && goldenChance > 0) {
    goldenChance *= 2;
  }

  let totalHoneyGain = 0;
  let totalGoldenHoneyGain = 0;
  let harvestsProcessed = 0;
  const updatedBoxes = beeState.boxes.map(box => {
    if (!box.active) return box;

    const progress = box.productionTimer + elapsedSeconds;
    const completed = Math.floor(progress / productionTime);
    const remainder = progress % productionTime;

    if (completed <= 0) {
      return {
        ...box,
        productionTimer: Math.min(progress, productionTime),
      };
    }

    harvestsProcessed += completed;
    let boxRegularGain = 0;
    let boxGoldenGain = 0;

    for (let i = 0; i < completed; i++) {
      const isGolden = Math.random() < goldenChance;
      if (isGolden) {
        boxGoldenGain += honeyPerHarvest;
      } else {
        boxRegularGain += honeyPerHarvest;
      }
    }

    if (autoCollectEnabled) {
      totalHoneyGain += boxRegularGain;
      totalGoldenHoneyGain += boxGoldenGain;

      return {
        ...box,
        productionTimer: remainder,
        harvestReady: false,
        lastHarvestTime: Date.now(),
        honeyProduced: box.honeyProduced + boxRegularGain + boxGoldenGain,
      };
    }

    return {
      ...box,
      productionTimer: productionTime,
      harvestReady: true,
    };
  });

  const now = Date.now();

  return {
    boxes: updatedBoxes,
    regularHoney: beeState.regularHoney + totalHoneyGain,
    goldenHoney: beeState.goldenHoney + totalGoldenHoneyGain,
    totalHoneyCollected: beeState.totalHoneyCollected + totalHoneyGain,
    totalGoldenHoneyCollected: beeState.totalGoldenHoneyCollected + totalGoldenHoneyGain,
    lastUpdateTime: now,
    honeyGained: totalHoneyGain,
    goldenHoneyGained: totalGoldenHoneyGain,
    harvestsProcessed,
  };
}

/**
 * Calculate and simulate game progress for the time the player was away
 */
export function calculateOfflineProgress(
  timeElapsedMs: number,
  gameState: {
    veggies: Veggie[];
    day: number;
    totalDaysElapsed: number;
    dayLength: number;
    season: string;
    currentWeather: string;
    greenhouseOwned: boolean;
    irrigationOwned: boolean;
    almanacLevel: number;
    farmTier: number;
    knowledge: number;
    canningProcesses: CanningProcess[];
    canningUpgrades: Record<string, number>;
    autoCanning: { enabled: boolean };
    christmasEvent?: {
      isEventActive: boolean;
      passiveCheerPerSecond: number;
    };
    beeState?: OfflineBeeStateInput;
  }
): OfflineProgressResult {
  // Don't process if less than 1 second elapsed (avoid flickering on quick tab switches)
  if (timeElapsedMs < 1000) {
    return {
      timeElapsed: timeElapsedMs,
      veggies: gameState.veggies,
      experienceGain: 0,
      knowledgeGain: 0,
      day: gameState.day,
      totalDaysElapsed: gameState.totalDaysElapsed,
      canningProgressUpdates: new Map(),
      autoCanningProcessed: 0,
      christmasTreeGrowthTicks: 0,
      christmasElvesCraftingTicks: 0,
      christmasPassiveCheerGain: 0,
    };
  }

  let currentVeggies = [...gameState.veggies];
  let totalExperienceGain = 0;
  let totalKnowledgeGain = 0;
  let currentDay = gameState.day;
  let currentTotalDays = gameState.totalDaysElapsed;
  
  const canningProgressUpdates = new Map<string, number>();
  let autoCanningCycles = 0;
  let beeProgress: OfflineBeeProgress | undefined;

  // Process in chunks to avoid performance issues with very long offline periods
  // Max 8 hours of offline time (can be increased to 24 hours for prestige system later)
  const MAX_OFFLINE_HOURS = 8; // Change to 24 for prestige system
  const MAX_OFFLINE_MS = MAX_OFFLINE_HOURS * 60 * 60 * 1000;
  const cappedTime = Math.min(timeElapsedMs, MAX_OFFLINE_MS);
  
  // Use larger tick sizes for longer offline periods to improve performance
  // For periods > 1 hour, use 1 second ticks instead of 100ms ticks
  const FAST_TICK_MS = 100;
  const SLOW_TICK_MS = 1000;
  const ONE_HOUR_MS = 60 * 60 * 1000;
  
  const TICK_MS = cappedTime > ONE_HOUR_MS ? SLOW_TICK_MS : FAST_TICK_MS;
  const ticks = Math.floor(cappedTime / TICK_MS);

  // Track elapsed time for day counter
  let elapsedMs = 0;

  // Process veggie growth and auto-harvest
  for (let i = 0; i < ticks; i++) {
    elapsedMs += TICK_MS;

    // Veggie growth (every tick)
    const growthResult = processVeggieGrowth(
      currentVeggies,
      gameState.season,
      gameState.currentWeather,
      gameState.greenhouseOwned,
      gameState.irrigationOwned
    );
    currentVeggies = growthResult.veggies;

    // Auto-harvest (every tick)
    const autoHarvestResult = processAutoHarvest(
      currentVeggies,
      gameState.almanacLevel,
      gameState.farmTier,
      gameState.knowledge + totalKnowledgeGain
    );
    
    if (autoHarvestResult.needsUpdate) {
      currentVeggies = autoHarvestResult.veggies;
      totalExperienceGain += autoHarvestResult.experienceGain;
      totalKnowledgeGain += autoHarvestResult.knowledgeGain;
    }

    // Day counter (every dayLength milliseconds)
    if (elapsedMs >= gameState.dayLength) {
      currentDay += 1;
      currentTotalDays += 1;
      elapsedMs = 0;
    }
  }

  // Process canning progress
  // Each active process gains progress based on elapsed time
  const canningSpeedMultiplier = 1 + (gameState.canningUpgrades?.canningSpeed || 0) * 0.1;
  const progressPerTick = (GROWTH_COMPLETE_THRESHOLD / (CANNING_BASE_DURATION_SECONDS * 10)) * canningSpeedMultiplier; // 30 seconds base = 300 ticks at 100ms
  const progressGained = progressPerTick * ticks;

  gameState.canningProcesses.forEach((process: CanningProcess) => {
    if (!process.completed) {
      canningProgressUpdates.set(process.recipeId, progressGained);
    }
  });

  // Process auto-canning cycles
  if (gameState.autoCanning?.enabled) {
    const autoCycleTime = 30000 / canningSpeedMultiplier; // milliseconds per cycle
    autoCanningCycles = Math.floor(cappedTime / autoCycleTime);
  }

  // Process Christmas event offline progress
  let christmasTreeGrowthTicks = 0;
  let christmasElvesCraftingTicks = 0;
  let christmasPassiveCheerGain = 0;
  
  if (gameState.christmasEvent?.isEventActive) {
    // Tree growth happens every 1000ms
    christmasTreeGrowthTicks = Math.floor(cappedTime / 1000);
    
    // Elves crafting happens every 1000ms (if elves bench is owned, checked by caller)
    christmasElvesCraftingTicks = Math.floor(cappedTime / 1000);
    
    // Passive cheer gain (if Golden Bell is owned)
    if (gameState.christmasEvent.passiveCheerPerSecond > 0) {
      christmasPassiveCheerGain = (gameState.christmasEvent.passiveCheerPerSecond * cappedTime) / 1000;
    }
  }

  // Process bee system offline production
  beeProgress = simulateBeeOfflineProduction(cappedTime / 1000, gameState.season, gameState.beeState);

  return {
    timeElapsed: cappedTime,
    veggies: currentVeggies,
    experienceGain: totalExperienceGain,
    knowledgeGain: totalKnowledgeGain,
    day: currentDay,
    totalDaysElapsed: currentTotalDays,
    canningProgressUpdates,
    autoCanningProcessed: autoCanningCycles,
    christmasTreeGrowthTicks,
    christmasElvesCraftingTicks,
    christmasPassiveCheerGain,
    beeProgress,
  };
}

/**
 * Format offline time into a readable string
 */
export function formatOfflineTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days !== 1 ? 's' : ''} ${hours % 24} hour${hours % 24 !== 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes % 60} minute${minutes % 60 !== 1 ? 's' : ''}`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }
}
