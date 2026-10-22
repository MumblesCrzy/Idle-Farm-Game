/**
 * Farm Stand Tab Component
 *
 * Sells pumpkins and goods for the Fall Pumpkin Rush.
 * Features:
 * - Price cards for each pumpkin variety and finish, across qualities
 * - Sell sliders and buttons, priced by the shared pricing module
 * - Pies, candles and stencils sold on their own
 * - A bar with the market demand, the daily bonus (Chalkboard Sign) and Hayride income,
 *   so the tab fits a 1600x1000 window
 */

import { memo, useCallback, useMemo, useState, type ChangeEvent, type FC } from 'react';
import BaseTab from './BaseTab';
import EventArt, { type EventArtSource } from './EventArt';
import EventUpgradesPanel from './EventUpgradesPanel';
import type { PumpkinGood, UsePumpkinEventReturn } from '../hooks/usePumpkinEvent';
import type { EventUpgrade } from '../types/eventUpgrades';
import type {
  PumpkinFinish,
  PumpkinInventory,
  PumpkinQuality,
  PumpkinVariety
} from '../types/pumpkinEvent';
import {
  CARVABLE_VARIETIES,
  PUMPKIN_ART,
  PUMPKIN_EVENT_CONSTANTS,
  PUMPKIN_FINISH_NAMES,
  PUMPKIN_VARIETIES
} from '../data/pumpkinEventData';
import {
  floorCandyCorn,
  getPumpkinPrice,
  getPumpkinSaleCandyCorn,
  getSaleMultiplier,
  ownsUpgrade,
  parsePumpkinKey
} from '../utils/pumpkinPricing';
import { PUMPKIN_UPGRADE_CHALKBOARD, PUMPKIN_UPGRADE_HAYRIDE } from '../config/assetPaths';
import styles from './FarmStandTab.module.css';

type FormatNumber = (num: number, decimalPlaces?: number) => string;

const C = PUMPKIN_EVENT_CONSTANTS;

/** The Chalkboard Sign and Hayride upgrades' art, shown on the stand's bar */
const CHALKBOARD_ART: EventArtSource = { image: PUMPKIN_UPGRADE_CHALKBOARD, emoji: '🪧' };
const HAYRIDE_ART: EventArtSource = { image: PUMPKIN_UPGRADE_HAYRIDE, emoji: '🛻' };

/** Small Candy Corn icon that screen readers read as the currency name */
const CandyCorn: FC<{ size?: number }> = ({ size = 16 }) => (
  <EventArt art={PUMPKIN_ART.candyCorn} size={size} alt="Candy Corn" className={styles.currencyIcon} />
);

// ============================================================================
// PRICE CARD VARIANTS
// ============================================================================

/** A price card: one variety with one finish, across all qualities */
interface PumpkinVariant {
  key: string; // variety_finish
  name: string;
  art: EventArtSource;
}

const FINISHES: PumpkinFinish[] = ['plain', 'carved', 'candlelit', 'lantern'];

const FINISH_ART: Record<PumpkinFinish, EventArtSource | null> = {
  plain: null, // the variety's own art
  carved: PUMPKIN_ART.carved,
  candlelit: PUMPKIN_ART.candlelit,
  lantern: PUMPKIN_ART.lantern,
};

const variantKeyOf = (variety: PumpkinVariety, finish: PumpkinFinish) => `${variety}_${finish}`;

function variantName(variety: PumpkinVariety, finish: PumpkinFinish): string {
  const definition = PUMPKIN_VARIETIES[variety];
  if (finish === 'plain') return definition.displayName;
  if (finish === 'lantern') return `${definition.name} ${PUMPKIN_FINISH_NAMES.lantern}`;
  return `${PUMPKIN_FINISH_NAMES[finish]} ${definition.displayName}`;
}

