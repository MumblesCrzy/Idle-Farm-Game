import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook that uses requestAnimationFrame for game loops.
 * More reliable than setInterval in Chrome and other browsers.
 * 
 * @param callback - Function to call on each tick
 * @param intervalMs - Target interval in milliseconds (e.g., 1000 for 1 second)
 * @param dependencies - Dependencies array to restart the loop when changed
 */
export function useGameLoop(
  callback: () => void,
  intervalMs: number,
  dependencies: React.DependencyList = []
): void {
  const requestRef = useRef<number | undefined>(undefined);
  const previousTimeRef = useRef<number | undefined>(undefined);
  const callbackRef = useRef(callback);

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const animate = useCallback((time: number) => {
    if (previousTimeRef.current !== undefined) {
      const deltaTime = time - previousTimeRef.current;
      
      // Only execute if enough time has passed
      if (deltaTime >= intervalMs) {
        callbackRef.current();
        previousTimeRef.current = time;
      }
    } else {
      previousTimeRef.current = time;
    }

    // Continue the loop
    requestRef.current = requestAnimationFrame(animate);
  }, [intervalMs]);

  useEffect(() => {
    // Start the animation loop
    requestRef.current = requestAnimationFrame(animate);
    
    // Cleanup
    return () => {
      if (requestRef.current !== undefined) {
        cancelAnimationFrame(requestRef.current);
      }
      previousTimeRef.current = undefined;
    };
  }, [animate, ...dependencies]); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * setInterval-based loop for timers that should tick at a steady rate.
 *
 * Ticks are skipped while the tab is hidden, the same as the requestAnimationFrame
 * loops. GameProvider simulates the hidden time once when the player returns, so
 * nothing is counted twice.
 */
export function useRobustInterval(
  callback: () => void,
  intervalMs: number,
  dependencies: React.DependencyList = []
): void {
  const callbackRef = useRef(callback);

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.hidden) return;
      callbackRef.current();
    }, intervalMs);

    // Force immediate tick
    callbackRef.current();

    return () => {
      clearInterval(intervalId);
    };
  }, [intervalMs, ...dependencies]); // eslint-disable-line react-hooks/exhaustive-deps
}
