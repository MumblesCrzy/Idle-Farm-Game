/**
 * useOfflineProgress Hook
 * 
 * Tracks when the player leaves and returns to the game tab,
 * calculates offline progress, and applies it to the game state.
 * 
 * @module hooks/useOfflineProgress
 */

import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { calculateOfflineProgress, formatOfflineTime } from '../utils/offlineProgress';
import type { OfflineProgressResult } from '../utils/offlineProgress';
import type { Veggie, WeatherType } from '../types/game';
import type { BeeContextValue } from '../types/bees';
import type { EventUpgrade } from '../types/christmasEvent';
import type { UseChristmasEventReturn } from './useChristmasEvent';

/** Storage key for tracking when the player was last active */
const LAST_ACTIVE_KEY = 'farmIdleLastActive';

/** Minimum time away (ms) before processing offline progress - 5 minutes */
const MIN_OFFLINE_TIME_MS = 5 * 60 * 1000; // 5 minutes

/** Interval (ms) for updating last active time while tab is active */
const ACTIVE_UPDATE_INTERVAL_MS = 10000;

/**
 * Game state required for offline progress calculation.
 * This should match the structure stored in gameStateRef.
 */
export interface OfflineGameState {
  veggies: Veggie[];
  day: number;
  totalDaysElapsed: number;
  season: string;
  currentWeather: WeatherType;
  greenhouseOwned: boolean;
  irrigationOwned: boolean;
  almanacLevel: number;
  farmTier: number;
  knowledge: number;
  christmasEvent: UseChristmasEventReturn;
}

/**
 * Callbacks to apply offline progress to the game state.
 */
export interface OfflineProgressCallbacks {
  setVeggies: React.Dispatch<React.SetStateAction<Veggie[]>>;
  setExperience: React.Dispatch<React.SetStateAction<number>>;
  setKnowledge: React.Dispatch<React.SetStateAction<number>>;
  setDay: React.Dispatch<React.SetStateAction<number>>;
  setTotalDaysElapsed: React.Dispatch<React.SetStateAction<number>>;
  /** Optional callback when offline progress is processed (e.g., to show toast) */
  onOfflineProgressProcessed?: (result: OfflineProgressResult, timeAwayStr: string) => void;
}

/**
 * Gets the bee state input for offline progress calculation.
 */
function getBeeStateInput(beeContext: BeeContextValue | null) {
  if (!beeContext) return undefined;
  
  return {
    unlocked: beeContext.unlocked,
    boxes: beeContext.boxes,
    upgrades: beeContext.upgrades,
    beekeeperAssistant: beeContext.beekeeperAssistant,
    regularHoney: beeContext.regularHoney,
    goldenHoney: beeContext.goldenHoney,
    totalHoneyCollected: beeContext.totalHoneyCollected,
    totalGoldenHoneyCollected: beeContext.totalGoldenHoneyCollected,
  };
}

/**
 * Applies offline progress to the game state and processes Christmas event updates.
 */
function applyOfflineProgress(
  offlineResult: OfflineProgressResult,
  christmasEvent: UseChristmasEventReturn,
  callbacks: OfflineProgressCallbacks,
  beeContext: BeeContextValue | null
): void {
  // Apply base game state updates
  callbacks.setVeggies(offlineResult.veggies);
  callbacks.setExperience((prev: number) => prev + offlineResult.experienceGain);
  callbacks.setKnowledge((prev: number) => prev + offlineResult.knowledgeGain);
  callbacks.setDay(offlineResult.day);
  callbacks.setTotalDaysElapsed(offlineResult.totalDaysElapsed);

  // Process Christmas tree growth if event is active
  if (christmasEvent.isEventActive && offlineResult.christmasTreeGrowthTicks > 0) {
    for (let i = 0; i < offlineResult.christmasTreeGrowthTicks; i++) {
      christmasEvent.processTreeGrowth();
    }
  }

  // Process Christmas passive income (Golden Bell)
  if (christmasEvent.isEventActive && christmasEvent.passiveCheerPerSecond > 0) {
    christmasEvent.updatePassiveIncome(offlineResult.timeElapsed);
  }

  // Process Elves' Bench automation
  if (christmasEvent.isEventActive && offlineResult.christmasTreeGrowthTicks > 0) {
    const elvesBenchOwned = christmasEvent.eventState.upgrades.find(
      (u: EventUpgrade) => u.id === 'elves_bench'
    )?.owned ?? false;
    
    if (elvesBenchOwned) {
      for (let i = 0; i < offlineResult.christmasTreeGrowthTicks; i++) {
        christmasEvent.processDailyElvesCrafting();
      }
    }
  }

  // Process bee system offline production
  if (offlineResult.beeProgress && beeContext?.applyOfflineProgress) {
    beeContext.applyOfflineProgress(offlineResult.beeProgress);
  }

  // Log offline progress details
  const timeAwayStr = formatOfflineTime(offlineResult.timeElapsed);
  console.log(`Welcome back! You were away for ${timeAwayStr}`);

  if (offlineResult.experienceGain > 0 || offlineResult.knowledgeGain > 0) {
    console.log(
      `Offline progress: +${offlineResult.experienceGain.toFixed(1)} XP, +${offlineResult.knowledgeGain.toFixed(1)} Knowledge`
    );
  }

  if (christmasEvent.isEventActive && offlineResult.christmasTreeGrowthTicks > 0) {
    console.log(`Christmas trees grew ${offlineResult.christmasTreeGrowthTicks} times`);
  }

  // Notify callback if provided
  if (callbacks.onOfflineProgressProcessed) {
    callbacks.onOfflineProgressProcessed(offlineResult, timeAwayStr);
  }
}

