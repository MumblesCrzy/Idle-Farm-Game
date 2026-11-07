import { describe, it, expect } from 'vitest';
import {
  challengePrize,
  createChallengeBoard,
  describeResult,
  drawKind,
  eligibleKinds,
  endChallenge,
  fillBoard,
  formatScore,
  openChallenge,
  placingFor,
  rivalBase,
  rivalScoreAt,
  rollRivalFinals,
  scoreBoard
} from '../utils/challenges';
import { ALL_SUMMER_UPGRADES, CHALLENGE_ORDER } from '../data/summerEventData';
import { RIVALS, RIVAL_NAMES } from '../data/rivals';
import type { EventUpgrade } from '../types/eventUpgrades';
import type { ChallengeBoardState, ChallengeKind } from '../types/summerEvent';

const upgradesOwning = (...ids: string[]): EventUpgrade[] =>
  ALL_SUMMER_UPGRADES.map(u => ({ ...u, owned: u.owned || ids.includes(u.id) }));

/** A source that returns these numbers in turn, then 0 */
const sequence = (...values: number[]) => {
  let index = 0;
  return () => values[index++] ?? 0;
};

/** A board with one challenge of each given kind, a year long, every rival at 0.5 */
const boardWith = (...kinds: ChallengeKind[]): ChallengeBoardState => ({
  ...createChallengeBoard(),
  challenges: kinds.map((kind, i) => openChallenge(`challenge_${i}`, kind, 365, 0, [0.5, 0.5, 0.5])),
  challengesOpened: kinds.length,
});

describe('The rivals', () => {
  it('are Maggie Pickett, Earl Boone and the Vance Twins, always in that order', () => {
    expect(RIVAL_NAMES).toEqual(['Maggie Pickett', 'Earl Boone', 'The Vance Twins']);
    expect(RIVALS.map(rival => rival.initials)).toEqual(['MP', 'EB', 'VT']);
    expect(RIVALS[2].sentenceName).toBe('the Vance Twins');
  });

  it('get tougher only with your first places, by a share or by a flat amount', () => {
    expect(rivalBase('harvestRace', 0)).toBe(12);
    expect(rivalBase('harvestRace', 5)).toBeCloseTo(12 * 1.6);
    expect(rivalBase('heaviest', 2)).toBeCloseTo(124);
    expect(rivalBase('sweetest', 0)).toBeCloseTo(11.0);
    expect(rivalBase('sweetest', 3)).toBeCloseTo(11.6);
    expect(rivalBase('spitting', 1)).toBeCloseTo(27);
  });

  it('roll their finals around the base, races scaled by a short first challenge', () => {
    expect(rollRivalFinals('heaviest', 0, 365, [0, 0.5, 1])).toEqual([80, 100, 120]);
    expect(rollRivalFinals('heaviest', 0, 125, [0, 0.5, 1])).toEqual([80, 100, 120]);
    expect(rollRivalFinals('harvestRace', 0, 365, [0, 0.5, 1])).toEqual([10, 12, 14]);
    // A race a third of a year long: a third of the melons
    expect(rollRivalFinals('salesSprint', 0, 125, [0.5, 0.5, 0.5])).toEqual([27, 27, 27]);
    // Sweetness rolls half a Brix either side, to one decimal
    expect(rollRivalFinals('sweetest', 0, 365, [0, 0.5, 1])).toEqual([10.5, 11, 11.5]);
  });

  it('climb with the clock in a race, and post their best from the start otherwise', () => {
    const race = { ...openChallenge('a', 'harvestRace', 365, 0, [0.5, 0.5, 0.5]), daysLeft: 365 - 146 };
    expect(rivalScoreAt(race, 0)).toBe(4); // 40% of the way to 12
    expect(rivalScoreAt({ ...race, daysLeft: 0 }, 0)).toBe(12);
    const best = { ...openChallenge('b', 'spitting', 365, 0, [0.5, 0.5, 0.5]), daysLeft: 365 };
    expect(rivalScoreAt(best, 0)).toBe(25);
  });
});