/** A card name with "Jack-o'-Lantern" kept on one line, so it never breaks at a hyphen */
function unbrokenName(name: string) {
  const lantern = PUMPKIN_FINISH_NAMES.lantern;
  const at = name.indexOf(lantern);
  if (at < 0) return name;
  return (
    <>
      {name.slice(0, at)}
      <span className={styles.unbroken}>{lantern}</span>
      {name.slice(at + lantern.length)}
    </>
  );
}

/** Every carvable variety in every finish, in display order */
const PUMPKIN_VARIANTS: PumpkinVariant[] = CARVABLE_VARIETIES.flatMap(variety =>
  FINISHES.map(finish => ({
    key: variantKeyOf(variety, finish),
    name: variantName(variety, finish),
    art: FINISH_ART[finish] ?? PUMPKIN_VARIETIES[variety].art,
  }))
);

/** Pumpkins held under one inventory key (variety_quality_finish) */
interface StockEntry {
  key: string;
  quantity: number;
}

const QUALITY_NAMES: Record<PumpkinQuality, string> = { normal: 'Normal', blueRibbon: 'Blue Ribbon' };

/** Normal pumpkins sell before Blue Ribbons */
const QUALITY_SELL_ORDER: Record<PumpkinQuality, number> = { normal: 0, blueRibbon: 1 };
const sellOrder = (entry: StockEntry) => QUALITY_SELL_ORDER[parsePumpkinKey(entry.key).quality] ?? 999;

/** Groups inventory by price card variant, each list in selling order */
function groupStockByVariant(inventory: PumpkinInventory): Record<string, StockEntry[]> {
  const groups: Record<string, StockEntry[]> = {};
  for (const [key, quantity] of Object.entries(inventory)) {
    if (!(quantity > 0)) continue;
    const { variety, finish } = parsePumpkinKey(key);
    (groups[variantKeyOf(variety, finish)] ??= []).push({ key, quantity });
  }
  for (const entries of Object.values(groups)) {
    entries.sort((a, b) => sellOrder(a) - sellOrder(b));
  }
  return groups;
}

/** Candy Corn for selling this many pumpkins in selling order, before Fortune Teller tips */
function stockSaleCandyCorn(
  stock: StockEntry[],
  quantity: number,
  upgrades: EventUpgrade[],
  demandMultiplier: number
): number {
  let remaining = quantity;
  let candyCorn = 0;
  for (const entry of stock) {
    if (remaining <= 0) break;
    const count = Math.min(entry.quantity, remaining);
    candyCorn += getPumpkinSaleCandyCorn(entry.key, count, upgrades, demandMultiplier);
    remaining -= count;
  }
  return candyCorn;
}

/** Candy Corn from Sell All, priced the way sellAllPumpkins prices it (tips excluded) */
function inventorySaleCandyCorn(
  inventory: PumpkinInventory,
  upgrades: EventUpgrade[],
  demandMultiplier: number
): number {
  let value = 0;
  for (const [key, quantity] of Object.entries(inventory)) {
    if (quantity > 0) value += getPumpkinPrice(key, upgrades, demandMultiplier) * quantity;
  }
  return floorCandyCorn(value * getSaleMultiplier(upgrades));
}

// ============================================================================
// PRICE CARD
// ============================================================================

interface PriceCardProps {
  variant: PumpkinVariant;
  /** Inventory for this variant, in selling order */
  stock: StockEntry[];
  upgrades: EventUpgrade[];
  demandMultiplier: number;
  onSell: (variantKey: string, quantity: number) => void;
  formatNumber: FormatNumber;
}

