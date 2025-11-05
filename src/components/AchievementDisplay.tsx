import React from 'react';
import type { Achievement } from '../types/achievements';
import { useFocusTrap } from '../hooks/useFocusTrap';
import styles from './AchievementDisplay.module.css';

interface AchievementDisplayProps {
  visible: boolean;
  onClose: () => void;
  achievements: Achievement[];
  totalUnlocked: number;
}

const AchievementDisplay: React.FC<AchievementDisplayProps> = ({
  visible,
  onClose,
  achievements,
  totalUnlocked
}) => {
  const { containerRef, handleTabKey } = useFocusTrap(visible, onClose);
  
  if (!visible) return null;

  // Group achievements by category
  const achievementsByCategory = achievements.reduce((acc, ach) => {
    if (!acc[ach.category]) {
      acc[ach.category] = [];
    }
    acc[ach.category].push(ach);
    return acc;
  }, {} as Record<string, Achievement[]>);

  const categories = [
    { key: 'farming', label: 'Farming', color: '#4caf50' },
    { key: 'canning', label: 'Canning', color: '#ff8503' },
    { key: 'progression', label: 'Progression', color: '#2196f3' },
    { key: 'wealth', label: 'Wealth', color: '#ffc107' },
    { key: 'special', label: 'Special', color: '#9c27b0' }
  ];

  const totalAchievements = achievements.length;

  return (
    <div className={styles.overlay}>
      <div 
        className={styles.modal}
        ref={containerRef}
        onKeyDown={handleTabKey}
        role="dialog"
        aria-modal="true"
        aria-labelledby="achievements-modal-title"
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleContainer}>
            <h2 id="achievements-modal-title" className={styles.title}>🏆 Achievements</h2>
            <p className={styles.stats} aria-live="polite">
              {totalUnlocked} of {totalAchievements} unlocked ({Math.round((totalUnlocked / totalAchievements) * 100)}%)
            </p>
          </div>
          <button
            onClick={onClose}
            className={styles.closeButton}
            aria-label={`Close achievements modal (press Escape). ${totalUnlocked} of ${totalAchievements} achievements unlocked`}
          >
            Close
          </button>
        </div>

        {/* Progress Bar */}
        <div className={styles.progressBarContainer}>
          <div 
            className={styles.progressBar}
            style={{
              width: `${(totalUnlocked / totalAchievements) * 100}%`
            }}
            role="progressbar"
            aria-valuenow={totalUnlocked}
            aria-valuemin={0}
            aria-valuemax={totalAchievements}
            aria-label={`Achievement progress: ${totalUnlocked} out of ${totalAchievements} completed`}
          />
        </div>

        {/* Achievements List */}
        <div className={styles.content}>
          {categories.map(category => {
            const categoryAchievements = achievementsByCategory[category.key]?.filter(a => !a.hidden || a.unlocked) || [];
            if (categoryAchievements.length === 0) return null;

            return (
              <div key={category.key} className={styles.categorySection}>
                <h3 
                  className={styles.categoryTitle}
                  style={{
                    color: category.color,
                    borderBottom: `2px solid ${category.color}`
                  }}
                >
                  {category.label}
                </h3>
                
                <div className={styles.achievementsGrid} role="list" aria-label={`${category.label} achievements`}>
                  {categoryAchievements.map(achievement => (
                    <div
                      key={achievement.id}
                      className={`${styles.achievementCard} ${achievement.unlocked ? styles.unlocked : ''}`}
                      style={{
                        border: achievement.unlocked ? `2px solid ${category.color}` : undefined
                      }}
                      role="listitem"
                      aria-label={`${achievement.name}. ${achievement.unlocked ? 'Unlocked' : 'Locked'}. ${achievement.description}`}
                    >
                      <div className={styles.achievementHeader}>
                        <img
                          src={achievement.icon}
                          alt=""
                          className={styles.achievementIcon}
                          style={{
                            filter: achievement.unlocked ? 'none' : 'grayscale(100%)'
                          }}
                          aria-hidden="true"
                        />
                        <div className={styles.achievementTitleContainer}>
                          <h4 className={`${styles.achievementTitle} ${achievement.unlocked ? styles.unlocked : ''}`}>
                            {achievement.name}
                            {achievement.unlocked && <span className="sr-only"> (Unlocked)</span>}
                          </h4>
                          {achievement.unlocked && achievement.unlockedAt && (
                            <p className={styles.achievementDate}>
                              {new Date(achievement.unlockedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <p className={styles.achievementDescription}>
                        {achievement.description}
                      </p>
                      
                      {achievement.reward && (
                        <div className={styles.achievementRewards}>
                          <span className={styles.achievementRewardLabel}>Reward:</span>{' '}
                          {achievement.reward.money && `$${achievement.reward.money.toLocaleString()}`}
                          {achievement.reward.money && achievement.reward.knowledge && ' + '}
                          {achievement.reward.knowledge && `${achievement.reward.knowledge} Knowledge`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AchievementDisplay;
