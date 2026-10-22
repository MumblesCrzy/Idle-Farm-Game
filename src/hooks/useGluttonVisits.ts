/**
 * Runs Dunkin's visits for committed Preservers, one game step at a time. Game steps stop
 * while the game is paused or the tab is hidden, so he waits then, and he never visits
 * offline. The rules live in utils/glutton.ts.
 */
import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useGameTick } from './useGameClock';
import { useLatestRef } from './useLatestRef';
import {
  arrive,
  arriveStuffed,
  nextVisitDelay,
  shooOutcome,
  stepVisit,
  type GluttonOutcome,
  type GluttonVisit
} from '../utils/glutton';

interface Crop {
  name: string;
  stash: number;
}

export interface UseGluttonVisitsOptions<T extends Crop> {
  /** Whether he visits at all: committed Preservers only */
  active: boolean;
  isPaused: boolean;
  /** Pantry Lock keeps him out of the stash */
  pantryLocked: boolean;
  /** What a stuffed Dunkin had eaten, when the save kept one */
  savedStuffed?: Record<string, number>;
  crops: T[];
  setCrops: Dispatch<SetStateAction<T[]>>;
  money: number;
  /** He ate his fill and won't leave */
  onStuffed: (eaten: Record<string, number>) => void;
  /** He was clicked away: pay the Wax Seals and any vet bill */
  onShoo: (outcome: GluttonOutcome) => void;
  random?: () => number;
}

export interface UseGluttonVisitsResult {
  /** The visit on screen, if any */
  visit: GluttonVisit | null;
  /** Clicks him away; returns what that did, or null when he isn't there */
  shoo: () => GluttonOutcome | null;
}

export function useGluttonVisits<T extends Crop>({
  active,
  isPaused,
  pantryLocked,
  savedStuffed,
  crops,
  setCrops,
  money,
  onStuffed,
  onShoo,
  random = Math.random
}: UseGluttonVisitsOptions<T>): UseGluttonVisitsResult {
  const [visit, setVisitState] = useState<GluttonVisit | null>(() => (
    active && savedStuffed ? arriveStuffed(savedStuffed, random) : null
  ));
  const [firstDelay] = useState(() => nextVisitDelay(random));
  // The step callbacks read and write these between renders
  const visitRef = useRef(visit);
  const untilNextRef = useRef(firstDelay);

  const activeRef = useLatestRef(active);
  const pausedRef = useLatestRef(isPaused);
  const pantryLockedRef = useLatestRef(pantryLocked);
  const cropsRef = useLatestRef(crops);
  const moneyRef = useLatestRef(money);
  const onStuffedRef = useLatestRef(onStuffed);
  const onShooRef = useLatestRef(onShoo);
  const randomRef = useLatestRef(random);

  const setVisit = useCallback((next: GluttonVisit | null) => {
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

    const current = visitRef.current;
    if (!current) {
      untilNextRef.current -= 1;
      if (untilNextRef.current <= 0) setVisit(arrive(randomRef.current));
      return;
    }

    const { visit: next, bite } = stepVisit(current, {
      pantryLocked: pantryLockedRef.current,
      crops: cropsRef.current,
      random: randomRef.current
    });
    if (bite) {
      setCrops(prev => prev.map(crop => (
        crop.name === bite.name ? { ...crop, stash: Math.max(0, crop.stash - bite.amount) } : crop
      )));
    }
    if (next === null) {
      untilNextRef.current = nextVisitDelay(randomRef.current);
    } else if (next.stage === 'stuffed' && current.stage !== 'stuffed') {
      onStuffedRef.current(next.eaten);
    }
    if (next !== current) setVisit(next);
  }, { order: 75 });

  const shoo = useCallback((): GluttonOutcome | null => {
    const current = visitRef.current;
    if (!current || !activeRef.current) return null;
    const outcome = shooOutcome(current, moneyRef.current);
    setVisit(null);
    untilNextRef.current = nextVisitDelay(randomRef.current);
    onShooRef.current(outcome);
    return outcome;
  }, [activeRef, moneyRef, onShooRef, randomRef, setVisit]);

  return { visit: active ? visit : null, shoo };
}
