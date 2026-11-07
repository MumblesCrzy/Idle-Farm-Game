/**
 * Tests for the Tree Farm tab, driven by the real Christmas event hook.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import TreeFarmTab from '../components/TreeFarmTab';
import { useChristmasEvent } from '../hooks/useChristmasEvent';
import { ALL_EVENT_UPGRADES, TREE_DEFINITIONS } from '../data/christmasEventData';
import type { ChristmasEventState, TreePlot, TreeQuality, TreeType } from '../types/christmasEvent';

const format = (n: number) => String(Math.floor(n));

/** The tab on top of the real event hook, so clicks change real state */
function FarmHarness({ initialState }: { initialState?: Partial<ChristmasEventState> }) {
  const event = useChristmasEvent({ farmTier: 1, initialState });
  return (
    <>
      <output data-testid="cheer">{event.holidayCheer}</output>
      <TreeFarmTab event={event} formatNumber={format} />
    </>
  );
}

const cheer = () => Number(screen.getByTestId('cheer').textContent);

/** Saved upgrades with these owned, on top of the ones owned from the start */
const owning = (...ids: string[]) =>
  ALL_EVENT_UPGRADES.map(u => ({ ...u, owned: u.owned || ids.includes(u.id) }));

const emptyPlot = (index: number): TreePlot => ({
  id: `plot_${index}`,
  treeType: null,
  growth: 0,
  growthTime: 0,
  quality: 'normal',
  decorations: { ornaments: false, garland: false, candles: false },
  harvestReady: false,
});

const readyPlot = (index: number, treeType: TreeType = 'pine', quality: TreeQuality = 'normal'): TreePlot => ({
  ...emptyPlot(index),
  treeType,
  growth: TREE_DEFINITIONS[treeType].baseGrowthTime,
  growthTime: TREE_DEFINITIONS[treeType].baseGrowthTime,
  quality,
  harvestReady: true,
});

/** The number shown next to a label in the header's stock chips */
const stock = (label: string) =>
  within(screen.getByRole('list', { name: 'Stock' })).getByText(label).nextElementSibling?.textContent;

describe('TreeFarmTab', () => {
  it('plants the selected tree in an empty plot', () => {
    render(<FarmHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'Plant Pine Tree in plot 1' }));

    expect(screen.queryByRole('button', { name: 'Plant Pine Tree in plot 1' })).toBeNull();
    const growth = screen.getByRole('progressbar', { name: 'Pine Tree in plot 1 growth' });
    expect(growth).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByText(`${TREE_DEFINITIONS.pine.baseGrowthTime} days left`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Plant Pine Tree in plot 2' })).toBeInTheDocument();
  });

  it('harvests a ready plot into the stock chips', () => {
    render(<FarmHarness initialState={{ treePlots: [readyPlot(0), emptyPlot(1)] }} />);
    expect(stock('Pine')).toBe('0');
    expect(stock('Wood')).toBe('0');

    fireEvent.click(screen.getByRole('button', { name: 'Harvest Pine Tree from plot 1' }));

    expect(stock('Pine')).toBe('1');
    expect(Number(stock('Wood'))).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Plant Pine Tree in plot 1' })).toBeInTheDocument();
  });

  it('counts undecorated trees of every quality, and only those', () => {
    render(<FarmHarness initialState={{
      treeInventory: { pine_normal_plain: 2, pine_perfect_plain: 1, pine_normal_luxury: 5, spruce_normal_plain: 4 }
    }} />);
    expect(stock('Pine')).toBe('3');
    expect(stock('Spruce')).toBe('4');
    expect(stock('Fir')).toBe('0');
  });

  it('marks a Perfect tree with a badge', () => {
    render(<FarmHarness initialState={{ treePlots: [readyPlot(0, 'pine', 'perfect')] }} />);
    expect(screen.getByText('Perfect')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Harvest Perfect Pine Tree from plot 1' })).toBeInTheDocument();
  });

  it('unlocks Spruce for the price it shows and selects it', () => {
    const price = TREE_DEFINITIONS.spruce.unlockCost;
    render(<FarmHarness initialState={{ holidayCheer: price + 100 }} />);

    fireEvent.click(screen.getByRole('button', { name: `Unlock Spruce Tree for ${price} Holiday Cheer` }));

    expect(cheer()).toBe(100);
    expect(screen.getByRole('button', { name: /^Spruce Tree, \d+ years to grow/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Plant Spruce Tree in plot 1' })).toBeInTheDocument();
  });

  it('cannot unlock a tree without enough Holiday Cheer', () => {
    const price = TREE_DEFINITIONS.fir.unlockCost;
    render(<FarmHarness initialState={{ holidayCheer: price - 1 }} />);
    expect(screen.getByRole('button', { name: `Unlock Fir Tree for ${price} Holiday Cheer. Not enough Holiday Cheer` })).toBeDisabled();
  });

  it('hides Harvest All and Plant All without their upgrades', () => {
    render(<FarmHarness initialState={{ treePlots: [readyPlot(0), emptyPlot(1)] }} />);
    expect(screen.queryByRole('button', { name: /^Harvest All/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Plant All/ })).toBeNull();
  });

  it('shows Harvest All and Plant All beside the title, as the other events do', () => {
    render(<FarmHarness initialState={{
      treePlots: [readyPlot(0), emptyPlot(1)],
      upgrades: owning('harvest_all_upgrade', 'plant_all_upgrade')
    }} />);

    const titleGroup = screen.getByRole('heading', { name: /Tree Farm/ }).parentElement!;
    expect(titleGroup).toContainElement(screen.getByRole('button', { name: /^Harvest All:/ }));
    expect(titleGroup).toContainElement(screen.getByRole('button', { name: /^Plant All:/ }));
    // The tree row keeps its hint now that the buttons have moved out of it
    expect(screen.getByText(/Each harvest brings wood, pinecones and branches/)).toBeInTheDocument();
  });

  it('plants every empty plot and harvests every ready one with their upgrades', () => {
    render(<FarmHarness initialState={{
      treePlots: [readyPlot(0), readyPlot(1), emptyPlot(2), emptyPlot(3)],
      upgrades: owning('harvest_all_upgrade', 'plant_all_upgrade')
    }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Harvest All: 2 ready trees' }));
    expect(stock('Pine')).toBe('2');

    fireEvent.click(screen.getByRole('button', { name: 'Plant All: Pine Tree in 4 empty plots' }));
    expect(screen.queryByRole('button', { name: /^Plant Pine Tree in plot/ })).toBeNull();
  });

  it('shows the Farming upgrades without the tree unlocks', () => {
    render(<FarmHarness />);
    expect(screen.getByRole('heading', { name: 'Farming Upgrades' })).toBeInTheDocument();
    expect(screen.queryByText('Spruce Sapling')).toBeNull();
    expect(screen.getByText('Fertilized Soil')).toBeInTheDocument();
  });
});
