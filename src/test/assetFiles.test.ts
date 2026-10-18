/**
 * Every image the game loads is in public/ under exactly that name. itch.io serves files
 * case-sensitively, so a name that differs only in case works on Windows and breaks there.
 */
import { describe, it, expect } from 'vitest';
import { ALL_IMAGES, getVeggieImage } from '../config/assetPaths';
import { VEGGIE_CONFIGS } from '../data/veggieConfigs';
import { FRUIT_CONFIGS } from '../data/fruitConfigs';

const PUBLIC_FILES = new Set(Object.keys(import.meta.glob('/public/*')).map(file => file.replace('/public/', './')));

describe('game images', () => {
  it('finds every preloaded image in public/ under its exact name', () => {
    expect(ALL_IMAGES.filter(src => !PUBLIC_FILES.has(src))).toEqual([]);
  });

  it('has a picture for every vegetable and fruit', () => {
    const pictures = [...VEGGIE_CONFIGS, ...FRUIT_CONFIGS].map(crop => getVeggieImage(crop.name));
    expect(pictures.filter(src => !PUBLIC_FILES.has(src))).toEqual([]);
  });
});
