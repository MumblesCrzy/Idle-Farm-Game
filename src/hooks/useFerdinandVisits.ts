/**
 * Runs Ferdinand's visits for committed Merchants, one game step at a time. Game steps stop
 * while the game is paused or the tab is hidden, so he waits then, a running Hot Tip waits
 * with him, and he never visits offline. The rules live in utils/ferdinand.ts.
 */
import { useCallback, useRef, useState } from 'react';
import { useGameTick } from './useGameClock';
import { useLatestRef } from './useLatestRef';
import { arriveFerdinand, nextFerdinandDelay, stepFerdinand, type FerdinandVisit } from '../utils/ferdinand';

export interface UseFerdinandVisitsOptions {
  /** Whether he visits at all: committed Merchants only */
  active: boolean;
  isPaused: boolean;
  /** Whether a Hot Tip is running, so it counts down on game steps */
  hotTipRunning: boolean;
  /** He was clicked: start a Hot Tip */
  onHotTip: () => void;
  /** One game step of the running Hot Tip has passed */
  onHotTipStep: () => void;
  /** He arrived */
  onArrive?: () => void;
  /** He wandered off without a click */
  onWanderOff?: () => void;
  random?: () => number;
}

export interface UseFerdinandVisitsResult {
  /** The visit on screen, if any */
  visit: FerdinandVisit | null;
  /** Clicks him for a Hot Tip; false when he isn't there */
  hotTip: () => boolean;
}

export function useFerdinandVisits({
  active,
  isPaused,
  hotTipRunning,
  onHotTip,
  onHotTipStep,
  onArrive,
  onWanderOff,
  random = Math.random
}: UseFerdinandVisitsOptions): UseFerdinandVisitsResult {
  const [visit, setVisitState] = useState<FerdinandVisit | null>(null);
  const [firstDelay] = useState(() => nextFerdinandDelay(random));
  // The step callbacks read and write these between renders
  const visitRef = useRef(visit);
  const untilNextRef = useRef(firstDelay);

  const activeRef = useLatestRef(active);
  const pausedRef = useLatestRef(isPaused);
  const hotTipRunningRef = useLatestRef(hotTipRunning);
  const onHotTipRef = useLatestRef(onHotTip);
  const onHotTipStepRef = useLatestRef(onHotTipStep);
  const onArriveRef = useLatestRef(onArrive);
  const onWanderOffRef = useLatestRef(onWanderOff);
  const randomRef = useLatestRef(random);

  const setVisit = useCallback((next: FerdinandVisit | null) => {
    visitRef.current = next;
    setVisitState(next);
  }, []);

  useGameTick(() => {
    if (!activeRef.current) {
      // Left the guild (a dev reset): he goes with it
      if (visitRef.current) setVisit(null);
      return;
    }
    if (pausedRef.current) return;

    if (hotTipRunningRef.current) onHotTipStepRef.current();

    const current = visitRef.current;
    if (!current) {
      untilNextRef.current -= 1;
      if (untilNextRef.current <= 0) {
        setVisit(arriveFerdinand(randomRef.current));
        onArriveRef.current?.();
      }
      return;
    }

    const next = stepFerdinand(current);
    if (next === null) {
      untilNextRef.current = nextFerdinandDelay(randomRef.current);
      onWanderOffRef.current?.();
    }
    setVisit(next);
  }, { order: 77 });

  const hotTip = useCallback((): boolean => {
    if (!visitRef.current || !activeRef.current) return false;
    setVisit(null);
    untilNextRef.current = nextFerdinandDelay(randomRef.current);
    onHotTipRef.current();
    return true;
  }, [activeRef, onHotTipRef, randomRef, setVisit]);

  return { visit: active ? visit : null, hotTip };
}
