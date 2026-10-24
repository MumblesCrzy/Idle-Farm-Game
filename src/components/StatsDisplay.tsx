import { memo, type FC } from 'react';
import type { Veggie } from '../types/game';
import type { GuildState } from '../types/guilds';
import { GUILDS, GUILDS_UNLOCK_TIER } from '../data/guildData';
import { getSeasonImage, getWeatherImage, ICON_PLOTS, ICON_MONEY, ICON_KNOWLEDGE, ICON_HOLIDAY_CHEER, ICON_FARM_TIER, ICON_GEARS, ICON_GUILD_TOKEN } from '../config/assetPaths';
import { tuneUpLeft } from '../utils/stanley';
import { isCommittedTo } from '../utils/guildCalculations';
import EventArt from './EventArt';
import { PUMPKIN_ART } from '../data/pumpkinEventData';
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
  holidayCheer?: number; // Optional: only shown during Christmas event
  isChristmasEventActive?: boolean;
  candyCorn?: number; // Optional: only shown during the Pumpkin Rush
  isPumpkinEventActive?: boolean;
  guildState: GuildState;
}

const StatsDisplay: FC<StatsDisplayProps> = memo(({
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
  handleBuyLargerFarm,
  holidayCheer,
  isChristmasEventActive,
  candyCorn,
  isPumpkinEventActive,
  guildState
}) => {
  // Calculate guild currency display
  const isGuildsUnlocked = farmTier >= GUILDS_UNLOCK_TIER;
  const isCommitted = guildState.committedGuild !== null;
  const guildCurrencyAmount = isCommitted 
    ? guildState.guildCurrencies[guildState.committedGuild!] 
    : guildState.guildTokens;
  const committedGuild = GUILDS.find(guild => guild.id === guildState.committedGuild);
  const guildCurrencyName = committedGuild ? committedGuild.currency.name : 'Guild Tokens';
  const guildCurrencyIcon = committedGuild ? committedGuild.currency.icon : ICON_GUILD_TOKEN;
  // Stanley's Tune-Up: Engineers keep its slot, so the row holds still as it starts and ends
  const engineer = isCommittedTo(guildState, 'engineers');
  const tuneUp = tuneUpLeft(guildState);

  return (
    <>
      <div className={styles.dayCounter}>
        Year: {Math.floor(totalDaysElapsed / 365) + 1} | <span className={styles.day}>Day: {day}</span>{' '}
        <span className={styles.seasonWeather}>
          <img
            src={getSeasonImage(season)}
            alt={`Current season: ${season}`}
            className={styles.seasonWeatherIcon}
          />
          <span className={styles.seasonName}>{season}</span>
          <span className={styles.spacer}></span>
          <img
            src={getWeatherImage(currentWeather)}
            alt={`Current weather: ${currentWeather}`}
            className={styles.seasonWeatherIcon}
          />
          <span className={styles.weatherName}>{currentWeather}</span>
        </span>
      </div>
      <div className={styles.divider} />
      <div className={styles.stats}>
        <span className={`${styles.statItem} ${styles.tierStat}`} title={`Farm Tier ${farmTier} - Expand your farm to unlock new features!`}>
          <img src={ICON_FARM_TIER} alt="" className={styles.statIcon} aria-hidden="true" />
          Farm Tier: {farmTier}
        </span>
        <span className={`${styles.statItem} ${styles.plotsStat}`}>
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
        <span className={`${styles.statItem} ${styles.moneyStat}`}>
          <img src={ICON_MONEY} alt="" className={styles.statIcon} aria-hidden="true" />
          Money: ${formatNumber(money, 2)}
        </span>
        <span className={`${styles.statItem} ${styles.knowledgeStat}`}>
          <img src={ICON_KNOWLEDGE} alt="" className={styles.statIcon} aria-hidden="true" />
          Knowledge: {formatNumber(knowledge, 2)}
        </span>
        {isGuildsUnlocked && (
          <span className={`${styles.statItem} ${styles.currencyStat}`} title={committedGuild
            ? `${guildCurrencyName} - ${committedGuild.currency.earnedFrom}`
            : 'Guild Tokens - Spend them on starter upgrades; they don\'t carry over when you join a guild'}>
            <img src={guildCurrencyIcon} alt="" className={styles.statIcon} aria-hidden="true" />
            {guildCurrencyName}: {formatNumber(guildCurrencyAmount)}
          </span>
        )}
        {engineer && (tuneUp > 0 ? (
          <span className={styles.tuneUp} title="Stanley's Tune-Up: every machine runs twice as fast">
            <img src={ICON_GEARS} alt="" className={styles.statIcon} aria-hidden="true" />
            Tune-Up {tuneUp} s · machines ×2
          </span>
        ) : (
          <span className={`${styles.tuneUp} ${styles.tuneUpIdle}`} title="Stanley's Tune-Up: click Stanley when he visits, and every machine runs twice as fast">
            <img src={ICON_GEARS} alt="" className={styles.statIcon} aria-hidden="true" />
            No Tune-Up running
          </span>
        ))}
        {isChristmasEventActive && holidayCheer !== undefined && (
            <span className={`${styles.statItem} ${styles.eventStat}`}>
              <img src={ICON_HOLIDAY_CHEER} alt="" className={styles.statIcon} aria-hidden="true" />
              Holiday Cheer: {holidayCheer ?? 0}
            </span>
        )}
        {isPumpkinEventActive && candyCorn !== undefined && (
          <span className={`${styles.statItem} ${styles.eventStat}`}>
            <EventArt art={PUMPKIN_ART.candyCorn} size={18} />
            Candy Corn: {formatNumber(candyCorn)}
          </span>
        )}
        <span className={`${styles.statItemWithButton} ${styles.stashStat}`}>
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
      
      {/* The larger farm: its button once every plot is in use. Its room is kept either way, so
          the tabs below never move when the plots fill up or a larger farm is bought */}
      <div className={styles.farmUpgradeContainer}>
        {totalPlotsUsed >= maxPlots ? (
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
        ) : (
          <p className={styles.farmUpgradeWaiting}>
            <span className={styles.farmUpgradeLabel}>Larger Farm:</span>&nbsp;${formatNumber(farmCost, 2)}, once all {maxPlots} plots are in use ({totalPlotsUsed} now)
          </p>
        )}
      </div>
    </>
  );
});

StatsDisplay.displayName = 'StatsDisplay';

export default StatsDisplay;
