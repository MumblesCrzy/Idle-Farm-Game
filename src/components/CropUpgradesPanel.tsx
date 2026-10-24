/**
 * The picked crop's upgrades, at the top of the Growing tab's tool shed: each with its level,
 * what it does now and next, its price, and the auto-buyer that can buy it for you; then the
 * Auto Harvester. Every crop shows the same rows at the same height, so the shed holds still from
 * crop to crop.
 */
import { memo, useCallback, type FC, type ReactNode } from 'react';
import InlineIcon from './InlineIcon';
import type { AutoPurchaseConfig, Veggie } from '../types/game';
import type { GuildState } from '../types/guilds';
import {
  getAutoPurchaserImage,
  getVeggieImage,
  ICON_BEE,
  UPGRADE_ADDITIONAL_PLOT,
  UPGRADE_AUTO_HARVESTER,
  UPGRADE_BETTER_SEEDS,
  UPGRADE_FERTILIZER,
  UPGRADE_HARVESTER_SPEED
} from '../config/assetPaths';
import { AUTO_PURCHASER_CYCLE_DAYS, veggieSeasonBonuses } from '../config/gameConstants';
import { getHarvesterInterval } from '../utils/gameLoopProcessors';
import { glideFill, useGlide } from '../hooks/useGlide';
import { machineSpeed } from '../utils/stanley';
import { getAutoBuyerPriceMultiplier, getGrowersPriceBonus, getStandardGradeCropMultiplier, hasFactoryFittedHarvesters, hasWhispersOfSeed } from '../utils/guildCalculations';
import styles from './CropUpgradesPanel.module.css';

type FormatNumber = (num: number, decimalPlaces?: number) => string;
type CropHandler = (index: number) => void;

/** How a buy button looks: affordable, too dear, or nothing to buy */
type BuyState = 'afford' | 'short' | 'max';

const BUY_CLASS: Record<BuyState, string> = {
  afford: styles.buyAfford,
  short: styles.buyShort,
  max: styles.buyMax
};

const buyState = (canAfford: boolean, nothingToBuy = false): BuyState =>
  nothingToBuy ? 'max' : canAfford ? 'afford' : 'short';

interface AutoBuyerProps {
  buyer: AutoPurchaseConfig;
  /** What the auto-buyer does, for its tooltip */
  description: string;
  money: number;
  knowledge: number;
  /** Hiring is blocked, as for the Surveyor on a full farm */
  blocked?: boolean;
  /** Bulk Purchasing's discount on what a hired auto-buyer buys, as a share */
  discount?: number;
  onClick: (autoPurchaserId: string) => void;
  formatNumber: FormatNumber;
}

/** An upgrade's auto-buyer: hire it, then switch it on and off */
const AutoBuyer: FC<AutoBuyerProps> = ({ buyer, description, money, knowledge, blocked = false, discount = 0, onClick, formatNumber }) => {
  const { id, name, owned, active, cost, currencyType } = buyer;
  const canAfford = currencyType === 'money' ? money >= cost : knowledge >= cost;
  const costText = currencyType === 'money' ? `$${formatNumber(cost, 1)}` : `${formatNumber(cost, 1)} Kn`;
  const title = !owned && blocked
    ? `${name}: Cannot hire - your farm has no free plots. Expand your farm first.`
    : `${name}: ${description}. ${!owned
      ? `Cost: ${costText}`
      : active ? 'Currently ON - Click to turn OFF' : 'Currently OFF - Click to turn ON'}`;

  return (
    <span className={styles.buyerLine}>
      <img src={getAutoPurchaserImage(name)} alt="" aria-hidden="true" className={styles.buyerArt} />
      {name}
      <button
        type="button"
        className={!owned ? styles.hire : active ? styles.buyerOn : styles.buyerOff}
        onClick={() => onClick(id)}
        disabled={!owned && (!canAfford || blocked)}
        title={title}
        aria-label={!owned ? `${name}: Hire · ${costText}` : `${name} ${active ? 'on' : 'off'}`}
      >
        {!owned ? `Hire · ${costText}` : active ? 'On' : 'Off'}
      </button>
      {owned && discount > 0 && (
        <span className={styles.discount} title={`Bulk Purchasing: the ${name} pays ${Math.round(discount * 100)}% less for what it buys`}>
          -{Math.round(discount * 100)}%
        </span>
      )}
    </span>
  );
};

