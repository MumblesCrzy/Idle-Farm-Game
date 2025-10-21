import React from 'react';

// Extended veggie type that includes canning-related upgrades
export type VeggieWithCanning = {
  name: string;
  stash: number;
  salePrice: number;
  unlocked: boolean;
  // Existing upgrades
  fertilizerLevel: number;
  betterSeedsLevel: number;
  additionalPlotLevel: number;
  harvesterOwned: boolean;
  harvesterSpeedLevel?: number;
  // New canning upgrades
  canningYieldLevel?: number;
  canningYieldCost?: number;
  canningQualityLevel?: number;
  canningQualityCost?: number;
};

interface VeggieCanningUpgradesProps {
  veggie: VeggieWithCanning;
  veggieIndex: number;
  money: number;
  knowledge: number;
  onPurchaseCanningYield: (index: number) => void;
  onPurchaseCanningQuality: (index: number) => void;
  isActive: boolean; // Whether this is the currently selected veggie
}

const VeggieCanningUpgrades: React.FC<VeggieCanningUpgradesProps> = ({
  veggie,
  veggieIndex,
  money,
  knowledge,
  onPurchaseCanningYield,
  onPurchaseCanningQuality,
  isActive
}) => {
  if (!isActive || !veggie.unlocked) {
    return null;
  }

  const canningYieldLevel = veggie.canningYieldLevel || 0;
  const canningYieldCost = veggie.canningYieldCost || calculateCanningUpgradeCost('yield', canningYieldLevel, veggieIndex);
  
  const canningQualityLevel = veggie.canningQualityLevel || 0;
  const canningQualityCost = veggie.canningQualityCost || calculateCanningUpgradeCost('quality', canningQualityLevel, veggieIndex);

  return (
    <div style={{
      marginTop: '16px',
      padding: '12px',
      backgroundColor: '#fff3e0',
      border: '2px solid #ff8503',
      borderRadius: '8px'
    }}>
      <h4 style={{
        margin: '0 0 12px 0',
        fontSize: '14px',
        color: '#e65100',
        textAlign: 'center',
        borderBottom: '1px solid #ffb74d',
        paddingBottom: '4px'
      }}>
        🏺 {veggie.name} Canning Upgrades
      </h4>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px'
      }}>
        {/* Canning Yield Upgrade */}
        <button
          onClick={() => onPurchaseCanningYield(veggieIndex)}
          disabled={money < canningYieldCost}
          style={{
            padding: '8px',
            backgroundColor: money >= canningYieldCost ? '#ff8503' : '#ccc',
            color: 'white',
            border: money >= canningYieldCost ? '2px solid #700e01' : 'none',
            borderRadius: '4px',
            cursor: money >= canningYieldCost ? 'pointer' : 'not-allowed',
            fontSize: '11px',
            fontWeight: 'bold',
            boxShadow: money >= canningYieldCost ? '0 0 4px 1px #ffe066' : 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px'
          }}
          title={`Canning Yield: Each harvest gives +20% extra vegetables for canning (Level ${canningYieldLevel})`}
        >
          <img 
            src="./Additional Plot.png" 
            alt="Canning Yield" 
            style={{ width: '20px', height: '20px', objectFit: 'contain' }} 
          />
          <div>Yield ({canningYieldLevel})</div>
          <div>${canningYieldCost}</div>
        </button>

        {/* Canning Quality Upgrade */}
        <button
          onClick={() => onPurchaseCanningQuality(veggieIndex)}
          disabled={knowledge < canningQualityCost}
          style={{
            padding: '8px',
            backgroundColor: knowledge >= canningQualityCost ? '#ff8503' : '#ccc',
            color: 'white',
            border: knowledge >= canningQualityCost ? '2px solid #ffeb3b' : 'none',
            borderRadius: '4px',
            cursor: knowledge >= canningQualityCost ? 'pointer' : 'not-allowed',
            fontSize: '11px',
            fontWeight: 'bold',
            boxShadow: knowledge >= canningQualityCost ? '0 0 4px 1px #ffe066' : 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px'
          }}
          title={`Canning Quality: When using this vegetable in recipes, +15% final sale price (Level ${canningQualityLevel})`}
        >
          <img 
            src="./Heirloom Seeds.png" 
            alt="Canning Quality" 
            style={{ width: '20px', height: '20px', objectFit: 'contain' }} 
          />
          <div>Quality ({canningQualityLevel})</div>
          <div>{canningQualityCost} Kn</div>
        </button>
      </div>

      <div style={{
        marginTop: '8px',
        fontSize: '10px',
        color: '#bf360c',
        textAlign: 'center',
        backgroundColor: '#ffecb3',
        padding: '4px',
        borderRadius: '4px'
      }}>
        Current effects: +{canningYieldLevel * 20}% harvest | +{canningQualityLevel * 15}% recipe value
      </div>
    </div>
  );
};

// Helper function to calculate canning upgrade costs
function calculateCanningUpgradeCost(
  type: 'yield' | 'quality',
  currentLevel: number,
  veggieIndex: number
): number {
  const baseCosts = {
    yield: 200, // Base cost for yield upgrades
    quality: 150 // Base cost for quality upgrades (in knowledge)
  };
  
  const baseCost = baseCosts[type];
  const veggieMultiplier = Math.pow(1.5, veggieIndex); // Higher tier veggies cost more
  const levelMultiplier = Math.pow(1.4, currentLevel); // Each level costs more
  
  return Math.ceil(baseCost * veggieMultiplier * levelMultiplier);
}

export default VeggieCanningUpgrades;
export { calculateCanningUpgradeCost };