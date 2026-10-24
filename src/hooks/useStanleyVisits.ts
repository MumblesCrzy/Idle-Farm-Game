/**
 * Runs Stanley's visits for committed Engineers, one game step at a time. Game steps stop
 * while the game is paused or the tab is hidden, so he waits then, a running Tune-Up waits
 * with him, and he never visits offline. The rules live in utils/stanley.ts.
 */
import { useCallback, useRef, useState } from 'react';
import { useGameTick } from './useGameClock';
import { useLatestRef } from './useLatestRef';
import { arriveStanley, nextStanleyDelay, stepStanley, type StanleyVisit } from '../utils/stanley';

export interface UseStanleyVisitsOptions {
  /** Whether he visits at all: committed Engineers only */
  active: boolean;
  isPaused: boolean;
  /** Whether a Tune-Up is running, so it counts down on game steps */
  tuneUpRunning: boolean;
  /** He was clicked: pay the Gears and start a Tune-Up */
  onTuneUp: () => void;
  /** One game step of the running Tune-Up has passed */
  onTuneUpStep: () => void;
  /** He arrived */
  onArrive?: () => void;
  /** He wandered off without a click */
  onWanderOff?: () => void;
  random?: () => number;
}

export interface UseStanleyVisitsResult {
  /** The visit on screen, if any */
  visit: StanleyVisit | null;
  /** Clicks him for a Tune-Up; false when he isn't there */
  tuneUp: () => boolean;
}

export function useStanleyVisits({
  active,
  isPaused,
  tuneUpRunning,
  onTuneUp,
  onTuneUpStep,
  onArrive,
  onWanderOff,
  random = Math.random
}: UseStanleyVisitsOptions): UseStanleyVisitsResult {
  const [visit, setVisitState] = useState<StanleyVisit | null>(null);
  const [firstDelay] = useState(() => nextStanleyDelay(random));
  // The step callbacks read and write these between renders
  const visitRef = useRef(visit);
  const untilNextRef = useRef(firstDelay);

  const activeRef = useLatestRef(active);
  const pausedRef = useLatestRef(isPaused);
  const tuneUpRunningRef = useLatestRef(tuneUpRunning);
  const onTuneUpRef = useLatestRef(onTuneUp);
  const onTuneUpStepRef = useLatestRef(onTuneUpStep);
  const onArriveRef = useLatestRef(onArrive);
  const onWanderOffRef = useLatestRef(onWanderOff);
  const randomRef = useLatestRef(random);

  const setVisit = useCallback((next: StanleyVisit | null) => {
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

    if (tuneUpRunningRef.current) onTuneUpStepRef.current();

    const current = visitRef.current;
    if (!current) {
      untilNextRef.current -= 1;
      if (untilNextRef.current <= 0) {
        setVisit(arriveStanley(randomRef.current));
        onArriveRef.current?.();
      }
      return;
    }

    const next = stepStanley(current);
    if (next === null) {
      untilNextRef.current = nextStanleyDelay(randomRef.current);
      onWanderOffRef.current?.();
    }
    setVisit(next);
  }, { order: 76 });

  const tuneUp = useCallback((): boolean => {
    if (!visitRef.current || !activeRef.current) return false;
    setVisit(null);
    untilNextRef.current = nextStanleyDelay(randomRef.current);
    onTuneUpRef.current();
    return true;
  }, [activeRef, onTuneUpRef, randomRef, setVisit]);

  return { visit: active ? visit : null, tuneUp };
}
