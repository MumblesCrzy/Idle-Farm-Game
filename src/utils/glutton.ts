/**
 * Dunkin, the Glutton: the Preservers' visiting French Bulldog. These are the rules for one
 * visit; useGluttonVisits runs them on game steps, so he waits while the game is paused or
 * the tab is hidden, and never visits offline.
 *
 * A visit: he sniffs around for a while, then eats from the stash, a tenth of one vegetable
 * per bite. After his last bite he is stuffed and stays until clicked. Clicking him always
 * pays Wax Seals; sending a stuffed Dunkin home also costs a vet bill. With Pantry Lock he
 * can't reach the stash, and wanders off on his own if nobody clicks him.
 */
import type { GluttonRecord, GuildState } from '../types/guilds';

/** His name, in toasts, the event log and achievements */
export const GLUTTON_NAME = 'Dunkin';

/** Game steps he sniffs around before his first bite */
export const GLUTTON_SNIFF_STEPS = 10;
/** Game steps between bites */
export const GLUTTON_BITE_EVERY = 2;
/** Bites before he is stuffed */
export const GLUTTON_BITES = 10;
/** Share of one crop's stash a bite takes; every bite takes at least 1 */
export const GLUTTON_BITE_SHARE = 0.1;
/** Game steps from one visit's end to the next visit, chosen at random in this range */
export const GLUTTON_VISIT_GAP: readonly [number, number] = [300, 600];
/** With Pantry Lock he leaves on his own after this many game steps */
export const GLUTTON_LOCKED_OUT_STEPS = 30;
/** Wax Seals for clicking him, at any stage */
export const GLUTTON_WAX_SEALS = 3;
/** Vet bill for a stuffed Dunkin: this share of the player's money, never below the minimum */
export const VET_BILL_SHARE = 0.02;
export const VET_BILL_MIN = 100;

export type GluttonStage = 'sniffing' | 'eating' | 'stuffed';

/** One visit in progress */
export interface GluttonVisit {
  stage: GluttonStage;
  /** Game steps since he arrived */
  steps: number;
  /** Bites taken */
  bites: number;
  /** What he ate, by crop name */
  eaten: Record<string, number>;
  /** Where he sits, as shares of the window's width and height */
  x: number;
  y: number;
}

/** One bite: the crop and how many */
export interface GluttonBite {
  name: string;
  amount: number;
}

/** What clicking him did */
export interface GluttonOutcome {
  /** The stage he was in */
  stage: GluttonStage;
  seals: number;
  vetBill: number;
  /** Shooed before his first bite */
  early: boolean;
  eaten: Record<string, number>;
}

type Random = () => number;

/** Game steps until the next visit */
export function nextVisitDelay(random: Random = Math.random): number {
  const [min, max] = GLUTTON_VISIT_GAP;
  return Math.round(min + random() * (max - min));
}

/** A new visit at a random spot, clear of the window's edges */
export function arrive(random: Random = Math.random): GluttonVisit {
  return { stage: 'sniffing', steps: 0, bites: 0, eaten: {}, x: 0.1 + random() * 0.75, y: 0.15 + random() * 0.65 };
}

/** A stuffed Dunkin from a save, at a new spot */
export function arriveStuffed(eaten: Record<string, number>, random: Random = Math.random): GluttonVisit {
  return { ...arrive(random), stage: 'stuffed', steps: GLUTTON_SNIFF_STEPS + GLUTTON_BITES * GLUTTON_BITE_EVERY, bites: GLUTTON_BITES, eaten };
}

/** One bite: a tenth of one random crop that has any stash, at least 1. Null when the stash is empty. */
export function chooseBite(crops: ReadonlyArray<{ name: string; stash: number }>, random: Random = Math.random): GluttonBite | null {
  const stocked = crops.filter(crop => crop.stash >= 1);
  if (stocked.length === 0) return null;
  const crop = stocked[Math.min(stocked.length - 1, Math.floor(random() * stocked.length))];
  return { name: crop.name, amount: Math.max(1, Math.floor(crop.stash * GLUTTON_BITE_SHARE)) };
}

/**
 * One game step of a visit. Returns the visit after the step (null when he leaves) and the
 * bite he took, if any. He leaves on his own only with Pantry Lock, or when there was nothing
 * at all to eat; otherwise he ends up stuffed.
 */
