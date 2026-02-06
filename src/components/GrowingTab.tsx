import { memo, type FC } from 'react';
import BaseTab from './BaseTab';
import ProgressBar from './ProgressBar';
import UpgradeButton from './UpgradeButton';
import GlobalUpgradesPanel from './GlobalUpgradesPanel';
import type { Veggie, AutoPurchaseConfig } from '../types/game';
import type { GuildState } from '../types/guilds';
import { 
  getVeggieImage, 
  getAutoPurchaserImage, 
  ICON_EXPERIENCE,
  ICON_BEE,
  UPGRADE_FERTILIZER, 
  UPGRADE_BETTER_SEEDS, 
  UPGRADE_ADDITIONAL_PLOT, 
  UPGRADE_AUTO_HARVESTER, 
  UPGRADE_HARVESTER_SPEED 
} from '../config/assetPaths';
import { GROWTH_COMPLETE_THRESHOLD } from '../config/gameConstants';
import { 
  getGrowersGrowthBonus, 
  getGrowersPriceBonus, 
  isCommittedTo,
  getGrowersManualHarvestBonus,
  getBlessedCropChance,
  getGrowersBeePollinationBonus,
  applyGuildPriceBonuses,
  hasFruitCultivation,
  getUpgradeLevel
} from '../utils/guildCalculations';
import styles from './GrowingTab.module.css';

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
  beeYieldBonus: number;
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
  handleToggleAutoHarvester: (index: number) => void;
  handleSell: () => void;
  handleRitualHarvestAll: () => void;
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
  guildState?: GuildState;
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
    return getAutoPurchaserImage(autoPurchaser.name);
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

