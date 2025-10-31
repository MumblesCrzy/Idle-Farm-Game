import React from 'react';

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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#ffffffff',
        borderRadius: '8px',
        padding: '20px',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '400px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: '#333' }}>Settings</h3>
          <button
            onClick={onClose}
            style={{
              padding: '5px 10px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: '#dc3545',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Close
          </button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>Save Management</h4>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={handleExportSave}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: '#1976d2',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Export Save
              </button>
              <button
                onClick={handleImportSave}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: '#8819d2ff',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Import Save
              </button>
            </div>
          </div>
          
          <div>
            <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>Sound Settings</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
              <label style={{ fontSize: '14px', color: '#333' }}>Sound Effects:</label>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                style={{
                  padding: '6px 12px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: soundEnabled ? '#28a745' : '#dc3545',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                {soundEnabled ? '🔊 ON' : '🔇 OFF'}
              </button>
            </div>
          </div>
          
          <div>
            <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>Game Actions</h4>
            <button
              onClick={() => {
                onClose();
                handleResetGame();
              }}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: '#dc3545',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Reset Game
            </button>
            <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#666' }}>
              This will permanently delete all progress!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsOverlay;
