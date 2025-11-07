import { useState, useEffect, useRef } from 'react';
import type { WeatherType } from '../config/gameConstants';

/**
 * Custom hook to manage weather state and transitions
 * @param initialWeather - Initial weather state (default: 'Clear')
 * @returns Object with current weather and setter function
 * 
 * NOTE: Weather transitions are now managed in App.tsx with event logging.
 * This hook only provides state management.
 */
export function useWeatherSystem(initialWeather: WeatherType = 'Clear') {
  const [currentWeather, setCurrentWeather] = useState<WeatherType>(initialWeather);
  const currentWeatherRef = useRef(currentWeather);
  
  // Update ref when weather changes (for use in callbacks)
  useEffect(() => {
    currentWeatherRef.current = currentWeather;
  }, [currentWeather]);
  
  // NOTE: Weather changes are now managed in App.tsx with event logging
  // This hook only provides state management, not automatic weather transitions
  
  return {
    currentWeather,
    setCurrentWeather,
    currentWeatherRef
  };
}
