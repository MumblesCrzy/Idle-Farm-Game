/**
 * Tests for useOfflineProgress hook
 * 
 * @module test/useOfflineProgress.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOfflineProgress, type OfflineGameState, type OfflineProgressCallbacks } from '../hooks/useOfflineProgress';
import type { UseChristmasEventReturn } from '../hooks/useChristmasEvent';
import type { Veggie } from '../types/game';

describe('useOfflineProgress', () => {
  // Mock localStorage
  const localStorageMock: Record<string, string> = {};
  
  // Mock document.hidden
  let hiddenValue = false;
  
  // Store event listeners
  const eventListeners: Record<string, (() => void)[]> = {};
  
  // Track intervals
  let intervalId = 0;
  const activeIntervals: Record<number, NodeJS.Timeout> = {};
  
  // Mock game state ref
  const createMockGameStateRef = (): React.MutableRefObject<OfflineGameState> => ({
    current: {
      veggies: [] as Veggie[],
      day: 1,
      totalDaysElapsed: 5,
      season: 'Spring',
      currentWeather: 'Clear',
      greenhouseOwned: false,
      irrigationOwned: false,
      almanacLevel: 0,
      farmTier: 0,
      knowledge: 0,
      christmasEvent: {
        isEventActive: false,
        passiveCheerPerSecond: 0,
        eventState: { upgrades: [] },
        processTreeGrowth: vi.fn(),
        updatePassiveIncome: vi.fn(),
        processDailyElvesCrafting: vi.fn(),
      } as unknown as UseChristmasEventReturn,
    },
  });

  // Mock callbacks
  const createMockCallbacks = (): OfflineProgressCallbacks => ({
    setVeggies: vi.fn(),
    setExperience: vi.fn(),
    setKnowledge: vi.fn(),
    setDay: vi.fn(),
    setTotalDaysElapsed: vi.fn(),
    onOfflineProgressProcessed: vi.fn(),
  });

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Reset localStorage mock
    Object.keys(localStorageMock).forEach(key => delete localStorageMock[key]);
    
    // Mock localStorage
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
      return localStorageMock[key] || null;
    });
    
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
      localStorageMock[key] = value;
    });
    
    // Mock document.hidden
    hiddenValue = false;
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => hiddenValue,
    });
    
    // Reset event listeners
    Object.keys(eventListeners).forEach(key => delete eventListeners[key]);
    
    vi.spyOn(document, 'addEventListener').mockImplementation((event: string, handler: EventListener) => {
      if (!eventListeners[event]) {
        eventListeners[event] = [];
      }
      eventListeners[event].push(handler as () => void);
    });
    
    vi.spyOn(document, 'removeEventListener').mockImplementation((event: string, handler: EventListener) => {
      if (eventListeners[event]) {
        eventListeners[event] = eventListeners[event].filter(h => h !== handler);
      }
    });
    
    // Mock setInterval/clearInterval
    vi.spyOn(global, 'setInterval').mockImplementation((fn: () => void) => {
      intervalId += 1;
      const id = intervalId;
      activeIntervals[id] = setTimeout(() => {}, 0) as unknown as NodeJS.Timeout;
      return id as unknown as NodeJS.Timeout;
    });
    
    vi.spyOn(global, 'clearInterval').mockImplementation((id: NodeJS.Timeout) => {
      delete activeIntervals[id as unknown as number];
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Clear any remaining intervals
    Object.keys(activeIntervals).forEach(id => {
      clearTimeout(activeIntervals[Number(id)]);
      delete activeIntervals[Number(id)];
    });
  });

  describe('initialization', () => {
    it('should set last active time on mount', () => {
      const gameStateRef = createMockGameStateRef();
      const callbacks = createMockCallbacks();

      renderHook(() => useOfflineProgress(gameStateRef, callbacks));

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'farmIdleLastActive',
        expect.any(String)
      );
    });

    it('should add visibility change event listener', () => {
      const gameStateRef = createMockGameStateRef();
      const callbacks = createMockCallbacks();

      renderHook(() => useOfflineProgress(gameStateRef, callbacks));

      expect(document.addEventListener).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function)
      );
    });

    it('should set up periodic update interval', () => {
      const gameStateRef = createMockGameStateRef();
      const callbacks = createMockCallbacks();

      renderHook(() => useOfflineProgress(gameStateRef, callbacks));

      expect(global.setInterval).toHaveBeenCalledWith(expect.any(Function), 10000);
    });
  });

  describe('cleanup', () => {
    it('should remove event listener on cleanup', () => {
      const gameStateRef = createMockGameStateRef();
      const callbacks = createMockCallbacks();

      const { unmount } = renderHook(() => useOfflineProgress(gameStateRef, callbacks));
      unmount();

      expect(document.removeEventListener).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function)
      );
    });

    it('should clear interval on cleanup', () => {
      const gameStateRef = createMockGameStateRef();
      const callbacks = createMockCallbacks();

      const { unmount } = renderHook(() => useOfflineProgress(gameStateRef, callbacks));
      unmount();

      expect(global.clearInterval).toHaveBeenCalled();
    });
  });

  describe('visibility changes', () => {
    it('should save timestamp when tab becomes hidden', () => {
      const gameStateRef = createMockGameStateRef();
      const callbacks = createMockCallbacks();

      renderHook(() => useOfflineProgress(gameStateRef, callbacks));

      // Clear previous calls
      vi.mocked(localStorage.setItem).mockClear();

      // Simulate tab becoming hidden
      hiddenValue = true;
      
      // Trigger visibility change
      if (eventListeners['visibilitychange']) {
        act(() => {
          eventListeners['visibilitychange'].forEach(handler => handler());
        });
      }

      // Should have saved current time
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'farmIdleLastActive',
        expect.any(String)
      );
    });

    it('should check for last active time when tab becomes visible', () => {
      const gameStateRef = createMockGameStateRef();
      const callbacks = createMockCallbacks();

      // Set a last active time
      localStorageMock['farmIdleLastActive'] = Date.now().toString();

      renderHook(() => useOfflineProgress(gameStateRef, callbacks));

      // Clear previous calls
      vi.mocked(localStorage.getItem).mockClear();

      // Simulate tab becoming visible
      hiddenValue = false;
      
      // Trigger visibility change
      if (eventListeners['visibilitychange']) {
        act(() => {
          eventListeners['visibilitychange'].forEach(handler => handler());
        });
      }

      // Should have checked last active time
      expect(localStorage.getItem).toHaveBeenCalledWith('farmIdleLastActive');
    });
  });

  describe('offline progress detection', () => {
    it('should not process if no last active time exists', () => {
      const gameStateRef = createMockGameStateRef();
      const callbacks = createMockCallbacks();

      // Don't set any last active time
      renderHook(() => useOfflineProgress(gameStateRef, callbacks));

      // Callbacks should not be called because there's no previous session
      expect(callbacks.setVeggies).not.toHaveBeenCalled();
    });

    it('should not process if elapsed time is too short', () => {
      // Set last active time to 100ms ago (too short)
      localStorageMock['farmIdleLastActive'] = (Date.now() - 100).toString();

      const gameStateRef = createMockGameStateRef();
      const callbacks = createMockCallbacks();

      renderHook(() => useOfflineProgress(gameStateRef, callbacks));

      // Callbacks should not be called because time is too short
      expect(callbacks.setVeggies).not.toHaveBeenCalled();
    });
  });

  describe('hook parameters', () => {
    it('should accept null beeContext', () => {
      const gameStateRef = createMockGameStateRef();
      const callbacks = createMockCallbacks();

      // Should not throw
      expect(() => {
        renderHook(() => useOfflineProgress(gameStateRef, callbacks, null));
      }).not.toThrow();
    });

    it('should handle optional onOfflineProgressProcessed callback', () => {
      const gameStateRef = createMockGameStateRef();
      const callbacksWithoutOnProgress: OfflineProgressCallbacks = {
        setVeggies: vi.fn(),
        setExperience: vi.fn(),
        setKnowledge: vi.fn(),
        setDay: vi.fn(),
        setTotalDaysElapsed: vi.fn(),
        // No onOfflineProgressProcessed
      };

      // Should not throw
      expect(() => {
        renderHook(() => useOfflineProgress(gameStateRef, callbacksWithoutOnProgress));
      }).not.toThrow();
    });
  });
});
