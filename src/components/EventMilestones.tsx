import { memo, type FC, type ReactNode } from 'react';
import ProgressBar from './ProgressBar';
import styles from './EventMilestones.module.css';

type FormatNumber = (num: number, decimalPlaces?: number) => string;

/** One sales milestone, in the form both seasonal events share */
export interface EventMilestoneView {
  id: string;
  name: string;
  description: string;
  /** Items sold to reach it */
  requirement: number;
  claimed: boolean;
  /** Currency paid when claimed */
  rewardAmount: number;
  /** The reward in words, for screen readers */
  rewardDescription: string;
}

interface MilestoneItemProps {
  milestone: EventMilestoneView;
  sold: number;
  currencyIcon: ReactNode;
  progressColor: string;
  onClaim: (milestoneId: string) => unknown;
  formatNumber: FormatNumber;
}

const MilestoneItem: FC<MilestoneItemProps> = memo(({ milestone, sold, currencyIcon, progressColor, onClaim, formatNumber }) => {
  const progress = Math.min(sold, milestone.requirement);
  const reached = sold >= milestone.requirement;
  const itemClass = milestone.claimed
    ? `${styles.milestone} ${styles.claimed}`
    : reached
      ? `${styles.milestone} ${styles.reached}`
      : styles.milestone;

  return (
    <li className={itemClass}>
      <div className={styles.header}>
        <span className={styles.name}>{milestone.name}</span>
        <span className={styles.reward}>
          {formatNumber(milestone.rewardAmount, 1)} {currencyIcon}
        </span>
      </div>
      <div className={styles.description}>{milestone.description}</div>
      <ProgressBar value={progress} max={milestone.requirement} color={progressColor} height={8} />
      <div className={styles.footer}>
        <span className={styles.progress}>
          {formatNumber(progress, 1)} / {formatNumber(milestone.requirement, 1)} sold
        </span>
        {milestone.claimed ? (
          <span className={styles.claimedBadge}>Claimed</span>
        ) : reached ? (
          <button
            type="button"
            className={styles.claimButton}
            onClick={() => onClaim(milestone.id)}
            aria-label={`Claim ${milestone.name} reward: ${milestone.rewardDescription}`}
          >
            Claim
          </button>
        ) : null}
      </div>
    </li>
  );
});

MilestoneItem.displayName = 'MilestoneItem';

interface EventMilestonesProps {
  milestones: EventMilestoneView[];
  /** Items sold so far */
  sold: number;
  /** Label for the count, such as "Pumpkins sold" */
  soldLabel: string;
  /** Shown after each reward amount */
  currencyIcon: ReactNode;
  /** Shown before the title */
  titleIcon?: ReactNode;
  theme: 'autumn' | 'christmas';
  onClaim: (milestoneId: string) => unknown;
  formatNumber: FormatNumber;
}

const PROGRESS_COLORS = { autumn: '#E8711A', christmas: '#175034' } as const;

/** Sales milestones with claimable rewards, for a seasonal event's shop */
const EventMilestones: FC<EventMilestonesProps> = memo(({
  milestones,
  sold,
  soldLabel,
  currencyIcon,
  titleIcon,
  theme,
  onClaim,
  formatNumber
}) => (
  <section className={`${styles.milestones} ${styles[theme]}`} aria-label="Sales milestones">
    <h3 className={styles.title}>
      {titleIcon}
      Sales Milestones
    </h3>
    <p className={styles.summary}>{soldLabel}: {formatNumber(sold, 1)}</p>
    <ul className={styles.list}>
      {milestones.map(milestone => (
        <MilestoneItem
          key={milestone.id}
          milestone={milestone}
          sold={sold}
          currencyIcon={currencyIcon}
          progressColor={PROGRESS_COLORS[theme]}
          onClaim={onClaim}
          formatNumber={formatNumber}
        />
      ))}
    </ul>
  </section>
));

EventMilestones.displayName = 'EventMilestones';

export default EventMilestones;
