import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import PottingShedTab from '../components/PottingShedTab';
import { createInitialSpringState, useSpringEvent } from '../hooks/useSpringEvent';
import { ALL_SPRING_UPGRADES } from '../data/springEventData';
import type { SpringEventState, SpringMaterials } from '../types/springEvent';

const format = (n: number) => String(Math.floor(n));

/** The tab on top of the real event hook, so clicks change real state */
function ShedHarness({ initialState }: { initialState?: Partial<SpringEventState> }) {
  const event = useSpringEvent({ initialState });
  return <PottingShedTab event={event} formatNumber={format} />;
}

/** Saved upgrades with these owned, on top of the ones owned from the start */
const owning = (...ids: string[]) =>
  ALL_SPRING_UPGRADES.map(u => ({ ...u, owned: u.owned || ids.includes(u.id) }));

const stock = (materials: Partial<SpringMaterials>): SpringMaterials => ({ ...createInitialSpringState().materials, ...materials });

/** The recipe card with this name */
const recipe = (name: string) => screen.getByRole('heading', { name }).closest('li') as HTMLElement;

describe('PottingShedTab', () => {
  it('steeps Mint Tea and counts the tins in stock', () => {
    render(<ShedHarness initialState={{ materials: stock({ mint: 7 }) }} />);
    expect(within(recipe('Mint Tea')).getByText('0 tins in stock · sells for 4 Petals')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Craft Mint Tea ×1: uses 3 mint to make 1 tin of Mint Tea$/ }));

    expect(within(recipe('Mint Tea')).getByText('1 tin in stock · sells for 4 Petals')).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Materials' })).getByText('Mint').nextElementSibling).toHaveTextContent('4');
  });

  it('crafts as many as the materials allow with Max', () => {
    render(<ShedHarness initialState={{ materials: stock({ mint: 10 }) }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Craft as many as possible' }));
    fireEvent.click(screen.getByRole('button', { name: /^Craft Mint Tea ×3/ }));

    expect(within(recipe('Mint Tea')).getByText('3 tins in stock · sells for 4 Petals')).toBeInTheDocument();
  });

  it('asks for Basil before Pesto, and the Packet Press before Seed Packets', () => {
    render(<ShedHarness initialState={{ materials: stock({ seeds: 9 }) }} />);

    const pesto = screen.getByRole('button', { name: 'Pesto: plant Basil in the Herb Garden first' });
    expect(pesto).toBeDisabled();
    expect(pesto).toHaveTextContent('No basil yet');

    const packets = screen.getByRole('button', { name: 'Seed Packets: locked, requires Packet Press' });
    expect(packets).toBeDisabled();
    expect(within(recipe('Seed Packets')).getByText(/Needs the Packet Press/)).toBeInTheDocument();
  });

  it('makes Pesto once Basil is planted', () => {
    render(<ShedHarness initialState={{ materials: stock({ basil: 3 }), upgrades: owning('unlock_basil') }} />);
    fireEvent.click(screen.getByRole('button', { name: /^Craft Pesto ×1/ }));
    expect(within(recipe('Pesto')).getByText('1 jar in stock · sells for 5 Petals')).toBeInTheDocument();
  });

  it('arranges, scents and ties plain bunches at the Finishing Station', () => {
    const inventory = { tulip_normal_plain: 3 };
    render(<ShedHarness initialState={{ inventory, materials: stock({ greenery: 2, lavender: 2 }) }} />);
    expect(screen.getByRole('button', { name: 'Tulips: 3 plain bunches' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: /^Arrange a bunch of Tulips/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Scent a bunch of Tulips/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Make a Gift Bouquet from a bunch of Tulips/ }));

    expect(screen.getByText(/Tulips in stock: 0 plain · 1 arranged · 1 scented · 1 Tulip Gift Bouquets/)).toBeInTheDocument();
    // Greenery and lavender are spent
    expect(screen.getByRole('button', { name: /^Arrange a bunch of Tulips. Uses 1 greenery. No plain Tulips/ })).toBeDisabled();
  });

  it('needs greenery to arrange and lavender to scent', () => {
    render(<ShedHarness initialState={{ inventory: { tulip_normal_plain: 1 }, materials: stock({ greenery: 1 }) }} />);
    expect(screen.getByRole('button', { name: /^Arrange a bunch of Tulips. Uses 1 greenery$/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /^Scent a bunch of Tulips. Uses 1 lavender. Not enough lavender/ })).toBeDisabled();
  });

  it('keeps flowers that are not unlocked out of the station', () => {
    render(<ShedHarness />);
    expect(screen.getByRole('button', { name: 'Roses: not unlocked yet' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Daffodils: not unlocked yet' })).toBeDisabled();
  });

  it('shows what the Gnome Crew is doing once hired', () => {
    const { unmount } = render(<ShedHarness />);
    expect(screen.getByText(/Buy the Gnome Crew/)).toBeInTheDocument();
    unmount();

    render(<ShedHarness initialState={{ upgrades: owning('gnome_crew', 'cart_loader'), currentCrewAction: { type: 'craft', recipeId: 'mint_tea' } }} />);
    const crew = screen.getByRole('region', { name: 'Gnome Crew' });
    expect(within(crew).getByText('Gnome Crew (Active)')).toBeInTheDocument();
    expect(within(crew).getByText('1 job per second')).toBeInTheDocument();
    expect(within(crew).getByText('Steep Mint Tea')).toBeInTheDocument();
    expect(within(crew).getByText(/and loads the Cart/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'The Gnome Crew is working on this' })).toBeInTheDocument();
  });

  it('shows the Shed upgrades, with Busy Gnomes waiting for the crew', () => {
    render(<ShedHarness />);
    expect(screen.getByRole('heading', { name: 'Shed Upgrades' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Packet Press/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Gnome Crew/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Busy Gnomes/ })).toBeNull();
  });
});
