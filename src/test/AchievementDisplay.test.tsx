/**
 * Tests for the achievement list's reward line: named rewards, like Harvest Moon and
 * Archie's looks, show beside the Knowledge and Candy Corn.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AchievementDisplay from '../components/AchievementDisplay';
import { INITIAL_ACHIEVEMENTS } from '../data/achievements';

describe('AchievementDisplay', () => {
  it("names unlocks like Archie's looks in the reward line", () => {
    const achievements = INITIAL_ACHIEVEMENTS
      .filter(a => a.id === 'pumpkin_50_sold' || a.id === 'pumpkin_2500_sold')
      .map(a => ({ ...a, unlocked: false }));
    render(<AchievementDisplay visible onClose={vi.fn()} achievements={achievements} totalUnlocked={0} />);

    expect(screen.getByText("25 Knowledge + 150 Candy Corn + Archie's Fall Sweater")).toBeInTheDocument();
    expect(screen.getByText("200 Knowledge + 4,000 Candy Corn + Harvest Moon + Archie's Warlock Costume")).toBeInTheDocument();
  });
});
