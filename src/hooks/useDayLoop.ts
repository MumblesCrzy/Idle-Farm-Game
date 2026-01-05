import { useRef, useEffect, type Dispatch, type SetStateAction, type MutableRefObject } from 'react';
import { useRobustInterval } from './useGameLoop';
import { MERCHANT_DAYS } from '../config/gameConstants';
import type { UseChristmasEventReturn } from './useChristmasEvent';
import type { EventUpgrade } from '../types/christmasEvent';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Dependencies required by the useDayLoop hook
 */
export interface UseDayLoopDependencies {
  // State setters for day management
  setDay: Dispatch<SetStateAction<number>>;
  setTotalDaysElapsed: Dispatch<SetStateAction<number>>;
  setGlobalAutoPurchaseTimer: Dispatch<SetStateAction<number>>;
  
  // Ref to latest auto-sell owned state (to avoid loop restart)
  autoSellOwnedRef: MutableRefObject<boolean>;
  
  // Ref to latest Christmas event state (to avoid loop restart)
  christmasEventRef: MutableRefObject<UseChristmasEventReturn | null | undefined>;
  
  // Sell handler function
  handleSell: (isAutoSell?: boolean) => void;
}

/**
 * Return type for the useDayLoop hook
 */
export interface UseDayLoopReturn {
  // Expose the handleSellRef for external access if needed
  handleSellRef: MutableRefObject<(isAutoSell?: boolean) => void>;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * Hook that manages the core game day loop
 * 
 * This hook handles the passage of time in the game, including:
 * 
 * **Day Progression:**
 * - Increments the current day (1-365 cycle)
 * - Tracks total days elapsed across all time
 * - Updates the auto-purchase timer
 * 
 * **Auto-Sell System:**
 * - Triggers automatic merchant sales every MERCHANT_DAYS (30 days)
 * - Only active when auto-sell is owned
 * 
 * **Christmas Event Integration:**
 * - Processes Christmas tree growth
 * - Updates passive income from holiday decorations
 * - Processes Elves' Bench automated crafting
 * 
 * The hook uses `useRobustInterval` for better background tab support,
 * ensuring the game continues progressing even when the tab is inactive.
 * 
 * @example
 * ```tsx
 * // In GameProvider:
 * const autoSellOwnedRef = useLatestRef(autoSellOwned);
 * const christmasEventRef = useLatestRef(christmasEvent);
 * 
 * useDayLoop({
 *   setDay,
 *   setTotalDaysElapsed,
 *   setGlobalAutoPurchaseTimer,
 *   autoSellOwnedRef,
 *   christmasEventRef,
 *   handleSell
 * });
 * ```
 */
export function useDayLoop(deps: UseDayLoopDependencies): UseDayLoopReturn {
  const {
    setDay,
    setTotalDaysElapsed,
    setGlobalAutoPurchaseTimer,
    autoSellOwnedRef,
    christmasEventRef,
    handleSell
  } = deps;

  // Keep a ref to handleSell to avoid restarting the interval when it changes
  const handleSellRef = useRef(handleSell);

  // Update the ref when handleSell changes
  useEffect(() => {
    handleSellRef.current = handleSell;
  }, [handleSell]);

  // Main day loop - runs every second (1000ms)
  useRobustInterval(() => {
    // Increment total days elapsed (lifetime stat)
    setTotalDaysElapsed((total: number) => total + 1);
    
    // Update current day with year cycle (1-365)
    setDay((d: number) => {
      const newDay = (d % 365) + 1; // Day cycles from 1-365, not 0-364
      
      // Auto-sell logic for merchant (every MERCHANT_DAYS)
      if (autoSellOwnedRef.current && newDay % MERCHANT_DAYS === 0) {
        // Trigger auto-sell using the handleSell function
        // Small delay to ensure state is updated before selling
        setTimeout(() => {
          handleSellRef.current(true); // true = auto-sell
        }, 100);
      }
      
      // Increment auto-purchase timer each day
      setGlobalAutoPurchaseTimer((prevTimer: number) => prevTimer + 1);
      
      return newDay;
    });
    
    // Process Christmas tree growth each day
    if (christmasEventRef.current?.isEventActive) {
      christmasEventRef.current.processTreeGrowth();
      christmasEventRef.current.updatePassiveIncome(1000); // 1000ms = 1 second
    }
  }, 1000, []); // Empty deps - refs prevent loop restart

  // Elves' Bench automation loop - runs every second
  // Separated from main loop to allow independent timing if needed in future
  useRobustInterval(() => {
    if (christmasEventRef.current?.isEventActive) {
      const elvesBenchOwned = christmasEventRef.current.eventState.upgrades.find(
        (u: EventUpgrade) => u.id === 'elves_bench'
      )?.owned ?? false;
      
      if (elvesBenchOwned) {
        christmasEventRef.current.processDailyElvesCrafting();
      }
    }
  }, 1000, []); // Empty deps - refs prevent loop restart

  return {
    handleSellRef
  };
}
