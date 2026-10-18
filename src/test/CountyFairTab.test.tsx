/**
 * Tests for the County Fair tab, driven by the real pumpkin event hook.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import CountyFairTab from '../components/CountyFairTab';
import { usePumpkinEvent } from '../hooks/usePumpkinEvent';
import { ALL_PUMPKIN_UPGRADES, PUMPKIN_EVENT_CONSTANTS } from '../data/pumpkinEventData';
import { floorCandyCorn, getGiantPrice, getSaleMultiplier, rivalBaseWeight, weighOffPrize } from '../utils/pumpkinPricing';
import { formatNumber } from '../utils/gameCalculations';
import type { EventUpgrade } from '../types/eventUpgrades';
import type { GiantPumpkin, PumpkinEventState, PumpkinQuality, WeighOffState } from '../types/pumpkinEvent';

const { FAIR_INTERVAL_DAYS, MAX_GIANT_SHELF, RIVAL_COUNT } = PUMPKIN_EVENT_CONSTANTS;

/** Renders the tab with the real hook, plus the balance and demand for checking */
function Harness({ initialState }: { initialState?: Partial<PumpkinEventState> }) {
  const event = usePumpkinEvent({ initialState });
  return (
    <>
      <output data-testid="candy-corn">{event.candyCorn}</output>
      <output data-testid="demand">{event.demandMultiplier}</output>
      <CountyFairTab event={event} formatNumber={formatNumber} />
    </>
  );
}

const candyCorn = () => Number(screen.getByTestId('candy-corn').textContent);
const demand = () => Number(screen.getByTestId('demand').textContent);

const giant = (id: string, weight: number, quality: PumpkinQuality = 'normal'): GiantPumpkin => ({ id, weight, quality });

const weighOff = (overrides: Partial<WeighOffState>): WeighOffState => ({
  daysUntilFair: 0,
  fairsEntered: 0,
  ribbons: { first: 0, second: 0, third: 0 },
  personalBest: 0,
  giantsGrown: 0,
  lastResult: null,
  ...overrides,
});

const upgradesOwning = (...ids: string[]): EventUpgrade[] =>
  ALL_PUMPKIN_UPGRADES.map(u => ({ ...u, owned: u.owned || ids.includes(u.id) }));

const region = (name: string) => screen.getByRole('region', { name });

/** The value shown for a Trophy Case stat */
const trophyStat = (label: string) => within(region('Trophy case')).getByText(label).nextElementSibling?.textContent;

const lb = (pounds: number) => `${Math.round(pounds).toLocaleString('en-US')} lb`;

