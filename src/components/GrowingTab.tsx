/**
 * Growing Tab: the garden.
 *
 * A plank along the top holds Growing Experience, the Growers', Engineers' or Merchants' bonuses, the
 * Engineers' Gears, Ritual Harvest and Sell All. Below it every crop of a kind (vegetables, or fruits once the Growers' Fruit Cultivation
 * opens them) has a raised bed with its growth, Sell or Hold, the Auto Harvester, upgrade levels
 * with their auto-buyers, and Harvest. The tool shed on the right holds the picked crop's
 * upgrades and the farm upgrades. The tab fits a 1600x1000 window, and nothing changes size as
 * you click around.
 */
import { memo, useCallback, useState, type FC, type ReactNode } from 'react';
import BaseTab from './BaseTab';
import InlineIcon from './InlineIcon';
import CropGarden, { type CropGroup } from './CropGarden';
import CropUpgradesPanel from './CropUpgradesPanel';
import type { Veggie } from '../types/game';
import type { GuildState } from '../types/guilds';
import type { PayrollControl } from '../hooks/usePayroll';
import { GUILD_ENGINEERS, GUILD_GROWERS, GUILD_MERCHANTS, ICON_EXPERIENCE, ICON_GEARS, ICON_MONEY, ICON_RITUAL_HARVEST, ICON_SIGIL } from '../config/assetPaths';
import { GROWTH_COMPLETE_THRESHOLD } from '../config/gameConstants';
import {
  applyGuildPriceBonuses,
  getBlessedCropChance,
  getBulkDealsBonus,
  getBulkDealsMultiplier,
  getEngineersHarvesterSpeedMultiplier,
  getGrowersBeePollinationBonus,
  getGrowersGrowthBonus,
  getGrowersManualHarvestBonus,
  getGrowersPriceBonus,
  getGuildKnowledgeMultiplier,
  getHotTipMultiplier,
  getMerchantsCropPriceBonus,
  getMerchantsJarValueBonus,
  getStandardGradeCropMultiplier,
  getStandardGradeJarMultiplier,
  getUpgradeLevel,
  hasFruitCultivation,
  isCommittedTo
} from '../utils/guildCalculations';
import styles from './GrowingTab.module.css';

type CropHandler = (index: number) => void;
/** Buys a crop upgrade; a price factor below 1 pays less, as with Wholesale */
type PricedCropHandler = (index: number, priceFactor?: number) => void;

/** Sigils spent by one Ritual Harvest */
const RITUAL_HARVEST_COST = 5;

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
  /** How fast a crop grows today, in growth points per game day */
  growthMultiplierOf: (crop: Veggie) => number;
  setActiveVeggie: (index: number) => void;
  /** Harvests the crop at this index */
  handleHarvest: (cropIndex?: number) => void;
  handleToggleSell: CropHandler;
  handleToggleAutoHarvester: CropHandler;
  handleSell: () => void;
  handleRitualHarvestAll: () => void;
  handleBuyFertilizer: PricedCropHandler;
  handleBuyHarvester: CropHandler;
  handleBuyBetterSeeds: PricedCropHandler;
  handleBuyAdditionalPlot: PricedCropHandler;
  handleBuyHarvesterSpeed: PricedCropHandler;
  handleBuyAutoPurchaser: (autoPurchaseId: string) => CropHandler;
  formatNumber: (num: number, decimalPlaces?: number) => string;
  guildState?: GuildState;
  /** Farm-wide upgrades, shown in the shed under the picked crop's upgrades */
  upgradesSidebar: ReactNode;
  /** Payroll, for committed Merchants */
  payroll?: PayrollControl;
}

/** Growers Guild bonuses, shown while committed to the guild */
const GrowersBonuses: FC<{ guildState: GuildState }> = ({ guildState }) => {
  const growthBonus = getGrowersGrowthBonus(guildState);
  const priceBonus = getGrowersPriceBonus(guildState);
  const manualBonus = getGrowersManualHarvestBonus(guildState);
  const blessedChance = getBlessedCropChance(guildState);
  const beeBonus = getGrowersBeePollinationBonus(guildState);

  return (
    <div className={styles.guildBonuses} role="group" aria-label="Growers Guild bonuses">
      <img src={GUILD_GROWERS} alt="" aria-hidden="true" title="Growers Guild" className={styles.guildEmblem} />
      {growthBonus > 0 && (
        <span className={styles.chip} title="Growth Speed Bonus from Guild Upgrades">+{Math.round(growthBonus * 100)}% Growth</span>
      )}
      {priceBonus > 0 && (
        <span className={styles.chip} title="Sale Price Bonus from Guild Upgrades">+{Math.round(priceBonus * 100)}% Price</span>
      )}
      {manualBonus > 0 && (
        <span className={styles.chip} title="Manual Harvest Bonus">+{manualBonus} Manual</span>
      )}
      {blessedChance > 0 && (
        <span className={styles.chip} title="Blessed Crop Chance (Double Yield)">{Math.round(blessedChance * 100)}% Blessed</span>
      )}
      {beeBonus > 0 && (
        <span className={styles.chip} title="Bee Pollination Synergy">+{Math.round(beeBonus * 100)}% Bees</span>
      )}
    </div>
  );
};

