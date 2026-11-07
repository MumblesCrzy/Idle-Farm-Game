import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import FestivalGroundsTab from '../components/FestivalGroundsTab';
import { useSummerEvent, createInitialSummerState, type UseSummerEventReturn } from '../hooks/useSummerEvent';
import { ALL_SUMMER_UPGRADES } from '../data/summerEventData';
import type { SummerEventState, SummerMaterials } from '../types/summerEvent';

const format = (n: number) => String(Math.round(n * 10) / 10);

let latest: UseSummerEventReturn | undefined;

/** The tab on top of the real event hook, so clicks change real state */
function GroundsHarness({ initialState, heatwave = false }: { initialState?: Partial<SummerEventState>; heatwave?: boolean }) {
  const event = useSummerEvent({ initialState, isHeatwave: heatwave });
  latest = event;
  return <FestivalGroundsTab event={event} formatNumber={format} />;
}

/** Saved upgrades with these owned, on top of the ones owned from the start */
const owning = (...ids: string[]) =>
  ALL_SUMMER_UPGRADES.map(u => ({ ...u, owned: u.owned || ids.includes(u.id) }));

const stock = (materials: Partial<SummerMaterials>): SummerMaterials => ({ ...createInitialSummerState().materials, ...materials });

afterEach(() => {
  vi.useRealTimers();
});

// Out of season, so demand is 1x whenever the tests run
const pinDate = () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 3, 12));
};

describe('FestivalGroundsTab', () => {
  it('sells a row of melons, Sugar Melons included, and greys out empty rows', () => {
    pinDate();
    render(<GroundsHarness initialState={{ inventory: { sugarBaby_normal_plain: 3, sugarBaby_sugar_plain: 1 } }} />);

    const card = screen.getByRole('region', { name: 'Sugar Babies' });
    expect(within(card).getByText('4 in stock')).toBeInTheDocument();
    expect(within(card).getByText('2-4')).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Sell: no Chilled Sugar Babies in stock' })).toBeDisabled();

    fireEvent.click(within(card).getByRole('button', { name: 'Sell 4 Sugar Babies for 10 Tickets' }));
    expect(latest!.tickets).toBe(10);
    expect(latest!.totalMelonsSold).toBe(4);
  });

  it('shows the Heatwave, and sells cold melons and goods for more while it lasts', () => {
    pinDate();
    render(<GroundsHarness heatwave initialState={{
      inventory: { sugarBaby_normal_chilled: 1 },
      materials: stock({ agua: 1 })
    }} />);

    expect(screen.getByRole('region', { name: 'Heatwave' })).toHaveTextContent('Cold goods +50%');
    fireEvent.click(screen.getByRole('button', { name: 'Sell 1 Chilled Sugar Baby for 6 Tickets' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sell all 1 Agua Fresca for 9 Tickets' }));
    expect(latest!.tickets).toBe(15);
  });

  it('keeps the Heatwave chip away on a mild day, and names the Heatwave price on cold goods', () => {
    pinDate();
    render(<GroundsHarness initialState={{ materials: stock({ ice: 2 }) }} />);
    expect(screen.queryByRole('region', { name: 'Heatwave' })).toBeNull();
    expect(within(screen.getByRole('region', { name: 'Snow Cones' })).getByText(/1\.5 in a Heatwave/)).toBeInTheDocument();
  });

  it('sells a Carolina Cross from the shelf by weight, heaviest first', () => {
    pinDate();
    render(<GroundsHarness initialState={{
      upgrades: owning('unlock_carolina_cross'),
      giantShelf: [{ id: 'giant_1', weight: 96 }, { id: 'giant_2', weight: 142 }]
    }} />);

    const shelf = screen.getByRole('region', { name: 'Carolina Cross shelf' });
    expect(within(shelf).getByText('Shelf 2 / 12')).toBeInTheDocument();
    const sells = within(shelf).getAllByRole('button', { name: /^Sell the/ });
    expect(sells[0]).toHaveAccessibleName('Sell the 142 lb Carolina Cross for 28 Tickets');

    fireEvent.click(sells[0]);
    expect(latest!.tickets).toBe(28);
    expect(latest!.giantShelf).toEqual([{ id: 'giant_1', weight: 96 }]);
  });

  it('shows the shelf only once the Carolina Cross is unlocked', () => {
    pinDate();
    const { unmount } = render(<GroundsHarness />);
    expect(screen.queryByRole('region', { name: 'Carolina Cross shelf' })).toBeNull();
    unmount();

    render(<GroundsHarness initialState={{ upgrades: owning('unlock_carolina_cross') }} />);
    expect(within(screen.getByRole('region', { name: 'Carolina Cross shelf' })).getByText(/sell by the pound/)).toBeInTheDocument();
  });

  it('sells every melon at once, and leaves the shelf and the goods', () => {
    pinDate();
    render(<GroundsHarness initialState={{
      inventory: { sugarBaby_normal_plain: 2, crimsonSweet_normal_basket: 1 },
      upgrades: owning('unlock_crimson_sweet'),
      materials: stock({ pickles: 2 })
    }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Sell all melons: 3 for 13 Tickets' }));
    expect(latest!.tickets).toBe(13);
    expect(latest!.materials.pickles).toBe(2);
    expect(screen.getByRole('button', { name: 'Sell all melons: none in stock' })).toBeDisabled();
  });

  it('pays the Parade Route once a day and shows the Carousel', () => {
    pinDate();
    render(<GroundsHarness initialState={{ upgrades: owning('parade_route', 'carousel') }} />);

    const parade = screen.getByRole('region', { name: 'Daily bonus' });
    fireEvent.click(within(parade).getByRole('button', { name: /Claim \+25/ }));
    expect(latest!.tickets).toBe(25);
    expect(within(parade).getByRole('button', { name: 'Claimed. Back tomorrow!' })).toBeDisabled();
    expect(screen.getByRole('region', { name: 'Carousel income' })).toHaveTextContent('1 Ticket every 10 seconds');
  });

  it('lists the Grounds upgrades', () => {
    pinDate();
    render(<GroundsHarness />);
    expect(screen.getByRole('heading', { name: 'Grounds Upgrades' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Summer Bunting/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Tasting Table/ })).toBeInTheDocument();
  });
});
