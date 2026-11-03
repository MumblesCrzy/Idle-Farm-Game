/**
 * Shopfront Tab Component
 *
 * Sells trees and crafted goods for the Christmas Tree Shop. Laid out like the
 * Farm Stand:
 * - A bar with the market demand, Golden Bell income and the Wreath Sign's daily
 *   bonus, so the tab fits a 1600x1000 window
 * - Price cards for each tree and decoration, across qualities
 * - Sell sliders and buttons, priced by the shared pricing module
 * - Garland, candles and ornaments sold on their own
 * Sales milestones are achievements now, so they live in the achievements list.
 */

import { memo, useCallback, useMemo, useState, type ChangeEvent, type FC } from 'react';
import BaseTab from './BaseTab';
import EventArt, { type EventArtSource } from './EventArt';
import EventUpgradesPanel from './EventUpgradesPanel';
import type { UseChristmasEventReturn } from '../hooks/useChristmasEvent';
import type { EventUpgrade, TreeInventory, TreeQuality, TreeType } from '../types/christmasEvent';
import { CHRISTMAS_ART, EVENT_CONSTANTS, TREE_DEFINITIONS } from '../data/christmasEventData';
import {
  getTreeSaleCheer,
  inventorySaleCheer,
  ownsUpgrade,
  parseTreeKey
} from '../utils/christmasTreePricing';
import frame from './TreeShopSections.module.css';
import styles from './ShopfrontTab.module.css';

type FormatNumber = (num: number, decimalPlaces?: number) => string;

const C = EVENT_CONSTANTS;

/** Small Holiday Cheer icon that screen readers read as the currency name */
const Cheer: FC<{ size?: number }> = ({ size = 16 }) => (
  <EventArt art={CHRISTMAS_ART.cheer} size={size} alt="Holiday Cheer" className={styles.currencyIcon} />
);

// ============================================================================
// PRICE CARD VARIANTS
// ============================================================================

type Finish = 'plain' | 'ornamented' | 'candled' | 'luxury';

/** A price card: one tree type with one decoration, across all qualities */
interface TreeVariant {
  key: string; // treeType_decoration
  name: string;
  art: EventArtSource;
}

const TREES: TreeType[] = ['pine', 'spruce', 'fir'];
const FINISHES: Finish[] = ['plain', 'ornamented', 'candled', 'luxury'];

const FINISH_ART: Record<Finish, EventArtSource | null> = {
  plain: null, // the tree's own art
  ornamented: CHRISTMAS_ART.decorated,
  candled: CHRISTMAS_ART.candles,
  luxury: CHRISTMAS_ART.luxury,
};

const FINISH_NAMES: Record<Finish, string> = { plain: '', ornamented: 'Ornamented', candled: 'Candlelit', luxury: 'Luxury' };

/**
 * Every tree in every decoration, in display order. Garland is sold on its own
 * now, so garlanded trees from older saves are sold by Sell All only.
 */
const TREE_VARIANTS: TreeVariant[] = TREES.flatMap(treeType =>
  FINISHES.map(finish => ({
    key: `${treeType}_${finish}`,
    name: finish === 'plain'
      ? TREE_DEFINITIONS[treeType].displayName
      : `${FINISH_NAMES[finish]} ${TREE_DEFINITIONS[treeType].name}`,
    art: FINISH_ART[finish] ?? CHRISTMAS_ART[treeType],
  }))
);

/** Trees held under one inventory key (treeType_quality_decoration) */
interface StockEntry {
  key: string;
  quantity: number;
}

const QUALITY_NAMES: Record<TreeQuality, string> = { normal: 'Normal', perfect: 'Perfect', luxury: 'Luxury' };
const QUALITY_ART: Partial<Record<TreeQuality, EventArtSource>> = { perfect: CHRISTMAS_ART.perfect, luxury: CHRISTMAS_ART.luxury };

/** Lower qualities sell first */
const QUALITY_SELL_ORDER: Record<string, number> = { normal: 0, perfect: 1, luxury: 2 };
const sellOrder = (entry: StockEntry) => QUALITY_SELL_ORDER[parseTreeKey(entry.key).quality] ?? 999;
const qualityOf = (key: string) => parseTreeKey(key).quality as TreeQuality;

