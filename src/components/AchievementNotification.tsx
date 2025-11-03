import React, { useEffect } from 'react';
import type { Achievement } from '../types/achievements';

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
    <div style={{
      position: 'fixed',
      top: '80px',
      right: '20px',
      backgroundColor: '#fff',
      border: '3px solid #ffc107',
      borderRadius: '12px',
      padding: '16px',
      minWidth: '300px',
      maxWidth: '400px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      zIndex: 2000,
      animation: 'slideIn 0.3s ease-out'
    }}>
      <style>
        {`
          @keyframes slideIn {
            from {
              transform: translateX(120%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}
      </style>
      
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <div style={{
          backgroundColor: '#ffc107',
          borderRadius: '50%',
          padding: '8px',
          marginRight: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <span style={{ fontSize: '24px' }}>🏆</span>
        </div>
        
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '12px',
            fontWeight: 'bold',
            color: '#ffc107',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '4px'
          }}>
            Achievement Unlocked!
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <img
              src={achievement.icon}
              alt={achievement.name}
              style={{
                width: '24px',
                height: '24px',
                marginRight: '8px'
              }}
            />
            <h3 style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#333'
            }}>
              {achievement.name}
            </h3>
          </div>
          
          <p style={{
            margin: '0 0 8px 0',
            fontSize: '13px',
            color: '#666',
            lineHeight: '1.4'
          }}>
            {achievement.description}
          </p>
          
          {achievement.reward && achievement.reward.message && (
            <div style={{
              backgroundColor: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '6px',
              padding: '8px',
              fontSize: '12px',
              color: '#856404',
              fontWeight: '500'
            }}>
              {achievement.reward.message}
            </div>
          )}
        </div>
        
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '18px',
            color: '#999',
            cursor: 'pointer',
            padding: '0',
            marginLeft: '8px',
            lineHeight: '1'
          }}
          title="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default AchievementNotification;
