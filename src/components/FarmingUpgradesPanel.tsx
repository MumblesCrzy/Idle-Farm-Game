import React, { memo } from 'react';
import type { EventUpgrade } from '../types/christmasEvent';
import { ICON_HOLIDAY_CHEER, TREE_DECORATED } from '../config/assetPaths';
import styles from './TreeFarmTab.module.css';

interface FarmingUpgradesPanelProps {
  upgrades: EventUpgrade[];
  holidayCheer: number;
  purchaseUpgrade: (upgradeId: string) => boolean;
}

const FarmingUpgradesPanel: React.FC<FarmingUpgradesPanelProps> = memo(({ 
  upgrades, 
  holidayCheer, 
  purchaseUpgrade 
}) => {
  // Filter out tree unlock upgrades since they're handled by tree selection buttons
  const farmingUpgrades = upgrades.filter(u => 
    u.category === 'farming' && 
    !u.id.startsWith('unlock_')
  );
  
  return (
    <div className={styles.upgradesPanel}>
      <h3 className={styles.upgradesTitle}>🌲 Farming Upgrades</h3>
      <div className={styles.upgradesList}>
        {farmingUpgrades.map(upgrade => {
          const canAfford = holidayCheer >= upgrade.cost;
          
          return (
            <div 
              key={upgrade.id} 
              className={`${styles.upgradeCard} ${upgrade.owned ? styles.owned : ''}`}
            >
              <div className={styles.upgradeHeader}>
                <span className={styles.upgradeName}>{upgrade.name}</span>
                {upgrade.owned && <span className={styles.ownedBadge}>✓</span>}
              </div>
              <div className={styles.upgradeDescription}>{upgrade.description}</div>
              {upgrade.effect && (
                <div className={styles.upgradeEffect}>Effect: {upgrade.effect}</div>
              )}
              {!upgrade.owned && (
                <button
                  className={`${styles.upgradeButton} ${!canAfford ? styles.cantAfford : ''}`}
                  onClick={() => purchaseUpgrade(upgrade.id)}
                  disabled={!canAfford}
                  title={!canAfford ? `Need ${upgrade.cost - holidayCheer} more Holiday Cheer` : 'Purchase upgrade'}
                >
                  {upgrade.cost} <img src={ICON_HOLIDAY_CHEER} alt="Holiday Cheer" className={styles.cheerIcon} /> Holiday Cheer
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

FarmingUpgradesPanel.displayName = 'FarmingUpgradesPanel';

export default FarmingUpgradesPanel;
