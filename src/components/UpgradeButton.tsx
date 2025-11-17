import React from 'react';
import styles from './UpgradeButton.module.css';

export interface UpgradeButtonProps {
  title: string;
  imageSrc: string;
  imageAlt?: string;
  buttonText: string;
  money: number;
  knowledge: number;
  cost: number;
  currencyType: 'money' | 'knowledge';
  currencyLabel?: string; // Optional custom label (e.g., "Cheer" instead of "Kn")
  onClick: () => void;
  disabled?: boolean;
  isOwned?: boolean;
  isMaxLevel?: boolean;
  level?: number;
  flex?: boolean;
  effect?: string;
  knowledgeCost?: number; // Add optional knowledge cost for dual-cost items
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

const UpgradeButton: React.FC<UpgradeButtonProps> = ({ 
  title, 
  imageSrc, 
  buttonText, 
  money, 
  knowledge, 
  cost, 
  currencyType,
  currencyLabel,
  onClick, 
  disabled = false, 
  isOwned = false, 
  isMaxLevel = false, 
  level,
  flex = false,
  effect,
  knowledgeCost,
  formatNumber
}) => {
  const canAfford = currencyType === 'money' ? money >= cost : knowledge >= cost;
  
  // Determine the currency display label
  const getCurrencyLabel = () => {
    if (currencyLabel) return currencyLabel;
    return currencyType === 'money' ? '$' : 'Kn';
  };
  
  const costLabel = getCurrencyLabel();
  
  const getButtonClass = () => {
    if (isOwned) return styles.button;
    if (isMaxLevel) return `${styles.button} ${styles.maxLevel}`;
    if (disabled) return `${styles.button} ${styles.disabled}`;
    if (!canAfford) return `${styles.button} ${styles.cannotAfford}`;
    return `${styles.button} ${styles.canAfford}`;
  };

  const renderButtonContent = () => {
    return (
      <>
        <div className={styles.imageWrapper}>
          <img 
            src={imageSrc} 
            alt="" 
            className={styles.image}
            aria-hidden="true"
          />
        </div>
        <div className={styles.content}>
          <div className={styles.name}>
            {buttonText}
            {level !== undefined && (
              <span className={styles.level}> ({level})</span>
            )}
          </div>
          {effect && (
            <div className={styles.description}>
              {effect}
            </div>
          )}
          {!isOwned && !isMaxLevel && (
            <div className={styles.effect}>
              {knowledgeCost ? 
                `$${formatNumber(cost, 1)} & ${formatNumber(knowledgeCost, 1)} Kn` : 
                (currencyType === 'money' 
                  ? `$${formatNumber(cost, 1)}` 
                  : `${formatNumber(cost, 1)} ${costLabel}`)
              }
            </div>
          )}
          {isOwned && (
            <div className={styles.cost}>
              Owned
            </div>
          )}
          {isMaxLevel && (
            <div className={styles.cost}>
              Max Level
            </div>
          )}
        </div>
      </>
    );
  };

  const getAriaLabel = () => {
    let label = buttonText;
    if (level !== undefined) {
      label += ` level ${level}`;
    }
    if (effect) {
      label += `. ${effect}`;
    }
    if (isOwned) {
      label += '. Already owned';
    } else if (isMaxLevel) {
      label += '. Maximum level reached';
    } else {
      const costText = knowledgeCost 
        ? `Costs $${formatNumber(cost, 1)} and ${formatNumber(knowledgeCost, 1)} knowledge`
        : currencyType === 'money' 
          ? `Costs $${formatNumber(cost, 1)}`
          : `Costs ${formatNumber(cost, 1)} ${currencyLabel || 'knowledge'}`;
      label += `. ${costText}`;
      if (!canAfford) {
        label += '. Cannot afford';
      }
    }
    return label;
  };

  return (
    <button
      title={title}
      className={getButtonClass()}
      style={flex ? { flex: 1 } : undefined}
      onClick={onClick}
      disabled={disabled || !canAfford || isMaxLevel || isOwned}
      aria-label={getAriaLabel()}
      aria-disabled={disabled || !canAfford || isMaxLevel || isOwned}
    >
      {renderButtonContent()}
    </button>
  );
};

export default UpgradeButton;
