import { useEffect, memo, type FC } from 'react';
import type { Achievement } from '../types/achievements';
import { ICON_TROPHY } from '../config/assetPaths';
import styles from './AchievementNotification.module.css';

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
              alt={achievement.name}
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
        >
          ×
        </button>
      </div>
    </div>
  );
});

AchievementNotification.displayName = 'AchievementNotification';

export default AchievementNotification;
