import InlineIcon from './InlineIcon';
import { memo, type FC, type ReactNode } from 'react';
import BaseTab from './BaseTab';
import ProgressBar from './ProgressBar';
import CropSelector from './CropSelector';
import CropHeader from './CropHeader';
import CropUpgradesGrid from './CropUpgradesGrid';
import type { Veggie } from '../types/game';
import type { GuildState } from '../types/guilds';
import { ICON_EXPERIENCE, GUILD_GROWERS } from '../config/assetPaths';
import { AUTO_PURCHASER_CYCLE_DAYS, GROWTH_COMPLETE_THRESHOLD } from '../config/gameConstants';
import {
  getGrowersGrowthBonus,
  getGrowersPriceBonus,
  isCommittedTo,
  getGrowersManualHarvestBonus,
  getBlessedCropChance,
  getGrowersBeePollinationBonus,
  applyGuildPriceBonuses,
  hasFruitCultivation
} from '../utils/guildCalculations';
import styles from './GrowingTab.module.css';

type CropHandler = (index: number) => void;

interface GrowingTabProps {
  veggies: Veggie[];
  activeVeggie: number;
  totalPlotsUsed: number;
  maxPlots: number;
  money: number;
  knowledge: number;
  experience: number;
  globalAutoPurchaseTimer: number;
  heirloomOwned: boolean;
  beeYieldBonus: number;
  daysToGrow: number;
  growthMultiplier: number;
  setActiveVeggie: (index: number) => void;
  handleHarvest: () => void;
  handleToggleSell: CropHandler;
  handleToggleAutoHarvester: CropHandler;
  handleSell: () => void;
  handleRitualHarvestAll: () => void;
  handleBuyFertilizer: CropHandler;
  handleBuyHarvester: CropHandler;
  handleBuyBetterSeeds: CropHandler;
  handleBuyAdditionalPlot: CropHandler;
  handleBuyHarvesterSpeed: CropHandler;
  handleBuyAutoPurchaser: (autoPurchaseId: string) => CropHandler;
  formatNumber: (num: number, decimalPlaces?: number) => string;
  guildState?: GuildState;
  /** Farm-wide upgrades, shown in the sidebar */
  upgradesSidebar: ReactNode;
}

/** Sidebar colors for the growing tab */
const SIDEBAR_STYLE = {
  background: '#81b886ff',
  border: '1px solid #cceccc',
  boxShadow: '0 2px 8px #e0ffe0'
};

/** Growers Guild bonuses, shown while committed to the guild */
const GrowersBonuses: FC<{ guildState: GuildState }> = ({ guildState }) => {
  const growthBonus = getGrowersGrowthBonus(guildState);
  const priceBonus = getGrowersPriceBonus(guildState);
  const manualBonus = getGrowersManualHarvestBonus(guildState);
  const blessedChance = getBlessedCropChance(guildState);
  const beeBonus = getGrowersBeePollinationBonus(guildState);

  return (
    <div className={styles.guildBonusesIndicator}>
      <span className={styles.guildBonusesTitle}><InlineIcon src={GUILD_GROWERS} size={18} gap={4} />Growers Guild</span>
      <div className={styles.guildBonusesList}>
        {growthBonus > 0 && (
          <span className={styles.guildBonus} title="Growth Speed Bonus from Guild Upgrades">
            +{Math.round(growthBonus * 100)}% Growth
          </span>
        )}
        {priceBonus > 0 && (
          <span className={styles.guildBonus} title="Sale Price Bonus from Guild Upgrades">
            +{Math.round(priceBonus * 100)}% Price
          </span>
        )}
        {manualBonus > 0 && (
          <span className={styles.guildBonus} title="Manual Harvest Bonus">
            +{manualBonus} Manual
          </span>
        )}
        {blessedChance > 0 && (
          <span className={styles.guildBonus} title="Blessed Crop Chance (Double Yield)">
            {Math.round(blessedChance * 100)}% Blessed
          </span>
        )}
        {beeBonus > 0 && (
          <span className={styles.guildBonus} title="Bee Pollination Synergy">
            +{Math.round(beeBonus * 100)}% Bees
          </span>
        )}
      </div>
    </div>
  );
};

