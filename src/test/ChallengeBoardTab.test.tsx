import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import ChallengeBoardTab from '../components/ChallengeBoardTab';
import { useSummerEvent, createInitialSummerState, type UseSummerEventReturn } from '../hooks/useSummerEvent';
import { createChallengeBoard, openChallenge } from '../utils/challenges';
import { ALL_SUMMER_UPGRADES } from '../data/summerEventData';
import type { Challenge, ChallengeBoardState, ChallengeKind, SummerEventState, SummerMaterials } from '../types/summerEvent';

const format = (n: number) => String(Math.floor(n));

let latest: UseSummerEventReturn | undefined;

/** The tab on top of the real event hook, so clicks change real state */
function BoardHarness({ initialState }: { initialState?: Partial<SummerEventState> }) {
  const event = useSummerEvent({ initialState });
  latest = event;
  return <ChallengeBoardTab event={event} formatNumber={format} />;
}

const owning = (...ids: string[]) =>
  ALL_SUMMER_UPGRADES.map(u => ({ ...u, owned: u.owned || ids.includes(u.id) }));

const stock = (materials: Partial<SummerMaterials>): SummerMaterials => ({ ...createInitialSummerState().materials, ...materials });

/** A year-long challenge with the given score and rival finals */
const challenge = (kind: ChallengeKind, score: number, rivalFinals: number[], extra: Partial<Challenge> = {}): Challenge => ({
  ...openChallenge(`challenge_${kind}`, kind, 365, 0, [0.5, 0.5, 0.5]),
  score,
  rivalFinals,
  ...extra,
});

const boardOf = (...challenges: Challenge[]): ChallengeBoardState => ({
  ...createChallengeBoard(),
  challenges,
  challengesOpened: challenges.length,
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ChallengeBoardTab', () => {
  it('opens three challenge cards with the first day of play', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<BoardHarness />);
    expect(screen.getByText('The first three challenges open with the next day of play.')).toBeInTheDocument();

    act(() => latest!.processChallenges());
    for (const name of ['Harvest Race', 'Sales Sprint', 'Sweetest Melon']) {
      expect(screen.getByRole('region', { name })).toBeInTheDocument();
    }
    expect(within(screen.getByRole('region', { name: 'Sweetest Melon' })).getByText('124 of 125 days left')).toBeInTheDocument();
  });

  it('ranks you among the rivals, with your place and the prizes', () => {
    render(<BoardHarness initialState={{
      board: boardOf(challenge('sweetest', 11.4, [11.2, 10.8, 11.6], { daysLeft: 340 }))
    }} />);

    const card = screen.getByRole('region', { name: 'Sweetest Melon' });
    expect(within(card).getByText("You're 2nd")).toBeInTheDocument();
    const rows = within(within(card).getByRole('list', { name: 'Sweetest Melon standings' })).getAllByRole('listitem');
    expect(rows.map(row => row.textContent)).toEqual([
      'The Vance Twins11.6 Brix',
      'You11.4 Brix',
      'Maggie Pickett11.2 Brix',
      'Earl Boone10.8 Brix',
    ]);
    expect(within(card).getByText(/1st 100 · 2nd 50 · 3rd 25 · taking part 5/)).toBeInTheDocument();
  });

  it('climbs the rivals with the clock in a race, and names who is on pace to win', () => {
    render(<BoardHarness initialState={{
      board: boardOf(challenge('harvestRace', 9, [14, 19, 12], { daysLeft: 219 }))
    }} />);

    const card = screen.getByRole('region', { name: 'Harvest Race' });
    // 40% of the year gone: Earl at 7 of his 19
    expect(within(card).getByText('Earl Boone').parentElement).toHaveTextContent('7 melons');
    expect(within(card).getByText("You're 1st")).toBeInTheDocument();
    expect(within(card).getByText(/Earl Boone is on pace for 19 melons/)).toBeInTheDocument();
  });

  it('spits seeds from the Seed Spitting card, until the seeds or spits run out', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    render(<BoardHarness initialState={{
      materials: stock({ seeds: 9 }),
      board: boardOf(challenge('spitting', 0, [24, 29, 22]))
    }} />);

    const card = screen.getByRole('region', { name: 'Seed Spitting' });
    expect(within(card).getByText('No entry yet')).toBeInTheDocument();
    fireEvent.click(within(card).getByRole('button', { name: 'Spit a seed: uses 5 seeds, 10 of 10 spits left' }));

    expect(latest!.board.challenges[0]).toMatchObject({ score: 20, spitsLeft: 9 });
    expect(within(card).getByText("You're 4th")).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Spit a seed: uses 5 seeds, 9 of 10 spits left. Not enough seeds' })).toBeDisabled();
  });

  it('fills the trophy case, and keeps Heaviest Melon locked until the Carolina Cross', () => {
    const board = createChallengeBoard();
    board.ribbons.spitting = { first: 2, second: 1, third: 0 };
    board.bests.spitting = 31;
    const { unmount } = render(<BoardHarness initialState={{ board }} />);

    const trophyCase = screen.getByRole('region', { name: 'Trophy Case' });
    const spitting = within(trophyCase).getByText('Seed Spitting').closest('li')!;
    expect(spitting).toHaveTextContent('Longest: 31 ft');
    expect(within(spitting).getByAltText('First place').parentElement).toHaveTextContent('2');
    expect(within(trophyCase).getByText('Heaviest Melon').closest('li')).toHaveTextContent('Opens with the Carolina Cross');
    expect(within(screen.getByRole('list', { name: 'Ribbons won' })).getByText('1st').nextElementSibling).toHaveTextContent('2');
    unmount();

    render(<BoardHarness initialState={{ upgrades: owning('unlock_carolina_cross') }} />);
    expect(within(screen.getByRole('region', { name: 'Trophy Case' })).getByText('Heaviest Melon').closest('li')).toHaveTextContent('No best yet');
  });

  it('says how the last challenge went, and counts the rivals beaten', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    render(<BoardHarness initialState={{
      board: boardOf(challenge('harvestRace', 15, [10, 12, 9], { daysLeft: 1 }))
    }} />);

    act(() => latest!.processChallenges(1));
    expect(screen.getByText('Last: Harvest Race: 1st place, beating Earl Boone by 3 melons. +100 Tickets')).toBeInTheDocument();
    const rivals = screen.getByRole('region', { name: 'The Rivals' });
    expect(within(rivals).getByText('Earl Boone').parentElement).toHaveTextContent('Beaten 1 time');
  });

  it('shows the Board upgrades: Sun-Ripening, Vine Pruning and Spitting Practice', () => {
    render(<BoardHarness initialState={{ tickets: 1000 }} />);
    expect(screen.getByRole('heading', { name: 'Board Upgrades' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Sun-Ripening/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /^Vine Pruning/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^Spitting Practice/ })).toBeEnabled();
  });
});
