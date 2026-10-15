import { memo, useCallback, type FC } from 'react';
import UpgradeButton from './UpgradeButton';
import type { EventUpgrade, EventUpgradeCategory } from '../types/christmasEvent';
import { getEventUpgradeCost, getMissingPrerequisite, isEventUpgradeAtMaxLevel } from '../utils/christmasUpgrades';
import styles from './EventUpgradesPanel.module.css';

type FormatNumber = (num: number, decimalPlaces?: number) => string;

interface EventUpgradeItemProps {
  upgrade: EventUpgrade;
  /** Name of the upgrade to buy first, or null */
  missingPrerequisite: string | null;
  holidayCheer: number;
  onPurchase: (upgradeId: string) => unknown;
  formatNumber: FormatNumber;
}

const EventUpgradeItem: FC<EventUpgradeItemProps> = memo(({
  upgrade,
  missingPrerequisite,
  holidayCheer,
  onPurchase,
  formatNumber
}) => {
  const handleClick = useCallback(() => {
    onPurchase(upgrade.id);
  }, [onPurchase, upgrade.id]);

  const isRepeatable = upgrade.repeatable ?? false;

  return (
    <div>
      <UpgradeButton
        title={upgrade.description}
        imageSrc={upgrade.icon}
        imageAlt={upgrade.name}
        buttonText={upgrade.name}
        holidayCheer={holidayCheer}
        cost={getEventUpgradeCost(upgrade)}
        currencyType="cheer"
        onClick={handleClick}
        disabled={missingPrerequisite !== null}
        isOwned={upgrade.owned && !isRepeatable}
        isMaxLevel={isEventUpgradeAtMaxLevel(upgrade)}
        level={isRepeatable ? upgrade.level ?? 0 : undefined}
        effect={missingPrerequisite ? `🔒 Requires ${missingPrerequisite}` : upgrade.effect || upgrade.description}
        formatNumber={formatNumber}
      />
    </div>
  );
});

EventUpgradeItem.displayName = 'EventUpgradeItem';

interface EventUpgradesPanelProps {
  title: string;
  category: EventUpgradeCategory;
  upgrades: EventUpgrade[];
  holidayCheer: number;
  purchaseUpgrade: (upgradeId: string) => unknown;
  formatNumber: FormatNumber;
}

/** Holiday Cheer upgrades for one Christmas Tree Shop tab */
const EventUpgradesPanel: FC<EventUpgradesPanelProps> = memo(({
  title,
  category,
  upgrades,
  holidayCheer,
  purchaseUpgrade,
  formatNumber
}) => (
  <>
    <h2 className={styles.title}>{title}</h2>

    <div className={styles.upgradesContainer}>
      {upgrades
        // Tree unlocks are bought from the tree selection buttons instead
        .filter(upgrade => upgrade.category === category && !upgrade.id.startsWith('unlock_'))
        .map(upgrade => {
          const missingPrerequisite = getMissingPrerequisite(upgrade, upgrades);
          if (missingPrerequisite && upgrade.hiddenUntilRequired) return null;
          return (
            <EventUpgradeItem
              key={upgrade.id}
              upgrade={upgrade}
              missingPrerequisite={missingPrerequisite}
              holidayCheer={holidayCheer}
              onPurchase={purchaseUpgrade}
              formatNumber={formatNumber}
            />
          );
        })}
    </div>
  </>
));

EventUpgradesPanel.displayName = 'EventUpgradesPanel';

export default EventUpgradesPanel;
