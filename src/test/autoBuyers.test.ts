/**
 * Auto-buyers all shop in the same cycle, from one budget: together they never spend more
 * money or knowledge than there is, and Surveyors never buy plots past the farm's size.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAutoPurchase } from '../hooks/useAutoPurchase';
import { AUTO_PURCHASER_CYCLE_DAYS } from '../config/gameConstants';
import { createAllCrops } from '../utils/gameCalculations';
import type { Veggie } from '../types/game';

/** Every crop, the first ones open, with these auto-buyers hired and on in the open ones */
const cropsWith = (open: number, hired: string[], change: (crop: Veggie) => Veggie = crop => crop): Veggie[] =>
  createAllCrops().map((crop, i) => (i < open
    ? change({
      ...crop,
      unlocked: true,
      autoPurchasers: crop.autoPurchasers.map(ap => (hired.includes(ap.id) ? { ...ap, owned: true, active: true } : ap))
    })
    : crop));

/** Runs one auto-buyer cycle and returns what was bought */
const runCycle = (veggies: Veggie[], money: number, knowledge: number, maxPlots: number) => {
  const handlers = {
    handleBuyFertilizer: vi.fn(),
    handleBuyBetterSeeds: vi.fn(),
    handleBuyHarvesterSpeed: vi.fn(),
    handleBuyAdditionalPlot: vi.fn()
  };
  const setVeggies = vi.fn();
  const onPurchaseCallback = vi.fn();
  renderHook(() => useAutoPurchase({
    veggies, setVeggies, money, knowledge, maxPlots, handlers, onPurchaseCallback, initialTimer: AUTO_PURCHASER_CYCLE_DAYS
  }));
  return { handlers, setVeggies, onPurchaseCallback };
};

describe('auto-buyers in one cycle', () => {
  it('buy only the plots that are free, and switch every Surveyor off once the farm is full', () => {
    // Three crops take three plots; the farm has four
    const veggies = cropsWith(3, ['surveyor']);
    const { handlers, setVeggies } = runCycle(veggies, 1e12, 0, 4);

    expect(handlers.handleBuyAdditionalPlot).toHaveBeenCalledTimes(1);
    expect(handlers.handleBuyAdditionalPlot).toHaveBeenCalledWith(0, 1);
    const update = setVeggies.mock.calls[0][0] as (prev: Veggie[]) => Veggie[];
    const after = update(veggies);
    const surveyorOn = (crop: Veggie) => crop.autoPurchasers.find(ap => ap.id === 'surveyor')?.active;
    expect(after.slice(0, 3).map(surveyorOn)).toEqual([false, false, false]);
    // The earlier state is left alone
    expect(veggies.slice(0, 3).map(surveyorOn)).toEqual([true, true, true]);
  });

  it('share one money budget, so the second Assistant waits when the first spent it', () => {
    // $150 covers either $100 Fertilizer, not both
    const veggies = cropsWith(2, ['assistant'], crop => ({ ...crop, fertilizerCost: 100 }));
    const { handlers, onPurchaseCallback } = runCycle(veggies, 150, 0, 100);

    expect(handlers.handleBuyFertilizer).toHaveBeenCalledTimes(1);
    expect(handlers.handleBuyFertilizer).toHaveBeenCalledWith(0, 1);
    expect(onPurchaseCallback).toHaveBeenCalledTimes(1);
  });

  it('share one knowledge budget among the Cultivators', () => {
    // 250 knowledge covers two of the three 100 Kn Better Seeds
    const veggies = cropsWith(3, ['cultivator'], crop => ({ ...crop, betterSeedsCost: 100 }));
    const { handlers } = runCycle(veggies, 0, 250, 100);

    expect(handlers.handleBuyBetterSeeds.mock.calls).toEqual([[0, 1], [1, 1]]);
  });

  it('buy plots up to the farm size even with money for more', () => {
    const veggies = cropsWith(5, ['surveyor']);
    const { handlers } = runCycle(veggies, 1e12, 0, 7);

    expect(handlers.handleBuyAdditionalPlot.mock.calls).toEqual([[0, 1], [1, 1]]);
  });

  it('leave Harvester Speed alone on a crop with no Auto Harvester', () => {
    const veggies = cropsWith(2, ['mechanic'], crop => ({ ...crop, harvesterOwned: crop.name !== 'Radish' }));
    const { handlers } = runCycle(veggies, 1e12, 0, 100);

    expect(handlers.handleBuyHarvesterSpeed.mock.calls).toEqual([[1, 1]]);
  });
});
