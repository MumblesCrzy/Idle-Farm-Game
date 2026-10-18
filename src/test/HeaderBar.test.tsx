/**
 * Tests for the header buttons: the Buy Me a Coffee mug sits right of Settings and
 * opens the page in a new tab.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import HeaderBar from '../components/HeaderBar';

describe('HeaderBar', () => {
  it('links to Buy Me a Coffee in a new tab, right of Settings', () => {
    render(
      <HeaderBar
        setShowInfoOverlay={vi.fn()}
        setShowSettingsOverlay={vi.fn()}
        setShowAchievements={vi.fn()}
        setShowEventLog={vi.fn()}
      />
    );

    const link = screen.getByRole('link', { name: /Buy me a coffee/ });
    expect(link).toHaveAttribute('href', 'https://buymeacoffee.com/MumblesCrzy');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByRole('button', { name: /settings/i }).nextElementSibling).toBe(link);
  });
});