const PriceCard: FC<PriceCardProps> = memo(({ variant, stock, upgrades, demandMultiplier, onSell, formatNumber }) => {
  const [sellQuantity, setSellQuantity] = useState(0);

  const quantity = stock.reduce((sum, entry) => sum + entry.quantity, 0);
  // Stock can shrink while a quantity is picked, when the Scarecrow Crew carves one
  const selected = Math.min(sellQuantity, quantity);

  // What selling one pumpkin of each quality pays, priced the same way a sale is
  const prices = stock.map(entry => getPumpkinSaleCandyCorn(entry.key, 1, upgrades, demandMultiplier));
  const lowestPrice = Math.min(...prices);
  const highestPrice = Math.max(...prices);
  const priceTitle = stock
    .map((entry, i) => `${QUALITY_NAMES[parsePumpkinKey(entry.key).quality]}: ${prices[i]}`)
    .join(' | ');
  const selectedValue = stockSaleCandyCorn(stock, selected, upgrades, demandMultiplier);
  const totalValue = stockSaleCandyCorn(stock, quantity, upgrades, demandMultiplier);

  const handleSellSelected = () => {
    if (selected > 0) {
      onSell(variant.key, selected);
      setSellQuantity(0);
    }
  };

  const handleSellAll = () => {
    if (quantity > 0) {
      onSell(variant.key, quantity);
      setSellQuantity(0);
    }
  };

  const handleSliderChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSellQuantity(Math.min(parseInt(e.target.value, 10) || 0, quantity));
  };

  if (quantity === 0) {
    return null;
  }

  return (
    <section className={styles.priceCard} aria-label={variant.name}>
      <div className={styles.cardHeader}>
        <EventArt art={variant.art} size={32} className={styles.cardArt} />
        <div className={styles.cardTitle}>
          <h3 className={styles.pumpkinName}>{unbrokenName(variant.name)}</h3>
          <div className={styles.stockBreakdown}>
            {stock.map(entry => {
              const quality = parsePumpkinKey(entry.key).quality;
              return (
                <span
                  key={entry.key}
                  className={quality === 'blueRibbon' ? `${styles.qualityChip} ${styles.blueRibbonChip}` : styles.qualityChip}
                >
                  {quality === 'blueRibbon' && <EventArt art={PUMPKIN_ART.blueRibbon} size={12} />}
                  {entry.quantity} {QUALITY_NAMES[quality]}
                </span>
              );
            })}
          </div>
        </div>
        <span className={styles.priceValue} title={priceTitle}>
          <span className="sr-only">Price: </span>
          {highestPrice > lowestPrice ? `${lowestPrice}-${highestPrice}` : lowestPrice} <CandyCorn />
        </span>
      </div>

      <div className={styles.sellControls}>
        <input
          type="range"
          min="0"
          max={quantity}
          value={selected}
          onChange={handleSliderChange}
          className={styles.sellSlider}
          aria-label={`Number of ${variant.name} to sell`}
          aria-valuetext={`${selected} of ${quantity}`}
        />
        <div className={styles.sliderLabel}>
          Sell: {selected} / {quantity}
          {selected > 0 && (
            <span className={styles.totalValue}> ({formatNumber(selectedValue, 1)} <CandyCorn />)</span>
          )}
        </div>
        <div className={styles.sellButtons}>
          <button
            type="button"
            className={styles.sellButton}
            onClick={handleSellSelected}
            disabled={selected === 0}
            aria-label={`Sell Selected: ${selected} ${variant.name} for ${formatNumber(selectedValue, 1)} Candy Corn`}
          >
            Sell Selected
          </button>
          <button
            type="button"
            className={styles.sellAllButton}
            onClick={handleSellAll}
            aria-label={`Sell All: ${quantity} ${variant.name} for ${formatNumber(totalValue, 1)} Candy Corn`}
          >
            Sell All
          </button>
        </div>
      </div>
    </section>
  );
});

PriceCard.displayName = 'PriceCard';

// ============================================================================
// GOODS
// ============================================================================

interface GoodDefinition {
  good: PumpkinGood;
  name: string;
  singular: string;
  hint: string;
  art: EventArtSource;
}

const GOODS: GoodDefinition[] = [
  { good: 'pies', name: 'Pumpkin Pies', singular: 'Pumpkin Pie', hint: 'Baked in the Carving Barn', art: PUMPKIN_ART.pies },
  { good: 'candles', name: 'Candles', singular: 'Candle', hint: 'Also lights pumpkins', art: PUMPKIN_ART.candles },
  { good: 'stencils', name: 'Stencils', singular: 'Stencil', hint: 'Also carves pumpkins', art: PUMPKIN_ART.stencils },
];

