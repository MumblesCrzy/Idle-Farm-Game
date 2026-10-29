/**
 * Tests for the Growing tab's garden: a bed per crop with its own controls, the picked crop's
 * upgrades in the tool shed, and fruits behind their own switch.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ArchieProvider } from '../context/ArchieContext';
import GrowingTab from '../components/GrowingTab';
import { createAllCrops, formatNumber } from '../utils/gameCalculations';
import { getHarvesterInterval } from '../utils/gameLoopProcessors';
import { commitToGuild } from '../utils/guildCalculations';
import { DEFAULT_GUILD_STATE, type GuildState } from '../types/guilds';
import type { Veggie } from '../types/game';

/** Every crop, with the first three vegetables open */
const crops = (change: (crops: Veggie[]) => Veggie[] = c => c): Veggie[] => {
  const all = createAllCrops().map((crop, i) => ({ ...crop, unlocked: i < 3 }));
  return change(all);
};

interface Options {
  guildState?: GuildState;
  totalPlotsUsed?: number;
  maxPlots?: number;
}

const renderTab = (veggies: Veggie[], activeVeggie = 0, options: Options = {}) => {
  const handlers = {
    setActiveVeggie: vi.fn(),
    handleHarvest: vi.fn(),
    handleToggleSell: vi.fn(),
    handleToggleAutoHarvester: vi.fn(),
    handleSell: vi.fn(),
    handleRitualHarvestAll: vi.fn(),
    handleBuyFertilizer: vi.fn(),
    handleBuyHarvester: vi.fn(),
    handleBuyBetterSeeds: vi.fn(),
    handleBuyAdditionalPlot: vi.fn(),
    handleBuyHarvesterSpeed: vi.fn(),
    buyAutoPurchaser: vi.fn()
  };
  const { container } = render(
    <ArchieProvider>
      <GrowingTab
        veggies={veggies}
        activeVeggie={activeVeggie}
        totalPlotsUsed={options.totalPlotsUsed ?? 3}
        maxPlots={options.maxPlots ?? 10}
        money={1_000_000}
        knowledge={1_000_000}
        experience={100}
        globalAutoPurchaseTimer={0}
        heirloomOwned={false}
        beeYieldBonus={0}
        growthMultiplierOf={() => 20}
        {...handlers}
        handleBuyAutoPurchaser={(id: string) => (index: number) => handlers.buyAutoPurchaser(id, index)}
        formatNumber={formatNumber}
        guildState={options.guildState}
        upgradesSidebar={<div>Farm upgrades here</div>}
      />
    </ArchieProvider>
  );
  return { handlers, container };
};

