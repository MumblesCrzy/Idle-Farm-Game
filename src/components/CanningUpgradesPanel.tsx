import React from 'react';
import type { CanningUpgrade } from '../types/canning';
import { formatNumber } from '../utils/gameCalculations';

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
  canningState: any;
  onToggleAutoCanning: () => void;
}

const CanningUpgradesPanel: React.FC<CanningUpgradesPanelProps> = ({
  upgrades,
  money,
  knowledge,
  onPurchaseUpgrade,
  canningState,
  onToggleAutoCanning
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
      case 'canner':
        return './Canner.png'; // Use automation icon for Canner
      default:
        return './Fertilizer.png'; // Default icon
    }
  };

  // Get known max level for an upgrade (defensive fallback)
  const getKnownMaxLevel = (upgradeId: string): number | undefined => {
    switch (upgradeId) {
      case 'canning_speed':
        return 18;
      case 'simultaneous_processing':
        return 14;
      case 'canner':
        return 1;
      default:
        return undefined;
    }
  };

  const getUpgradeTitle = (upgrade: CanningUpgrade): string => {
    const effectiveMaxLevel = upgrade.maxLevel ?? getKnownMaxLevel(upgrade.id);
    let baseTitle = `${upgrade.name}: ${upgrade.description}`;
    if (effectiveMaxLevel && upgrade.level >= effectiveMaxLevel) {
      baseTitle += ' | MAX LEVEL REACHED';
    }
    return baseTitle;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      {upgrades?.map(upgrade => {
        // Special handling for Canner upgrade to combine purchase and toggle
        if (upgrade.id === 'canner') {
          const isPurchased = upgrade.level > 0;
          const isEnabled = canningState?.autoCanning?.enabled || false;
          
          if (!isPurchased) {
            // Not purchased - show as regular upgrade button
            return (
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
                isMaxLevel={false}
                level={upgrade.level}
                maxLevel={upgrade.maxLevel}
                effect={undefined}
              />
            );
          } else {
            // Purchased - show as toggle button with canning upgrade styling
            const getToggleButtonStyle = () => {
              if (isEnabled) {
                return {
                  padding: '0.4rem 0.6rem',
                  backgroundColor: '#703c01ff',
                  color: '#fff',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  width: '100%',
                  minHeight: '45px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                };
              } else {
                return {
                  padding: '0.4rem 0.6rem',
                  backgroundColor: '#4a5568',
                  color: '#fff',
                  border: '2px solid #6b7280',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  width: '100%',
                  minHeight: '45px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                };
              }
            };
            
            return (
              <button
                key={upgrade.id}
                style={getToggleButtonStyle()}
                onClick={onToggleAutoCanning}
                title={`${isEnabled ? 'Disable' : 'Enable'} auto-canning. When enabled, automatically starts canning processes every 10 seconds.`}
              >
                <img 
                  src={getUpgradeImage(upgrade)} 
                  alt={upgrade.name} 
                  style={{ 
                    width: '2.5em', 
                    height: '2.5em', 
                    objectFit: 'contain'
                  }} 
                />
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                    {upgrade.name}: {isEnabled ? 'ON' : 'OFF'}
                    <span style={{ color: '#ccc', fontWeight: 'normal', marginLeft: '4px' }}>
                      (1/1)
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#ccc', marginTop: '2px' }}>
                    {isEnabled ? 'Automatically starting recipes' : 'Click to enable automation'}
                  </div>
                </div>
              </button>
            );
          }
        }
        
        // Regular upgrade handling for all other upgrades
        const effectiveMaxLevel = upgrade.maxLevel ?? getKnownMaxLevel(upgrade.id);
        return (
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
            isMaxLevel={effectiveMaxLevel ? upgrade.level >= effectiveMaxLevel : false}
            level={upgrade.level}
            maxLevel={effectiveMaxLevel}
            effect={getUpgradeEffect(upgrade)}
          />
        );
      })}
    </div>
  );
};

export default CanningUpgradesPanel;