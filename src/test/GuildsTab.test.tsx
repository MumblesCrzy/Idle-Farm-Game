/**
 * Tests for the guilds tab: the locked card, keyboard access to the guild
 * cards, and the intro and commit dialogs.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GuildsTab from '../components/GuildsTab';
import { GUILDS_UNLOCK_TIER, getSamplingUpgrades } from '../data/guildData';
import { DEFAULT_GUILD_STATE, type GuildState } from '../types/guilds';
import type { LegacyResetSummary } from '../utils/legacy';

type GuildsTabProps = Parameters<typeof GuildsTab>[0];

const formatNumber = (num: number, decimalPlaces = 0) => num.toFixed(decimalPlaces);

const renderTab = (overrides: Partial<GuildsTabProps> = {}) => {
  const props: GuildsTabProps = {
    farmTier: GUILDS_UNLOCK_TIER,
    guildState: DEFAULT_GUILD_STATE,
    money: 0,
    knowledge: 0,
    experience: 0,
    introShown: true,
    onDismissIntro: vi.fn(),
    onCommitToGuild: vi.fn(),
    onPurchaseUpgrade: vi.fn(),
    formatNumber,
    ...overrides,
  };
  render(<GuildsTab {...props} />);
  return props;
};

/** Growers have one sampled upgrade, which allows committing */
const sampledGrowersState: GuildState = {
  ...DEFAULT_GUILD_STATE,
  guildTokens: 1000,
  sampledUpgrades: { ...DEFAULT_GUILD_STATE.sampledUpgrades, growers: ['growers_fertile_soil'] },
};

const growersCard = () => screen.getByRole('button', { name: /Growers Guild/ });

/** Committed to the Growers with Ritual Circles bought and sigils to spare */
const committedGrowersState: GuildState = {
  ...DEFAULT_GUILD_STATE,
  status: 'committed',
  committedGuild: 'growers',
  guildCurrencies: { ...DEFAULT_GUILD_STATE.guildCurrencies, growers: 5000 },
  purchasedUpgrades: ['growers_ritual_circles'],
  upgradeLevels: { growers_ritual_circles: 1 },
};

/** The buy button in the upgrade row under this heading */
const buyButton = (name: string) => within(screen.getByRole('heading', { name }).parentElement!.parentElement!).getByRole('button');

const emoji = /\p{Extended_Pictographic}/u;

