/**
 * Tests for the Shopfront tab, driven by the real Christmas event hook.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import ShopfrontTab from '../components/ShopfrontTab';
import { useChristmasEvent } from '../hooks/useChristmasEvent';
import { formatNumber } from '../utils/gameCalculations';
import type { ChristmasEventState } from '../types/christmasEvent';

/** Renders the tab with the real hook, plus the balance for checking */
function Harness({ initialState }: { initialState?: Partial<ChristmasEventState> }) {
  const event = useChristmasEvent({ farmTier: 1, initialState });
  return (
    <>
      <output data-testid="cheer">{event.holidayCheer}</output>
      <ShopfrontTab
        treeInventory={event.eventState.treeInventory}
        materials={event.materials}
        sellTrees={event.sellTrees}
        sellGarland={event.sellGarland}
        sellCandle={event.sellCandle}
        sellOrnament={event.sellOrnament}
        demandMultiplier={event.eventState.marketDemand.demandMultiplier}
        holidayCheer={event.holidayCheer}
        upgrades={event.eventState.upgrades}
        formatNumber={formatNumber}
        purchaseUpgrade={event.purchaseUpgrade}
        milestones={event.eventState.milestones}
        totalTreesSold={event.totalTreesSold}
        claimMilestone={event.claimMilestone}
      />
    </>
  );
}

const cheer = () => Number(screen.getByTestId('cheer').textContent);

describe('ShopfrontTab', () => {
  it('shows sales milestones and pays Holiday Cheer when one is claimed', () => {
    render(<Harness initialState={{ totalTreesSold: 60, holidayCheer: 0 }} />);

    const milestones = screen.getByRole('region', { name: 'Sales milestones' });
    expect(within(milestones).getByText('Trees sold: 60')).toBeTruthy();
    // First Sale and Growing Business are reached; the rest are not
    const claims = within(milestones).getAllByRole('button', { name: /^Claim/ });
    expect(claims).toHaveLength(2);
    expect(within(milestones).getByText('60 / 250 sold')).toBeTruthy();

    fireEvent.click(within(milestones).getByRole('button', { name: 'Claim First Sale reward: 50 Holiday Cheer' }));
    expect(cheer()).toBe(50);
    expect(within(milestones).getByText('Claimed')).toBeTruthy();
    expect(within(milestones).getAllByRole('button', { name: /^Claim/ })).toHaveLength(1);
  });
});
