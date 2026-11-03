/**
 * Tests for the Workshop tab, driven by the real Christmas event hook.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import WorkshopTab from '../components/WorkshopTab';
import { useChristmasEvent } from '../hooks/useChristmasEvent';
import { ALL_EVENT_UPGRADES } from '../data/christmasEventData';
import type { ChristmasEventState, CraftingMaterials } from '../types/christmasEvent';

const format = (n: number) => String(Math.floor(n));

function WorkshopHarness({ initialState }: { initialState?: Partial<ChristmasEventState> }) {
  const event = useChristmasEvent({ farmTier: 1, initialState });
  return <WorkshopTab event={event} formatNumber={format} />;
}

const owning = (...ids: string[]) =>
  ALL_EVENT_UPGRADES.map(u => ({ ...u, owned: u.owned || ids.includes(u.id) }));

const materials = (some: Partial<CraftingMaterials>): CraftingMaterials =>
  ({ wood: 0, pinecones: 0, branches: 0, ornaments: 0, garlands: 0, naturalOrnaments: 0, candles: 0, ...some });

/** The number shown next to a label in the header's stock chips */
const stock = (label: string) =>
  within(screen.getByRole('list', { name: 'Stock' })).getByText(label).nextElementSibling?.textContent;

describe('WorkshopTab', () => {
  it('crafts a recipe and updates the stock', () => {
    render(<WorkshopHarness initialState={{ materials: materials({ branches: 3, pinecones: 2 }) }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Craft Garland ×1: uses 3 branches and 2 pinecones to make 1 garland' }));

    expect(stock('Garland')).toBe('1');
    expect(stock('Branches')).toBe('0');
    expect(stock('Pinecones')).toBe('0');
  });

  it('crafts the chosen quantity, or as many as the materials allow with Max', () => {
    render(<WorkshopHarness initialState={{ materials: materials({ wood: 13 }) }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Craft 5 at a time' }));
    fireEvent.click(screen.getByRole('button', { name: 'Craft Candles ×5: uses 10 wood to make 5 candles' }));
    expect(stock('Candles')).toBe('5');

    fireEvent.click(screen.getByRole('button', { name: 'Craft as many as possible' }));
    fireEvent.click(screen.getByRole('button', { name: 'Craft Candles ×1: uses 2 wood to make 1 candle' }));
    expect(stock('Candles')).toBe('6');
    expect(stock('Wood')).toBe('1');
  });

  it('disables a recipe without enough materials', () => {
    render(<WorkshopHarness />);
    expect(screen.getByRole('button', { name: /^Craft Garland ×1: .*Not enough materials$/ })).toBeDisabled();
  });

  it('shows a locked recipe with the upgrade that unlocks it', () => {
    render(<WorkshopHarness initialState={{ materials: materials({ wood: 5 }) }} />);
    const locked = screen.getByRole('button', { name: 'Craft Ornaments: locked, requires Ornament Crafting Bench' });
    expect(locked).toBeDisabled();
    expect(screen.getByText('Requires Ornament Crafting Bench')).toBeInTheDocument();
  });

  it('crafts the recipe once its upgrade is owned', () => {
    render(<WorkshopHarness initialState={{ materials: materials({ wood: 1 }), upgrades: owning('ornament_crafting_bench') }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Craft Ornaments ×1: uses 1 wood to make 2 ornaments' }));
    expect(stock('Ornaments')).toBe('2');
  });

  it('decorates a plain tree of the chosen kind', () => {
    render(<WorkshopHarness initialState={{
      materials: materials({ ornaments: 1, candles: 1 }),
      treeInventory: { pine_normal_plain: 1, spruce_normal_plain: 2 }
    }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Spruce: 2 plain trees' }));
    fireEvent.click(screen.getByRole('button', { name: 'Decorate a Spruce Tree with luxury. Uses 1 ornament and 1 candle' }));

    expect(screen.getByText(/Spruce Trees in stock: 1 plain/)).toHaveTextContent('1 luxury');
    expect(screen.getByRole('button', { name: /^Decorate a Spruce Tree with ornaments.*Not enough ornaments$/ })).toBeDisabled();
  });

  it('shows the Star Forge on the Luxury button', () => {
    render(<WorkshopHarness initialState={{ upgrades: owning('star_forge') }} />);
    expect(screen.getByText(/Uses 1 ornament and 1 candle · ×3 value/)).toBeInTheDocument();
  });

  it("shows what the Elves are doing once the Elves' Bench is owned", () => {
    render(<WorkshopHarness initialState={{
      upgrades: owning('elves_bench', 'cheerful_crafting').map(u => (u.id === 'cheerful_crafting' ? { ...u, level: 1 } : u)),
      currentElvesAction: { type: 'craft', recipeId: 'craft_garland' }
    }} />);
    const bar = screen.getByRole('region', { name: "Elves' Bench" });
    expect(within(bar).getByText('2 jobs per second')).toBeInTheDocument();
    expect(within(bar).getByText('Craft Garland')).toBeInTheDocument();
  });

  it("asks for the Elves' Bench before showing a status", () => {
    render(<WorkshopHarness />);
    const bar = screen.getByRole('region', { name: "Elves' Bench" });
    expect(within(bar).getByText(/Buy the Elves' Bench upgrade/)).toBeInTheDocument();
  });
});
