import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { getTreePrice, getTreeSaleCheer, parseTreeKey, rollRegisterTips } from '../utils/christmasTreePricing';
import { ALL_EVENT_UPGRADES } from '../data/christmasEventData';
import { useChristmasEvent } from '../hooks/useChristmasEvent';
import type { EventUpgrade } from '../types/christmasEvent';

const upgradesOwning = (...ids: string[]): EventUpgrade[] =>
  ALL_EVENT_UPGRADES.map(u => ({ ...u, owned: ids.includes(u.id) }));

describe('Christmas tree pricing', () => {
  it('reads the parts of an inventory key', () => {
    expect(parseTreeKey('fir_perfect_candled')).toEqual({ treeType: 'fir', quality: 'perfect', decoration: 'candled' });
    expect(parseTreeKey('pine_normal')).toEqual({ treeType: 'pine', quality: 'normal', decoration: 'plain' });
  });

  it('prices by tree type, quality, decoration and demand', () => {
    const none = upgradesOwning();
    expect(getTreePrice('pine_normal_plain', none, 1)).toBe(10);
    expect(getTreePrice('spruce_normal_plain', none, 1)).toBe(15);
    expect(getTreePrice('fir_normal_plain', none, 1)).toBe(20);
    expect(getTreePrice('fir_perfect_plain', none, 1)).toBe(40);
    expect(getTreePrice('fir_normal_ornamented', none, 1)).toBe(21); // +5%
    expect(getTreePrice('fir_normal_candled', none, 1)).toBe(23);    // +15%
    expect(getTreePrice('pine_normal_luxury', none, 1)).toBe(20);    // double
    expect(getTreePrice('pine_normal_plain', none, 2.5)).toBe(25);
  });

  it('triples luxury trees with the Star Forge', () => {
    expect(getTreePrice('pine_normal_luxury', upgradesOwning('star_forge'), 1)).toBe(30);
    expect(getTreePrice('pine_normal_candled', upgradesOwning('star_forge'), 1)).toBe(11);
    expect(getTreePrice('pine_normal_luxury', upgradesOwning('star_forge', 'fireplace_display'), 1)).toBe(45);
  });

  it('applies Fireplace Display to luxury trees only', () => {
    const fireplace = upgradesOwning('fireplace_display');
    expect(getTreePrice('pine_normal_luxury', fireplace, 1)).toBe(30);
    expect(getTreePrice('pine_normal_candled', fireplace, 1)).toBe(11);
  });

  it('applies Garland Borders to the whole sale', () => {
    expect(getTreeSaleCheer('fir_normal_plain', 3, upgradesOwning(), 1)).toBe(60);
    expect(getTreeSaleCheer('fir_normal_plain', 3, upgradesOwning('garland_borders'), 1)).toBe(66);
  });

  it('rolls a Magical Register tip only on a hit', () => {
    const rolls = [0.05, 0, 0.5, 0.9, 0.05, 1];
    let i = 0;
    const random = () => rolls[i++];
    // Hit with a 20% tip, miss, hit with a 50% tip
    expect(rollRegisterTips(100, 3, random)).toBe(20 + 50);
  });

  it('pays the same for one sale per key as for Sell All', () => {
    const inventory = { pine_normal_ornamented: 3, fir_perfect_candled: 2, spruce_normal_luxury: 1 };
    const initialState = { treeInventory: inventory, upgrades: upgradesOwning('garland_borders', 'fireplace_display') };

    const single = renderHook(() => useChristmasEvent({ farmTier: 1, initialState }));
    const all = renderHook(() => useChristmasEvent({ farmTier: 1, initialState }));
    const cheerBefore = single.result.current.holidayCheer;
    expect(all.result.current.holidayCheer).toBe(cheerBefore);

    act(() => {
      Object.entries(inventory).forEach(([key, n]) => single.result.current.sellTrees(key, n));
      all.result.current.sellAllTrees();
    });

    const demand = single.result.current.eventState.marketDemand.demandMultiplier;
    const upgrades = single.result.current.eventState.upgrades;
    const expected = Object.entries(inventory)
      .reduce((sum, [key, n]) => sum + getTreeSaleCheer(key, n, upgrades, demand), 0);

    expect(single.result.current.holidayCheer - cheerBefore).toBe(expected);
    // Sell All rounds once for the whole sale, so it can be ahead by less than one per key
    const allGain = all.result.current.holidayCheer - cheerBefore;
    expect(allGain).toBeGreaterThanOrEqual(expected);
    expect(allGain - expected).toBeLessThan(Object.keys(inventory).length);
  });
});

describe('Magical Register through a sale', () => {
  it('adds tips priced from the same tree price', () => {
    const initialState = { treeInventory: { fir_normal_plain: 1 }, upgrades: upgradesOwning('magical_register') };
    const { result } = renderHook(() => useChristmasEvent({ farmTier: 1, initialState }));
    const before = result.current.holidayCheer;
    const demand = result.current.eventState.marketDemand.demandMultiplier;

    const spy = vi.spyOn(Math, 'random').mockReturnValue(0); // hit, smallest tip
    act(() => {
      result.current.sellTrees('fir_normal_plain', 1);
    });
    spy.mockRestore();

    const price = getTreePrice('fir_normal_plain', result.current.eventState.upgrades, demand);
    expect(result.current.holidayCheer - before).toBe(price + Math.floor(price * 0.2));
  });
});
