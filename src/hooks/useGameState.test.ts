/**
 * Tests for useGameState hook
 *
 * Tests save-data migration of veggies on load
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGameState } from './useGameState';
import { createInitialVeggies } from '../utils/gameCalculations';
import type { Veggie } from '../types/game';

describe('useGameState', () => {
  describe('veggie migration', () => {
    it('should enable auto-harvesters for saves made before the toggle existed', () => {
      const initialVeggies = createInitialVeggies();
      const oldSaveVeggie: Partial<Veggie> = { ...initialVeggies[0], harvesterOwned: true };
      delete oldSaveVeggie.autoHarvesterEnabled;

      const { result } = renderHook(() =>
        useGameState({ loadedState: { veggies: [oldSaveVeggie as Veggie] }, initialVeggies })
      );

      expect(result.current.veggies[0].autoHarvesterEnabled).toBe(true);
    });

    it('should keep a saved auto-harvester toggle that was turned off', () => {
      const initialVeggies = createInitialVeggies();
      const savedVeggie = { ...initialVeggies[0], harvesterOwned: true, autoHarvesterEnabled: false };

      const { result } = renderHook(() =>
        useGameState({ loadedState: { veggies: [savedVeggie] }, initialVeggies })
      );

      expect(result.current.veggies[0].autoHarvesterEnabled).toBe(false);
    });
  });
});
