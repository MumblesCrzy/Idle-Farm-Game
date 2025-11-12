import React, { memo } from 'react';
import type { EventUpgrade } from '../types/christmasEvent';
import { ICON_HOLIDAY_CHEER, TREE_DECORATED } from '../config/assetPaths';
import styles from './WorkshopTab.module.css';

interface WorkshopUpgradesPanelProps {
  upgrades: EventUpgrade[];
  holidayCheer: number;
  purchaseUpgrade: (upgradeId: string) => boolean;
}

const WorkshopUpgradesPanel: React.FC<WorkshopUpgradesPanelProps> = memo(({ 
  upgrades, 
  holidayCheer, 
  purchaseUpgrade 
}) => {
  const workshopUpgrades = upgrades.filter(u => u.category === 'workshop');
  
  return (
    <div className={styles.upgradesPanel}>
      <h3 className={styles.upgradesTitle}>🧵 Workshop Upgrades</h3>
      <div className={styles.upgradesList}>
        {workshopUpgrades.map(upgrade => {
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

WorkshopUpgradesPanel.displayName = 'WorkshopUpgradesPanel';

export default WorkshopUpgradesPanel;
