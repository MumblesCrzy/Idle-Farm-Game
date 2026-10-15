/**
 * Tests for the bees tab's locked state.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BeesTab from '../components/BeesTab';
import { BEE_CONSTANTS } from '../config/gameConstants';

const UNLOCK_TIER = BEE_CONSTANTS.UNLOCK_FARM_TIER;

const formatNumber = (num: number, decimalPlaces = 0) => num.toFixed(decimalPlaces);

describe('BeesTab', () => {
  it('shows the locked card below the unlock tier', () => {
    render(<BeesTab beeContext={null} farmTier={UNLOCK_TIER - 1} season="Spring" formatNumber={formatNumber} />);

    expect(screen.getByRole('heading', { level: 2, name: 'Bee Bee System Locked Bee' })).toBeInTheDocument();
    expect(screen.getAllByAltText('Bee')).toHaveLength(2);
    expect(screen.getAllByAltText('Bee')[0]).toHaveAttribute('width', '24');
    expect(screen.getByText('Current Tier:').parentElement).toHaveTextContent(`Current Tier: ${UNLOCK_TIER - 1}`);
    expect(screen.getByText('Required Tier:').parentElement).toHaveTextContent(`Required Tier: ${UNLOCK_TIER}`);
    expect(screen.getByRole('heading', { level: 3, name: 'What Bees Offer:' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByAltText('Golden Honey')).toHaveAttribute('width', '16');
    expect(screen.getByText('Keep farming and expanding to unlock this feature!')).toBeInTheDocument();
  });

  it('shows no locked card from the unlock tier', () => {
    render(<BeesTab beeContext={null} farmTier={UNLOCK_TIER} season="Spring" formatNumber={formatNumber} />);

    expect(screen.queryByRole('heading', { name: /Locked/ })).not.toBeInTheDocument();
    expect(screen.getByText('Loading bee system...')).toBeInTheDocument();
  });
});
