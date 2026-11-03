/**
 * Tests for the Shopfront tab, driven by the real Christmas event hook.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import ShopfrontTab from '../components/ShopfrontTab';
import { useChristmasEvent } from '../hooks/useChristmasEvent';
import { ALL_EVENT_UPGRADES, EVENT_CONSTANTS } from '../data/christmasEventData';
import { formatNumber } from '../utils/gameCalculations';
import type { ChristmasEventState, CraftingMaterials } from '../types/christmasEvent';

/** Renders the tab with the real hook, plus the balance and demand for checking */
function Harness({ initialState }: { initialState?: Partial<ChristmasEventState> }) {
  const event = useChristmasEvent({ farmTier: 1, initialState });
  return (
    <>
      <output data-testid="cheer">{event.holidayCheer}</output>
      <output data-testid="demand">{event.demandMultiplier}</output>
      <ShopfrontTab event={event} formatNumber={formatNumber} />
    </>
  );
}

const cheer = () => Number(screen.getByTestId('cheer').textContent);
const demand = () => Number(screen.getByTestId('demand').textContent);

const upgradesOwning = (...ids: string[]) =>
  ALL_EVENT_UPGRADES.map(u => ({ ...u, owned: u.owned || ids.includes(u.id) }));

const materials = (goods: Partial<CraftingMaterials>): CraftingMaterials =>
  ({ wood: 0, pinecones: 0, branches: 0, ornaments: 0, garlands: 0, naturalOrnaments: 0, candles: 0, ...goods });

/** The Cheer in an accessible name such as "Sell All: 3 Pine Tree for 30 Holiday Cheer" */
const amountIn = (element: HTMLElement) =>
  Number(/for ([\d.]+) Holiday Cheer/.exec(element.getAttribute('aria-label') ?? '')?.[1]);

describe('ShopfrontTab', () => {
  it('shows the demand multiplier', () => {
    render(<Harness />);
    expect(screen.getByText(`×${demand().toFixed(2)}`)).toBeInTheDocument();
  });

  it('sells the selected trees, Normal first, for the total the card shows', () => {
    render(<Harness initialState={{ holidayCheer: 0, treeInventory: { pine_normal_plain: 2, pine_perfect_plain: 1 } }} />);
    const card = screen.getByRole('region', { name: 'Pine Tree' });
    expect(within(card).getByText('2 Normal')).toBeInTheDocument();
    expect(within(card).getByText('1 Perfect')).toBeInTheDocument();

    fireEvent.change(within(card).getByRole('slider', { name: 'Number of Pine Tree to sell' }), { target: { value: '2' } });
    const sell = within(card).getByRole('button', { name: /^Sell Selected: 2 Pine Tree/ });
    const shown = amountIn(sell);
    fireEvent.click(sell);

    expect(cheer()).toBe(shown);
    expect(within(screen.getByRole('region', { name: 'Pine Tree' })).getByText('1 Perfect')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Pine Tree' })).queryByText(/Normal/)).toBeNull();
  });

  it('sells every tree for the amount the Sell all button shows', () => {
    render(<Harness initialState={{
      holidayCheer: 0,
      treeInventory: { pine_normal_plain: 3, spruce_normal_ornamented: 2, fir_perfect_luxury: 1 }
    }} />);
    const sellAll = screen.getByRole('button', { name: /^Sell all trees: 6 for/ });
    const shown = amountIn(sellAll);
    expect(shown).toBeGreaterThan(0);

    fireEvent.click(sellAll);
    expect(cheer()).toBe(shown);
    expect(screen.getByText('No trees in the shop')).toBeInTheDocument();
  });

  it('names each card by its tree and decoration', () => {
    render(<Harness initialState={{
      treeInventory: { pine_normal_ornamented: 1, spruce_normal_candled: 1, fir_normal_luxury: 1 }
    }} />);
    for (const name of ['Ornamented Pine', 'Candlelit Spruce', 'Luxury Fir']) {
      expect(screen.getByRole('region', { name })).toBeInTheDocument();
    }
  });

  it('sells garland, candles and ornaments at their listed prices', () => {
    render(<Harness initialState={{ holidayCheer: 0, materials: materials({ garlands: 2, candles: 3, ornaments: 4 }) }} />);
    const prices = EVENT_CONSTANTS.GOOD_PRICES;

    fireEvent.click(screen.getByRole('button', { name: `Sell All: 2 Festive Garland for ${2 * prices.garlands} Holiday Cheer` }));
    expect(cheer()).toBe(2 * prices.garlands);
    fireEvent.click(screen.getByRole('button', { name: `Sell 1 Candle for ${prices.candles} Holiday Cheer` }));
    expect(cheer()).toBe(2 * prices.garlands + prices.candles);
    fireEvent.click(screen.getByRole('button', { name: `Sell All: 4 Ornaments for ${4 * prices.ornaments} Holiday Cheer` }));
    expect(cheer()).toBe(2 * prices.garlands + prices.candles + 4 * prices.ornaments);
  });

  it('offers the daily bonus on the bar only with the Wreath Sign', () => {
    const { unmount } = render(<Harness />);
    expect(screen.queryByRole('region', { name: 'Daily bonus' })).toBeNull();
    unmount();

    render(<Harness initialState={{ holidayCheer: 0, upgrades: upgradesOwning('wreath_sign') }} />);
    const bonus = screen.getByRole('region', { name: 'Daily bonus' });
    fireEvent.click(within(bonus).getByRole('button', { name: /Claim daily bonus/ }));
    expect(cheer()).toBe(EVENT_CONSTANTS.DAILY_BONUS_BASE);
    expect(within(bonus).getByRole('button', { name: 'Claimed. Come back tomorrow!' })).toBeDisabled();
  });

  it('shows Golden Bell income once the bell is owned', () => {
    render(<Harness initialState={{ upgrades: upgradesOwning('wreath_sign', 'golden_bell_counter'), passiveCheerPerSecond: 0.1 }} />);
    const bell = screen.getByRole('region', { name: 'Golden Bell income' });
    expect(within(bell).getByText('1 Holiday Cheer every 10 seconds')).toBeInTheDocument();
  });

  it('leaves the sales milestones to the achievements', () => {
    render(<Harness initialState={{ totalTreesSold: 60 }} />);
    expect(screen.queryByRole('region', { name: 'Sales milestones' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Claim .* reward/ })).toBeNull();
  });
});
