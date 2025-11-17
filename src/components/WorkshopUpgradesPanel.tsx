import React, { memo } from 'react';
import UpgradeButton from './UpgradeButton';
import type { EventUpgrade } from '../types/christmasEvent';
import styles from './WorkshopUpgradesPanel.module.css';

interface WorkshopUpgradesPanelProps {
  upgrades: EventUpgrade[];
  holidayCheer: number;
  purchaseUpgrade: (upgradeId: string) => boolean;
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

const WorkshopUpgradesPanel: React.FC<WorkshopUpgradesPanelProps> = memo(({ 
  upgrades, 
  holidayCheer, 
  purchaseUpgrade,
  formatNumber
}) => {
  const workshopUpgrades = upgrades.filter(u => u.category === 'workshop');
  
  // Check if Elves' Bench is owned (required for Cheerful Crafting to show)
  const hasElvesBench = upgrades.find(u => u.id === 'elves_bench')?.owned ?? false;
  
  return (
    <>
      <h2 className={styles.title}>Workshop Upgrades</h2>
      
      <div className={styles.upgradesContainer}>
        {workshopUpgrades.map(upgrade => {
          // Hide Cheerful Crafting until Elves' Bench is purchased
          if (upgrade.id === 'cheerful_crafting' && !hasElvesBench) {
            return null;
          }
          
          const isRepeatable = upgrade.repeatable ?? false;
          const currentLevel = upgrade.level ?? 0;
          const maxLevel = upgrade.maxLevel ?? Infinity;
          const isMaxLevel = isRepeatable && currentLevel >= maxLevel;
          
          // Calculate cost for next level if repeatable
          const costScaling = upgrade.costScaling ?? 1.5;
          const displayCost = isRepeatable 
            ? Math.floor(upgrade.cost * Math.pow(costScaling, currentLevel))
            : upgrade.cost;
          
          const effectText = upgrade.effect || upgrade.description;
          
          return (
            <div key={upgrade.id}>
              <UpgradeButton
                title={upgrade.description}
                imageSrc={upgrade.icon}
                imageAlt={upgrade.name}
                buttonText={upgrade.name}
                money={0}
                knowledge={holidayCheer}
                cost={displayCost}
                currencyType="knowledge"
                currencyLabel="Cheer"
                onClick={() => purchaseUpgrade(upgrade.id)}
                disabled={holidayCheer < displayCost || (upgrade.owned && !isRepeatable) || isMaxLevel}
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

WorkshopUpgradesPanel.displayName = 'WorkshopUpgradesPanel';

export default WorkshopUpgradesPanel;

