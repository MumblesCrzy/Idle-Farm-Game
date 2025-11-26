import React, { memo } from 'react';
import type { BeeUpgrade, BeekeeperAssistant } from '../types/bees';
import UpgradeButton from './UpgradeButton';
import { isUpgradeUnlocked } from '../data/beeUpgrades';
import { 
  ICON_BEE, 
  ICON_HONEY, 
  BEE_BUSY_BEES, 
  BEE_ROYAL_JELLY, 
  BEE_QUEENS_BLESSING, 
  BEE_HEXCOMB_ENGINEERING, 
  BEE_MEADOW_MAGIC,
  BEE_WINTER_HARDINESS,
  BEE_GOLDEN_TOUCH,
  BEE_HIVE_EXPANSION,
  BEE_NECTAR_EFFICIENCY,
  BEE_FLOWER_POWER,
  BEE_SWIFT_GATHERERS,
  BEE_BEEKEEPER,
  BEE_BEEKEEPER_UPGRADE
} from '../config/assetPaths';
import styles from './BeeUpgradesPanel.module.css';

interface BeeUpgradesPanelProps {
  upgrades: BeeUpgrade[];
  regularHoney: number;
  goldenHoney: number;
  onPurchaseUpgrade: (upgradeId: string) => boolean;
  formatNumber: (num: number, decimalPlaces?: number) => string;
  // Beekeeper Assistant props
  assistant: BeekeeperAssistant;
  currentBoxes: number;
  unlockBoxesRequired: number;
  onUnlockAssistant: () => boolean;
  onUpgradeAssistant: () => boolean;
  onToggleAssistant: (active: boolean) => void;
  showAssistant?: boolean; // Optional: control whether to show assistant section
  allUpgrades?: BeeUpgrade[]; // All upgrades for checking requirements across categories
}

