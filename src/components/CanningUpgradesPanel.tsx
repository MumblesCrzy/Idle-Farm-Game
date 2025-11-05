import React, { memo } from 'react';
import type { CanningUpgrade } from '../types/canning';
import { formatNumber } from '../utils/gameCalculations';
import styles from './CanningUpgradesPanel.module.css';
import { 
  CANNING_QUICK_HANDS, 
  CANNING_FAMILY_RECIPE, 
  CANNING_HEIRLOOM_TOUCH, 
  CANNING_BATCH_CANNING, 
  CANNING_CANNER, 
  UPGRADE_FERTILIZER 
} from '../config/assetPaths';

interface UpgradeButtonProps {
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
  isMaxLevel?: boolean;
  level?: number;
  maxLevel?: number;
  effect?: string;
}

function CanningUpgradeButton({ 
  title, 
  imageSrc, 
  buttonText, 
  money, 
  knowledge, 
  cost, 
  currencyType, 
  onClick, 
  disabled = false, 
  isMaxLevel = false, 
  level,
  maxLevel,
  effect
}: UpgradeButtonProps) {
  const canAfford = currencyType === 'money' ? money >= cost : knowledge >= cost;
  
  const getButtonClass = () => {
    if (isMaxLevel) return `${styles.button} ${styles.maxLevel}`;
    if (disabled || !canAfford) return `${styles.button} ${styles.disabled}`;
    return `${styles.button} ${styles.canAfford}`;
  };

  const currencySymbol = currencyType === 'money' ? '$' : '';
  const currencyUnit = currencyType === 'knowledge' ? ' Kn' : '';

  return (
    <button
      title={title}
      className={getButtonClass()}
      onClick={onClick}
      disabled={disabled || !canAfford || isMaxLevel}
    >
      <div className={styles.imageWrapper}>
        <img 
          src={imageSrc} 
          alt="" 
          aria-hidden="true"
          className={styles.image}
        />
      </div>
      <div className={styles.content}>
        <div className={styles.name}>
          {buttonText}
          {level !== undefined && (
            <span className={styles.level}>
              {maxLevel ? `(${level}/${maxLevel})` : `(${level})`}
            </span>
          )}
        </div>
        {effect && (
          <div className={styles.description}>
            {effect}
          </div>
        )}
        {!isMaxLevel && (
          <div className={styles.effect}>
            {currencySymbol}{formatNumber(cost, 1)}{currencyUnit}
          </div>
        )}
        {isMaxLevel && (
          <div className={styles.cost}>
            MAX LEVEL
          </div>
        )}
      </div>
    </button>
  );
}

interface CanningUpgradesPanelProps {
  upgrades: CanningUpgrade[];
  money: number;
  knowledge: number;
  onPurchaseUpgrade: (upgradeId: string) => boolean;
  canningState: any;
  onToggleAutoCanning: () => void;
}

