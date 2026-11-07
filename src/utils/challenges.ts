/**
 * The Summer Festival's Challenge Board: three challenges open at once, of five kinds,
 * against three named rivals who get tougher only when you beat them.
 *
 * Pure rules, so the hook, the board and the tests agree. Random rolls are passed in.
 */
import { CHALLENGE_KINDS, CHALLENGE_ORDER, SUMMER_EVENT_CONSTANTS } from '../data/summerEventData';
import { RIVALS } from '../data/rivals';
import { ownsUpgrade } from './pumpkinPricing';
import type { EventUpgrade } from '../types/eventUpgrades';
import type {
  Challenge,
  ChallengeBoardState,
  ChallengeKind,
  ChallengePlacing,
  ChallengeResult
} from '../types/summerEvent';

const C = SUMMER_EVENT_CONSTANTS;

/** Rounds a score the way its kind shows it: Brix to one decimal, the rest to whole numbers */
export function roundScore(kind: ChallengeKind, value: number): number {
  return CHALLENGE_KINDS[kind].decimals === 1 ? Math.round(value * 10) / 10 : Math.round(value);
}

/** A score in words: "9 melons", "412 Tickets", "11.4 Brix", "27 ft", "142 lb" */
export function formatScore(kind: ChallengeKind, value: number): string {
  const { unit, decimals } = CHALLENGE_KINDS[kind];
  const shown = decimals === 1 ? value.toFixed(1) : value.toLocaleString('en-US');
  if (kind === 'harvestRace' && value === 1) return '1 melon';
  if (kind === 'salesSprint' && value === 1) return '1 Ticket';
  return `${shown} ${unit}`;
}

/** An empty board, before the first challenges open */
export function createChallengeBoard(): ChallengeBoardState {
  const perKind = <T,>(make: () => T) =>
    Object.fromEntries(CHALLENGE_ORDER.map(kind => [kind, make()])) as Record<ChallengeKind, T>;
  return {
    challenges: [],
    challengesOpened: 0,
    ribbons: perKind(() => ({ first: 0, second: 0, third: 0 })),
    bests: perKind(() => 0),
    beaten: RIVALS.map(() => 0),
    sweep: { year: 0, kinds: [] },
    lastResult: null,
  };
}

// ============================================================================
// RIVALS
// ============================================================================

/** A kind's typical rival score for a full game year; it rises only with your first places */
export function rivalBase(kind: ChallengeKind, firstPlaces: number): number {
  const { rivalBase: base, growth, growthPerWin } = CHALLENGE_KINDS[kind];
  const wins = Math.max(0, firstPlaces);
  return growth === 'percent' ? base * (1 + wins * growthPerWin) : base + wins * growthPerWin;
}

/**
 * Each rival's final score for a new challenge, in RIVALS order. Races shorter than a
 * game year are scaled down by their length.
 * @param rolls - One random number from 0 to 1 per rival
 */
export function rollRivalFinals(kind: ChallengeKind, firstPlaces: number, length: number, rolls: readonly number[]): number[] {
  const definition = CHALLENGE_KINDS[kind];
  const base = rivalBase(kind, firstPlaces) * (definition.scoring === 'race' ? length / C.CHALLENGE_LENGTH : 1);
  return RIVALS.map((_, i) => {
    const roll = rolls[i] ?? 0.5;
    const value = definition.growth === 'percent'
      ? base * (1 - definition.rivalSpread / 2 + roll * definition.rivalSpread)
      : base - definition.rivalSpread / 2 + roll * definition.rivalSpread;
    return Math.max(definition.decimals === 1 ? 0.1 : 1, roundScore(kind, value));
  });
}

/**
 * A rival's score now. In the races it climbs steadily with the clock to the final;
 * in the bests it was posted when the challenge opened.
 */
