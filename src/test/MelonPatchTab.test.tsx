import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import MelonPatchTab from '../components/MelonPatchTab';
import { useSummerEvent } from '../hooks/useSummerEvent';
import { ALL_SUMMER_UPGRADES } from '../data/summerEventData';
import type { MelonPlot, MelonVariety, SummerEventState } from '../types/summerEvent';

const format = (n: number) => String(Math.floor(n));

/** The tab on top of the real event hook, so clicks change real state */
function PatchHarness({ initialState }: { initialState?: Partial<SummerEventState> }) {
  const event = useSummerEvent({ initialState });
  return <MelonPatchTab event={event} formatNumber={format} />;
}

/** Saved upgrades with these owned, on top of the ones owned from the start */
const owning = (...ids: string[]) =>
  ALL_SUMMER_UPGRADES.map(u => ({ ...u, owned: u.owned || ids.includes(u.id) }));

const emptyPlot = (index: number): MelonPlot => ({
  id: `melon_plot_${index}`,
  variety: null,
  growth: 0,
  growthTime: 0,
  harvestReady: false,
});

const readyPlot = (index: number, variety: MelonVariety = 'sugarBaby'): MelonPlot => ({
  ...emptyPlot(index),
  variety,
  growth: 180,
  growthTime: 180,
  harvestReady: true,
});

/** The number shown next to a label in the stock chips */
const stock = (label: string) =>
  within(screen.getByRole('list', { name: 'Stock' })).getByText(label).nextElementSibling?.textContent;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MelonPatchTab', () => {
  it('plants the selected melon in an empty plot', () => {
    render(<PatchHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'Plant Sugar Babies in plot 1' }));

    expect(screen.queryByRole('button', { name: 'Plant Sugar Babies in plot 1' })).toBeNull();
    const growth = screen.getByRole('progressbar', { name: 'Sugar Baby in plot 1 growth' });
    expect(growth).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByText('0% · 180 days left')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Plant Sugar Babies in plot 2' })).toBeInTheDocument();
  });

  it('harvests a ready plot into the stock, and shows its sweetness', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.25);
    render(<PatchHarness initialState={{ plots: [readyPlot(0), emptyPlot(1)] }} />);
    expect(stock('Sugar Babies')).toBe('0');
    expect(screen.getByText(/sweetness, or a giant's weight, shows here/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Harvest the Sugar Baby in plot 1' }));

    expect(stock('Sugar Babies')).toBe('1');
    expect(stock('Splits')).toBe('1');
    expect(stock('Seeds')).toBe('2');
    const last = screen.getByRole('region', { name: 'Last harvests' });
    expect(within(last).getByText('Sugar Baby, 9.0 Brix')).toBeInTheDocument();
    expect(within(last).getByText('Best: 9.0 Brix')).toBeInTheDocument();
  });

  it('weighs a Carolina Cross and calls out a Sugar Melon', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.05);
    render(<PatchHarness initialState={{
      plots: [readyPlot(0, 'carolinaCross'), readyPlot(1)],
      upgrades: owning('unlock_carolina_cross', 'sugar_seeds')
    }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Harvest the Carolina Cross in plot 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Harvest the Sugar Baby in plot 2' }));

    const last = screen.getByRole('region', { name: 'Last harvests' });
    expect(within(last).getByText('Sugar Baby, 12.1 Brix: a Sugar Melon!')).toBeInTheDocument();
    expect(within(last).getByText('Carolina Cross, 54 lb')).toBeInTheDocument();
    expect(stock('Giants')).toBe('1');
  });

  it('unlocks a melon with Tickets, and selects it', () => {
    render(<PatchHarness initialState={{ tickets: 250 }} />);

    expect(screen.getByRole('button', { name: 'Unlock Carolina Crosses for 1000 Tickets. Not enough Tickets' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Unlock Crimson Sweets for 200 Tickets' }));

    expect(screen.getByRole('button', { name: 'Crimson Sweet, 240 days to grow' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/The classic, 240 days/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Plant Crimson Sweets in plot 1' })).toBeInTheDocument();
  });

  it('shows Harvest All and Plant All only with the Wagon and the Jab Planter', () => {
    const { unmount } = render(<PatchHarness initialState={{ plots: [readyPlot(0), emptyPlot(1)] }} />);
    expect(screen.queryByRole('button', { name: /^Harvest All:/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Plant All:/ })).toBeNull();
    unmount();

    render(<PatchHarness initialState={{
      plots: [readyPlot(0), readyPlot(1), emptyPlot(2)],
      upgrades: owning('wagon', 'jab_planter')
    }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Harvest All: 2 ready plots' }));
    expect(stock('Sugar Babies')).toBe('2');
    fireEvent.click(screen.getByRole('button', { name: 'Plant All: Sugar Babies in 3 empty plots' }));
    expect(screen.getAllByRole('progressbar', { name: /Sugar Baby in plot \d growth/ })).toHaveLength(3);
  });

  it('lists the Patch upgrades, priced in Tickets, without the melon unlocks', () => {
    render(<PatchHarness initialState={{ tickets: 500 }} />);
    expect(screen.getByRole('heading', { name: 'Patch Upgrades' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Straw Mulch/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Crimson Sweet Seeds/ })).toBeNull();
    expect(screen.getAllByText(/Tickets/).length).toBeGreaterThan(0);
  });
});
