import { memo, useCallback, type FC } from 'react';
import UpgradeButton from './UpgradeButton';
import type { EventCurrency, EventUpgrade, EventUpgradeCategory } from '../types/eventUpgrades';
import { getEventUpgradeCost, getMissingPrerequisite, isEventUpgradeAtMaxLevel } from '../utils/eventUpgrades';
import styles from './EventUpgradesPanel.module.css';

type FormatNumber = (num: number, decimalPlaces?: number) => string;

interface EventUpgradeItemProps {
  upgrade: EventUpgrade;
  /** Name of the upgrade to buy first, or null */
  missingPrerequisite: string | null;
  currency: EventCurrency;
  balance: number;
  onPurchase: (upgradeId: string) => unknown;
  formatNumber: FormatNumber;
}

const EventUpgradeItem: FC<EventUpgradeItemProps> = memo(({
  upgrade,
  missingPrerequisite,
  currency,
  balance,
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
        eventCurrency={balance}
        cost={getEventUpgradeCost(upgrade)}
        currencyType={currency}
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
  /** Currency the upgrades cost */
  currency: EventCurrency;
  /** How much of it the player has */
  balance: number;
  purchaseUpgrade: (upgradeId: string) => unknown;
  formatNumber: FormatNumber;
}

/** Upgrades for one tab of a seasonal event */
const EventUpgradesPanel: FC<EventUpgradesPanelProps> = memo(({
  title,
  category,
  upgrades,
  currency,
  balance,
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
              currency={currency}
              balance={balance}
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
