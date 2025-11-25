import React, { useState, useEffect } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import styles from './SettingsOverlay.module.css';

interface SettingsOverlayProps {
  visible: boolean;
  onClose: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  archieAppearance: 'default' | 'reindeer' | 'sweater' | 'pinecones';
  setArchieAppearance: (appearance: 'default' | 'reindeer' | 'sweater' | 'pinecones') => void;
  unlockedAchievements: string[]; // Array of unlocked achievement IDs
  handleExportSave: () => void;
  handleImportSave: () => void;
  handleResetGame: () => void;
}

const SettingsOverlay: React.FC<SettingsOverlayProps> = ({
  visible,
  onClose,
  soundEnabled,
  setSoundEnabled,
  archieAppearance,
  setArchieAppearance,
  unlockedAchievements,
  handleExportSave,
  handleImportSave,
  handleResetGame
}) => {
  const { containerRef, handleTabKey } = useFocusTrap(visible, onClose);
  const [itchViewport, setItchViewport] = useState(false);
  
  // Check for itch viewport mode on mount
  useEffect(() => {
    setItchViewport(document.body.classList.contains('itch-viewport'));
  }, [visible]);
  
  const toggleItchViewport = () => {
    const newValue = !itchViewport;
    setItchViewport(newValue);
    
    if (newValue) {
      document.body.classList.add('itch-viewport');
    } else {
      document.body.classList.remove('itch-viewport');
    }
  };
  
  if (!visible) return null;

  return (
    <div className={styles.overlay}>
      <div 
        className={styles.modal}
        ref={containerRef}
        onKeyDown={handleTabKey}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
      >
        <div className={styles.header}>
          <h3 id="settings-modal-title" className={styles.title}>Settings</h3>
          <button
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close settings modal (press Escape)"
          >
            Close
          </button>
        </div>
        
        <div className={styles.sections}>
          <div>
            <h4 className={styles.sectionTitle}>Save Management</h4>
            <div className={styles.buttonGroup}>
              <button
                onClick={handleExportSave}
                className={styles.exportButton}
                aria-label="Export save file to download as JSON"
              >
                Export Save
              </button>
              <button
                onClick={handleImportSave}
                className={styles.importButton}
                aria-label="Import save file from JSON"
              >
                Import Save
              </button>
            </div>
          </div>
          
          <div>
            <h4 className={styles.sectionTitle}>Sound Settings</h4>
            <div className={styles.soundSettings}>
              <label className={styles.soundLabel}>Sound Effects:</label>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`${styles.soundButton} ${soundEnabled ? styles.soundButtonOn : styles.soundButtonOff}`}
                aria-label={soundEnabled ? 'Sound effects enabled. Click to disable' : 'Sound effects disabled. Click to enable'}
                aria-pressed={soundEnabled}
              >
                {soundEnabled ? '🔊 ON' : '🔇 OFF'}
              </button>
            </div>
          </div>
          
          <div>
            <h4 className={styles.sectionTitle}>Archie Appearance</h4>
            <div className={styles.appearanceSettings}>
              <label className={styles.soundLabel}>Choose Archie's look:</label>
              <div className={styles.appearanceButtons}>
                <button
                  onClick={() => setArchieAppearance('default')}
                  className={`${styles.appearanceButton} ${archieAppearance === 'default' ? styles.appearanceButtonActive : ''}`}
                  aria-label="Default Archie appearance"
                  aria-pressed={archieAppearance === 'default'}
                >
                  🐕 Default
                </button>
                <button
                  onClick={() => setArchieAppearance('pinecones')}
                  className={`${styles.appearanceButton} ${archieAppearance === 'pinecones' ? styles.appearanceButtonActive : ''}`}
                  aria-label="Archie with pinecones"
                  aria-pressed={archieAppearance === 'pinecones'}
                >
                  🌲 Pinecones
                </button>
                <button
                  onClick={() => setArchieAppearance('sweater')}
                  className={`${styles.appearanceButton} ${archieAppearance === 'sweater' ? styles.appearanceButtonActive : ''} ${!unlockedAchievements.includes('winter_sweater') ? styles.appearanceButtonLocked : ''}`}
                  aria-label={unlockedAchievements.includes('winter_sweater') ? "Archie's winter sweater" : "Locked: Unlock 'Archie's Winter Sweater' achievement"}
                  aria-pressed={archieAppearance === 'sweater'}
                  disabled={!unlockedAchievements.includes('winter_sweater')}
                  title={!unlockedAchievements.includes('winter_sweater') ? "Unlock 'Archie's Winter Sweater' achievement to use this appearance" : ''}
                >
                  🧥 Sweater {!unlockedAchievements.includes('winter_sweater') && '🔒'}
                </button>
                <button
                  onClick={() => setArchieAppearance('reindeer')}
                  className={`${styles.appearanceButton} ${archieAppearance === 'reindeer' ? styles.appearanceButtonActive : ''} ${!unlockedAchievements.includes('reindeer_hat') ? styles.appearanceButtonLocked : ''}`}
                  aria-label={unlockedAchievements.includes('reindeer_hat') ? "Archie's reindeer hat" : "Locked: Unlock 'Archie's Reindeer Hat' achievement"}
                  aria-pressed={archieAppearance === 'reindeer'}
                  disabled={!unlockedAchievements.includes('reindeer_hat')}
                  title={!unlockedAchievements.includes('reindeer_hat') ? "Unlock 'Archie's Reindeer Hat' achievement to use this appearance" : ''}
                >
                  🦌 Reindeer {!unlockedAchievements.includes('reindeer_hat') && '🔒'}
                </button>
              </div>
            </div>
          </div>
          
          {import.meta.env.DEV && (
            <div>
              <h4 className={styles.sectionTitle}>Developer Tools</h4>
              <div className={styles.soundSettings}>
                <label className={styles.soundLabel}>Itch.io Viewport (1600×1000):</label>
                <button
                  onClick={toggleItchViewport}
                  className={`${styles.soundButton} ${itchViewport ? styles.soundButtonOn : styles.soundButtonOff}`}
                  aria-label={itchViewport ? 'Itch.io viewport enabled. Click to disable' : 'Itch.io viewport disabled. Click to enable'}
                  aria-pressed={itchViewport}
                >
                  {itchViewport ? '📐 ON' : '📐 OFF'}
                </button>
              </div>
            </div>
          )}
          
          <div>
            <h4 className={styles.sectionTitle}>Game Actions</h4>
            <div className={styles.buttonGroup}>
              <button
                onClick={() => {
                  onClose();
                  handleResetGame();
                }}
                className={styles.resetButton}
                aria-label="Reset game to beginning. Warning: This will permanently delete all progress"
              >
                Reset Game
              </button>
            </div>
            <p className={styles.warning} role="alert">
              This will permanently delete all progress!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsOverlay;
