import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SettingsOverlay from '../components/SettingsOverlay';

describe('SettingsOverlay', () => {
  it('links to Buy Me a Coffee in a new tab', () => {
    render(
      <SettingsOverlay
        visible={true}
        onClose={vi.fn()}
        soundEnabled={true}
        setSoundEnabled={vi.fn()}
        archieAppearance="default"
        setArchieAppearance={vi.fn()}
        unlockedAchievements={[]}
        handleExportSave={vi.fn()}
        handleImportSave={vi.fn()}
        handleResetGame={vi.fn()}
      />
    );

    const link = screen.getByRole('link', { name: /Buy me a coffee/ });
    expect(link).toHaveAttribute('href', 'https://buymeacoffee.com/MumblesCrzy');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
