import React, { useState, useEffect } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
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
