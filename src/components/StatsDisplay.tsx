import React, { memo } from 'react';
import type { Veggie } from '../types/game';

interface StatsDisplayProps {
  day: number;
  totalDaysElapsed: number;
  season: string;
  currentWeather: string;
  totalPlotsUsed: number;
  maxPlots: number;
  money: number;
  knowledge: number;
  veggies: Veggie[];
  setShowAdvancedStash: (show: boolean) => void;
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

const StatsDisplay: React.FC<StatsDisplayProps> = memo(({
  day,
  totalDaysElapsed,
  season,
  currentWeather,
  totalPlotsUsed,
  maxPlots,
  money,
  knowledge,
  veggies,
  setShowAdvancedStash,
  formatNumber
}) => {
  return (
    <>
      <div className="day-counter">
        Year: {Math.floor(totalDaysElapsed / 365) + 1} | Day: {day}{' '}
        <span style={{ marginLeft: '1rem', display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}>
          <img
            src={`./${season}.png`}
            alt={season}
            style={{ width: 28, height: 28, marginRight: 6, verticalAlign: 'middle', objectFit: 'contain' }}
          />
          {season}
          <span style={{ marginLeft: '1rem' }}></span>
          <img
            src={`./${currentWeather}.png`}
            alt={currentWeather}
            style={{ width: 28, height: 28, marginRight: 6, verticalAlign: 'middle', objectFit: 'contain' }}
          />
          <span>{currentWeather}</span>
        </span>
      </div>
      <div style={{ marginBottom: '1rem' }} />
      <div className="stats under-title" style={{ display: 'inline-flex', verticalAlign: 'middle', alignItems: 'center', gap: '2rem', flexWrap: 'wrap', fontSize: '1.0rem', marginBottom: '1rem' }}>
        <span style={{ position: 'relative' }}>
          <img src="./Plots.png" alt="Plots" style={{ width: 22, height: 22, verticalAlign: 'middle', marginRight: 4 }} />
          Plots: {totalPlotsUsed} / {maxPlots}
          <div 
            style={{ 
              display: 'inline-block',
              marginLeft: '5px',
              width: '16px', 
              height: '16px', 
              backgroundColor: totalPlotsUsed >= maxPlots ? '#ffe0e0' : '#e0ffe0', 
              border: `1px solid ${totalPlotsUsed >= maxPlots ? '#ffaaaa' : '#aaffaa'}`,
              borderRadius: '50%', 
              textAlign: 'center', 
              lineHeight: '14px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'help'
            }}
            title={totalPlotsUsed >= maxPlots ? 
              'You\'ve reached your maximum plot limit! Buy a larger farm to unlock more plots for vegetables.' : 
              'Each vegetable and additional plot uses one plot.' }
          >
          </div>
        </span>
        <span>
          <img src="./Money.png" alt="Money" style={{ width: 22, height: 22, verticalAlign: 'middle', marginRight: 4 }} />
          Money: ${formatNumber(money, 2)}
        </span>
        <span>
          <img src="./Knowledge.png" alt="Knowledge" style={{ width: 22, height: 22, verticalAlign: 'middle', marginRight: 4 }} />
          Knowledge: {formatNumber(knowledge, 2)}
        </span>
        <span>
          <button
            onClick={() => setShowAdvancedStash(true)}
            style={{
              background: '#2e7d32',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '0.75rem',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'background-color 0.2s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#1e6b2b'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#2e7d32'}
            title="View detailed stash breakdown"
          >
            <img src="./Money.png" alt="Stash" style={{ width: 18, height: 18, objectFit: 'contain' }} />
            Stash: {veggies.reduce((sum, v) => sum + v.stash, 0)}
          </button>
        </span>
      </div>
    </>
  );
};

export default StatsDisplay;
