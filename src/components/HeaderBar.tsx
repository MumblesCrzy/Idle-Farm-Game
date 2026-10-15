import InlineIcon from './InlineIcon';
import { memo, type FC } from 'react';
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
  isPaused?: boolean;
  onTogglePause?: () => void;
}

const HeaderBar: FC<HeaderBarProps> = memo(({
  setShowInfoOverlay,
  setShowSettingsOverlay,
  setShowAchievements,
  setShowEventLog,
  totalAchievements = 0,
  unlockedAchievements = 0,
  unreadEventCount = 0,
  isPaused = false,
  onTogglePause
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
        {onTogglePause && (
          <button
            onClick={onTogglePause}
            className={isPaused ? styles.pauseButtonActive : styles.pauseButton}
            title={isPaused ? 'Resume game' : 'Pause game'}
            aria-label={isPaused ? 'Resume game' : 'Pause game'}
            aria-pressed={isPaused}
          >
            {isPaused ? '▶ Play' : '⏸ Pause'}
          </button>
        )}
        <button
          onClick={() => setShowAchievements(true)}
          className={styles.achievementsButton}
          title={`Achievements: ${unlockedAchievements}/${totalAchievements} unlocked`}
          aria-label={`View achievements. ${unlockedAchievements} of ${totalAchievements} unlocked`}
        >
          <InlineIcon src={ICON_TROPHY} size={18} gap={4} />
          {unlockedAchievements}/{totalAchievements}
        </button>
        <button
          onClick={() => setShowEventLog(true)}
          className={styles.eventLogButton}
          title={unreadEventCount > 0 ? `Event Log (${unreadEventCount} new)` : "Event Log"}
          aria-label={unreadEventCount > 0 ? `Open event log. ${unreadEventCount} unread events` : "Open event log"}
        >
          <InlineIcon src={ICON_SCROLL} size={18} gap={4} />
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
