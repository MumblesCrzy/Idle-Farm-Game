/**
 * Tests for the farm upgrades in the Growing tab's shed: what the Engineers change in them.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import GlobalUpgradesPanel from '../components/GlobalUpgradesPanel';
import { formatNumber } from '../utils/gameCalculations';
import { commitToGuild } from '../utils/guildCalculations';
import { DEFAULT_GUILD_STATE, type GuildState } from '../types/guilds';

const renderPanel = (guildState?: GuildState) => render(
  <GlobalUpgradesPanel
    money={0}
    knowledge={0}
    day={1}
    maxPlots={10}
    highestUnlockedVeggie={0}
    almanacLevel={0}
    almanacCost={10}
    irrigationOwned={false}
    irrigationCost={100}
    irrigationKnCost={10}
    autoSellOwned={false}
    greenhouseOwned={false}
    heirloomOwned={false}
    heirloomMoneyCost={100}
    heirloomKnowledgeCost={10}
    handleBuyAlmanac={vi.fn()}
    handleBuyIrrigation={vi.fn()}
    handleBuyAutoSell={vi.fn()}
    handleBuyGreenhouse={vi.fn()}
    handleBuyHeirloom={vi.fn()}
    formatNumber={formatNumber}
    guildState={guildState}
  />
);

describe('farm upgrades', () => {
  it('describe Irrigation, the Greenhouse and Heirloom Seeds', () => {
    renderPanel();

    expect(screen.getByText('+15% growth, no drought')).toBeInTheDocument();
    expect(screen.getByText('No winter slowdown')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Buy Heirloom Seeds for / })).toBeInTheDocument();
  });

  it('show what Sprinkler Network and Climate Control add, and call Heirloom Seeds GMO Seeds for Engineers', () => {
    const engineer: GuildState = {
      ...commitToGuild(DEFAULT_GUILD_STATE, 'engineers', 1),
      purchasedUpgrades: ['engineers_sprinkler_network', 'engineers_climate_control'],
      upgradeLevels: { engineers_sprinkler_network: 1, engineers_climate_control: 1 }
    };
    renderPanel(engineer);

    expect(screen.getByText('+30%, no drought or heatwave')).toBeInTheDocument();
    expect(screen.getByText('+20% growth all year')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Buy GMO Seeds for / })).toBeInTheDocument();
  });
});
