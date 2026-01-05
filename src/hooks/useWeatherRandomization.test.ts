import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWeatherRandomization } from './useWeatherRandomization';
import type { UseEventLogReturn } from './useEventLog';
import type { WeatherType } from '../types/game';

// Mock the event log
const createMockEventLog = (): UseEventLogReturn => ({
  entries: [],
  unreadCount: 0,
  addEvent: vi.fn(),
  markAllAsRead: vi.fn(),
  clearEvents: vi.fn(),
  getFilteredEvents: vi.fn().mockReturnValue([]),
  getCategoryCounts: vi.fn().mockReturnValue({}),
  getUnreadCountForCategories: vi.fn().mockReturnValue(0),
  getState: vi.fn().mockReturnValue({ entries: [], maxEntries: 100, unreadCount: 0 })
});

/**
 * Weather chances from gameConstants:
 * Spring: rain 0.20, drought 0.012, storm 0.04, heatwave 0.01
 * Summer: rain 0.16, drought 0.012, storm 0.06, heatwave 0.01
 * Fall: rain 0.14, drought 0.016, storm 0.03, heatwave 0.01
 * Winter: rain 0.10, drought 0.004, storm 0.01, heatwave 0.01
 */

describe('useWeatherRandomization', () => {
  let mockEventLog: UseEventLogReturn;
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockEventLog = createMockEventLog();
  });

  const createDeps = (overrides = {}) => ({
    day: 1,
    season: 'Spring',
    currentWeather: 'Clear' as WeatherType,
    setCurrentWeather: vi.fn(),
    irrigationOwned: false,
    setKnowledge: vi.fn(),
    eventLog: mockEventLog,
    ...overrides
  });

  describe('initialization', () => {
    it('should not trigger weather change on initial render', () => {
      const deps = createDeps();
      renderHook(() => useWeatherRandomization(deps));
      
      // On initial render with day=1, no weather change should happen
      expect(deps.setCurrentWeather).not.toHaveBeenCalled();
    });
  });

  describe('weather event rolling', () => {
    it('should only process weather changes when day changes', () => {
      const deps = createDeps({ day: 1 });
      const { rerender } = renderHook(
        (props) => useWeatherRandomization(props),
        { initialProps: deps }
      );
      
      // Same day - no processing
      rerender({ ...deps, day: 1 });
      expect(mockEventLog.addEvent).not.toHaveBeenCalled();
    });

    it('should trigger Rain when roll is below rain chance', () => {
      // Spring rain chance is 0.20
      vi.spyOn(Math, 'random').mockReturnValue(0.15);
      
      const deps = createDeps({ day: 1 });
      const { rerender } = renderHook(
        (props) => useWeatherRandomization(props),
        { initialProps: deps }
      );
      
      act(() => {
        rerender({ ...deps, day: 2 });
      });
      
      expect(deps.setCurrentWeather).toHaveBeenCalledWith('Rain');
      expect(mockEventLog.addEvent).toHaveBeenCalled();
      
      vi.spyOn(Math, 'random').mockRestore();
    });

    it('should trigger Snow instead of Rain in Winter', () => {
      // Winter rain chance is 0.10
      vi.spyOn(Math, 'random').mockReturnValue(0.05);
      
      const deps = createDeps({ day: 1, season: 'Winter' });
      const { rerender } = renderHook(
        (props) => useWeatherRandomization(props),
        { initialProps: deps }
      );
      
      act(() => {
        rerender({ ...deps, day: 2 });
      });
      
      expect(deps.setCurrentWeather).toHaveBeenCalledWith('Snow');
      
      vi.spyOn(Math, 'random').mockRestore();
    });

    it('should trigger Drought when roll is in drought range', () => {
      // Spring: rain 0.20, drought 0.012
      // Drought range is 0.20-0.212
      vi.spyOn(Math, 'random').mockReturnValue(0.205);
      
      const deps = createDeps({ day: 1 });
      const { rerender } = renderHook(
        (props) => useWeatherRandomization(props),
        { initialProps: deps }
      );
      
      act(() => {
        rerender({ ...deps, day: 2 });
      });
      
      expect(deps.setCurrentWeather).toHaveBeenCalledWith('Drought');
      
      vi.spyOn(Math, 'random').mockRestore();
    });

    it('should show irrigation protection message when drought starts and irrigation owned', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.205); // Drought range
      
      const deps = createDeps({ day: 1, irrigationOwned: true });
      const { rerender } = renderHook(
        (props) => useWeatherRandomization(props),
        { initialProps: deps }
      );
      
      act(() => {
        rerender({ ...deps, day: 2 });
      });
      
      expect(mockEventLog.addEvent).toHaveBeenCalledWith(
        'weather',
        'Drought has begun',
        expect.objectContaining({
          details: 'Irrigation system protecting crops from drought'
        })
      );
      
      vi.spyOn(Math, 'random').mockRestore();
    });

    it('should trigger Storm when roll is in storm range', () => {
      // Spring: rain 0.20, drought 0.012, storm 0.04
      // Storm range is 0.212-0.252
      vi.spyOn(Math, 'random').mockReturnValue(0.22);
      
      const deps = createDeps({ day: 1 });
      const { rerender } = renderHook(
        (props) => useWeatherRandomization(props),
        { initialProps: deps }
      );
      
      act(() => {
        rerender({ ...deps, day: 2 });
      });
      
      expect(deps.setCurrentWeather).toHaveBeenCalledWith('Storm');
      
      vi.spyOn(Math, 'random').mockRestore();
    });

    it('should trigger Heatwave when roll is in heatwave range', () => {
      // Spring: rain 0.20, drought 0.012, storm 0.04, heatwave 0.01
      // Heatwave range is 0.252-0.262
      vi.spyOn(Math, 'random').mockReturnValue(0.255);
      
      const deps = createDeps({ day: 1 });
      const { rerender } = renderHook(
        (props) => useWeatherRandomization(props),
        { initialProps: deps }
      );
      
      act(() => {
        rerender({ ...deps, day: 2 });
      });
      
      expect(deps.setCurrentWeather).toHaveBeenCalledWith('Heatwave');
      
      vi.spyOn(Math, 'random').mockRestore();
    });

    it('should not change weather when roll is above all chances', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99);
      
      const deps = createDeps({ day: 1 });
      const { rerender } = renderHook(
        (props) => useWeatherRandomization(props),
        { initialProps: deps }
      );
      
      act(() => {
        rerender({ ...deps, day: 2 });
      });
      
      expect(deps.setCurrentWeather).not.toHaveBeenCalled();
      
      vi.spyOn(Math, 'random').mockRestore();
    });
  });

  describe('weather duration and clearing', () => {
    it('should not roll for new weather when not Clear', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1); // Would trigger rain if Clear
      
      const deps = createDeps({ day: 1, currentWeather: 'Rain' as WeatherType });
      const { rerender } = renderHook(
        (props) => useWeatherRandomization(props),
        { initialProps: deps }
      );
      
      act(() => {
        rerender({ ...deps, day: 2 });
      });
      
      // Should not set new weather type - rain duration handler takes over
      vi.spyOn(Math, 'random').mockRestore();
    });

    it('should gain knowledge during drought', () => {
      const setKnowledge = vi.fn();
      const deps = createDeps({ 
        day: 1, 
        currentWeather: 'Drought' as WeatherType,
        setKnowledge 
      });
      const { rerender } = renderHook(
        (props) => useWeatherRandomization(props),
        { initialProps: deps }
      );
      
      act(() => {
        rerender({ ...deps, day: 2 });
      });
      
      expect(setKnowledge).toHaveBeenCalled();
    });
  });

  describe('heatwave special behavior', () => {
    it('should show appropriate message for summer heatwave', () => {
      // Summer: rain 0.16, drought 0.012, storm 0.06, heatwave 0.01
      // Heatwave range is 0.232-0.242
      vi.spyOn(Math, 'random').mockReturnValue(0.235);
      
      const deps = createDeps({ day: 1, season: 'Summer' });
      const { rerender } = renderHook(
        (props) => useWeatherRandomization(props),
        { initialProps: deps }
      );
      
      act(() => {
        rerender({ ...deps, day: 2 });
      });
      
      expect(mockEventLog.addEvent).toHaveBeenCalledWith(
        'weather',
        'Heatwave has begun',
        expect.objectContaining({
          details: '-30% growth penalty in Summer'
        })
      );
      
      vi.spyOn(Math, 'random').mockRestore();
    });
  });

  describe('event logging', () => {
    it('should log rain event with correct details', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1);
      
      const deps = createDeps({ day: 1 });
      const { rerender } = renderHook(
        (props) => useWeatherRandomization(props),
        { initialProps: deps }
      );
      
      act(() => {
        rerender({ ...deps, day: 2 });
      });
      
      expect(mockEventLog.addEvent).toHaveBeenCalledWith(
        'weather',
        'Rain begins to fall',
        expect.objectContaining({
          priority: 'important',
          details: 'All vegetables receive +20% growth bonus'
        })
      );
      
      vi.spyOn(Math, 'random').mockRestore();
    });

    it('should log snow event with correct details', () => {
      // Winter rain chance is 0.10
      vi.spyOn(Math, 'random').mockReturnValue(0.05);
      
      const deps = createDeps({ day: 1, season: 'Winter' });
      const { rerender } = renderHook(
        (props) => useWeatherRandomization(props),
        { initialProps: deps }
      );
      
      act(() => {
        rerender({ ...deps, day: 2 });
      });
      
      expect(mockEventLog.addEvent).toHaveBeenCalledWith(
        'weather',
        'Snow begins to fall',
        expect.objectContaining({
          priority: 'important',
          details: 'All vegetables stop growing unless you have a Greenhouse'
        })
      );
      
      vi.spyOn(Math, 'random').mockRestore();
    });

    it('should log drought event as critical', () => {
      // Spring: drought range 0.20-0.212
      vi.spyOn(Math, 'random').mockReturnValue(0.205);
      
      const deps = createDeps({ day: 1 });
      const { rerender } = renderHook(
        (props) => useWeatherRandomization(props),
        { initialProps: deps }
      );
      
      act(() => {
        rerender({ ...deps, day: 2 });
      });
      
      expect(mockEventLog.addEvent).toHaveBeenCalledWith(
        'weather',
        'Drought has begun',
        expect.objectContaining({
          priority: 'critical'
        })
      );
      
      vi.spyOn(Math, 'random').mockRestore();
    });
  });

  describe('seasonal weather chances', () => {
    it('should have higher rain chance in Spring than Summer', () => {
      // Spring rain is 0.20, Summer is 0.16
      // A roll of 0.18 should trigger rain in Spring but not Summer
      vi.spyOn(Math, 'random').mockReturnValue(0.18);
      
      const springDeps = createDeps({ day: 1, season: 'Spring' });
      const { rerender: rerenderSpring } = renderHook(
        (props) => useWeatherRandomization(props),
        { initialProps: springDeps }
      );
      
      act(() => {
        rerenderSpring({ ...springDeps, day: 2 });
      });
      
      expect(springDeps.setCurrentWeather).toHaveBeenCalledWith('Rain');
      
      vi.spyOn(Math, 'random').mockRestore();
    });

    it('should respect Summer rain threshold', () => {
      // Summer rain is 0.16
      // A roll of 0.17 should NOT trigger rain
      vi.spyOn(Math, 'random').mockReturnValue(0.17);
      
      const summerDeps = createDeps({ day: 1, season: 'Summer' });
      const { rerender } = renderHook(
        (props) => useWeatherRandomization(props),
        { initialProps: summerDeps }
      );
      
      act(() => {
        rerender({ ...summerDeps, day: 2 });
      });
      
      // 0.17 is above Summer's rain chance (0.16) but below drought threshold
      expect(summerDeps.setCurrentWeather).not.toHaveBeenCalledWith('Rain');
      
      vi.spyOn(Math, 'random').mockRestore();
    });
  });
});