interface UpgradeRowProps {
  icon: string;
  name: string;
  /** The level badge; left out for the one-time Auto Harvester */
  level?: number;
  effect: string;
  buyText: string;
  state: BuyState;
  /** The buy button's accessible name */
  buyLabel: string;
  buyTitle: string;
  onBuy: () => void;
  /** The auto-buyer line under the effect */
  children?: ReactNode;
}

const UpgradeRow: FC<UpgradeRowProps> = ({ icon, name, level, effect, buyText, state, buyLabel, buyTitle, onBuy, children }) => (
  <div className={styles.row}>
    <img src={icon} alt="" aria-hidden="true" className={styles.rowIcon} />
    <div className={styles.rowInfo}>
      <span className={styles.rowName}>
        {name}
        {level !== undefined && <span className={styles.level}>Lv {level}</span>}
      </span>
      <span className={styles.rowEffect} title={effect}>{effect}</span>
      {children}
    </div>
    <button
      type="button"
      className={`${styles.buy} ${BUY_CLASS[state]}`}
      onClick={onBuy}
      disabled={state !== 'afford'}
      aria-label={buyLabel}
      title={buyTitle}
    >
      {buyText}
    </button>
  </div>
);

interface CropUpgradesPanelProps {
  crop: Veggie;
  cropIndex: number;
  money: number;
  knowledge: number;
  heirloomOwned: boolean;
  /** No free plots for another Additional Plot */
  farmFull: boolean;
  /** Sale price with guild bonuses */
  salePrice: number;
  beeYieldBonus: number;
  guildState?: GuildState;
  onBuyFertilizer: CropHandler;
  onBuyBetterSeeds: CropHandler;
  onBuyAdditionalPlot: CropHandler;
  onBuyHarvester: CropHandler;
  onToggleAutoHarvester: CropHandler;
  onBuyHarvesterSpeed: CropHandler;
  onBuyAutoPurchaser: (autoPurchaserId: string) => CropHandler;
  formatNumber: FormatNumber;
}

