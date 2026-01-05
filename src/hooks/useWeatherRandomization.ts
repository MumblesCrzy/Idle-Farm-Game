import { useRef, useEffect, useCallback } from 'react';
import type { WeatherType, EventPriority } from '../types/game';
import type { UseEventLogReturn } from './useEventLog';
import {
  RAIN_CHANCES,
  DROUGHT_CHANCES,
  STORM_CHANCES,
  RAIN_DURATION_DAYS,
  DROUGHT_DURATION_DAYS,
  STORM_DURATION_DAYS,
  HEATWAVE_DURATION_DAYS,
} from '../config/gameConstants';
import {
  WEATHER_RAIN,
  WEATHER_SNOW,
  WEATHER_CLEAR,
  WEATHER_DROUGHT,
  WEATHER_HEATWAVE,
  WEATHER_STORM,
} from '../config/assetPaths';

/**
 * Configuration for the weather randomization system
 */
export interface WeatherRandomizationDeps {
  /** Current day number (1-365) */
  day: number;
  /** Current season name */
  season: string;
  /** Current weather state */
  currentWeather: WeatherType;
  /** Function to update weather state */
  setCurrentWeather: (weather: WeatherType) => void;
  /** Whether irrigation is owned (protects against drought) */
  irrigationOwned: boolean;
  /** Function to add knowledge (gained during drought) */
  setKnowledge: React.Dispatch<React.SetStateAction<number>>;
  /** Event log for weather change notifications */
  eventLog: UseEventLogReturn;
}

/**
 * Internal state for tracking weather duration
 */
interface WeatherDurationState {
  rainDays: number;
  droughtDays: number;
  stormDays: number;
  heatwaveDays: number;
}

/**
 * Custom hook for weather randomization and transitions.
 * 
 * This hook manages the weather system including:
 * - Random weather events based on season (rain, drought, storm, heatwave)
 * - Weather duration tracking and automatic clearing
 * - Event logging for weather changes
 * - Knowledge gain during drought
 * - Special transitions (e.g., summer heatwave -> drought)
 * 
 * @example
 * ```tsx
 * useWeatherRandomization({
 *   day,
 *   season,
 *   currentWeather,
 *   setCurrentWeather,
 *   irrigationOwned,
 *   setKnowledge,
 *   eventLog
 * });
 * ```
 * 
 * @param deps - Dependencies for weather randomization
 */