describe('GuildsTab', () => {
  describe('locked card', () => {
    it('shows the locked card below the unlock tier', () => {
      renderTab({ farmTier: GUILDS_UNLOCK_TIER - 1 });

      expect(screen.getByRole('heading', { level: 2, name: 'Guilds System Locked' })).toBeInTheDocument();
      expect(screen.getByText('Current Tier:').parentElement).toHaveTextContent(`Current Tier: ${GUILDS_UNLOCK_TIER - 1}`);
      expect(screen.getByText('Required Tier:').parentElement).toHaveTextContent(`Required Tier: ${GUILDS_UNLOCK_TIER}`);
      expect(screen.getByRole('heading', { level: 3, name: 'What Guilds Offer:' })).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(4);
      expect(screen.getByText('Keep expanding your farm to unlock this feature!')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('shows the guild cards once the unlock tier is reached', () => {
      renderTab();

      expect(screen.queryByRole('heading', { name: /Locked/ })).not.toBeInTheDocument();
      expect(growersCard()).toBeInTheDocument();
    });
  });

  describe('guild cards', () => {
    it('are buttons that can be reached and selected with the keyboard', async () => {
      const user = userEvent.setup();
      renderTab();

      const growers = growersCard();
      const preservers = screen.getByRole('button', { name: /Preservers Guild/ });
      expect(growers.tagName).toBe('BUTTON');
      expect(growers).toHaveAttribute('type', 'button');
      expect(growers).toHaveAttribute('aria-pressed', 'false');

      await user.tab();
      expect(growers).toHaveFocus();
      await user.keyboard('{Enter}');
      expect(growers).toHaveAttribute('aria-pressed', 'true');

      // The commit button is disabled until an upgrade is sampled, so Tab skips it
      await user.tab();
      expect(preservers).toHaveFocus();
      await user.keyboard(' ');
      expect(preservers).toHaveAttribute('aria-pressed', 'true');
      expect(growers).toHaveAttribute('aria-pressed', 'false');
    });

    it('passes the upgrade id when a sampling upgrade is bought', async () => {
      const user = userEvent.setup();
      const props = renderTab({ guildState: sampledGrowersState });
      const [upgrade] = getSamplingUpgrades('growers');

      await user.click(growersCard());
      const row = screen.getByRole('heading', { name: upgrade.name }).parentElement!.parentElement!;
      await user.click(within(row).getByRole('button'));

      expect(props.onPurchaseUpgrade).toHaveBeenCalledWith(upgrade.id);
    });
  });

  describe('committed Growers upgrades', () => {
    it('show a bought one-time upgrade as Owned and disable its button', () => {
      renderTab({ guildState: committedGrowersState });

      expect(buyButton('Ritual Circles')).toHaveTextContent('Owned');
      expect(buyButton('Ritual Circles')).toBeDisabled();
      expect(buyButton('Fruit Cultivation')).toHaveTextContent('200');
      expect(buyButton('Fruit Cultivation')).toBeEnabled();
    });
  });

  describe('Preservers', () => {
    const preserversCard = () => screen.getByRole('button', { name: /Preservers Guild/ });

    /** One Preservers upgrade sampled, which allows committing */
    const sampledPreservers: GuildState = {
      ...DEFAULT_GUILD_STATE,
      status: 'sampling',
      sampledUpgrades: { ...DEFAULT_GUILD_STATE.sampledUpgrades, preservers: ['preservers_shelf_life'] },
      purchasedUpgrades: ['preservers_shelf_life'],
      upgradeLevels: { preservers_shelf_life: 1 },
    };

    /** Committed, with two Pressure Canner levels and Wax Seals to spare */
    const committedPreservers: GuildState = {
      ...DEFAULT_GUILD_STATE,
      status: 'committed',
      committedGuild: 'preservers',
      guildCurrencies: { ...DEFAULT_GUILD_STATE.guildCurrencies, preservers: 238 },
      purchasedUpgrades: ['preservers_pressure_canner'],
      upgradeLevels: { preservers_pressure_canner: 2 },
    };

    it('can be joined once one of their upgrades is sampled', async () => {
      const user = userEvent.setup();
      const props = renderTab({ guildState: sampledPreservers });

      await user.click(preserversCard());
      await user.click(screen.getByRole('button', { name: 'Commit to Guild' }));
      const dialog = screen.getByRole('dialog', { name: 'Commit to Preservers Guild?' });
      await user.click(within(dialog).getByRole('button', { name: 'Commit Forever' }));

      expect(props.onCommitToGuild).toHaveBeenCalledWith('preservers');
    });

    it('show what their sampled upgrades do at half strength', async () => {
      const user = userEvent.setup();
      renderTab({ guildState: sampledPreservers });

      await user.click(preserversCard());

      expect(screen.getByText('Current Effects (at 50%):').parentElement).toHaveTextContent('+1.0% Jar Value');
    });

    it('open the Merchants, who spend money on everything, starters included', async () => {
      const user = userEvent.setup();
      renderTab({ guildState: sampledPreservers, money: 1_500_000 });

      await user.click(screen.getByRole('button', { name: /Merchants Guild/ }));

      expect(screen.getByRole('button', { name: 'Commit to Guild' })).toBeDisabled();
      expect(screen.getByText(/No guild currency: the Merchants spend money/)).toBeInTheDocument();
      expect(buyButton('Haggling')).toHaveTextContent('$1000000');
      expect(buyButton('Haggling')).toBeEnabled();
    });

    it('say in the commit dialog that the Merchants are paid in money', async () => {
      const user = userEvent.setup();
      const sampledMerchants: GuildState = {
        ...DEFAULT_GUILD_STATE,
        status: 'sampling',
        sampledUpgrades: { ...DEFAULT_GUILD_STATE.sampledUpgrades, merchants: ['merchants_haggling'] },
        purchasedUpgrades: ['merchants_haggling'],
        upgradeLevels: { merchants_haggling: 1 }
      };
      const props = renderTab({ guildState: sampledMerchants });

      await user.click(screen.getByRole('button', { name: /Merchants Guild/ }));
      expect(screen.getByText('Current Effects (at 50%):').parentElement).toHaveTextContent('+1.0% Crop Prices');
      await user.click(screen.getByRole('button', { name: 'Commit to Guild' }));

      const dialog = screen.getByRole('dialog', { name: 'Commit to Merchants Guild?' });
      expect(dialog).toHaveTextContent('Pay for guild upgrades with money');
      await user.click(within(dialog).getByRole('button', { name: 'Commit Forever' }));
      expect(props.onCommitToGuild).toHaveBeenCalledWith('merchants');
    });

    it('show money, Markup, the Merchant and the knowledge cut once a Merchant joins', () => {
      const committedMerchants: GuildState = {
        ...DEFAULT_GUILD_STATE,
        status: 'committed',
        committedGuild: 'merchants',
        purchasedUpgrades: ['merchants_shrewd_bargaining', 'merchants_trade_routes'],
        upgradeLevels: { merchants_shrewd_bargaining: 2, merchants_trade_routes: 1 }
      };
      renderTab({ guildState: committedMerchants, money: 5_000_000 });

      expect(screen.getByText('Money').parentElement).toHaveTextContent('$5000000');
      expect(screen.getByText('Crop prices:').parentElement).toHaveTextContent('Crop prices: +21%');
      expect(screen.getByText('Jar value:').parentElement).toHaveTextContent('Jar value: +15%');
      expect(screen.getByText('Merchant:').parentElement).toHaveTextContent('Merchant: every 25 days');
      expect(screen.getByText('Knowledge:').parentElement).toHaveTextContent('Knowledge: -15%');
      // $2M, x1.8 per level
      expect(buyButton('Shrewd Bargaining')).toHaveTextContent('$6480000');
      expect(buyButton('Additives')).toHaveTextContent('$100000000');
    });

    it('show Wax Seals, the guild effects and upgrades priced in Seals once joined', () => {
      renderTab({ guildState: committedPreservers });

      expect(screen.getByText('Wax Seals').parentElement).toHaveTextContent('238');
      expect(screen.getByText('Jar value:').parentElement).toHaveTextContent('Jar value: +20%');
      expect(screen.getByText('Jars per batch:').parentElement).toHaveTextContent('Jars per batch: 3');
      expect(screen.getByText('Now: Jars per batch: +2')).toBeInTheDocument();
      // 200 Seals, x2.2 per level
      expect(buyButton('Pressure Canner')).toHaveTextContent('968');
      expect(buyButton('Cellar Recipes')).toHaveTextContent('200');
      expect(buyButton('Cellar Recipes')).toBeEnabled();
    });

    it('price upgrades in whole Wax Seals', () => {
      renderTab({
        guildState: {
          ...committedPreservers,
          purchasedUpgrades: ['preservers_cellar_aging'],
          upgradeLevels: { preservers_cellar_aging: 3 },
        }
      });

      // 75 x 1.8^3 is 437.4
      expect(buyButton('Cellar Aging')).toHaveTextContent('437');
      expect(buyButton('Cellar Aging')).not.toHaveTextContent('437.4');
    });

    it('warn that unspent Guild Tokens stay behind when joining', async () => {
      const user = userEvent.setup();
      renderTab({ guildState: sampledPreservers });

      await user.click(preserversCard());
      await user.click(screen.getByRole('button', { name: 'Commit to Guild' }));

      expect(screen.getByRole('dialog')).toHaveTextContent('Leave behind any unspent Guild Tokens');
    });

    it('show no emoji after joining', () => {
      renderTab({ guildState: committedPreservers });
      expect(document.body.textContent).not.toMatch(emoji);
    });
  });

  describe('Engineers', () => {
    const engineersCard = () => screen.getByRole('button', { name: /Engineers Guild/ });

    /** One Engineers upgrade sampled, which allows committing */
    const sampledEngineers: GuildState = {
      ...DEFAULT_GUILD_STATE,
      status: 'sampling',
      sampledUpgrades: { ...DEFAULT_GUILD_STATE.sampledUpgrades, engineers: ['engineers_automation_boost'] },
      purchasedUpgrades: ['engineers_automation_boost'],
      upgradeLevels: { engineers_automation_boost: 1 },
    };

    /** Committed, with Bulk Purchasing and Night Shift bought and Gears to spare */
    const committedEngineers: GuildState = {
      ...DEFAULT_GUILD_STATE,
      status: 'committed',
      committedGuild: 'engineers',
      guildCurrencies: { ...DEFAULT_GUILD_STATE.guildCurrencies, engineers: 412 },
      purchasedUpgrades: ['engineers_bulk_purchasing', 'engineers_night_shift'],
      upgradeLevels: { engineers_bulk_purchasing: 3, engineers_night_shift: 1 },
    };

    const chip = (label: string) => screen.getByText(label).parentElement;

    it('show their sampled upgrades at half strength, and can be joined', async () => {
      const user = userEvent.setup();
      const props = renderTab({ guildState: sampledEngineers });

      await user.click(engineersCard());
      expect(screen.getByText('Current Effects (at 50%):').parentElement).toHaveTextContent('+2.0% Harvester Speed');
      await user.click(screen.getByRole('button', { name: 'Commit to Guild' }));
      const dialog = screen.getByRole('dialog', { name: 'Commit to Engineers Guild?' });
      await user.click(within(dialog).getByRole('button', { name: 'Commit Forever' }));

      expect(props.onCommitToGuild).toHaveBeenCalledWith('engineers');
    });

    it('show Gears, the machine effects and the trade-offs once joined', () => {
      renderTab({ guildState: committedEngineers });

      expect(chip('Gears')).toHaveTextContent('412');
      expect(chip('Harvester speed:')).toHaveTextContent('Harvester speed: +25.0%');
      expect(chip('Auto harvest rewards:')).toHaveTextContent('Full');
      expect(chip('Auto-buyers:')).toHaveTextContent('Auto-buyers: -9%');
      expect(chip('Canning time:')).toHaveTextContent('Canning time: -30.0%');
      expect(chip('Canner rewards:')).toHaveTextContent('1/2');
      expect(chip('Time away:')).toHaveTextContent('Time away: 12 h');
      expect(chip('Hand harvests:')).toHaveTextContent('Off');
      expect(chip('Crop value:')).toHaveTextContent('Crop value: -15%');
      expect(chip('Jar value:')).toHaveTextContent('Jar value: -25%');
      expect(chip('Honey:')).toHaveTextContent('Honey: -25%');
      expect(screen.queryByText('Purchase upgrades to unlock')).not.toBeInTheDocument();
    });

    it('show no emoji after joining', () => {
      renderTab({ guildState: committedEngineers });
      expect(document.body.textContent).not.toMatch(emoji);
    });
  });

  describe('Merchants', () => {
    const merchantsMember: GuildState = {
      ...DEFAULT_GUILD_STATE,
      status: 'committed',
      committedGuild: 'merchants',
      takeovers: 2,
      ferdinand: { hotTips: 12 },
      purchasedUpgrades: ['merchants_head_hunters', 'merchants_insider_trading', 'merchants_futures', 'merchants_hostile_takeover', 'merchants_golden_parachute'],
      upgradeLevels: { merchants_head_hunters: 1, merchants_insider_trading: 1, merchants_futures: 1, merchants_hostile_takeover: 1, merchants_golden_parachute: 1 }
    };

    it('list Payroll, Hot Tips and the takeovers in the sidebar, and every bought effect', () => {
      renderTab({ guildState: merchantsMember, money: 2_000_000, payrollStaff: 56 });

      expect(screen.getByText('Payroll').parentElement).toHaveTextContent('Payroll56');
      expect(screen.getByText('Hot Tips').parentElement).toHaveTextContent('Hot Tips12');
      expect(screen.getByText('Takeovers').parentElement).toHaveTextContent('Takeovers2');
      expect(screen.getByText('Hot Tips:').parentElement).toHaveTextContent('Hot Tips: 90 s');
      expect(screen.getByText('Rehiring:').parentElement).toHaveTextContent('Rehiring: half price');
      expect(screen.getByText('Time away:').parentElement).toHaveTextContent('Time away: Merchant sells');
      expect(screen.getByText('Larger farms:').parentElement).toHaveTextContent('Larger farms: keep everything');
      expect(screen.getByText('Golden Parachute:').parentElement).toHaveTextContent('Golden Parachute: $200000.00');
    });

    it('say Payroll is laid off when no one is on staff', () => {
      renderTab({ guildState: merchantsMember, payrollStaff: 0 });
      expect(screen.getByText('Payroll').parentElement).toHaveTextContent('Payrolllaid off');
    });
  });

  describe('Legacy', () => {
    const reset: LegacyResetSummary = {
      guildName: 'Preservers Guild', guildCurrency: 238, guildCurrencyName: 'Wax Seals', farmTier: 6, maxPlots: 16, cropsUnlocked: 10,
      money: 5e6, knowledge: 4e5, experience: 2e6, recipesUnlocked: 38, canningUpgradeLevels: 20, canningExperience: 90000,
      hives: 12, honey: 442, goldenHoney: 3.2, beeUpgrades: 6, achievementsKept: 11, achievementsReset: 22, year: 3, daysThisLegacy: 870
    };
    /** A Preserver with levels and unlocks to keep, and Rush Batch, which can't leave */
    const member: GuildState = {
      ...DEFAULT_GUILD_STATE,
      status: 'committed',
      committedGuild: 'preservers',
      guildCurrencies: { ...DEFAULT_GUILD_STATE.guildCurrencies, preservers: 238 },
      purchasedUpgrades: ['preservers_cellar_aging', 'preservers_copper_kettles', 'preservers_cellar_recipes', 'preservers_family_cookbook', 'preservers_rush_batch'],
      upgradeLevels: { preservers_cellar_aging: 6, preservers_copper_kettles: 3, preservers_cellar_recipes: 1, preservers_family_cookbook: 1, preservers_rush_batch: 1 },
    };
    const carried: GuildState = {
      ...DEFAULT_GUILD_STATE,
      legacy: {
        count: 1,
        keptLevels: { preservers_cellar_aging: 3 },
        keptUnlocks: ['preservers_cellar_recipes'],
        history: [{ guild: 'preservers', endedAt: 1, days: 870, unlock: 'preservers_cellar_recipes', levelsKept: 4 }],
      },
    };

    it('offers End Legacy to members from Farm Tier 6', () => {
      renderTab({ guildState: member, farmTier: 5, onEndLegacy: vi.fn(), legacyReset: reset });
      const early = screen.getByRole('button', { name: /End Legacy/ });
      expect(early).toBeDisabled();
      expect(early).toHaveAttribute('title', 'Available at Farm Tier 6');
    });

    it('previews what stays, and ends the Legacy with the picked unlock once the box is ticked', async () => {
      const user = userEvent.setup();
      const props = renderTab({ guildState: member, farmTier: 6, onEndLegacy: vi.fn(), legacyReset: reset });

      await user.click(screen.getByRole('button', { name: /End Legacy/ }));
      const dialog = screen.getByRole('dialog', { name: 'End your Legacy?' });
      expect(within(dialog).getByRole('row', { name: /Cellar Aging/ })).toHaveTextContent('Cellar Aging63');
      expect(within(dialog).getByRole('row', { name: /Copper Kettles/ })).toHaveTextContent('Copper Kettles31');
      expect(within(dialog).getByRole('radio', { name: /Cellar Recipes/ })).toBeChecked();
      expect(within(dialog).queryByRole('radio', { name: /Rush Batch/ })).not.toBeInTheDocument();
      expect(within(dialog).getByText(/Rush Batch stays with the Preservers/)).toBeInTheDocument();
      expect(dialog).toHaveTextContent('2 years and 140 days');
      expect(dialog).toHaveTextContent('11 special and hidden achievements');

      const end = within(dialog).getByRole('button', { name: 'End Legacy' });
      expect(end).toBeDisabled();
      await user.click(within(dialog).getByRole('radio', { name: /Family Cookbook/ }));
      await user.click(within(dialog).getByRole('checkbox'));
      await user.click(end);

      expect(props.onEndLegacy).toHaveBeenCalledWith('preservers_family_cookbook');
    });

    it('carries a tenth of the money with a kept Golden Parachute', async () => {
      const user = userEvent.setup();
      const parachuting: GuildState = { ...member, legacy: { count: 1, keptLevels: {}, keptUnlocks: ['merchants_golden_parachute'], history: [] } };
      renderTab({ guildState: parachuting, farmTier: 6, onEndLegacy: vi.fn(), legacyReset: reset });

      await user.click(screen.getByRole('button', { name: /End Legacy/ }));
      const dialog = screen.getByRole('dialog', { name: 'End your Legacy?' });
      expect(dialog).toHaveTextContent('$500000 from Golden Parachute, a tenth of your money');
      expect(dialog).toHaveTextContent('$5000000 → $500000');
    });

    it('shows the Legacy box while the guilds are still locked', () => {
      renderTab({ guildState: carried, farmTier: 1 });

      // The Legacy box comes first; the big locked card gives way to a short note
      expect(screen.queryByRole('heading', { name: 'Guilds System Locked' })).not.toBeInTheDocument();
      const note = screen.getByRole('heading', { name: 'Guilds unlock at Farm Tier 5' });
      const box = screen.getByRole('region', { name: /Your Legacy/ });
      expect(box.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(box).toHaveTextContent('Legacy II');
      expect(box).toHaveTextContent('Cellar Recipes');
      expect(box).toHaveTextContent('Cellar Aging 3');
      expect(box).toHaveTextContent('Choose a guild again at Farm Tier 5');
    });

    it('shows kept levels on the rows and a kept unlock as Kept', () => {
      renderTab({
        guildState: { ...member, legacy: carried.legacy, upgradeLevels: { ...member.upgradeLevels, preservers_cellar_aging: 2 }, purchasedUpgrades: member.purchasedUpgrades.filter(id => id !== 'preservers_cellar_recipes') }
      });

      const aging = screen.getByRole('heading', { name: 'Cellar Aging' }).parentElement!.parentElement!;
      expect(aging).toHaveTextContent('Lv. 5/10');
      expect(aging).toHaveTextContent('3 from Legacy');
      expect(buyButton('Cellar Recipes')).toHaveTextContent('Kept');
      expect(buyButton('Cellar Recipes')).toBeDisabled();
    });
  });

  describe('effect text', () => {
    it('shows a multiplier as itself, not as a percentage', () => {
      renderTab({
        guildState: {
          ...committedGrowersState,
          purchasedUpgrades: ['growers_whispers_of_seed'],
          upgradeLevels: { growers_whispers_of_seed: 1 },
        }
      });

      expect(screen.getByText(/^Now: 10× multiplier/)).toBeInTheDocument();
    });
  });

  describe('icons', () => {
    it('shows no emoji on the locked card', () => {
      renderTab({ farmTier: GUILDS_UNLOCK_TIER - 1 });
      expect(document.body.textContent).not.toMatch(emoji);
    });

    it('shows no emoji in the intro, the guild picker or the commit dialog', async () => {
      const user = userEvent.setup();
      renderTab({ guildState: sampledGrowersState, introShown: false });
      expect(document.body.textContent).not.toMatch(emoji);

      await user.click(screen.getByRole('button', { name: 'I Understand' }));
      await user.click(growersCard());
      await user.click(screen.getByRole('button', { name: 'Commit to Guild' }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(document.body.textContent).not.toMatch(emoji);
    });

    it('shows no emoji on the Growers page after committing', () => {
      renderTab({ guildState: committedGrowersState });
      expect(document.body.textContent).not.toMatch(emoji);
    });
  });

  describe('intro dialog', () => {
    it('is a labelled modal dialog that takes focus', async () => {
      renderTab({ introShown: false });

      const dialog = screen.getByRole('dialog', { name: 'Choose Your Path' });
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      await waitFor(() => expect(within(dialog).getByRole('button', { name: 'I Understand' })).toHaveFocus());
    });

    it('lists every way to earn Guild Tokens', () => {
      renderTab({ introShown: false });

      const dialog = screen.getByRole('dialog', { name: 'Choose Your Path' });
      for (const line of ['+1 per manual harvest', '+1 per 5 canned goods', '+2 per batch of honey', '+1 per 10 auto harvests']) {
        expect(within(dialog).getByText(line)).toBeInTheDocument();
      }
    });

    it('closes on Escape', async () => {
      const user = userEvent.setup();
      const props = renderTab({ introShown: false });

      await user.keyboard('{Escape}');

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(props.onDismissIntro).toHaveBeenCalledTimes(1);
    });

    it('ignores Escape while the tab is hidden', async () => {
      const user = userEvent.setup();
      const onDismissIntro = vi.fn();
      // App keeps inactive tabs mounted inside a display: none panel
      render(
        <div style={{ display: 'none' }}>
          <GuildsTab
            isActive={false}
            farmTier={GUILDS_UNLOCK_TIER}
            guildState={DEFAULT_GUILD_STATE}
            money={0}
            knowledge={0}
            experience={0}
            introShown={false}
            onDismissIntro={onDismissIntro}
            onCommitToGuild={vi.fn()}
            onPurchaseUpgrade={vi.fn()}
            formatNumber={formatNumber}
          />
        </div>
      );

      await user.keyboard('{Escape}');

      expect(onDismissIntro).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog', { hidden: true })).toBeInTheDocument();
    });

    it('moves focus into the intro once the tab is opened', async () => {
      const props = {
        farmTier: GUILDS_UNLOCK_TIER,
        guildState: DEFAULT_GUILD_STATE,
        money: 0,
        knowledge: 0,
        experience: 0,
        introShown: false,
        onDismissIntro: vi.fn(),
        onCommitToGuild: vi.fn(),
        onPurchaseUpgrade: vi.fn(),
        formatNumber
      };
      const { rerender } = render(<GuildsTab {...props} isActive={false} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog.contains(document.activeElement)).toBe(false);

      rerender(<GuildsTab {...props} isActive={true} />);

      await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    });
  });

  describe('commit dialog', () => {
    const openCommitDialog = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(growersCard());
      await user.click(screen.getByRole('button', { name: 'Commit to Guild' }));
      return screen.getByRole('dialog', { name: 'Commit to Growers Guild?' });
    };

    it('closes on Escape without committing and returns focus', async () => {
      const user = userEvent.setup();
      const props = renderTab({ guildState: sampledGrowersState });

      const dialog = await openCommitDialog(user);
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus());

      await user.keyboard('{Escape}');

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(props.onCommitToGuild).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Commit to Guild' })).toHaveFocus();
    });

    it('commits to the selected guild', async () => {
      const user = userEvent.setup();
      const props = renderTab({ guildState: sampledGrowersState });

      const dialog = await openCommitDialog(user);
      await user.click(within(dialog).getByRole('button', { name: 'Commit Forever' }));

      expect(props.onCommitToGuild).toHaveBeenCalledWith('growers');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
