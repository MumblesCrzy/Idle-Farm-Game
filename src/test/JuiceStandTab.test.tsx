import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import JuiceStandTab from '../components/JuiceStandTab';
import { useSummerEvent, createInitialSummerState, type UseSummerEventReturn } from '../hooks/useSummerEvent';
import { ALL_SUMMER_UPGRADES } from '../data/summerEventData';
import type { SummerEventState, SummerMaterials } from '../types/summerEvent';

const format = (n: number) => String(Math.floor(n));

let latest: UseSummerEventReturn | undefined;

/** The tab on top of the real event hook, so clicks change real state */
function StandHarness({ initialState }: { initialState?: Partial<SummerEventState> }) {
  const event = useSummerEvent({ initialState });
  latest = event;
  return <JuiceStandTab event={event} formatNumber={format} />;
}

/** Saved upgrades with these owned, on top of the ones owned from the start */
const owning = (...ids: string[]) =>
  ALL_SUMMER_UPGRADES.map(u => ({ ...u, owned: u.owned || ids.includes(u.id) }));

const stock = (materials: Partial<SummerMaterials>): SummerMaterials => ({ ...createInitialSummerState().materials, ...materials });

/** The number shown next to a label in the materials chips */
const chip = (label: string) =>
  within(screen.getByRole('list', { name: 'Materials' })).getByText(label).nextElementSibling?.textContent;

describe('JuiceStandTab', () => {
  it('builds the Ice House from its tile, then shows its blocks and the next one coming', () => {
    const { unmount } = render(<StandHarness initialState={{ tickets: 450 }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Build the Ice House for 400 Tickets' }));
    expect(screen.getByRole('list', { name: '0 of 10 blocks of ice' })).toBeInTheDocument();
    expect(latest!.tickets).toBe(50);
    unmount();

    const poor = render(<StandHarness />);
    expect(screen.getByRole('button', { name: 'Build the Ice House for 400 Tickets. Not enough Tickets' })).toBeDisabled();
    poor.unmount();

    render(<StandHarness initialState={{ materials: stock({ ice: 7 }), iceGrowth: 8, upgrades: owning('unlock_ice_house') }} />);
    expect(screen.getByRole('list', { name: '7 of 10 blocks of ice' })).toBeInTheDocument();
    expect(screen.getByText(/A block every 20 days, next in 12\./)).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Next block of ice' })).toHaveAttribute('aria-valuenow', '40');
  });

  it('holds 25 with Sawdust Packing, and says when it is full', () => {
    render(<StandHarness initialState={{ materials: stock({ ice: 25 }), upgrades: owning('unlock_ice_house', 'sawdust_packing') }} />);
    expect(screen.getByRole('list', { name: '25 of 25 blocks of ice' })).toBeInTheDocument();
    expect(screen.getByText(/Full\. Use a block to start the next one\./)).toBeInTheDocument();
  });

  it('chills, carves and packs plain melons at the finishing table', () => {
    render(<StandHarness initialState={{
      inventory: { sugarBaby_normal_plain: 3 },
      materials: stock({ ice: 2, cups: 1 })
    }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Chill a Sugar Baby. Uses 1 block of ice' }));
    fireEvent.click(screen.getByRole('button', { name: 'Make a Picnic Basket from a Sugar Baby. Uses 1 block of ice and 1 cup of melon balls' }));

    expect(latest!.inventory).toEqual({ sugarBaby_normal_plain: 1, sugarBaby_normal_chilled: 1, sugarBaby_normal_basket: 1 });
    expect(chip('Ice')).toBe('0');
    expect(screen.getByRole('button', { name: 'Chill a Sugar Baby. Uses 1 block of ice. Not enough ice' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Carve a Sugar Baby. Uses 1 cup of melon balls. Not enough melon balls' })).toBeDisabled();
    // Crimson Sweets aren't unlocked yet
    expect(screen.getByRole('button', { name: 'Chill a Crimson Sweet. Uses 1 block of ice. Not unlocked yet' })).toBeDisabled();
  });

  it('crafts from split melons, and sells the Melon Baller on the Melon Balls card', () => {
    render(<StandHarness initialState={{ materials: stock({ splits: 5 }) }} />);

    expect(screen.getByRole('button', { name: 'Buy the Melon Baller for 300 Tickets, to make Melon Balls. Not enough Tickets' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /^Craft Agua Fresca ×1: uses 2 split melons to make 1 pitcher of Agua Fresca and 2 rinds$/ }));
    expect(chip('Splits')).toBe('3');
    expect(chip('Rinds')).toBe('2');
    expect(latest!.materials.agua).toBe(1);
    expect(screen.getByText('1 in stock · 6 Tickets, 9 in a Heatwave')).toBeInTheDocument();
  });

  it('crafts as many as the materials allow with Max', () => {
    render(<StandHarness initialState={{ materials: stock({ seeds: 13 }) }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Craft as many as possible' }));
    fireEvent.click(screen.getByRole('button', { name: /^Craft Roasted Seeds ×3/ }));
    expect(latest!.materials).toMatchObject({ seeds: 1, roasted: 3 });
  });

  it('shows the Picnic Crew at work once hired', () => {
    const { unmount } = render(<StandHarness />);
    expect(within(screen.getByRole('region', { name: 'Picnic Crew' })).getByText(/Hire the Picnic Crew/)).toBeInTheDocument();
    unmount();

    render(<StandHarness initialState={{ materials: stock({ splits: 4 }), upgrades: owning('picnic_crew') }} />);
    act(() => latest!.processPicnicCrew(1));
    const crew = screen.getByRole('region', { name: 'Picnic Crew' });
    expect(within(crew).getByText('Mix Agua Fresca')).toBeInTheDocument();
    expect(within(crew).getByText('1 job per second')).toBeInTheDocument();
  });

  it('lists the Stand upgrades, with Extra Hands hidden until the crew is hired', () => {
    render(<StandHarness initialState={{ tickets: 500 }} />);
    expect(screen.getByRole('heading', { name: 'Stand Upgrades' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Sawdust Packing/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Extra Hands/ })).toBeNull();
    // The Ice House and the Melon Baller are bought from their tile and their recipe card
    expect(screen.queryByRole('button', { name: /^Ice House/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Melon Baller/ })).toBeNull();
  });
});
