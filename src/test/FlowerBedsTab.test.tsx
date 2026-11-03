import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import FlowerBedsTab from '../components/FlowerBedsTab';
import { useSpringEvent } from '../hooks/useSpringEvent';
import { ALL_SPRING_UPGRADES } from '../data/springEventData';
import type { FlowerBed, FlowerQuality, FlowerVariety, SpringEventState } from '../types/springEvent';

const format = (n: number) => String(Math.floor(n));

/** The tab on top of the real event hook, so clicks change real state */
function BedsHarness({ initialState }: { initialState?: Partial<SpringEventState> }) {
  const event = useSpringEvent({ initialState });
  return <FlowerBedsTab event={event} formatNumber={format} />;
}

/** Saved upgrades with these owned, on top of the ones owned from the start */
const owning = (...ids: string[]) =>
  ALL_SPRING_UPGRADES.map(u => ({ ...u, owned: u.owned || ids.includes(u.id) }));

const emptyBed = (index: number): FlowerBed => ({
  id: `flower_bed_${index}`,
  variety: null,
  growth: 0,
  growthTime: 0,
  quality: 'normal',
  harvestReady: false,
});

const readyBed = (index: number, variety: FlowerVariety = 'tulip', quality: FlowerQuality = 'normal'): FlowerBed => ({
  ...emptyBed(index),
  variety,
  growth: 150,
  growthTime: 150,
  quality,
  harvestReady: true,
});

/** The number shown next to a label in the stock chips */
const stock = (label: string) =>
  within(screen.getByRole('list', { name: 'Stock' })).getByText(label).nextElementSibling?.textContent;

describe('FlowerBedsTab', () => {
  it('plants the selected flower in an empty bed', () => {
    render(<BedsHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'Plant Tulips in bed 1' }));

    expect(screen.queryByRole('button', { name: 'Plant Tulips in bed 1' })).toBeNull();
    const growth = screen.getByRole('progressbar', { name: 'Tulips in bed 1 growth' });
    expect(growth).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByText('0% · 150 days left')).toBeInTheDocument();
    // The other beds are still empty
    expect(screen.getByRole('button', { name: 'Plant Tulips in bed 2' })).toBeInTheDocument();
  });

  it('harvests a ready bed into the stock', () => {
    render(<BedsHarness initialState={{ beds: [readyBed(0), emptyBed(1)] }} />);
    expect(stock('Tulips')).toBe('0');

    fireEvent.click(screen.getByRole('button', { name: 'Harvest Tulips from bed 1' }));

    expect(screen.getByRole('button', { name: 'Plant Tulips in bed 1' })).toBeInTheDocument();
    expect(stock('Tulips')).toBe('1');
    expect(stock('Greenery')).toBe('1');
    expect(stock('Seeds')).toBe('2');
  });

  it('counts bunches in every finish in the stock chips', () => {
    render(<BedsHarness initialState={{ inventory: { rose_normal_plain: 2, rose_prize_bouquet: 1, tulip_normal_arranged: 4 } }} />);
    expect(stock('Roses')).toBe('3');
    expect(stock('Tulips')).toBe('4');
    expect(stock('Daffodils')).toBe('0');
  });

  it('marks a Prize Bloom with a badge', () => {
    render(<BedsHarness initialState={{ beds: [readyBed(0, 'tulip', 'prize'), readyBed(1)] }} />);

    expect(screen.getAllByText('Prize Bloom')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Harvest Prize Bloom Tulips from bed 1' })).toBeInTheDocument();
    expect(screen.getAllByText('Ready to harvest')).toHaveLength(2);
  });

  it('unlocks Daffodils with enough Petals and selects them', () => {
    render(<BedsHarness initialState={{ petals: 300 }} />);
    expect(screen.getByRole('button', { name: /^Tulip,/ })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Unlock Daffodils for 200 Petals' }));

    expect(screen.getByRole('button', { name: /^Daffodil,/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^Tulip,/ })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Plant Daffodils in bed 1' })).toBeInTheDocument();
    // 100 left is not enough for Roses
    expect(screen.getByRole('button', { name: /^Unlock Roses for 1000 Petals/ })).toBeDisabled();
  });

  it('cannot unlock a flower without enough Petals', () => {
    render(<BedsHarness initialState={{ petals: 199 }} />);

    const daffodils = screen.getByRole('button', { name: /^Unlock Daffodils for 200 Petals/ });
    expect(daffodils).toBeDisabled();
    expect(daffodils.getAttribute('aria-label')).toContain('Not enough Petals');
  });

  it("notes that Roses are the Mother's Day flower", () => {
    render(<BedsHarness />);

    const roses = screen.getByRole('button', { name: /^Unlock Roses/ });
    expect(roses).toHaveAccessibleDescription(/Mother's Day flower: 6 Petals a bunch/);
  });

  it('hides Harvest All and Plant All without the Trug and the Dibber', () => {
    render(<BedsHarness initialState={{ beds: [readyBed(0), emptyBed(1), emptyBed(2)] }} />);

    expect(screen.queryByRole('button', { name: /^Harvest All/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Plant All/ })).toBeNull();
  });

  it('plants every empty bed and harvests every ready one with the Trug and the Dibber', () => {
    render(
      <BedsHarness
        initialState={{
          beds: [readyBed(0), emptyBed(1), emptyBed(2)],
          upgrades: owning('trug', 'dibber'),
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Plant All: Tulips in 2 empty beds' }));
    expect(screen.queryAllByRole('button', { name: /^Plant Tulips in bed/ })).toHaveLength(0);
    expect(screen.getAllByRole('progressbar')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Harvest All: 1 ready bed' }));
    expect(screen.queryByRole('button', { name: /^Harvest All/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Plant Tulips in bed 1' })).toBeInTheDocument();
    expect(stock('Tulips')).toBe('1');
  });

  it('shows the Bed upgrades without the flower unlocks', () => {
    render(<BedsHarness />);

    expect(screen.getByRole('heading', { name: 'Bed Upgrades' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Rain Barrel/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Trug/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Daffodil Bulbs/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Watering Can/ })).toBeNull();
  });
});
