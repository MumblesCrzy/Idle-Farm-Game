/**
 * Shopfront Tab Component
 * 
 * Handles tree sales for the Christmas Tree Shop event.
 * Features:
 * - Price cards for each tree variant with demand multipliers
 * - Sell sliders and buttons for managing inventory
 * - Customer Feed with cozy messages
 * - Daily Bonus claim (requires Wreath Sign upgrade)
 * - Passive income display (Golden Bell Counter)
 */

import React, { memo, useState } from 'react';
import type { TreeInventory, EventUpgrade, CraftingMaterials } from '../types/christmasEvent';
import { TREE_PINE, TREE_SPRUCE, TREE_FIR, TREE_DECORATED, DECORATION_CANDLE, DECORATION_GARLAND, ICON_HOLIDAY_CHEER } from '../config/assetPaths';
import BaseTab from './BaseTab';
import ShopfrontUpgradesPanel from './ShopfrontUpgradesPanel';
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
  passiveCheerPerSecond: number;
  formatNumber: (num: number, decimalPlaces?: number) => string;
  purchaseUpgrade: (upgradeId: string) => void;
}

/**
 * Tree variant display names and base prices
 * Note: Garland removed from decorations - now sold as standalone item
 * Luxury trees require both ornaments AND candles
 */
const TREE_VARIANTS = [
  { key: 'pine_plain', name: 'Pine Tree', emoji: '🌲', basePrice: 10, multiplier: 1.0 },
  { key: 'pine_ornamented', name: 'Ornamented Pine', emoji: '🎄', basePrice: 10, multiplier: 1.1 },
  { key: 'pine_candled', name: 'Candled Pine', emoji: '🕯️', basePrice: 10, multiplier: 1.2 },
  { key: 'pine_luxury', name: 'Luxury Pine', emoji: '✨', basePrice: 10, multiplier: 3.0 },
  { key: 'spruce_plain', name: 'Spruce Tree', emoji: '🌲', basePrice: 15, multiplier: 1.0 },
  { key: 'spruce_ornamented', name: 'Ornamented Spruce', emoji: '🎄', basePrice: 15, multiplier: 1.1 },
  { key: 'spruce_candled', name: 'Candled Spruce', emoji: '🕯️', basePrice: 15, multiplier: 1.2 },
  { key: 'spruce_luxury', name: 'Luxury Spruce', emoji: '✨', basePrice: 15, multiplier: 3.0 },
  { key: 'fir_plain', name: 'Fir Tree', emoji: '🌲', basePrice: 20, multiplier: 1.0 },
  { key: 'fir_ornamented', name: 'Ornamented Fir', emoji: '🎄', basePrice: 20, multiplier: 1.1 },
  { key: 'fir_candled', name: 'Candled Fir', emoji: '🕯️', basePrice: 20, multiplier: 1.2 },
  { key: 'fir_luxury', name: 'Luxury Fir', emoji: '✨', basePrice: 20, multiplier: 3.0 },
];

/**
 * Individual tree variant price card
 */
interface PriceCardProps {
  variant: typeof TREE_VARIANTS[0];
  quantity: number;
  demandMultiplier: number;
  onSell: (quantity: number) => void;
  formatNumber: (num: number, decimalPlaces?: number) => string;
}

