import React from 'react';
import styles from './SettingsOverlay.module.css';

interface SettingsOverlayProps {
  visible: boolean;
  onClose: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  handleExportSave: () => void;
  handleImportSave: () => void;
  handleResetGame: () => void;
}

const SettingsOverlay: React.FC<SettingsOverlayProps> = ({
  visible,
  onClose,
  soundEnabled,
  setSoundEnabled,
  handleExportSave,
  handleImportSave,
  handleResetGame
}) => {
  if (!visible) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3 className={styles.title}>Settings</h3>
          <button
            onClick={onClose}
            className={styles.closeButton}
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
              >
                Export Save
              </button>
              <button
                onClick={handleImportSave}
                className={styles.importButton}
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
              >
                {soundEnabled ? '🔊 ON' : '🔇 OFF'}
              </button>
            </div>
          </div>
          
          <div>
            <h4 className={styles.sectionTitle}>Game Actions</h4>
            <div className={styles.buttonGroup}>
              <button
                onClick={() => {
                  onClose();
                  handleResetGame();
                }}
                className={styles.resetButton}
              >
                Reset Game
              </button>
            </div>
            <p className={styles.warning}>
              This will permanently delete all progress!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsOverlay;
