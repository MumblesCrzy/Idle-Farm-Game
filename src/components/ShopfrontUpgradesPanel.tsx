import React, { memo } from 'react';
import UpgradeButton from './UpgradeButton';
import type { EventUpgrade } from '../types/christmasEvent';
import styles from './ShopfrontUpgradesPanel.module.css';

interface ShopfrontUpgradesPanelProps {
  upgrades: EventUpgrade[];
  holidayCheer: number;
  purchaseUpgrade: (upgradeId: string) => void;
  passiveCheerPerSecond: number;
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

const ShopfrontUpgradesPanel: React.FC<ShopfrontUpgradesPanelProps> = memo(({
  upgrades,
  holidayCheer,
  purchaseUpgrade,
  formatNumber
}) => {
  // Filter to only shopfront upgrades
  const shopfrontUpgrades = upgrades.filter(u => u.category === 'shopfront');
  
  // Helper to check if upgrade is locked behind another upgrade
  const isLocked = (upgrade: EventUpgrade): boolean => {
    // For now, we'll use naming conventions to determine dependencies
    // wreath_sign -> no dependency
    // golden_bell_counter -> requires wreath_sign
    // magical_register -> requires golden_bell_counter
    // fireplace_display -> requires golden_bell_counter
    
    if (upgrade.id === 'golden_bell_counter') {
      const wreathSign = upgrades.find(u => u.id === 'wreath_sign');
      return !wreathSign?.owned;
    }
    
    if (upgrade.id === 'magical_register' || upgrade.id === 'fireplace_display') {
      const goldenBell = upgrades.find(u => u.id === 'golden_bell_counter');
      return !goldenBell?.owned;
    }
    
    return false;
  };
  
  const getLockedMessage = (upgrade: EventUpgrade): string => {
    if (upgrade.id === 'golden_bell_counter') {
      return '🔒 Requires Wreath Sign';
    }
    if (upgrade.id === 'magical_register' || upgrade.id === 'fireplace_display') {
      return '🔒 Requires Golden Bell Counter';
    }
    return upgrade.effect || upgrade.description;
  };

  return (
    <>
      <h2 className={styles.title}>Shopfront Upgrades</h2>
      
      <div className={styles.upgradesContainer}>
        {shopfrontUpgrades.map(upgrade => {
          const locked = isLocked(upgrade);
          const effectText = locked ? getLockedMessage(upgrade) : (upgrade.effect || upgrade.description);

          return (
            <div key={upgrade.id}>
              <UpgradeButton
                title={upgrade.description}
                imageSrc={upgrade.icon}
                imageAlt={upgrade.name}
                buttonText={upgrade.name}
                money={0}
                knowledge={holidayCheer}
                cost={upgrade.cost}
                currencyType="knowledge"
                currencyLabel="Cheer"
                onClick={() => purchaseUpgrade(upgrade.id)}
                disabled={holidayCheer < upgrade.cost || upgrade.owned || locked}
                isOwned={upgrade.owned}
                effect={effectText}
                formatNumber={formatNumber}
              />
            </div>
          );
        })}

        {/* Passive Income Progress Display */}
        {/* {hasGoldenBell && (
          <div className={styles.progressSection}>
            <div className={styles.progressContainer}>
              <span className={styles.progressText}>
                Passive Income: {formatNumber(passiveCheerPerSecond, 1)} Cheer/sec
              </span>
              <div className={styles.progressBarWrapper}>
                <ProgressBar value={1} max={1} height={12} color="#ffd700" />
                <span className={styles.progressLabel}>
                  {passiveCheerPerSecond > 0 ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        )} */}
      </div>
    </>
  );
});

ShopfrontUpgradesPanel.displayName = 'ShopfrontUpgradesPanel';

export default ShopfrontUpgradesPanel;