describe('Opening challenges', () => {
  it('waits for the Carolina Cross before Heaviest Melon can open', () => {
    expect(eligibleKinds(upgradesOwning())).toEqual(['harvestRace', 'salesSprint', 'sweetest', 'spitting']);
    expect(eligibleKinds(upgradesOwning('unlock_carolina_cross'))).toEqual(CHALLENGE_ORDER);
  });

  it('draws a kind that isn\'t on the board, and not the one that just ended when another will do', () => {
    const eligible = eligibleKinds(upgradesOwning());
    expect(drawKind(['harvestRace', 'salesSprint'], eligible, 0)).toBe('sweetest');
    expect(drawKind(['harvestRace', 'salesSprint'], eligible, 0.99)).toBe('spitting');
    expect(drawKind(['harvestRace', 'salesSprint'], eligible, 0, 'sweetest')).toBe('spitting');
    expect(drawKind(['harvestRace', 'salesSprint', 'spitting'], eligible, 0, 'sweetest')).toBe('sweetest');
    expect(drawKind(eligible, eligible, 0)).toBeNull();
  });

  it('opens the first board with 365, 245 and 125 days, three different kinds', () => {
    const board = fillBoard(createChallengeBoard(), upgradesOwning(), sequence());
    expect(board.challenges.map(c => c.length)).toEqual([365, 245, 125]);
    expect(board.challenges.map(c => c.daysLeft)).toEqual([365, 245, 125]);
    expect(new Set(board.challenges.map(c => c.kind)).size).toBe(3);
    expect(board.challenges.map(c => c.id)).toEqual(['challenge_0', 'challenge_1', 'challenge_2']);
    expect(board.challengesOpened).toBe(3);
  });

  it('opens later challenges a full year long, and gives Seed Spitting ten spits', () => {
    const board = { ...createChallengeBoard(), challengesOpened: 7 };
    const filled = fillBoard(board, upgradesOwning(), sequence(0.99));
    expect(filled.challenges.every(c => c.length === 365)).toBe(true);
    const spitting = filled.challenges.find(c => c.kind === 'spitting');
    expect(spitting?.spitsLeft).toBe(10);
    expect(filled.challenges.filter(c => c.kind !== 'spitting').every(c => c.spitsLeft === 0)).toBe(true);
  });

  it('leaves a full board alone', () => {
    const board = boardWith('harvestRace', 'salesSprint', 'sweetest');
    expect(fillBoard(board, upgradesOwning(), sequence())).toBe(board);
  });
});

describe('Scoring', () => {
  it('adds up in a race and keeps the best otherwise', () => {
    let board = boardWith('harvestRace', 'sweetest', 'spitting');
    board = scoreBoard(scoreBoard(board, 'harvestRace', 1), 'harvestRace', 1);
    board = scoreBoard(scoreBoard(board, 'sweetest', 11.4), 'sweetest', 10.2);
    board = scoreBoard(board, 'spitting', 27);
    expect(board.challenges.map(c => c.score)).toEqual([2, 11.4, 27]);
  });

  it('ignores a kind that isn\'t open', () => {
    const board = boardWith('harvestRace', 'sweetest', 'spitting');
    expect(scoreBoard(board, 'heaviest', 140)).toBe(board);
  });

  it('places you among the rivals, a tie going to you, and no score taking no place', () => {
    expect(placingFor(30, [29, 24, 22])).toBe(1);
    expect(placingFor(29, [29, 24, 22])).toBe(1);
    expect(placingFor(27, [29, 24, 22])).toBe(2);
    expect(placingFor(10, [29, 24, 22])).toBe(4);
    expect(placingFor(0, [0.1, 0.1, 0.1])).toBe(4);
  });

  it('pays 100, 50, 25 or 5 Tickets, and nothing for no score', () => {
    expect([1, 2, 3, 4].map(p => challengePrize(p as 1 | 2 | 3 | 4, 5))).toEqual([100, 50, 25, 5]);
    expect(challengePrize(4, 0)).toBe(0);
  });

  it('writes scores with their units', () => {
    expect(formatScore('harvestRace', 9)).toBe('9 melons');
    expect(formatScore('harvestRace', 1)).toBe('1 melon');
    expect(formatScore('salesSprint', 1412)).toBe('1,412 Tickets');
    expect(formatScore('sweetest', 11)).toBe('11.0 Brix');
    expect(formatScore('spitting', 27)).toBe('27 ft');
    expect(formatScore('heaviest', 142)).toBe('142 lb');
  });
});

