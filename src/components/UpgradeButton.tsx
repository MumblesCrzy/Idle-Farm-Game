import { memo, type FC } from 'react';
import { ICON_HONEY, ICON_GOLDEN_HONEY } from '../config/assetPaths';
import styles from './UpgradeButton.module.css';

export interface UpgradeButtonProps {
  title: string;
  imageSrc: string;
  imageAlt?: string;
  buttonText: string;
  money: number;
  knowledge: number;
  cost: number;
  currencyType: 'money' | 'knowledge' | 'regularHoney' | 'goldenHoney';
  currencyLabel?: string; // Optional custom label (e.g., "Cheer" instead of "Kn")
  onClick: () => void;
  disabled?: boolean;
  isOwned?: boolean;
  isMaxLevel?: boolean;
  level?: number;
  flex?: boolean;
  effect?: string;
  requirement?: string; // Optional requirement text (e.g., "Requires 10 boxes")
  knowledgeCost?: number; // Add optional knowledge cost for dual-cost items
  regularHoney?: number; // Honey currency for bee upgrades
  goldenHoney?: number; // Golden honey currency for bee upgrades
  formatNumber: (num: number, decimalPlaces?: number) => string;
  // Togglable support - for items that become on/off toggles after purchase
  isTogglable?: boolean;
  isActive?: boolean; // Only used when isTogglable && isOwned
  onToggle?: () => void; // Click handler when toggling (not purchasing)
}

const UpgradeButton: FC<UpgradeButtonProps> = memo(({ 
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
  requirement,
  knowledgeCost,
  regularHoney = 0,
  goldenHoney = 0,
  formatNumber,
  isTogglable = false,
  isActive = true,
  onToggle
}) => {
  // Determine if user can afford based on currency type
  const canAfford = (() => {
    switch (currencyType) {
      case 'money':
        return money >= cost;
      case 'knowledge':
        return knowledge >= cost;
      case 'regularHoney':
        return regularHoney >= cost;
      case 'goldenHoney':
        return goldenHoney >= cost;
      default:
        return false;
    }
  })();
  
  // Render the currency display (can be text or JSX)
  const renderCurrencyIcon = () => {
    if (currencyLabel) return currencyLabel;
    switch (currencyType) {
      case 'money':
        return '$';
      case 'knowledge':
        return 'Kn';
      case 'regularHoney':
        return <img src={ICON_HONEY} alt="Honey" style={{ width: '14px', height: '14px', verticalAlign: 'middle' }} />;
      case 'goldenHoney':
        return <img src={ICON_GOLDEN_HONEY} alt="Golden Honey" style={{ width: '14px', height: '14px', verticalAlign: 'middle' }} />;
      default:
        return '';
    }
  };
  
  const getButtonClass = () => {
    // When owned and togglable, show active/inactive states
    if (isOwned && isTogglable) {
      return isActive 
        ? `${styles.button} ${styles.toggleActive}` 
        : `${styles.button} ${styles.toggleInactive}`;
    }
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
            <>
              <div className={styles.effect}>
                {knowledgeCost ? (
                  `$${formatNumber(cost, 2)} & ${formatNumber(knowledgeCost, 2)} Kn`
                ) : currencyType === 'money' ? (
                  `$${formatNumber(cost, 2)}`
                ) : currencyType === 'regularHoney' || currencyType === 'goldenHoney' ? (
                  <>
                    {formatNumber(cost, 2)} {renderCurrencyIcon()}
                  </>
                ) : (
                  <>
                    {formatNumber(cost, 2)} {renderCurrencyIcon()}
                  </>
                )}
              </div>
              {requirement && (
                <div className={styles.unlock}>
                  {requirement}
                </div>
              )}
            </>
          )}
          {isOwned && isTogglable && (
            <div className={isActive ? styles.statusActive : styles.statusInactive}>
              {isActive ? '✓ Active' : '⏸ Paused'}
            </div>
          )}
          {isOwned && !isTogglable && (
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
          : currencyType === 'regularHoney'
            ? `Costs ${formatNumber(cost, 1)} honey`
            : currencyType === 'goldenHoney'
              ? `Costs ${formatNumber(cost, 1)} golden honey`
              : `Costs ${formatNumber(cost, 1)} ${currencyLabel || 'knowledge'}`;
      label += `. ${costText}`;
      if (!canAfford) {
        label += '. Cannot afford';
      }
    }
    return label;
  };

  // Determine click handler and disabled state
  const handleClick = isOwned && isTogglable && onToggle ? onToggle : onClick;
  const isDisabled = isOwned && isTogglable 
    ? false  // Togglable owned items are always clickable
    : disabled || !canAfford || isMaxLevel || isOwned;

  return (
    <button
      title={title}
      className={getButtonClass()}
      style={flex ? { flex: 1 } : undefined}
      onClick={handleClick}
      disabled={isDisabled}
      aria-label={getAriaLabel()}
      aria-disabled={isDisabled}
    >
      {renderButtonContent()}
    </button>
  );
});

UpgradeButton.displayName = 'UpgradeButton';

export default UpgradeButton;
