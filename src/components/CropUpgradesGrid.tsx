import { memo, useCallback, type FC } from 'react';
import UpgradeButton from './UpgradeButton';
import AutoPurchaserButton from './AutoPurchaserButton';
import type { Veggie } from '../types/game';
import {
  UPGRADE_FERTILIZER,
  UPGRADE_BETTER_SEEDS,
  UPGRADE_ADDITIONAL_PLOT,
  UPGRADE_AUTO_HARVESTER,
  UPGRADE_HARVESTER_SPEED
} from '../config/assetPaths';
import { AUTO_PURCHASER_CYCLE_DAYS } from '../config/gameConstants';
import { getHarvesterInterval } from '../utils/gameLoopProcessors';
import styles from './GrowingTab.module.css';

type CropHandler = (index: number) => void;

interface CropUpgradesGridProps {
  crop: Veggie;
  cropIndex: number;
  money: number;
  knowledge: number;
  heirloomOwned: boolean;
  /** No free plots for another Additional Plot */
  farmFull: boolean;
  onBuyFertilizer: CropHandler;
  onBuyBetterSeeds: CropHandler;
  onBuyAdditionalPlot: CropHandler;
  onBuyHarvester: CropHandler;
  onToggleAutoHarvester: CropHandler;
  onBuyHarvesterSpeed: CropHandler;
  onBuyAutoPurchaser: (autoPurchaserId: string) => CropHandler;
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

/** Per-crop upgrades, each with its auto-purchaser */
const CropUpgradesGrid: FC<CropUpgradesGridProps> = memo(({
  crop,
  cropIndex,
  money,
  knowledge,
  heirloomOwned,
  farmFull,
  onBuyFertilizer,
  onBuyBetterSeeds,
  onBuyAdditionalPlot,
  onBuyHarvester,
  onToggleAutoHarvester,
  onBuyHarvesterSpeed,
  onBuyAutoPurchaser,
  formatNumber
}) => {
  const buyFertilizer = useCallback(() => onBuyFertilizer(cropIndex), [onBuyFertilizer, cropIndex]);
  const buyBetterSeeds = useCallback(() => onBuyBetterSeeds(cropIndex), [onBuyBetterSeeds, cropIndex]);
  const buyAdditionalPlot = useCallback(() => onBuyAdditionalPlot(cropIndex), [onBuyAdditionalPlot, cropIndex]);
  const buyHarvester = useCallback(() => onBuyHarvester(cropIndex), [onBuyHarvester, cropIndex]);
  const toggleAutoHarvester = useCallback(() => onToggleAutoHarvester(cropIndex), [onToggleAutoHarvester, cropIndex]);
  const buyHarvesterSpeed = useCallback(() => onBuyHarvesterSpeed(cropIndex), [onBuyHarvesterSpeed, cropIndex]);
  const buyAutoPurchaser = useCallback(
    (autoPurchaserId: string) => onBuyAutoPurchaser(autoPurchaserId)(cropIndex),
    [onBuyAutoPurchaser, cropIndex]
  );

  // Saves from older versions can lack an auto-purchaser, so each one is optional
  const autoPurchaser = (id: string, description: string, forceDisabled = false) => {
    const config = crop.autoPurchasers.find(ap => ap.id === id);
    return config ? (
      <AutoPurchaserButton
        autoPurchaser={config}
        money={money}
        knowledge={knowledge}
        description={description}
        onPurchase={buyAutoPurchaser}
        forceDisabled={forceDisabled}
      />
    ) : null;
  };

  const fertilizerMaxed = crop.fertilizerLevel >= crop.fertilizerMaxLevel;
  const seedsMultiplier = heirloomOwned ? 1.5 : 1.25;
  const harvesterSpeedCost = crop.harvesterSpeedCost ?? 50;

  return (
    <div className={styles.upgradesGrid}>
      {/* Fertilizer */}
      <div className={styles.upgradeColumn}>
        <div className={styles.upgradeRow}>
          <UpgradeButton
            title={fertilizerMaxed
              ? 'Fertilizer: MAX Level Reached'
              : `Fertilizer: +5% growth speed - Cost: $${formatNumber(crop.fertilizerCost, 1)}`}
            imageSrc={UPGRADE_FERTILIZER}
            imageAlt="Fertilizer"
            buttonText="Fertilizer"
            money={money}
            knowledge={knowledge}
            cost={crop.fertilizerCost}
            currencyType="money"
            onClick={buyFertilizer}
            disabled={money < crop.fertilizerCost || fertilizerMaxed}
            isMaxLevel={fertilizerMaxed}
            level={crop.fertilizerLevel}
            flex={true}
            effect={`Growth rate: +${crop.fertilizerLevel * 5}%`}
            formatNumber={formatNumber}
          />
          {autoPurchaser('assistant', `Auto-purchases fertilizer every ${AUTO_PURCHASER_CYCLE_DAYS} days`)}
        </div>
      </div>

      {/* Better Seeds */}
      <div className={styles.upgradeColumn}>
        <div className={styles.upgradeRow}>
          <UpgradeButton
            title={`Better Seeds: +${heirloomOwned ? 50 : 25}% sale price - Cost: ${formatNumber(crop.betterSeedsCost, 1)}Kn`}
            imageSrc={UPGRADE_BETTER_SEEDS}
            imageAlt="Better Seeds"
            buttonText="Better Seeds"
            money={money}
            knowledge={knowledge}
            cost={crop.betterSeedsCost}
            currencyType="knowledge"
            onClick={buyBetterSeeds}
            disabled={knowledge < crop.betterSeedsCost}
            level={crop.betterSeedsLevel}
            flex={true}
            effect={`Sale price: ${crop.betterSeedsLevel > 0
              ? `+${formatNumber(Math.round((seedsMultiplier ** crop.betterSeedsLevel - 1) * 100), 2)}%`
              : '+0%'}`}
            formatNumber={formatNumber}
          />
          {autoPurchaser('cultivator', `Auto-purchases better seeds every ${AUTO_PURCHASER_CYCLE_DAYS} days`)}
        </div>
      </div>

      {/* Additional Plot */}
      <div className={styles.upgradeColumn}>
        <div className={styles.upgradeRow}>
          <UpgradeButton
            title={farmFull ? 'Max Plots Reached' : `Additional Plot: +1 veggie/harvest - Cost: $${formatNumber(crop.additionalPlotCost, 1)}`}
            imageSrc={UPGRADE_ADDITIONAL_PLOT}
            imageAlt="Additional Plot"
            buttonText="Additional Plot"
            money={money}
            knowledge={knowledge}
            cost={crop.additionalPlotCost}
            currencyType="money"
            onClick={buyAdditionalPlot}
            disabled={money < crop.additionalPlotCost || farmFull}
            isMaxLevel={farmFull}
            level={crop.additionalPlotLevel}
            flex={true}
            effect={`Extra veggies per harvest: +${crop.additionalPlotLevel}`}
            formatNumber={formatNumber}
          />
          {autoPurchaser('surveyor', `Auto-purchases additional plot every ${AUTO_PURCHASER_CYCLE_DAYS} days`, farmFull)}
        </div>
      </div>

      {/* Auto Harvester */}
      <div className={styles.upgradeColumnWithMargin}>
        <UpgradeButton
          title={crop.harvesterOwned
            ? (crop.autoHarvesterEnabled
              ? 'Auto Harvester: Active (click to pause)'
              : 'Auto Harvester: Paused (click to resume)')
            : `Auto Harvester - Cost: $${formatNumber(crop.harvesterCost, 1)}`}
          imageSrc={UPGRADE_AUTO_HARVESTER}
          imageAlt="Auto Harvester"
          buttonText="Auto Harvester"
          money={money}
          knowledge={knowledge}
          cost={crop.harvesterCost}
          currencyType="money"
          onClick={buyHarvester}
          disabled={crop.harvesterOwned || money < crop.harvesterCost}
          isOwned={crop.harvesterOwned}
          effect="Auto-harvests when ready"
          formatNumber={formatNumber}
          isTogglable={true}
          isActive={crop.autoHarvesterEnabled}
          onToggle={toggleAutoHarvester}
        />
      </div>

      {/* Harvester Speed */}
      {crop.harvesterOwned && (
        <div className={styles.upgradeColumn}>
          <div className={styles.upgradeRow}>
            <UpgradeButton
              title={`Harvester Speed: +5% speed - Cost: $${formatNumber(harvesterSpeedCost, 1)}`}
              imageSrc={UPGRADE_HARVESTER_SPEED}
              imageAlt="Harvester Speed"
              buttonText="Harvester Speed"
              money={money}
              knowledge={knowledge}
              cost={harvesterSpeedCost}
              currencyType="money"
              onClick={buyHarvesterSpeed}
              disabled={money < harvesterSpeedCost}
              level={crop.harvesterSpeedLevel ?? 0}
              flex={true}
              // Same interval the live auto-harvest uses
              effect={`Harvest time: ${getHarvesterInterval(crop)}s`}
              formatNumber={formatNumber}
            />
            {autoPurchaser('mechanic', `Auto-purchases Harvester Speed every ${AUTO_PURCHASER_CYCLE_DAYS} days`)}
          </div>
        </div>
      )}
    </div>
  );
});

CropUpgradesGrid.displayName = 'CropUpgradesGrid';

export default CropUpgradesGrid;