/** Engineers Guild bonuses and the grade their crops sell at, shown while committed to the guild */
const EngineersBonuses: FC<{ guildState: GuildState }> = ({ guildState }) => {
  const harvesterBonus = getEngineersHarvesterSpeedMultiplier(guildState) - 1;
  const cropCut = 1 - getStandardGradeCropMultiplier(guildState);
  const jarCut = 1 - getStandardGradeJarMultiplier(guildState);

  return (
    <div className={styles.guildBonuses} role="group" aria-label="Engineers Guild bonuses">
      <img src={GUILD_ENGINEERS} alt="" aria-hidden="true" title="Engineers Guild" className={styles.guildEmblem} />
      <span className={styles.machineChip} title="Auto Harvester speed from Automated Excellence and Engineers upgrades">
        +{Math.round(harvesterBonus * 100)}% Harvesters
      </span>
      <span className={styles.machineChip} title="Auto harvests give full experience and knowledge">Full XP</span>
      <span
        className={styles.machineChip}
        title={`Standard Grade: crops sell for ${Math.round(cropCut * 100)}% less and canned goods for ${Math.round(jarCut * 100)}% less`}
      >
        Standard Grade
      </span>
    </div>
  );
};

/** Merchants Guild bonuses and their trade-off, shown while committed to the guild */
const MerchantsBonuses: FC<{ guildState: GuildState }> = ({ guildState }) => {
  const cropBonus = getMerchantsCropPriceBonus(guildState);
  const jarBonus = getMerchantsJarValueBonus(guildState);
  const bulkBonus = getBulkDealsBonus(guildState);
  const knowledgeCut = 1 - getGuildKnowledgeMultiplier(guildState);

  return (
    <div className={styles.guildBonuses} role="group" aria-label="Merchants Guild bonuses">
      <img src={GUILD_MERCHANTS} alt="" aria-hidden="true" title="Merchants Guild" className={styles.guildEmblem} />
      <span className={styles.tradeChip} title="Crop prices from Markup, Haggling and Shrewd Bargaining">
        +{Math.round(cropBonus * 100)}% Crops
      </span>
      <span className={styles.tradeChip} title="Canned goods value from Markup and Price Gouging">
        +{Math.round(jarBonus * 100)}% Jars
      </span>
      {bulkBonus > 0 && (
        <span className={styles.tradeChip} title="Bulk Deals: a sale of 100 crops or more pays this much more">
          +{Math.round(bulkBonus * 100)}% Bulk
        </span>
      )}
      <span className={styles.tradeChip} title={`No Time to Learn: knowledge from harvests and canning is ${Math.round(knowledgeCut * 100)}% lower`}>
        -{Math.round(knowledgeCut * 100)}% Knowledge
      </span>
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
  growthMultiplierOf,
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
  upgradesSidebar,
  payroll
}) => {
  const crop: Veggie | undefined = veggies[activeVeggie];
  const farmFull = totalPlotsUsed >= maxPlots;
  const fruitsOpen = !!guildState && hasFruitCultivation(guildState);

  // The kind of crop on show: the picked crop's at first, then whichever the player chooses
  const [shownGroup, setShownGroup] = useState<CropGroup>(crop?.cropType === 'fruit' ? 'fruits' : 'vegetables');
  const group: CropGroup = fruitsOpen ? shownGroup : 'vegetables';

  const showGroup = useCallback((next: CropGroup) => {
    setShownGroup(next);
    // Pick that kind's first open crop, so the shed matches the beds on show
    const pickedIsFruit = veggies[activeVeggie]?.cropType === 'fruit';
    if (pickedIsFruit !== (next === 'fruits')) {
      const first = veggies.findIndex(v => v.unlocked && (v.cropType === 'fruit') === (next === 'fruits'));
      if (first >= 0) setActiveVeggie(first);
    }
  }, [veggies, activeVeggie, setActiveVeggie]);

  const salePriceOf = useCallback(
    (v: Veggie) => guildState ? applyGuildPriceBonuses(v.salePrice, guildState, false) : v.salePrice,
    [guildState]
  );
  const hasSellable = veggies.some(v => v.sellEnabled && v.stash > 0);
  // Ferdinand's Hot Tip: the prices are already doubled, and Sell All says so
  const hotTip = getHotTipMultiplier(guildState) > 1;
  const sellAllCrops = veggies.reduce((sum, v) => v.sellEnabled ? sum + v.stash : sum, 0);
  // Bulk Deals pay more on a sale of 100 crops or more
  const sellAllValue = veggies.reduce((sum, v) => v.sellEnabled ? sum + v.stash * salePriceOf(v) : sum, 0)
    * getBulkDealsMultiplier(guildState, sellAllCrops);

  const ritualUnlocked = !!guildState && isCommittedTo(guildState, 'growers')
    && getUpgradeLevel(guildState, 'growers_ritual_circles') > 0;
  const sigils = guildState?.guildCurrencies?.growers ?? 0;
  const hasReadyCrops = veggies.some(v => v.growth >= GROWTH_COMPLETE_THRESHOLD);
  const canRitualHarvest = ritualUnlocked && sigils >= RITUAL_HARVEST_COST && hasReadyCrops;
  const engineer = !!guildState && isCommittedTo(guildState, 'engineers');
  const gears = guildState?.guildCurrencies?.engineers ?? 0;

  const mainContent = (
    <div className={styles.layout}>
      <div className={styles.plank}>
        <img src={ICON_EXPERIENCE} alt="" aria-hidden="true" className={styles.plankIcon} />
        <span className={styles.experience}>
          <b>{formatNumber(experience, 2)}</b>
          <small>Growing Experience</small>
        </span>
        {guildState && isCommittedTo(guildState, 'growers') && <GrowersBonuses guildState={guildState} />}
        {guildState && engineer && <EngineersBonuses guildState={guildState} />}
        {guildState && isCommittedTo(guildState, 'merchants') && <MerchantsBonuses guildState={guildState} />}
        <span className={styles.spacer} />
        {engineer && (
          <span className={styles.gearsChip} title="Gears, made by your machines">
            <img src={ICON_GEARS} alt="" aria-hidden="true" />
            {formatNumber(gears, 2)} Gears
          </span>
        )}
        {ritualUnlocked && (
          <button
            type="button"
            className={styles.ritualButton}
            onClick={handleRitualHarvestAll}
            disabled={!canRitualHarvest}
            title={canRitualHarvest
              ? `Ritual Harvest: Spend ${RITUAL_HARVEST_COST} sigils to harvest all ready crops`
              : sigils < RITUAL_HARVEST_COST
                ? `Need ${RITUAL_HARVEST_COST} sigils (you have ${sigils})`
                : 'No crops are ready to harvest'}
          >
            <InlineIcon src={ICON_RITUAL_HARVEST} size={20} gap={6} />Ritual Harvest · {RITUAL_HARVEST_COST}
            <InlineIcon src={ICON_SIGIL} size={16} gap={0} /><span className="sr-only"> sigils</span>
          </button>
        )}
        <button
          type="button"
          className={`${styles.sellAllButton} ${hotTip ? styles.sellAllHot : ''}`}
          onClick={handleSell}
          disabled={!hasSellable}
          title={hotTip
            ? "Ferdinand's Hot Tip: every crop marked Sell sells for double. Crops on Hold stay in the stash"
            : 'Sells every crop marked Sell. Crops on Hold stay in the stash'}
        >
          <InlineIcon src={ICON_MONEY} size={22} gap={8} />
          {hasSellable ? `Sell All · $${formatNumber(sellAllValue, 2)}` : 'Nothing to sell'}
          {hotTip && hasSellable && <span className={styles.timesTwo}>×2</span>}
        </button>
      </div>

      <CropGarden
        veggies={veggies}
        group={group}
        fruitsOpen={fruitsOpen}
        onShowGroup={showGroup}
        activeVeggie={activeVeggie}
        farmFull={farmFull}
        money={money}
        globalAutoPurchaseTimer={globalAutoPurchaseTimer}
        growthMultiplierOf={growthMultiplierOf}
        onSelect={setActiveVeggie}
        onHarvest={handleHarvest}
        onToggleSell={handleToggleSell}
        onBuyHarvester={handleBuyHarvester}
        formatNumber={formatNumber}
        guildState={guildState}
        payroll={payroll}
      />

      <div className={styles.shed}>
        {crop && (
          <CropUpgradesPanel
            crop={crop}
            cropIndex={activeVeggie}
            money={money}
            knowledge={knowledge}
            heirloomOwned={heirloomOwned}
            farmFull={farmFull}
            salePrice={salePriceOf(crop)}
            beeYieldBonus={beeYieldBonus}
            guildState={guildState}
            onBuyFertilizer={handleBuyFertilizer}
            onBuyBetterSeeds={handleBuyBetterSeeds}
            onBuyAdditionalPlot={handleBuyAdditionalPlot}
            onBuyHarvester={handleBuyHarvester}
            onToggleAutoHarvester={handleToggleAutoHarvester}
            onBuyHarvesterSpeed={handleBuyHarvesterSpeed}
            onBuyAutoPurchaser={handleBuyAutoPurchaser}
            formatNumber={formatNumber}
          />
        )}
        {upgradesSidebar}
      </div>
    </div>
  );

  return (
    <BaseTab
      isUnlocked={true} // Growing tab is always unlocked
      mainContent={mainContent}
    />
  );
});

GrowingTab.displayName = 'GrowingTab';

export default GrowingTab;
