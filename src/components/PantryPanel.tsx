/**
 * The Kitchen's pantry: the raw crops and honey canning uses, with what's on hand. Crops a
 * recipe can't get any of show in red, so a stash Dunkin emptied is easy to spot. On the
 * Engineers' factory floor the same list is the hopper, in steel.
 */
import { memo, type FC } from 'react';
import { getVeggieImage, ICON_GOLDEN_HONEY, ICON_HONEY } from '../config/assetPaths';
import styles from './PantryPanel.module.css';

interface PantryPanelProps {
  /** Crops that recipes use, in farm order */
  crops: Array<{ name: string; stash: number }>;
  /** Shown once any honey recipe is open */
  showHoney: boolean;
  regularHoney?: number;
  goldenHoney?: number;
  formatNumber: (num: number, decimalPlaces?: number) => string;
  /** The heading: Pantry in the Kitchen, Hopper on the factory floor */
  title?: string;
  /** Steel, for the factory floor */
  hopper?: boolean;
}

const PantryPanel: FC<PantryPanelProps> = memo(({ crops, showHoney, regularHoney = 0, goldenHoney = 0, formatNumber, title = 'Pantry', hopper = false }) => (
  <section className={hopper ? `${styles.pantry} ${styles.hopper}` : styles.pantry} aria-labelledby="pantry-heading">
    <h2 id="pantry-heading" className={styles.title}>{title}</h2>
    <ul className={styles.list}>
      {crops.map(crop => (
        <li key={crop.name} className={`${styles.item} ${crop.stash < 1 ? styles.empty : ''}`}>
          <img src={getVeggieImage(crop.name)} alt="" className={styles.icon} />
          <span className={styles.name}>{crop.name}</span>
          <span className={styles.count}>{formatNumber(crop.stash)}</span>
        </li>
      ))}
    </ul>
    {showHoney && (
      <ul className={`${styles.list} ${styles.honey}`}>
        <li className={styles.item}>
          <img src={ICON_HONEY} alt="" className={styles.icon} />
          <span className={styles.name}>Honey</span>
          <span className={styles.count}>{formatNumber(regularHoney, 1)}</span>
        </li>
        <li className={styles.item}>
          <img src={ICON_GOLDEN_HONEY} alt="" className={styles.icon} />
          <span className={styles.name}>Golden Honey</span>
          <span className={styles.count}>{formatNumber(goldenHoney, 2)}</span>
        </li>
      </ul>
    )}
  </section>
));

PantryPanel.displayName = 'PantryPanel';

export default PantryPanel;
