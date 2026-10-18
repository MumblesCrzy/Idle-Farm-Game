/**
 * Shopfront Tab Component
 * 
 * Handles tree sales for the Christmas Tree Shop event.
 * Features:
 * - Price cards for each tree variant with demand multipliers
 * - Sell sliders and buttons for managing inventory
 * - Customer Feed with cozy messages
 * - Daily Bonus claim (requires Wreath Sign upgrade)
 */

import { memo, useCallback, useMemo, useState, type FC, type ChangeEvent } from 'react';
import type { TreeInventory, EventUpgrade, CraftingMaterials, EventMilestone } from '../types/christmasEvent';
import { TREE_PINE, TREE_SPRUCE, TREE_FIR, TREE_DECORATED, DECORATION_CANDLE, DECORATION_GARLAND, ICON_HOLIDAY_CHEER } from '../config/assetPaths';
import BaseTab from './BaseTab';
import EventUpgradesPanel from './EventUpgradesPanel';
import EventMilestones, { type EventMilestoneView } from './EventMilestones';
import { getTreePrice, getTreeSaleCheer, parseTreeKey } from '../utils/christmasTreePricing';
import styles from './ShopfrontTab.module.css';

/**
 * Helper to get tree image from tree key
 */
const getTreeImageFromKey = (treeKey: string): string | null => {
  if (treeKey.includes('pine')) return TREE_PINE;
  if (treeKey.includes('spruce')) return TREE_SPRUCE;
  if (treeKey.includes('fir')) return TREE_FIR;
  return null;
};

interface ShopfrontTabProps {
  treeInventory: TreeInventory;
  materials: CraftingMaterials;
  sellTrees: (treeKey: string, quantity: number) => void;
  sellGarland: (quantity: number) => void;
  sellCandle: (quantity: number) => void;
  sellOrnament: (quantity: number) => void;
  demandMultiplier: number;
  holidayCheer: number;
  upgrades: EventUpgrade[];
  formatNumber: (num: number, decimalPlaces?: number) => string;
  purchaseUpgrade: (upgradeId: string) => void;
  milestones: EventMilestone[];
  totalTreesSold: number;
  claimMilestone: (milestoneId: string) => unknown;
}

/** A price card: one tree type with one decoration, across all qualities */
interface TreeVariant {
  key: string; // treeType_decoration
  name: string;
  emoji: string;
}

/**
 * Price card variants. Garland is sold as a standalone item now, so garlanded
 * trees from older saves are sold by Sell All only.
 * Luxury trees require both ornaments AND candles.
 */
const TREE_VARIANTS: TreeVariant[] = [
  { key: 'pine_plain', name: 'Pine Tree', emoji: '🌲' },
  { key: 'pine_ornamented', name: 'Ornamented Pine', emoji: '🎄' },
  { key: 'pine_candled', name: 'Candled Pine', emoji: '🕯️' },
  { key: 'pine_luxury', name: 'Luxury Pine', emoji: '✨' },
  { key: 'spruce_plain', name: 'Spruce Tree', emoji: '🌲' },
  { key: 'spruce_ornamented', name: 'Ornamented Spruce', emoji: '🎄' },
  { key: 'spruce_candled', name: 'Candled Spruce', emoji: '🕯️' },
  { key: 'spruce_luxury', name: 'Luxury Spruce', emoji: '✨' },
  { key: 'fir_plain', name: 'Fir Tree', emoji: '🌲' },
  { key: 'fir_ornamented', name: 'Ornamented Fir', emoji: '🎄' },
  { key: 'fir_candled', name: 'Candled Fir', emoji: '🕯️' },
  { key: 'fir_luxury', name: 'Luxury Fir', emoji: '✨' },
];

/** Trees held under one inventory key (treeType_quality_decoration) */
interface StockEntry {
  key: string;
  quantity: number;
}

/** Lower qualities sell first */
const QUALITY_SELL_ORDER: Record<string, number> = { normal: 0, perfect: 1, luxury: 2 };
const sellOrder = (entry: StockEntry) => QUALITY_SELL_ORDER[parseTreeKey(entry.key).quality] ?? 999;