/** Groups inventory by price card variant, each list in selling order */
function groupStockByVariant(inventory: TreeInventory): Record<string, StockEntry[]> {
  const groups: Record<string, StockEntry[]> = {};
  for (const [key, quantity] of Object.entries(inventory)) {
    if (!(quantity > 0)) continue;
    const { treeType, decoration } = parseTreeKey(key);
    (groups[`${treeType}_${decoration}`] ??= []).push({ key, quantity });
  }
  for (const entries of Object.values(groups)) {
    entries.sort((a, b) => sellOrder(a) - sellOrder(b));
  }
  return groups;
}

/** Cheer for selling this many trees in selling order, before Magical Register tips */
function stockSaleCheer(
  stock: StockEntry[],
  quantity: number,
  upgrades: readonly EventUpgrade[],
  demandMultiplier: number
): number {
  let remaining = quantity;
  let cheer = 0;
  for (const entry of stock) {
    if (remaining <= 0) break;
    const count = Math.min(entry.quantity, remaining);
    cheer += getTreeSaleCheer(entry.key, count, upgrades, demandMultiplier);
    remaining -= count;
  }
  return cheer;
}

// ============================================================================
// PRICE CARD
// ============================================================================

interface PriceCardProps {
  variant: TreeVariant;
  /** Inventory for this variant, in selling order */
  stock: StockEntry[];
  upgrades: readonly EventUpgrade[];
  demandMultiplier: number;
  onSell: (variantKey: string, quantity: number) => void;
  formatNumber: FormatNumber;
}