const BeeUpgradesPanel: React.FC<BeeUpgradesPanelProps> = memo(({
  upgrades,
  regularHoney,
  goldenHoney,
  onPurchaseUpgrade,
  formatNumber,
  assistant,
  currentBoxes,
  unlockBoxesRequired,
  onUnlockAssistant,
  onUpgradeAssistant,
  onToggleAssistant,
  showAssistant = true,
  allUpgrades
}) => {
  // Use allUpgrades if provided, otherwise fall back to upgrades
  const upgradesForRequirementCheck = allUpgrades || upgrades;
  
  // Group upgrades by category
  const groupedUpgrades = {
    production: upgrades.filter(u => u.category === 'production'),
    quality: upgrades.filter(u => u.category === 'quality'),
    yield: upgrades.filter(u => u.category === 'yield'),
    automation: upgrades.filter(u => u.category === 'automation'),
  };

  const canUnlock = currentBoxes >= unlockBoxesRequired && regularHoney >= 750;
  const canUpgrade = assistant.unlocked && regularHoney >= assistant.upgradeCost && assistant.level < assistant.maxLevel;
  const isMaxLevel = assistant.level >= assistant.maxLevel;

  // Calculate current bonus display
  const productionBonusPercent = (assistant.productionSpeedBonus * 100).toFixed(0);
  const nextLevelBonus = assistant.unlocked && !isMaxLevel 
    ? ((0.1 + ((assistant.level + 1) * 0.05)) * 100).toFixed(0)
    : 0;

  // Helper function to get mechanics-only description
  const getMechanicsDescription = (upgrade: BeeUpgrade): string => {
    if (upgrade.effectType === 'productionSpeed') {
      return `${(upgrade.effectValue * 100).toFixed(0)}% faster per level`;
    } else if (upgrade.effectType === 'goldenHoneyChance') {
      return `${(upgrade.effectValue * 100).toFixed(0)}% chance for Golden Honey`;
    } else if (upgrade.effectType === 'goldenHoneyDouble') {
      return '2x Golden Honey chance';
    } else if (upgrade.effectType === 'honeyProduction') {
      return `+${(upgrade.effectValue * 100).toFixed(0)}% honey per level`;
    } else if (upgrade.effectType === 'cropYieldBonus') {
      return `+${(upgrade.effectValue * 100).toFixed(1)}% crops/box/level`;
    } else if (upgrade.effectType === 'automationSpeed') {
      return 'Auto-harvest enabled';
    }
    return upgrade.description;
  };

  // Helper to get the appropriate icon for an upgrade
  const getUpgradeIcon = (upgrade: BeeUpgrade): string => {
    // Map specific upgrade IDs to their custom icons
    const iconMap: Record<string, string> = {
      'busy_bees': BEE_BUSY_BEES,
      'royal_jelly': BEE_ROYAL_JELLY,
      'queens_blessing': BEE_QUEENS_BLESSING,
      'hexcomb_engineering': BEE_HEXCOMB_ENGINEERING,
      'meadow_magic': BEE_MEADOW_MAGIC,
      'winter_hardiness': BEE_WINTER_HARDINESS,
      'golden_touch': BEE_GOLDEN_TOUCH,
      'hive_expansion': BEE_HIVE_EXPANSION,
      'nectar_efficiency': BEE_NECTAR_EFFICIENCY,
      'flower_power': BEE_FLOWER_POWER,
      'swift_gatherers': BEE_SWIFT_GATHERERS,
    };
    
    // Return specific icon if available
    if (iconMap[upgrade.id]) {
      return iconMap[upgrade.id];
    }
    
    // Fall back to currency-based icons
    if (upgrade.costCurrency === 'goldenHoney') {
      return ICON_HONEY; // Use honey icon for golden honey upgrades
    }
    return ICON_BEE; // Use bee icon for regular honey upgrades
  };

  const renderCategory = (categoryName: string, categoryUpgrades: BeeUpgrade[]) => {
    // Show automation category if it has upgrades OR if assistant should be shown
    if (categoryUpgrades.length === 0 && !(categoryName === 'automation' && showAssistant)) return null;

    return (
      <div key={categoryName} className={styles.category}>
        <div className={styles.categoryGrid}>
          {/* If this is automation category and showAssistant is true, show assistant as first item */}
          {categoryName === 'automation' && showAssistant && (
            assistant.unlocked ? (
              // Show assistant as toggle button (similar to Canner pattern)
              <button
                key="assistant-toggle"
                className={`${styles.assistantToggleBtn} ${assistant.active ? styles.toggleActive : styles.toggleInactive}`}
                onClick={() => onToggleAssistant(!assistant.active)}
                title={`Beekeeper Assistant • Level ${assistant.level}/${assistant.maxLevel} • +${productionBonusPercent}% production${!isMaxLevel ? ` • Upgrade: ${formatNumber(assistant.upgradeCost, 0)} Honey → +${nextLevelBonus}%` : ''}`}
              >
                <div className={styles.assistantToggleLayout}>
                  <div className={styles.assistantToggleIcon}>
                    <img 
                      src={BEE_BEEKEEPER} 
                      alt="" 
                      aria-hidden="true"
                      className={styles.assistantToggleImage}
                    />
                  </div>
                  <div className={styles.assistantToggleInfo}>
                    <div className={styles.assistantToggleHeader}>
                      <span className={styles.assistantToggleName}>
                        Beekeeper: {assistant.active ? 'ON' : 'OFF'}
                      </span>
                    </div>
                    <div className={styles.assistantToggleDesc}>
                      {assistant.active ? 'Auto-collecting honey' : 'Click to enable'}
                    </div>
                  </div>
                </div>
              </button>
            ) : (
              // Show assistant as locked upgrade button
              <UpgradeButton
                key="assistant-unlock"
                title={`Unlock Beekeeper • Requires ${unlockBoxesRequired} hives and 750 regular honey • Automatically collects honey from bee boxes`}
                imageSrc={BEE_BEEKEEPER}
                imageAlt="Beekeeper"
                buttonText="Beekeeper"
                money={0}
                knowledge={0}
                regularHoney={regularHoney}
                goldenHoney={goldenHoney}
                cost={750}
                currencyType="regularHoney"
                onClick={onUnlockAssistant}
                disabled={!canUnlock}
                isOwned={false}
                isMaxLevel={false}
                effect={`${currentBoxes}/${unlockBoxesRequired} hives`}
                formatNumber={formatNumber}
              />
            )
          )}
          
          {/* If assistant is unlocked and not max level, show upgrade button */}
          {categoryName === 'automation' && showAssistant && assistant.unlocked && !isMaxLevel && (
            <UpgradeButton
              key="assistant-upgrade"
              title={`Upgrade Beekeeper to Level ${assistant.level + 1} • Increases production bonus to +${nextLevelBonus}%`}
              imageSrc={BEE_BEEKEEPER_UPGRADE}
              imageAlt="Upgrade Beekeeper"
              buttonText={`Upgrade Beekeeper`}
              money={0}
              knowledge={0}
              regularHoney={regularHoney}
              goldenHoney={goldenHoney}
              cost={assistant.upgradeCost}
              currencyType="regularHoney"
              onClick={onUpgradeAssistant}
              disabled={!canUpgrade}
              isOwned={false}
              isMaxLevel={false}
              level={assistant.level}
              effect={`+${productionBonusPercent}% → +${nextLevelBonus}%`}
              formatNumber={formatNumber}
            />
          )}
          
          {/* Regular category upgrades */}
          {categoryUpgrades.map(upgrade => {
            const isMaxed = upgrade.repeatable && upgrade.maxLevel !== undefined && upgrade.level >= upgrade.maxLevel;
            const isPurchased = upgrade.purchased && !upgrade.repeatable;
            
            // Check if upgrade is unlocked based on requirements
            // Use all upgrades for checking cross-category requirements
            const purchasedUpgradeIds = upgradesForRequirementCheck.filter(u => u.purchased).map(u => u.id);
            const isLocked = !isUpgradeUnlocked(upgrade, currentBoxes, purchasedUpgradeIds);
            
            // Generate requirement text for locked upgrades
            let requirementText: string | undefined;
            if (isLocked && upgrade.requiredBoxes && currentBoxes < upgrade.requiredBoxes) {
              requirementText = `Requires ${upgrade.requiredBoxes} bee hives`;
            }
            
            return (
              <UpgradeButton
                key={upgrade.id}
                title={upgrade.description} // Flavor text in tooltip
                imageSrc={getUpgradeIcon(upgrade)}
                imageAlt={upgrade.name}
                buttonText={upgrade.name}
                money={0}
                knowledge={0}
                regularHoney={regularHoney}
                goldenHoney={goldenHoney}
                cost={upgrade.cost}
                currencyType={upgrade.costCurrency as 'regularHoney' | 'goldenHoney'}
                onClick={() => onPurchaseUpgrade(upgrade.id)}
                disabled={isLocked}
                isOwned={isPurchased}
                isMaxLevel={isMaxed}
                level={upgrade.repeatable ? upgrade.level : undefined}
                effect={getMechanicsDescription(upgrade)}
                requirement={requirementText}
                formatNumber={formatNumber}
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {/* Upgrade categories */}
      <div className={styles.categoriesContainer}>
        {renderCategory('production', groupedUpgrades.production)}
        {renderCategory('quality', groupedUpgrades.quality)}
        {renderCategory('yield', groupedUpgrades.yield)}
        {renderCategory('automation', groupedUpgrades.automation)}
      </div>
    </div>
  );
});

BeeUpgradesPanel.displayName = 'BeeUpgradesPanel';

export default BeeUpgradesPanel;
