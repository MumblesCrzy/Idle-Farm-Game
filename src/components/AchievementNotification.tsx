import React, { useEffect } from 'react';
import type { Achievement } from '../types/achievements';
import styles from './AchievementNotification.module.css';

interface AchievementNotificationProps {
  achievement: Achievement | null;
  onClose: () => void;
}

const AchievementNotification: React.FC<AchievementNotificationProps> = ({
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
          <span className={styles.icon}>🏆</span>
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
};

export default AchievementNotification;
