import { useRef, useEffect, type Dispatch, type SetStateAction, type MutableRefObject } from 'react';
import { useRobustInterval } from './useGameLoop';
import { MERCHANT_DAYS } from '../config/gameConstants';
import type { UseChristmasEventReturn } from './useChristmasEvent';
import type { EventUpgrade } from '../types/christmasEvent';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Dependencies required by the useDayLoop hook.
 * Values that change often come in as refs, so the loops never restart.
 */
export interface UseDayLoopDependencies {
  // State setters for day management
  setDay: Dispatch<SetStateAction<number>>;
  setTotalDaysElapsed: Dispatch<SetStateAction<number>>;
  setGlobalAutoPurchaseTimer: Dispatch<SetStateAction<number>>;

  // Latest auto-sell owned state
  autoSellOwnedRef: MutableRefObject<boolean>;

  // Latest Christmas event state
  christmasEventRef: MutableRefObject<UseChristmasEventReturn | null | undefined>;

  // Latest pause state; nothing advances while paused
  isPausedRef: MutableRefObject<boolean>;

  // Latest lifetime-ended state; nothing advances once the lifetime is over
  offlinePrestigePendingRef: MutableRefObject<boolean>;

  // Lifetime length in days; totalDaysElapsed never goes past it
  lifetimeMaxDaysRef: MutableRefObject<number>;

  // Sell handler, used for the merchant's automatic sale
  handleSell: (isAutoSell?: boolean) => void;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * Hook that runs the core game day loop.
 *
 * Once per second, unless the game is paused or the lifetime has ended:
 *
 * **Day Progression:**
 * - Advances the current day (1-365 cycle) and the lifetime day count,
 *   which stops at the lifetime length. GameProvider's lifetime-end effect
 *   watches that count and ends the lifetime.
 * - Advances the auto-purchase timer
 *
 * **Auto-Sell System:**
 * - Triggers the merchant's sale every MERCHANT_DAYS days when auto-sell is owned
 *
 * **Christmas Event Integration:**
 * - Grows Christmas trees and pays out passive Holiday Cheer
 * - Runs Elves' Bench crafting (separate loop)
 *
 * Both loops use `useRobustInterval`, which pauses while the tab is hidden;
 * the offline catch-up covers that time.
 */
export function useDayLoop(deps: UseDayLoopDependencies): void {
  const {
    setDay,
    setTotalDaysElapsed,
    setGlobalAutoPurchaseTimer,
    autoSellOwnedRef,
    christmasEventRef,
    isPausedRef,
    offlinePrestigePendingRef,
    lifetimeMaxDaysRef,
    handleSell
  } = deps;

  // Keep a ref to handleSell to avoid restarting the interval when it changes
  const handleSellRef = useRef(handleSell);

  useEffect(() => {
    handleSellRef.current = handleSell;
  }, [handleSell]);

  // Main day loop - runs every second (1000ms)
  useRobustInterval(() => {
    // Skip all processing while game is paused
    if (isPausedRef.current) return;
    // Skip all day progression if lifetime has already ended (prestige pending)
    if (offlinePrestigePendingRef.current) return;

    // Clamp totalDaysElapsed to the lifetime boundary. The lifetime-end effect in
    // GameProvider watches totalDaysElapsed and sets the prestige-pending flag;
    // reading a flag back out of this updater would be unreliable under batching.
    setTotalDaysElapsed((total: number) => {
      const maxDays = lifetimeMaxDaysRef.current;
      if (total >= maxDays) return maxDays;
      const next = total + 1;
      return next >= maxDays ? maxDays : next;
    });

    setDay((d: number) => {
      const newDay = (d % 365) + 1; // Day cycles from 1-365, not 0-364

      // Auto-sell logic for merchant (every MERCHANT_DAYS)
      if (autoSellOwnedRef.current && newDay % MERCHANT_DAYS === 0) {
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
  useRobustInterval(() => {
    if (isPausedRef.current) return;
    if (offlinePrestigePendingRef.current) return;
    if (christmasEventRef.current?.isEventActive) {
      const elvesBenchOwned = christmasEventRef.current.eventState.upgrades.find(
        (u: EventUpgrade) => u.id === 'elves_bench'
      )?.owned ?? false;

      if (elvesBenchOwned) {
        christmasEventRef.current.processDailyElvesCrafting();
      }
    }
  }, 1000, []); // Empty deps - refs prevent loop restart
}