interface GoodCardProps {
  definition: GoodDefinition;
  stock: number;
  onSell: (good: PumpkinGood, quantity: number) => void;
  formatNumber: FormatNumber;
}

const GoodCard: FC<GoodCardProps> = memo(({ definition, stock, onSell, formatNumber }) => {
  const price = C.GOOD_PRICES[definition.good];
  const totalValue = price * stock;

  return (
    <section className={styles.goodSection} aria-label={definition.name}>
      <div className={styles.goodHeader}>
        <h3 className={styles.goodTitle}>
          <EventArt art={definition.art} size={22} />
          {definition.name}
        </h3>
        <span className={styles.goodPrice}>{price} <CandyCorn /> each</span>
      </div>
      <div className={styles.goodInfo}>
        <span className={styles.goodStock}>In Stock: {formatNumber(stock, 1)}</span>
        <span className={styles.goodHint}>{definition.hint}</span>
      </div>
      <div className={styles.goodButtons}>
        <button
          type="button"
          className={styles.sellButton}
          onClick={() => onSell(definition.good, 1)}
          disabled={stock < 1}
          aria-label={`Sell 1 ${definition.singular} for ${price} Candy Corn`}
        >
          Sell 1
        </button>
        <button
          type="button"
          className={styles.sellAllButton}
          onClick={() => onSell(definition.good, stock)}
          disabled={stock < 1}
          aria-label={`Sell All: ${stock} ${definition.name} for ${formatNumber(totalValue, 1)} Candy Corn`}
        >
          Sell All ({formatNumber(totalValue, 1)} <CandyCorn />)
        </button>
      </div>
    </section>
  );
});

GoodCard.displayName = 'GoodCard';

// ============================================================================
// FARM STAND TAB
// ============================================================================

interface FarmStandTabProps {
  event: UsePumpkinEventReturn;
  formatNumber: FormatNumber;
}

