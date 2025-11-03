import React, { memo } from 'react';

type VeggiePanelProps = {
  name: string;
  growth: number;
  stash: number;
  onHarvest: () => void;
  canHarvest: boolean;
  sellEnabled: boolean;
  onToggleSell: () => void;
};

const VeggiePanel: React.FC<VeggiePanelProps> = memo(({ name, growth, stash, onHarvest, canHarvest, sellEnabled, onToggleSell }) => (
  <div className="veggie-panel">
    <h2>{name}</h2>
    <div className="progress-bar">
      <div className="progress" style={{ width: `${growth}%` }}></div>
    </div>
    <span>Growth: {Math.floor(growth)}%</span>
    <button onClick={onHarvest} disabled={!canHarvest}>
      Harvest
    </button>
    <div>Stash: {stash}</div>
    <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <button
        onClick={onToggleSell}
        style={{
          background: sellEnabled ? '#4CAF50' : '#f44336',
          color: 'white',
          border: 'none',
          padding: '0.25rem 0.5rem',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '0.8rem',
          fontWeight: 'bold',
        }}
        title={sellEnabled ? 'Auto-sell enabled (click to disable)' : 'Auto-sell disabled (click to enable)'}
      >
        {sellEnabled ? '💰 Sell' : '🚫 Hold'}
      </button>
      <span style={{ fontSize: '0.8rem', color: '#666' }}>
        {sellEnabled ? 'Will auto-sell' : 'Will stockpile'}
      </span>
    </div>
  </div>
));

VeggiePanel.displayName = 'VeggiePanel';

export default VeggiePanel;
