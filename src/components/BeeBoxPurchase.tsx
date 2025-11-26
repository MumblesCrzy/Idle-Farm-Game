import React, { memo } from 'react';
import { ICON_BEE_HIVE, ICON_HONEY } from '../config/assetPaths';
import styles from './BeeBoxPurchase.module.css';

interface BeeBoxPurchaseProps {
  currentBoxes: number;
  maxBoxes: number;
  regularHoney: number;
  onPurchase: () => boolean;
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

const BeeBoxPurchase: React.FC<BeeBoxPurchaseProps> = memo(({
  currentBoxes,
  maxBoxes,
  regularHoney,
  onPurchase,
  formatNumber
}) => {
  // Calculate cost (same formula as BeeContext: 150 + (boxes.length * 75))
  const calculateCost = (boxCount: number): number => {
    return 150 + (boxCount * 75);
  };

  const cost = calculateCost(currentBoxes);
  const canAfford = regularHoney >= cost;
  const atMaxCapacity = currentBoxes >= maxBoxes;

  const handlePurchase = () => {
    if (atMaxCapacity || !canAfford) return;
    
    const success = onPurchase();
    if (success) {
      // Optional: Could add visual feedback here
      console.log('Bee box purchased successfully');
    }
  };

  return (
    <div className={`${styles.container} ${!atMaxCapacity && canAfford ? styles.available : ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.iconWrapper}>
          <img src={ICON_BEE_HIVE} alt="New Bee Hive" className={styles.icon} />
          {!atMaxCapacity && canAfford && (
            <span className={styles.availableIndicator}>✓</span>
          )}
        </div>
        <div className={styles.headerInfo}>
          <div className={styles.title}>
            {atMaxCapacity ? 'Maximum Capacity' : 'New Bee Hive'}
          </div>
        </div>
      </div>

      {/* Purchase Content */}
      {!atMaxCapacity ? (
        <>
          {/* Combined Purchase Button with Cost */}
          <button
            className={styles.purchaseButton}
            onClick={handlePurchase}
            disabled={!canAfford}
            title={
              !canAfford
                ? `Not enough honey. Need ${formatNumber(cost - regularHoney, 1)} more.`
                : 'Purchase a new bee hive'
            }
          >
            <span className={styles.buttonIcon}>➕</span>
            <span className={styles.buttonText}>Purchase</span>
            <span className={styles.buttonCost}>
              <img src={ICON_HONEY} alt="Honey" className={styles.costIconInButton} />
              {formatNumber(cost, 1)}
            </span>
          </button>
        </>
      ) : (
        <div className={styles.maxCapacityContent}>
          <div className={styles.maxIcon}>🏆</div>
          <div className={styles.maxText}>
            All {maxBoxes} boxes owned!
          </div>
        </div>
      )}
    </div>
  );
});

BeeBoxPurchase.displayName = 'BeeBoxPurchase';

export default BeeBoxPurchase;
