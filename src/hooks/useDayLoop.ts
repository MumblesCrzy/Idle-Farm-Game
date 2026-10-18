import { useRef, useEffect, type Dispatch, type SetStateAction, type MutableRefObject } from 'react';
import { useGameTick } from './useGameClock';
import { useDeferredEffects } from './useDeferredEffects';
import { MERCHANT_DAYS } from '../config/gameConstants';
import type { UseChristmasEventReturn } from './useChristmasEvent';
import type { UsePumpkinEventReturn } from './usePumpkinEvent';
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

  // Latest Pumpkin Rush state
  pumpkinEventRef: MutableRefObject<UsePumpkinEventReturn | null | undefined>;

  // Latest pause state; nothing advances while paused
  isPausedRef: MutableRefObject<boolean>;

  // Sell handler, used for the merchant's automatic sale
  handleSell: (isAutoSell?: boolean) => void;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * Hook that runs the core game day loop.
 *
 * Once per second, unless the game is paused:
 *
 * **Day Progression:**
 * - Advances the current day (1-365 cycle) and the total day count
 * - Advances the auto-purchase timer
 *
 * **Auto-Sell System:**
 * - Triggers the merchant's sale every MERCHANT_DAYS days when auto-sell is owned
 *
 * **Christmas Event Integration:**
 * - Grows Christmas trees and pays out passive Holiday Cheer
 * - Grows pumpkins, counts down to the County Fair and pays out Hayride Candy Corn
 * - Runs Elves' Bench crafting (separate loop)
 *
 * Both run on the game clock (useGameTick), which pauses while the tab is
 * hidden; the offline catch-up covers that time.
 */
export function useDayLoop(deps: UseDayLoopDependencies): void {
  const {
    setDay,
    setTotalDaysElapsed,
    setGlobalAutoPurchaseTimer,
    autoSellOwnedRef,
    christmasEventRef,
    pumpkinEventRef,
    isPausedRef,
    handleSell
  } = deps;

  // Runs work recorded by state updaters once their result is committed
  const scheduleAfterCommit = useDeferredEffects();

  // Keep a ref to handleSell to avoid restarting the interval when it changes
  const handleSellRef = useRef(handleSell);

  useEffect(() => {
    handleSellRef.current = handleSell;
  }, [handleSell]);

  // Main day loop - one game step per second
  useGameTick(() => {
    // Skip all processing while game is paused
    if (isPausedRef.current) return;

    setTotalDaysElapsed((total: number) => total + 1);

    const tick = {};
    setDay((d: number) => {
      const newDay = (d % 365) + 1; // Day cycles from 1-365, not 0-364

      // Merchant auto-sale every MERCHANT_DAYS, run after the new day is committed
      scheduleAfterCommit(tick, autoSellOwnedRef.current && newDay % MERCHANT_DAYS === 0
        ? () => handleSellRef.current(true) // true = auto-sell
        : undefined);

      return newDay;
    });

    // Increment auto-purchase timer each day
    setGlobalAutoPurchaseTimer((prevTimer: number) => prevTimer + 1);

    // Process Christmas tree growth each day
    if (christmasEventRef.current?.isEventActive) {
      christmasEventRef.current.processTreeGrowth();
      christmasEventRef.current.updatePassiveIncome(1000); // 1000ms = 1 second
    }

    // Grow pumpkins and count down to the fair each day
    if (pumpkinEventRef.current?.isEventActive) {
      pumpkinEventRef.current.processPumpkinGrowth();
      pumpkinEventRef.current.updatePassiveIncome(1000);
    }
  }, { order: 30 });

  // Elves' Bench automation loop - runs every second
  useGameTick(() => {
    if (isPausedRef.current) return;
    if (christmasEventRef.current?.isEventActive) {
      const elvesBenchOwned = christmasEventRef.current.eventState.upgrades.find(
        (u: EventUpgrade) => u.id === 'elves_bench'
      )?.owned ?? false;

      if (elvesBenchOwned) {
        christmasEventRef.current.processDailyElvesCrafting();
      }
    }
    // The Scarecrow Crew checks for itself whether it has been hired
    if (pumpkinEventRef.current?.isEventActive) {
      pumpkinEventRef.current.processScarecrowCrew();
    }
  }, { order: 40 });
}
