import React from 'react';

interface HeaderBarProps {
  activeTab: 'growing' | 'canning';
  canningUnlocked: boolean;
  experience: number;
  money: number;
  farmCost: number;
  farmTier: number;
  totalPlotsUsed: number;
  maxPlots: number;
  knowledge: number;
  setActiveTab: (tab: 'growing' | 'canning') => void;
  setShowInfoOverlay: (show: boolean) => void;
  setShowSettingsOverlay: (show: boolean) => void;
  setShowAchievements: (show: boolean) => void;
  totalAchievements?: number;
  unlockedAchievements?: number;
  handleBuyLargerFarm: () => void;
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

const HeaderBar: React.FC<HeaderBarProps> = ({
  activeTab,
  canningUnlocked,
  experience,
  money,
  farmCost,
  farmTier,
  totalPlotsUsed,
  maxPlots,
  knowledge,
  setActiveTab,
  setShowInfoOverlay,
  setShowSettingsOverlay,
  setShowAchievements,
  totalAchievements = 0,
  unlockedAchievements = 0,
  handleBuyLargerFarm,
  formatNumber
}) => {
  return (
    <>
      {/* Info and Settings Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
        <button
          onClick={() => setShowInfoOverlay(true)}
          style={{ fontSize: '0.85rem', padding: '2px 10px', marginLeft: 'auto', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', height: '28px' }}
          title="Info - Game Help"
        >
          Info
        </button>
        <button
          onClick={() => setShowAchievements(true)}
          style={{ fontSize: '0.85rem', padding: '2px 10px', marginLeft: '0.5rem', background: '#ffc107', color: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', height: '28px', fontWeight: 'bold' }}
          title={`Achievements: ${unlockedAchievements}/${totalAchievements} unlocked`}
        >
          🏆 {unlockedAchievements}/{totalAchievements}
        </button>
        <button
          onClick={() => setShowSettingsOverlay(true)}
          style={{ fontSize: '0.85rem', padding: '2px 10px', marginLeft: '0.5rem', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', height: '28px' }}
          title="Settings"
        >
          Settings
        </button>
      </div>

      {/* Farm Upgrade UI */}
      <div style={{ minHeight: totalPlotsUsed >= maxPlots ? 'auto' : '0', marginBottom: '1rem' }}>
        {totalPlotsUsed >= maxPlots && (
          <div>
            <button
              onClick={handleBuyLargerFarm}
              disabled={money < farmCost}
              style={{ 
                display: 'inline-flex', 
                background: money >= farmCost ? '#2e7d32' : '#4a5568',
                padding: '.5rem', 
                gap: '1rem', 
                verticalAlign: 'middle', 
                fontSize: '1.0rem', 
                borderRadius: '8px', 
                textAlign: 'center', 
                maxWidth: 1200,
                border: money >= farmCost ? '2px solid #ffeb3b' : '1px solid #718096',
                boxShadow: money >= farmCost ? '0 0 8px 2px #ffe066' : 'none',
                cursor: money >= farmCost ? 'pointer' : 'not-allowed',
                fontWeight: 'bold',
                marginTop: '0.5rem',
                marginBottom: '0.5rem',
                transition: 'all 0.2s',
                color: '#fff'
              }} 
              aria-label="Buy Larger Farm"
              title="New max plots formula: Current max plots + (Experience ÷ 100), capped at 2× current max plots. Example: 4 plots + (500 exp ÷ 100) = 8 plots maximum"
            >
              <span style={{ color: '#fff', marginTop: '0.55rem', marginBottom: '0.55rem' }}>
                <span style={{ color: '#a7f3d0', fontWeight: 'bold', marginLeft: '0.5rem' }}>Buy Larger Farm:</span> ${formatNumber(farmCost, 2)}
                <span style={{ color: '#a7f3d0', fontWeight: 'bold', marginLeft: '0.5rem' }}>New max plots:</span> {Math.min(maxPlots + Math.floor(experience / 100), maxPlots * 2)}
                {(maxPlots + Math.floor(experience / 100)) > (maxPlots * 2) && (
                  <span style={{ color: '#fbbf24', fontSize: '0.9rem', marginLeft: '0.5rem' }}>(capped at 2x current)</span>
                )}
                <span style={{ color: '#a7f3d0', fontWeight: 'bold', marginLeft: '0.5rem' }}>Knowledge+:</span> +{((1.25 * farmTier)).toFixed(2)} Kn/harvest
                <span style={{ color: '#a7f3d0', fontWeight: 'bold', marginLeft: '0.5rem' }}>Money/Knowledge kept:</span> ${money > farmCost ? formatNumber(money - farmCost, 2) : 0} / {knowledge > 0 ? formatNumber(Math.floor(knowledge), 2) : 0}Kn
              </span>
            </button>
          </div>
        )}
      </div>

      <div style={{ marginBottom: '1rem' }} />

      {/* Tab Navigation */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid #444' }}>
          <button
            onClick={() => setActiveTab('growing')}
            style={{
              padding: '0.75rem 1.5rem',
              background: activeTab === 'growing' ? '#4caf50' : '#333',
              color: '#fff',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: activeTab === 'growing' ? 'bold' : 'normal',
              fontSize: '1rem',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <img src="./Growing.png" alt="Growing" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
            Growing
          </button>
          <button
            onClick={() => canningUnlocked ? setActiveTab('canning') : null}
            disabled={!canningUnlocked}
            style={{
              padding: '0.75rem 1.5rem',
              background: canningUnlocked 
                ? (activeTab === 'canning' ? '#ff8503' : '#333')
                : '#666',
              color: canningUnlocked ? '#fff' : '#bbb',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              cursor: canningUnlocked ? 'pointer' : 'not-allowed',
              fontWeight: activeTab === 'canning' ? 'bold' : 'normal',
              fontSize: '1rem',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexDirection: 'column'
            }}
            title={canningUnlocked ? 'Canning System' : `Canning unlocks at ${Math.round(5000 - experience).toLocaleString()} more experience`}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <img src="./Canning.png" alt="Canning" style={{ width: '20px', height: '20px', objectFit: 'contain', opacity: canningUnlocked ? 1 : 0.5 }} />
              Canning
            </div>
            {!canningUnlocked && (
              <div style={{ fontSize: '0.7rem', color: '#999', marginTop: '2px' }}>
                Req: {Math.round(5000 - experience).toLocaleString()} exp
              </div>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default HeaderBar;
