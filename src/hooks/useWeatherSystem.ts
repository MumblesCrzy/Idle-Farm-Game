import { useState, useEffect, useRef } from 'react';
import type { WeatherType } from '../config/gameConstants';
import { calculateWeatherChange } from '../utils/gameLoopProcessors';
import { getSeason } from '../utils/gameCalculations';

/**
 * Custom hook to manage weather state and transitions
 * @param day - Current day number (1-365)
 * @param initialWeather - Initial weather state (default: 'Clear')
 * @returns Object with current weather and setter function
 */
export function useWeatherSystem(day: number, initialWeather: WeatherType = 'Clear') {
  const [currentWeather, setCurrentWeather] = useState<WeatherType>(initialWeather);
  const currentWeatherRef = useRef(currentWeather);
  
  // Update ref when weather changes (for use in callbacks)
  useEffect(() => {
    currentWeatherRef.current = currentWeather;
  }, [currentWeather]);
  
  // Update weather based on day/season changes
  useEffect(() => {
    const season = getSeason(day);
    const newWeather = calculateWeatherChange(season, currentWeatherRef.current);
    
    if (newWeather !== currentWeatherRef.current) {
      setCurrentWeather(newWeather);
    }
  }, [day]); // Only trigger when day changes
  
  return {
    currentWeather,
    setCurrentWeather,
    currentWeatherRef
  };
}