const CropUpgradesPanel: FC<CropUpgradesPanelProps> = memo(({
  crop,
  cropIndex,
  money,
  knowledge,
  heirloomOwned,
  farmFull,
  salePrice,
  beeYieldBonus,
  guildState,
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

  const autoBuyerDiscount = 1 - getAutoBuyerPriceMultiplier(guildState);
  // An Engineer's crops come with their Auto Harvesters, always on
  const fitted = hasFactoryFittedHarvesters(guildState);
  // Stanley's Tune-Up runs it twice as fast
  const speed = machineSpeed(guildState);

  // Saves from older versions can lack an auto-purchaser, so each one is optional
  const autoBuyer = (id: string, description: string, blocked = false) => {
    const config = crop.autoPurchasers.find(ap => ap.id === id);
    return config ? (
      <AutoBuyer
        buyer={config}
        description={description}
        money={money}
        knowledge={knowledge}
        blocked={blocked}
        discount={autoBuyerDiscount}
        onClick={buyAutoPurchaser}
        formatNumber={formatNumber}
      />
    ) : null;
  };

  const dollars = (amount: number) => `$${formatNumber(amount, 1)}`;
  const fertilizerMaxed = crop.fertilizerLevel >= crop.fertilizerMaxLevel;
  const seedsMultiplier = heirloomOwned ? 1.5 : 1.25;
  const seedsBonus = (level: number) => formatNumber(Math.round((seedsMultiplier ** level - 1) * 100), 2);
  const harvesterSpeedCost = crop.harvesterSpeedCost ?? 50;
  // The same intervals the live auto-harvest uses
  const interval = getHarvesterInterval(crop, guildState);
  const nextInterval = getHarvesterInterval({ ...crop, harvesterSpeedLevel: (crop.harvesterSpeedLevel ?? 0) + 1 }, guildState);
  const harvesterShare = interval > 0 ? Math.min(100, (crop.harvesterTimer / interval) * 100) : 0;
  const harvesterGlides = useGlide(harvesterShare);

  const guildPriceBonus = guildState ? getGrowersPriceBonus(guildState) : 0;
  const priceParts = [`$${formatNumber(crop.salePrice, 2)} base`];
  if (guildPriceBonus > 0) {
    priceParts.push(`× ${formatNumber(1 + guildPriceBonus, 2)} guild (+${Math.round(guildPriceBonus * 100)}%)`);
  }
  if (guildState && hasWhispersOfSeed(guildState)) {
    priceParts.push('× 10 Whispers of the Seed');
  }
  const gradeMultiplier = getStandardGradeCropMultiplier(guildState);
  if (gradeMultiplier < 1) {
    priceParts.push(`× ${formatNumber(gradeMultiplier, 2)} Standard Grade (-${Math.round((1 - gradeMultiplier) * 100)}%)`);
  }

  return (
    <section className={styles.panel} aria-label={`${crop.name} upgrades`}>
      <div className={styles.header}>
        <img
          src={getVeggieImage(crop.name)}
          alt=""
          aria-hidden="true"
          className={styles.headerArt}
          title={`Bonus growth: ${veggieSeasonBonuses[crop.name]?.join(', ') ?? 'None'}`}
        />
        <div className={styles.headerText}>
          <h3 className={styles.title}>{crop.name}</h3>
          <span className={styles.subline}>
            <span title={priceParts.join(' ')}>${formatNumber(salePrice, 2)} each</span> · {formatNumber(crop.stash, 0)} in stash
          </span>
        </div>
        {beeYieldBonus > 0 && (
          <span className={styles.beeChip} title="Crop yield bonus from your bee boxes">
            <InlineIcon src={ICON_BEE} alt="Bee" size={14} gap={3} />+{formatNumber(beeYieldBonus * 100, 1)}%
          </span>
        )}
      </div>

      <UpgradeRow
        icon={UPGRADE_FERTILIZER}
        name="Fertilizer"
        level={crop.fertilizerLevel}
        effect={fertilizerMaxed
          ? `Growth +${crop.fertilizerLevel * 5}%, its top level`
          : `Growth +${crop.fertilizerLevel * 5}%, next +${(crop.fertilizerLevel + 1) * 5}%`}
        buyText={fertilizerMaxed ? 'Max' : dollars(crop.fertilizerCost)}
        state={buyState(money >= crop.fertilizerCost, fertilizerMaxed)}
        buyLabel={fertilizerMaxed ? 'Fertilizer: Max, its top level' : `Buy Fertilizer for ${dollars(crop.fertilizerCost)}`}
        buyTitle={fertilizerMaxed
          ? 'Fertilizer: MAX Level Reached'
          : `Fertilizer: +5% growth speed - Cost: $${formatNumber(crop.fertilizerCost, 1)}`}
        onBuy={buyFertilizer}
      >
        {autoBuyer('assistant', `Auto-purchases fertilizer every ${AUTO_PURCHASER_CYCLE_DAYS} days`)}
      </UpgradeRow>

      <UpgradeRow
        icon={UPGRADE_BETTER_SEEDS}
        name="Better Seeds"
        level={crop.betterSeedsLevel}
        effect={`Price +${seedsBonus(crop.betterSeedsLevel)}%, next +${seedsBonus(crop.betterSeedsLevel + 1)}%`}
        buyText={`${formatNumber(crop.betterSeedsCost, 1)} Kn`}
        state={buyState(knowledge >= crop.betterSeedsCost)}
        buyLabel={`Buy Better Seeds for ${formatNumber(crop.betterSeedsCost, 1)} Kn`}
        buyTitle={`Better Seeds: +${heirloomOwned ? 50 : 25}% sale price - Cost: ${formatNumber(crop.betterSeedsCost, 1)}Kn`}
        onBuy={buyBetterSeeds}
      >
        {autoBuyer('cultivator', `Auto-purchases better seeds every ${AUTO_PURCHASER_CYCLE_DAYS} days`)}
      </UpgradeRow>

      <UpgradeRow
        icon={UPGRADE_ADDITIONAL_PLOT}
        name="Additional Plot"
        level={crop.additionalPlotLevel}
        effect={`+${crop.additionalPlotLevel} ${crop.name} per harvest`}
        buyText={farmFull ? 'Farm full' : dollars(crop.additionalPlotCost)}
        state={buyState(money >= crop.additionalPlotCost, farmFull)}
        buyLabel={farmFull
          ? 'Additional Plot: Farm full, no free plots'
          : `Buy an Additional Plot for ${dollars(crop.additionalPlotCost)}`}
        buyTitle={farmFull
          ? 'Max Plots Reached'
          : `Additional Plot: +1 veggie/harvest - Cost: $${formatNumber(crop.additionalPlotCost, 1)}`}
        onBuy={buyAdditionalPlot}
      >
        {autoBuyer('surveyor', `Auto-purchases additional plot every ${AUTO_PURCHASER_CYCLE_DAYS} days`, farmFull)}
      </UpgradeRow>

      {crop.harvesterOwned ? (
        <UpgradeRow
          icon={UPGRADE_HARVESTER_SPEED}
          name="Harvester Speed"
          level={crop.harvesterSpeedLevel ?? 0}
          effect={`Every ${interval} s, next ${nextInterval} s`}
          buyText={dollars(harvesterSpeedCost)}
          state={buyState(money >= harvesterSpeedCost)}
          buyLabel={`Buy Harvester Speed for ${dollars(harvesterSpeedCost)}`}
          buyTitle={`Harvester Speed: +5% speed - Cost: $${formatNumber(harvesterSpeedCost, 1)}`}
          onBuy={buyHarvesterSpeed}
        >
          {autoBuyer('mechanic', `Auto-purchases Harvester Speed every ${AUTO_PURCHASER_CYCLE_DAYS} days`)}
        </UpgradeRow>
      ) : (
        <UpgradeRow
          icon={UPGRADE_HARVESTER_SPEED}
          name="Harvester Speed"
          level={crop.harvesterSpeedLevel ?? 0}
          effect="Needs an Auto Harvester"
          buyText="Locked"
          state="max"
          buyLabel="Harvester Speed: Locked until the crop has an Auto Harvester"
          buyTitle="Buy the Auto Harvester below first"
          onBuy={buyHarvesterSpeed}
        />
      )}

      {fitted ? (
        <div className={styles.row}>
          <img src={UPGRADE_AUTO_HARVESTER} alt="" aria-hidden="true" className={styles.rowIcon} />
          <div className={styles.rowInfo}>
            <span className={styles.rowName}>Auto Harvester</span>
            <span className={styles.rowEffect}>
              {speed > 1 ? `Tune-Up · every ${Math.ceil(interval / speed)} s` : `Factory fitted · every ${interval} s`}
            </span>
            <span className={styles.harvestBar}><span key={crop.name} className="glide" style={glideFill(harvesterShare, harvesterGlides)} /></span>
          </div>
          <span className={`${styles.buy} ${styles.fitted}`} title="Engineers' Auto Harvesters come fitted to every crop and stay on">On</span>
        </div>
      ) : crop.harvesterOwned ? (
        <div className={styles.row}>
          <img src={UPGRADE_AUTO_HARVESTER} alt="" aria-hidden="true" className={styles.rowIcon} />
          <div className={styles.rowInfo}>
            <span className={styles.rowName}>Auto Harvester</span>
            <span className={styles.rowEffect}>
              {crop.autoHarvesterEnabled ? `Harvests every ${interval} s` : 'Paused: harvest by hand'}
            </span>
            {crop.autoHarvesterEnabled && (
              <span className={styles.harvestBar}><span key={crop.name} className="glide" style={glideFill(harvesterShare, harvesterGlides)} /></span>
            )}
          </div>
          <button
            type="button"
            className={`${styles.buy} ${crop.autoHarvesterEnabled ? styles.toggleOn : styles.toggleOff}`}
            onClick={toggleAutoHarvester}
            aria-label={`Auto Harvester for ${crop.name}: ${crop.autoHarvesterEnabled ? 'On' : 'Paused'}`}
            title={crop.autoHarvesterEnabled
              ? 'Auto Harvester: Active (click to pause)'
              : 'Auto Harvester: Paused (click to resume)'}
          >
            {crop.autoHarvesterEnabled ? 'On' : 'Paused'}
          </button>
        </div>
      ) : (
        <UpgradeRow
          icon={UPGRADE_AUTO_HARVESTER}
          name="Auto Harvester"
          effect="Harvests when ready"
          buyText={dollars(crop.harvesterCost)}
          state={buyState(money >= crop.harvesterCost)}
          buyLabel={`Buy the Auto Harvester for ${dollars(crop.harvesterCost)}`}
          buyTitle={`Auto Harvester - Cost: $${formatNumber(crop.harvesterCost, 1)}`}
          onBuy={buyHarvester}
        />
      )}
    </section>
  );
});

CropUpgradesPanel.displayName = 'CropUpgradesPanel';

export default CropUpgradesPanel;
