import React, { memo } from 'react';
import ProgressBar from './ProgressBar';
import type { BeeBox } from '../types/bees';
import { ICON_BEE_HIVE, ICON_HONEY } from '../config/assetPaths';
import styles from './BeeBoxDisplay.module.css';

interface BeeBoxDisplayProps {
  box: BeeBox;
  season: string;
  productionSpeedBonus: number; // Percentage bonus from upgrades (e.g., 0.05 = 5%)
}

const BeeBoxDisplay: React.FC<BeeBoxDisplayProps> = memo(({
  box,
  season,
  productionSpeedBonus
}) => {
  // Calculate actual production time with speed bonus applied
  const actualProductionTime = box.productionTime / (1 + productionSpeedBonus);
  
  // Calculate remaining time in seconds
  const remainingTime = Math.max(0, actualProductionTime - box.productionTimer);
  
  // Determine if inactive due to winter
  const isWinter = season === 'Winter';
  const inactiveReason = !box.active && isWinter ? 'Winter Dormant' : 'Inactive';

  return (
    <div className={`${styles.container} ${box.harvestReady ? styles.ready : ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.iconWrapper}>
          <img src={ICON_BEE_HIVE} alt="Bee Hive" className={styles.icon} />
          {box.harvestReady && (
            <span className={styles.readyIndicator}>✓</span>
          )}
        </div>
        <div className={styles.headerInfo}>
          <div className={styles.title}>
            Bee Hive
          </div>
        </div>
      </div>

      {/* Production Progress */}
      <div className={styles.progressSection}>
        <div className={styles.progressLabel}>
          {box.harvestReady ? (
            <span className={styles.readyText}><img src={ICON_HONEY} alt="Honey" style={{ width: '16px', height: '16px', verticalAlign: 'middle' }} /> Honey Ready!</span>
          ) : (
            <span className={styles.timerText}>Days until harvest: </span>
          )}
          <span className={styles.progressPercent}>
            {box.harvestReady ? '' : `${Math.ceil(remainingTime)}`}
          </span>
        </div>
        <ProgressBar
          value={box.productionTimer}
          max={actualProductionTime}
          height={16}
          color={box.harvestReady ? '#f39c12' : '#4caf50'}
        />
      </div>

      {/* Status Indicator */}
      {!box.active && (
        <div className={styles.inactiveOverlay}>
          <span className={styles.inactiveLabel}>
            {inactiveReason}
            {isWinter && (
              <span style={{ display: 'block', fontSize: '0.65rem', marginTop: '0.25rem', color: '#6c8bad' }}>
                Bees hibernate
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
});

BeeBoxDisplay.displayName = 'BeeBoxDisplay';

export default BeeBoxDisplay;