const GrowingTab: FC<GrowingTabProps> = memo((props) => {
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
    // farmTier, // Unused
    beeYieldBonus,
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
    handleToggleAutoHarvester,
    handleSell,
    handleRitualHarvestAll,
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
    formatNumber,
    guildState
  } = props;

  const ritualHarvestCost = 5;
  const ritualCirclesUnlocked = !!guildState && isCommittedTo(guildState, 'growers') && getUpgradeLevel(guildState, 'growers_ritual_circles') > 0;
  const ritualSigils = guildState?.guildCurrencies?.growers ?? 0;
  const hasReadyCrops = veggies.some(v => v.growth >= GROWTH_COMPLETE_THRESHOLD);
  const canRitualHarvest = ritualCirclesUnlocked && ritualSigils >= ritualHarvestCost && hasReadyCrops;

  // Main growing content
  const mainContent = (
    <>
      {/* Experience Display */}
      <div className={styles.experienceDisplay}>
        <img src={ICON_EXPERIENCE} alt="" aria-hidden="true" className={styles.experienceIcon} />
        <span className={styles.experienceText}>
          Growing Experience: {formatNumber(experience, 2)}
        </span>
      </div>

      {/* Guild Bonuses Indicator (only show if committed to Growers) */}
      {guildState && isCommittedTo(guildState, 'growers') && (
        <div className={styles.guildBonusesIndicator}>
          <span className={styles.guildBonusesTitle}>🌱 Growers Guild</span>
          <div className={styles.guildBonusesList}>
            {getGrowersGrowthBonus(guildState) > 0 && (
              <span className={styles.guildBonus} title="Growth Speed Bonus from Guild Upgrades">
                +{Math.round(getGrowersGrowthBonus(guildState) * 100)}% Growth
              </span>
            )}
            {getGrowersPriceBonus(guildState) > 0 && (
              <span className={styles.guildBonus} title="Sale Price Bonus from Guild Upgrades">
                +{Math.round(getGrowersPriceBonus(guildState) * 100)}% Price
              </span>
            )}
            {getGrowersManualHarvestBonus(guildState) > 0 && (
              <span className={styles.guildBonus} title="Manual Harvest Bonus">
                +{getGrowersManualHarvestBonus(guildState)} Manual
              </span>
            )}
            {getBlessedCropChance(guildState) > 0 && (
              <span className={styles.guildBonus} title="Blessed Crop Chance (Double Yield)">
                {Math.round(getBlessedCropChance(guildState) * 100)}% Blessed
              </span>
            )}
            {getGrowersBeePollinationBonus(guildState) > 0 && (
              <span className={styles.guildBonus} title="Bee Pollination Synergy">
                +{Math.round(getGrowersBeePollinationBonus(guildState) * 100)}% Bees
              </span>
            )}
          </div>
        </div>
      )}

      {/* Veggie Selection */}
      <div className="veggie-selector">
        {/* Vegetables Row */}
        <div className={styles.veggieSelectorContainer}>
          {veggies.filter(v => v.cropType !== 'fruit').map((v) => {
            // Find the actual index in the full veggies array
            const actualIndex = veggies.findIndex(veg => veg.name === v.name);
            return v.unlocked ? (
              <button
                key={v.name}
                className={`${styles.veggieSelectorButton} ${v.growth >= GROWTH_COMPLETE_THRESHOLD ? styles.veggieSelectorButtonReady : ''}`}
                onClick={() => setActiveVeggie(actualIndex)}
                aria-label={`${v.name}. Growth: ${Math.floor(v.growth)}%. Stash: ${v.stash}${actualIndex === activeVeggie ? '. Currently selected' : ''}`}
                aria-current={actualIndex === activeVeggie ? 'true' : undefined}
                disabled={actualIndex === activeVeggie}
              >
                {v.name}
              </button>
            ) : (
              <button 
                key={v.name} 
                disabled 
                aria-label={totalPlotsUsed >= maxPlots 
                  ? `${v.name}. Locked. You need to expand your farm to unlock more vegetables`
                  : `${v.name}. Locked. Requires ${v.experienceToUnlock} experience to unlock`
                }
                className={styles.veggieSelectorButton}
                title={totalPlotsUsed >= maxPlots ? 'You need to expand your farm to unlock more vegetables' : `Requires ${v.experienceToUnlock} experience to unlock`}
              >
                {totalPlotsUsed >= maxPlots ? (
                  <span className={styles.needLargerFarm}>Need Larger Farm</span>
                ) : (
                  `Exp: ${v.experienceToUnlock}`
                )}
              </button>
            );
          })}
        </div>
        
        {/* Fruits Row - Only shown if Fruit Cultivation is unlocked */}
        {guildState && hasFruitCultivation(guildState) && (
          <>
            <div className={styles.fruitRowLabel}></div>
            <div className={styles.veggieSelectorContainer}>
              {veggies.filter(v => v.cropType === 'fruit').map((v) => {
                const actualIndex = veggies.findIndex(veg => veg.name === v.name);
                return v.unlocked ? (
                  <button
                    key={v.name}
                    className={`${styles.veggieSelectorButton} ${styles.fruitButton} ${v.growth >= GROWTH_COMPLETE_THRESHOLD ? styles.veggieSelectorButtonReady : ''}`}
                    onClick={() => setActiveVeggie(actualIndex)}
                    aria-label={`${v.name}. Growth: ${Math.floor(v.growth)}%. Stash: ${v.stash}${actualIndex === activeVeggie ? '. Currently selected' : ''}`}
                    aria-current={actualIndex === activeVeggie ? 'true' : undefined}
                    disabled={actualIndex === activeVeggie}
                  >
                    {v.name}
                  </button>
                ) : (
                  <button 
                    key={v.name} 
                    disabled 
                    aria-label={totalPlotsUsed >= maxPlots 
                      ? `${v.name}. Locked. You need to expand your farm to unlock more fruits`
                      : `${v.name}. Locked. Requires ${v.experienceToUnlock} experience to unlock`
                    }
                    className={`${styles.veggieSelectorButton} ${styles.fruitButton}`}
                    title={totalPlotsUsed >= maxPlots ? 'You need to expand your farm to unlock more fruits' : `Requires ${formatNumber(v.experienceToUnlock, 0)} experience to unlock`}
                  >
                    {totalPlotsUsed >= maxPlots ? (
                      <span className={styles.needLargerFarm}>Need Larger Farm</span>
                    ) : (
                      `Exp: ${formatNumber(v.experienceToUnlock, 0)}`
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
      <div className={styles.spacer} />
      
      {/* Veggie Panel */}
      <div className="veggie-panel">
        <div className={styles.veggiePanelHeader}>
          <h2 className={styles.veggiePanelTitle}>
            <img
              title={`Bonus Growth: ${veggieSeasonBonuses[veggies[activeVeggie].name]}`}
              src={getVeggieImage(veggies[activeVeggie].name)}
              alt=""
              aria-hidden="true"
              className={styles.veggieImage}
            />
            {veggies[activeVeggie].name}
            {!veggies[activeVeggie].sellEnabled && (
              <span className={styles.stockpileBadge} title="This vegetable is set to stockpile (won't auto-sell)">
                🚫 HOLD
              </span>
            )}
            <span 
              className={styles.salePrice}
              title={guildState && getGrowersPriceBonus(guildState) > 0 
                ? `Base: $${formatNumber(veggies[activeVeggie].salePrice, 2)} + ${Math.round(getGrowersPriceBonus(guildState) * 100)}% guild bonus`
                : `Sale price per unit`}
            >
              ${formatNumber(guildState ? applyGuildPriceBonuses(veggies[activeVeggie].salePrice, guildState, false) : veggies[activeVeggie].salePrice, 2)}
            </span>
            {beeYieldBonus > 0 && (
              <span style={{
                fontSize: '0.75rem',
                padding: '0.15rem 0.35rem',
                backgroundColor: '#fffbf0',
                border: '1px solid #FFD700',
                borderRadius: '3px',
                color: '#B8860B',
                marginLeft: '0.25rem',
                fontWeight: 'bold'
              }}>
                <img src={ICON_BEE} alt="Bee" style={{ width: '14px', height: '14px', marginRight: '2px', verticalAlign: 'middle' }} />+{formatNumber(beeYieldBonus * 100, 1)}%
              </span>
            )}
            <span className={styles.daysToGrow}>
              (~{daysToGrow} days to grow)
            </span>
          </h2>
          <button
            onClick={handleHarvest}
            disabled={veggies[activeVeggie].growth < 100}
            aria-label={`Harvest ${veggies[activeVeggie].name}`}
            className={styles.harvestButton}
            style={{ cursor: veggies[activeVeggie].growth < 100 ? 'not-allowed' : 'pointer' }}
          >
            {veggies[activeVeggie].growth < 100 ? 'Growing...' : 'Harvest'}
          </button>
          {ritualCirclesUnlocked && (
            <button
              onClick={handleRitualHarvestAll}
              className={styles.ritualHarvestButton}
              disabled={!canRitualHarvest}
              title={canRitualHarvest
                ? `Ritual Harvest: Spend ${ritualHarvestCost} sigils to harvest all ready crops`
                : ritualSigils < ritualHarvestCost
                  ? `Need ${ritualHarvestCost} sigils (you have ${ritualSigils})`
                  : 'No crops are ready to harvest'}
              aria-label={`Ritual harvest all ready crops for ${ritualHarvestCost} sigils`}
              style={{ cursor: canRitualHarvest ? 'pointer' : 'not-allowed' }}
            >
              🔮 Ritual Harvest ({ritualHarvestCost}✦)
            </button>
          )}
          <button
            onClick={() => handleToggleSell(activeVeggie)}
            className={veggies[activeVeggie].sellEnabled ? styles.sellButton : styles.holdButton}
            title={veggies[activeVeggie].sellEnabled ? 'Sell enabled (click to disable and stockpile)' : 'Sell disabled (click to enable selling)'}
            aria-label={veggies[activeVeggie].sellEnabled 
              ? `Auto-sell enabled for ${veggies[activeVeggie].name}. Click to disable and stockpile instead` 
              : `Auto-sell disabled for ${veggies[activeVeggie].name}. Click to enable and sell on harvest`}
            aria-pressed={veggies[activeVeggie].sellEnabled}
          >
            {veggies[activeVeggie].sellEnabled ? '💰 Sell' : '🚫 Hold'}
          </button>
        </div>
        
        {/* Progress Bars */}
        <div 
          className={styles.progressBarWrapper}
          title={`Growth Progress: ${Math.max(0, Math.ceil((100 - veggies[activeVeggie].growth) / growthMultiplier))} seconds until grown`}
        >
          <ProgressBar value={veggies[activeVeggie].growth} max={100} height={22} />
          <span className={styles.progressBarLabel}>
            {`${Math.floor(veggies[activeVeggie].growth)}%`}
          </span>
        </div>
        
        {/* Auto Harvester Progress Bar */}
        {veggies[activeVeggie].harvesterOwned && (
          <div className={styles.harvesterRow}>
            <div 
              className={`${styles.harvesterProgressWrapper} ${!veggies[activeVeggie].autoHarvesterEnabled ? styles.harvesterDisabled : ''}`}
              title={veggies[activeVeggie].autoHarvesterEnabled 
                ? `Auto Harvester: ${Math.max(1, Math.round(50 / (1 + (veggies[activeVeggie].harvesterSpeedLevel ?? 0) * 0.05))) - veggies[activeVeggie].harvesterTimer} seconds until next harvest attempt`
                : 'Auto Harvester: Disabled'}
            >
              <ProgressBar
                value={veggies[activeVeggie].harvesterTimer}
                max={Math.max(1, Math.round(50 / (1 + (veggies[activeVeggie].harvesterSpeedLevel ?? 0) * 0.05)))}
                color={veggies[activeVeggie].autoHarvesterEnabled ? "#5D76B1" : "#666"}
                height={22}
              />
              <span className={styles.progressBarLabel}>
                {veggies[activeVeggie].autoHarvesterEnabled 
                  ? `${Math.floor(
                      (veggies[activeVeggie].harvesterTimer /
                      Math.max(1, Math.round(50 / (1 + (veggies[activeVeggie].harvesterSpeedLevel ?? 0) * 0.05)))) * 100
                    )}%`
                  : 'OFF'}
              </span>
            </div>
          </div>
        )}
        
        <br />
        
        {/* Upgrades Grid */}
        <div className={styles.upgradesGrid}>
          {/* Fertilizer */}
          <div className={styles.upgradeColumn}>
            <div className={styles.upgradeRow}>
              <UpgradeButton
                title={veggies[activeVeggie].fertilizerLevel >= veggies[activeVeggie].fertilizerMaxLevel
                  ? 'Fertilizer: MAX Level Reached'
                  : `Fertilizer: +5% growth speed - Cost: $${formatNumber(veggies[activeVeggie].fertilizerCost, 1)}`}
                imageSrc={UPGRADE_FERTILIZER}
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
                formatNumber={formatNumber}
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
          <div className={styles.upgradeColumn}>
            <div className={styles.upgradeRow}>
              <UpgradeButton
                title={`Better Seeds: +${heirloomOwned ? 50 : 25}% sale price - Cost: ${formatNumber(veggies[activeVeggie].betterSeedsCost, 1)}Kn`}
                imageSrc={UPGRADE_BETTER_SEEDS}
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
                effect={`Sale price: ${veggies[activeVeggie].betterSeedsLevel > 0 ? `+${formatNumber(Math.round(((heirloomOwned ? 1.5 : 1.25) ** veggies[activeVeggie].betterSeedsLevel - 1) * 100), 2)}%` : '+0%'}`}
                formatNumber={formatNumber}
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
          <div className={styles.upgradeColumn}>
            <div className={styles.upgradeRow}>
              <UpgradeButton
                title={totalPlotsUsed >= maxPlots ? 'Max Plots Reached' : `Additional Plot: +1 veggie/harvest - Cost: $${formatNumber(veggies[activeVeggie].additionalPlotCost, 1)}`}
                imageSrc={UPGRADE_ADDITIONAL_PLOT}
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
                formatNumber={formatNumber}
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
          <div className={styles.upgradeColumnWithMargin}>
            <UpgradeButton
              title={veggies[activeVeggie].harvesterOwned 
                ? (veggies[activeVeggie].autoHarvesterEnabled 
                  ? 'Auto Harvester: Active (click to pause)' 
                  : 'Auto Harvester: Paused (click to resume)')
                : `Auto Harvester - Cost: $${formatNumber(veggies[activeVeggie].harvesterCost, 1)}`}
              imageSrc={UPGRADE_AUTO_HARVESTER}
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
              formatNumber={formatNumber}
              isTogglable={true}
              isActive={veggies[activeVeggie].autoHarvesterEnabled}
              onToggle={() => handleToggleAutoHarvester(activeVeggie)}
            />
          </div>
          
          {/* Harvester Speed */}
          {veggies[activeVeggie].harvesterOwned && (
            <div className={styles.upgradeColumn}>
              <div className={styles.upgradeRow}>
                <UpgradeButton
                  title={`Harvester Speed: +5% speed - Cost: $${formatNumber(veggies[activeVeggie].harvesterSpeedCost ?? 50, 1)}`}
                  imageSrc={UPGRADE_HARVESTER_SPEED}
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
                  formatNumber={formatNumber}
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
      <div className={styles.autoPurchaseSection}>
        {/* Auto-Purchase Progress Bar */}
        {(() => {
          const activeAutoPurchasers = veggies[activeVeggie].autoPurchasers.filter(ap => ap.owned && ap.active);
          if (activeAutoPurchasers.length === 0) return null;
          
          return (
            <div className={styles.autoPurchaseProgressContainer}>
              <span className={styles.autoPurchaseLabel}>
                Auto-Purchase: {7 - globalAutoPurchaseTimer} days
              </span>
              <div className={styles.autoPurchaseProgressWrapper}>
                <ProgressBar value={globalAutoPurchaseTimer} max={7} height={12} color="#4caf50" />
                <span className={styles.autoPurchaseProgressLabel}>{Math.floor((globalAutoPurchaseTimer / 7) * 100)}%</span>
              </div>
            </div>
          );
        })()}
        
        {/* Sell All Button */}
        <button
          className={styles.sellAllButton}
          onClick={handleSell}
          disabled={veggies.every((v) => !v.sellEnabled || v.stash === 0)}
          aria-label="Sell all veggies (only those marked for selling)"
        >
          {veggies.every((v) => !v.sellEnabled || v.stash === 0) ? 'No sellable veggies' : 'Sell All'}  (${formatNumber(veggies.reduce((sum, v) => v.sellEnabled ? sum + v.stash * (guildState ? applyGuildPriceBonuses(v.salePrice, guildState, false) : v.salePrice) : sum, 0), 2)})
        </button>
      </div>
    </>
  );

  // Farm upgrades sidebar content
  const sidebarContent = (
    <GlobalUpgradesPanel
      money={money}
      knowledge={knowledge}
      day={day}
      maxPlots={maxPlots}
      highestUnlockedVeggie={highestUnlockedVeggie}
      almanacLevel={almanacLevel}
      almanacCost={almanacCost}
      irrigationOwned={irrigationOwned}
      irrigationCost={irrigationCost}
      irrigationKnCost={irrigationKnCost}
      autoSellOwned={autoSellOwned}
      greenhouseOwned={greenhouseOwned}
      heirloomOwned={heirloomOwned}
      heirloomMoneyCost={heirloomMoneyCost}
      heirloomKnowledgeCost={heirloomKnowledgeCost}
      MERCHANT_DAYS={MERCHANT_DAYS}
      MERCHANT_COST={MERCHANT_COST}
      MERCHANT_KN_COST={MERCHANT_KN_COST}
      GREENHOUSE_COST_PER_PLOT={GREENHOUSE_COST_PER_PLOT}
      GREENHOUSE_KN_COST_PER_PLOT={GREENHOUSE_KN_COST_PER_PLOT}
      HEIRLOOM_COST_PER_VEGGIE={HEIRLOOM_COST_PER_VEGGIE}
      HEIRLOOM_KN_PER_VEGGIE={HEIRLOOM_KN_PER_VEGGIE}
      initialVeggies={initialVeggies}
      handleBuyAlmanac={handleBuyAlmanac}
      handleBuyIrrigation={handleBuyIrrigation}
      handleBuyAutoSell={handleBuyAutoSell}
      handleBuyGreenhouse={handleBuyGreenhouse}
      handleBuyHeirloom={handleBuyHeirloom}
      formatNumber={formatNumber}
    />
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
});

GrowingTab.displayName = 'GrowingTab';

export default GrowingTab;