const FarmStandTab: FC<FarmStandTabProps> = memo(({ event, formatNumber }) => {
  const {
    eventState,
    candyCorn,
    sellPumpkins,
    sellAllPumpkins,
    sellGoods,
    claimDailyBonus,
    dailyBonusAvailable,
    demandMultiplier,
    passiveCandyCornPerSecond,
    purchaseUpgrade,
  } = event;
  const { inventory, materials, upgrades } = eventState;

  const stockByVariant = useMemo(() => groupStockByVariant(inventory), [inventory]);
  const pumpkinsInStock = useMemo(
    () => Object.values(inventory).reduce((sum, quantity) => sum + Math.max(0, quantity), 0),
    [inventory]
  );
  const sellAllValue = useMemo(
    () => inventorySaleCandyCorn(inventory, upgrades, demandMultiplier),
    [inventory, upgrades, demandMultiplier]
  );

  // Sells Normal pumpkins first, one inventory key at a time
  const sellVariant = useCallback((variantKey: string, quantity: number) => {
    let remaining = quantity;
    for (const entry of stockByVariant[variantKey] ?? []) {
      if (remaining <= 0) break;
      const toSell = Math.min(entry.quantity, remaining);
      sellPumpkins(entry.key, toSell);
      remaining -= toSell;
    }
  }, [stockByVariant, sellPumpkins]);

  const handleClaimDailyBonus = useCallback(() => {
    claimDailyBonus();
  }, [claimDailyBonus]);

  const hasChalkboardSign = ownsUpgrade(upgrades, 'chalkboard_sign');

  const mainContent = (
    <div className={styles.container}>
      {/* Left Column: the stand's bar, price cards and goods */}
      <div className={styles.leftColumn}>
        {/* Market demand, then the Hayride and the Chalkboard Special once they are owned */}
        <div className={styles.standBar}>
          <div className={styles.demand}>
            <EventArt art={PUMPKIN_ART.stand} size={24} />
            <span className={styles.demandLabel}>Market Demand:</span>
            <span className={styles.demandMultiplier}>×{demandMultiplier.toFixed(2)}</span>
            <span className={styles.demandHint}>
              {demandMultiplier >= PUMPKIN_EVENT_CONSTANTS.MAX_DEMAND_MULTIPLIER ? '(holds until Thanksgiving)' : '(rises toward Halloween)'}
            </span>
          </div>

          {passiveCandyCornPerSecond > 0 && (
            <section className={styles.hayride} aria-label="Hayride income">
              <EventArt art={HAYRIDE_ART} size={32} />
              <div className={styles.barText}>
                <h3 className={styles.barTitle}>
                  Hayride: +{formatNumber(passiveCandyCornPerSecond, 2)} <CandyCorn /> per second
                </h3>
                <p className={styles.barHint}>
                  {passiveCandyCornPerSecond < 1
                    ? `1 Candy Corn every ${formatNumber(1 / passiveCandyCornPerSecond, 1)} seconds`
                    : 'Visitors ride around the patch while you farm'}
                </p>
              </div>
            </section>
          )}

          {hasChalkboardSign && (
            <section className={styles.chalkboard} aria-label="Daily bonus">
              <EventArt art={CHALKBOARD_ART} size={32} />
              <div className={styles.barText}>
                <h3 className={styles.barTitle}>Chalkboard Special</h3>
                <button
                  type="button"
                  className={styles.claimButton}
                  onClick={handleClaimDailyBonus}
                  disabled={!dailyBonusAvailable}
                  title="Regulars stop by once a day for the special"
                >
                  {dailyBonusAvailable
                    ? <>Claim daily bonus +{C.DAILY_BONUS} <CandyCorn /></>
                    : 'Claimed. Come back tomorrow!'}
                </button>
              </div>
            </section>
          )}
        </div>

        {pumpkinsInStock > 0 ? (
          <>
            <div className={styles.priceCardsGrid}>
              {PUMPKIN_VARIANTS.map(variant => {
                const stock = stockByVariant[variant.key];
                return stock ? (
                  <PriceCard
                    key={variant.key}
                    variant={variant}
                    stock={stock}
                    upgrades={upgrades}
                    demandMultiplier={demandMultiplier}
                    onSell={sellVariant}
                    formatNumber={formatNumber}
                  />
                ) : null;
              })}
            </div>
            <button
              type="button"
              className={styles.sellEverythingButton}
              onClick={sellAllPumpkins}
              aria-label={`Sell all pumpkins: ${pumpkinsInStock} for ${formatNumber(sellAllValue, 1)} Candy Corn`}
            >
              Sell all pumpkins ({formatNumber(pumpkinsInStock, 1)} for {formatNumber(sellAllValue, 1)} <CandyCorn />)
            </button>
          </>
        ) : (
          <div className={styles.emptyState}>
            <p className={styles.emptyStateTitle}>
              <EventArt art={PUMPKIN_ART.sugarPie} size={24} />
              No pumpkins on the stand
            </p>
            <p>Harvest pumpkins in the Pumpkin Patch, then carve and light them in the Carving Barn to raise their price.</p>
          </div>
        )}

        {/* Goods sold on their own */}
        <div className={styles.goodsRow}>
          {GOODS.map(definition => (
            <GoodCard
              key={definition.good}
              definition={definition}
              stock={materials[definition.good]}
              onSell={sellGoods}
              formatNumber={formatNumber}
            />
          ))}
        </div>
      </div>

      {/* Right Column: Stand Upgrades */}
      <div className={styles.rightColumn}>
        <EventUpgradesPanel
          title="Stand Upgrades"
          category="shopfront"
          upgrades={upgrades}
          currency="candyCorn"
          balance={candyCorn}
          purchaseUpgrade={purchaseUpgrade}
          formatNumber={formatNumber}
        />
      </div>
    </div>
  );

  return (
    <BaseTab
      isUnlocked={true}
      mainContent={mainContent}
    />
  );
});

FarmStandTab.displayName = 'FarmStandTab';

export default FarmStandTab;
