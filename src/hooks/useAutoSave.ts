import { useCallback, useEffect, useRef } from 'react';
import { saveGameStateWithCanning, type ExtendedGameState } from '../utils/saveSystem';
import { AUTO_SAVE_INTERVAL } from '../config/gameConstants';
import { useLatestRef } from './useLatestRef';

/**
 * Configuration for the auto-save hook
 */
export interface UseAutoSaveConfig {
  /** When true, saving is skipped (for example while a reset is settling) */
  skipSave: boolean;
  /** Builds the full save, or returns null when there is nothing to save yet */
  getGameState: () => ExtendedGameState | null;
}

/**
 * Return type for the auto-save hook
 */
export interface UseAutoSaveReturn {
  /** Saves immediately and cancels any scheduled save */
  forceSave: () => void;
}

/**
 * Saves the game to localStorage.
 *
 * - Saves at most once every AUTO_SAVE_INTERVAL (30 seconds). Each state change
 *   either saves right away, if that long has passed, or schedules a save for
 *   when it has.
 * - Always saves when the page unloads (refresh or close), so the last moments
 *   of play aren't lost to the throttle.
 *
 * getGameState should change whenever the game state changes (a useCallback
 * over that state); each change reschedules the save.
 *
 * @param config - Save configuration
 * @returns forceSave for an immediate save
 */
export function useAutoSave(config: UseAutoSaveConfig): UseAutoSaveReturn {
  const { skipSave, getGameState } = config;

  const saveTimeoutRef = useRef<number | null>(null);
  const lastSaveTimeRef = useRef<number>(Date.now());

  const performSave = useCallback(() => {
    if (skipSave) return;
    const gameState = getGameState();
    if (!gameState) return;
    saveGameStateWithCanning(gameState);
    lastSaveTimeRef.current = Date.now();
  }, [skipSave, getGameState]);

  const forceSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    performSave();
  }, [performSave]);

  // Throttled save: runs whenever performSave changes, which is whenever state changes
  useEffect(() => {
    const timeSinceLastSave = Date.now() - lastSaveTimeRef.current;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    if (timeSinceLastSave >= AUTO_SAVE_INTERVAL) {
      performSave();
    } else {
      saveTimeoutRef.current = window.setTimeout(performSave, AUTO_SAVE_INTERVAL - timeSinceLastSave);
    }
  }, [performSave]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Always save on page unload (refresh/close)
  const performSaveRef = useLatestRef(performSave);
  useEffect(() => {
    const handleBeforeUnload = () => performSaveRef.current();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [performSaveRef]);

  return { forceSave };
}

export default useAutoSave;
