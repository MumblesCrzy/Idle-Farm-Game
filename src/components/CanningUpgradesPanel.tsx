/**
 * The Kitchen's canning upgrades, one compact row each: icon, name and level, what it does
 * now, and its next cost. Once bought, the Canner's row switches it on and off.
 */
import { memo, type FC } from 'react';
import type { CanningUpgrade, CanningState } from '../types/canning';
import { formatNumber } from '../utils/gameCalculations';
import {
  CANNING_QUICK_HANDS,
  CANNING_FAMILY_RECIPE,
  CANNING_HEIRLOOM_TOUCH,
  CANNING_BATCH_CANNING,
  CANNING_CANNER,
  UPGRADE_FERTILIZER
} from '../config/assetPaths';
import styles from './CanningUpgradesPanel.module.css';

interface CanningUpgradesPanelProps {
  upgrades: CanningUpgrade[];
  money: number;
  knowledge: number;
  onPurchaseUpgrade: (upgradeId: string) => boolean;
  canningState: CanningState;
  onToggleAutoCanning: () => void;
}

const ICONS: Record<string, string> = {
  canning_speed: CANNING_QUICK_HANDS,
  canning_efficiency: CANNING_FAMILY_RECIPE,
  preservation_mastery: CANNING_HEIRLOOM_TOUCH,
  simultaneous_processing: CANNING_BATCH_CANNING,
  canner: CANNING_CANNER
};

/** Max levels for saves made before upgrades carried one */
const KNOWN_MAX_LEVELS: Record<string, number> = {
  canning_speed: 18,
  simultaneous_processing: 15,
  canner: 1
};

/** What an upgrade does at its level */
const effectText = (upgrade: CanningUpgrade): string => {
  switch (upgrade.type) {
    case 'speed':
      return `Batches take ${(upgrade.effect * 100).toFixed(0)}% of the time`;
    case 'efficiency':
      return `Jars sell for +${((upgrade.effect - 1) * 100).toFixed(0)}%`;
    case 'quality':
      return `${upgrade.effect.toFixed(0)}% chance of a bonus jar`;
    case 'automation':
      return `${1 + upgrade.effect} batches at once`;
    default:
      return `Level ${upgrade.level}`;
  }
};

const CanningUpgradesPanel: FC<CanningUpgradesPanelProps> = memo(({
  upgrades,
  money,
  knowledge,
  onPurchaseUpgrade,
  canningState,
  onToggleAutoCanning
}) => (
  <section className={styles.panel} aria-labelledby="canning-upgrades-heading">
    <h2 id="canning-upgrades-heading" className={styles.title}>Upgrades</h2>
    {upgrades?.map(upgrade => {
      const icon = ICONS[upgrade.id] ?? UPGRADE_FERTILIZER;

      // Once bought, the Canner's row turns it on and off
      if (upgrade.id === 'canner' && upgrade.level > 0) {
        const on = canningState?.autoCanning?.enabled ?? false;
        return (
          <button
            key={upgrade.id}
            type="button"
            className={`${styles.upgrade} ${on ? styles.on : styles.off}`}
            onClick={onToggleAutoCanning}
            aria-pressed={on}
            title={`${on ? 'Turn off' : 'Turn on'} the Canner, which starts a batch every 10 seconds`}
          >
            <img src={icon} alt="" className={styles.icon} />
            <span className={styles.text}>
              <span className={styles.name}>Canner: {on ? 'On' : 'Off'}</span>
              <span className={styles.effect}>{on ? 'Starts a batch every 10s' : 'Click to turn on'}</span>
            </span>
          </button>
        );
      }

      const maxLevel = upgrade.maxLevel ?? KNOWN_MAX_LEVELS[upgrade.id];
      const maxed = maxLevel !== undefined && upgrade.level >= maxLevel;
      const affordable = upgrade.costCurrency === 'money' ? money >= upgrade.cost : knowledge >= upgrade.cost;
      const cost = upgrade.costCurrency === 'money' ? `$${formatNumber(upgrade.cost, 1)}` : `${formatNumber(upgrade.cost, 1)} Kn`;
      const level = maxLevel ? `${upgrade.level}/${maxLevel}` : String(upgrade.level);
      return (
        <button
          key={upgrade.id}
          type="button"
          className={`${styles.upgrade} ${maxed ? styles.maxed : affordable ? styles.affordable : ''}`}
          onClick={() => onPurchaseUpgrade(upgrade.id)}
          disabled={maxed || !affordable}
          title={`${upgrade.name}: ${upgrade.description}${maxed ? ' | Max level reached' : ''}`}
        >
          <img src={icon} alt="" className={styles.icon} />
          <span className={styles.text}>
            <span className={styles.name}>{upgrade.name} <span className={styles.level}>{level}</span></span>
            <span className={styles.effect}>{upgrade.id === 'canner' ? 'Starts a batch every 10s' : effectText(upgrade)}</span>
          </span>
          <span className={styles.cost}>{maxed ? 'Max' : cost}</span>
        </button>
      );
    })}
  </section>
));

CanningUpgradesPanel.displayName = 'CanningUpgradesPanel';

export default CanningUpgradesPanel;