const PriceCard: FC<PriceCardProps> = memo(({ variant, stock, upgrades, demandMultiplier, onSell, formatNumber }) => {
  const [sellQuantity, setSellQuantity] = useState(0);

  const quantity = stock.reduce((sum, entry) => sum + entry.quantity, 0);
  // Stock can shrink while a quantity is picked, when the Elves decorate one
  const selected = Math.min(sellQuantity, quantity);

  // What selling one tree of each quality pays, priced the same way a sale is
  const prices = stock.map(entry => getTreeSaleCheer(entry.key, 1, upgrades, demandMultiplier));
  const lowestPrice = Math.min(...prices);
  const highestPrice = Math.max(...prices);
  const priceTitle = stock
    .map((entry, i) => `${QUALITY_NAMES[qualityOf(entry.key)] ?? 'Normal'}: ${prices[i]}`)
    .join(' | ');
  const selectedValue = stockSaleCheer(stock, selected, upgrades, demandMultiplier);
  const totalValue = stockSaleCheer(stock, quantity, upgrades, demandMultiplier);

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
        <h3 className={styles.treeName}>{variant.name}</h3>
        <span className={styles.priceValue} title={priceTitle}>
          <span className="sr-only">Price: </span>
          {highestPrice > lowestPrice ? `${lowestPrice}-${highestPrice}` : lowestPrice} <Cheer />
        </span>
        <div className={styles.stockBreakdown}>
            {stock.map(entry => {
              const quality = qualityOf(entry.key);
              const art = QUALITY_ART[quality];
              return (
                <span
                  key={entry.key}
                  className={art ? `${styles.qualityChip} ${styles.specialChip}` : styles.qualityChip}
                >
                  {art && <EventArt art={art} size={12} />}
                  {entry.quantity} {QUALITY_NAMES[quality] ?? 'Normal'}
                </span>
              );
            })}
        </div>
      </div>

      <div className={styles.sellControls}>
        <div className={styles.sliderRow}>
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
          <span className={styles.sliderLabel}>
            {selected} / {quantity}
            {selected > 0 && (
              <span className={styles.totalValue}> · {formatNumber(selectedValue, 1)} <Cheer /></span>
            )}
          </span>
        </div>
        <div className={styles.sellButtons}>
          <button
            type="button"
            className={styles.sellButton}
            onClick={handleSellSelected}
            disabled={selected === 0}
            aria-label={`Sell Selected: ${selected} ${variant.name} for ${formatNumber(selectedValue, 1)} Holiday Cheer`}
          >
            Sell Selected
          </button>
          <button
            type="button"
            className={styles.sellAllButton}
            onClick={handleSellAll}
            aria-label={`Sell All: ${quantity} ${variant.name} for ${formatNumber(totalValue, 1)} Holiday Cheer`}
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

type Good = keyof typeof C.GOOD_PRICES;

interface GoodDefinition {
  good: Good;
  name: string;
  singular: string;
  hint: string;
  art: EventArtSource;
}

const GOODS: GoodDefinition[] = [
  { good: 'garlands', name: 'Festive Garland', singular: 'Garland', hint: 'Woven in the Workshop', art: CHRISTMAS_ART.garland },
  { good: 'candles', name: 'Candles', singular: 'Candle', hint: 'Also decorates trees', art: CHRISTMAS_ART.candles },
  { good: 'ornaments', name: 'Ornaments', singular: 'Ornament', hint: 'Also decorates trees', art: CHRISTMAS_ART.ornaments },
];

interface GoodCardProps {
  definition: GoodDefinition;
  stock: number;
  onSell: (good: Good, quantity: number) => void;
  formatNumber: FormatNumber;
}

const GoodCard: FC<GoodCardProps> = memo(({ definition, stock, onSell, formatNumber }) => {
  const price = C.GOOD_PRICES[definition.good];
  const totalValue = price * stock;

  return (
    <section className={styles.goodSection} aria-label={definition.name} title={definition.hint}>
      <div className={styles.goodHeader}>
        <h3 className={styles.goodTitle}>
          <EventArt art={definition.art} size={22} />
          {definition.name}
        </h3>
        <span className={styles.goodPrice}>{price} <Cheer /> each</span>
      </div>
      <div className={styles.goodRow}>
        <span className={styles.goodStock}>In Stock: {formatNumber(stock, 1)}</span>
        <div className={styles.goodButtons}>
        <button
          type="button"
          className={styles.sellButton}
          onClick={() => onSell(definition.good, 1)}
          disabled={stock < 1}
          aria-label={`Sell 1 ${definition.singular} for ${price} Holiday Cheer`}
        >
          Sell 1
        </button>
        <button
          type="button"
          className={styles.sellAllButton}
          onClick={() => onSell(definition.good, stock)}
          disabled={stock < 1}
          aria-label={`Sell All: ${stock} ${definition.name} for ${formatNumber(totalValue, 1)} Holiday Cheer`}
        >
          Sell All ({formatNumber(totalValue, 1)} <Cheer />)
        </button>
        </div>
      </div>
    </section>
  );
});

GoodCard.displayName = 'GoodCard';

// ============================================================================
// SHOPFRONT TAB
// ============================================================================

interface ShopfrontTabProps {
  event: UseChristmasEventReturn;
  formatNumber: FormatNumber;
}

const ShopfrontTab: FC<ShopfrontTabProps> = ({ event, formatNumber }) => {
  const {
    eventState,
    materials,
    holidayCheer,
    sellTrees,
    sellAllTrees,
    sellGarland,
    sellCandle,
    sellOrnament,
    claimDailyBonus,
    dailyBonusAvailable,
    demandMultiplier,
    passiveCheerPerSecond,
    purchaseUpgrade,
  } = event;
  const { treeInventory, upgrades, dailyBonus } = eventState;

  const stockByVariant = useMemo(() => groupStockByVariant(treeInventory), [treeInventory]);
  const treesInStock = useMemo(
    () => Object.values(treeInventory).reduce((sum, quantity) => sum + Math.max(0, quantity), 0),
    [treeInventory]
  );
  const sellAllValue = useMemo(
    () => inventorySaleCheer(treeInventory, upgrades, demandMultiplier),
    [treeInventory, upgrades, demandMultiplier]
  );

  // Sells lower qualities first, one inventory key at a time
  const sellVariant = useCallback((variantKey: string, quantity: number) => {
    let remaining = quantity;
    for (const entry of stockByVariant[variantKey] ?? []) {
      if (remaining <= 0) break;
      const toSell = Math.min(entry.quantity, remaining);
      sellTrees(entry.key, toSell);
      remaining -= toSell;
    }
  }, [stockByVariant, sellTrees]);

  const sellGood = useCallback((good: Good, quantity: number) => {
    if (good === 'garlands') sellGarland(quantity);
    else if (good === 'candles') sellCandle(quantity);
    else sellOrnament(quantity);
  }, [sellGarland, sellCandle, sellOrnament]);

  const handleClaimDailyBonus = useCallback(() => {
    claimDailyBonus();
  }, [claimDailyBonus]);

  const hasWreathSign = ownsUpgrade(upgrades, 'wreath_sign');

  const mainContent = (
    <div className={frame.container}>
      {/* Left column: the shop's bar, price cards and goods */}
      <div className={frame.leftColumn}>
        {/* Market demand, then the Golden Bell and the Wreath Sign once they are owned */}
        <div className={styles.shopBar}>
          <div className={styles.demand}>
            <EventArt art={CHRISTMAS_ART.shopfront} size={24} />
            <span className={styles.demandLabel}>Market Demand:</span>
            <span className={styles.demandMultiplier}>×{demandMultiplier.toFixed(2)}</span>
            <span className={styles.demandHint}>
              {demandMultiplier >= C.MAX_DEMAND_MULTIPLIER ? '(at its Christmas peak)' : '(rises toward Christmas)'}
            </span>
          </div>

          {passiveCheerPerSecond > 0 && (
            <section className={styles.bell} aria-label="Golden Bell income">
              <EventArt art={CHRISTMAS_ART.bell} size={32} />
              <div className={styles.barText}>
                <h3 className={styles.barTitle}>
                  Golden Bell: +{formatNumber(passiveCheerPerSecond, 2)} <Cheer /> per second
                </h3>
                <p className={styles.barHint}>
                  {passiveCheerPerSecond < 1
                    ? `1 Holiday Cheer every ${formatNumber(1 / passiveCheerPerSecond, 1)} seconds`
                    : 'The bell rings while you farm'}
                </p>
              </div>
            </section>
          )}

          {hasWreathSign && (
            <section className={styles.wreath} aria-label="Daily bonus">
              <EventArt art={CHRISTMAS_ART.wreath} size={32} />
              <div className={styles.barText}>
                <h3 className={styles.barTitle}>Wreath Sign</h3>
                <button
                  type="button"
                  className={styles.claimButton}
                  onClick={handleClaimDailyBonus}
                  disabled={!dailyBonusAvailable}
                  title="Carolers stop by the sign once a day"
                >
                  {dailyBonusAvailable
                    ? <>Claim daily bonus +{dailyBonus.bonusAmount} <Cheer /></>
                    : 'Claimed. Come back tomorrow!'}
                </button>
              </div>
            </section>
          )}
        </div>

        {treesInStock > 0 ? (
          <>
            <div className={styles.priceCardsGrid}>
              {TREE_VARIANTS.map(variant => {
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
              onClick={sellAllTrees}
              aria-label={`Sell all trees: ${treesInStock} for ${formatNumber(sellAllValue, 1)} Holiday Cheer`}
            >
              Sell all trees ({formatNumber(treesInStock, 1)} for {formatNumber(sellAllValue, 1)} <Cheer />)
            </button>
          </>
        ) : (
          <div className={styles.emptyState}>
            <p className={styles.emptyStateTitle}>
              <EventArt art={CHRISTMAS_ART.pine} size={24} />
              No trees in the shop
            </p>
            <p>Harvest trees on the Tree Farm, then decorate them in the Workshop to raise their price.</p>
          </div>
        )}

        {/* Goods sold on their own */}
        <div className={styles.goodsRow}>
          {GOODS.map(definition => (
            <GoodCard
              key={definition.good}
              definition={definition}
              stock={materials[definition.good]}
              onSell={sellGood}
              formatNumber={formatNumber}
            />
          ))}
        </div>
      </div>

      {/* Right column: Shopfront Upgrades */}
      <div className={`${frame.rightColumn} ${frame.shopColumn}`}>
        <EventUpgradesPanel
          title="Shopfront Upgrades"
          category="shopfront"
          upgrades={upgrades}
          currency="cheer"
          balance={holidayCheer}
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
};

const MemoizedShopfrontTab = memo(ShopfrontTab);
MemoizedShopfrontTab.displayName = 'ShopfrontTab';

export default MemoizedShopfrontTab;
