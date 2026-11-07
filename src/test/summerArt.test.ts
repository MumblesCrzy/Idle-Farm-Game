/**
 * The Summer Festival art: every item has a drawn image, the upgrades have icons of their own,
 * and the rivals have portraits. assetFiles.test.ts checks that each preloaded file exists.
 */
import { describe, it, expect } from 'vitest';
import { SUMMER_ART, ALL_SUMMER_UPGRADES } from '../data/summerEventData';
import { RIVALS } from '../data/rivals';
import { INITIAL_ACHIEVEMENTS } from '../data/achievements';
import { ALL_IMAGES } from '../config/assetPaths';

describe('the Summer Festival art', () => {
  it('gives every item an image, each one preloaded', () => {
    for (const [key, art] of Object.entries(SUMMER_ART)) {
      expect(art.image, key).toBeTruthy();
      expect(ALL_IMAGES, key).toContain(art.image);
    }
  });

  it('gives each upgrade on the panels an icon of its own', () => {
    const shown = ALL_SUMMER_UPGRADES.filter(upgrade => !upgrade.id.startsWith('unlock_'));
    const icons = shown.map(upgrade => upgrade.icon);
    expect(new Set(icons).size).toBe(icons.length);
    for (const icon of icons) expect(ALL_IMAGES).toContain(icon);
  });

  it('gives each summer achievement a summer image', () => {
    const summerImages = new Set(Object.values(SUMMER_ART).map(art => art.image));
    for (const achievement of INITIAL_ACHIEVEMENTS.filter(a => a.id.startsWith('summer_'))) {
      expect(summerImages, achievement.id).toContain(achievement.icon);
    }
  });

  it('gives each rival a portrait', () => {
    for (const rival of RIVALS) expect(ALL_IMAGES, rival.id).toContain(rival.portrait);
    expect(new Set(RIVALS.map(rival => rival.portrait)).size).toBe(RIVALS.length);
  });
});
