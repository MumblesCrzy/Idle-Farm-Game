import { memo, type FC } from 'react';
import ProgressBar from './ProgressBar';
import InlineIcon from './InlineIcon';
import type { Veggie } from '../types/game';
import type { GuildState } from '../types/guilds';
import { getVeggieImage, ICON_BEE, ICON_RITUAL_HARVEST, ICON_SIGIL, ICON_MONEY, ICON_CRATE } from '../config/assetPaths';
import { GROWTH_COMPLETE_THRESHOLD, veggieSeasonBonuses } from '../config/gameConstants';
import { getHarvesterInterval } from '../utils/gameLoopProcessors';
import {
  applyGuildPriceBonuses,
  getGrowersPriceBonus,
  getUpgradeLevel,
  hasWhispersOfSeed,
  isCommittedTo
} from '../utils/guildCalculations';
import styles from './GrowingTab.module.css';

/** Sigils spent by one Ritual Harvest */
const RITUAL_HARVEST_COST = 5;

interface CropHeaderProps {
  crop: Veggie;
  cropIndex: number;
  /** Any crop is ready to harvest, for Ritual Harvest */
  hasReadyCrops: boolean;
  guildState?: GuildState;
  beeYieldBonus: number;
  daysToGrow: number;
  growthMultiplier: number;
  onHarvest: () => void;
  onRitualHarvestAll: () => void;
  onToggleSell: (index: number) => void;
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

/** The selected crop's name, price, harvest buttons and progress bars */
const CropHeader: FC<CropHeaderProps> = memo(({
  crop,
  cropIndex,
  hasReadyCrops,
  guildState,
  beeYieldBonus,
  daysToGrow,
  growthMultiplier,
  onHarvest,
  onRitualHarvestAll,
  onToggleSell,
  formatNumber
}) => {
  const guildPriceBonus = guildState ? getGrowersPriceBonus(guildState) : 0;
  const priceParts = [`$${formatNumber(crop.salePrice, 2)} base`];
  if (guildPriceBonus > 0) {
    priceParts.push(`× ${formatNumber(1 + guildPriceBonus, 2)} guild (+${Math.round(guildPriceBonus * 100)}%)`);
  }
  if (guildState && hasWhispersOfSeed(guildState)) {
    priceParts.push('× 10 Whispers of the Seed');
  }
  const salePrice = guildState ? applyGuildPriceBonuses(crop.salePrice, guildState, false) : crop.salePrice;

  const isReady = crop.growth >= GROWTH_COMPLETE_THRESHOLD;
  const ritualUnlocked = !!guildState && isCommittedTo(guildState, 'growers') && getUpgradeLevel(guildState, 'growers_ritual_circles') > 0;
  const sigils = guildState?.guildCurrencies?.growers ?? 0;
  const canRitualHarvest = ritualUnlocked && sigils >= RITUAL_HARVEST_COST && hasReadyCrops;

  // Same interval the live auto-harvest uses
  const harvesterInterval = getHarvesterInterval(crop);

  return (
    <>
      <div className={styles.veggiePanelHeader}>
        <h2 className={styles.veggiePanelTitle}>
          <img
            title={`Bonus Growth: ${veggieSeasonBonuses[crop.name]?.join(', ') ?? 'None'}`}
            src={getVeggieImage(crop.name)}
            alt=""
            aria-hidden="true"
            className={styles.veggieImage}
          />
          {crop.name}
          {!crop.sellEnabled && (
            <span className={styles.stockpileBadge} title="This vegetable is set to stockpile (won't auto-sell)">
              <InlineIcon src={ICON_CRATE} size={14} gap={3} />HOLD
            </span>
          )}
          <span className={styles.salePrice} title={priceParts.join(' ')}>
            ${formatNumber(salePrice, 2)}
          </span>
          {beeYieldBonus > 0 && (
            <span className={styles.beeBonus}>
              <InlineIcon src={ICON_BEE} alt="Bee" size={14} gap={2} />+{formatNumber(beeYieldBonus * 100, 1)}%
            </span>
          )}
          <span className={styles.daysToGrow}>
            (~{daysToGrow} days to grow)
          </span>
        </h2>
        <button
          onClick={onHarvest}
          disabled={!isReady}
          aria-label={`Harvest ${crop.name}`}
          className={styles.harvestButton}
          data-tutorial="harvest-button" // The first-harvest tutorial points here
        >
          {isReady ? 'Harvest' : 'Growing...'}
        </button>
        {ritualUnlocked && (
          <button
            onClick={onRitualHarvestAll}
            className={styles.ritualHarvestButton}
            disabled={!canRitualHarvest}
            title={canRitualHarvest
              ? `Ritual Harvest: Spend ${RITUAL_HARVEST_COST} sigils to harvest all ready crops`
              : sigils < RITUAL_HARVEST_COST
                ? `Need ${RITUAL_HARVEST_COST} sigils (you have ${sigils})`
                : 'No crops are ready to harvest'}
            aria-label={`Ritual harvest all ready crops for ${RITUAL_HARVEST_COST} sigils`}
          >
            <InlineIcon src={ICON_RITUAL_HARVEST} size={18} gap={4} />Ritual Harvest ({RITUAL_HARVEST_COST} <InlineIcon src={ICON_SIGIL} size={14} />)
          </button>
        )}
        <button
          onClick={() => onToggleSell(cropIndex)}
          className={crop.sellEnabled ? styles.sellButton : styles.holdButton}
          title={crop.sellEnabled ? 'Sell enabled (click to disable and stockpile)' : 'Sell disabled (click to enable selling)'}
          aria-label={crop.sellEnabled
            ? `Auto-sell enabled for ${crop.name}. Click to disable and stockpile instead`
            : `Auto-sell disabled for ${crop.name}. Click to enable and sell on harvest`}
          aria-pressed={crop.sellEnabled}
        >
          {crop.sellEnabled
            ? <><InlineIcon src={ICON_MONEY} size={16} gap={4} />Sell</>
            : <><InlineIcon src={ICON_CRATE} size={16} gap={4} />Hold</>}
        </button>
      </div>

      {/* Growth progress */}
      <div
        className={styles.progressBarWrapper}
        title={`Growth Progress: ${Math.max(0, Math.ceil((100 - crop.growth) / growthMultiplier))} seconds until grown`}
      >
        <ProgressBar value={crop.growth} max={100} height={22} />
        <span className={styles.progressBarLabel}>
          {`${Math.floor(crop.growth)}%`}
        </span>
      </div>

      {/* Auto Harvester progress */}
      {crop.harvesterOwned && (
        <div className={styles.harvesterRow}>
          <div
            className={`${styles.harvesterProgressWrapper} ${!crop.autoHarvesterEnabled ? styles.harvesterDisabled : ''}`}
            title={crop.autoHarvesterEnabled
              ? `Auto Harvester: ${Math.max(0, harvesterInterval - crop.harvesterTimer)} seconds until next harvest attempt`
              : 'Auto Harvester: Disabled'}
          >
            <ProgressBar
              value={crop.harvesterTimer}
              max={harvesterInterval}
              color={crop.autoHarvesterEnabled ? '#5D76B1' : '#666'}
              height={22}
            />
            <span className={styles.progressBarLabel}>
              {crop.autoHarvesterEnabled
                ? `${Math.floor((crop.harvesterTimer / harvesterInterval) * 100)}%`
                : 'OFF'}
            </span>
          </div>
        </div>
      )}
    </>
  );
});

CropHeader.displayName = 'CropHeader';

export default CropHeader;
