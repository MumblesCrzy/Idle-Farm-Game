import React, { memo } from 'react';
import styles from './VeggiePanel.module.css';

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
    <div className={styles.container}>
      <button
        onClick={onToggleSell}
        className={styles.plantButton}
        style={{
          background: sellEnabled ? '#4CAF50' : '#f44336',
        }}
        title={sellEnabled ? 'Auto-sell enabled (click to disable)' : 'Auto-sell disabled (click to enable)'}
      >
        {sellEnabled ? '💰 Sell' : '🚫 Hold'}
      </button>
      <span className={styles.info}>
        {sellEnabled ? 'Will auto-sell' : 'Will stockpile'}
      </span>
    </div>
  </div>
));

VeggiePanel.displayName = 'VeggiePanel';

export default VeggiePanel;
