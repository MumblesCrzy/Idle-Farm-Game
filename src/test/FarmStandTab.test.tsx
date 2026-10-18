/**
 * Tests for the Farm Stand tab, driven by the real pumpkin event hook.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import FarmStandTab from '../components/FarmStandTab';
import { usePumpkinEvent } from '../hooks/usePumpkinEvent';
import { ALL_PUMPKIN_UPGRADES, PUMPKIN_EVENT_CONSTANTS } from '../data/pumpkinEventData';
import { getPumpkinPrice, getPumpkinSaleCandyCorn, getSaleMultiplier, floorCandyCorn } from '../utils/pumpkinPricing';
import { formatNumber } from '../utils/gameCalculations';
import type { EventUpgrade } from '../types/eventUpgrades';
import type { PumpkinEventState, PumpkinMaterials } from '../types/pumpkinEvent';

/** Renders the tab with the real hook, plus the balance and demand for checking */
function Harness({ initialState }: { initialState?: Partial<PumpkinEventState> }) {
  const event = usePumpkinEvent({ initialState });
  return (
    <>
      <output data-testid="candy-corn">{event.candyCorn}</output>
      <output data-testid="demand">{event.demandMultiplier}</output>
      <FarmStandTab event={event} formatNumber={formatNumber} />
    </>
  );
}

const candyCorn = () => Number(screen.getByTestId('candy-corn').textContent);
const demand = () => Number(screen.getByTestId('demand').textContent);

const upgradesOwning = (...ids: string[]): EventUpgrade[] =>
  ALL_PUMPKIN_UPGRADES.map(u => ({ ...u, owned: u.owned || ids.includes(u.id) }));

const materials = (goods: Partial<PumpkinMaterials>): PumpkinMaterials =>
  ({ seeds: 0, pulp: 0, vines: 0, pies: 0, candles: 0, stencils: 0, ...goods });

/** The Candy Corn in an accessible name such as "Sell All: 3 Pies for 12 Candy Corn" */
const amountIn = (element: HTMLElement) =>
  Number(/for ([\d.]+) Candy Corn/.exec(element.getAttribute('aria-label') ?? '')?.[1]);