export function useWeatherRandomization(deps: WeatherRandomizationDeps): void {
  const {
    day,
    season,
    currentWeather,
    setCurrentWeather,
    irrigationOwned,
    setKnowledge,
    eventLog,
  } = deps;

  // Weather duration tracking refs
  const rainDaysRef = useRef(0);
  const droughtDaysRef = useRef(0);
  const stormDaysRef = useRef(0);
  const heatwaveDaysRef = useRef(0);
  
  // Track previous weather and last processed day
  const previousWeatherRef = useRef(currentWeather);
  const lastDayProcessedRef = useRef(day);

  /**
   * Log a weather change to the event log
   */
  const logWeatherChange = useCallback(
    (
      weatherType: WeatherType | string,
      message: string,
      details: string,
      icon: string,
      previousWeather?: WeatherType | string,
      priority: EventPriority = 'normal'
    ) => {
      eventLog.addEvent('weather', message, {
        priority,
        details,
        icon,
        metadata: {
          weatherType: weatherType as WeatherType,
          previousWeather: previousWeather as WeatherType | undefined,
        },
      });
    },
    [eventLog]
  );

  /**
   * Reset all duration counters except the specified one
   */
  const resetDurationCounters = useCallback((except?: keyof WeatherDurationState) => {
    if (except !== 'rainDays') rainDaysRef.current = 0;
    if (except !== 'droughtDays') droughtDaysRef.current = 0;
    if (except !== 'stormDays') stormDaysRef.current = 0;
    if (except !== 'heatwaveDays') heatwaveDaysRef.current = 0;
  }, []);

  /**
   * Handle new weather event when weather is clear
   */
  const handleClearWeatherRoll = useCallback(() => {
    const rainChance = RAIN_CHANCES[season] ?? 0.2;
    const droughtChance = DROUGHT_CHANCES[season] ?? 0.03;
    const stormChance = STORM_CHANCES[season] ?? 0.03;
    const heatwaveChance = 0.01; // 1% chance per day
    
    const prevWeather = previousWeatherRef.current;
    const roll = Math.random();
    
    // Check for rain/snow
    if (roll < rainChance) {
      if (season === 'Winter') {
        setCurrentWeather('Snow');
        logWeatherChange(
          'Snow',
          'Snow begins to fall',
          'All vegetables stop growing unless you have a Greenhouse',
          WEATHER_SNOW,
          prevWeather,
          'important'
        );
      } else {
        setCurrentWeather('Rain');
        logWeatherChange(
          'Rain',
          'Rain begins to fall',
          'All vegetables receive +20% growth bonus',
          WEATHER_RAIN,
          prevWeather,
          'important'
        );
      }
      rainDaysRef.current = 1;
      resetDurationCounters('rainDays');
      return;
    }
    
    // Check for drought
    if (roll < rainChance + droughtChance) {
      setCurrentWeather('Drought');
      logWeatherChange(
        'Drought',
        'Drought has begun',
        irrigationOwned 
          ? 'Irrigation system protecting crops from drought' 
          : '-50% growth penalty. Consider purchasing Irrigation',
        WEATHER_DROUGHT,
        prevWeather,
        'critical'
      );
      droughtDaysRef.current = 1;
      resetDurationCounters('droughtDays');
      return;
    }
    
    // Check for storm
    if (roll < rainChance + droughtChance + stormChance) {
      setCurrentWeather('Storm');
      logWeatherChange(
        'Storm',
        'Severe storm approaching',
        'All vegetables receive +10% growth bonus',
        WEATHER_STORM,
        prevWeather,
        'important'
      );
      stormDaysRef.current = 1;
      resetDurationCounters('stormDays');
      return;
    }
    
    // Check for heatwave
    if (roll < rainChance + droughtChance + stormChance + heatwaveChance) {
      setCurrentWeather('Heatwave');
      logWeatherChange(
        'Heatwave',
        'Heatwave has begun',
        season === 'Summer' 
          ? '-30% growth penalty in Summer'
          : season === 'Winter'
          ? '+20% growth bonus in Winter'
          : '+20% bonus to summer vegetables',
        WEATHER_HEATWAVE,
        prevWeather,
        'critical'
      );
      heatwaveDaysRef.current = 1;
      resetDurationCounters('heatwaveDays');
      return;
    }
    
    // No weather event - reset all counters
    resetDurationCounters();
  }, [season, irrigationOwned, setCurrentWeather, logWeatherChange, resetDurationCounters]);

  /**
   * Handle rain/snow duration and clearing
   */
  const handleRainDuration = useCallback(() => {
    rainDaysRef.current++;
    if (rainDaysRef.current > RAIN_DURATION_DAYS) {
      const weatherThatCleared = currentWeather;
      setCurrentWeather('Clear');
      logWeatherChange(
        'Clear',
        `${weatherThatCleared === 'Snow' ? 'Snow' : 'Rain'} has cleared`,
        'Weather returns to normal',
        WEATHER_CLEAR,
        weatherThatCleared,
        'normal'
      );
      rainDaysRef.current = 0;
    }
  }, [currentWeather, setCurrentWeather, logWeatherChange]);

  /**
   * Handle drought duration, knowledge gain, and clearing
   */
  const handleDroughtDuration = useCallback(() => {
    // Gain knowledge during drought
    setKnowledge((k: number) => k + 1);
    
    droughtDaysRef.current++;
    if (droughtDaysRef.current > DROUGHT_DURATION_DAYS) {
      setCurrentWeather('Clear');
      logWeatherChange(
        'Clear',
        'Drought has ended',
        'Weather returns to normal',
        WEATHER_CLEAR,
        'Drought',
        'normal'
      );
      droughtDaysRef.current = 0;
    }
  }, [setKnowledge, setCurrentWeather, logWeatherChange]);

  /**
   * Handle storm duration and clearing
   */
  const handleStormDuration = useCallback(() => {
    stormDaysRef.current++;
    if (stormDaysRef.current > STORM_DURATION_DAYS) {
      setCurrentWeather('Clear');
      logWeatherChange(
        'Clear',
        'Storm has passed',
        'Weather returns to normal',
        WEATHER_CLEAR,
        'Storm',
        'normal'
      );
      stormDaysRef.current = 0;
    }
  }, [setCurrentWeather, logWeatherChange]);

  /**
   * Handle heatwave duration and clearing (special: summer heatwave -> drought)
   */
  const handleHeatwaveDuration = useCallback(() => {
    heatwaveDaysRef.current++;
    if (heatwaveDaysRef.current > HEATWAVE_DURATION_DAYS) {
      // If heatwave was in summer, trigger drought next
      if (season === 'Summer') {
        setCurrentWeather('Drought');
        logWeatherChange(
          'Drought',
          'Heatwave causes drought',
          'The intense heat has dried out the soil',
          WEATHER_HEATWAVE,
          'Heatwave',
          'critical'
        );
        droughtDaysRef.current = 1;
        resetDurationCounters('droughtDays');
      } else {
        setCurrentWeather('Clear');
        logWeatherChange(
          'Clear',
          'Heatwave has ended',
          'Weather returns to normal',
          WEATHER_CLEAR,
          'Heatwave',
          'normal'
        );
        heatwaveDaysRef.current = 0;
      }
    }
  }, [season, setCurrentWeather, logWeatherChange, resetDurationCounters]);

  // Main weather processing effect
  useEffect(() => {
    // Only process weather changes once per day
    if (lastDayProcessedRef.current === day) {
      return;
    }
    lastDayProcessedRef.current = day;
    
    // Only roll for events if weather is clear
    if (currentWeather === 'Clear') {
      handleClearWeatherRoll();
    }
    
    // Handle ongoing weather conditions
    if (currentWeather === 'Rain' || currentWeather === 'Snow') {
      handleRainDuration();
    }
    
    if (currentWeather === 'Drought') {
      handleDroughtDuration();
    }
    
    if (currentWeather === 'Storm') {
      handleStormDuration();
    }
    
    if (currentWeather === 'Heatwave') {
      handleHeatwaveDuration();
    }
    
    // Update previous weather ref at the end
    previousWeatherRef.current = currentWeather;
  }, [
    day,
    currentWeather,
    handleClearWeatherRoll,
    handleRainDuration,
    handleDroughtDuration,
    handleStormDuration,
    handleHeatwaveDuration
  ]);
}
