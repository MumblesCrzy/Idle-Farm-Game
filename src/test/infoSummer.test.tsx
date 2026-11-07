/**
 * The Summer Festival help page: reachable from the help sidebar, and covers all four sections,
 * the rivals and what waits while you're away.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InfoOverlay from '../components/InfoOverlay';
import { RIVAL_NAMES } from '../data/rivals';

describe('the Summer Festival help page', () => {
  it('explains the four sections, the rivals and Summer Sun', async () => {
    const user = userEvent.setup();
    render(<InfoOverlay visible onClose={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'View Summer Festival information' }));

    const page = screen.getByRole('heading', { level: 4, name: /Summer Watermelon Festival/ }).parentElement!;
    for (const heading of ['Melon Patch:', 'Juice Stand:', 'Festival Grounds:', 'Challenge Board:']) {
      expect(page).toHaveTextContent(heading);
    }
    expect(page).toHaveTextContent('Maggie Pickett, Earl Boone and the Vance Twins');
    expect(page).toHaveTextContent('Summer Sun: a permanent +5% crop yield every summer');
    expect(page).toHaveTextContent('the challenges wait for you');
  });

  it('names the same rivals on the Pumpkin Rush page', async () => {
    const user = userEvent.setup();
    render(<InfoOverlay visible onClose={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'View Pumpkin Rush information' }));

    const page = screen.getByRole('heading', { level: 4, name: /Fall Pumpkin Rush/ }).parentElement!;
    expect(page).toHaveTextContent(`${RIVAL_NAMES[0]}, ${RIVAL_NAMES[1]} and the Vance Twins grow heavier giants`);
  });
});