const CanningUpgradesPanel: React.FC<CanningUpgradesPanelProps> = memo(({
  upgrades,
  money,
  knowledge,
  onPurchaseUpgrade,
  canningState,
  onToggleAutoCanning
}) => {
  const getUpgradeEffect = (upgrade: CanningUpgrade): string => {
    switch (upgrade.type) {
      case 'speed':
        return `Processing time: ${(upgrade.effect * 100).toFixed(0)}%`;
      case 'efficiency':
        return `Sale price: +${((upgrade.effect - 1) * 100).toFixed(0)}%`;
      case 'quality':
        return `Bonus chance: ${upgrade.effect.toFixed(0)}%`;
      case 'automation':
        return `Max processes: ${1 + upgrade.effect}`;
      default:
        return `Level ${upgrade.level}`;
    }
  };

  const getUpgradeImage = (upgrade: CanningUpgrade): string => {
    switch (upgrade.id) {
      case 'canning_speed':
        return CANNING_QUICK_HANDS;
      case 'canning_efficiency':
        return CANNING_FAMILY_RECIPE;
      case 'preservation_mastery':
        return CANNING_HEIRLOOM_TOUCH;
      case 'simultaneous_processing':
        return CANNING_BATCH_CANNING;
      case 'canner':
        return CANNING_CANNER;
      default:
        return UPGRADE_FERTILIZER; // Default icon
    }
  };

  // Get known max level for an upgrade (defensive fallback)
  const getKnownMaxLevel = (upgradeId: string): number | undefined => {
    switch (upgradeId) {
      case 'canning_speed':
        return 18;
      case 'simultaneous_processing':
        return 14;
      case 'canner':
        return 1;
      default:
        return undefined;
    }
  };

  const getUpgradeTitle = (upgrade: CanningUpgrade): string => {
    const effectiveMaxLevel = upgrade.maxLevel ?? getKnownMaxLevel(upgrade.id);
    let baseTitle = `${upgrade.name}: ${upgrade.description}`;
    if (effectiveMaxLevel && upgrade.level >= effectiveMaxLevel) {
      baseTitle += ' | MAX LEVEL REACHED';
    }
    return baseTitle;
  };

  return (
    <div className={styles.upgradesContainer}>
      {upgrades?.map(upgrade => {
        // Special handling for Canner upgrade to combine purchase and toggle
        if (upgrade.id === 'canner') {
          const isPurchased = upgrade.level > 0;
          const isEnabled = canningState?.autoCanning?.enabled || false;
          
          if (!isPurchased) {
            // Not purchased - show as regular upgrade button
            return (
              <CanningUpgradeButton
                key={upgrade.id}
                title={getUpgradeTitle(upgrade)}
                imageSrc={getUpgradeImage(upgrade)}
                imageAlt={upgrade.name}
                buttonText={upgrade.name}
                money={money}
                knowledge={knowledge}
                cost={upgrade.cost}
                currencyType={upgrade.costCurrency}
                onClick={() => onPurchaseUpgrade(upgrade.id)}
                isMaxLevel={false}
                level={upgrade.level}
                maxLevel={upgrade.maxLevel}
                effect={undefined}
              />
            );
          } else {
            // Purchased - show as toggle button with canning upgrade styling
            const getToggleButtonClass = () => {
              return isEnabled 
                ? `${styles.button} ${styles.canAfford}` 
                : `${styles.button} ${styles.toggleOff}`;
            };
            
            return (
              <button
                key={upgrade.id}
                className={getToggleButtonClass()}
                onClick={onToggleAutoCanning}
                title={`${isEnabled ? 'Disable' : 'Enable'} auto-canning. When enabled, automatically starts canning processes every 10 seconds.`}
              >
                <div className={styles.imageWrapper}>
                  <img 
                    src={getUpgradeImage(upgrade)} 
                    alt="" 
                    aria-hidden="true"
                    className={styles.image}
                  />
                </div>
                <div className={styles.content}>
                  <div className={styles.name}>
                    {upgrade.name}: {isEnabled ? 'ON' : 'OFF'}
                    <span className={styles.level}>
                      (1/1)
                    </span>
                  </div>
                  <div className={styles.description}>
                    {isEnabled ? 'Automatically starting recipes' : 'Click to enable automation'}
                  </div>
                </div>
              </button>
            );
          }
        }
        
        // Regular upgrade handling for all other upgrades
        const effectiveMaxLevel = upgrade.maxLevel ?? getKnownMaxLevel(upgrade.id);
        return (
          <CanningUpgradeButton
            key={upgrade.id}
            title={getUpgradeTitle(upgrade)}
            imageSrc={getUpgradeImage(upgrade)}
            imageAlt={upgrade.name}
            buttonText={upgrade.name}
            money={money}
            knowledge={knowledge}
            cost={upgrade.cost}
            currencyType={upgrade.costCurrency}
            onClick={() => onPurchaseUpgrade(upgrade.id)}
            isMaxLevel={effectiveMaxLevel ? upgrade.level >= effectiveMaxLevel : false}
            level={upgrade.level}
            maxLevel={effectiveMaxLevel}
            effect={getUpgradeEffect(upgrade)}
          />
        );
      })}
    </div>
  );
});

CanningUpgradesPanel.displayName = 'CanningUpgradesPanel';

export default CanningUpgradesPanel;