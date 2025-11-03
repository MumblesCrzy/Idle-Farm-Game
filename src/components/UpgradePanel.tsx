import React, { memo } from 'react';

type UpgradePanelProps = {
  upgrades: Array<{
    name: string;
    level: number;
    cost: number;
    onBuy: () => void;
  }>;
};

const UpgradePanel: React.FC<UpgradePanelProps> = memo(({ upgrades }) => (
  <div className="upgrade-panel">
    <h3>Upgrades</h3>
    {upgrades.map((upg) => (
      <div key={upg.name} className="upgrade-row">
        <span>{upg.name} (Lv. {upg.level})</span>
        <button onClick={upg.onBuy} disabled={upg.cost < 0}>
          Buy (${upg.cost})
        </button>
      </div>
    ))}
  </div>
));

UpgradePanel.displayName = 'UpgradePanel';

export default UpgradePanel;
