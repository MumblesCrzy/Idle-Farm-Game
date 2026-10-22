import { useEffect, memo, type FC } from 'react';
import type { Achievement } from '../types/achievements';
import { ICON_TROPHY } from '../config/assetPaths';
import { announce } from '../utils/announcer';
import styles from './AchievementNotification.module.css';

/** What a screen reader says for an unlock: its name, what it took and its reward */
const announcement = (achievement: Achievement): string =>
  [`Achievement unlocked: ${achievement.name}`, achievement.description, achievement.reward?.message]
    .filter((part): part is string => Boolean(part))
    .map(part => (/[.!?]$/.test(part) ? part : `${part}.`))
    .join(' ');

interface AchievementNotificationProps {
  achievement: Achievement | null;
  onClose: () => void;
}

const AchievementNotification: FC<AchievementNotificationProps> = memo(({
  achievement,
  onClose
}) => {
  useEffect(() => {
    if (achievement) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000); // Auto-dismiss after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [achievement, onClose]);

  // Screen readers hear the unlock; the card shows for only 5 seconds
  useEffect(() => {
    if (achievement) announce(announcement(achievement));
  }, [achievement]);

  if (!achievement) return null;

  return (
    <div className={styles.notification}>
      <div className={styles.content}>
        <div className={styles.iconContainer}>
          <img src={ICON_TROPHY} alt="" className={styles.icon} />
        </div>
        
        <div className={styles.textContainer}>
          <div className={styles.badge}>
            Achievement Unlocked!
          </div>
          
          <div className={styles.titleContainer}>
            <img
              src={achievement.icon}
              alt=""
              className={styles.achievementIcon}
            />
            <h3 className={styles.title}>
              {achievement.name}
            </h3>
          </div>
          
          <p className={styles.description}>
            {achievement.description}
          </p>
          
          {achievement.reward && achievement.reward.message && (
            <div className={styles.rewards}>
              {achievement.reward.message}
            </div>
          )}
        </div>
        
        <button
          onClick={onClose}
          className={styles.closeButton}
          title="Dismiss"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
});

AchievementNotification.displayName = 'AchievementNotification';

export default AchievementNotification;
