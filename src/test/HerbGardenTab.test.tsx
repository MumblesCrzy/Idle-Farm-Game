import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import HerbGardenTab from '../components/HerbGardenTab';
import { createInitialSpringState, useSpringEvent } from '../hooks/useSpringEvent';
import { ALL_SPRING_UPGRADES } from '../data/springEventData';
import type { HerbKind, HerbSlot, SpringEventState } from '../types/springEvent';

const format = (n: number) => String(Math.floor(n));

/** The tab on top of the real event hook, so clicks change real state */
function GardenHarness({ initialState }: { initialState?: Partial<SpringEventState> }) {
  const event = useSpringEvent({ initialState });
  return <HerbGardenTab event={event} formatNumber={format} />;
}

/** Saved upgrades with these owned, on top of the ones owned from the start */
const owning = (...ids: string[]) =>
  ALL_SPRING_UPGRADES.map(u => ({ ...u, owned: u.owned || ids.includes(u.id) }));

const withHerbs = (slots: Partial<Record<HerbKind, HerbSlot>>) => ({ ...createInitialSpringState().herbs, ...slots });

/** The number shown next to a label in the stock chips */
const stock = (label: string) =>
  within(screen.getByRole('list', { name: 'Sprigs in stock' })).getByText(label).nextElementSibling?.textContent;

/** The tile of one herb */
const tile = (name: string) => screen.getByRole('heading', { name }).closest('li') as HTMLElement;

describe('HerbGardenTab', () => {
  it('starts with Mint planted and the other three to plant', () => {
    render(<GardenHarness />);

    expect(within(tile('Mint')).getByText('0 / 10 sprigs')).toBeInTheDocument();
    expect(within(tile('Mint')).getByText('Next sprig in 20 days')).toBeInTheDocument();
    expect(within(tile('Mint')).getByText(/a sprig every 20 days/)).toBeInTheDocument();

    const basil = screen.getByRole('button', { name: /^Plant Basil for 150 Petals/ });
    expect(basil).toBeDisabled();
    expect(basil.getAttribute('aria-label')).toContain('Not enough Petals');
    expect(screen.getByRole('button', { name: /^Plant Chamomile for 300 Petals/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Plant Lavender for 500 Petals/ })).toBeInTheDocument();
  });

  it('gathers a slot into the stock', () => {
    render(<GardenHarness initialState={{ herbs: withHerbs({ mint: { sprigs: 7, growth: 8 } }) }} />);
    expect(within(tile('Mint')).getByText('Next sprig in 12 days')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Gather 7 sprigs of Mint' }));

    expect(stock('Mint')).toBe('7');
    expect(within(tile('Mint')).getByText('0 / 10 sprigs')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gather 0 sprigs of Mint' })).toBeDisabled();
  });

  it('marks a full slot as waiting to be gathered', () => {
    render(<GardenHarness initialState={{ herbs: withHerbs({ mint: { sprigs: 10, growth: 0 } }) }} />);

    expect(within(tile('Mint')).getByText('10 / 10 sprigs · full')).toBeInTheDocument();
    expect(within(tile('Mint')).getByText('Waiting: gather to keep it growing')).toBeInTheDocument();
  });

  it('gathers every planted herb with Gather All', () => {
    render(
      <GardenHarness
        initialState={{
          herbs: withHerbs({ mint: { sprigs: 3, growth: 0 }, lavender: { sprigs: 2, growth: 0 } }),
          upgrades: owning('unlock_lavender'),
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Gather All: 5 sprigs' }));

    expect(stock('Mint')).toBe('3');
    expect(stock('Lavender')).toBe('2');
    expect(screen.queryByRole('button', { name: /^Gather All/ })).toBeNull();
  });

  it('plants an herb with enough Petals', () => {
    render(<GardenHarness initialState={{ petals: 150 }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Plant Basil for 150 Petals' }));

    expect(within(tile('Basil')).getByText('0 / 10 sprigs')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Plant Basil/ })).toBeNull();
  });

  it('holds 25 with the Trellis, two at a time with the Second Row, and faster with the Watering Can', () => {
    const upgrades = owning('trellis', 'second_row').map(u => u.id === 'watering_can' ? { ...u, owned: true, level: 2 } : u);
    render(<GardenHarness initialState={{ upgrades }} />);

    expect(within(tile('Mint')).getByText('0 / 25 sprigs')).toBeInTheDocument();
    expect(within(tile('Mint')).getByText(/a sprig every 15.4 days, 2 at a time/)).toBeInTheDocument();
  });

  it('names the Gnome Crew and what it is doing once hired', () => {
    const { unmount } = render(<GardenHarness />);
    expect(screen.getByText(/Gnome Crew gathers any slot that fills/)).toBeInTheDocument();
    unmount();

    render(<GardenHarness initialState={{ upgrades: owning('gnome_crew'), currentCrewAction: { type: 'gather', herb: 'chamomile' } }} />);
    expect(screen.getByText('Gnome Crew (Active)')).toBeInTheDocument();
    expect(screen.getByText('Gather Chamomile')).toBeInTheDocument();
  });

  it('shows the Garden upgrades without the herb unlocks', () => {
    render(<GardenHarness />);

    expect(screen.getByRole('heading', { name: 'Garden Upgrades' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Watering Can/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Trellis/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Second Row/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Rain Barrel/ })).toBeNull();
  });
});
