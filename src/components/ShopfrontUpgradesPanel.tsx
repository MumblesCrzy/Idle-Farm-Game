import React from 'react';
import { DECORATION_WREATH, ICON_HOLIDAY_CHEER, TREE_DECORATED } from '../config/assetPaths';
import styles from './ShopfrontUpgradesPanel.module.css';

interface ShopfrontUpgradesPanelProps {
  upgrades: {
    shopfrontUnlocked: boolean;
    garlandBorders: boolean;
    wreathSign: boolean;
    goldenBellCounter: boolean;
    magicalRegister: boolean;
    fireplaceDisplay: boolean;
  };
  holidayCheer: number;
  purchaseUpgrade: (upgradeId: string) => void;
}

interface UpgradeCardData {
  id: string;
  name: string;
  description: string;
  title: string;
  cost: number;
  icon: string;
  unlocked: boolean;
  requiresOtherUpgrade?: string;
}

const ShopfrontUpgradesPanel: React.FC<ShopfrontUpgradesPanelProps> = ({
  upgrades,
  holidayCheer,
  purchaseUpgrade,
}) => {
  const upgradeCards: UpgradeCardData[] = [
    {
      id: 'garland_borders',
      name: 'Garland Borders',
      description: '+10% Holiday Cheer from all tree sales.',
      title: 'Festive garlands around the shop entrance attract more customers!',
      cost: 500,
      icon: 'tree',
      unlocked: upgrades.garlandBorders,
      requiresOtherUpgrade: 'shopfrontUnlocked',
    },
    {
      id: 'wreath_sign',
      name: 'Wreath Sign',
      description: 'Unlock daily customer bonuses!',
      title: 'A beautiful wreath sign invites special customers each day.',
      cost: 1000,
      icon: 'wreath',
      unlocked: upgrades.wreathSign,
      requiresOtherUpgrade: 'shopfrontUnlocked',
    },
    {
      id: 'golden_bell_counter',
      name: 'Golden Bell Counter',
      description: 'Passive Holiday Cheer income!',
      title: 'The cheerful bell sound draws customers even while you\'re away (+1 Cheer/sec).',
      cost: 1800,
      icon: '🔔',
      unlocked: upgrades.goldenBellCounter,
      requiresOtherUpgrade: 'wreathSign',
    },
    {
      id: 'magical_register',
      name: 'Magical Register',
      description: 'Customers occasionally leave generous tips!',
      title:  'Random bonus Cheer from sales (5-25% extra).',
      cost: 2500,
      icon: '💰',
      unlocked: upgrades.magicalRegister,
      requiresOtherUpgrade: 'goldenBellCounter',
    },
    {
      id: 'fireplace_display',
      name: 'Fireplace Display',
      description: '+50% value for Luxury trees!',
      title: 'A cozy fireplace showcases your premium trees beautifully.',
      cost: 3500,
      icon: '🔥',
      unlocked: upgrades.fireplaceDisplay,
      requiresOtherUpgrade: 'goldenBellCounter',
    },
  ];

  const canAfford = (cost: number) => holidayCheer >= cost;

  const canPurchase = (upgrade: UpgradeCardData) => {
    if (upgrade.unlocked) return false;
    if (!canAfford(upgrade.cost)) return false;
    if (upgrade.requiresOtherUpgrade) {
      const requiredUpgradeUnlocked = upgrades[upgrade.requiresOtherUpgrade as keyof typeof upgrades];
      if (!requiredUpgradeUnlocked) return false;
    }
    return true;
  };

  const isLocked = (upgrade: UpgradeCardData) => {
    if (upgrade.unlocked) return false;
    if (upgrade.requiresOtherUpgrade) {
      const requiredUpgradeUnlocked = upgrades[upgrade.requiresOtherUpgrade as keyof typeof upgrades];
      if (!requiredUpgradeUnlocked) return true;
    }
    return false;
  };

  return (
    <div className={styles.upgradesPanel}>
      <h3 className={styles.title}>🏠 Shopfront Upgrades</h3>
      <div className={styles.upgradesGrid}>
        {upgradeCards.map((upgrade) => (
          <div
            key={upgrade.id}
            className={`${styles.upgradeCard} ${
              upgrade.unlocked ? styles.purchased : ''
            } ${isLocked(upgrade) ? styles.locked : ''}`}
          >
            <div className={styles.upgradeIcon}>
              {upgrade.icon === 'tree' ? (
                <img src={TREE_DECORATED} alt="Decorated Tree" className={styles.iconImage} />
              ) : upgrade.icon === 'wreath' ? (
                <img src={DECORATION_WREATH} alt="Wreath" className={styles.iconImage} />
              ) : (
                upgrade.icon
              )}
            </div>
            <div className={styles.upgradeInfo}>
              <div className={styles.upgradeName}>{upgrade.name}</div>
              <div className={styles.upgradeDescription}>{upgrade.description}</div>
              {!upgrade.unlocked && (
                <div className={styles.upgradeFooter}>
                  <div className={styles.upgradeCost}>
                    {upgrade.cost > 0 ? (
                      <>
                        <span className={styles.cheerIcon}>
                          <img src={ICON_HOLIDAY_CHEER} alt="Holiday Cheer" style={{ width: 20, height: 20 }} />
                        </span>
                        <span className={canAfford(upgrade.cost) ? styles.canAfford : styles.cannotAfford}>
                          {upgrade.cost} Holiday Cheer
                        </span>
                      </>
                    ) : (
                      <span className={styles.free}>Free!</span>
                    )}
                  </div>
                  <button
                    className={styles.purchaseButton}
                    onClick={() => purchaseUpgrade(upgrade.id)}
                    disabled={!canPurchase(upgrade)}
                  >
                    {isLocked(upgrade) ? '🔒 Locked' : upgrade.unlocked ? '✓ Owned' : 'Purchase'}
                  </button>
                </div>
              )}
              {upgrade.unlocked && (
                <div className={styles.ownedBadge}>✓ Owned</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShopfrontUpgradesPanel;
