import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import MarketStallTab from '../components/MarketStallTab';
import { createInitialSpringState, springDemandMultiplier, useSpringEvent } from '../hooks/useSpringEvent';
import { ALL_SPRING_UPGRADES, SPRING_EVENT_CONSTANTS as C } from '../data/springEventData';
import { getCartPetals, getFlowerSalePetals } from '../utils/springPricing';
import type { SpringEventState, SpringMaterials } from '../types/springEvent';

const format = (n: number) => String(Math.floor(n));

/** The tab on top of the real event hook, so clicks change real state; it reports the event out */
let current: ReturnType<typeof useSpringEvent> | undefined;
function StallHarness({ initialState }: { initialState?: Partial<SpringEventState> }) {
  const event = useSpringEvent({ initialState });
  current = event;
  return <MarketStallTab event={event} formatNumber={format} />;
}

/** Saved upgrades with these owned, on top of the ones owned from the start */
const owning = (...ids: string[]) =>
  ALL_SPRING_UPGRADES.map(u => ({ ...u, owned: u.owned || ids.includes(u.id) }));

const stock = (materials: Partial<SpringMaterials>): SpringMaterials => ({ ...createInitialSpringState().materials, ...materials });

const cartText = () => screen.getByRole('list', { name: 'On the Cart' }).textContent;

describe('MarketStallTab', () => {
  it('shows a card for each unlocked flower', () => {
    const { unmount } = render(<StallHarness />);
    expect(screen.getByRole('region', { name: 'Tulips' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Roses' })).toBeNull();
    unmount();

    render(<StallHarness initialState={{ upgrades: owning('unlock_daffodil', 'unlock_rose') }} />);
    expect(screen.getAllByRole('region', { name: /^(Tulips|Daffodils|Roses)$/ })).toHaveLength(3);
  });

  it('sells a whole row, normal bunches and Prize Blooms, at the priced amount', () => {
    const inventory = { tulip_normal_plain: 3, tulip_prize_plain: 1 };
    render(<StallHarness initialState={{ inventory }} />);
    const upgrades = current!.eventState.upgrades;
    const demand = current!.demandMultiplier;
    const value = getFlowerSalePetals('tulip_normal_plain', 3, upgrades, demand) + getFlowerSalePetals('tulip_prize_plain', 1, upgrades, demand);

    const tulips = screen.getByRole('region', { name: 'Tulips' });
    expect(within(tulips).getByText('4 in stock')).toBeInTheDocument();
    expect(within(tulips).getByTitle('1 of them is a Prize Bloom, worth double')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: `Sell 4 Tulips for ${value} Petals` }));

    expect(current!.petals).toBe(value);
    expect(current!.totalFlowersSold).toBe(4);
    expect(within(tulips).getByText('0 in stock')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sell: no Plain Tulips in stock' })).toBeDisabled();
  });

  it('puts a row on the Cart, and shows what the Cart will sell for', () => {
    render(<StallHarness initialState={{ inventory: { tulip_normal_bouquet: 2 } }} />);
    expect(cartText()).toMatch(/Empty/);

    fireEvent.click(screen.getByRole('button', { name: 'Put 2 Tulip Gift Bouquets on the Cart' }));

    expect(cartText()).toContain('2 Tulip Gift Bouquets');
    const value = getCartPetals(current!.cart, current!.eventState.upgrades, current!.demandMultiplier);
    expect(screen.getByText(new RegExp(`Sells on Market Day for ${value}`))).toBeInTheDocument();
    expect(current!.eventState.inventory).toEqual({});
  });

  it('loads everything and unloads it again, leaving greenery and lavender for finishing', () => {
    render(<StallHarness initialState={{ inventory: { tulip_normal_plain: 2 }, materials: stock({ mintTea: 3, greenery: 4 }) }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Everything to the Cart' }));
    expect(cartText()).toContain('2 Tulips');
    expect(cartText()).toContain('3 Mint Tea');
    expect(current!.materials.greenery).toBe(4);

    fireEvent.click(screen.getByRole('button', { name: 'Unload the Cart back into stock' }));
    expect(cartText()).toMatch(/Empty/);
    expect(current!.eventState.inventory).toEqual({ tulip_normal_plain: 2 });
    expect(current!.materials.mintTea).toBe(3);
  });

  it('counts the rest of a full Cart as more', () => {
    const cart = {
      bunches: { tulip_normal_plain: 1, tulip_normal_arranged: 1, tulip_normal_scented: 1, tulip_normal_bouquet: 1 },
      goods: { pesto: 1, mintTea: 2 },
    };
    render(<StallHarness initialState={{ cart }} />);
    const chips = within(screen.getByRole('list', { name: 'On the Cart' })).getAllByRole('listitem');
    expect(chips).toHaveLength(4);
    expect(chips[3]).toHaveTextContent('and 3 more');
  });

  it('shows the Market Day countdown and the last Market Day', () => {
    const market = { daysUntilMarket: 23, marketsHeld: 2, lastResult: { bunches: 9, goods: 4, petals: 180 } };
    render(<StallHarness initialState={{ market }} />);
    expect(screen.getByText('Market Day in 23 days')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Days to Market Day' })).toHaveAttribute('aria-valuenow', String(C.MARKET_DAY_INTERVAL - 23));
    expect(screen.getByText(/Last Market Day: 13 sold for 180/)).toBeInTheDocument();
  });

  it('sells every bunch with Sell all bunches, and waits when there are none', () => {
    const { unmount } = render(<StallHarness />);
    expect(screen.getByRole('button', { name: 'Sell all bunches: none in stock' })).toBeDisabled();
    unmount();

    render(<StallHarness initialState={{ inventory: { tulip_normal_plain: 2, tulip_normal_bouquet: 1 } }} />);
    fireEvent.click(screen.getByRole('button', { name: /^Sell all bunches: 3 for/ }));
    expect(current!.totalFlowersSold).toBe(3);
    expect(current!.eventState.inventory).toEqual({});
  });

  it('sells goods or puts them on the Cart', () => {
    render(<StallHarness initialState={{ materials: stock({ pesto: 2, lavender: 3 }) }} />);

    fireEvent.click(screen.getByRole('button', { name: `Sell all 2 Pesto for ${2 * C.GOOD_PRICES.pesto} Petals` }));
    fireEvent.click(screen.getByRole('button', { name: 'Put 3 Lavender on the Cart' }));

    expect(current!.petals).toBe(2 * C.GOOD_PRICES.pesto);
    expect(current!.cart.goods).toEqual({ lavender: 3 });
    expect(screen.getByRole('button', { name: 'Put 0 Lavender on the Cart' })).toBeDisabled();
  });

  it('shows the Busker and claims the Sandwich Board bonus once a day', () => {
    render(<StallHarness initialState={{ upgrades: owning('sandwich_board', 'busker'), passivePetalsPerSecond: 0.1 }} />);
    expect(screen.getByRole('region', { name: 'Busker income' })).toHaveTextContent('1 Petal every 10 seconds');

    fireEvent.click(screen.getByRole('button', { name: /Claim daily bonus/ }));
    expect(current!.petals).toBe(C.DAILY_BONUS);
    expect(screen.getByRole('button', { name: 'Claimed. Come back tomorrow!' })).toBeDisabled();
  });

  it('names the demand curve', () => {
    render(<StallHarness />);
    expect(screen.getByText(`×${springDemandMultiplier().toFixed(2)}`)).toBeInTheDocument();
  });
});