const PriceCard: React.FC<PriceCardProps> = memo(({ variant, quantity, demandMultiplier, onSell, formatNumber }) => {
  const [sellQuantity, setSellQuantity] = useState(0);
  
  const finalPrice = Math.floor(variant.basePrice * variant.multiplier * demandMultiplier);
  const totalValue = finalPrice * sellQuantity;
  
  const handleSellAll = () => {
    if (quantity > 0) {
      onSell(quantity);
      setSellQuantity(0);
    }
  };
  
  const handleSellSelected = () => {
    if (sellQuantity > 0) {
      onSell(sellQuantity);
      setSellQuantity(0);
    }
  };
  
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        <span 
          className={styles.priceValue}
          title={variant.multiplier > 1.0 ? `Base: ${variant.basePrice} | Decoration Bonus: ×${variant.multiplier}` : undefined}
        >
          {finalPrice} <img src={ICON_HOLIDAY_CHEER} alt="Holiday Cheer" className={styles.cheerIcon} />
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
const ShopfrontTab: React.FC<ShopfrontTabProps> = ({
  treeInventory,
  materials,
  sellTrees,
  sellGarland,
  sellCandle,
  sellOrnament,
  demandMultiplier,
  holidayCheer,
  upgrades,
  passiveCheerPerSecond,
  formatNumber,
  purchaseUpgrade,
}) => {
  const mainContent = (
    <div className={styles.container}>
      {/* Left Column: Price Cards */}
      <div className={styles.leftColumn}>
        {/* <h2 className={styles.mainTitle}>
          <img src={ICON_TREE_STOREFRONT} alt="" style={{ width: '24px', height: '24px', verticalAlign: 'middle', marginRight: '8px' }} />
          Christmas Tree Shopfront
        </h2> */}
        
        <div className={styles.demandBanner}>
          <span className={styles.demandLabel}>🔥 Market Demand:</span>
          <span className={styles.demandMultiplier}>×{demandMultiplier.toFixed(2)}</span>
          <span className={styles.demandHint}>(increases closer to Christmas)</span>
        </div>
        
        <div className={styles.priceCardsGrid}>
          {TREE_VARIANTS.map(variant => {
            // Aggregate quantity across all qualities (normal, perfect, luxury)
            // Old format: pine_plain, New format: pine_normal_plain, pine_perfect_plain, pine_luxury_plain
            const [treeType, decorationLevel] = variant.key.split('_');
            let quantity = 0;
            const matchingKeys: string[] = [];
            
            // Sum up all qualities for this tree type and decoration level
            Object.keys(treeInventory).forEach(invKey => {
              // Check if this inventory key matches the tree type and decoration level
              // Format: treeType_quality_decorationLevel
              const parts = invKey.split('_');
              if (parts.length >= 3) {
                const invTreeType = parts[0];
                const invDecoLevel = parts.slice(2).join('_'); // Handle multi-word decoration levels
                if (invTreeType === treeType && invDecoLevel === decorationLevel) {
                  quantity += treeInventory[invKey] || 0;
                  matchingKeys.push(invKey);
                }
              }
            });
            
            // Handler to sell trees - need to sell from actual inventory keys
            const handleSell = (qty: number) => {
              let remaining = qty;
              // Sell from normal quality first, then perfect, then luxury
              const sortedKeys = matchingKeys.sort((a, b) => {
                const qualityOrder: Record<string, number> = { normal: 0, perfect: 1, luxury: 2 };
                const qualityA = a.split('_')[1];
                const qualityB = b.split('_')[1];
                return (qualityOrder[qualityA] || 999) - (qualityOrder[qualityB] || 999);
              });
              
              for (const key of sortedKeys) {
                if (remaining <= 0) break;
                const available = treeInventory[key] || 0;
                const toSell = Math.min(available, remaining);
                if (toSell > 0) {
                  sellTrees(key, toSell);
                  remaining -= toSell;
                }
              }
            };
            
            return (
              <PriceCard
                key={variant.key}
                variant={variant}
                quantity={quantity}
                demandMultiplier={demandMultiplier}
                onSell={handleSell}
                formatNumber={formatNumber}
              />
            );
          })}
        </div>
        
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
      </div>
      
      {/* Right Column: Customer Feed & Bonuses */}
      <div className={styles.rightColumn}>
        {/* Shopfront Upgrades */}
        <ShopfrontUpgradesPanel
          upgrades={upgrades}
          holidayCheer={holidayCheer}
          purchaseUpgrade={purchaseUpgrade}
          passiveCheerPerSecond={passiveCheerPerSecond}
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
