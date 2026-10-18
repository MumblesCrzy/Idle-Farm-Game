/**
 * Tests for the recipe details modal opened from the canning panel.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RecipeDetailsModal from '../components/RecipeDetailsModal';
import type { Recipe } from '../types/canning';

const pickles: Recipe = {
  id: 'pickles',
  name: 'Pickles',
  description: 'Crunchy and sour.',
  ingredients: [
    { veggieIndex: 0, veggieName: 'Cucumbers', quantity: 3 },
    { veggieIndex: 1, veggieName: 'Onions', quantity: 2 },
  ],
  processingTime: 10,
  baseProcessingTime: 10,
  salePrice: 20,
  baseSalePrice: 20,
  experienceRequired: 0,
  unlocked: true,
  timesCompleted: 0,
};

const veggies = [
  { name: 'Cucumbers', stash: 5, salePrice: 2, betterSeedsLevel: 0 },
  { name: 'Onions', stash: 1, salePrice: 3, betterSeedsLevel: 0 },
];

const formatNumber = (num: number, decimalPlaces = 1) => num.toFixed(decimalPlaces);

type ModalProps = Parameters<typeof RecipeDetailsModal>[0];

const renderModal = (overrides: Partial<ModalProps> = {}) => {
  const props: ModalProps = {
    recipe: pickles,
    isVisible: true,
    onClose: vi.fn(),
    onStartCanning: vi.fn(),
    veggies,
    heirloomOwned: false,
    canMake: true,
    formatNumber,
    ...overrides,
  };
  render(<RecipeDetailsModal {...props} />);
  return props;
};

describe('RecipeDetailsModal', () => {
  it('renders nothing when hidden or without a recipe', () => {
    const { container } = render(
      <RecipeDetailsModal
        recipe={pickles}
        isVisible={false}
        onClose={vi.fn()}
        onStartCanning={vi.fn()}
        veggies={veggies}
        heirloomOwned={false}
        canMake
        formatNumber={formatNumber}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the recipe name, description and ingredient counts', () => {
    renderModal();
    expect(screen.getByRole('dialog', { name: 'Pickles' })).toBeInTheDocument();
    expect(screen.getByText('Crunchy and sour.')).toBeInTheDocument();
    expect(screen.getByText('Cucumbers × 3')).toBeInTheDocument();
    expect(screen.getByText('(Have: 5)')).toBeInTheDocument();
    expect(screen.getByText('(Have: 1)')).toBeInTheDocument();
  });

  it('shows sale price, raw value, profit and rewards', () => {
    renderModal();
    // Raw value: 3 cucumbers at $2 + 2 onions at $3 = $12; profit $8 (67%)
    expect(screen.getByText('$20.00')).toBeInTheDocument();
    expect(screen.getByText('$12.00')).toBeInTheDocument();
    expect(screen.getByText('$8.00 (67%)')).toBeInTheDocument();
    expect(screen.getByText('+4')).toBeInTheDocument();
    expect(screen.getByText('(Auto: +1)')).toBeInTheDocument();
    expect(screen.getByText('+20')).toBeInTheDocument();
    expect(screen.getByText('(Auto: +2)')).toBeInTheDocument();
    expect(screen.queryByText(/Better Seeds/)).not.toBeInTheDocument();
  });

  it('applies upgrades and the Better Seeds bonus', () => {
    renderModal({
      veggies: veggies.map(v => ({ ...v, betterSeedsLevel: 2 })),
      efficiencyMultiplier: 2,
      speedMultiplier: 0.55,
    });
    // 20 * 2 * 1.25^2 = 62.5
    expect(screen.getByText('$62.50')).toBeInTheDocument();
    expect(screen.getByText('(base: $20.00)')).toBeInTheDocument();
    expect(screen.getByText('Better Seeds: +56.25%')).toBeInTheDocument();
    // ceil(10 * 0.55) = 6
    expect(screen.getByText('6s')).toBeInTheDocument();
    expect(screen.getByText('(base: 10s)')).toBeInTheDocument();
  });

  it('closes from the close button and the backdrop, but not from inside the dialog', () => {
    const props = renderModal();
    fireEvent.click(screen.getByRole('dialog'));
    expect(props.onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Close Pickles details/ }));
    expect(props.onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('dialog').parentElement!);
    expect(props.onClose).toHaveBeenCalledTimes(2);
  });

  it('starts canning and closes when Start Canning is pressed', () => {
    const props = renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Start canning Pickles' }));
    expect(props.onStartCanning).toHaveBeenCalledWith('pickles');
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('lists missing ingredients when the recipe cannot be made', () => {
    renderModal({ canMake: false });
    expect(
      screen.getByRole('button', { name: 'Cannot start canning Pickles. Missing ingredients: Onions' })
    ).toBeDisabled();
    expect(screen.getByText('Missing: Onions')).toBeInTheDocument();
  });

  it('shows honey requirements with what the player has', () => {
    renderModal({
      recipe: { ...pickles, honeyRequirement: { regular: 5, golden: 1 } },
      regularHoney: 10,
      goldenHoney: 0,
    });
    expect(screen.getByText('Honey Required:')).toBeInTheDocument();
    expect(screen.getByText('Regular Honey × 5.000')).toBeInTheDocument();
    expect(screen.getByText('(Have: 10.000)')).toBeInTheDocument();
    expect(screen.getByText('Golden Honey × 1.000')).toBeInTheDocument();
    expect(screen.getByText('(Have: 0.000)')).toBeInTheDocument();
  });

  it('hides the honey section when the recipe needs no honey', () => {
    renderModal({ recipe: { ...pickles, honeyRequirement: { regular: 0, golden: 0 } } });
    expect(screen.queryByText('Honey Required:')).not.toBeInTheDocument();
  });
});
