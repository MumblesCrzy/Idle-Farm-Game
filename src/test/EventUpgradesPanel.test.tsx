import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EventUpgradesPanel from '../components/EventUpgradesPanel';
import { ALL_EVENT_UPGRADES } from '../data/christmasEventData';
import { getEventUpgradeCost } from '../utils/christmasUpgrades';
import type { EventUpgrade, EventUpgradeCategory } from '../types/christmasEvent';

const format = (n: number) => String(Math.floor(n));

const upgradesOwning = (...ids: string[]): EventUpgrade[] =>
  ALL_EVENT_UPGRADES.map(u => ({ ...u, owned: ids.includes(u.id) }));

const renderPanel = (category: EventUpgradeCategory, upgrades: EventUpgrade[], holidayCheer = 100000) => {
  const purchaseUpgrade = vi.fn();
  render(
    <EventUpgradesPanel
      title="Upgrades"
      category={category}
      upgrades={upgrades}
      holidayCheer={holidayCheer}
      purchaseUpgrade={purchaseUpgrade}
      formatNumber={format}
    />
  );
  return purchaseUpgrade;
};

const button = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}`) }) as HTMLButtonElement;

describe('EventUpgradesPanel', () => {
  it('shows only its category, without tree unlocks', () => {
    renderPanel('farming', upgradesOwning());
    expect(button('Fertilized Soil')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Wreath Sign/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Unlock/ })).toBeNull();
  });

  it('locks an upgrade until its prerequisite is owned', () => {
    renderPanel('shopfront', upgradesOwning());
    const bell = button('Golden Bell Counter');
    expect(bell.textContent).toContain('Requires Wreath Sign');
    expect(bell.disabled).toBe(true);
  });

  it('unlocks it once the prerequisite is owned', () => {
    const purchase = renderPanel('shopfront', upgradesOwning('wreath_sign'));
    const bell = button('Golden Bell Counter');
    expect(bell.textContent).not.toContain('Requires');
    fireEvent.click(bell);
    expect(purchase).toHaveBeenCalledWith('golden_bell_counter');
  });

  it('hides Cheerful Crafting until the Elves Bench is owned', () => {
    renderPanel('workshop', upgradesOwning());
    expect(screen.queryByRole('button', { name: /Cheerful Crafting/ })).toBeNull();
  });

  it('prices repeatable upgrades by level, in Holiday Cheer', () => {
    const upgrades = upgradesOwning('elves_bench').map(u =>
      u.id === 'cheerful_crafting' ? { ...u, owned: true, level: 2 } : u
    );
    renderPanel('workshop', upgrades);
    const crafting = button('Cheerful Crafting');
    const cost = getEventUpgradeCost(upgrades.find(u => u.id === 'cheerful_crafting')!);
    expect(cost).toBe(Math.floor(500 * 1.5 ** 2));
    expect(crafting.textContent).toContain(`${cost} Cheer`);
    expect(crafting.getAttribute('aria-label')).toContain(`Costs ${cost} Holiday Cheer`);
  });

  it('disables upgrades the player cannot afford', () => {
    renderPanel('farming', upgradesOwning(), 0);
    expect(button('Fertilized Soil').disabled).toBe(true);
  });
});
