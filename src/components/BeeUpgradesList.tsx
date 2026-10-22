/**
 * The bee upgrades, grouped by what they improve: speed, honey a batch, Golden Honey, crops
 * and winter. Each row says what the upgrade does now and next, and its button what it costs;
 * one that can't be bought yet says what it needs. Rows keep one height.
 */
import { memo, type FC } from 'react';
import type { BeeUpgradeRow, BeeUpgradeGroupId } from '../utils/beeView';
import { ICON_GOLDEN_HONEY, ICON_HONEY, ICON_LOCK } from '../config/assetPaths';
import styles from './BeeUpgradesList.module.css';

interface BeeUpgradesListProps {
  groups: Array<{ id: BeeUpgradeGroupId; title: string; rows: BeeUpgradeRow[] }>;
  onPurchase: (upgradeId: string) => void;
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

interface RowProps {
  row: BeeUpgradeRow;
  onPurchase: (upgradeId: string) => void;
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

const UpgradeRow: FC<RowProps> = ({ row, onPurchase, formatNumber }) => {
  const { upgrade, effect, state, lockReason } = row;
  const golden = upgrade.costCurrency === 'goldenHoney';
  const cost = formatNumber(upgrade.cost, 1);
  const quiet = state === 'owned' || state === 'max' || state === 'locked';

  let action;
  if (state === 'owned') action = <span className={styles.status}>Owned</span>;
  else if (state === 'max') action = <span className={styles.status}>Max</span>;
  else if (state === 'locked') {
    action = <span className={styles.lock}><img src={ICON_LOCK} alt="" />{lockReason}</span>;
  } else {
    const afford = state === 'afford';
    action = (
      <button
        type="button"
        className={!afford ? styles.buyShort : golden ? styles.buyGold : styles.buy}
        onClick={() => onPurchase(upgrade.id)}
        disabled={!afford}
        aria-label={`Buy ${upgrade.name}${upgrade.repeatable ? ` level ${upgrade.level + 1}` : ''} for ${cost} ${golden ? 'Golden Honey' : 'honey'}`}
      >
        <img src={golden ? ICON_GOLDEN_HONEY : ICON_HONEY} alt="" />{cost}
      </button>
    );
  }

  return (
    <div className={quiet ? `${styles.row} ${styles.quiet}` : styles.row} title={upgrade.description}>
      <img src={upgrade.icon} alt="" className={styles.icon} />
      <div className={styles.info}>
        <div className={styles.name}>
          {upgrade.name}
          {upgrade.repeatable && <span className={styles.level}>Lv {upgrade.level}</span>}
        </div>
        <div className={styles.effect}>{effect}</div>
      </div>
      {action}
    </div>
  );
};

const BeeUpgradesList: FC<BeeUpgradesListProps> = memo(({ groups, onPurchase, formatNumber }) => (
  <section className={styles.panel} aria-labelledby="bee-upgrades-title">
    <h2 id="bee-upgrades-title" className={styles.title}>Upgrades</h2>
    {groups.map(group => (
      <div key={group.id} className={styles.group} role="group" aria-labelledby={`bee-upgrades-${group.id}`}>
        <h3 id={`bee-upgrades-${group.id}`} className={styles.groupTitle}>{group.title}</h3>
        {group.rows.map(row => (
          <UpgradeRow key={row.upgrade.id} row={row} onPurchase={onPurchase} formatNumber={formatNumber} />
        ))}
      </div>
    ))}
  </section>
));

BeeUpgradesList.displayName = 'BeeUpgradesList';

export default BeeUpgradesList;
