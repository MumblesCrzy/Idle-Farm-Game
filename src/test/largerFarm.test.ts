/**
 * A larger farm starts the crops over, with the ones its starting experience earns open at
 * once rather than after the first harvest, as many as the plots allow.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFarmManagement, type UseFarmManagementDeps } from '../hooks/useFarmManagement';
import { calculateExpRequirement } from '../utils/gameCalculations';
import type { EventLogCallbacks } from '../context/EventLogContext';
import type { Veggie } from '../types/game';

/** Buys a larger farm from this farm and returns the setters, to see what it set */
const buyLargerFarm = (farm: Partial<UseFarmManagementDeps>) => {
  const deps: UseFarmManagementDeps = {
    experience: 0,
    money: 1e9,
    farmTier: 1,
    knowledge: 0,
    maxPlots: 20,
    farmCost: 1000,
    FARM_BASE_COST: 1000,
    setActiveVeggie: vi.fn(),
    setVeggies: vi.fn(),
    setHighestUnlockedVeggie: vi.fn(),
    setMoney: vi.fn(),
    setExperience: vi.fn(),
    setKnowledge: vi.fn(),
    setDay: vi.fn(),
    setGreenhouseOwned: vi.fn(),
    setAlmanacLevel: vi.fn(),
    setAlmanacCost: vi.fn(),
    setAutoSellOwned: vi.fn(),
    setHeirloomOwned: vi.fn(),
    setMaxPlots: vi.fn(),
    setFarmTier: vi.fn(),
    setIrrigationOwned: vi.fn(),
    setGlobalAutoPurchaseTimer: vi.fn(),
    setFarmCost: vi.fn(),
    setGuildState: vi.fn(),
    eventLogCallbacks: { onAchievementUnlock: vi.fn() } as unknown as EventLogCallbacks,
    ...farm
  };
  const { result } = renderHook(() => useFarmManagement(deps));
  result.current.handleBuyLargerFarm();
  return deps;
};

/** The open crops the new farm starts with */
const openCrops = (deps: UseFarmManagementDeps) =>
  (vi.mocked(deps.setVeggies).mock.calls[0][0] as Veggie[]).filter(crop => crop.unlocked).map(crop => crop.name);

describe('a larger farm', () => {
  it('opens every crop its starting experience earns at once', () => {
    // Farm Tier 4 starts with the experience for the fourth crop
    const deps = buyLargerFarm({ farmTier: 3 });

    expect(deps.setExperience).toHaveBeenCalledWith(calculateExpRequirement(3));
    expect(openCrops(deps)).toEqual(['Radish', 'Lettuce', 'Green Beans', 'Zucchini']);
  });

  it('records the highest crop opened, keeping a higher one from before', () => {
    const deps = buyLargerFarm({ farmTier: 3 });
    const update = vi.mocked(deps.setHighestUnlockedVeggie).mock.calls[0][0] as (current: number) => number;

    expect(update(0)).toBe(3);
    expect(update(7)).toBe(7);
  });

  it('opens only as many crops as there are plots', () => {
    // Two plots, and no experience to add more
    const deps = buyLargerFarm({ farmTier: 3, maxPlots: 2 });

    expect(openCrops(deps)).toEqual(['Radish', 'Lettuce']);
  });
});
