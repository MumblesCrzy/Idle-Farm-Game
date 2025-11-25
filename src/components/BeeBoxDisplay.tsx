import React, { memo } from 'react';
import ProgressBar from './ProgressBar';
import type { BeeBox } from '../types/bees';
import { ICON_BEE_HIVE } from '../config/assetPaths';
import styles from './BeeBoxDisplay.module.css';

interface BeeBoxDisplayProps {
  box: BeeBox;
  productionSpeedBonus: number; // Percentage bonus from upgrades (e.g., 0.05 = 5%)
}

const BeeBoxDisplay: React.FC<BeeBoxDisplayProps> = memo(({
  box,
  productionSpeedBonus
}) => {
  // Calculate actual production time with speed bonus applied
  const actualProductionTime = box.productionTime / (1 + productionSpeedBonus);
  
  // Calculate progress percentage based on actual (reduced) production time
  const progressPercent = (box.productionTimer / actualProductionTime) * 100;

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
            <span className={styles.readyText}>🍯 Honey Ready!</span>
          ) : (
            <span className={styles.timerText}>Days until harvest: </span>
          )}
          <span className={styles.progressPercent}>
            {Math.floor(progressPercent)}%
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
          <span className={styles.inactiveLabel}>Inactive</span>
        </div>
      )}
    </div>
  );
});

BeeBoxDisplay.displayName = 'BeeBoxDisplay';

export default BeeBoxDisplay;