describe('FarmStandTab', () => {
  it('shows the demand multiplier', () => {
    render(<Harness />);
    expect(screen.getByText(`×${demand().toFixed(2)}`)).toBeInTheDocument();
    expect(screen.getByText('(rises toward Halloween)')).toBeInTheDocument();
  });

  it('sells the selected pumpkins, Normal first, for the total the card shows', () => {
    const upgrades = upgradesOwning('bunting');
    render(
      <Harness
        initialState={{
          upgrades,
          inventory: { sugarPie_normal_plain: 3, sugarPie_blueRibbon_plain: 2, carver_normal_lantern: 1 },
        }}
      />
    );

    // One card per variety and finish in stock
    expect(screen.getByRole('region', { name: "Carver Jack-o'-Lantern" })).toBeInTheDocument();
    const card = screen.getByRole('region', { name: 'Sugar Pie Pumpkin' });
    expect(within(card).getByText('3 Normal')).toBeInTheDocument();
    expect(within(card).getByText('2 Blue Ribbon')).toBeInTheDocument();

    fireEvent.change(within(card).getByRole('slider', { name: 'Number of Sugar Pie Pumpkin to sell' }), {
      target: { value: '4' },
    });
    expect(within(card).getByText(/Sell: 4 \/ 5/)).toBeInTheDocument();

    const sellSelected = within(card).getByRole('button', { name: /^Sell Selected/ });
    const shown = amountIn(sellSelected);
    // Three Normal, then one Blue Ribbon, each priced by the pricing module
    expect(shown).toBe(
      getPumpkinSaleCandyCorn('sugarPie_normal_plain', 3, upgrades, demand()) +
      getPumpkinSaleCandyCorn('sugarPie_blueRibbon_plain', 1, upgrades, demand())
    );
    expect(within(card).getByText(/Sell: 4 \/ 5/).textContent).toContain(`(${shown}`);

    fireEvent.click(sellSelected);

    expect(candyCorn()).toBe(shown);
    const after = screen.getByRole('region', { name: 'Sugar Pie Pumpkin' });
    expect(within(after).queryByText(/Normal$/)).toBeNull();
    expect(within(after).getByText('1 Blue Ribbon')).toBeInTheDocument();
  });

  it("sells a whole card with Sell All for the card's total", () => {
    render(<Harness initialState={{ inventory: { carver_normal_carved: 2, carver_blueRibbon_carved: 1 } }} />);

    const card = screen.getByRole('region', { name: 'Carved Carver Pumpkin' });
    const sellAll = within(card).getByRole('button', { name: /^Sell All/ });
    const shown = amountIn(sellAll);
    fireEvent.click(sellAll);

    expect(candyCorn()).toBe(shown);
    expect(screen.queryByRole('region', { name: 'Carved Carver Pumpkin' })).toBeNull();
    expect(screen.getByText('No pumpkins on the stand')).toBeInTheDocument();
  });

  it('sells every pumpkin for the amount the Sell all button shows', () => {
    const inventory = { sugarPie_normal_plain: 4, sugarPie_normal_candlelit: 2, carver_blueRibbon_lantern: 1 };
    const upgrades = upgradesOwning('bunting');
    render(<Harness initialState={{ upgrades, inventory }} />);

    const sellAll = screen.getByRole('button', { name: /^Sell all pumpkins/ });
    const shown = amountIn(sellAll);
    const value = Object.entries(inventory)
      .reduce((sum, [key, quantity]) => sum + getPumpkinPrice(key, upgrades, demand()) * quantity, 0);
    expect(shown).toBe(floorCandyCorn(value * getSaleMultiplier(upgrades)));

    fireEvent.click(sellAll);

    expect(candyCorn()).toBe(shown);
    expect(screen.queryByRole('button', { name: /^Sell all pumpkins/ })).toBeNull();
  });

  it('sells pies, candles and stencils at their listed prices', () => {
    const { GOOD_PRICES } = PUMPKIN_EVENT_CONSTANTS;
    render(<Harness initialState={{ materials: materials({ pies: 3, candles: 2 }) }} />);

    const pies = screen.getByRole('region', { name: 'Pumpkin Pies' });
    expect(within(pies).getByText('In Stock: 3')).toBeInTheDocument();
    fireEvent.click(within(pies).getByRole('button', { name: `Sell 1 Pumpkin Pie for ${GOOD_PRICES.pies} Candy Corn` }));
    expect(candyCorn()).toBe(GOOD_PRICES.pies);
    expect(within(pies).getByText('In Stock: 2')).toBeInTheDocument();

    const candles = screen.getByRole('region', { name: 'Candles' });
    fireEvent.click(within(candles).getByRole('button', { name: /^Sell All/ }));
    expect(candyCorn()).toBe(GOOD_PRICES.pies + 2 * GOOD_PRICES.candles);
    expect(within(candles).getByText('In Stock: 0')).toBeInTheDocument();

    const stencils = screen.getByRole('region', { name: 'Stencils' });
    expect(within(stencils).getByRole('button', { name: /^Sell 1/ })).toBeDisabled();
    expect(within(stencils).getByRole('button', { name: /^Sell All/ })).toBeDisabled();
  });

  it('offers the daily bonus only with the Chalkboard Sign', () => {
    const { unmount } = render(<Harness />);
    expect(screen.queryByRole('button', { name: /Claim daily bonus/ })).toBeNull();
    unmount();

    render(<Harness initialState={{ upgrades: upgradesOwning('chalkboard_sign') }} />);
    const claim = screen.getByRole('button', { name: /Claim daily bonus/ });
    expect(claim).toBeEnabled();

    fireEvent.click(claim);

    expect(candyCorn()).toBe(PUMPKIN_EVENT_CONSTANTS.DAILY_BONUS);
    expect(screen.getByRole('button', { name: /Claim daily bonus/ })).toBeDisabled();
    expect(screen.getByText(/Come back tomorrow/)).toBeInTheDocument();
  });

  it('shows Hayride income once the Hayride is owned', () => {
    const { unmount } = render(<Harness />);
    expect(screen.queryByRole('region', { name: 'Hayride income' })).toBeNull();
    unmount();

    render(<Harness initialState={{ upgrades: upgradesOwning('chalkboard_sign', 'hayride') }} />);
    const hayride = screen.getByRole('region', { name: 'Hayride income' });
    expect(hayride).toHaveTextContent('+0.1');
    expect(hayride).toHaveTextContent('1 Candy Corn every 10 seconds');
  });

  it('lists the stand upgrades priced in Candy Corn', () => {
    render(<Harness />);
    expect(screen.getByRole('heading', { name: 'Stand Upgrades' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Autumn Bunting/ })).toHaveTextContent('Candy Corn');
    expect(screen.queryByRole('button', { name: /^Compost Heap/ })).toBeNull();
  });
});
