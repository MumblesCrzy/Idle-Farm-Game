/**
 * Tests for the Bees tab, the Honeycomb: the locked card, the apiary's cells, collecting
 * honey, the Honey House and its Beekeeper, and the upgrades grouped by what they improve.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BeesTab from '../components/BeesTab';
import LiveAnnouncer from '../components/LiveAnnouncer';
import { BeeProvider, useBees } from '../context/BeeContext';
import { createInitialBeeUpgrades } from '../data/beeUpgrades';
import { BEE_CONSTANTS } from '../config/gameConstants';
import { formatNumber } from '../utils/gameCalculations';
import type { BeeBox, BeeContextValue, BeekeeperAssistant, BeeUpgrade } from '../types/bees';

const UNLOCK_TIER = BEE_CONSTANTS.UNLOCK_FARM_TIER;
/** Fall: 65 days before winter starts on day 265 */
const FALL_DAY = 200;

const hive = (i: number, stored = 0, timer = 0, active = true): BeeBox => ({
  id: `box_${i}`, active, productionTimer: timer, productionTime: 132, honeyProduced: 0,
  lastHarvestTime: 0, harvestReady: stored > 0, storedBatches: stored
});

/** The upgrade list with levels: a number for a repeatable upgrade, true for a bought one */
const withLevels = (levels: Record<string, number | boolean> = {}): BeeUpgrade[] => createInitialBeeUpgrades().map(upgrade => {
  const value = levels[upgrade.id];
  if (value === undefined) return upgrade;
  if (typeof value === 'number') {
    return { ...upgrade, level: value, purchased: value > 0, cost: Math.floor(upgrade.baseCost * Math.pow(upgrade.costScaling ?? 1, value)) };
  }
  return { ...upgrade, purchased: value };
});

const beekeeper = (overrides: Partial<BeekeeperAssistant> = {}): BeekeeperAssistant => ({
  unlocked: false, active: false, autoCollectEnabled: false, productionSpeedBonus: 0, downtimeReduction: 0,
  level: 0, upgradeCost: 1500, baseUpgradeCost: 1500, costScaling: 1.5, maxLevel: 10, ...overrides
});

/** The parts of the bee context the tab reads, with every action a mock */
function fakeBees(overrides: Partial<BeeContextValue> = {}): BeeContextValue {
  const boxes = overrides.boxes ?? [hive(0), hive(1)];
  return {
    boxes,
    upgrades: withLevels(),
    beekeeperAssistant: beekeeper(),
    regularHoney: 0,
    goldenHoney: 0,
    getBeeBoxPurchaseInfo: () => ({ cost: 825, canAfford: false, atMaxCapacity: boxes.length >= 30, currentCount: boxes.length, maxCount: 30, yieldBonusGain: 0.005 }),
    harvestHoney: vi.fn(() => []),
    harvestAllHoney: vi.fn(() => []),
    addBeeBox: vi.fn(() => true),
    unlockBeekeeperAssistant: vi.fn(() => true),
    upgradeBeekeeperAssistant: vi.fn(() => true),
    toggleBeekeeperAssistant: vi.fn(),
    purchaseUpgrade: vi.fn(() => true),
    ...overrides
  } as unknown as BeeContextValue;
}

/** Seven hives, four with honey waiting, saving up for the Beekeeper: the mockup's apiary */
const midGame = (overrides: Partial<BeeContextValue> = {}) => fakeBees({
  boxes: [hive(0, 2, 117), hive(1, 1, 68), hive(2, 0, 100), hive(3, 1, 22), hive(4, 0, 50), hive(5, 3, 11), hive(6, 0, 79)],
  upgrades: withLevels({ busy_bees: 3, hexcomb_engineering: 2, meadow_magic: 1, royal_jelly: true }),
  regularHoney: 520,
  goldenHoney: 17,
  ...overrides
});