export function stepVisit(
  visit: GluttonVisit,
  { pantryLocked, crops, random = Math.random }: { pantryLocked: boolean; crops: ReadonlyArray<{ name: string; stash: number }>; random?: Random }
): { visit: GluttonVisit | null; bite: GluttonBite | null } {
  if (visit.stage === 'stuffed') return { visit, bite: null };
  const steps = visit.steps + 1;

  if (pantryLocked) {
    return { visit: steps >= GLUTTON_LOCKED_OUT_STEPS ? null : { ...visit, steps }, bite: null };
  }
  if (visit.stage === 'sniffing') {
    return { visit: { ...visit, steps, stage: steps >= GLUTTON_SNIFF_STEPS ? 'eating' : 'sniffing' }, bite: null };
  }
  if ((steps - GLUTTON_SNIFF_STEPS) % GLUTTON_BITE_EVERY !== 0) {
    return { visit: { ...visit, steps }, bite: null };
  }

  const bite = chooseBite(crops, random);
  const eaten = bite ? { ...visit.eaten, [bite.name]: (visit.eaten[bite.name] ?? 0) + bite.amount } : visit.eaten;
  const bites = visit.bites + 1;
  if (bites < GLUTTON_BITES) return { visit: { ...visit, steps, bites, eaten }, bite };
  // Done eating: stuffed, unless the pantry was bare the whole time
  const ateAnything = Object.keys(eaten).length > 0;
  return { visit: ateAnything ? { ...visit, steps, bites, eaten, stage: 'stuffed' } : null, bite };
}

/** The vet bill for a stuffed Dunkin, never more than the player has */
export function vetBill(money: number): number {
  return Math.min(Math.max(0, money), Math.max(VET_BILL_MIN, Math.round(money * VET_BILL_SHARE)));
}

/** What clicking him does now */
export function shooOutcome(visit: GluttonVisit, money: number): GluttonOutcome {
  return {
    stage: visit.stage,
    seals: GLUTTON_WAX_SEALS,
    vetBill: visit.stage === 'stuffed' ? vetBill(money) : 0,
    early: visit.bites === 0,
    eaten: visit.eaten
  };
}

/** What he ate, in words: "12 Carrots and 4 Tomatoes" */
export function describeEaten(eaten: Record<string, number>): string {
  const parts = Object.entries(eaten).map(([name, amount]) => `${amount} ${name}`);
  if (parts.length === 0) return 'nothing';
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/** The toast for clicking him away */
export function shooMessage(outcome: GluttonOutcome, formatNumber: (num: number, decimalPlaces?: number) => string): string {
  const seals = `+${outcome.seals} Wax Seals`;
  if (outcome.stage === 'stuffed') {
    return `${GLUTTON_NAME} waddled home to the vet. Vet bill: $${formatNumber(outcome.vetBill)}. ${seals}`;
  }
  if (outcome.early) return `Get out of the kitchen, ${GLUTTON_NAME}! He left before taking a bite. ${seals}`;
  return `You shooed ${GLUTTON_NAME} out of the kitchen. He ate ${describeEaten(outcome.eaten)}. ${seals}`;
}

/** Which look he wears: the sweater while the Christmas Tree Shop is open, the vampire through Halloween */
export function gluttonLook(
  { christmasActive, pumpkinActive, now = new Date() }: { christmasActive: boolean; pumpkinActive: boolean; now?: Date }
): 'sweater' | 'vampire' | 'everyday' {
  if (christmasActive) return 'sweater';
  if (pumpkinActive && now.getMonth() <= 9) return 'vampire';
  return 'everyday';
}

const EMPTY_RECORD: GluttonRecord = { shoos: 0, earlyShoos: 0, vetBills: 0 };

/** Pays the Wax Seals for a click and counts it, clearing a saved stuffed Dunkin */
export function recordShoo(guildState: GuildState, outcome: GluttonOutcome): GuildState {
  const record = guildState.glutton ?? EMPTY_RECORD;
  return {
    ...guildState,
    guildCurrencies: { ...guildState.guildCurrencies, preservers: guildState.guildCurrencies.preservers + outcome.seals },
    glutton: {
      shoos: record.shoos + 1,
      earlyShoos: record.earlyShoos + (outcome.early ? 1 : 0),
      vetBills: record.vetBills + (outcome.stage === 'stuffed' ? 1 : 0)
    }
  };
}

/** Saves a stuffed Dunkin, so a reload doesn't send him home for free */
export function recordStuffed(guildState: GuildState, eaten: Record<string, number>): GuildState {
  return { ...guildState, glutton: { ...(guildState.glutton ?? EMPTY_RECORD), stuffed: { eaten } } };
}
