/**
 * Tests for Archie's looks in Settings: looks earned from achievements stay locked until the
 * achievement unlocks, and the fall looks come from the 2nd and 5th pumpkin achievements.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsOverlay from '../components/SettingsOverlay';
import type { ArchieAppearance } from '../data/archieLooks';

const renderSettings = (unlockedAchievements: string[] = [], archieAppearance: ArchieAppearance = 'default') => {
  const setArchieAppearance = vi.fn();
  render(
    <SettingsOverlay
      visible
      onClose={vi.fn()}
      soundEnabled
      setSoundEnabled={vi.fn()}
      archieAppearance={archieAppearance}
      setArchieAppearance={setArchieAppearance}
      unlockedAchievements={unlockedAchievements}
      handleExportSave={vi.fn()}
      handleImportSave={vi.fn()}
      handleResetGame={vi.fn()}
    />
  );
  return setArchieAppearance;
};

describe("SettingsOverlay: Archie's looks", () => {
  it('locks each earned look until its achievement unlocks', () => {
    renderSettings();

    expect(screen.getByRole('button', { name: "Locked: Unlock 'Roadside Favorite' achievement" })).toBeDisabled();
    expect(screen.getByRole('button', { name: "Locked: Unlock 'Pumpkin Legend' achievement" })).toBeDisabled();
    expect(screen.getByRole('button', { name: "Locked: Unlock 'Archie's Winter Sweater' achievement" })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Archie with pinecones' })).toBeEnabled();
  });

  it('wears the Fall Sweater after Roadside Favorite and the Warlock Costume after Pumpkin Legend', async () => {
    const setArchieAppearance = renderSettings(['pumpkin_50_sold', 'pumpkin_2500_sold']);

    await userEvent.click(screen.getByRole('button', { name: "Archie's fall sweater" }));
    await userEvent.click(screen.getByRole('button', { name: "Archie's warlock costume" }));

    expect(setArchieAppearance.mock.calls).toEqual([['fallSweater'], ['warlock']]);
  });

  it('marks the look Archie is wearing', () => {
    renderSettings(['pumpkin_2500_sold'], 'warlock');

    expect(screen.getByRole('button', { name: "Archie's warlock costume" })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Default Archie appearance' })).toHaveAttribute('aria-pressed', 'false');
  });
});
