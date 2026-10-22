import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import CarvingBarnTab from '../components/CarvingBarnTab';
import { usePumpkinEvent } from '../hooks/usePumpkinEvent';
import { ALL_PUMPKIN_UPGRADES } from '../data/pumpkinEventData';
import type { PumpkinEventState, PumpkinMaterials } from '../types/pumpkinEvent';

const format = (n: number) => String(Math.floor(n));

/** The tab on top of the real event hook, with the inventory written out for checks */
function BarnHarness({ initialState }: { initialState?: Partial<PumpkinEventState> }) {
  const event = usePumpkinEvent({ initialState });
  return (
    <>
      <CarvingBarnTab event={event} formatNumber={format} />
      <output data-testid="inventory">{JSON.stringify(event.eventState.inventory)}</output>
    </>
  );
}

const inventory = (): Record<string, number> =>
  JSON.parse(screen.getByTestId('inventory').textContent ?? '{}');

const withMaterials = (materials: Partial<PumpkinMaterials>): PumpkinMaterials => ({
  seeds: 0, pulp: 0, vines: 0, pies: 0, candles: 0, stencils: 0, ...materials,
});

/** Saved upgrades with these owned (and levels set), on top of the ones owned from the start */
const owning = (ids: string[], levels: Record<string, number> = {}) =>
  ALL_PUMPKIN_UPGRADES.map(u => ({
    ...u,
    owned: u.owned || ids.includes(u.id),
    level: levels[u.id] ?? u.level,
  }));

/** The number shown next to a label in the materials panel */
const material = (label: string) =>
  within(screen.getByRole('list', { name: 'Materials' })).getByText(label).nextElementSibling?.textContent;

const recipeCard = (name: string) => screen.getByRole('heading', { name }).closest('li') as HTMLElement;

