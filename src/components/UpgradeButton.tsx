import React from 'react';

export interface UpgradeButtonProps {
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
  isOwned?: boolean;
  isMaxLevel?: boolean;
  level?: number;
  flex?: boolean;
  effect?: string;
  knowledgeCost?: number; // Add optional knowledge cost for dual-cost items
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

const UpgradeButton: React.FC<UpgradeButtonProps> = ({ 
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
  isOwned = false, 
  isMaxLevel = false, 
  level,
  flex = false,
  effect,
  knowledgeCost,
  formatNumber
}) => {
  const canAfford = currencyType === 'money' ? money >= cost : knowledge >= cost;
  
  const getButtonStyle = () => {
    if (isOwned) {
      return {
        padding: '0.4rem 0.6rem',
        backgroundColor: '#4a5568',
        color: '#fff',
        border: 'none',
        borderRadius: '3px',
        cursor: 'default',
        width: '16.0em',
        minHeight: '45px',
        whiteSpace: 'nowrap' as const,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        ...(flex && { flex: 1 })
      };
    } else if (isMaxLevel || disabled) {
      return {
        padding: '0.4rem 0.6rem',
        backgroundColor: isMaxLevel ? '#722929ff' : '#3a6318ff',
        color: '#fff',
        border: 'none',
        borderRadius: '3px',
        cursor: 'not-allowed',
        width: '16.0em',
        minHeight: '45px',
        whiteSpace: 'nowrap' as const,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        ...(flex && { flex: 1 })
      };
    } else if (!canAfford) {
      return {
        padding: '0.4rem 0.6rem',
        backgroundColor: '#aaa',
        color: '#fff',
        border: 'none',
        borderRadius: '3px',
        cursor: 'not-allowed',
        width: '16em',
        minHeight: '45px',
        whiteSpace: 'nowrap' as const,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        ...(flex && { flex: 1 })
      };
    } else {
      return {
        padding: '0.4rem 0.6rem',
        backgroundColor: '#3a6318ff',
        color: '#fff',
        border: '2px solid #ffeb3b',
        borderRadius: '3px',
        cursor: 'pointer',
        width: '16.0em',
        minHeight: '45px',
        boxShadow: '0 0 6px 1px #ffe066',
        whiteSpace: 'nowrap' as const,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        ...(flex && { flex: 1 })
      };
    }
  };

  const renderButtonContent = () => {
    return (
      <>
        <img 
          src={imageSrc} 
          alt={imageAlt} 
          style={{ 
            width: '2.5em', 
            height: '2.5em', 
            objectFit: 'contain', 
            verticalAlign: 'middle' 
          }} 
        />
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div>
            {buttonText}
            {level !== undefined && (
              <span style={{ color: '#888', fontWeight: 'normal' }}> ({level})</span>
            )}
          </div>
          {effect && (
            <div style={{ fontSize: '11px', color: '#ccc', marginTop: '2px' }}>
              {effect}
            </div>
          )}
          {!isOwned && !isMaxLevel && (
            <div style={{ fontSize: '11px', opacity: 0.9 }}>
              {knowledgeCost ? 
                `$${formatNumber(cost, 1)} & ${formatNumber(knowledgeCost, 1)} Kn` : 
                (currencyType === 'money' ? `$${formatNumber(cost, 1)}` : `${formatNumber(cost, 1)} Kn`)
              }
            </div>
          )}
          {isOwned && (
            <div style={{ fontSize: '11px', color: '#ccc', marginTop: '4px' }}>
              Owned
            </div>
          )}
          {isMaxLevel && (
            <div style={{ fontSize: '11px', color: '#ccc', marginTop: '4px' }}>
              Max Level
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <button
      title={title}
      style={getButtonStyle()}
      onClick={onClick}
      disabled={disabled || !canAfford || isMaxLevel || isOwned}
    >
      {renderButtonContent()}
    </button>
  );
};

export default UpgradeButton;
