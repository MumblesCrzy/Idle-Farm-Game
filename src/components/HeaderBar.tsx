import React, { memo } from 'react';
import styles from './HeaderBar.module.css';

interface HeaderBarProps {
  experience: number;
  money: number;
  farmCost: number;
  farmTier: number;
  totalPlotsUsed: number;
  maxPlots: number;
  knowledge: number;
  setShowInfoOverlay: (show: boolean) => void;
  setShowSettingsOverlay: (show: boolean) => void;
  setShowAchievements: (show: boolean) => void;
  totalAchievements?: number;
  unlockedAchievements?: number;
  handleBuyLargerFarm: () => void;
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

const HeaderBar: React.FC<HeaderBarProps> = memo(({
  experience,
  money,
  farmCost,
  farmTier,
  totalPlotsUsed,
  maxPlots,
  knowledge,
  setShowInfoOverlay,
  setShowSettingsOverlay,
  setShowAchievements,
  totalAchievements = 0,
  unlockedAchievements = 0,
  handleBuyLargerFarm,
  formatNumber
}) => {
  return (
    <>
      {/* Info and Settings Buttons */}
      <div className={styles.header}>
        <button
          onClick={() => setShowInfoOverlay(true)}
          className={styles.button}
          title="Info - Game Help"
          aria-label="Open game help and information"
        >
          Info
        </button>
        <button
          onClick={() => setShowAchievements(true)}
          className={styles.achievementsButton}
          title={`Achievements: ${unlockedAchievements}/${totalAchievements} unlocked`}
          aria-label={`View achievements. ${unlockedAchievements} of ${totalAchievements} unlocked`}
        >
          🏆 {unlockedAchievements}/{totalAchievements}
        </button>
        <button
          onClick={() => setShowSettingsOverlay(true)}
          className={styles.settingsButton}
          title="Settings"
          aria-label="Open settings menu for save management and sound options"
        >
          Settings
        </button>
      </div>

      {/* Farm Upgrade UI */}
      <div className={styles.farmUpgradeContainer}>
        {totalPlotsUsed >= maxPlots && (
          <div>
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
      </div>
    </>
  );
});

HeaderBar.displayName = 'HeaderBar';

export default HeaderBar;
