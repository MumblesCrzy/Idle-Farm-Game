import React from 'react';
import type { CanningUpgrade } from '../types/canning';

// Utility function to format large numbers with shorthand notation
function formatNumber(num: number, decimalPlaces: number = 1): string {
  if (num < 1000) {
    return num.toFixed(decimalPlaces === 0 ? 0 : Math.min(decimalPlaces, 2)).replace(/\.?0+$/, '');
  }
  
  const units = ['', 'K', 'M', 'B', 'T', 'Q'];
  let unitIndex = 0;
  let value = num;
  
  while (value >= 1000 && unitIndex < units.length - 1) {
    value /= 1000;
    unitIndex++;
  }
  
  // For values >= 1000, always show at least 1 decimal place unless it's a whole number
  const formatted = value.toFixed(decimalPlaces);
  return `${formatted.replace(/\.?0+$/, '')}${units[unitIndex]}`;
}

interface UpgradeButtonProps {
  title: string;
  imageSrc: string;
  imageAlt: string;
  buttonText: string;
  money: number;
  knowledge: number;
  cost: number;
  currencyType: 'money' | 'knowledge';
  onClick: () => void;
  disabled?: boolean;
  isMaxLevel?: boolean;
  level?: number;
  maxLevel?: number;
  effect?: string;
}

function CanningUpgradeButton({ 
  title, 
  imageSrc, 
  imageAlt, 
  buttonText, 
  money, 
  knowledge, 
  cost, 
  currencyType, 
  onClick, 
  disabled = false, 
  isMaxLevel = false, 
  level,
  maxLevel,
  effect
}: UpgradeButtonProps) {
  const canAfford = currencyType === 'money' ? money >= cost : knowledge >= cost;
  
  const getButtonStyle = () => {
    if (isMaxLevel) {
      return {
        padding: '0.4rem 0.6rem',
        backgroundColor: '#4a5568',
        color: '#fff',
        border: 'none',
        borderRadius: '3px',
        cursor: 'default',
        width: '100%',
        minHeight: '45px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      };
    } else if (disabled || !canAfford) {
      return {
        padding: '0.4rem 0.6rem',
        backgroundColor: '#4a5568',
        color: '#fff',
        border: 'none',
        borderRadius: '3px',
        cursor: 'not-allowed',
        width: '100%',
        minHeight: '45px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      };
    } else {
      return {
        padding: '0.4rem 0.6rem',
        backgroundColor: '#703c01ff',
        color: '#fff',
        border: '2px solid #ffeb3b',
        borderRadius: '3px',
        cursor: 'pointer',
        width: '100%',
        minHeight: '45px',
        boxShadow: '0 0 6px 1px #ffe066',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      };
    }
  };

  const currencySymbol = currencyType === 'money' ? '$' : '';
  const currencyUnit = currencyType === 'knowledge' ? ' Kn' : '';

  return (
    <button
      title={title}
      style={getButtonStyle()}
      onClick={onClick}
      disabled={disabled || !canAfford || isMaxLevel}
    >
      <img 
        src={imageSrc} 
        alt={imageAlt} 
        style={{ 
          width: '2.5em', 
          height: '2.5em', 
          objectFit: 'contain'
        }} 
      />
      <div style={{ flex: 1, textAlign: 'left' }}>
        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
          {buttonText}
          {level !== undefined && (
            <span style={{ color: '#ccc', fontWeight: 'normal', marginLeft: '4px' }}>
              {maxLevel ? `(${level}/${maxLevel})` : `(${level})`}
            </span>
          )}
        </div>
        {effect && (
          <div style={{ fontSize: '11px', color: '#ccc', marginTop: '2px' }}>
            {effect}
          </div>
        )}
        {!isMaxLevel && (
          <div style={{ fontSize: '12px', color: '#fff', marginTop: '4px' }}>
            {currencySymbol}{formatNumber(cost, 1)}{currencyUnit}
          </div>
        )}
        {isMaxLevel && (
          <div style={{ fontSize: '12px', color: '#ccc', marginTop: '4px' }}>
            MAX LEVEL
          </div>
        )}
      </div>
    </button>
  );
}

interface CanningUpgradesPanelProps {
  upgrades: CanningUpgrade[];
  money: number;
  knowledge: number;
  onPurchaseUpgrade: (upgradeId: string) => boolean;
}

const CanningUpgradesPanel: React.FC<CanningUpgradesPanelProps> = ({
  upgrades,
  money,
  knowledge,
  onPurchaseUpgrade
}) => {
  const getUpgradeEffect = (upgrade: CanningUpgrade): string => {
    switch (upgrade.type) {
      case 'speed':
        return `Processing time: ${(upgrade.effect * 100).toFixed(0)}%`;
      case 'efficiency':
        return `Sale price: +${((upgrade.effect - 1) * 100).toFixed(0)}%`;
      case 'quality':
        return `Bonus chance: ${upgrade.effect.toFixed(0)}%`;
      case 'automation':
        return `Max processes: ${1 + upgrade.effect}`;
      default:
        return `Level ${upgrade.level}`;
    }
  };

  const getUpgradeImage = (upgrade: CanningUpgrade): string => {
    switch (upgrade.id) {
      case 'canning_speed':
        return './Quick Hands.png'; // Reuse existing speed icon
      case 'canning_efficiency':
        return './Family Recipe.png'; // Reuse for efficiency
      case 'preservation_mastery':
        return './Heirloom Touch.png'; // Reuse for quality
      case 'simultaneous_processing':
        return './Batch Canning.png'; // Reuse for multiple processes
      default:
        return './Fertilizer.png'; // Default icon
    }
  };

  const getUpgradeTitle = (upgrade: CanningUpgrade): string => {
    let baseTitle = `${upgrade.name}: ${upgrade.description}`;
    if (upgrade.maxLevel && upgrade.level >= upgrade.maxLevel) {
      baseTitle += ' | MAX LEVEL REACHED';
    } else {
      baseTitle += ` | Current effect: ${getUpgradeEffect(upgrade)}`;
    }
    return baseTitle;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      {upgrades.map(upgrade => (
          <CanningUpgradeButton
            key={upgrade.id}
            title={getUpgradeTitle(upgrade)}
            imageSrc={getUpgradeImage(upgrade)}
            imageAlt={upgrade.name}
            buttonText={upgrade.name}
            money={money}
            knowledge={knowledge}
            cost={upgrade.cost}
            currencyType={upgrade.costCurrency}
            onClick={() => onPurchaseUpgrade(upgrade.id)}
            isMaxLevel={upgrade.maxLevel ? upgrade.level >= upgrade.maxLevel : false}
            level={upgrade.level}
            maxLevel={upgrade.maxLevel}
            effect={upgrade.level > 0 ? getUpgradeEffect(upgrade) : undefined}
          />
        ))}
    </div>
  );
};

export default CanningUpgradesPanel;