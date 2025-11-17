import React, { memo } from 'react';
import UpgradeButton from './UpgradeButton';
import type { EventUpgrade } from '../types/christmasEvent';
import styles from './FarmingUpgradesPanel.module.css';

interface FarmingUpgradesPanelProps {
  upgrades: EventUpgrade[];
  holidayCheer: number;
  purchaseUpgrade: (upgradeId: string) => boolean;
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

// Custom Holiday Cheer upgrade button that matches UpgradeButton style
interface HolidayCheerUpgradeButtonProps {
  title: string;
  imageSrc: string;
  buttonText: string;
  cost: number;
  holidayCheer: number;
  onClick: () => void;
  isOwned?: boolean;
  isMaxLevel?: boolean;
  level?: number;
  effect: string;
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

const HolidayCheerUpgradeButton: React.FC<HolidayCheerUpgradeButtonProps> = ({
  title,
  imageSrc,
  buttonText,
  cost,
  holidayCheer,
  onClick,
  isOwned = false,
  isMaxLevel = false,
  level,
  effect,
  formatNumber
}) => {
  const canAfford = holidayCheer >= cost;
  
  // Use UpgradeButton but adapt it for Holiday Cheer
  // We'll pass knowledge as holidayCheer and use 'knowledge' currency type with custom label
  return (
    <UpgradeButton
      title={title}
      imageSrc={imageSrc}
      imageAlt={buttonText}
      buttonText={buttonText}
      money={0}
      knowledge={holidayCheer}
      cost={cost}
      currencyType="knowledge"
      currencyLabel="Cheer"
      onClick={onClick}
      disabled={!canAfford || isMaxLevel || isOwned}
      isOwned={isOwned}
      isMaxLevel={isMaxLevel}
      level={level}
      effect={effect}
      formatNumber={formatNumber}
    />
  );
};

const FarmingUpgradesPanel: React.FC<FarmingUpgradesPanelProps> = memo(({ 
  upgrades, 
  holidayCheer, 
  purchaseUpgrade,
  formatNumber
}) => {
  // Filter out tree unlock upgrades since they're handled by tree selection buttons
  const farmingUpgrades = upgrades.filter(u => 
    u.category === 'farming' && 
    !u.id.startsWith('unlock_')
  );
  
  return (
    <>
      <h2 className={styles.title}>Farming Upgrades</h2>
      
      <div className={styles.upgradesContainer}>
        {farmingUpgrades.map(upgrade => {
          const isRepeatable = upgrade.repeatable ?? false;
          const currentLevel = upgrade.level ?? 0;
          const maxLevel = upgrade.maxLevel ?? Infinity;
          const isMaxLevel = isRepeatable && currentLevel >= maxLevel;
          
          // Calculate cost for next level if repeatable
          const costScaling = upgrade.costScaling ?? 1.5;
          const displayCost = isRepeatable 
            ? Math.floor(upgrade.cost * Math.pow(costScaling, currentLevel))
            : upgrade.cost;
          
          // Create effect text
          let effectText = upgrade.effect || upgrade.description;
          
          return (
            <div key={upgrade.id}>
              <HolidayCheerUpgradeButton
                title={upgrade.description}
                imageSrc={upgrade.icon}
                buttonText={upgrade.name}
                cost={displayCost}
                holidayCheer={holidayCheer}
                onClick={() => purchaseUpgrade(upgrade.id)}
                isOwned={upgrade.owned && !isRepeatable}
                isMaxLevel={isMaxLevel}
                level={isRepeatable ? currentLevel : undefined}
                effect={effectText}
                formatNumber={formatNumber}
              />
            </div>
          );
        })}
      </div>
    </>
  );
});

FarmingUpgradesPanel.displayName = 'FarmingUpgradesPanel';

export default FarmingUpgradesPanel;


