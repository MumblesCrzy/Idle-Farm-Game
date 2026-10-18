import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import PumpkinPatchTab from '../components/PumpkinPatchTab';
import { usePumpkinEvent } from '../hooks/usePumpkinEvent';
import { ALL_PUMPKIN_UPGRADES } from '../data/pumpkinEventData';
import type { PumpkinEventState, PumpkinPlot, PumpkinQuality, PumpkinVariety } from '../types/pumpkinEvent';

const format = (n: number) => String(Math.floor(n));

/** The tab on top of the real event hook, so clicks change real state */
function PatchHarness({ initialState }: { initialState?: Partial<PumpkinEventState> }) {
  const event = usePumpkinEvent({ initialState });
  return <PumpkinPatchTab event={event} formatNumber={format} />;
}

/** Saved upgrades with these owned, on top of the ones owned from the start */
const owning = (...ids: string[]) =>
  ALL_PUMPKIN_UPGRADES.map(u => ({ ...u, owned: u.owned || ids.includes(u.id) }));

const emptyPlot = (index: number): PumpkinPlot => ({
  id: `pumpkin_plot_${index}`,
  variety: null,
  growth: 0,
  growthTime: 0,
  quality: 'normal',
  harvestReady: false,
});

const readyPlot = (index: number, variety: PumpkinVariety = 'sugarPie', quality: PumpkinQuality = 'normal'): PumpkinPlot => ({
  ...emptyPlot(index),
  variety,
  growth: 180,
  growthTime: 180,
  quality,
  harvestReady: true,
});

/** The number shown next to a label in the materials summary */
const material = (label: string) =>
  within(screen.getByRole('list', { name: 'Materials' })).getByText(label).nextElementSibling?.textContent;

describe('PumpkinPatchTab', () => {
  it('plants the selected variety in an empty plot', () => {
    render(<PatchHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'Plant Sugar Pie Pumpkin in plot 1' }));

    expect(screen.queryByRole('button', { name: 'Plant Sugar Pie Pumpkin in plot 1' })).toBeNull();
    const growth = screen.getByRole('progressbar', { name: 'Sugar Pie Pumpkin in plot 1 growth' });
    expect(growth).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByText('180 days left')).toBeInTheDocument();
    // The other plots are still empty
    expect(screen.getByRole('button', { name: 'Plant Sugar Pie Pumpkin in plot 2' })).toBeInTheDocument();
  });

  it('harvests a ready plot into materials and the plain pumpkin count', () => {
    render(<PatchHarness initialState={{ plots: [readyPlot(0), emptyPlot(1)] }} />);
    expect(material('Sugar Pie')).toBe('0');

    fireEvent.click(screen.getByRole('button', { name: 'Harvest Sugar Pie Pumpkin from plot 1' }));

    expect(screen.getByRole('button', { name: 'Plant Sugar Pie Pumpkin in plot 1' })).toBeInTheDocument();
    expect(material('Sugar Pie')).toBe('1');
    expect(material('Seeds')).toBe('2');
    expect(material('Pulp')).toBe('4');
    expect(material('Vines')).toBe('1');
  });

  it('marks a Blue Ribbon pumpkin with a ribbon badge', () => {
    render(<PatchHarness initialState={{ plots: [readyPlot(0, 'sugarPie', 'blueRibbon'), readyPlot(1)] }} />);

    expect(screen.getAllByText('Blue Ribbon')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Harvest Blue Ribbon Sugar Pie Pumpkin from plot 1' })).toBeInTheDocument();
  });

  it('unlocks Carver with enough Candy Corn and selects it', () => {
    render(<PatchHarness initialState={{ candyCorn: 300 }} />);
    expect(screen.getByRole('button', { name: /^Sugar Pie,/ })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Unlock Carver for 200 Candy Corn' }));

    expect(screen.getByRole('button', { name: /^Carver,/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^Sugar Pie,/ })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Plant Carver Pumpkin in plot 1' })).toBeInTheDocument();
    // 100 left is not enough for the Atlantic Giant
    expect(screen.getByRole('button', { name: /^Unlock Atlantic Giant for 1000 Candy Corn/ })).toBeDisabled();
  });

  it('cannot unlock a variety without enough Candy Corn', () => {
    render(<PatchHarness initialState={{ candyCorn: 199 }} />);

    const carver = screen.getByRole('button', { name: /^Unlock Carver for 200 Candy Corn/ });
    expect(carver).toBeDisabled();
    expect(carver.getAttribute('aria-label')).toContain('Not enough Candy Corn');
  });

  it('notes that Atlantic Giants go to the County Fair shelf', () => {
    render(<PatchHarness />);

    const giant = screen.getByRole('button', { name: /^Unlock Atlantic Giant/ });
    expect(giant).toHaveAccessibleDescription(/County Fair shelf, not the stand/);
  });

  it('hides Harvest All and Plant All without their upgrades', () => {
    render(<PatchHarness initialState={{ plots: [readyPlot(0), emptyPlot(1), emptyPlot(2)] }} />);

    expect(screen.queryByRole('button', { name: /^Harvest All/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Plant All/ })).toBeNull();
  });

  it('plants every empty plot and harvests every ready one with their upgrades', () => {
    render(
      <PatchHarness
        initialState={{
          plots: [readyPlot(0), emptyPlot(1), emptyPlot(2)],
          upgrades: owning('harvest_all_upgrade', 'plant_all_upgrade'),
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Plant All: Sugar Pie Pumpkin in 2 empty plots' }));
    expect(screen.queryAllByRole('button', { name: /^Plant Sugar Pie Pumpkin in plot/ })).toHaveLength(0);
    expect(screen.getAllByRole('progressbar')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Harvest All: 1 ready pumpkin' }));
    expect(screen.queryByRole('button', { name: /^Harvest All/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Plant Sugar Pie Pumpkin in plot 1' })).toBeInTheDocument();
    expect(material('Sugar Pie')).toBe('1');
  });

  it('shows the Patch upgrades without the variety unlocks', () => {
    render(<PatchHarness />);

    expect(screen.getByRole('heading', { name: 'Patch Upgrades' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Compost Heap/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Carver Seeds/ })).toBeNull();
  });
});
