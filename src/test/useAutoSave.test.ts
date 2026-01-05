/**
 * Tests for useAutoSave hook
 * 
 * @module test/useAutoSave.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoSave, type UseAutoSaveConfig } from '../hooks/useAutoSave';
import type { ExtendedGameState } from '../utils/saveSystem';

// Mock the saveSystem module
vi.mock('../utils/saveSystem', () => ({
  saveGameStateWithCanning: vi.fn(),
}));

import { saveGameStateWithCanning } from '../utils/saveSystem';

describe('useAutoSave', () => {
  // Store event listeners
  const eventListeners: Record<string, (() => void)[]> = {};

  // Create mock game state
  const createMockGameState = (): ExtendedGameState => ({
    veggies: [],
    money: 100,
    experience: 50,
    knowledge: 25,
    activeVeggie: 0,
    day: 5,
    greenhouseOwned: false,
    heirloomOwned: false,
    autoSellOwned: false,
    almanacLevel: 0,
    almanacCost: 100,
    maxPlots: 10,
    farmTier: 0,
    farmCost: 1000,
    irrigationOwned: false,
    currentWeather: 'Clear',
    highestUnlockedVeggie: 0,
  });

  // Create config with mock getGameState
  const createConfig = (overrides: Partial<UseAutoSaveConfig> = {}): UseAutoSaveConfig => ({
    skipSave: false,
    getGameState: vi.fn(() => createMockGameState()),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Reset event listeners
    Object.keys(eventListeners).forEach(key => delete eventListeners[key]);
    
    // Mock addEventListener/removeEventListener
    vi.spyOn(window, 'addEventListener').mockImplementation((event: string, handler: EventListener) => {
      if (!eventListeners[event]) {
        eventListeners[event] = [];
      }
      eventListeners[event].push(handler as () => void);
    });
    
    vi.spyOn(window, 'removeEventListener').mockImplementation((event: string, handler: EventListener) => {
      if (eventListeners[event]) {
        eventListeners[event] = eventListeners[event].filter(h => h !== handler);
      }
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should register beforeunload event listener', () => {
      const config = createConfig();
      
      renderHook(() => useAutoSave(config));
      
      expect(window.addEventListener).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      );
    });
  });

  describe('cleanup', () => {
    it('should remove beforeunload event listener on unmount', () => {
      const config = createConfig();
      
      const { unmount } = renderHook(() => useAutoSave(config));
      unmount();
      
      expect(window.removeEventListener).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function)
      );
    });
  });

  describe('skipSave behavior', () => {
    it('should not save when skipSave is true', () => {
      const config = createConfig({ skipSave: true });
      
      renderHook(() => useAutoSave(config));
      
      // Advance time past throttle window
      act(() => {
        vi.advanceTimersByTime(35000);
      });
      
      expect(saveGameStateWithCanning).not.toHaveBeenCalled();
    });

    it('should save when skipSave is false after throttle period', () => {
      const config = createConfig({ skipSave: false });
      
      renderHook(() => useAutoSave(config));
      
      // Advance time past throttle window
      act(() => {
        vi.advanceTimersByTime(35000);
      });
      
      expect(saveGameStateWithCanning).toHaveBeenCalled();
    });
  });

  describe('getGameState', () => {
    it('should call getGameState when saving', () => {
      const getGameState = vi.fn(() => createMockGameState());
      const config = createConfig({ getGameState });
      
      renderHook(() => useAutoSave(config));
      
      // Advance past throttle
      act(() => {
        vi.advanceTimersByTime(35000);
      });
      
      expect(getGameState).toHaveBeenCalled();
    });

    it('should not call saveGameStateWithCanning if getGameState returns null', () => {
      const getGameState = vi.fn(() => null);
      const config = createConfig({ getGameState });
      
      renderHook(() => useAutoSave(config));
      
      // Advance past throttle
      act(() => {
        vi.advanceTimersByTime(35000);
      });
      
      // getGameState was called but save wasn't
      expect(getGameState).toHaveBeenCalled();
      expect(saveGameStateWithCanning).not.toHaveBeenCalled();
    });
  });

  describe('forceSave', () => {
    it('should return forceSave function', () => {
      const config = createConfig();
      
      const { result } = renderHook(() => useAutoSave(config));
      
      expect(typeof result.current.forceSave).toBe('function');
    });

    it('should save immediately when forceSave is called', () => {
      const config = createConfig();
      
      const { result } = renderHook(() => useAutoSave(config));
      
      act(() => {
        result.current.forceSave();
      });
      
      expect(saveGameStateWithCanning).toHaveBeenCalled();
    });
  });

  describe('markPendingChanges', () => {
    it('should return markPendingChanges function', () => {
      const config = createConfig();
      
      const { result } = renderHook(() => useAutoSave(config));
      
      expect(typeof result.current.markPendingChanges).toBe('function');
    });

    it('should not throw when called', () => {
      const config = createConfig();
      
      const { result } = renderHook(() => useAutoSave(config));
      
      expect(() => {
        act(() => {
          result.current.markPendingChanges();
        });
      }).not.toThrow();
    });
  });

  describe('beforeunload handler', () => {
    it('should register beforeunload handler', () => {
      const config = createConfig();
      
      renderHook(() => useAutoSave(config));
      
      expect(eventListeners['beforeunload']).toBeDefined();
      expect(eventListeners['beforeunload'].length).toBeGreaterThan(0);
    });
  });
});