const renderTab = (bees: BeeContextValue | null, day = FALL_DAY) => render(
  <>
    <LiveAnnouncer />
    <BeesTab beeContext={bees} farmTier={5} day={day} formatNumber={formatNumber} />
  </>
);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('BeesTab before bees unlock', () => {
  it('shows the locked card below the unlock tier', () => {
    render(<BeesTab beeContext={null} farmTier={UNLOCK_TIER - 1} day={FALL_DAY} formatNumber={formatNumber} />);

    expect(screen.getByRole('heading', { level: 2, name: 'Bee Bee System Locked Bee' })).toBeInTheDocument();
    expect(screen.getByText('Current Tier:').parentElement).toHaveTextContent(`Current Tier: ${UNLOCK_TIER - 1}`);
    expect(screen.getByText('Required Tier:').parentElement).toHaveTextContent(`Required Tier: ${UNLOCK_TIER}`);
    expect(screen.getByRole('heading', { level: 3, name: 'What Bees Offer:' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });

  it('shows no locked card from the unlock tier', () => {
    render(<BeesTab beeContext={null} farmTier={UNLOCK_TIER} day={FALL_DAY} formatNumber={formatNumber} />);

    expect(screen.queryByRole('heading', { name: /Locked/ })).not.toBeInTheDocument();
    expect(screen.getByText('Loading bee system...')).toBeInTheDocument();
  });
});

describe('the apiary', () => {
  it('has a cell for each hive and one to buy the next; the empty cells show what more hives open', () => {
    renderTab(midGame());

    const comb = screen.getByRole('list', { name: 'Hives' });
    // The 22 empty cells are pictures only, hidden from screen readers
    expect(within(comb).getAllByRole('listitem')).toHaveLength(8);
    expect(screen.getByText('7 of 30 hives')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add hive 8 for 825 honey, 305 more needed' })).toBeDisabled();
    expect(screen.getByTitle('10 hives open Winter Hardiness')).toBeInTheDocument();
    expect(screen.getByTitle('30 hives open Swift Gatherers')).toBeInTheDocument();
    expect(screen.queryByTitle('4 hives open Beekeeper')).not.toBeInTheDocument();
  });

  it('buys the next hive when there is honey for it', async () => {
    const user = userEvent.setup();
    const bees = midGame({ regularHoney: 900 });
    renderTab(bees);

    await user.click(screen.getByRole('button', { name: 'Add hive 8 for 825 honey' }));
    expect(bees.addBeeBox).toHaveBeenCalledTimes(1);
  });

  it('collects a hive with honey waiting when its cell is clicked, and says what it gave', async () => {
    const user = userEvent.setup();
    const bees = midGame({ harvestHoney: vi.fn(() => [{ type: 'regular' as const, amount: 34, boxId: 'box_0' }]) });
    renderTab(bees);

    await user.click(screen.getByRole('button', { name: 'Collect hive 1: 2 batches, 34 lbs' }));

    expect(bees.harvestHoney).toHaveBeenCalledWith('box_0');
    expect(screen.getByTestId('announcer-polite')).toHaveTextContent('Collected 34 lbs of honey');
  });

  it('shows the days to each next batch, from the game\'s batch length', () => {
    // 132 days a batch with no upgrades: a hive 100 days in has 32 to go
    renderTab(fakeBees({ boxes: [hive(0, 0, 100)] }));
    expect(screen.getByText('Hive 1: next batch in 32 days')).toBeInTheDocument();
  });

  it('counts the Beekeeper\'s speed only while he works', () => {
    const upgrades = withLevels({ busy_bees: 32 });
    // 132 ÷ 1.32 ÷ 1.40 = 71.4 days a batch with him on, 100 with him off
    renderTab(fakeBees({ boxes: [hive(0)], upgrades, beekeeperAssistant: beekeeper({ unlocked: true, active: true, level: 6, productionSpeedBonus: 0.4 }) }));
    expect(screen.getByText('Hive 1: next batch in 72 days')).toBeInTheDocument();
    expect(screen.getByText('15 lbs a batch, every 71 days')).toBeInTheDocument();
  });

  it('frosts the hives that rest in winter', () => {
    renderTab(fakeBees({ boxes: [hive(0, 0, 40, false), hive(1, 0, 90, false)] }), 300);
    expect(screen.getByText('Hive 1: resting for winter')).toBeInTheDocument();
    expect(screen.getAllByText('Resting')).toHaveLength(2);
  });
});

describe('the Honey House', () => {
  it('shows the honey on hand and what waits in the hives', () => {
    renderTab(midGame());
    const house = screen.getByRole('region', { name: 'Honey House' });

    expect(within(house).getByText('520')).toBeInTheDocument();
    expect(within(house).getByText('17')).toBeInTheDocument();
    expect(within(house).getByText('7 batches · 119 lbs')).toBeInTheDocument();
    expect(within(house).getByText('Each batch has a 2% chance to come out as Golden Honey')).toBeInTheDocument();
  });

  it('collects everything with Collect all, which waits disabled when nothing is in the hives', async () => {
    const user = userEvent.setup();
    const bees = midGame({ harvestAllHoney: vi.fn(() => [{ type: 'regular' as const, amount: 102, boxId: 'box_0' }, { type: 'golden' as const, amount: 17, boxId: 'box_5' }]) });
    const { unmount } = renderTab(bees);

    await user.click(screen.getByRole('button', { name: 'Collect all · 119 lbs' }));
    expect(bees.harvestAllHoney).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('announcer-polite')).toHaveTextContent('Collected 102 lbs of honey and 17 lbs of Golden Honey');
    unmount();

    renderTab(fakeBees());
    expect(screen.getByRole('button', { name: 'Nothing to collect' })).toBeDisabled();
    expect(screen.getByText('Nothing waiting')).toBeInTheDocument();
  });

  it('says what the bees give: honey, the crop bonus with its parts, and winter', () => {
    renderTab(midGame());

    expect(screen.getByText('17 lbs a batch, every 128 days')).toBeInTheDocument();
    expect(screen.getByText('About 0.9 lbs of honey a day from 7 hives')).toBeInTheDocument();
    expect(screen.getByText('+7% on every crop\'s harvest')).toBeInTheDocument();
    expect(screen.getByText('1% a hive: 0.5% base, 0.5% Meadow Magic')).toBeInTheDocument();
    expect(screen.getByText('Bees rest for winter in 65 days')).toBeInTheDocument();
  });

  it('says when resting bees wake, and that Winter Hardiness keeps them working', () => {
    const { unmount } = renderTab(fakeBees(), 300);
    expect(screen.getByText('Bees are resting for winter')).toBeInTheDocument();
    expect(screen.getByText('They wake in spring, in 66 days')).toBeInTheDocument();
    unmount();

    renderTab(fakeBees({ upgrades: withLevels({ winter_hardiness: true }) }), 300);
    expect(within(screen.getByRole('region', { name: 'Honey House' })).getByText('Bees work through winter')).toBeInTheDocument();
  });
});

describe('the Beekeeper', () => {
  it('needs 4 hives and 750 honey to hire', async () => {
    const { unmount } = renderTab(fakeBees({ boxes: [hive(0), hive(1), hive(2)], regularHoney: 2000 }));
    expect(screen.getByText('Needs 4 hives, you have 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hire the Beekeeper for 750 honey' })).toBeDisabled();
    unmount();

    const { unmount: unmountMid } = renderTab(midGame());
    expect(screen.getByText('520 of 750 honey')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hire the Beekeeper for 750 honey' })).toBeDisabled();
    unmountMid();

    const user = userEvent.setup();
    const bees = midGame({ regularHoney: 800 });
    renderTab(bees);
    await user.click(screen.getByRole('button', { name: 'Hire the Beekeeper for 750 honey' }));
    expect(bees.unlockBeekeeperAssistant).toHaveBeenCalledTimes(1);
  });

  it('once hired, switches on and off and rises a level at a time', async () => {
    const user = userEvent.setup();
    const bees = midGame({
      regularHoney: 5000,
      beekeeperAssistant: beekeeper({ unlocked: true, active: true, autoCollectEnabled: true, level: 2, productionSpeedBonus: 0.2, upgradeCost: 3375 })
    });
    renderTab(bees);

    expect(screen.getByText('While on, bees work 20% faster; next level 25%')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Beekeeper On', pressed: true }));
    expect(bees.toggleBeekeeperAssistant).toHaveBeenCalledWith(false);

    await user.click(screen.getByRole('button', { name: 'Raise the Beekeeper to level 3 for 3.4K honey' }));
    expect(bees.upgradeBeekeeperAssistant).toHaveBeenCalledTimes(1);
  });
});

describe('the upgrades', () => {
  it('are grouped by what they improve, each upgrade once', () => {
    renderTab(midGame());
    const groups: Record<string, string[]> = {
      Speed: ['Busy Bees', 'Swift Gatherers'],
      'Honey a batch': ['Super Frames', 'Nectar Efficiency'],
      'Golden Honey': ['Royal Jelly', "Queen's Blessing", 'Golden Touch'],
      Crops: ['Meadow Magic', 'Flower Power'],
      Winter: ['Winter Hardiness'],
      Kitchen: ['Honey Jars']
    };

    expect(screen.getAllByRole('group').map(group => group.querySelector('h3')?.textContent)).toEqual(Object.keys(groups));
    for (const [title, names] of Object.entries(groups)) {
      const group = screen.getByRole('group', { name: title });
      for (const name of names) expect(within(group).getByText(name)).toBeInTheDocument();
    }
    expect(Object.values(groups).flat()).toHaveLength(createInitialBeeUpgrades().length);
  });

  it('say what they do now and next, and buy when there is honey for them', async () => {
    const user = userEvent.setup();
    const bees = midGame();
    renderTab(bees);

    expect(screen.getByText('128 days a batch, next 127')).toBeInTheDocument();
    expect(screen.getByText('+10% honey, next +15%')).toBeInTheDocument();
    expect(screen.getByText('Crops +7%, next +10.5%')).toBeInTheDocument();
    const queensBlessing = screen.getByText("Queen's Blessing").closest('[title]') as HTMLElement;
    expect(within(queensBlessing).getByText('Golden chance 2%, then 4%')).toBeInTheDocument();
    expect(screen.getByText('17 lbs a batch, then 18')).toBeInTheDocument();
    expect(screen.getByText('128 days a batch, then 109')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Buy Busy Bees level 4 for 114 honey' }));
    expect(bees.purchaseUpgrade).toHaveBeenCalledWith('busy_bees');
    expect(screen.getByRole('button', { name: "Buy Queen's Blessing for 150 Golden Honey" })).toBeDisabled();
    expect(screen.getByText('Jar honey in the Kitchen')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buy Honey Jars for 1K honey' })).toBeDisabled();
  });

  it('say what a locked one needs, and Owned once bought', () => {
    const { unmount } = renderTab(midGame());
    const row = (name: string) => screen.getByText(name).closest('[title]') as HTMLElement;

    expect(within(row('Winter Hardiness')).getByText('10 hives')).toBeInTheDocument();
    expect(within(row('Golden Touch')).getByText('15 hives')).toBeInTheDocument();
    expect(within(row('Royal Jelly')).getByText('Owned')).toBeInTheDocument();
    unmount();

    // Enough hives, but Golden Touch also needs the two Golden upgrades before it
    renderTab(fakeBees({ boxes: Array.from({ length: 16 }, (_, i) => hive(i)) }));
    expect(within(row('Golden Touch')).getByText("Needs Royal Jelly and Queen's Blessing")).toBeInTheDocument();
  });
});

describe('with the real bees', () => {
  it('collecting a hive adds its honey to the Honey House', async () => {
    const user = userEvent.setup();
    // Every batch comes out regular
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const Harness = () => <BeesTab beeContext={useBees()} farmTier={5} day={100} formatNumber={formatNumber} />;
    render(
      <BeeProvider farmTier={5} season="Summer" initialState={{ unlocked: true, firstTimeSetup: true, boxes: [hive(0, 2, 10), hive(1)], regularHoney: 100 }}>
        <Harness />
      </BeeProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Collect hive 1: 2 batches, 30 lbs' }));

    const house = screen.getByRole('region', { name: 'Honey House' });
    expect(within(house).getByText('130')).toBeInTheDocument();
    expect(within(house).getByText('Nothing waiting')).toBeInTheDocument();
  });
});
