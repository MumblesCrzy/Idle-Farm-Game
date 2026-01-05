import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDayLoop } from './useDayLoop';
import type { UseChristmasEventReturn } from './useChristmasEvent';

// Track registered callbacks
let registeredCallbacks: Array<() => void> = [];

// Mock the useRobustInterval hook
vi.mock('./useGameLoop', () => ({
  useRobustInterval: (callback: () => void, _interval: number, _deps: unknown[]) => {
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
    it('should return handleSellRef', () => {
      const deps = createMockDependencies();
      const { result } = renderHook(() => useDayLoop(deps));
      
      expect(result.current.handleSellRef).toBeDefined();
      expect(result.current.handleSellRef.current).toBe(deps.handleSell);
    });

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
      
      renderHook(() => useDayLoop(deps));
      
      act(() => {
        triggerDayLoop();
      });
      
      // Advance timers to trigger the setTimeout
      act(() => {
        vi.advanceTimersByTime(200);
      });
      
      expect(deps.handleSell).not.toHaveBeenCalled();
      
      vi.useRealTimers();
    });

    it('should trigger auto-sell on merchant day when autoSellOwned is true', () => {
      vi.useFakeTimers();
      
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
      
      renderHook(() => useDayLoop(deps));
      
      act(() => {
        triggerDayLoop();
      });
      
      // Advance timers to trigger the setTimeout (100ms delay)
      act(() => {
        vi.advanceTimersByTime(200);
      });
      
      expect(handleSell).toHaveBeenCalledWith(true);
      
      vi.useRealTimers();
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
      
      renderHook(() => useDayLoop(deps));
      
      act(() => {
        triggerDayLoop();
      });
      
      // Advance timers
      act(() => {
        vi.advanceTimersByTime(200);
      });
      
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
