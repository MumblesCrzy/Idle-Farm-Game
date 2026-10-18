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

describe('GuildsTab', () => {
  describe('locked card', () => {
    it('shows the locked card below the unlock tier', () => {
      renderTab({ farmTier: GUILDS_UNLOCK_TIER - 1 });

      expect(screen.getByRole('heading', { level: 2, name: '🏛️ Guilds System Locked 🏛️' })).toBeInTheDocument();
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
      for (const line of ['+1 per manual harvest', '+1 per 5 canned goods', '+2 per bee hive harvest', '+1 per 10 auto harvests']) {
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
