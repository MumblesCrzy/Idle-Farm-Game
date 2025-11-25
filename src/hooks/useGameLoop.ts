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
 * Alternative: Hybrid approach that uses setInterval with Page Visibility API
 * to prevent Chrome throttling. Falls back to keeping tab "active".
 * This is more reliable for background tabs than requestAnimationFrame.
 */
export function useRobustInterval(
  callback: () => void,
  intervalMs: number,
  dependencies: React.DependencyList = []
): void {
  const intervalRef = useRef<number | undefined>(undefined);
  const callbackRef = useRef(callback);
  const lastTickRef = useRef<number>(Date.now());

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    // Track visibility
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // If tab becomes visible again, check how much time passed and catch up
        const now = Date.now();
        const timePassed = now - lastTickRef.current;
        const missedTicks = Math.floor(timePassed / intervalMs);
        
        // Execute missed ticks (up to a reasonable limit to avoid hanging)
        const catchUpLimit = Math.min(missedTicks, 60); // Max 60 ticks catch-up
        for (let i = 0; i < catchUpLimit; i++) {
          callbackRef.current();
        }
        
        lastTickRef.current = now;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Start the interval
    intervalRef.current = window.setInterval(() => {
      callbackRef.current();
      lastTickRef.current = Date.now();
    }, intervalMs);

    // Force immediate tick
    callbackRef.current();
    lastTickRef.current = Date.now();

    // Cleanup
    return () => {
      if (intervalRef.current !== undefined) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [intervalMs, ...dependencies]); // eslint-disable-line react-hooks/exhaustive-deps
}
