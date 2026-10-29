/**
 * The Guilds help page: reachable from the help sidebar, and covers all four guilds and their visitors.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InfoOverlay from '../components/InfoOverlay';

describe('the Guilds help page', () => {
  it('explains Guild Tokens, all four guilds, their visitors and Legacy, without emoji', async () => {
    const user = userEvent.setup();
    render(<InfoOverlay visible onClose={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'View Guilds information' }));

    const page = screen.getByRole('heading', { level: 4, name: 'Guilds' }).parentElement!;
    for (const heading of [
      'Before You Join:', 'Growers Guild:', 'Preservers Guild:', 'Dunkin the Glutton:', 'Engineers Guild:', 'Stanley the Cat:',
      'Merchants Guild:', 'Ferdinand the Cat:', 'Legacy:'
    ]) {
      expect(page).toHaveTextContent(heading);
    }
    expect(page.textContent).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it('describes the Kitchen on the Canning page', async () => {
    const user = userEvent.setup();
    render(<InfoOverlay visible onClose={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'View Canning System information' }));

    const page = screen.getByRole('heading', { level: 4, name: 'Canning System' }).parentElement!;
    expect(page).toHaveTextContent('The Kitchen:');
    expect(page).toHaveTextContent('Heirloom Touch: 5% chance per level of a bonus jar');
    expect(page.textContent).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});
