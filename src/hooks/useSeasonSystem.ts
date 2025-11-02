import { useMemo } from 'react';
import { getSeason } from '../utils/gameCalculations';

/**
 * Custom hook to manage season state based on current day
 * @param day - Current day number (1-365)
 * @returns Object with current season
 */
export function useSeasonSystem(day: number) {
  // Memoize season calculation to avoid recalculating on every render
  const season = useMemo(() => getSeason(day), [day]);
  
  return {
    season
  };
}
