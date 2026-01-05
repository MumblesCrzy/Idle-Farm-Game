/**
 * useAutoSave Hook
 * 
 * Manages automatic game saving with throttling to prevent excessive writes.
 * Saves game state at most once every 30 seconds, and ensures data is saved
 * before the page unloads.
 * 
 * @module hooks/useAutoSave
 */

import { useCallback, useEffect, useRef } from 'react';
import { saveGameStateWithCanning, type ExtendedGameState } from '../utils/saveSystem';

/** Minimum time between saves in milliseconds */
const SAVE_THROTTLE_MS = 30000;

/**
 * Configuration for the auto-save hook.
 */
export interface UseAutoSaveConfig {
  /** Whether to skip saving (e.g., after import or reset) */
  skipSave: boolean;
  /** Function to build the current game state for saving */
  getGameState: () => ExtendedGameState | null;
}

/**
 * Return type for the useAutoSave hook.
 */
export interface UseAutoSaveReturn {
  /** Manually trigger an immediate save */
  forceSave: () => void;
  /** Mark that there are pending changes to save */
  markPendingChanges: () => void;
}

/**
 * Hook that manages automatic game state persistence.
 * 
 * Features:
 * - Throttles saves to at most once every 30 seconds
 * - Saves immediately if 30+ seconds have passed since last save
 * - Schedules deferred saves when changes occur within throttle window
 * - Saves on page unload to prevent data loss
 * - Skips saving during import/reset operations
 * 
 * @param config - Configuration for the auto-save behavior
 * @returns Object with forceSave and markPendingChanges functions
 * 
 * @example
 * ```tsx
 * const { forceSave } = useAutoSave({
 *   skipSave: justReset || justImported,
 *   getGameState: () => ({
 *     veggies,
 *     money,
 *     experience,
 *     // ... other state
 *   }),
 * });
 * 
 * // Force save before navigating away
 * const handleExport = () => {
 *   forceSave();
 *   // ... export logic
 * };
 * ```
 */
export function useAutoSave(config: UseAutoSaveConfig): UseAutoSaveReturn {
  const { skipSave, getGameState } = config;

  // Refs for tracking save timing
  const saveTimeoutRef = useRef<number | null>(null);
  const lastSaveTimeRef = useRef<number>(Date.now());
  const pendingSaveRef = useRef<boolean>(false);

  /**
   * Performs the actual save operation.
   * Respects the skipSave flag and updates timing refs.
   */
  const performSave = useCallback(() => {
    if (skipSave) {
      return;
    }

    const gameState = getGameState();
    if (gameState) {
      saveGameStateWithCanning(gameState);
      lastSaveTimeRef.current = Date.now();
      pendingSaveRef.current = false;
    }
  }, [skipSave, getGameState]);

  /**
   * Schedules or immediately executes a save based on throttle timing.
   */
  const scheduleSave = useCallback(() => {
    const now = Date.now();
    const timeSinceLastSave = now - lastSaveTimeRef.current;

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    // If it's been more than SAVE_THROTTLE_MS since last save, save immediately
    if (timeSinceLastSave >= SAVE_THROTTLE_MS) {
      performSave();
    } else {
      // Otherwise, schedule a save for SAVE_THROTTLE_MS from last save
      const timeUntilNextSave = SAVE_THROTTLE_MS - timeSinceLastSave;
      saveTimeoutRef.current = window.setTimeout(() => {
        performSave();
      }, timeUntilNextSave);
    }
  }, [performSave]);

  /**
   * Mark that there are pending changes that need to be saved.
   */
  const markPendingChanges = useCallback(() => {
    pendingSaveRef.current = true;
  }, []);

  /**
   * Force an immediate save, bypassing throttle.
   */
  const forceSave = useCallback(() => {
    // Clear any scheduled save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    performSave();
  }, [performSave]);

  // Trigger save scheduling when performSave changes (which happens when dependencies change)
  useEffect(() => {
    scheduleSave();
  }, [scheduleSave]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Force save on page unload (refresh/close)
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Force immediate save if there are pending changes or enough time has passed
      if (pendingSaveRef.current || Date.now() - lastSaveTimeRef.current >= SAVE_THROTTLE_MS) {
        performSave();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [performSave]);

  return {
    forceSave,
    markPendingChanges,
  };
}

export default useAutoSave;
