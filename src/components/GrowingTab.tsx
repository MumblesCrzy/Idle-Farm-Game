import React from 'react';
import BaseTab from './BaseTab';
import ProgressBar from './ProgressBar';

// Type definitions
type AutoPurchaseConfig = {
  id: string;
  name: string;
  purchaseType: string;
  currencyType: 'money' | 'knowledge';
  cycleDays: number;
  owned: boolean;
  active: boolean;
  cost: number;
  timer: number;
};

type Veggie = {
  fertilizerMaxLevel: number;
  harvesterSpeedLevel?: number;
  harvesterSpeedCost?: number;
  name: string;
  growth: number;
  growthRate: number;
  stash: number;
  unlocked: boolean;
  experience: number;
  experienceToUnlock: number;
  fertilizerLevel: number;
  fertilizerCost: number;
  harvesterOwned: boolean;
  harvesterCost: number;
  harvesterTimer: number;
  salePrice: number;
  betterSeedsLevel: number;
  betterSeedsCost: number;
  additionalPlotLevel: number;
  additionalPlotCost: number;
  autoPurchasers: AutoPurchaseConfig[];
  sellEnabled: boolean;
};

interface GrowingTabProps {
  veggies: Veggie[];
  activeVeggie: number;
  totalPlotsUsed: number;
  maxPlots: number;
  money: number;
  knowledge: number;
  experience: number;
  day: number;
  globalAutoPurchaseTimer: number;
  autoSellOwned: boolean;
  season: string;
  currentWeather: string;
  greenhouseOwned: boolean;
  irrigationOwned: boolean;
  heirloomOwned: boolean;
  almanacLevel: number;
  almanacCost: number;
  irrigationCost: number;
  irrigationKnCost: number;
  heirloomMoneyCost: number;
  heirloomKnowledgeCost: number;
  highestUnlockedVeggie: number;
  farmTier: number;
  MERCHANT_DAYS: number;
  MERCHANT_COST: number;
  MERCHANT_KN_COST: number;
  GREENHOUSE_COST_PER_PLOT: number;
  GREENHOUSE_KN_COST_PER_PLOT: number;
  HEIRLOOM_COST_PER_VEGGIE: number;
  HEIRLOOM_KN_PER_VEGGIE: number;
  initialVeggies: Veggie[];
  veggieSeasonBonuses: Record<string, string[]>;
  daysToGrow: number;
  growthMultiplier: number;
  setActiveVeggie: (index: number) => void;
  handleHarvest: () => void;
  handleToggleSell: (index: number) => void;
  handleSell: () => void;
  handleBuyFertilizer: (index: number) => void;
  handleBuyHarvester: (index: number) => void;
  handleBuyBetterSeeds: (index: number) => void;
  handleBuyAdditionalPlot: (index: number) => void;
  handleBuyHarvesterSpeed: (index: number) => void;
  handleBuyAutoPurchaser: (autoPurchaseId: string) => (index: number) => void;
  handleBuyAlmanac: () => void;
  handleBuyIrrigation: () => void;
  handleBuyAutoSell: () => void;
  handleBuyGreenhouse: () => void;
  handleBuyHeirloom: () => void;
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

// Component definitions
interface AutoPurchaserButtonProps {
  autoPurchaser: AutoPurchaseConfig;
  money: number;
  knowledge: number;
  description: string;
  onPurchase: () => void;
  forceDisabled?: boolean;
}

function AutoPurchaserButton({ autoPurchaser, money, knowledge, description, onPurchase, forceDisabled = false }: AutoPurchaserButtonProps) {
  const canAfford = autoPurchaser.currencyType === 'money' 
    ? money >= autoPurchaser.cost 
    : knowledge >= autoPurchaser.cost;
  
  const currencySymbol = autoPurchaser.currencyType === 'money' ? '$' : '';
  const currencyUnit = autoPurchaser.currencyType === 'knowledge' ? 'Kn' : '';
  
  const getButtonStyle = () => {
    if (!autoPurchaser.owned && (!canAfford || forceDisabled)) {
      return {
        padding: '0.4rem 0.6rem',
        backgroundColor: '#aaa',
        color: '#fff',
        border: 'none',
        borderRadius: '3px',
        cursor: 'not-allowed',
        minWidth: '40px',
        minHeight: '45px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      };
    } else if (!autoPurchaser.owned && canAfford) {
      return {
        padding: '0.4rem 0.6rem',
        backgroundColor: '#666',
        color: '#fff',
        border: '2px solid #ffeb3b',
        borderRadius: '3px',
        cursor: 'pointer',
        minWidth: '40px',
        minHeight: '45px',
        boxShadow: '0 0 6px 1px #ffe066',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      };
    } else if (autoPurchaser.owned && autoPurchaser.active) {
      return {
        padding: '0.4rem 0.6rem',
        backgroundColor: '#2e7d32',
        color: '#fff',
        border: 'none',
        borderRadius: '3px',
        cursor: 'pointer',
        minWidth: '40px',
        minHeight: '45px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      };
    } else {
      return {
        padding: '0.4rem 0.6rem',
        backgroundColor: '#8a2424ff',
        color: '#fff',
        border: 'none',
        borderRadius: '3px',
        cursor: 'pointer',
        minWidth: '40px',
        minHeight: '45px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      };
    }
  };

  const getTooltip = () => {
    const baseName = autoPurchaser.name;
    
    if (!autoPurchaser.owned && forceDisabled) {
      return `${baseName}: Cannot purchase - You've reached your maximum plot limit. Expand your farm to unlock more plots.`;
    }
    
    const costDisplay = !autoPurchaser.owned 
      ? `Cost: ${currencySymbol}${autoPurchaser.cost}${currencyUnit}` 
      : autoPurchaser.active 
        ? 'Currently ON - Click to turn OFF' 
        : 'Currently OFF - Click to turn ON';
    
    return `${baseName}: ${description}. ${costDisplay}`;
  };

  const getImageSrc = () => {
    return `./${autoPurchaser.name}.png`;
  };

  const getImageAlt = () => {
    if (!autoPurchaser.owned) {
      return autoPurchaser.name;
    }
    return autoPurchaser.active ? `${autoPurchaser.name} ON` : `${autoPurchaser.name} OFF`;
  };

  const getImageStyle = () => {
    const baseStyle = { width: '2.5em', height: '2.5em', objectFit: 'contain' as const };
    if (autoPurchaser.owned && !autoPurchaser.active) {
      return { ...baseStyle, opacity: 0.5 };
    }
    return baseStyle;
  };

  const isDisabled = !autoPurchaser.owned && (!canAfford || forceDisabled);

  return (
    <button
      title={getTooltip()}
      style={getButtonStyle()}
      onClick={onPurchase}
      disabled={isDisabled}
    >
      <img 
        src={getImageSrc()} 
        alt={getImageAlt()} 
        style={getImageStyle()} 
      />
    </button>
  );
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
  isOwned?: boolean;
  isMaxLevel?: boolean;
  level?: number;
  flex?: boolean;
  effect?: string;
  knowledgeCost?: number; // Add optional knowledge cost for dual-cost items
}

function UpgradeButton({ 
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
  knowledgeCost
}: UpgradeButtonProps) {
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
                `$${cost} & ${knowledgeCost} Kn` : 
                (currencyType === 'money' ? `$${cost}` : `${cost} Kn`)
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
}

const GrowingTab: React.FC<GrowingTabProps> = (props) => {
  const {
    veggies,
    activeVeggie,
    totalPlotsUsed,
    maxPlots,
    money,
    knowledge,
    experience,
    day,
    globalAutoPurchaseTimer,
    autoSellOwned,
    heirloomOwned,
    almanacLevel,
    almanacCost,
    irrigationOwned,
    irrigationCost,
    irrigationKnCost,
    greenhouseOwned,
    heirloomMoneyCost,
    heirloomKnowledgeCost,
    highestUnlockedVeggie,
    MERCHANT_DAYS,
    MERCHANT_COST,
    MERCHANT_KN_COST,
    GREENHOUSE_COST_PER_PLOT,
    GREENHOUSE_KN_COST_PER_PLOT,
    HEIRLOOM_COST_PER_VEGGIE,
    HEIRLOOM_KN_PER_VEGGIE,
    initialVeggies,
    veggieSeasonBonuses,
    daysToGrow,
    growthMultiplier,
    setActiveVeggie,
    handleHarvest,
    handleToggleSell,
    handleSell,
    handleBuyFertilizer,
    handleBuyHarvester,
    handleBuyBetterSeeds,
    handleBuyAdditionalPlot,
    handleBuyHarvesterSpeed,
    handleBuyAutoPurchaser,
    handleBuyAlmanac,
    handleBuyIrrigation,
    handleBuyAutoSell,
    handleBuyGreenhouse,
    handleBuyHeirloom,
    formatNumber
  } = props;

  // Main growing content
  const mainContent = (
    <>
      {/* Growing Experience Display */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.5rem', 
        marginBottom: '1rem',
        padding: '0.5rem',
        backgroundColor: '#f0f8ff',
        border: '1px solid #4CAF50',
        borderRadius: '8px'
      }}>
        <img src="./Experience.png" alt="Growing Experience" style={{ width: 22, height: 22, verticalAlign: 'middle' }} />
        <span style={{ fontWeight: 'bold', color: '#2e7d32' }}>
          Growing Experience: {experience.toFixed(2)}
        </span>
      </div>

      {/* Veggie Selection */}
      <div className="veggie-selector">
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'nowrap',
            gap: '0.5rem',
            overflowX: 'auto',
            fontSize: '0.9rem',
            marginLeft: '-0.5rem',
            marginRight: '-0.5rem',
            minWidth: 0,
          }}
        >
          {veggies.map((v, i) => (
            v.unlocked ? (
              <button
                key={v.name}
                className={[ 
                  i === activeVeggie ? 'active' : '',
                  v.growth >= 100 ? 'ready' : ''
                ].filter(Boolean).join(' ')}
                onClick={() => setActiveVeggie(i)}
                aria-label={`Select ${v.name}`}
                disabled={i === activeVeggie}
                style={{ minWidth: '96px' }}
              >
                {v.name}
              </button>
            ) : (
              <button 
                key={v.name} 
                disabled 
                aria-label={`Locked veggie`} 
                style={{ minWidth: '96px' }}
                title={totalPlotsUsed >= maxPlots ? 'You need to expand your farm to unlock more vegetables' : `Requires ${i > 0 ? veggies[i].experienceToUnlock : v.experienceToUnlock} experience to unlock`}
              >
                {totalPlotsUsed >= maxPlots ? (
                  <span style={{ color: '#e44', fontWeight: 'bold' }}>Need Larger Farm</span>
                ) : (
                  `Exp: ${i > 0 ? veggies[i].experienceToUnlock : v.experienceToUnlock}`
                )}
              </button>
            )
          ))}
        </div>
      </div>
      <div style={{ marginBottom: '1rem' }} />
      
      {/* Veggie Panel */}
      <div className="veggie-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <img
              title={`Bonus Growth: ${veggieSeasonBonuses[veggies[activeVeggie].name]}`}
              src={`./${veggies[activeVeggie].name}.png`}
              alt={veggies[activeVeggie].name}
              style={{ width: '1.5em', height: '1.5em', objectFit: 'contain', marginRight: 'auto', verticalAlign: 'middle' }}
            />
            {veggies[activeVeggie].name}
            {!veggies[activeVeggie].sellEnabled && (
              <span style={{ 
                fontSize: '0.8rem', 
                color: '#f44336', 
                fontWeight: 'bold',
                backgroundColor: '#ffebee',
                padding: '2px 6px',
                borderRadius: '12px',
                border: '1px solid #f44336'
              }} title="This vegetable is set to stockpile (won't auto-sell)">
                🚫 HOLD
              </span>
            )}
            <span style={{ fontWeight: 'bold', color: '#2e7d32', fontSize: '1.1rem' }}>${veggies[activeVeggie].salePrice}</span>
            <span style={{ fontSize: '1rem', fontWeight: 'normal', color: '#888' }}>
              (~{daysToGrow} days to grow)
            </span>
          </h2>
          <button
            onClick={handleHarvest}
            disabled={veggies[activeVeggie].growth < 100}
            aria-label={`Harvest ${veggies[activeVeggie].name}`}
            style={{ marginLeft: 'auto', fontSize: '1rem', padding: '4px 14px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '5px', minWidth: '90px', cursor: veggies[activeVeggie].growth < 100 ? 'not-allowed' : 'pointer' }}
          >
            {veggies[activeVeggie].growth < 100 ? 'Growing...' : 'Harvest'}
          </button>
          <button
            onClick={() => handleToggleSell(activeVeggie)}
            style={{
              marginLeft: '0.5rem',
              fontSize: '1rem',
              padding: '4px 14px',
              background: veggies[activeVeggie].sellEnabled ? '#4CAF50' : '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              minWidth: '90px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
            title={veggies[activeVeggie].sellEnabled ? 'Sell enabled (click to disable and stockpile)' : 'Sell disabled (click to enable selling)'}
          >
            {veggies[activeVeggie].sellEnabled ? '💰 Sell' : '🚫 Hold'}
          </button>
        </div>
        
        {/* Progress Bars */}
        <div 
          style={{ position: 'relative', width: '100%', marginTop: '0.5rem', marginBottom: '0.5rem', height: '22px' }}
          title={`Growth Progress: ${Math.max(0, Math.ceil((100 - veggies[activeVeggie].growth) / growthMultiplier))} seconds until grown`}
        >
          <ProgressBar value={veggies[activeVeggie].growth} max={100} height={22} />
          <span style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            color: '#222',
            fontSize: '1rem',
            pointerEvents: 'none',
            userSelect: 'none',
          }}>
            {`${Math.floor(veggies[activeVeggie].growth)}%`}
          </span>
        </div>
        
        {/* Auto Harvester Progress Bar */}
        {veggies[activeVeggie].harvesterOwned && (
          <div 
            style={{ position: 'relative', width: '100%', marginTop: '0.25rem', height: '22px' }}
            title={`Auto Harvester: ${Math.max(1, Math.round(50 / (1 + (veggies[activeVeggie].harvesterSpeedLevel ?? 0) * 0.05))) - veggies[activeVeggie].harvesterTimer} seconds until next harvest attempt`}
          >
            <ProgressBar
              value={veggies[activeVeggie].harvesterTimer}
              max={Math.max(1, Math.round(50 / (1 + (veggies[activeVeggie].harvesterSpeedLevel ?? 0) * 0.05)))}
              color="#627beeff"
              height={22}
            />
            <span style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              color: '#222',
              fontSize: '1rem',
              pointerEvents: 'none',
              userSelect: 'none',
            }}>
              {`${Math.floor(
                (veggies[activeVeggie].harvesterTimer /
                Math.max(1, Math.round(50 / (1 + (veggies[activeVeggie].harvesterSpeedLevel ?? 0) * 0.05)))) * 100
              )}%`}
            </span>
          </div>
        )}
        
        <br />
        
        {/* Upgrades Grid */}
        <div style={{
          marginTop: '1rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1rem',
          alignItems: 'start',
          maxWidth: '700px'
        }}>
          {/* Fertilizer */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem' }}>
              <UpgradeButton
                title={veggies[activeVeggie].fertilizerLevel >= veggies[activeVeggie].fertilizerMaxLevel
                  ? 'Fertilizer: MAX Level Reached'
                  : `Fertilizer: +5% growth speed - Cost: $${veggies[activeVeggie].fertilizerCost}`}
                imageSrc="./Fertilizer.png"
                imageAlt="Fertilizer"
                buttonText="Fertilizer"
                money={money}
                knowledge={knowledge}
                cost={veggies[activeVeggie].fertilizerCost}
                currencyType="money"
                onClick={() => handleBuyFertilizer(activeVeggie)}
                disabled={money < veggies[activeVeggie].fertilizerCost || veggies[activeVeggie].fertilizerLevel >= veggies[activeVeggie].fertilizerMaxLevel}
                isMaxLevel={veggies[activeVeggie].fertilizerLevel >= veggies[activeVeggie].fertilizerMaxLevel}
                level={veggies[activeVeggie].fertilizerLevel}
                flex={true}
                effect={`Growth rate: ${veggies[activeVeggie].fertilizerLevel > 0 ? `+${(veggies[activeVeggie].fertilizerLevel * 5)}%` : '+0%'}`}
              />
              <AutoPurchaserButton
                autoPurchaser={veggies[activeVeggie].autoPurchasers.find(ap => ap.id === 'assistant')!}
                money={money}
                knowledge={knowledge}
                description="Auto-purchases fertilizer every 7 days"
                onPurchase={() => handleBuyAutoPurchaser('assistant')(activeVeggie)}
              />
            </div>
          </div>
          
          {/* Better Seeds */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem' }}>
              <UpgradeButton
                title={`Better Seeds: +${heirloomOwned ? 50 : 25}% sale price - Cost: ${veggies[activeVeggie].betterSeedsCost}Kn`}
                imageSrc="./Better Seeds.png"
                imageAlt="Better Seeds"
                buttonText="Better Seeds"
                money={money}
                knowledge={knowledge}
                cost={veggies[activeVeggie].betterSeedsCost}
                currencyType="knowledge"
                onClick={() => handleBuyBetterSeeds(activeVeggie)}
                disabled={knowledge < veggies[activeVeggie].betterSeedsCost}
                level={veggies[activeVeggie].betterSeedsLevel}
                flex={true}
                effect={`Sale price: ${veggies[activeVeggie].betterSeedsLevel > 0 ? `+${Math.round(((heirloomOwned ? 1.5 : 1.25) ** veggies[activeVeggie].betterSeedsLevel - 1) * 100)}%` : '+0%'}`}
              />
              <AutoPurchaserButton
                autoPurchaser={veggies[activeVeggie].autoPurchasers.find(ap => ap.id === 'cultivator')!}
                money={money}
                knowledge={knowledge}
                description="Auto-purchases better seeds every 7 days"
                onPurchase={() => handleBuyAutoPurchaser('cultivator')(activeVeggie)}
              />
            </div>
          </div>
          
          {/* Additional Plot */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem' }}>
              <UpgradeButton
                title={totalPlotsUsed >= maxPlots ? 'Max Plots Reached' : `Additional Plot: +1 veggie/harvest - Cost: $${veggies[activeVeggie].additionalPlotCost}`}
                imageSrc="./Additional Plot.png"
                imageAlt="Additional Plot"
                buttonText="Additional Plot"
                money={money}
                knowledge={knowledge}
                cost={veggies[activeVeggie].additionalPlotCost}
                currencyType="money"
                onClick={() => handleBuyAdditionalPlot(activeVeggie)}
                disabled={money < veggies[activeVeggie].additionalPlotCost || totalPlotsUsed >= maxPlots}
                isMaxLevel={totalPlotsUsed >= maxPlots}
                level={veggies[activeVeggie].additionalPlotLevel}
                flex={true}
                effect={`Extra veggies per harvest: +${veggies[activeVeggie].additionalPlotLevel}`}
              />
              <AutoPurchaserButton
                autoPurchaser={veggies[activeVeggie].autoPurchasers.find(ap => ap.id === 'surveyor')!}
                money={money}
                knowledge={knowledge}
                description="Auto-purchases additional plot every 7 days"
                onPurchase={() => handleBuyAutoPurchaser('surveyor')(activeVeggie)}
                forceDisabled={totalPlotsUsed >= maxPlots}
              />
            </div>             
          </div>
          
          {/* Auto Harvester */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginTop: '0.5rem' }}>
            <UpgradeButton
              title={veggies[activeVeggie].harvesterOwned ? 'Purchased' : `Auto Harvester - Cost: $${veggies[activeVeggie].harvesterCost}`}
              imageSrc="./Auto Harvester.png"
              imageAlt="Auto Harvester"
              buttonText="Auto Harvester"
              money={money}
              knowledge={knowledge}
              cost={veggies[activeVeggie].harvesterCost}
              currencyType="money"
              onClick={() => handleBuyHarvester(activeVeggie)}
              disabled={veggies[activeVeggie].harvesterOwned || money < veggies[activeVeggie].harvesterCost}
              isOwned={veggies[activeVeggie].harvesterOwned}
              effect="Auto-harvests when ready"
            />
          </div>
          
          {/* Harvester Speed */}
          {veggies[activeVeggie].harvesterOwned && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem' }}>
                <UpgradeButton
                  title={`Harvester Speed: +5% speed - Cost: $${veggies[activeVeggie].harvesterSpeedCost}`}
                  imageSrc="./Harvester Speed.png"
                  imageAlt="Harvester Speed"
                  buttonText="Harvester Speed"
                  money={money}
                  knowledge={knowledge}
                  cost={veggies[activeVeggie].harvesterSpeedCost ?? 50}
                  currencyType="money"
                  onClick={() => handleBuyHarvesterSpeed(activeVeggie)}
                  disabled={money < (veggies[activeVeggie].harvesterSpeedCost ?? 50)}
                  level={veggies[activeVeggie].harvesterSpeedLevel ?? 0}
                  flex={true}
                  effect={`Harvest time: ${(veggies[activeVeggie].harvesterSpeedLevel ?? 0) > 0 ? `${Math.round(50 / (1 + (veggies[activeVeggie].harvesterSpeedLevel ?? 0) * 0.05))}s` : '50s'}`}
                />
                <AutoPurchaserButton
                  autoPurchaser={veggies[activeVeggie].autoPurchasers.find(ap => ap.id === 'mechanic')!}
                  money={money}
                  knowledge={knowledge}
                  description="Auto-purchases Harvester Speed every 7 days"
                  onPurchase={() => handleBuyAutoPurchaser('mechanic')(activeVeggie)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Progress Bars and Sell Button */}
      <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {/* Auto-Purchase Progress Bar */}
        {(() => {
          const activeAutoPurchasers = veggies[activeVeggie].autoPurchasers.filter(ap => ap.owned && ap.active);
          if (activeAutoPurchasers.length === 0) return null;
          
          return (
            <div style={{ width: '100%', marginBottom: '0.25rem' }}>
              <span style={{ color: '#2e7d32', fontWeight: 'bold', fontSize: '0.85rem' }}>
                Auto-Purchase: {7 - globalAutoPurchaseTimer} days
              </span>
              <div style={{ position: 'relative', width: '100%', height: '12px', marginTop: '0.1rem' }}>
                <ProgressBar value={globalAutoPurchaseTimer} max={7} height={12} color="#4caf50" />
                <span style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  color: '#222',
                  fontSize: '0.75rem',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}>{Math.floor((globalAutoPurchaseTimer / 7) * 100)}%</span>
              </div>
            </div>
          );
        })()}
        
        {/* Sell All Button */}
        <button
          onClick={handleSell}
          disabled={veggies.every((v) => !v.sellEnabled || v.stash === 0)}
          aria-label="Sell all veggies (only those marked for selling)"
        >
          {veggies.every((v) => !v.sellEnabled || v.stash === 0) ? 'No sellable veggies' : 'Sell All'}  (${formatNumber(veggies.reduce((sum, v) => v.sellEnabled ? sum + v.stash * v.salePrice : sum, 0), 2)})
        </button>
      </div>
    </>
  );

  // Farm upgrades sidebar content
  const sidebarContent = (
    <>
      <h2 style={{ textAlign: 'center', color: '#2e7d32', marginBottom: '1rem' }}>Upgrades</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Farmer's Almanac */}
        <div>
          <UpgradeButton
            title="Each level increases all veggie sale prices by 10%"
            imageSrc="./Farmer's Almanac.png"
            imageAlt="Farmer's Almanac"
            buttonText="Almanac"
            money={money}
            knowledge={knowledge}
            cost={almanacCost}
            currencyType="money"
            onClick={handleBuyAlmanac}
            disabled={money < almanacCost}
            level={almanacLevel}
            effect={almanacLevel > 0 ? `Knowledge gain: +${(almanacLevel * 10)}%` : '+0%'}
          />
        </div>

        {/* Irrigation */}
        <div>
          <UpgradeButton
            title="Negates drought penalty and provides +15% growth rate bonus."
            imageSrc="./Irrigation.png"
            imageAlt="Irrigation"
            buttonText="Irrigation"
            money={money}
            knowledge={knowledge}
            cost={irrigationCost}
            currencyType="money"
            knowledgeCost={irrigationKnCost}
            onClick={handleBuyIrrigation}
            disabled={irrigationOwned || money < irrigationCost || knowledge < irrigationKnCost}
            isOwned={irrigationOwned}
            effect="+15% growth rate, drought immunity"
          />
        </div>

        {/* Merchant */}
        <div>
          <UpgradeButton
            title={`Sells all veggies in your stash every ${MERCHANT_DAYS} days.`}
            imageSrc="./Merchant.png"
            imageAlt="Merchant"
            buttonText="Merchant"
            money={money}
            knowledge={knowledge}
            cost={MERCHANT_COST}
            currencyType="money"
            knowledgeCost={MERCHANT_KN_COST}
            onClick={handleBuyAutoSell}
            disabled={autoSellOwned || money < MERCHANT_COST || knowledge < MERCHANT_KN_COST}
            isOwned={autoSellOwned}
            effect={`Auto-sells every ${MERCHANT_DAYS} days`}
          />
        </div>

        {/* Greenhouse */}
        <div>
          <UpgradeButton
            title={`Negates winter growth penalty. Cost is based max plots for your current farm: (${maxPlots} × $${formatNumber(GREENHOUSE_COST_PER_PLOT, 1)} & ${maxPlots} x ${formatNumber(GREENHOUSE_KN_COST_PER_PLOT, 1)} Kn).`}
            imageSrc="./Greenhouse.png"
            imageAlt="Greenhouse"
            buttonText="Greenhouse"
            money={money}
            knowledge={knowledge}
            cost={GREENHOUSE_COST_PER_PLOT * maxPlots}
            currencyType="money"
            knowledgeCost={GREENHOUSE_KN_COST_PER_PLOT * maxPlots}
            onClick={handleBuyGreenhouse}
            disabled={greenhouseOwned || money < (GREENHOUSE_COST_PER_PLOT * maxPlots) || knowledge < (GREENHOUSE_KN_COST_PER_PLOT * maxPlots)}
            isOwned={greenhouseOwned}
            effect={'Winter immunity'}
          />
        </div>

        {/* Heirloom Seeds */}
        <div>
          <UpgradeButton
            title={`Doubles the effect of Better Seeds. Cost is based on your highest unlocked veggie ever: ${initialVeggies[highestUnlockedVeggie]?.name || 'Radish'} (${highestUnlockedVeggie + 1} × $${formatNumber(HEIRLOOM_COST_PER_VEGGIE, 1)} & ${highestUnlockedVeggie + 1} × ${formatNumber(HEIRLOOM_KN_PER_VEGGIE, 1)} Kn).`}
            imageSrc="./Heirloom Seeds.png"
            imageAlt="Heirloom Seeds"
            buttonText="Heirloom Seeds"
            money={money}
            knowledge={knowledge}
            cost={heirloomMoneyCost}
            currencyType="money"
            knowledgeCost={heirloomKnowledgeCost}
            onClick={handleBuyHeirloom}
            disabled={heirloomOwned || money < heirloomMoneyCost || knowledge < heirloomKnowledgeCost}
            isOwned={heirloomOwned}
            effect={'Doubles the effect of Better Seeds'}
          />
        </div>

        {autoSellOwned && (
            <div style={{ width: '100%', marginBottom: '0.25rem' }}>
              <span style={{ color: '#2e7d32', fontWeight: 'bold', fontSize: '0.85rem' }}>Merchant: Next sale in {MERCHANT_DAYS - (day % MERCHANT_DAYS)} days</span>
              <div style={{ position: 'relative', width: '100%', height: '12px', marginTop: '0.1rem' }}>
                <ProgressBar value={day % MERCHANT_DAYS} max={MERCHANT_DAYS} height={12} color="#ffb300" />
                <span style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  color: '#222',
                  fontSize: '0.75rem',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}>{Math.floor((day % MERCHANT_DAYS) / MERCHANT_DAYS * 100)}%</span>
              </div>
            </div>
        )}
      </div>
    </>
  );

  // Custom sidebar styling for growing tab
  const sidebarStyle = {
    background: '#81b886ff',
    border: '1px solid #cceccc',
    boxShadow: '0 2px 8px #e0ffe0'
  };

  return (
    <BaseTab
      isUnlocked={true} // Growing tab is always unlocked
      mainContent={mainContent}
      sidebarContent={sidebarContent}
      sidebarStyle={sidebarStyle}
    />
  );
};

export default GrowingTab;