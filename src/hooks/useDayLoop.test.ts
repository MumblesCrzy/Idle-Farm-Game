import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDayLoop } from './useDayLoop';
import type { UseChristmasEventReturn } from './useChristmasEvent';

// Track registered callbacks
let registeredCallbacks: Array<() => void> = [];

// Mock the game clock: capture each tick callback for manual triggering
vi.mock('./useGameClock', () => ({
  useGameTick: (callback: () => void) => {
    // Store callback for manual triggering in tests
    registeredCallbacks.push(callback);
  }
}));

describe('useDayLoop', () => {
  // Create mock dependencies
  const createMockDependencies = (overrides = {}) => {
    return {
      setDay: vi.fn((updater) => {
        if (typeof updater === 'function') {
          return updater(1);
        }
        return updater;
      }),
      setTotalDaysElapsed: vi.fn(),
      setGlobalAutoPurchaseTimer: vi.fn(),
      autoSellOwnedRef: { current: false },
      christmasEventRef: { current: null as UseChristmasEventReturn | null },
      isPausedRef: { current: false },
      handleSell: vi.fn(),
      ...overrides
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    registeredCallbacks = [];
  });

  afterEach(() => {
    registeredCallbacks = [];
  });

  // Helper to trigger the main day loop (first registered callback)
  const triggerDayLoop = () => {
    if (registeredCallbacks[0]) {
      registeredCallbacks[0]();
    }
  };

  // Helper to trigger the elves bench loop (second registered callback)
  const triggerElvesBenchLoop = () => {
    if (registeredCallbacks[1]) {
      registeredCallbacks[1]();
    }
  };

  describe('initialization', () => {
    it('should register two interval callbacks', () => {
      const deps = createMockDependencies();
      renderHook(() => useDayLoop(deps));
      
      expect(registeredCallbacks.length).toBe(2);
    });
  });

  describe('day progression', () => {
    it('should increment total days elapsed', () => {
      const deps = createMockDependencies();
      renderHook(() => useDayLoop(deps));
      
      act(() => {
        triggerDayLoop();
      });
      
      expect(deps.setTotalDaysElapsed).toHaveBeenCalled();
    });

    it('should update current day', () => {
      const deps = createMockDependencies();
      renderHook(() => useDayLoop(deps));
      
      act(() => {
        triggerDayLoop();
      });
      
      expect(deps.setDay).toHaveBeenCalled();
    });

    it('should cycle day from 365 back to 1', () => {
      let capturedDay = 0;
      const deps = createMockDependencies({
        setDay: vi.fn((updater) => {
          if (typeof updater === 'function') {
            capturedDay = updater(365);
          }
        })
      });
      
      renderHook(() => useDayLoop(deps));
      
      act(() => {
        triggerDayLoop();
      });
      
      expect(capturedDay).toBe(1); // (365 % 365) + 1 = 1
    });

    it('should increment auto-purchase timer each day', () => {
      let timerIncremented = false;
      const deps = createMockDependencies({
        setDay: vi.fn((updater) => {
          if (typeof updater === 'function') {
            updater(1); // Call the updater to trigger the inner logic
          }
        }),
        setGlobalAutoPurchaseTimer: vi.fn(() => {
          timerIncremented = true;
        })
      });
      
      renderHook(() => useDayLoop(deps));
      
      act(() => {
        triggerDayLoop();
      });
      
      // The setGlobalAutoPurchaseTimer is called inside setDay callback
      expect(timerIncremented).toBe(true);
    });
  });

  describe('pause', () => {
    it('skips day progression while paused', () => {
      const deps = createMockDependencies({ isPausedRef: { current: true } });

      renderHook(() => useDayLoop(deps));
      act(() => {
        triggerDayLoop();
      });

      expect(deps.setDay).not.toHaveBeenCalled();
      expect(deps.setTotalDaysElapsed).not.toHaveBeenCalled();
    });

    it('skips Elves\' Bench crafting while paused', () => {
      const processDailyElvesCrafting = vi.fn();
      const deps = createMockDependencies({
        isPausedRef: { current: true },
        christmasEventRef: {
          current: {
            isEventActive: true,
            processDailyElvesCrafting,
            eventState: { upgrades: [{ id: 'elves_bench', owned: true }] },
          } as unknown as UseChristmasEventReturn,
        },
      });

      renderHook(() => useDayLoop(deps));
      act(() => {
        triggerElvesBenchLoop();
      });

      expect(processDailyElvesCrafting).not.toHaveBeenCalled();
    });
  });

  describe('total days', () => {
    it('keeps counting past 80 years', () => {
      let capturedTotal = 0;
      const deps = createMockDependencies({
        setTotalDaysElapsed: vi.fn((updater) => {
          if (typeof updater === 'function') {
            capturedTotal = updater(29200);
          }
          return capturedTotal;
        }),
      });

      renderHook(() => useDayLoop(deps));

      act(() => {
        triggerDayLoop();
      });

      expect(capturedTotal).toBe(29201);
    });
  });

  describe('auto-sell', () => {
    it('should not trigger auto-sell when autoSellOwned is false', () => {
      vi.useFakeTimers();
      
      const deps = createMockDependencies({
        autoSellOwnedRef: { current: false },
        setDay: vi.fn((updater) => {
          if (typeof updater === 'function') {
            return updater(29); // Day 30 would trigger auto-sell
          }
          return updater;
        })
      });
      
      const { rerender } = renderHook(() => useDayLoop(deps));
      
      act(() => {
        triggerDayLoop();
      });
      // Stand in for the commit after which a merchant sale would run
      rerender();
      
      expect(deps.handleSell).not.toHaveBeenCalled();
      
      vi.useRealTimers();
    });

    it('should trigger auto-sell on merchant day when autoSellOwned is true', () => {
      const handleSell = vi.fn();
      const deps = createMockDependencies({
        autoSellOwnedRef: { current: true },
        handleSell,
        setDay: vi.fn((updater) => {
          if (typeof updater === 'function') {
            updater(29); // Execute the callback which triggers auto-sell logic
          }
        })
      });
      
      const { rerender } = renderHook(() => useDayLoop(deps));
      
      act(() => {
        triggerDayLoop();
      });
      // The sale runs after the new day is committed; the mocked setDay never
      // commits, so render once more to stand in for that commit
      rerender();
      
      expect(handleSell).toHaveBeenCalledWith(true);
    });

    it('should not trigger auto-sell on non-merchant days', () => {
      vi.useFakeTimers();
      
      const deps = createMockDependencies({
        autoSellOwnedRef: { current: true },
        setDay: vi.fn((updater) => {
          if (typeof updater === 'function') {
            updater(14); // Execute callback - Day 15, not a merchant day
          }
        })
      });
      
      const { rerender } = renderHook(() => useDayLoop(deps));
      
      act(() => {
        triggerDayLoop();
      });
      // Stand in for the commit after which a merchant sale would run
      rerender();
      
      expect(deps.handleSell).not.toHaveBeenCalled();
      
      vi.useRealTimers();
    });
  });

  describe('christmas event integration', () => {
    it('should process tree growth when christmas event is active', () => {
      const mockProcessTreeGrowth = vi.fn();
      const mockUpdatePassiveIncome = vi.fn();
      
      const deps = createMockDependencies({
        christmasEventRef: {
          current: {
            isEventActive: true,
            processTreeGrowth: mockProcessTreeGrowth,
            updatePassiveIncome: mockUpdatePassiveIncome,
            eventState: { upgrades: [] }
          } as unknown as UseChristmasEventReturn
        }
      });
      
      renderHook(() => useDayLoop(deps));
      
      act(() => {
        triggerDayLoop();
      });
      
      expect(mockProcessTreeGrowth).toHaveBeenCalled();
      expect(mockUpdatePassiveIncome).toHaveBeenCalledWith(1000);
    });

    it('should not process tree growth when christmas event is inactive', () => {
      const mockProcessTreeGrowth = vi.fn();
      
      const deps = createMockDependencies({
        christmasEventRef: {
          current: {
            isEventActive: false,
            processTreeGrowth: mockProcessTreeGrowth,
            eventState: { upgrades: [] }
          } as unknown as UseChristmasEventReturn
        }
      });
      
      renderHook(() => useDayLoop(deps));
      
      act(() => {
        triggerDayLoop();
      });
      
      expect(mockProcessTreeGrowth).not.toHaveBeenCalled();
    });

    it('should process elves bench crafting when upgrade is owned', () => {
      const mockProcessDailyElvesCrafting = vi.fn();
      
      const deps = createMockDependencies({
        christmasEventRef: {
          current: {
            isEventActive: true,
            processTreeGrowth: vi.fn(),
            updatePassiveIncome: vi.fn(),
            processDailyElvesCrafting: mockProcessDailyElvesCrafting,
            eventState: { 
              upgrades: [{ id: 'elves_bench', owned: true }] 
            }
          } as unknown as UseChristmasEventReturn
        }
      });
      
      renderHook(() => useDayLoop(deps));
      
      act(() => {
        triggerElvesBenchLoop();
      });
      
      expect(mockProcessDailyElvesCrafting).toHaveBeenCalled();
    });

    it('should not process elves bench when upgrade is not owned', () => {
      const mockProcessDailyElvesCrafting = vi.fn();
      
      const deps = createMockDependencies({
        christmasEventRef: {
          current: {
            isEventActive: true,
            processDailyElvesCrafting: mockProcessDailyElvesCrafting,
            eventState: { 
              upgrades: [{ id: 'elves_bench', owned: false }] 
            }
          } as unknown as UseChristmasEventReturn
        }
      });
      
      renderHook(() => useDayLoop(deps));
      
      act(() => {
        triggerElvesBenchLoop();
      });
      
      expect(mockProcessDailyElvesCrafting).not.toHaveBeenCalled();
    });

    it('should not crash when christmasEventRef is null', () => {
      const deps = createMockDependencies({
        christmasEventRef: { current: null }
      });
      
      renderHook(() => useDayLoop(deps));
      
      // Should not throw
      expect(() => {
        act(() => {
          triggerDayLoop();
          triggerElvesBenchLoop();
        });
      }).not.toThrow();
    });
  });
});
