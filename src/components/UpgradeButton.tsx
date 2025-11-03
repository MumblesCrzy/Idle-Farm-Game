import React from 'react';
import styles from './UpgradeButton.module.css';

export interface UpgradeButtonProps {
  title: string;
  imageSrc: string;
  imageAlt: string;
  buttonText: string;
  money: number;
  knowledge: number;
  cost: number;
  currencyType: 'money' | 'knowledge';
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
  imageAlt, 
  buttonText, 
  money, 
  knowledge, 
  cost, 
  currencyType, 
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
            alt={imageAlt} 
            className={styles.image}
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
                (currencyType === 'money' ? `$${formatNumber(cost, 1)}` : `${formatNumber(cost, 1)} Kn`)
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

  return (
    <button
      title={title}
      className={getButtonClass()}
      style={flex ? { flex: 1 } : undefined}
      onClick={onClick}
      disabled={disabled || !canAfford || isMaxLevel || isOwned}
    >
      {renderButtonContent()}
    </button>
  );
};

export default UpgradeButton;