/** A crop's sign, the button that picks it: its name, then how long it takes to grow */
const signOf = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name} ~`) });

/** The bed a crop's sign stands in */
const bedOf = (name: string) => signOf(name).closest('li') as HTMLElement;

const shedOf = (name: string) => screen.getByRole('region', { name: `${name} upgrades` });

/** A Grower with Fruit Cultivation, so the garden can switch to fruits */
const fruitGrower: GuildState = {
  ...DEFAULT_GUILD_STATE,
  status: 'committed',
  committedGuild: 'growers',
  purchasedUpgrades: ['growers_fruit_cultivation'],
  upgradeLevels: { growers_fruit_cultivation: 1 }
};

describe('GrowingTab', () => {
  it('shows the farm upgrades it is given', () => {
    renderTab(crops());
    expect(screen.getByText('Farm upgrades here')).toBeInTheDocument();
  });

  it('gives every vegetable a bed, and says what a locked one needs', () => {
    const veggies = crops();
    const vegetables = veggies.filter(v => v.cropType !== 'fruit');
    renderTab(veggies);

    const beds = screen.getByRole('list', { name: 'Vegetables' });
    expect(within(beds).getAllByRole('listitem')).toHaveLength(vegetables.length);
    expect(screen.getByText(`Unlocks at ${formatNumber(veggies[3].experienceToUnlock, 2)} Growing Experience`)).toBeInTheDocument();
  });

  it('asks for a larger farm when no plot is free', () => {
    renderTab(crops(), 0, { totalPlotsUsed: 10, maxPlots: 10 });
    expect(screen.getAllByText(/^Needs a larger farm/)).toHaveLength(7);
  });

  it('picks a crop from its sign, and marks the picked one', () => {
    const veggies = crops();
    const { handlers } = renderTab(veggies, 1);

    expect(signOf(veggies[1].name)).toHaveAttribute('aria-pressed', 'true');
    expect(signOf(veggies[0].name)).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(signOf(veggies[2].name));
    expect(handlers.setActiveVeggie).toHaveBeenCalledWith(2);
    expect(handlers.setActiveVeggie).toHaveBeenCalledTimes(1);
  });

  it('picks a crop with a click anywhere on its bed, while its buttons keep their own jobs', () => {
    const veggies = crops(c => c.map((crop, i) => i === 2 ? { ...crop, growth: 100 } : crop));
    const { handlers } = renderTab(veggies, 0);
    const bed = bedOf(veggies[2].name);

    fireEvent.click(within(bed).getByText('Ripe!'));
    fireEvent.click(bed);
    expect(handlers.setActiveVeggie).toHaveBeenCalledTimes(2);
    expect(handlers.setActiveVeggie).toHaveBeenLastCalledWith(2);

    handlers.setActiveVeggie.mockClear();
    fireEvent.click(within(bed).getByRole('button', { name: `Harvest ${veggies[2].name}` }));
    fireEvent.click(within(bed).getByRole('button', { name: `${veggies[2].name}: Sell. Click to Hold` }));
    expect(handlers.handleHarvest).toHaveBeenCalledWith(2);
    expect(handlers.handleToggleSell).toHaveBeenCalledWith(2);
    expect(handlers.setActiveVeggie).not.toHaveBeenCalled();

    // A button that can't act passes the click on to its bed
    fireEvent.click(within(bedOf(veggies[1].name)).getByRole('button', { name: `${veggies[1].name} is growing` }));
    expect(handlers.setActiveVeggie).toHaveBeenCalledWith(1);
  });

  it('leaves a locked bed unpicked', () => {
    const veggies = crops();
    const { handlers } = renderTab(veggies);
    fireEvent.click(screen.getByText(veggies[3].name).closest('li') as HTMLElement);
    expect(handlers.setActiveVeggie).not.toHaveBeenCalled();
  });

  it('shows how long a crop takes to grow on its sign', () => {
    const veggies = crops();
    renderTab(veggies);
    expect(signOf(veggies[0].name)).toHaveAccessibleName(`${veggies[0].name} ~5 days`);
    expect(within(signOf(veggies[0].name)).getByText('~5 days')).toBeInTheDocument();
  });

  it('harvests a ripe crop from its own bed', () => {
    const veggies = crops(c => c.map((crop, i) => i === 1 ? { ...crop, growth: 100 } : crop));
    const { handlers } = renderTab(veggies, 0);

    expect(within(bedOf(veggies[1].name)).getByText('Ripe!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: `${veggies[0].name} is growing` })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: `Harvest ${veggies[1].name}` }));
    expect(handlers.handleHarvest).toHaveBeenCalledWith(1);
  });

  it('switches a crop between Sell and Hold', () => {
    const veggies = crops(c => c.map((crop, i) => i === 2 ? { ...crop, sellEnabled: false } : crop));
    const { handlers } = renderTab(veggies);

    fireEvent.click(within(bedOf(veggies[1].name)).getByRole('button', { name: `${veggies[1].name}: Sell. Click to Hold` }));
    expect(handlers.handleToggleSell).toHaveBeenCalledWith(1);
    expect(within(bedOf(veggies[2].name)).getByRole('button', { name: `${veggies[2].name}: Hold. Click to Sell` })).toBeInTheDocument();
  });

  it('buys an Auto Harvester from the bed', () => {
    const veggies = crops();
    const { handlers } = renderTab(veggies);
    fireEvent.click(within(bedOf(veggies[2].name)).getByRole('button', {
      name: `Auto Harvester for ${veggies[2].name}: Buy · $${formatNumber(veggies[2].harvesterCost, 1)}`
    }));
    expect(handlers.handleBuyHarvester).toHaveBeenCalledWith(2);
  });

  it('keeps the stash and price off the beds, and shows them in the shed', () => {
    const veggies = crops(c => c.map((crop, i) => i === 0 ? { ...crop, stash: 142, salePrice: 7.77 } : crop));
    renderTab(veggies);

    const bed = bedOf(veggies[0].name);
    expect(bed.textContent).not.toContain('142');
    expect(bed.textContent).not.toContain('in stash');
    expect(bed.textContent).not.toContain(`$${formatNumber(veggies[0].salePrice, 2)}`);

    const shed = shedOf(veggies[0].name);
    expect(within(shed).getByText(`$${formatNumber(veggies[0].salePrice, 2)} each`)).toBeInTheDocument();
    expect(within(shed).getByText(/142 in stash/)).toBeInTheDocument();
    // How long it takes to grow is on the sign, not in the shed
    expect(within(shed).queryByText(/days/)).toBeNull();
  });

  it('shows each upgrade as its level alone, with a dot for its auto-buyer', () => {
    const veggies = crops(c => c.map((crop, i) => i === 0 ? {
      ...crop,
      additionalPlotLevel: 2,
      autoPurchasers: crop.autoPurchasers.map(ap =>
        ap.id === 'assistant' ? { ...ap, owned: true, active: true }
          : ap.id === 'cultivator' ? { ...ap, owned: true, active: false }
            : ap)
    } : crop));
    renderTab(veggies);
    const bed = bedOf(veggies[0].name);

    expect(within(bed).getByTitle(/^Fertilizer: level 0.*auto-buyer on$/)).toBeInTheDocument();
    expect(within(bed).getByTitle(/^Better Seeds: level 0, auto-buyer paused$/)).toBeInTheDocument();
    const plots = within(bed).getByTitle('Additional Plot: level 2, no auto-buyer');
    expect(plots.querySelector('b')).toHaveTextContent(/^2$/);
    expect(bed.textContent).not.toMatch(/\d\/\d/);
  });

  it('locks Harvester Speed until the crop has an Auto Harvester', () => {
    const veggies = crops();
    renderTab(veggies);

    const speed = within(bedOf(veggies[0].name)).getByTitle('Harvester Speed: needs an Auto Harvester');
    expect(speed.querySelector('b')).toHaveTextContent('-');
    const shed = shedOf(veggies[0].name);
    expect(within(shed).getByRole('button', { name: 'Harvester Speed: Locked until the crop has an Auto Harvester' })).toBeDisabled();
    expect(within(shed).getByRole('button', { name: /^Buy the Auto Harvester/ })).toBeEnabled();
  });

  it('buys upgrades for the picked crop in the shed', () => {
    const veggies = crops();
    const { handlers } = renderTab(veggies, 1);
    const shed = shedOf(veggies[1].name);

    fireEvent.click(within(shed).getByRole('button', { name: /^Buy Fertilizer/ }));
    expect(handlers.handleBuyFertilizer).toHaveBeenCalledWith(1, 1);

    fireEvent.click(within(shed).getByTitle(/^Assistant:/));
    expect(handlers.buyAutoPurchaser).toHaveBeenCalledWith('assistant', 1);
  });

  it('still renders when a save lacks an auto-purchaser', () => {
    renderTab(crops(c => c.map(crop => ({
      ...crop,
      autoPurchasers: crop.autoPurchasers.filter(ap => ap.id !== 'assistant')
    }))));
    expect(screen.getByRole('button', { name: /^Buy Fertilizer/ })).toBeInTheDocument();
    expect(screen.queryByTitle(/^Assistant:/)).toBeNull();
  });

  it('shows the harvester interval the game uses', () => {
    const veggies = crops(c => c.map((crop, i) => i === 0
      ? { ...crop, harvesterOwned: true, autoHarvesterEnabled: true, harvesterSpeedLevel: 4 }
      : crop));
    const { handlers } = renderTab(veggies);
    const interval = getHarvesterInterval(veggies[0]);
    expect(interval).toBe(Math.round(50 / 1.2));

    expect(within(bedOf(veggies[0].name)).getByText(`${interval} s`)).toBeInTheDocument();
    const shed = shedOf(veggies[0].name);
    expect(within(shed).getByText(`Harvests every ${interval} s`)).toBeInTheDocument();

    fireEvent.click(within(shed).getByRole('button', { name: /^Buy Harvester Speed/ }));
    expect(handlers.handleBuyHarvesterSpeed).toHaveBeenCalledWith(0, 1);
    fireEvent.click(within(shed).getByRole('button', { name: `Auto Harvester for ${veggies[0].name}: On` }));
    expect(handlers.handleToggleAutoHarvester).toHaveBeenCalledWith(0);
  });

  it("shows a Grower's slower Auto Harvester on the bed and in the shed", () => {
    const veggies = crops(c => c.map((crop, i) => i === 0 ? { ...crop, harvesterOwned: true, autoHarvesterEnabled: true } : crop));
    renderTab(veggies, 0, { guildState: commitToGuild(DEFAULT_GUILD_STATE, 'growers', 1) });

    expect(within(bedOf(veggies[0].name)).getByText('67 s')).toBeInTheDocument();
    expect(within(shedOf(veggies[0].name)).getByText('Harvests every 67 s')).toBeInTheDocument();
  });

  it('keeps fruits behind their own switch once Fruit Cultivation opens them', () => {
    const plain = crops();
    const firstFruit = plain.findIndex(v => v.cropType === 'fruit');
    const veggies = plain.map((crop, i) => i === firstFruit ? { ...crop, unlocked: true } : crop);

    const { handlers } = renderTab(veggies, 0, { guildState: fruitGrower });
    expect(screen.queryByRole('button', { name: new RegExp(`^${veggies[firstFruit].name} ~`) })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /^Fruits/ }));
    expect(handlers.setActiveVeggie).toHaveBeenCalledWith(firstFruit);
    expect(screen.getByRole('list', { name: 'Fruits' })).toBeInTheDocument();
    expect(signOf(veggies[firstFruit].name)).toBeInTheDocument();
  });

  it('shows the unlock experience of each locked fruit', () => {
    renderTab(crops(), 0, { guildState: fruitGrower });
    fireEvent.click(screen.getByRole('button', { name: /^Fruits/ }));

    expect(screen.getByText('Unlocks at 50K Growing Experience')).toBeInTheDocument();
    expect(screen.getByText('Unlocks at 110K Growing Experience')).toBeInTheDocument();
    expect(screen.getByText('Unlocks at 532.4K Growing Experience')).toBeInTheDocument();
    expect(screen.getByText('Unlocks at 60.36M Growing Experience')).toBeInTheDocument();
  });

  it('draws each ring from its crop growth, gold once ripe', () => {
    renderTab(crops(c => c.map((crop, i) => (i === 1 ? { ...crop, growth: 39 } : i === 2 ? { ...crop, growth: 100 } : crop))));

    const ring = (name: string) => bedOf(name).querySelector('.glide-ring') as HTMLElement;
    expect(ring('Lettuce').style.getPropertyValue('--glide-progress')).toBe('39%');
    expect(ring('Lettuce').className).not.toMatch(/ripeRing/);
    expect(ring('Green Beans').className).toMatch(/ripeRing/);
  });

  it('has no fruit switch before Fruit Cultivation', () => {
    renderTab(crops());
    expect(screen.queryByRole('button', { name: /^Fruits/ })).toBeNull();
  });

  it('points the first-harvest tutorial at the picked crop only', () => {
    const veggies = crops(c => c.map((crop, i) => i === 1 ? { ...crop, growth: 100 } : crop));
    const { container } = renderTab(veggies, 1);
    const marked = container.querySelectorAll('[data-tutorial="harvest-button"]');
    expect(marked).toHaveLength(1);
    expect(marked[0]).toHaveAccessibleName(`Harvest ${veggies[1].name}`);
  });

  describe('for a committed Engineer', () => {
    const engineer = (levels: Record<string, number> = {}): GuildState => ({
      ...commitToGuild(DEFAULT_GUILD_STATE, 'engineers', 1),
      guildCurrencies: { ...DEFAULT_GUILD_STATE.guildCurrencies, engineers: 1240 },
      purchasedUpgrades: Object.keys(levels),
      upgradeLevels: levels
    });

    /** The open crops with their harvesters fitted, ten seconds into the 40 second pass */
    const fitted = (change: (crop: Veggie, index: number) => Veggie = crop => crop) => crops(all => all.map((crop, i) => (crop.unlocked
      ? change({ ...crop, harvesterOwned: true, autoHarvesterEnabled: true, harvesterTimer: 10 }, i)
      : crop)));

    it('shows each machine where Harvest would be, with nothing to harvest or buy by hand', () => {
      renderTab(fitted((crop, i) => ({ ...crop, growth: i === 0 ? 100 : 40 })), 0, { guildState: engineer() });

      expect(screen.queryByRole('button', { name: /^Harvest / })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /is growing$/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /: Buy/ })).not.toBeInTheDocument();
      expect(within(bedOf('Radish')).getByText('Next pass 30 s')).toBeInTheDocument();
      expect(within(bedOf('Lettuce')).getByText('30 s')).toBeInTheDocument();
      expect(screen.getByText('Machines harvest every bed. Click a bed to see its upgrades')).toBeInTheDocument();
    });

    it('shows the guild on the plank: faster harvesters, full XP, Standard Grade and the Gears', () => {
      renderTab(fitted(), 0, { guildState: engineer() });

      const bonuses = screen.getByRole('group', { name: 'Engineers Guild bonuses' });
      expect(bonuses).toHaveTextContent('+25% Harvesters');
      expect(bonuses).toHaveTextContent('Full XP');
      expect(bonuses).toHaveTextContent('Standard Grade');
      expect(screen.getByText('1.24K Gears')).toBeInTheDocument();
    });

    it("shows Stanley's Tune-Up on every bed and in the shed", () => {
      const tuned: GuildState = { ...engineer(), stanley: { tuneUps: 1, tuneUpLeft: 30 } };
      renderTab(fitted(crop => ({ ...crop, growth: 40 })), 0, { guildState: tuned });

      expect(within(bedOf('Radish')).getByText('×2')).toBeInTheDocument();
      expect(within(bedOf('Radish')).getByText('15 s')).toBeInTheDocument();
      expect(within(shedOf('Radish')).getByText('Tune-Up · every 20 s')).toBeInTheDocument();
    });

    it('shows the fitted harvester in the shed, and what Bulk Purchasing takes off', () => {
      const veggies = fitted(crop => ({
        ...crop,
        autoPurchasers: crop.autoPurchasers.map(ap => (ap.id === 'assistant' ? { ...ap, owned: true, active: true } : ap))
      }));
      renderTab(veggies, 0, { guildState: engineer({ engineers_bulk_purchasing: 3 }) });

      const shed = shedOf('Radish');
      expect(within(shed).getByText('Factory fitted · every 40 s')).toBeInTheDocument();
      expect(within(shed).queryByRole('button', { name: /^Auto Harvester for Radish/ })).not.toBeInTheDocument();
      expect(within(shed).getAllByText('-9%')).toHaveLength(1);
    });
  });

  describe('for a committed Merchant', () => {
    const merchant = (levels: Record<string, number> = {}): GuildState => ({
      ...commitToGuild(DEFAULT_GUILD_STATE, 'merchants', 1),
      purchasedUpgrades: Object.keys(levels),
      upgradeLevels: levels
    });

    it('shows the guild on the plank: crop and jar prices, Bulk Deals and the knowledge cut', () => {
      renderTab(crops(), 0, { guildState: merchant({ merchants_haggling: 5, merchants_bulk_deals: 2 }) });

      const bonuses = screen.getByRole('group', { name: 'Merchants Guild bonuses' });
      expect(bonuses).toHaveTextContent('+25% Crops');
      expect(bonuses).toHaveTextContent('+15% Jars');
      expect(bonuses).toHaveTextContent('+4% Bulk');
      expect(bonuses).toHaveTextContent('-15% Knowledge');
    });

    it('adds Markup to the price in the shed, and Bulk Deals to Sell All on 100 crops or more', () => {
      const veggies = crops(all => all.map((crop, i) => (i === 0 ? { ...crop, stash: 100 } : crop)));
      renderTab(veggies, 0, { guildState: merchant({ merchants_bulk_deals: 5 }) });

      const price = veggies[0].salePrice * 1.15;
      expect(within(shedOf('Radish')).getByText(`$${formatNumber(price, 2)} each`)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Sell All/ })).toHaveTextContent(`Sell All · $${formatNumber(100 * price * 1.1, 2)}`);
    });

    it("doubles what sells during Ferdinand's Hot Tip, and marks it on Sell All, the beds and the shed", () => {
      const veggies = crops(all => all.map((crop, i) => (i === 0 ? { ...crop, stash: 10, sellEnabled: true } : { ...crop, sellEnabled: false })));
      renderTab(veggies, 0, { guildState: { ...merchant(), ferdinand: { hotTips: 1, hotTipLeft: 30 } } });

      const price = veggies[0].salePrice * 1.15 * 2;
      const sellAll = screen.getByRole('button', { name: /^Sell All/ });
      expect(sellAll).toHaveTextContent(`Sell All · $${formatNumber(10 * price, 2)}×2`);
      expect(within(bedOf('Radish')).getByRole('button', { name: 'Radish: Sell. Click to Hold' })).toHaveTextContent('Sell×2');
      expect(within(bedOf('Lettuce')).getByRole('button', { name: 'Lettuce: Hold. Click to Sell' })).not.toHaveTextContent('×2');
      expect(within(shedOf('Radish')).getByText(`$${formatNumber(price, 2)} each`)).toHaveTextContent('×2');
    });

    it('prices crop upgrades with Wholesale, and buys them at that price', () => {
      const veggies = crops();
      const { handlers } = renderTab(veggies, 1, { guildState: merchant({ merchants_wholesale: 5 }) });
      const shed = shedOf(veggies[1].name);

      fireEvent.click(within(shed).getByRole('button', { name: `Buy Fertilizer for $${formatNumber(veggies[1].fertilizerCost * 0.9, 1)}` }));
      expect(handlers.handleBuyFertilizer).toHaveBeenCalledWith(1, expect.closeTo(0.9, 10));
    });
  });
});
