import React, { memo } from 'react';
import { ICON_TROPHY, ICON_SCROLL } from '../config/assetPaths';
import styles from './HeaderBar.module.css';

interface HeaderBarProps {
  setShowInfoOverlay: (show: boolean) => void;
  setShowSettingsOverlay: (show: boolean) => void;
  setShowAchievements: (show: boolean) => void;
  setShowEventLog: (show: boolean) => void;
  totalAchievements?: number;
  unlockedAchievements?: number;
  unreadEventCount?: number;
}

const HeaderBar: React.FC<HeaderBarProps> = memo(({
  setShowInfoOverlay,
  setShowSettingsOverlay,
  setShowAchievements,
  setShowEventLog,
  totalAchievements = 0,
  unlockedAchievements = 0,
  unreadEventCount = 0
}) => {
  return (
    <>
      {/* Info and Settings Buttons */}
      <div className={styles.header}>
        <button
          onClick={() => setShowInfoOverlay(true)}
          className={styles.button}
          title="Info - Game Help"
          aria-label="Open game help and information"
        >
          Info
        </button>
        <button
          onClick={() => setShowAchievements(true)}
          className={styles.achievementsButton}
          title={`Achievements: ${unlockedAchievements}/${totalAchievements} unlocked`}
          aria-label={`View achievements. ${unlockedAchievements} of ${totalAchievements} unlocked`}
        >
          <img src={ICON_TROPHY} alt="" style={{ width: '18px', height: '18px', verticalAlign: 'middle', marginRight: '4px' }} />
          {unlockedAchievements}/{totalAchievements}
        </button>
        <button
          onClick={() => setShowEventLog(true)}
          className={styles.eventLogButton}
          title={unreadEventCount > 0 ? `Event Log (${unreadEventCount} new)` : "Event Log"}
          aria-label={unreadEventCount > 0 ? `Open event log. ${unreadEventCount} unread events` : "Open event log"}
        >
          <img src={ICON_SCROLL} alt="" style={{ width: '18px', height: '18px', verticalAlign: 'middle', marginRight: '4px' }} />
          Log{unreadEventCount > 0 && <span className={styles.badge}>{unreadEventCount}</span>}
        </button>
        <button
          onClick={() => setShowSettingsOverlay(true)}
          className={styles.settingsButton}
          title="Settings"
          aria-label="Open settings menu for save management and sound options"
        >
          Settings
        </button>
      </div>
    </>
  );
});

HeaderBar.displayName = 'HeaderBar';

export default HeaderBar;