describe('CarvingBarnTab', () => {
  it('crafts a recipe and updates the materials', () => {
    render(<BarnHarness initialState={{ materials: withMaterials({ pulp: 8, seeds: 3 }) }} />);

    fireEvent.click(screen.getByRole('button', { name: /^Craft Bake Pie ×1: uses 4 pulp and 1 seed to make 1 pie$/ }));

    expect(material('Pies')).toBe('1');
    expect(material('Pulp')).toBe('4');
    expect(material('Seeds')).toBe('2');
  });

  it('crafts the chosen quantity', () => {
    render(<BarnHarness initialState={{ materials: withMaterials({ seeds: 12 }) }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Craft 5 at a time' }));
    expect(screen.getByRole('button', { name: 'Craft 5 at a time' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: /^Craft Make Candles ×5/ }));

    expect(material('Candles')).toBe('5');
    expect(material('Seeds')).toBe('2');

    // Max crafts as many as the seeds left allow
    fireEvent.click(screen.getByRole('button', { name: 'Craft as many as possible' }));
    fireEvent.click(screen.getByRole('button', { name: /^Craft Make Candles ×1/ }));
    expect(material('Candles')).toBe('6');
    expect(material('Seeds')).toBe('0');
  });

  it('disables a recipe without enough materials', () => {
    render(<BarnHarness initialState={{ materials: withMaterials({ pulp: 3, seeds: 1 }) }} />);

    const bake = screen.getByRole('button', { name: /^Craft Bake Pie/ });
    expect(bake).toBeDisabled();
    expect(bake.getAttribute('aria-label')).toContain('Not enough materials');
  });

  it('disables a locked recipe and names the upgrade that unlocks it', () => {
    render(<BarnHarness initialState={{ materials: withMaterials({ vines: 5 }) }} />);

    const stencils = screen.getByRole('button', { name: 'Cut Stencils: locked, requires Stencil Table' });
    expect(stencils).toBeDisabled();
    expect(within(recipeCard('Cut Stencils')).getByText(/Requires Stencil Table/)).toBeInTheDocument();
  });

  it('unlocks the recipe once its upgrade is owned', () => {
    render(<BarnHarness initialState={{ materials: withMaterials({ vines: 1 }), upgrades: owning(['stencil_table']) }} />);

    fireEvent.click(screen.getByRole('button', { name: /^Craft Cut Stencils ×1/ }));

    expect(material('Stencils')).toBe('2');
    expect(material('Vines')).toBe('0');
  });

  it('carves a plain pumpkin into a carved one', () => {
    render(
      <BarnHarness
        initialState={{
          materials: withMaterials({ stencils: 1 }),
          inventory: { sugarPie_normal_plain: 2 },
        }}
      />
    );
    expect(screen.getByRole('button', { name: 'Sugar Pie: 2 plain pumpkins' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^Light a Sugar Pie pumpkin/ })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /^Carve a Sugar Pie pumpkin/ }));

    expect(inventory()).toEqual({ sugarPie_normal_plain: 1, sugarPie_normal_carved: 1 });
    expect(material('Stencils')).toBe('0');
    expect(screen.getByRole('button', { name: 'Sugar Pie: 1 plain pumpkin' })).toBeInTheDocument();
    // No stencils left to carve another
    expect(screen.getByRole('button', { name: /^Carve a Sugar Pie pumpkin/ })).toBeDisabled();
  });

  it("makes a Jack-o'-Lantern from the chosen variety", () => {
    render(
      <BarnHarness
        initialState={{
          materials: withMaterials({ stencils: 1, candles: 1 }),
          inventory: { carver_blueRibbon_plain: 1 },
        }}
      />
    );
    expect(screen.getByRole('button', { name: /^Make a Jack-o'-Lantern from a Sugar Pie pumpkin/ })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Carver: 1 plain pumpkin' }));
    fireEvent.click(screen.getByRole('button', { name: /^Make a Jack-o'-Lantern from a Carver pumpkin/ }));

    expect(inventory()).toEqual({ carver_blueRibbon_lantern: 1 });
    expect(material('Stencils')).toBe('0');
    expect(material('Candles')).toBe('0');
  });

  it('shows what the Scarecrow Crew is doing when it is owned', () => {
    render(
      <BarnHarness
        initialState={{
          upgrades: owning(['scarecrow_crew', 'busy_scarecrows'], { busy_scarecrows: 2 }),
          currentCrewAction: { type: 'craft', recipeId: 'make_candles' },
        }}
      />
    );

    const crew = screen.getByRole('region', { name: 'Scarecrow Crew' });
    expect(within(crew).getByText('Make Candles')).toBeInTheDocument();
    expect(within(crew).getByText('3 jobs per second')).toBeInTheDocument();
    // The recipe the crew is working on is marked
    expect(within(recipeCard('Make Candles')).getByRole('img', { name: 'Scarecrow Crew is working on this' })).toBeInTheDocument();
    expect(within(recipeCard('Bake Pie')).queryByRole('img', { name: 'Scarecrow Crew is working on this' })).toBeNull();
  });

  it('describes a crew decorating job', () => {
    render(
      <BarnHarness
        initialState={{
          upgrades: owning(['scarecrow_crew']),
          currentCrewAction: { type: 'decorate', finish: 'lantern' },
        }}
      />
    );

    const crew = screen.getByRole('region', { name: 'Scarecrow Crew' });
    expect(within(crew).getByText("Decorating a pumpkin: Jack-o'-Lantern")).toBeInTheDocument();
    expect(within(crew).getByText('1 job per second')).toBeInTheDocument();
  });

  it('asks for the Scarecrow Crew upgrade before showing a status', () => {
    render(<BarnHarness initialState={{ currentCrewAction: { type: 'craft', recipeId: 'make_candles' } }} />);

    const crew = screen.getByRole('region', { name: 'Scarecrow Crew' });
    expect(within(crew).getByText(/Buy the Scarecrow Crew upgrade/)).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Scarecrow Crew is working on this' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Barn Upgrades' })).toBeInTheDocument();
  });

  it('shows the Scarecrow Crew under the materials, above the recipes', () => {
    render(<BarnHarness initialState={{ upgrades: owning(['scarecrow_crew']) }} />);

    const crew = screen.getByRole('region', { name: 'Scarecrow Crew' });
    const materials = screen.getByRole('list', { name: 'Materials' });
    const recipes = screen.getByRole('heading', { name: 'Recipes' });
    expect(materials.compareDocumentPosition(crew) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(crew.compareDocumentPosition(recipes) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
