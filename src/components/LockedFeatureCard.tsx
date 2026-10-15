import { memo, type FC, type ReactNode } from 'react';
import styles from './LockedFeatureCard.module.css';

interface LockedFeatureCardProps {
  /** Name used in the title and description, e.g. "Bee System" */
  featureName: string;
  /** Shown on both sides of the title */
  icon: ReactNode;
  currentTier: number;
  requiredTier: number;
  /** Heading above the list, e.g. "What Bees Offer:" */
  featuresTitle: string;
  /** Closing line below the list */
  hint: string;
  /** Color scheme of the tab the card sits in */
  theme: 'dark' | 'honey';
  /** The <li> items describing what the feature offers */
  children: ReactNode;
}

/** Card a tab shows in place of its content until the farm reaches the tab's unlock tier */
const LockedFeatureCard: FC<LockedFeatureCardProps> = memo(({
  featureName,
  icon,
  currentTier,
  requiredTier,
  featuresTitle,
  hint,
  theme,
  children
}) => (
  <div className={`${styles.message} ${styles[theme]}`}>
    <div className={styles.card}>
      <h2 className={styles.title}>
        {icon} {featureName} Locked {icon}
      </h2>
      <p className={styles.description}>
        The {featureName} becomes available when you reach <strong>Farm Tier {requiredTier}</strong>.
      </p>
      <p className={styles.details}>
        <strong>Current Tier:</strong> {currentTier}
      </p>
      <p className={styles.details}>
        <strong>Required Tier:</strong> {requiredTier}
      </p>
      <div className={styles.features}>
        <h3>{featuresTitle}</h3>
        <ul>{children}</ul>
      </div>
      <p className={styles.hint}>
        {hint}
      </p>
    </div>
  </div>
));

LockedFeatureCard.displayName = 'LockedFeatureCard';

export default LockedFeatureCard;