/**
 * Calculates and processes offline progress for a given time elapsed.
 */
function processOfflineTime(
  timeElapsed: number,
  gameStateRef: MutableRefObject<OfflineGameState>,
  callbacks: OfflineProgressCallbacks,
  beeContext: BeeContextValue | null
): boolean {
  if (timeElapsed <= MIN_OFFLINE_TIME_MS) {
    return false;
  }

  const state = gameStateRef.current;

  const offlineResult = calculateOfflineProgress(timeElapsed, {
    veggies: state.veggies,
    day: state.day,
    totalDaysElapsed: state.totalDaysElapsed,
    dayLength: 1000, // 1 second per day
    season: state.season,
    currentWeather: state.currentWeather,
    greenhouseOwned: state.greenhouseOwned,
    irrigationOwned: state.irrigationOwned,
    almanacLevel: state.almanacLevel,
    farmTier: state.farmTier,
    knowledge: state.knowledge,
    canningProcesses: [],
    canningUpgrades: {},
    autoCanning: { enabled: false },
    beeState: getBeeStateInput(beeContext),
  });

  if (offlineResult.timeElapsed >= MIN_OFFLINE_TIME_MS) {
    applyOfflineProgress(offlineResult, state.christmasEvent, callbacks, beeContext);
    return true;
  }

  return false;
}

/**
 * Hook that manages offline progress detection and processing.
 * 
 * Tracks when the player leaves and returns to the game tab using
 * the Page Visibility API, calculates what progress would have been
 * made during the offline period, and applies it to the game state.
 * 
 * @param gameStateRef - Ref containing the current game state
 * @param callbacks - Callbacks to update game state
 * @param beeContext - Optional bee system context for honey production
 * 
 * @example
 * ```tsx
 * const gameStateRef = useRef({ veggies, day, ... });
 * 
 * useOfflineProgress(gameStateRef, {
 *   setVeggies,
 *   setExperience,
 *   setKnowledge,
 *   setDay,
 *   setTotalDaysElapsed,
 *   onOfflineProgressProcessed: (result, timeAway) => {
 *     showToast(`Welcome back! You were away for ${timeAway}`);
 *   }
 * }, beeContext);
 * ```
 */
export function useOfflineProgress(
  gameStateRef: MutableRefObject<OfflineGameState>,
  callbacks: OfflineProgressCallbacks,
  beeContext: BeeContextValue | null = null
): void {
  // Track if we've processed offline progress this session
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    // When tab becomes visible, check for offline time and simulate progress
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Tab became visible
        const lastActiveTime = localStorage.getItem(LAST_ACTIVE_KEY);

        // Reset the flag so we can process offline progress again
        hasProcessedRef.current = false;

        if (lastActiveTime && !hasProcessedRef.current) {
          const now = Date.now();
          const timeElapsed = now - parseInt(lastActiveTime, 10);

          // Use requestIdleCallback or setTimeout to defer heavy offline progress calculation
          // This prevents blocking the UI when returning to the tab
          const processDeferred = () => {
            if (processOfflineTime(timeElapsed, gameStateRef, callbacks, beeContext)) {
              hasProcessedRef.current = true;
            }
          };

          if ('requestIdleCallback' in window) {
            (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(processDeferred);
          } else {
            // Fallback for browsers without requestIdleCallback
            setTimeout(processDeferred, 0);
          }
        }

        // Update last active time
        localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
      } else {
        // Tab became hidden - save the current time
        localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
      }
    };

    // Check on initial mount (in case user is returning after closing tab)
    const lastActiveTime = localStorage.getItem(LAST_ACTIVE_KEY);
    if (lastActiveTime) {
      const now = Date.now();
      const timeElapsed = now - parseInt(lastActiveTime, 10);
      processOfflineTime(timeElapsed, gameStateRef, callbacks, beeContext);
    }

    // Set current time
    localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Also update time periodically while tab is active
    const updateInterval = setInterval(() => {
      if (!document.hidden) {
        localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
      }
    }, ACTIVE_UPDATE_INTERVAL_MS);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(updateInterval);
    };
  }, []); // Run only once on mount
}

export default useOfflineProgress;