export function rivalScoreAt(challenge: Challenge, rivalIndex: number): number {
  const final = challenge.rivalFinals[rivalIndex] ?? 0;
  if (CHALLENGE_KINDS[challenge.kind].scoring === 'best') return final;
  const elapsed = Math.min(challenge.length, Math.max(0, challenge.length - challenge.daysLeft));
  return Math.floor(final * elapsed / challenge.length);
}

// ============================================================================
// OPENING
// ============================================================================

/** Kinds that can open: Heaviest Melon waits for the Carolina Cross */
export function eligibleKinds(upgrades: readonly EventUpgrade[]): ChallengeKind[] {
  return CHALLENGE_ORDER.filter(kind => kind !== 'heaviest' || ownsUpgrade(upgrades, 'unlock_carolina_cross'));
}

/**
 * The kind for an empty slot: one not on the board, and not the one that just
 * ended when another will do.
 * @param roll - A random number from 0 to 1
 */
export function drawKind(
  open: readonly ChallengeKind[],
  eligible: readonly ChallengeKind[],
  roll: number,
  justEnded?: ChallengeKind
): ChallengeKind | null {
  const free = eligible.filter(kind => !open.includes(kind));
  const fresh = free.filter(kind => kind !== justEnded);
  const pool = fresh.length > 0 ? fresh : free;
  if (pool.length === 0) return null;
  return pool[Math.min(pool.length - 1, Math.floor(roll * pool.length))];
}

/** A new challenge. `rolls` has one random number per rival. */
export function openChallenge(
  id: string,
  kind: ChallengeKind,
  length: number,
  firstPlaces: number,
  rolls: readonly number[]
): Challenge {
  return {
    id,
    kind,
    length,
    daysLeft: length,
    score: 0,
    rivalFinals: rollRivalFinals(kind, firstPlaces, length, rolls),
    spitsLeft: kind === 'spitting' ? C.SPITS_PER_CHALLENGE : 0,
  };
}

/**
 * Fills the board's empty slots. The first board's three open shorter, so one
 * ends about every two minutes from the start.
 * @param random - Returns a random number from 0 to 1, four per new challenge
 */
export function fillBoard(
  board: ChallengeBoardState,
  upgrades: readonly EventUpgrade[],
  random: () => number,
  justEnded?: ChallengeKind
): ChallengeBoardState {
  if (board.challenges.length >= C.OPEN_CHALLENGES) return board;
  const eligible = eligibleKinds(upgrades);
  const challenges = [...board.challenges];
  let opened = board.challengesOpened;
  while (challenges.length < C.OPEN_CHALLENGES) {
    const kind = drawKind(challenges.map(c => c.kind), eligible, random(), justEnded);
    if (!kind) break;
    const length = C.FIRST_BOARD_LENGTHS[opened] ?? C.CHALLENGE_LENGTH;
    const rolls = RIVALS.map(() => random());
    challenges.push(openChallenge(`challenge_${opened}`, kind, length, board.ribbons[kind].first, rolls));
    opened += 1;
  }
  return { ...board, challenges, challengesOpened: opened };
}

// ============================================================================
// SCORING
// ============================================================================

/**
 * Adds to the open challenge of a kind: a race counts up, a best keeps the higher.
 * Returns the same board when that kind isn't open.
 */
export function scoreBoard(board: ChallengeBoardState, kind: ChallengeKind, value: number): ChallengeBoardState {
  const index = board.challenges.findIndex(c => c.kind === kind);
  if (index < 0 || value <= 0) return board;
  const challenge = board.challenges[index];
  const score = CHALLENGE_KINDS[kind].scoring === 'race'
    ? roundScore(kind, challenge.score + value)
    : Math.max(challenge.score, roundScore(kind, value));
  if (score === challenge.score) return board;
  const challenges = [...board.challenges];
  challenges[index] = { ...challenge, score };
  return { ...board, challenges };
}

/** Place among you and the rivals; a tie goes to you, and no score at all takes no place */
export function placingFor(score: number, rivalFinals: readonly number[]): ChallengePlacing {
  if (score <= 0) return 4;
  return Math.min(4, 1 + rivalFinals.filter(rival => rival > score).length) as ChallengePlacing;
}

