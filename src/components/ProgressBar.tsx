import React from 'react';

type ProgressBarProps = {
  value: number;
  max?: number;
  color?: string;
  height?: number;
};

const ProgressBar: React.FC<ProgressBarProps> = ({ value, max = 100, color, height }) => (
  <div
    className="progress-bar"
    style={{ height: `${typeof height === 'number' ? height : 12}px`, background: '#eee', borderRadius: '6px', overflow: 'hidden' }}
  >
    <div
      className="progress"
      style={{
        width: `${(value / max) * 100}%`,
        background: color || '#4caf50',
        height: '100%',
        borderRadius: '6px',
        transition: 'width 0.3s',
      }}
    ></div>
  </div>
);

export default ProgressBar;
