import { useState, useEffect, memo, type FC } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { featureFlags } from '../utils/featureFlags';
import { devTelemetry } from '../utils/devTelemetry';
import type { LoadingStates } from './SaveLoadSystem';
import { ARCHIE_LOOKS, unlockingAchievementName, type ArchieAppearance } from '../data/archieLooks';
import styles from './SettingsOverlay.module.css';

interface SettingsOverlayProps {
  visible: boolean;
  onClose: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  archieAppearance: ArchieAppearance;
  setArchieAppearance: (appearance: ArchieAppearance) => void;
  unlockedAchievements: string[]; // Array of unlocked achievement IDs
  handleExportSave: () => void;
  handleImportSave: () => void;
  handleResetGame: () => void;
  loadingStates?: LoadingStates;
}

const SettingsOverlay: FC<SettingsOverlayProps> = memo(({
  visible,
  onClose,
  soundEnabled,
  setSoundEnabled,
  archieAppearance,
  setArchieAppearance,
  unlockedAchievements,
  handleExportSave,
  handleImportSave,
  handleResetGame,
  loadingStates
}) => {
  const { containerRef, handleTabKey } = useFocusTrap(visible, onClose);
  const [itchViewport, setItchViewport] = useState(false);
  const [telemetryEnabled, setTelemetryEnabled] = useState(() => featureFlags.isEnabled('devTelemetry'));
  
  // Check for itch viewport mode on mount
  useEffect(() => {
    setItchViewport(document.body.classList.contains('itch-viewport'));
    setTelemetryEnabled(featureFlags.isEnabled('devTelemetry'));
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
                className={`${styles.exportButton} ${loadingStates?.isExporting ? styles.buttonLoading : ''}`}
                aria-label="Export save file to download as JSON"
                disabled={loadingStates?.isExporting || loadingStates?.isImporting}
                aria-busy={loadingStates?.isExporting}
              >
                {loadingStates?.isExporting ? (
                  <>
                    <span className={styles.spinner} aria-hidden="true" />
                    Exporting...
                  </>
                ) : (
                  'Export Save'
                )}
              </button>
              <button
                onClick={handleImportSave}
                className={`${styles.importButton} ${loadingStates?.isImporting ? styles.buttonLoading : ''}`}
                aria-label="Import save file from JSON"
                disabled={loadingStates?.isExporting || loadingStates?.isImporting}
                aria-busy={loadingStates?.isImporting}
              >
                {loadingStates?.isImporting ? (
                  <>
                    <span className={styles.spinner} aria-hidden="true" />
                    Importing...
                  </>
                ) : (
                  'Import Save'
                )}
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
                {ARCHIE_LOOKS.map(look => {
                  const locked = !!look.achievementId && !unlockedAchievements.includes(look.achievementId);
                  const achievementName = unlockingAchievementName(look);
                  return (
                    <button
                      key={look.id}
                      onClick={() => setArchieAppearance(look.id)}
                      className={`${styles.appearanceButton} ${archieAppearance === look.id ? styles.appearanceButtonActive : ''} ${locked ? styles.appearanceButtonLocked : ''}`}
                      aria-label={locked ? `Locked: Unlock '${achievementName}' achievement` : look.description}
                      aria-pressed={archieAppearance === look.id}
                      disabled={locked}
                      title={locked ? `Unlock '${achievementName}' achievement to use this appearance` : undefined}
                    >
                      {locked ? `${look.label} 🔒` : look.label}
                    </button>
                  );
                })}
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
              <div className={styles.soundSettings}>
                <label className={styles.soundLabel}>Dev Telemetry:</label>
                <button
                  onClick={() => {
                    const next = !telemetryEnabled;
                    featureFlags.setFlag('devTelemetry', next);
                    setTelemetryEnabled(next);
                  }}
                  className={`${styles.soundButton} ${telemetryEnabled ? styles.soundButtonOn : styles.soundButtonOff}`}
                  aria-label={telemetryEnabled ? 'Dev telemetry enabled. Click to disable' : 'Dev telemetry disabled. Click to enable'}
                  aria-pressed={telemetryEnabled}
                >
                  {telemetryEnabled ? '📊 ON' : '📊 OFF'}
                </button>
              </div>
              {telemetryEnabled && (
                <div className={styles.buttonGroup}>
                  <button
                    onClick={() => devTelemetry.printDashboard()}
                    className={styles.exportButton}
                    aria-label="Print telemetry dashboard to console"
                  >
                    Print Dashboard
                  </button>
                  <button
                    onClick={() => devTelemetry.downloadCSV()}
                    className={styles.exportButton}
                    aria-label="Export telemetry log as CSV file"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={() => {
                      devTelemetry.clear();
                      console.log('[Telemetry] Event log cleared.');
                    }}
                    className={styles.resetButton}
                    aria-label="Clear all stored telemetry events"
                  >
                    Clear Log
                  </button>
                </div>
              )}
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
                className={`${styles.resetButton} ${loadingStates?.isResetting ? styles.buttonLoading : ''}`}
                aria-label="Reset game to beginning. Warning: This will permanently delete all progress"
                disabled={loadingStates?.isResetting || loadingStates?.isExporting || loadingStates?.isImporting}
                aria-busy={loadingStates?.isResetting}
              >
                {loadingStates?.isResetting ? (
                  <>
                    <span className={styles.spinner} aria-hidden="true" />
                    Resetting...
                  </>
                ) : (
                  'Reset Game'
                )}
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
});

SettingsOverlay.displayName = 'SettingsOverlay';

export default SettingsOverlay;
