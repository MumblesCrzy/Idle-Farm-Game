import React, { memo } from 'react';

type ProgressBarProps = {
  value: number;
  max?: number;
  color?: string;
  height?: number;
};

const ProgressBar: React.FC<ProgressBarProps> = memo(({ value, max = 100, color, height }) => (
  <div
    className="progress-bar"
    data-testid="progress-bar"
    style={{ height: `${typeof height === 'number' ? height : 12}px`, background: '#eee', borderRadius: '6px', overflow: 'hidden' }}
  >
    <div
      className="progress"
      style={{
        width: `${(value / max) * 100}%`,
        background: color || '#4caf50',
        height: '100%',
        borderRadius: '6px',
        transition: 'width 0.3s, background 0.3s ease',
      }}
    ></div>
  </div>
));

ProgressBar.displayName = 'ProgressBar';

export default ProgressBar;
