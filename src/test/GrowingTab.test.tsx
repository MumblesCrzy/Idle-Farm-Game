import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArchieProvider } from '../context/ArchieContext';
import GrowingTab from '../components/GrowingTab';
import { createAllCrops, formatNumber } from '../utils/gameCalculations';
import { getHarvesterInterval } from '../utils/gameLoopProcessors';
import type { Veggie } from '../types/game';

const crops = (change: (crops: Veggie[]) => Veggie[] = c => c): Veggie[] => {
  const all = createAllCrops().map((crop, i) => ({ ...crop, unlocked: i < 3 }));
  return change(all);
};

const renderTab = (veggies: Veggie[], activeVeggie = 0) => {
  const handlers = {
    setActiveVeggie: vi.fn(),
    handleHarvest: vi.fn(),
    handleToggleSell: vi.fn(),
    handleToggleAutoHarvester: vi.fn(),
    handleSell: vi.fn(),
    handleRitualHarvestAll: vi.fn(),
    handleBuyFertilizer: vi.fn(),
    handleBuyHarvester: vi.fn(),
    handleBuyBetterSeeds: vi.fn(),
    handleBuyAdditionalPlot: vi.fn(),
    handleBuyHarvesterSpeed: vi.fn(),
    buyAutoPurchaser: vi.fn()
  };
  render(
    <ArchieProvider>
      <GrowingTab
        veggies={veggies}
        activeVeggie={activeVeggie}
        totalPlotsUsed={3}
        maxPlots={10}
        money={1_000_000}
        knowledge={1_000_000}
        experience={100}
        globalAutoPurchaseTimer={0}
        heirloomOwned={false}
        beeYieldBonus={0}
        daysToGrow={5}
        growthMultiplier={1}
        {...handlers}
        handleBuyAutoPurchaser={(id: string) => (index: number) => handlers.buyAutoPurchaser(id, index)}
        formatNumber={formatNumber}
        upgradesSidebar={<div>Farm upgrades here</div>}
      />
    </ArchieProvider>
  );
  return handlers;
};

describe('GrowingTab', () => {
  it('renders the sidebar it is given', () => {
    renderTab(crops());
    expect(screen.getByText('Farm upgrades here')).toBeTruthy();
  });

  it('selects a crop by its index', () => {
    const veggies = crops();
    const handlers = renderTab(veggies);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${veggies[2].name}\\. Growth`) }));
    expect(handlers.setActiveVeggie).toHaveBeenCalledWith(2);
  });

  it('only allows a harvest when the crop is grown', () => {
    renderTab(crops(c => c.map((crop, i) => i === 1 ? { ...crop, growth: 100 } : crop)), 0);
    const harvest = screen.getByRole('button', { name: /^Harvest / }) as HTMLButtonElement;
    expect(harvest.disabled).toBe(true);
  });

  it('buys upgrades for the selected crop', () => {
    const handlers = renderTab(crops(), 1);
    fireEvent.click(screen.getByRole('button', { name: /^Fertilizer/ }));
    expect(handlers.handleBuyFertilizer).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByTitle(/^Assistant:/));
    expect(handlers.buyAutoPurchaser).toHaveBeenCalledWith('assistant', 1);
  });

  it('still renders when a save lacks an auto-purchaser', () => {
    renderTab(crops(c => c.map(crop => ({
      ...crop,
      autoPurchasers: crop.autoPurchasers.filter(ap => ap.id !== 'assistant')
    }))));
    expect(screen.getByRole('button', { name: /^Fertilizer/ })).toBeTruthy();
    expect(screen.queryByTitle(/^Assistant:/)).toBeNull();
  });

  it('shows the harvester interval the game uses', () => {
    const veggies = crops(c => c.map((crop, i) => i === 0
      ? { ...crop, harvesterOwned: true, autoHarvesterEnabled: true, harvesterSpeedLevel: 4 }
      : crop));
    renderTab(veggies);
    const interval = getHarvesterInterval(veggies[0]);
    expect(interval).toBe(Math.round(50 / 1.2));
    expect(screen.getByRole('button', { name: /^Harvester Speed/ }).textContent).toContain(`Harvest time: ${interval}s`);
  });
});