/** Tickets for a place: 100, 50, 25, or 5 for taking part; nothing for no score at all */
export function challengePrize(placing: ChallengePlacing, score: number): number {
  return score > 0 ? C.PRIZES[placing] : 0;
}

// ============================================================================
// ENDING
// ============================================================================

/**
 * Ends a challenge: its place and prize, a ribbon, the trophy case's best, a tally of
 * the rivals beaten, and the summer's first places for Clean Sweep. The slot is left empty for fillBoard.
 * @param year - This summer's year, for Clean Sweep
 */
export function endChallenge(
  board: ChallengeBoardState,
  challengeId: string,
  year: number
): { board: ChallengeBoardState; result: ChallengeResult } | null {
  const challenge = board.challenges.find(c => c.id === challengeId);
  if (!challenge) return null;
  const { kind, score, rivalFinals } = challenge;
  const placing = placingFor(score, rivalFinals);
  const result: ChallengeResult = { kind, placing, score, rivalScores: [...rivalFinals], prize: challengePrize(placing, score) };

  const ribbons = { ...board.ribbons, [kind]: { ...board.ribbons[kind] } };
  if (placing === 1) ribbons[kind].first += 1;
  else if (placing === 2) ribbons[kind].second += 1;
  else if (placing === 3) ribbons[kind].third += 1;

  const sameSummer = board.sweep.year === year;
  const sweepKinds = sameSummer ? board.sweep.kinds : [];
  const sweep = placing === 1 && !sweepKinds.includes(kind)
    ? { year, kinds: [...sweepKinds, kind] }
    : sameSummer ? board.sweep : { year, kinds: [] };

  return {
    board: {
      ...board,
      challenges: board.challenges.filter(c => c.id !== challengeId),
      ribbons,
      bests: { ...board.bests, [kind]: Math.max(board.bests[kind], score) },
      // A tie goes to you, as it does for the place
      beaten: RIVALS.map((_, i) => (board.beaten[i] ?? 0) + (score > 0 && score >= (rivalFinals[i] ?? 0) ? 1 : 0)),
      sweep,
      lastResult: result,
    },
    result,
  };
}

/**
 * How a challenge ended, for the log: "Harvest Race: 1st place, beating Earl Boone
 * by 3 melons" or "Seed Spitting: 2nd place, behind Earl Boone's 29 ft".
 */
export function describeResult(result: ChallengeResult): string {
  const { kind, placing, score, rivalScores } = result;
  const name = CHALLENGE_KINDS[kind].name;
  if (score <= 0) return `${name}: no entry this time`;
  const ranked = RIVALS.map((rival, i) => ({ rival, score: rivalScores[i] ?? 0 })).sort((a, b) => b.score - a.score);
  const ordinal = ['1st', '2nd', '3rd', '4th'][placing - 1];
  if (placing === 1) {
    const runnerUp = ranked[0];
    const margin = roundScore(kind, score - runnerUp.score);
    return margin > 0
      ? `${name}: ${ordinal} place, beating ${runnerUp.rival.sentenceName} by ${formatScore(kind, margin)}`
      : `${name}: ${ordinal} place, tied with ${runnerUp.rival.sentenceName}`;
  }
  const ahead = ranked[placing - 2];
  const owner = ahead.rival.sentenceName.endsWith('s') ? `${ahead.rival.sentenceName}'` : `${ahead.rival.sentenceName}'s`;
  return `${name}: ${ordinal} place, behind ${owner} ${formatScore(kind, ahead.score)}`;
}

/**
 * The result with its prize, for the board bar and the event log:
 * "Harvest Race: 1st place, beating Earl Boone by 3 melons. +100 Tickets".
 */
export function resultSummary(result: ChallengeResult): string {
  return `${describeResult(result)}${result.prize > 0 ? `. +${result.prize} Tickets` : ''}`;
}