const GrowingTab: FC<GrowingTabProps> = memo(({
  veggies,
  activeVeggie,
  totalPlotsUsed,
  maxPlots,
  money,
  knowledge,
  experience,
  globalAutoPurchaseTimer,
  heirloomOwned,
  beeYieldBonus,
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
  formatNumber,
  guildState,
  upgradesSidebar
}) => {
  const crop = veggies[activeVeggie];
  const farmFull = totalPlotsUsed >= maxPlots;
  const hasReadyCrops = veggies.some(v => v.growth >= GROWTH_COMPLETE_THRESHOLD);
  const hasActiveAutoPurchasers = crop.autoPurchasers.some(ap => ap.owned && ap.active);

  const salePrice = (v: Veggie) => guildState ? applyGuildPriceBonuses(v.salePrice, guildState, false) : v.salePrice;
  const hasSellable = veggies.some(v => v.sellEnabled && v.stash > 0);
  const sellAllValue = veggies.reduce((sum, v) => v.sellEnabled ? sum + v.stash * salePrice(v) : sum, 0);

  const mainContent = (
    <>
      {/* Experience Display */}
      <div className={styles.experienceDisplay}>
        <img src={ICON_EXPERIENCE} alt="" aria-hidden="true" className={styles.experienceIcon} />
        <span className={styles.experienceText}>
          Growing Experience: {formatNumber(experience, 2)}
        </span>
      </div>

      {guildState && isCommittedTo(guildState, 'growers') && (
        <GrowersBonuses guildState={guildState} />
      )}

      <CropSelector
        veggies={veggies}
        activeVeggie={activeVeggie}
        farmFull={farmFull}
        showFruits={!!guildState && hasFruitCultivation(guildState)}
        onSelect={setActiveVeggie}
        formatNumber={formatNumber}
      />
      <div className={styles.spacer} />

      <div className="veggie-panel">
        <CropHeader
          crop={crop}
          cropIndex={activeVeggie}
          hasReadyCrops={hasReadyCrops}
          guildState={guildState}
          beeYieldBonus={beeYieldBonus}
          daysToGrow={daysToGrow}
          growthMultiplier={growthMultiplier}
          onHarvest={handleHarvest}
          onRitualHarvestAll={handleRitualHarvestAll}
          onToggleSell={handleToggleSell}
          formatNumber={formatNumber}
        />

        <br />

        <CropUpgradesGrid
          crop={crop}
          cropIndex={activeVeggie}
          money={money}
          knowledge={knowledge}
          heirloomOwned={heirloomOwned}
          farmFull={farmFull}
          onBuyFertilizer={handleBuyFertilizer}
          onBuyBetterSeeds={handleBuyBetterSeeds}
          onBuyAdditionalPlot={handleBuyAdditionalPlot}
          onBuyHarvester={handleBuyHarvester}
          onToggleAutoHarvester={handleToggleAutoHarvester}
          onBuyHarvesterSpeed={handleBuyHarvesterSpeed}
          onBuyAutoPurchaser={handleBuyAutoPurchaser}
          formatNumber={formatNumber}
        />
      </div>

      {/* Auto-purchase progress and Sell All */}
      <div className={styles.autoPurchaseSection}>
        {hasActiveAutoPurchasers && (
          <div className={styles.autoPurchaseProgressContainer}>
            <span className={styles.autoPurchaseLabel}>
              Auto-Purchase: {AUTO_PURCHASER_CYCLE_DAYS - globalAutoPurchaseTimer} days
            </span>
            <div className={styles.autoPurchaseProgressWrapper}>
              <ProgressBar value={globalAutoPurchaseTimer} max={AUTO_PURCHASER_CYCLE_DAYS} height={12} color="#4caf50" />
              <span className={styles.autoPurchaseProgressLabel}>
                {Math.floor((globalAutoPurchaseTimer / AUTO_PURCHASER_CYCLE_DAYS) * 100)}%
              </span>
            </div>
          </div>
        )}

        <button
          className={styles.sellAllButton}
          onClick={handleSell}
          disabled={!hasSellable}
          aria-label="Sell all veggies (only those marked for selling)"
        >
          {hasSellable ? 'Sell All' : 'No sellable veggies'}  (${formatNumber(sellAllValue, 2)})
        </button>
      </div>
    </>
  );

  return (
    <BaseTab
      isUnlocked={true} // Growing tab is always unlocked
      mainContent={mainContent}
      sidebarContent={upgradesSidebar}
      sidebarStyle={SIDEBAR_STYLE}
    />
  );
});

GrowingTab.displayName = 'GrowingTab';

export default GrowingTab;
