import React from 'react';

type VeggiePanelProps = {
  name: string;
  growth: number;
  stash: number;
  onHarvest: () => void;
  canHarvest: boolean;
};

const VeggiePanel: React.FC<VeggiePanelProps> = ({ name, growth, stash, onHarvest, canHarvest }) => (
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
  </div>
);

export default VeggiePanel;