describe('CountyFairTab', () => {
  it('counts down to the fair, then opens it for entries', () => {
    const shelf = [giant('giant_0', 700)];
    const { unmount } = render(
      <Harness initialState={{ giantShelf: shelf, weighOff: weighOff({ daysUntilFair: 12, giantsGrown: 1 }) }} />
    );

    expect(screen.getByRole('heading', { name: 'Next fair in 12 days' })).toBeInTheDocument();
    const progress = within(region('Fair status')).getByTestId('progress-bar');
    expect((progress.firstElementChild as HTMLElement).style.width).toBe(`${((FAIR_INTERVAL_DAYS - 12) / FAIR_INTERVAL_DAYS) * 100}%`);
    expect(screen.getByRole('button', { name: /^Enter weigh-off/ })).toBeDisabled();
    unmount();

    render(<Harness initialState={{ giantShelf: shelf, weighOff: weighOff({ daysUntilFair: 0, giantsGrown: 1 }) }} />);

    expect(screen.getByRole('heading', { name: 'The fair is open!' })).toBeInTheDocument();
    expect(screen.queryByText(/Next fair in/)).toBeNull();
    expect(screen.getByRole('button', { name: /^Enter weigh-off/ })).toBeEnabled();
  });

  it('lists giants heaviest first with shelf usage and a Blue Ribbon badge', () => {
    render(
      <Harness
        initialState={{
          giantShelf: [giant('giant_0', 450), giant('giant_1', 1240, 'blueRibbon'), giant('giant_2', 610)],
          weighOff: weighOff({ daysUntilFair: 3, giantsGrown: 3 }),
        }}
      />
    );

    const shelf = region('Giant shelf');
    expect(within(shelf).getByText(`3 / ${MAX_GIANT_SHELF}`)).toBeInTheDocument();
    const rows = within(shelf).getAllByRole('listitem');
    expect(rows.map(row => within(row).getByText(/ lb$/).textContent)).toEqual(['1,240 lb', '610 lb', '450 lb']);
    expect(within(rows[0]).getByText('Blue Ribbon')).toBeInTheDocument();
    expect(within(rows[1]).queryByText('Blue Ribbon')).toBeNull();
  });

  it('shows the expected competition for the next fair', () => {
    render(<Harness initialState={{ weighOff: weighOff({ fairsEntered: 2 }) }} />);
    const competition = region('Expected competition');
    expect(within(competition).getByText(lb(rivalBaseWeight(2)))).toBeInTheDocument();
    expect(competition).toHaveTextContent(`${RIVAL_COUNT} rivals`);
  });

  it('enters a giant: removes it, shows the result and adds a ribbon', () => {
    // Far heavier than any rival can be, so it always wins
    const winner = giant('giant_0', 2000);
    render(
      <Harness
        initialState={{
          giantShelf: [winner, giant('giant_1', 400)],
          weighOff: weighOff({ giantsGrown: 2, personalBest: 2000 }),
        }}
      />
    );
    expect(within(region('Expected competition')).getByText(lb(rivalBaseWeight(0)))).toBeInTheDocument();
    expect(within(region('Last weigh-off')).getByText(/No entries yet/)).toBeInTheDocument();
    expect(trophyStat('1st place')).toBe('0');

    fireEvent.click(screen.getByRole('button', { name: 'Enter weigh-off: 2,000 lb Atlantic Giant' }));

    const shelf = region('Giant shelf');
    expect(within(shelf).queryByText('2,000 lb')).toBeNull();
    expect(within(shelf).getByText(`1 / ${MAX_GIANT_SHELF}`)).toBeInTheDocument();

    const result = region('Last weigh-off');
    expect(within(result).getByText('1st place')).toBeInTheDocument();
    expect(within(result).getAllByRole('listitem')[0]).toHaveTextContent('Your giant2,000 lb');
    expect(within(result).getAllByText(/^Rival \d$/)).toHaveLength(RIVAL_COUNT);
    expect(result).toHaveTextContent(`Prize: +${weighOffPrize(1, 2000)}`);
    expect(candyCorn()).toBe(weighOffPrize(1, 2000));

    expect(trophyStat('1st place')).toBe('1');
    expect(trophyStat('Fairs entered')).toBe('1');
    expect(trophyStat('Personal best')).toBe('2,000 lb');

    // One entry per fair; rivals get heavier for the next one
    expect(screen.getByRole('heading', { name: `Next fair in ${FAIR_INTERVAL_DAYS} days` })).toBeInTheDocument();
    expect(within(shelf).getByRole('button', { name: /^Enter weigh-off/ })).toBeDisabled();
    expect(within(region('Expected competition')).getByText(lb(rivalBaseWeight(1)))).toBeInTheDocument();
  });

  it('records a giant lighter than every rival as no ribbon', () => {
    render(<Harness initialState={{ giantShelf: [giant('giant_0', 100)], weighOff: weighOff({ giantsGrown: 1 }) }} />);
    expect(screen.getByText('Lighter than every rival')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Enter weigh-off/ }));

    expect(within(region('Last weigh-off')).getByText('No ribbon')).toBeInTheDocument();
    expect(candyCorn()).toBe(weighOffPrize(4, 100));
    expect(trophyStat('1st place')).toBe('0');
    expect(trophyStat('2nd place')).toBe('0');
    expect(trophyStat('3rd place')).toBe('0');
    expect(trophyStat('Fairs entered')).toBe('1');
  });

  it('sells a giant for the price on its button', () => {
    const upgrades = upgradesOwning('bunting', 'harvest_display');
    render(
      <Harness
        initialState={{
          upgrades,
          giantShelf: [giant('giant_0', 800, 'blueRibbon')],
          weighOff: weighOff({ daysUntilFair: 5, giantsGrown: 1 }),
        }}
      />
    );

    const sell = screen.getByRole('button', { name: /^Sell for/ });
    const shown = Number(/^Sell for ([\d.]+) Candy Corn/.exec(sell.getAttribute('aria-label') ?? '')?.[1]);
    expect(shown).toBe(floorCandyCorn(getGiantPrice(800, 'blueRibbon', upgrades, demand()) * getSaleMultiplier(upgrades)));
    expect(sell).toHaveTextContent(`Sell for ${shown}`);

    fireEvent.click(sell);

    expect(candyCorn()).toBe(shown);
    expect(screen.queryByRole('button', { name: /^Sell for/ })).toBeNull();
    expect(screen.getByText('The shelf is empty')).toBeInTheDocument();
  });

  it('explains where giants come from before any are grown', () => {
    render(<Harness />);

    expect(screen.getByText('No Atlantic Giants yet')).toBeInTheDocument();
    expect(screen.getByText(/Atlantic Giants are unlocked in the Pumpkin Patch/)).toBeInTheDocument();
    expect(screen.getByText(/comes to this shelf/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Enter weigh-off/ })).toBeNull();
    expect(trophyStat('Personal best')).toBe('-');
  });
});
