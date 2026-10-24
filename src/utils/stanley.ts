/**
 * Stanley, the Engineers' fluffy cream cat. These are the rules for his visits and his
 * Tune-Up; useStanleyVisits runs them on game steps, so he waits while the game is paused or
 * the tab is hidden, and never visits offline.
 *
 * A visit: he shows up at a random spot and waits 20 seconds, then wanders off. Clicking him
 * pays 5 Gears and starts a Tune-Up: for 60 seconds, 90 with Overclock, every machine runs
 * twice as fast. Missing him costs nothing. The Tune-Up counts down on game steps too.
 */
import type { GuildState, StanleyRecord } from '../types/guilds';
import { getUpgradeLevel, isEngineer } from './guildCalculations';

/** His name, in toasts, the event log and achievements */
export const STANLEY_NAME = 'Stanley';

/** Game steps from loading, joining or his last visit to the next visit, chosen at random in this range */
export const STANLEY_VISIT_GAP: readonly [number, number] = [180, 360];
/** Game steps he waits to be clicked before he wanders off */
export const STANLEY_WAIT_STEPS = 20;
/** Gears for each Tune-Up */
export const STANLEY_GEARS = 5;
/** Game steps a Tune-Up lasts */
export const TUNE_UP_STEPS = 60;
/** Game steps a Tune-Up lasts with Overclock */
export const OVERCLOCK_TUNE_UP_STEPS = 90;
/** How much faster every machine runs during a Tune-Up */
export const TUNE_UP_SPEED = 2;

/** One visit in progress */
export interface StanleyVisit {
  /** Game steps since he arrived */
  steps: number;
  /** Where he sits, as shares of the window's width and height */
  x: number;
  y: number;
}

type Random = () => number;

/** Game steps until the next visit */
export function nextStanleyDelay(random: Random = Math.random): number {
  const [min, max] = STANLEY_VISIT_GAP;
  return Math.round(min + random() * (max - min));
}

/** A new visit at a random spot, clear of the window's edges */
export function arriveStanley(random: Random = Math.random): StanleyVisit {
  return { steps: 0, x: 0.1 + random() * 0.75, y: 0.15 + random() * 0.6 };
}

/** One game step of a visit: the visit after it, or null when he wanders off */
export function stepStanley(visit: StanleyVisit): StanleyVisit | null {
  const steps = visit.steps + 1;
  return steps >= STANLEY_WAIT_STEPS ? null : { ...visit, steps };
}

/** Seconds before he wanders off */
export function stanleyWaitLeft(visit: StanleyVisit): number {
  return Math.max(0, STANLEY_WAIT_STEPS - visit.steps);
}

/** Game steps a Tune-Up lasts for this player: 60, or 90 with Overclock */
export function tuneUpSteps(guildState: GuildState): number {
  return getUpgradeLevel(guildState, 'engineers_overclock') > 0 ? OVERCLOCK_TUNE_UP_STEPS : TUNE_UP_STEPS;
}

/** Game steps left on the running Tune-Up: 0 when none runs, or for anyone but an Engineer */
export function tuneUpLeft(guildState: GuildState | undefined): number {
  return isEngineer(guildState) ? guildState.stanley?.tuneUpLeft ?? 0 : 0;
}

/** How fast the machines run now: twice as fast during a Tune-Up */
export function machineSpeed(guildState: GuildState | undefined): number {
  return tuneUpLeft(guildState) > 0 ? TUNE_UP_SPEED : 1;
}

const EMPTY_RECORD: StanleyRecord = { tuneUps: 0 };

/** Pays the Gears for a click, counts it, and starts a fresh Tune-Up */
export function recordTuneUp(guildState: GuildState): GuildState {
  const record = guildState.stanley ?? EMPTY_RECORD;
  return {
    ...guildState,
    guildCurrencies: { ...guildState.guildCurrencies, engineers: guildState.guildCurrencies.engineers + STANLEY_GEARS },
    stanley: { ...record, tuneUps: record.tuneUps + 1, tuneUpLeft: tuneUpSteps(guildState) }
  };
}

/** One game step off the running Tune-Up. Returns the same state when none runs */
export function tickTuneUp(guildState: GuildState): GuildState {
  const left = guildState.stanley?.tuneUpLeft ?? 0;
  if (left <= 0) return guildState;
  return { ...guildState, stanley: { ...(guildState.stanley ?? EMPTY_RECORD), tuneUpLeft: left - 1 } };
}

/** Which look he wears: the vampire costume while the Pumpkin Rush runs, through Halloween */
export function stanleyLook(
  { pumpkinActive, now = new Date() }: { pumpkinActive: boolean; now?: Date }
): 'halloween' | 'everyday' {
  return pumpkinActive && now.getMonth() <= 9 ? 'halloween' : 'everyday';
}
