/**
 * Ferdinand, the Merchants' orange tabby. These are the rules for his visits and his Hot Tip;
 * useFerdinandVisits runs them on game steps, so he waits while the game is paused or the tab
 * is hidden, and never visits offline.
 *
 * A visit: he shows up at a random spot and waits 20 seconds, then wanders off. Clicking him
 * starts a Hot Tip: for 60 seconds, 90 with Insider Trading, crops and jars sell for double.
 * Missing him costs nothing. The Hot Tip counts down on game steps too.
 */
import type { FerdinandRecord, GuildState } from '../types/guilds';
import { getUpgradeLevel } from './guildCalculations';

/** His name, in toasts, the event log and achievements */
export const FERDINAND_NAME = 'Ferdinand';

/** Game steps from loading, joining or his last visit to the next visit, chosen at random in this range */
export const FERDINAND_VISIT_GAP: readonly [number, number] = [240, 480];
/** Game steps he waits to be clicked before he wanders off */
export const FERDINAND_WAIT_STEPS = 20;
/** Game steps a Hot Tip lasts */
export const HOT_TIP_STEPS = 60;
/** Game steps a Hot Tip lasts with Insider Trading */
export const INSIDER_HOT_TIP_STEPS = 90;

/** One visit in progress */
export interface FerdinandVisit {
  /** Game steps since he arrived */
  steps: number;
  /** Where he sits, as shares of the window's width and height */
  x: number;
  y: number;
}

type Random = () => number;

/** Game steps until the next visit */
export function nextFerdinandDelay(random: Random = Math.random): number {
  const [min, max] = FERDINAND_VISIT_GAP;
  return Math.round(min + random() * (max - min));
}

/** A new visit at a random spot, clear of the window's edges */
export function arriveFerdinand(random: Random = Math.random): FerdinandVisit {
  return { steps: 0, x: 0.1 + random() * 0.75, y: 0.15 + random() * 0.6 };
}

/** One game step of a visit: the visit after it, or null when he wanders off */
export function stepFerdinand(visit: FerdinandVisit): FerdinandVisit | null {
  const steps = visit.steps + 1;
  return steps >= FERDINAND_WAIT_STEPS ? null : { ...visit, steps };
}

/** Seconds before he wanders off */
export function ferdinandWaitLeft(visit: FerdinandVisit): number {
  return Math.max(0, FERDINAND_WAIT_STEPS - visit.steps);
}

/** Game steps a Hot Tip lasts for this player: 60, or 90 with Insider Trading */
export function hotTipSteps(guildState: GuildState): number {
  return getUpgradeLevel(guildState, 'merchants_insider_trading') > 0 ? INSIDER_HOT_TIP_STEPS : HOT_TIP_STEPS;
}

const EMPTY_RECORD: FerdinandRecord = { hotTips: 0 };

/** Counts a click and starts a fresh Hot Tip */
export function recordHotTip(guildState: GuildState): GuildState {
  const record = guildState.ferdinand ?? EMPTY_RECORD;
  return { ...guildState, ferdinand: { ...record, hotTips: record.hotTips + 1, hotTipLeft: hotTipSteps(guildState) } };
}

/** One game step off the running Hot Tip. Returns the same state when none runs */
export function tickHotTip(guildState: GuildState): GuildState {
  const left = guildState.ferdinand?.hotTipLeft ?? 0;
  if (left <= 0) return guildState;
  return { ...guildState, ferdinand: { ...(guildState.ferdinand ?? EMPTY_RECORD), hotTipLeft: left - 1 } };
}
