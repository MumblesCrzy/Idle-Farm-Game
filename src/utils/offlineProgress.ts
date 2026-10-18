/**
 * Offline Progress System
 * 
 * Simulates game progress when the player returns after being away.
 * Calculates how much would have happened during the offline time.
 */

import type { Veggie } from '../types/game';
import type { GuildState } from '../types/guilds';
import type { CanningProcess } from '../types/canning';
import { processVeggieGrowth, processAutoHarvest } from './gameLoopProcessors';
import { getSeason } from './gameCalculations';
import { MAX_OFFLINE_MS } from '../config/gameConstants';
import type { OfflineBeeProgress, BeeBox, BeeUpgrade, BeekeeperAssistant } from '../types/bees';

/** One offline step, matching the 1-second interval of the live game loops */
export const OFFLINE_TICK_MS = 1000;

export interface OfflineProgressResult {
  timeElapsed: number; // milliseconds
  veggies: Veggie[];
  experienceGain: number;
  knowledgeGain: number;
  autoHarvests: number; // auto harvests performed (they pay Guild Tokens)
  day: number;
  totalDaysElapsed: number;
  canningProgressUpdates: Map<string, number>; // recipeId -> progress gained
  autoCanningProcessed: number; // number of auto-canning cycles completed
  christmasTreeGrowthTicks: number; // number of tree growth ticks processed
  christmasElvesCraftingTicks: number; // number of elves crafting ticks processed
  christmasPassiveCheerGain: number; // passive Holiday Cheer earned
  beeProgress?: OfflineBeeProgress; // bee system offline progress (optional until fully implemented)
}

/**
 * Calculate and simulate game progress for the time the player was away.
 */
export function calculateOfflineProgress(
  timeElapsedMs: number,
  gameState: {
    veggies: Veggie[];
    day: number;
    totalDaysElapsed: number;
    dayLength: number;
    season: string; // Initial season (used as fallback, but we derive from day during sim)
    currentWeather: string;
    greenhouseOwned: boolean;
    irrigationOwned: boolean;
    almanacLevel: number;
    farmTier: number;
    knowledge: number;
    canningProcesses: CanningProcess[];
    canningUpgrades: Record<string, number>; // upgrade id -> level
    autoCanning: { enabled: boolean };
    guildState?: GuildState;
    christmasEvent?: {
      isEventActive: boolean;
      passiveCheerPerSecond: number;
    };
    beeState?: {
      unlocked: boolean;
      boxes: BeeBox[];
      upgrades: BeeUpgrade[];
      beekeeperAssistant: BeekeeperAssistant;
      regularHoney: number;
      goldenHoney: number;
      totalHoneyCollected: number;
      totalGoldenHoneyCollected: number;
    };
  }
): OfflineProgressResult {
  // Don't process if less than 1 second elapsed (avoid flickering on quick tab switches)
  if (timeElapsedMs < 1000) {
    return {
      timeElapsed: timeElapsedMs,
      veggies: gameState.veggies,
      experienceGain: 0,
      knowledgeGain: 0,
      autoHarvests: 0,
      day: gameState.day,
      totalDaysElapsed: gameState.totalDaysElapsed,
      canningProgressUpdates: new Map(),
      autoCanningProcessed: 0,
      christmasTreeGrowthTicks: 0,
      christmasElvesCraftingTicks: 0,
      christmasPassiveCheerGain: 0
    };
  }

  let currentVeggies = [...gameState.veggies];
  let totalExperienceGain = 0;
  let totalKnowledgeGain = 0;
  let totalAutoHarvests = 0;
  let currentDay = gameState.day;
  let currentTotalDays = gameState.totalDaysElapsed;
  
  const canningProgressUpdates = new Map<string, number>();
  let autoCanningCycles = 0;

  // At most 8 hours of offline time is credited
  const cappedTime = Math.min(timeElapsedMs, MAX_OFFLINE_MS);
  
  // Step once per second, the same rate as the live growth, harvest and day loops,
  // so offline progress matches what playing would have produced.
  // (Earlier versions stepped every 100ms for absences under an hour, which
  // credited ten times the live rate.)
  const TICK_MS = OFFLINE_TICK_MS;
  const ticks = Math.floor(cappedTime / TICK_MS);

  // Track elapsed time for day counter
  let elapsedMs = 0;

  // Process veggie growth and auto-harvest
  for (let i = 0; i < ticks; i++) {
    elapsedMs += TICK_MS;

    // Derive current season from day (season changes as days advance)
    const currentSeason = getSeason(currentDay);

    // Veggie growth (every tick)
    const growthResult = processVeggieGrowth(
      currentVeggies,
      currentSeason,
      gameState.currentWeather,
      gameState.greenhouseOwned,
      gameState.irrigationOwned,
      gameState.guildState
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
      totalAutoHarvests += autoHarvestResult.harvestedVeggies.length;
    }

    // Day counter (every dayLength milliseconds)
    if (elapsedMs >= gameState.dayLength) {
      // Wrap at 365 like the live day loop, so seasons keep cycling
      currentDay = (currentDay % 365) + 1;
      currentTotalDays += 1;
      elapsedMs = 0;
    }
  }

  // Process canning progress
  // Each active process gains progress based on elapsed time
  const canningSpeedMultiplier = 1 + (gameState.canningUpgrades?.canningSpeed || 0) * 0.1;
  const progressPerTick = (100 / 300) * canningSpeedMultiplier; // 30 seconds base = 300 ticks at 100ms
  const progressGained = progressPerTick * ticks;

  gameState.canningProcesses.forEach((process) => {
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

  return {
    timeElapsed: cappedTime,
    veggies: currentVeggies,
    experienceGain: totalExperienceGain,
    knowledgeGain: totalKnowledgeGain,
    autoHarvests: totalAutoHarvests,
    day: currentDay,
    totalDaysElapsed: currentTotalDays,
    canningProgressUpdates,
    autoCanningProcessed: autoCanningCycles,
    christmasTreeGrowthTicks,
    christmasElvesCraftingTicks,
    christmasPassiveCheerGain
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
