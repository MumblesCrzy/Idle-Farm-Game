import React, { memo } from 'react';
import type { Veggie } from '../types/game';
import { getSeasonImage, getWeatherImage, ICON_PLOTS, ICON_MONEY, ICON_KNOWLEDGE } from '../config/assetPaths';
import styles from './StatsDisplay.module.css';

interface StatsDisplayProps {
  day: number;
  totalDaysElapsed: number;
  season: string;
  currentWeather: string;
  totalPlotsUsed: number;
  maxPlots: number;
  money: number;
  knowledge: number;
  veggies: Veggie[];
  setShowAdvancedStash: (show: boolean) => void;
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

const StatsDisplay: React.FC<StatsDisplayProps> = memo(({
  day,
  totalDaysElapsed,
  season,
  currentWeather,
  totalPlotsUsed,
  maxPlots,
  money,
  knowledge,
  veggies,
  setShowAdvancedStash,
  formatNumber
}) => {
  return (
    <>
      <div className={styles.dayCounter}>
        Year: {Math.floor(totalDaysElapsed / 365) + 1} | Day: {day}{' '}
        <span className={styles.seasonWeather}>
          <img
            src={getSeasonImage(season)}
            alt={`Current season: ${season}`}
            className={styles.seasonWeatherIcon}
          />
          {season}
          <span className={styles.spacer}></span>
          <img
            src={getWeatherImage(currentWeather)}
            alt={`Current weather: ${currentWeather}`}
            className={styles.seasonWeatherIcon}
          />
          <span>{currentWeather}</span>
        </span>
      </div>
      <div className={styles.divider} />
      <div className={styles.stats}>
        <span className={styles.statItem}>
          <img src={ICON_PLOTS} alt="" className={styles.statIcon} aria-hidden="true" />
          Plots: {totalPlotsUsed} / {maxPlots}
          <div 
            className={styles.plotIndicator}
            style={{ 
              backgroundColor: totalPlotsUsed >= maxPlots ? '#ffe0e0' : '#e0ffe0', 
              borderColor: totalPlotsUsed >= maxPlots ? '#ffaaaa' : '#aaffaa'
            }}
            role="status"
            aria-label={totalPlotsUsed >= maxPlots ? 
              'Plot limit reached. Buy a larger farm to unlock more plots.' : 
              `${maxPlots - totalPlotsUsed} plots available`}
            title={totalPlotsUsed >= maxPlots ? 
              'You\'ve reached your maximum plot limit! Buy a larger farm to unlock more plots for vegetables.' : 
              'Each vegetable and additional plot uses one plot.' }
          >
          </div>
        </span>
        <span className={styles.statItem}>
          <img src={ICON_MONEY} alt="" className={styles.statIcon} aria-hidden="true" />
          Money: ${formatNumber(money, 2)}
        </span>
        <span className={styles.statItem}>
          <img src={ICON_KNOWLEDGE} alt="" className={styles.statIcon} aria-hidden="true" />
          Knowledge: {formatNumber(knowledge, 2)}
        </span>
        <span className={styles.statItemWithButton}>
          <button
            onClick={() => setShowAdvancedStash(true)}
            className={styles.stashButton}
            title="View detailed stash breakdown"
            aria-label={`View detailed stash breakdown. Total stash: ${veggies.reduce((sum, v) => sum + v.stash, 0)} vegetables`}
          >
            <img src={ICON_MONEY} alt="" className={styles.stashIcon} aria-hidden="true" />
            Stash: {veggies.reduce((sum, v) => sum + v.stash, 0)}
          </button>
        </span>
      </div>
    </>
  );
});

StatsDisplay.displayName = 'StatsDisplay';

export default StatsDisplay;
