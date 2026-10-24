import { memo, type FC } from 'react';
import { useGlide } from '../hooks/useGlide';

type ProgressBarProps = {
  value: number;
  max?: number;
  color?: string;
  height?: number;
};

const ProgressBar: FC<ProgressBarProps> = memo(({ value, max = 100, color, height }) => {
  // Glides between game steps, and snaps back when the value drops
  const glides = useGlide(value / max);
  return (
    <div
      className="progress-bar"
      data-testid="progress-bar"
      style={{ height: `${typeof height === 'number' ? height : 12}px`, background: '#eee', borderRadius: '6px', overflow: 'hidden' }}
    >
      <div
        className="progress glide-width"
        style={{
          width: `${(value / max) * 100}%`,
          background: color || '#4caf50',
          height: '100%',
          borderRadius: '6px',
          transition: glides ? undefined : 'none',
        }}
      ></div>
    </div>
  );
});

ProgressBar.displayName = 'ProgressBar';

export default ProgressBar;
