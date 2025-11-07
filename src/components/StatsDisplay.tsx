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
  experience: number;
  farmCost: number;
  farmTier: number;
  handleBuyLargerFarm: () => void;
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
  formatNumber,
  experience,
  farmCost,
  farmTier,
  handleBuyLargerFarm
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
      
      {/* Farm Upgrade Button */}
      {totalPlotsUsed >= maxPlots && (
        <div className={styles.farmUpgradeContainer}>
          <button
            onClick={handleBuyLargerFarm}
            disabled={money < farmCost}
            className={styles.farmUpgradeButton}
            aria-label="Buy Larger Farm"
            title="New max plots formula: Current max plots + (Experience ÷ 100), capped at 2× current max plots. Example: 4 plots + (500 exp ÷ 100) = 8 plots maximum"
          >
            <span className={styles.farmUpgradeText}>
              <span className={styles.farmUpgradeLabel}>Buy Larger Farm:</span> ${formatNumber(farmCost, 2)}
              <span className={styles.farmUpgradeLabel}>New max plots:</span> {Math.min(maxPlots + Math.floor(experience / 100), maxPlots * 2)}
              {(maxPlots + Math.floor(experience / 100)) > (maxPlots * 2) && (
                <span className={styles.farmUpgradeCap}>(capped at 2x current)</span>
              )}
              <span className={styles.farmUpgradeLabel}>Knowledge+:</span> +{((1.25 * farmTier)).toFixed(2)} Kn/harvest
              <span className={styles.farmUpgradeLabel}>Money/Knowledge kept:</span> ${money > farmCost ? formatNumber(money - farmCost, 2) : 0} / {knowledge > 0 ? formatNumber(Math.floor(knowledge), 2) : 0}Kn
            </span>
          </button>
        </div>
      )}
    </>
  );
});

StatsDisplay.displayName = 'StatsDisplay';

export default StatsDisplay;
