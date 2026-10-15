import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { GameClock } from '../utils/gameClock';
import { useLatestRef } from './useLatestRef';

export interface GameTickOptions {
  /** Run on every Nth step (default 1) */
  every?: number;
  /** Lower runs first within a step (default 100) */
  order?: number;
}

const GameClockContext = createContext<GameClock | null>(null);

/**
 * Owns the game clock and starts it on mount.
 * Must sit above GameProvider, which subscribes the crop and day systems.
 */
export function GameClockProvider({ children }: { children: ReactNode }) {
  const [clock] = useState(() => new GameClock());

  useEffect(() => {
    clock.start();
    return () => clock.stop();
  }, [clock]);

  return <GameClockContext.Provider value={clock}>{children}</GameClockContext.Provider>;
}

/**
 * Runs callback on each game step (or every Nth step).
 * The latest callback always runs, so it can read current props and state
 * without restarting anything. Outside a GameClockProvider it never runs.
 *
 * @param callback - Work to do on each step
 * @param options - every: run on every Nth step; order: lower runs first within a step
 */
export function useGameTick(callback: () => void, options: GameTickOptions = {}): void {
  const clock = useContext(GameClockContext);
  const callbackRef = useLatestRef(callback);
  const every = Math.max(1, options.every ?? 1);
  const order = options.order ?? 100;

  useEffect(() => {
    if (!clock) return;
    return clock.subscribe({ callbackRef, every, order });
  }, [clock, callbackRef, every, order]);
}