describe('Ending a challenge', () => {
  it('gives a ribbon, keeps the trophy case\'s best and empties the slot', () => {
    let board = boardWith('spitting', 'harvestRace', 'sweetest');
    board = scoreBoard(board, 'spitting', 31);
    const ended = endChallenge(board, 'challenge_0', 2027)!;

    expect(ended.result).toEqual({ kind: 'spitting', placing: 1, score: 31, rivalScores: [25, 25, 25], prize: 100 });
    expect(ended.board.ribbons.spitting).toEqual({ first: 1, second: 0, third: 0 });
    expect(ended.board.bests.spitting).toBe(31);
    expect(ended.board.beaten).toEqual([1, 1, 1]);
    expect(ended.board.challenges.map(c => c.kind)).toEqual(['harvestRace', 'sweetest']);
    expect(ended.board.lastResult).toEqual(ended.result);
    expect(endChallenge(board, 'no_such_challenge', 2027)).toBeNull();
  });

  it('collects the summer\'s first places for Clean Sweep, starting over each summer', () => {
    let board: ChallengeBoardState = { ...boardWith('spitting'), sweep: { year: 2027, kinds: ['harvestRace'] } };
    board = scoreBoard(board, 'spitting', 40);
    expect(endChallenge(board, 'challenge_0', 2027)!.board.sweep).toEqual({ year: 2027, kinds: ['harvestRace', 'spitting'] });
    expect(endChallenge(board, 'challenge_0', 2028)!.board.sweep).toEqual({ year: 2028, kinds: ['spitting'] });

    // A second place adds nothing, and a new summer still starts over
    const lost = { ...boardWith('spitting'), sweep: { year: 2027, kinds: ['harvestRace'] as ChallengeKind[] } };
    expect(endChallenge(scoreBoard(lost, 'spitting', 5), 'challenge_0', 2027)!.board.sweep.kinds).toEqual(['harvestRace']);
    expect(endChallenge(scoreBoard(lost, 'spitting', 5), 'challenge_0', 2028)!.board.sweep).toEqual({ year: 2028, kinds: [] });
  });

  it('counts the rivals you finished ahead of, a tie included', () => {
    const board = { ...createChallengeBoard(), challenges: [{ ...openChallenge('c', 'spitting', 365, 0, [0.5, 0.5, 0.5]), score: 27, rivalFinals: [24, 29, 27] }] };
    expect(endChallenge(board, 'c', 2027)!.board.beaten).toEqual([1, 0, 1]);
    const none = { ...board, challenges: [{ ...board.challenges[0], score: 0 }] };
    expect(endChallenge(none, 'c', 2027)!.board.beaten).toEqual([0, 0, 0]);
  });

  it('says how it went', () => {
    expect(describeResult({ kind: 'harvestRace', placing: 1, score: 15, rivalScores: [10, 12, 9], prize: 100 }))
      .toBe('Harvest Race: 1st place, beating Earl Boone by 3 melons');
    expect(describeResult({ kind: 'spitting', placing: 2, score: 27, rivalScores: [24, 29, 22], prize: 50 }))
      .toBe("Seed Spitting: 2nd place, behind Earl Boone's 29 ft");
    expect(describeResult({ kind: 'sweetest', placing: 2, score: 11.4, rivalScores: [11.2, 10.8, 11.6], prize: 50 }))
      .toBe("Sweetest Melon: 2nd place, behind the Vance Twins' 11.6 Brix");
    expect(describeResult({ kind: 'heaviest', placing: 1, score: 120, rivalScores: [120, 100, 90], prize: 100 }))
      .toBe('Heaviest Melon: 1st place, tied with Maggie Pickett');
    expect(describeResult({ kind: 'salesSprint', placing: 4, score: 0, rivalScores: [80, 80, 80], prize: 0 }))
      .toBe('Sales Sprint: no entry this time');
  });
});