/** Groups inventory by price card variant, each list in selling order */
function groupStockByVariant(inventory: TreeInventory): Record<string, StockEntry[]> {
  const groups: Record<string, StockEntry[]> = {};
  for (const [key, quantity] of Object.entries(inventory)) {
    if (!quantity) continue;
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
  upgrades: EventUpgrade[],
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

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * Individual tree variant price card
 */
interface PriceCardProps {
  variant: TreeVariant;
  /** Inventory for this variant, in selling order */
  stock: StockEntry[];
  upgrades: EventUpgrade[];
  demandMultiplier: number;
  onSell: (variantKey: string, quantity: number) => void;
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

const PriceCard: FC<PriceCardProps> = memo(({ variant, stock, upgrades, demandMultiplier, onSell, formatNumber }) => {
  const [sellQuantity, setSellQuantity] = useState(0);

  const quantity = stock.reduce((sum, entry) => sum + entry.quantity, 0);
  // Price per tree for each quality held, priced the same way a sale is
  const prices = stock.map(entry => getTreePrice(entry.key, upgrades, demandMultiplier));
  const lowestPrice = Math.min(...prices);
  const highestPrice = Math.max(...prices);
  const priceTitle = stock
    .map((entry, i) => `${capitalize(parseTreeKey(entry.key).quality)}: ${prices[i]}`)
    .join(' | ');
  const totalValue = stockSaleCheer(stock, sellQuantity, upgrades, demandMultiplier);

  const handleSellAll = () => {
    if (quantity > 0) {
      onSell(variant.key, quantity);
      setSellQuantity(0);
    }
  };

  const handleSellSelected = () => {
    if (sellQuantity > 0) {
      onSell(variant.key, sellQuantity);
      setSellQuantity(0);
    }
  };

  const handleSliderChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSellQuantity(Math.min(parseInt(e.target.value) || 0, quantity));
  };

  if (quantity === 0) {
    return null; // Don't show variants with no inventory
  }

  return (
    <div className={styles.priceCard}>
      <div className={styles.cardHeader}>
        <span className={styles.treeEmoji}>
          {variant.emoji === '🌲' ? (
            <img src={getTreeImageFromKey(variant.key) || TREE_PINE} alt={variant.name} className={styles.treeImage} />
          ) : variant.emoji === '🎄' ? (
            <img src={TREE_DECORATED} alt={variant.name} className={styles.treeImage} />
          ) : variant.emoji === '🕯️' ? (
            <img src={DECORATION_CANDLE} alt={variant.name} className={styles.treeImage} />
          ) : (
            variant.emoji
          )}
        </span>
        <div className={styles.cardTitle}>
          <div className={styles.treeName}>{variant.name}</div>
        </div>
        <span className={styles.priceLabel}>Price:</span>
        <span className={styles.priceValue} title={priceTitle}>
          {highestPrice > lowestPrice ? `${lowestPrice}-${highestPrice}` : lowestPrice} <img src={ICON_HOLIDAY_CHEER} alt="Holiday Cheer" className={styles.cheerIcon} />
        </span>
      </div>

      <div className={styles.sellControls}>
        <input
          type="range"
          min="0"
          max={quantity}
          value={sellQuantity}
          onChange={handleSliderChange}
          className={styles.sellSlider}
          aria-label={`Number of ${variant.name} trees to sell`}
        />
        <div className={styles.sliderLabel}>
          Sell: {sellQuantity} / {quantity}
          {sellQuantity > 0 && (
            <span className={styles.totalValue}> ({formatNumber(totalValue, 1)} <img src={ICON_HOLIDAY_CHEER} alt="Holiday Cheer" className={styles.cheerIcon} />)</span>
          )}
        </div>
        <div className={styles.sellButtons}>
          <button
            className={styles.sellButton}
            onClick={handleSellSelected}
            disabled={sellQuantity === 0}
          >
            Sell Selected
          </button>
          <button
            className={styles.sellAllButton}
            onClick={handleSellAll}
          >
            Sell All
          </button>
        </div>
      </div>
    </div>
  );
});

PriceCard.displayName = 'PriceCard';

/**
 * Main Shopfront Tab Component
 */
const ShopfrontTab: FC<ShopfrontTabProps> = ({
  treeInventory,
  materials,
  sellTrees,
  sellGarland,
  sellCandle,
  sellOrnament,
  demandMultiplier,
  holidayCheer,
  upgrades,
  formatNumber,
  purchaseUpgrade,
  milestones,
  totalTreesSold,
  claimMilestone,
}) => {
  const milestoneViews = useMemo<EventMilestoneView[]>(() => milestones.map(milestone => ({
    id: milestone.id,
    name: milestone.name,
    description: milestone.description,
    requirement: milestone.requirement,
    claimed: milestone.claimed,
    rewardAmount: milestone.reward.cheerAmount ?? 0,
    rewardDescription: milestone.reward.description,
  })), [milestones]);

  const stockByVariant = useMemo(() => groupStockByVariant(treeInventory), [treeInventory]);

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

  const mainContent = (
    <div className={styles.container}>
      {/* Left Column: Price Cards */}
      <div className={styles.leftColumn}>
        <div className={styles.demandBanner}>
          <span className={styles.demandLabel}>🔥 Market Demand:</span>
          <span className={styles.demandMultiplier}>×{demandMultiplier.toFixed(2)}</span>
          <span className={styles.demandHint}>(increases closer to Christmas)</span>
        </div>
        
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

        {/* Decoration Sales Row */}
        {/* Decoration Sales Row */}
        <div className={styles.decorationsRow}>
          {/* Garland Sales Section */}
          <div className={styles.garlandSection}>
            <h3 className={styles.garlandTitle}><img src={DECORATION_GARLAND} alt="Garland" className={styles.titleIcon} /> Festive Garland</h3>
            <div className={styles.garlandCard}>
              <div className={styles.garlandInfo}>
                <span className={styles.garlandStock}>In Stock: {materials.garlands}</span>
                <span className={styles.garlandPrice}>4 <img src={ICON_HOLIDAY_CHEER} alt="Holiday Cheer" className={styles.cheerIcon} /> each</span>
              </div>
              <div className={styles.garlandButtons}>
                <button
                  className={styles.sellButton}
                  onClick={() => sellGarland(1)}
                  disabled={materials.garlands < 1}
                >
                  Sell 1
                </button>
                <button
                  className={styles.sellAllButton}
                  onClick={() => sellGarland(materials.garlands)}
                  disabled={materials.garlands < 1}
                >
                  Sell All ({formatNumber(materials.garlands * 4, 1)} <img src={ICON_HOLIDAY_CHEER} alt="Holiday Cheer" className={styles.cheerIcon} />)
                </button>
              </div>
            </div>
          </div>

          {/* Candle Sales Section */}
          <div className={styles.garlandSection}>
          <h3 className={styles.garlandTitle}><img src={DECORATION_CANDLE} alt="Candle" className={styles.titleIcon} /> Festive Candles</h3>
          <div className={styles.garlandCard}>
            <div className={styles.garlandInfo}>
              <span className={styles.garlandStock}>In Stock: {materials.candles}</span>
              <span className={styles.garlandPrice}>2 <img src={ICON_HOLIDAY_CHEER} alt="Holiday Cheer" className={styles.cheerIcon} /> each</span>
            </div>
            <div className={styles.garlandButtons}>
              <button
                className={styles.sellButton}
                onClick={() => sellCandle(1)}
                disabled={materials.candles < 1}
              >
                Sell 1
              </button>
              <button
                className={styles.sellAllButton}
                onClick={() => sellCandle(materials.candles)}
                disabled={materials.candles < 1}
              >
                Sell All ({formatNumber(materials.candles * 2, 1)} <img src={ICON_HOLIDAY_CHEER} alt="Holiday Cheer" className={styles.cheerIcon} />)
              </button>
            </div>
          </div>
        </div>

        {/* Ornament Sales Section */}
        <div className={styles.garlandSection}>
          <h3 className={styles.garlandTitle}><img src={TREE_DECORATED} alt="Ornament" className={styles.titleIcon} /> Festive Ornaments</h3>
          <div className={styles.garlandCard}>
            <div className={styles.garlandInfo}>
              <span className={styles.garlandStock}>In Stock: {materials.ornaments}</span>
              <span className={styles.garlandPrice}>1 <img src={ICON_HOLIDAY_CHEER} alt="Holiday Cheer" className={styles.cheerIcon} /> each</span>
            </div>
            <div className={styles.garlandButtons}>
              <button
                className={styles.sellButton}
                onClick={() => sellOrnament(1)}
                disabled={materials.ornaments < 1}
              >
                Sell 1
              </button>
              <button
                className={styles.sellAllButton}
                onClick={() => sellOrnament(materials.ornaments)}
                disabled={materials.ornaments < 1}
              >
                Sell All ({formatNumber(materials.ornaments * 1, 1)} <img src={ICON_HOLIDAY_CHEER} alt="Holiday Cheer" className={styles.cheerIcon} />)
              </button>
            </div>
          </div>
        </div>
        </div>

        {/* Sales milestones */}
        <EventMilestones
          milestones={milestoneViews}
          sold={totalTreesSold}
          soldLabel="Trees sold"
          currencyIcon={<img src={ICON_HOLIDAY_CHEER} alt="Holiday Cheer" className={styles.cheerIcon} />}
          titleIcon={<img src={TREE_DECORATED} alt="" className={styles.cheerIcon} />}
          theme="christmas"
          onClaim={claimMilestone}
          formatNumber={formatNumber}
        />
      </div>
      
      {/* Right Column: Customer Feed & Bonuses */}
      <div className={styles.rightColumn}>
        {/* Shopfront Upgrades */}
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

export default memo(ShopfrontTab);
