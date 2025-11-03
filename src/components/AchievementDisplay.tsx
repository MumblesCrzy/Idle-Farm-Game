import React from 'react';
import type { Achievement } from '../types/achievements';

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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '800px',
        width: '90%',
        maxHeight: '85vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, color: '#333', fontSize: '24px' }}>🏆 Achievements</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#666' }}>
              {totalUnlocked} of {totalAchievements} unlocked ({Math.round((totalUnlocked / totalAchievements) * 100)}%)
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: '#dc3545',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            Close
          </button>
        </div>

        {/* Progress Bar */}
        <div style={{
          width: '100%',
          height: '8px',
          backgroundColor: '#e0e0e0',
          borderRadius: '4px',
          overflow: 'hidden',
          marginBottom: '20px'
        }}>
          <div style={{
            width: `${(totalUnlocked / totalAchievements) * 100}%`,
            height: '100%',
            backgroundColor: '#4caf50',
            transition: 'width 0.3s ease'
          }} />
        </div>

        {/* Achievements List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingRight: '8px'
        }}>
          {categories.map(category => {
            const categoryAchievements = achievementsByCategory[category.key]?.filter(a => !a.hidden || a.unlocked) || [];
            if (categoryAchievements.length === 0) return null;

            return (
              <div key={category.key} style={{ marginBottom: '24px' }}>
                <h3 style={{
                  color: category.color,
                  fontSize: '16px',
                  fontWeight: 'bold',
                  marginBottom: '12px',
                  borderBottom: `2px solid ${category.color}`,
                  paddingBottom: '4px'
                }}>
                  {category.label}
                </h3>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '12px'
                }}>
                  {categoryAchievements.map(achievement => (
                    <div
                      key={achievement.id}
                      style={{
                        backgroundColor: achievement.unlocked ? '#f0f8ff' : '#f5f5f5',
                        border: achievement.unlocked ? `2px solid ${category.color}` : '2px solid #ddd',
                        borderRadius: '8px',
                        padding: '12px',
                        opacity: achievement.unlocked ? 1 : 0.6,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                        <img
                          src={achievement.icon}
                          alt={achievement.name}
                          style={{
                            width: '32px',
                            height: '32px',
                            marginRight: '8px',
                            filter: achievement.unlocked ? 'none' : 'grayscale(100%)'
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <h4 style={{
                            margin: 0,
                            fontSize: '14px',
                            fontWeight: 'bold',
                            color: achievement.unlocked ? '#333' : '#666'
                          }}>
                            {achievement.name}
                          </h4>
                          {achievement.unlocked && achievement.unlockedAt && (
                            <p style={{
                              margin: '2px 0 0 0',
                              fontSize: '10px',
                              color: '#999'
                            }}>
                              {new Date(achievement.unlockedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <p style={{
                        margin: 0,
                        fontSize: '12px',
                        color: achievement.unlocked ? '#555' : '#888',
                        lineHeight: '1.4'
                      }}>
                        {achievement.description}
                      </p>
                      
                      {achievement.reward && (
                        <div style={{
                          marginTop: '8px',
                          padding: '6px',
                          backgroundColor: achievement.unlocked ? '#e8f5e9' : '#f9f9f9',
                          borderRadius: '4px',
                          fontSize: '11px',
                          color: '#2e7d32'
                        }}>
                          <strong>Reward:</strong>{' '}
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
